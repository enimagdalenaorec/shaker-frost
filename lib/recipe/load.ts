import "server-only";
import { adminDb } from "@/lib/db/admin";

// Loads a saved veganization result + live product offers for every suggested alternative.

export type ProductOption = {
  itemId: string;
  name: string;
  brand: string | null;
  conceptGroup: string | null;
  chainCode: string;
  chainName: string;
  chainKind: string;
  price: number;
  regularPrice: number | null;
  isAkcija: boolean;
  discountPct: number;
  netQty: number | null;
  unit: string | null;
  nChains: number;
  provjeri: boolean;
};

export type AlternativeView = {
  id: string;
  rank: number;
  conceptId: string | null;
  label: string;
  facets: Record<string, string>;
  ratio: number | null;
  requiredQty: number | null;
  requiredUnit: string | null;
  reasoning: string;
  confidence: number;
  products: ProductOption[];
};

export type IngredientView = {
  id: string;
  position: number;
  raw: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  role: string | null;
  status: "vegan" | "not_vegan" | "depends";
  reason: string | null;
  alternatives: AlternativeView[];
};

export type RecipeView = {
  id: string;
  title: string;
  status: string;
  sourceUrl: string | null;
  sourceName: string | null;
  imageUrl: string | null;
  servings: number | null;
  dishCategory: string | null;
  dishNotes: string | null;
  tip: string | null;
  steps: { n: number; text_hr: string; changed: boolean }[];
  sources: { title: string | null; url: string }[];
  ingredients: IngredientView[];
  createdAt: string;
  ownerId: string | null;
  savedAt: string | null;
};

const num = (v: unknown) => (v == null ? null : Number(v));
const cap = (s: string) => (s ? s[0].toLocaleUpperCase("hr") + s.slice(1) : s);

export async function loadRecipe(id: string): Promise<RecipeView | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = adminDb();
  const { data: r } = await db.from("recipes").select("*").eq("id", id).maybeSingle();
  if (!r) return null;
  const { data: ings } = await db.from("recipe_ingredients").select("*").eq("recipe_id", id).order("position");
  const ingIds = (ings ?? []).map((i) => i.id);
  const { data: alts } = ingIds.length
    ? await db.from("ingredient_alternatives").select("*").in("recipe_ingredient_id", ingIds).order("rank")
    : { data: [] };

  // live offers for all suggested concepts
  const conceptIds = [...new Set((alts ?? []).map((a) => a.concept_id).filter(Boolean) as string[])];
  const { data: offers } = conceptIds.length ? await db.rpc("get_offers", { p_concept_ids: conceptIds, p_exclude_tags: [] }) : { data: [] };

  const productsFor = (conceptId: string, facets: Record<string, string>): ProductOption[] => {
    const rows = (offers ?? []).filter((o) => o.concept_id === conceptId && !o.provjeri);
    const byItem = new Map<string, { best: (typeof rows)[number]; chains: Set<string>; score: number }>();
    for (const o of rows) {
      const score = Object.entries(facets).filter(([k, v]) => (o as Record<string, unknown>)[k] === v).length;
      const cur = byItem.get(o.item_id!);
      if (!cur) byItem.set(o.item_id!, { best: o, chains: new Set([o.chain_code!]), score });
      else {
        cur.chains.add(o.chain_code!);
        if (Number(o.price) < Number(cur.best.price)) cur.best = o;
      }
    }
    return [...byItem.values()]
      .sort((a, b) => b.score - a.score || Number(a.best.price) - Number(b.best.price))
      .slice(0, 4)
      .map(({ best: o, chains }) => ({
        itemId: o.item_id!, name: o.name!, brand: o.brand, conceptGroup: o.concept_group, chainCode: o.chain_code!, chainName: o.chain_name!,
        chainKind: o.chain_kind ?? "store", price: Number(o.price), regularPrice: num(o.regular_price), isAkcija: Boolean(o.is_akcija),
        discountPct: o.discount_pct ?? 0, netQty: num(o.net_qty), unit: o.size_unit, nChains: chains.size, provjeri: Boolean(o.provjeri),
      }));
  };

  const ingredients: IngredientView[] = (ings ?? []).map((i) => ({
    id: i.id,
    position: i.position,
    raw: i.raw_text,
    name: i.name_hr ?? i.raw_text,
    quantity: num(i.quantity),
    unit: i.unit,
    role: i.role,
    status: (i.status ?? (i.is_vegan ? "vegan" : "not_vegan")) as IngredientView["status"],
    reason: i.reason_hr,
    alternatives: (alts ?? [])
      .filter((a) => a.recipe_ingredient_id === i.id)
      .map((a) => {
        const facets = (a.facets as Record<string, string>) ?? {};
        return {
          id: a.id, rank: a.rank, conceptId: a.concept_id, label: cap(a.label_hr ?? a.concept_id ?? ""), facets, ratio: num(a.ratio),
          requiredQty: num(a.required_qty), requiredUnit: a.required_unit, reasoning: a.reasoning_hr ?? "", confidence: Number(a.confidence ?? 0),
          products: a.concept_id ? productsFor(a.concept_id, facets) : [],
        };
      }),
  }));

  return {
    id: r.id,
    title: r.title ?? "Recept",
    status: r.status,
    sourceUrl: r.source_url,
    sourceName: r.source_name,
    imageUrl: r.image_url,
    servings: r.servings_target,
    dishCategory: r.dish_category,
    dishNotes: r.dish_notes_hr,
    tip: r.tip_hr,
    steps: (r.veganized_steps as RecipeView["steps"]) ?? [],
    sources: (r.sources as RecipeView["sources"]) ?? [],
    ingredients,
    createdAt: r.created_at,
    ownerId: r.user_id,
    savedAt: r.saved_at,
  };
}
