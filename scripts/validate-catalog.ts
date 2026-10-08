// Checks the catalog + knowledge through the contract views.
// Fails (exit 1) when a substitution rule points at a concept with no buyable product (incl. descendants)
// or prefers a facet value no product in that concept has.
// Usage: npm run validate:catalog
import { connect } from "./lib/db";

// Non-vegan ingredients of the demo recipes (CLAUDE.md §7).
const DEMO_RECIPES: Record<string, string[]> = {
  "sarma s pire krumpirom": ["mljeveno_meso", "jaje", "panceta", "kobasica", "mlijeko", "maslac"],
  "palačinke": ["mlijeko", "jaje"],
  "bolonjez": ["mljeveno_meso", "maslac", "slanina", "temeljac_mesni"],
  "štrukli": ["svjezi_sir", "jaje", "kiselo_vrhnje", "vrhnje_za_kuhanje", "maslac"],
  "goveđi gulaš": ["meso_komadi"],
  "tiramisu": ["mascarpone", "slatko_vrhnje", "piskote", "jaje"],
  "carbonara": ["sunka", "vrhnje_za_kuhanje", "jaje", "parmezan"],
};

const client = await connect();
let failures = 0;
try {
  const { rows: rules } = await client.query<{ ingredient_slug: string; concept_id: string; known: boolean; buyable: number; chains: string[]; bad_prefer: string[] }>(`
    select r.ingredient_slug, r.concept_id,
           exists (select 1 from concepts c where c.concept_id = r.concept_id) as known,
           (select count(distinct po.item_id) from v_product_offers po where r.concept_id = any (po.concept_put) and not po.provjeri)::int as buyable,
           coalesce((select array_agg(distinct po.chain_code order by po.chain_code) from v_product_offers po
                     where r.concept_id = any (po.concept_put) and not po.provjeri), '{}') as chains,
           -- 'bez okusa / natur' also matches products without any flavour, so it is always valid
           coalesce((select array_agg(k || '=' || v) from jsonb_each_text(r.prefer) f(k, v)
                     where v <> 'bez okusa / natur' and not exists (
                       select 1 from v_products p where r.concept_id = any (p.concept_put)
                         and v = any (case k when 'okus' then p.okus when 'zasladeno' then p.zasladeno
                                             when 'namjena' then p.namjena when 'oblik' then p.oblik else '{}' end))), '{}') as bad_prefer
    from substitution_rules r
    order by r.ingredient_slug, r.rank`);

  console.log("\n# Rules → buyable products");
  for (const r of rules) {
    const bad = !r.known || r.buyable === 0 || r.bad_prefer.length > 0;
    if (bad) failures++;
    console.log(
      `${bad ? "✗" : "✓"} ${r.ingredient_slug.padEnd(20)} → ${r.concept_id.padEnd(26)} ` +
        (r.known ? `${r.buyable} products in ${r.chains.length} chains (${r.chains.join(", ")})` : "UNKNOWN CONCEPT") +
        (r.bad_prefer.length ? `  UNKNOWN FACET ${r.bad_prefer.join(", ")}` : ""),
    );
  }

  const { rows: noRules } = await client.query<{ slug: string }>(
    `select slug from ingredients i where not is_vegan and not exists (select 1 from substitution_rules r where r.ingredient_slug = i.slug) order by slug`,
  );
  if (noRules.length) {
    console.log(`\n# Non-vegan ingredients without rules (the AI explains these, no products): ${noRules.map((r) => r.slug).join(", ")}`);
  }

  console.log("\n# Demo recipe coverage (rank-1 alternative per ingredient)");
  for (const [recipe, slugs] of Object.entries(DEMO_RECIPES)) {
    const { rows } = await client.query<{ chain_code: string; covered: number }>(
      `with need as (
         select distinct on (r.ingredient_slug) r.ingredient_slug, r.concept_id
         from substitution_rules r where r.ingredient_slug = any ($1) order by r.ingredient_slug, r.rank
       )
       select po.chain_code, count(distinct n.ingredient_slug)::int as covered
       from need n join v_product_offers po on n.concept_id = any (po.concept_put) and not po.provjeri
       group by po.chain_code order by covered desc, po.chain_code`,
      [slugs],
    );
    const best = rows[0];
    const missing = slugs.filter((s) => !rules.some((r) => r.ingredient_slug === s && r.buyable > 0));
    if (missing.length) failures++;
    console.log(
      `${missing.length ? "✗" : "✓"} ${recipe.padEnd(24)} ${slugs.length} non-vegan ingredients; ` +
        `best single chain: ${best ? `${best.chain_code} (${best.covered}/${slugs.length})` : "none"}` +
        (missing.length ? `; NO PRODUCTS for: ${missing.join(", ")}` : ""),
    );
  }

  const { rows: stats } = await client.query(
    `select (select count(*) from products) products, (select count(*) from offers) offers,
            (select count(*) from products where vegan_class <> 'vegan') provjeri,
            (select count(*) from products where kcal is null) no_nutrition,
            (select count(*) from best_offers where any_akcija) on_akcija`,
  );
  console.log("\n# Catalog", stats[0]);
} finally {
  await client.end();
}

console.log(failures ? `\n${failures} problem(s).` : "\nAll good.");
process.exit(failures ? 1 : 0);
