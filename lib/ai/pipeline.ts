import "server-only";
import { adminDb } from "@/lib/db/admin";
import { generateJson, type Source } from "./llm";
import { PROMPTS } from "./prompts";
import { Analysis, Choice, Research, Rewrite } from "./schemas";
import { ingestExample, ingestText, ingestUrl, type RawRecipe } from "@/lib/recipe/ingest";

// The veganization pipeline (CLAUDE.md §8):
// ingest → analyze → research (cached) → alternatives → offers ∥ rewrite → save.
// Facts (products, prices) come from the DB; the model only judges and explains.

export type StageName = "ingest" | "analyze" | "research" | "alternatives" | "offers" | "rewrite" | "save";
export type PipelineEvent =
  | { type: "stage"; stage: StageName; status: "start" }
  | { type: "stage"; stage: StageName; status: "done"; ms: number; summary: string; detail?: unknown }
  | { type: "done"; recipeId: string; ms: number }
  | { type: "error"; stage?: StageName; message: string };

export type PipelineInput = {
  url?: string; text?: string; example?: string; excludeTags?: string[]; userId?: string | null;
  /** Skip the 24 h same-URL reuse (evals, prompt changes). */
  fresh?: boolean;
  /** Runs work after the response (the route passes Next's after()); without it the work runs inline. */
  defer?: (task: () => Promise<void>) => void;
};

type StepLog = { stage: StageName; ms: number; model?: string; prompt_version?: string; input?: unknown; output?: unknown; tokensIn?: number; tokensOut?: number };
type Facets = Record<string, string>;
const FACET_KEYS = ["okus", "zasladeno", "namjena", "oblik"] as const;
/** okus value for "no flavour": also matches products that list no flavour at all (lib/catalog/basket-candidates.ts) */
const PLAIN = "bez okusa / natur";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export async function runPipeline(input: PipelineInput, rawEmit: (e: PipelineEvent) => void): Promise<string | null> {
  // after "done" the client has left and the stream may be closed: events are best effort
  const emit = (e: PipelineEvent) => {
    try {
      rawEmit(e);
    } catch {
      /* stream closed */
    }
  };
  const db = adminDb();
  const started = Date.now();
  const logs: StepLog[] = [];
  let recipeId: string | null = null;
  let runId: string | null = null;
  let current: StageName = "ingest";

  async function stage<T>(name: StageName, fn: () => Promise<{ value: T; summary: string; detail?: unknown; log?: Omit<StepLog, "stage" | "ms"> }>) {
    current = name;
    emit({ type: "stage", stage: name, status: "start" });
    const s = Date.now();
    const r = await fn();
    const ms = Date.now() - s;
    logs.push({ stage: name, ms, ...r.log });
    emit({ type: "stage", stage: name, status: "done", ms, summary: r.summary, detail: r.detail });
    return r.value;
  }

  try {
    // 0 ── ingest ───────────────────────────────────────────────────────────────────────────
    const raw: RawRecipe = await stage("ingest", async () => {
      const r = input.example ? await ingestExample(input.example) : input.url ? await ingestUrl(input.url) : await ingestText(input.text ?? "");
      return {
        value: r,
        summary: `${r.ingredients.length} sastojaka · ${r.sourceName ?? "tekst"}`,
        detail: { title: r.title, source: r.sourceName, method: r.method, ingredients: r.ingredients, imageUrl: r.imageUrl },
        log: { model: r.model, output: { title: r.title, method: r.method, n: r.ingredients.length } },
      };
    });

    // Same page veganized in the last 24 h → reuse it (guest results or the user's own; prices load live on view)
    if (raw.sourceUrl && !input.text && !input.fresh) {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const owner = input.userId ? `user_id.is.null,user_id.eq.${input.userId}` : "user_id.is.null";
      const { data: hit } = await db
        .from("recipes")
        .select("id, veganized_steps")
        .eq("source_url", raw.sourceUrl)
        .eq("status", "done")
        .gte("created_at", since)
        .or(owner)
        .order("created_at", { ascending: false })
        .limit(5);
      const ready = (hit ?? []).find((r) => !((r.veganized_steps as { pending?: boolean }[] | null) ?? []).some((s) => s.pending));
      if (ready) {
        emit({ type: "done", recipeId: ready.id, ms: Date.now() - started });
        return ready.id;
      }
    }

    const { data: rec, error: recErr } = await db
      .from("recipes")
      .insert({
        user_id: input.userId ?? null,
        title: raw.title,
        source_url: raw.sourceUrl,
        source_name: raw.sourceName,
        image_url: raw.imageUrl,
        source_kind: input.text ? "text" : "url",
        ingest_method: raw.method,
        raw_text: [raw.title, ...raw.ingredients, ...raw.steps].join("\n"),
        servings_original: raw.servings,
        servings_target: raw.servings,
        status: "processing",
      })
      .select("id")
      .single();
    if (recErr) throw new Error(recErr.message);
    recipeId = rec.id;
    const { data: run } = await db.from("agent_runs").insert({ recipe_id: recipeId, user_id: input.userId ?? null, provider: "gemini" }).select("id").single();
    runId = run?.id ?? null;

    // 1 ── analyze ──────────────────────────────────────────────────────────────────────────
    const { data: vocabRows } = await db.from("ingredients").select("slug, name_hr, aliases, grams_per_piece");
    const vocab = vocabRows ?? [];
    const slugs = new Set(vocab.map((v) => v.slug));
    const analysis = await stage("analyze", async () => {
      const r = await generateJson({
        schema: Analysis,
        tier: "strong",
        system: PROMPTS.analyze.system,
        user: PROMPTS.analyze.user({
          title: raw.title,
          servings: raw.servings,
          ingredients: raw.ingredients,
          steps: raw.steps,
          vocabulary: vocab.map((v) => `${v.slug}: ${v.name_hr}${v.aliases.length ? ` | ${v.aliases.join(", ")}` : ""}`).join("\n"),
        }),
      });
      // uid = position in this list: one source line can hold several ingredients ("3 jaja, 1 kiselo vrhnje")
      const items = r.data.ingredients
        .filter((i) => i.index >= 0 && i.index < raw.ingredients.length)
        .map((i, uid) => ({ ...i, uid, slug: i.slug && slugs.has(i.slug) ? i.slug : null }));
      const risky = items.filter((i) => i.status !== "vegan");
      return {
        value: { ...r.data, ingredients: items },
        summary: risky.length ? `${risky.length} od ${items.length} sastojaka nije vegansko` : "Recept je već veganski",
        detail: { ingredients: items.map((i) => ({ index: i.index, name: i.name_hr, status: i.status, role: i.role, reason: i.reason_hr })) },
        log: { model: r.model, prompt_version: PROMPTS.analyze.version, output: r.data, tokensIn: r.tokensIn, tokensOut: r.tokensOut },
      };
    });
    const risky = analysis.ingredients.filter((i) => i.status !== "vegan");
    const category = analysis.dish_category;
    const keyOf = (i: (typeof risky)[number]) => `${i.slug ?? norm(i.name_hr)}|${i.role}|${norm(category)}`;

    // 2 ── research (cached per ingredient × role × dish category) ──────────────────────────
    // Speed: ingredients with curated rules already carry the knowledge (ratio, notes), so only ingredients
    // WITHOUT rules are researched; cached notes are still used for all. Dish notes alone never trigger a call.
    const research = await stage("research", async () => {
      const keys = [...new Set(risky.map(keyOf))];
      const dishKey = norm(raw.title);
      const riskySlugs = [...new Set(risky.map((i) => i.slug).filter(Boolean) as string[])];
      const [{ data: cached }, { data: dishCached }, { data: ruled }] = await Promise.all([
        keys.length ? db.from("substitution_research").select("*").in("key", keys) : Promise.resolve({ data: [] as never[] }),
        db.from("dish_research").select("*").eq("key", dishKey).maybeSingle(),
        riskySlugs.length ? db.from("substitution_rules").select("ingredient_slug").in("ingredient_slug", riskySlugs) : Promise.resolve({ data: [] as never[] }),
      ]);
      const hasRules = new Set((ruled ?? []).map((r) => r.ingredient_slug));
      const byKey = new Map((cached ?? []).map((c) => [c.key, c]));
      const missing = keys.filter((k) => !byKey.has(k) && !risky.some((i) => keyOf(i) === k && i.slug && hasRules.has(i.slug)));
      const byRules = keys.filter((k) => !byKey.has(k)).length - missing.length;
      let dishNotes = dishCached?.notes_hr ?? null;
      let sources: Source[] = (dishCached?.sources as Source[] | null) ?? [];
      let grounded = false;
      let model: string | undefined;

      if (missing.length) {
        const items = missing.map((k) => {
          const i = risky.find((x) => keyOf(x) === k)!;
          return { key: k, name: i.name_hr, role: i.role };
        });
        const r = await generateJson({
          schema: Research,
          tier: "fast",
          search: true,
          system: PROMPTS.research.system,
          user: PROMPTS.research.user({ dish: raw.title, category, items }),
          temperature: 0.3,
        });
        model = r.model;
        grounded = r.grounded;
        sources = [...sources, ...r.sources].slice(0, 8);
        const method = r.grounded ? "web" : "ai";
        const rows = r.data.items
          .filter((it) => missing.includes(it.key))
          .map((it) => {
            const i = risky.find((x) => keyOf(x) === it.key)!;
            return {
              key: it.key, ingredient: i.slug ?? i.name_hr, role: i.role, dish_category: category,
              notes_hr: it.notes_hr, suggestions: it.suggestions, sources: r.sources, method, model: r.model,
            };
          });
        if (rows.length) {
          await db.from("substitution_research").upsert(rows);
          rows.forEach((row) => byKey.set(row.key, { ...row, created_at: "" }));
        }
        if (!dishNotes) {
          dishNotes = r.data.dish_notes_hr;
          await db.from("dish_research").upsert({ key: dishKey, dish: raw.title, notes_hr: dishNotes, sources: r.sources, method, model: r.model });
        }
      }
      const fromCache = keys.length - missing.length - byRules;
      return {
        value: { byKey, dishNotes, sources },
        summary: !risky.length ? "Nije potrebno" : !missing.length && byRules ? "Pravila dovoljna" : grounded ? `${sources.length} izvora s weba` : fromCache === keys.length ? "Iz memorije" : `${missing.length} novih bilješki${fromCache ? `, ${fromCache} iz memorije` : ""}`,
        detail: { notes: [...byKey.values()].map((v) => ({ ingredient: v.ingredient, notes: v.notes_hr })), dishNotes },
        log: { model, prompt_version: PROMPTS.research.version, output: { missing, fromCache, byRules, grounded } },
      };
    });

    // 3 ── alternatives ─────────────────────────────────────────────────────────────────────
    const { data: conceptRows } = await db.from("v_concepts").select("concept_id, name_hr, group_name, n_products, run, zamjenjuje");
    const concepts = new Map((conceptRows ?? []).map((c) => [c.concept_id!, c]));
    const choice = await stage("alternatives", async () => {
      if (!risky.length) return { value: { items: [] } as Choice, summary: "Nije potrebno" };
      const riskySlugs = risky.map((i) => i.slug).filter(Boolean) as string[];
      const { data: rules } = riskySlugs.length ? await db.from("v_rules").select("*").in("ingredient_slug", riskySlugs).order("rank") : { data: [] };
      const candidateIds = [...new Set((rules ?? []).map((r) => r.concept_id!))];
      const facetOptions = await loadFacetOptions(candidateIds.length ? candidateIds : [...concepts.keys()]);

      const itemsText = risky
        .map((i) => {
          const rs = (rules ?? []).filter((r) => r.ingredient_slug === i.slug);
          const cands = rs.length
            ? rs
                .map((r) => {
                  const prefer = Object.entries((r.prefer as Facets | null) ?? {}).map(([k, v]) => `${k}=${v}`).join(", ");
                  return `    - ${r.concept_id} — ${r.concept_name} (${r.concept_group}) | pravilo: uloga=${r.role}, omjer=${r.ratio}${prefer ? `, preferira: ${prefer}` : ""}${r.notes_hr ? `, ${r.notes_hr}` : ""}`;
                })
                .join("\n")
            : "    - (nema pravila: izaberi iz globalnog popisa ili concept_id=null)";
          const opts = [...new Set(rs.map((r) => r.concept_id!))]
            .map((c) => `    ${c}: ${FACET_KEYS.map((k) => (facetOptions[c]?.[k]?.length ? `${k}=[${facetOptions[c][k].join(", ")}]` : null)).filter(Boolean).join("; ") || "bez opcija"}`)
            .join("\n");
          const qty = i.quantity != null ? ` (${i.quantity} ${i.unit ?? ""})` : "";
          return `[${i.uid}] ${i.name_hr}${qty} | uloga: ${i.role} | ${i.status} | ${i.reason_hr}\n  KANDIDATI:\n${cands}\n  OPCIJE:\n${opts || "    -"}`;
        })
        .join("\n\n");
      const researchText = risky
        .map((i) => {
          const r = research.byKey.get(keyOf(i));
          if (!r) return null;
          const sugg = (r.suggestions as { substitute_hr: string; when_hr: string }[]).map((s) => `${s.substitute_hr} (${s.when_hr})`).join("; ");
          return `- ${i.name_hr} (${i.role}): ${r.notes_hr} Prijedlozi: ${sugg}`;
        })
        .filter(Boolean)
        .join("\n") + (research.dishNotes ? `\n- Jelo: ${research.dishNotes}` : "");
      // the global list is only needed for ingredients without curated rules (keeps the prompt small)
      const needsGlobal = risky.some((i) => !(rules ?? []).some((r) => r.ingredient_slug === i.slug));
      const conceptsText = needsGlobal
        ? [...concepts.values()]
            .filter((c) => (c.n_products ?? 0) > 0)
            .map((c) => `${c.concept_id} — ${c.name_hr} (${c.group_name})${c.zamjenjuje?.length ? ` zamjenjuje: ${c.zamjenjuje.slice(0, 3).join(", ")}` : ""}`)
            .join("\n")
        : "(nije potrebno: svi sastojci imaju kandidate)";

      const r = await generateJson({
        schema: Choice,
        tier: "strong",
        system: PROMPTS.choose.system,
        user: PROMPTS.choose.user({ dish: raw.title, category, items: itemsText, concepts: conceptsText, research: researchText }),
      });

      // Under load the model sometimes names the right substitute but drops its id ("sojino mlijeko", null).
      // Recover the id from the label: exact id match first, then word-stem overlap with the candidates.
      const stems = (t: string) => new Set(norm(t).split("_").filter((w) => w.length > 2).map((w) => w.slice(0, 4)));
      const recoverConcept = (label: string, slug: string | null): string | null => {
        const direct = norm(label);
        if (concepts.has(direct)) return direct;
        const want = stems(label);
        if (!want.size) return null;
        const pool = (rules ?? []).filter((r) => r.ingredient_slug === slug).map((r) => r.concept_id!);
        const ids = pool.length ? [...new Set(pool)] : [...concepts.keys()];
        let best: { id: string; score: number } | null = null;
        for (const id of ids) {
          const have = stems(`${id} ${concepts.get(id)?.name_hr ?? ""}`);
          const score = [...want].filter((w) => have.has(w)).length / want.size;
          if (score >= 0.6 && (!best || score > best.score)) best = { id, score };
        }
        return best?.id ?? null;
      };
      // The label is what the user reads, the concept is what the basket buys: they must agree.
      // "seitan" filed under tofu → re-resolve from the label; nothing fits → no purchase (concept_id = null).
      const GENERIC = new Set(["bilj", "vega", "zamj", "goto", "doma", "kupo", "prah"]);
      const fits = (label: string, id: string) => {
        const have = stems(`${id} ${concepts.get(id)?.name_hr ?? ""}`);
        return [...stems(label)].some((w) => !GENERIC.has(w) && have.has(w));
      };
      for (const it of r.data.items) {
        const slug = risky.find((x) => x.uid === it.index)?.slug ?? null;
        for (const a of it.alternatives) {
          if (!a.concept_id || !concepts.has(a.concept_id)) a.concept_id = recoverConcept(a.label_hr, slug) ?? a.concept_id;
          else if (!fits(a.label_hr, a.concept_id)) a.concept_id = recoverConcept(a.label_hr, null);
        }
      }

      // Facets are strict in the basket, so keep only those that change the dish: taste, functional forms
      // (smoked, grated, ground) and what a curated rule prefers. "pahuljice" or "integralno" just shrink the shelf.
      const FUNCTIONAL_FORMS = new Set(["dimljeno", "ribano", "mljeveno"]);
      const facetMatters = (slug: string | null, conceptId: string, k: string, v: string) =>
        k === "okus" || (k === "zasladeno" && v === "nezaslađeno") || (k === "oblik" && FUNCTIONAL_FORMS.has(v)) ||
        (rules ?? []).some((r) => r.ingredient_slug === slug && r.concept_id === conceptId && (r.prefer as Facets | null)?.[k] === v);

      // never trust ids or facet values the model returns: keep only what exists in the DB
      const allFacetOptions = await loadFacetOptions([...new Set(r.data.items.flatMap((it) => it.alternatives.map((a) => a.concept_id).filter(Boolean) as string[]))]);
      const items = risky.map((i) => {
        const fromModel = r.data.items.find((it) => it.index === i.uid);
        const alternatives = (fromModel?.alternatives ?? [])
          .map((a) => {
            const conceptId = a.concept_id && concepts.has(a.concept_id) ? a.concept_id : null;
            const facets: Facets = {};
            if (conceptId)
              for (const k of FACET_KEYS) {
                const v = a.facets[k];
                if (v && allFacetOptions[conceptId]?.[k]?.includes(v) && facetMatters(i.slug, conceptId, k, v)) facets[k] = v;
              }
            return { ...a, concept_id: conceptId, facets, ratio: Math.min(Math.max(a.ratio || 1, 0.01), 5) };
          })
          .filter((a, idx, arr) => !a.concept_id || arr.findIndex((b) => b.concept_id === a.concept_id && JSON.stringify(b.facets) === JSON.stringify(a.facets)) === idx);
        // safety net: if nothing is shoppable but curated rules exist, add the top rule as an option
        if (!alternatives.some((a) => a.concept_id)) {
          const rule = (rules ?? []).find((x) => x.ingredient_slug === i.slug);
          if (rule && alternatives.length < 3)
            alternatives.push({
              concept_id: rule.concept_id!, label_hr: rule.concept_name!, facets: (rule.prefer as Facets) ?? {}, ratio: Number(rule.ratio) || 1,
              reasoning_hr: rule.notes_hr ?? "", confidence: 0.5,
            });
        }
        // "depends" with nothing suggested: still tell the user what to do
        if (!alternatives.length && i.status === "depends")
          alternatives.push({ concept_id: null, label_hr: "provjeri deklaraciju", facets: {}, ratio: 1, reasoning_hr: i.reason_hr, confidence: 0.5 });
        return { index: i.uid, alternatives };
      });
      const n = items.reduce((s, it) => s + it.alternatives.length, 0);
      return {
        value: { items } as unknown as Choice,
        summary: `${n} zamjena za ${risky.length} sastojaka`,
        detail: {
          items: items.map((it) => ({
            index: it.index,
            name: risky.find((x) => x.uid === it.index)?.name_hr,
            alternatives: it.alternatives.map((a) => ({ label: a.label_hr, concept: a.concept_id, reasoning: a.reasoning_hr })),
          })),
        },
        log: { model: r.model, prompt_version: PROMPTS.choose.version, output: r.data, tokensIn: r.tokensIn, tokensOut: r.tokensOut },
      };
    });

    // 4 ── offers → 5 save → done; 6 ── rewrite runs after the user already sees the result ──
    const chosenConcepts = [...new Set(choice.items.flatMap((it) => it.alternatives.map((a) => a.concept_id).filter(Boolean) as string[]))];
    const swapsText = choice.items
      .map((it) => {
        const i = risky.find((x) => x.uid === it.index)!;
        const best = it.alternatives[0];
        return best ? `- ${i.name_hr} → ${best.label_hr}${best.concept_id ? ` (omjer ${best.ratio})` : ""}` : null;
      })
      .filter(Boolean)
      .join("\n");

    const offerStats = await stage("offers", async () => {
        if (!chosenConcepts.length) return { value: new Map<string, number>(), summary: "Nije potrebno" };
        const { data } = await db.rpc("get_offers", { p_concept_ids: chosenConcepts, p_exclude_tags: input.excludeTags ?? [] });
        const perConcept = new Map<string, number>();
        const products = new Set<string>();
        const chains = new Set<string>();
        for (const o of data ?? []) {
          products.add(o.item_id!);
          chains.add(o.chain_code!);
          perConcept.set(o.concept_id!, (perConcept.get(o.concept_id!) ?? 0) + 1);
        }
        return {
          value: perConcept,
          summary: `${products.size} proizvoda u ${chains.size} trgovina`,
          detail: { products: products.size, chains: [...chains] },
        };
    });

    // 6 ── save ─────────────────────────────────────────────────────────────────────────────
    await stage("save", async () => {
      const gramsPerPiece = new Map(vocab.map((v) => [v.slug, Number(v.grams_per_piece) || null]));
      const { data: ingRows, error: ingErr } = await db
        .from("recipe_ingredients")
        .insert(
          analysis.ingredients.map((i) => ({
            recipe_id: recipeId!, position: i.index, raw_text: raw.ingredients[i.index] ?? i.name_hr, name_hr: i.name_hr,
            ingredient_slug: i.slug, quantity: i.quantity, unit: i.unit, quantity_estimated: i.quantity_estimated,
            role: i.role, status: i.status, is_vegan: i.status === "vegan", reason_hr: i.reason_hr, confidence: i.confidence,
          })),
        )
        .select("id, position");
      if (ingErr) throw new Error(ingErr.message);
      // rows come back in insert order; several analysed ingredients can share one source line (position)
      const idByUid = new Map((ingRows ?? []).map((r, n) => [analysis.ingredients[n].uid, r.id]));
      const sourceUrls = research.sources.map((s) => s.url);
      const altRows = choice.items.flatMap((it) => {
        const i = risky.find((x) => x.uid === it.index)!;
        // pieces of something we can't weigh stay unknown: the basket then buys one package
        const perPiece = gramsPerPiece.get(i.slug ?? "") ?? null;
        const grams = i.quantity == null ? null : i.unit === "kom" ? (perPiece == null ? null : i.quantity * perPiece) : i.quantity;
        return it.alternatives.map((a, rank) => ({
          recipe_ingredient_id: idByUid.get(it.index)!, concept_id: a.concept_id, facets: a.facets, rank: rank + 1, ratio: a.ratio,
          required_qty: grams == null ? null : Math.round(grams * a.ratio), required_unit: i.unit === "ml" ? "ml" : "g",
          reasoning_hr: a.reasoning_hr, confidence: a.confidence, label_hr: a.label_hr, source_urls: sourceUrls,
          has_products: a.concept_id ? (offerStats.get(a.concept_id) ?? 0) > 0 : false, is_selected: rank === 0,
        }));
      });
      if (altRows.length) {
        const { error } = await db.from("ingredient_alternatives").insert(altRows);
        if (error) throw new Error(error.message);
      }
      // original steps until the rewrite replaces them; `pending` tells the page to refresh
      await db
        .from("recipes")
        .update({
          title: raw.title,
          veganized_steps: raw.steps.map((s, n) => ({ n: n + 1, text_hr: s, changed: false, ...(risky.length ? { pending: true } : {}) })),
          dish_category: category,
          dish_notes_hr: research.dishNotes,
          tip_hr: null,
          sources: research.sources,
          servings_original: analysis.servings ?? raw.servings,
          servings_target: analysis.servings ?? raw.servings,
          status: "done",
        })
        .eq("id", recipeId!);
      return { value: null, summary: "Spremljeno" };
    });

    emit({ type: "done", recipeId: recipeId!, ms: Date.now() - started });

    const rewriteSteps = async () => {
      try {
        if (risky.length) {
          const rewrite = await stage("rewrite", async () => {
            const r = await generateJson({
              schema: Rewrite,
              tier: "fast",
              system: PROMPTS.rewrite.system,
              user: PROMPTS.rewrite.user({ title: raw.title, steps: raw.steps, swaps: swapsText }),
              temperature: 0.3,
            });
            const changed = r.data.steps.filter((s) => s.changed).length;
            return {
              value: r.data,
              summary: `${changed} ${changed === 1 ? "korak izmijenjen" : "koraka izmijenjeno"}`,
              detail: { title: r.data.title_hr },
              log: { model: r.model, prompt_version: PROMPTS.rewrite.version, output: r.data, tokensIn: r.tokensIn, tokensOut: r.tokensOut },
            };
          });
          await db
            .from("recipes")
            .update({
              title: rewrite.title_hr,
              veganized_steps: rewrite.steps.map((s, n) => ({ n: n + 1, text_hr: s.text_hr, changed: s.changed })),
              tip_hr: rewrite.tip_hr,
            })
            .eq("id", recipeId!);
        }
        await finishRun(db, runId, "done", Date.now() - started, logs);
      } catch (err) {
        // the result stays usable: keep the original steps, just stop "pending"
        await db.from("recipes").update({ veganized_steps: raw.steps.map((s, n) => ({ n: n + 1, text_hr: s, changed: false })) }).eq("id", recipeId!);
        await finishRun(db, runId, "done", Date.now() - started, logs, { stage: "rewrite", message: err instanceof Error ? err.message : "rewrite failed" });
      }
    };
    if (input.defer) input.defer(rewriteSteps);
    else await rewriteSteps();
    return recipeId;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Nešto je pošlo po zlu.";
    if (recipeId) await db.from("recipes").update({ status: "error" }).eq("id", recipeId);
    await finishRun(db, runId, "error", Date.now() - started, logs, { stage: current, message });
    emit({ type: "error", stage: current, message });
    return null;
  }

  async function loadFacetOptions(conceptIds: string[]) {
    const out: Record<string, Record<string, string[]>> = {};
    if (!conceptIds.length) return out;
    // a concept's options include its descendants' products (tofu → tofu_dimljeni)
    const { data } = await db.from("v_products").select("concept_put, okus, zasladeno, namjena, oblik").overlaps("concept_put", conceptIds);
    for (const row of data ?? []) {
      for (const id of conceptIds) {
        if (!row.concept_put?.includes(id)) continue;
        const c = (out[id] ??= {});
        for (const k of FACET_KEYS) for (const v of row[k] ?? []) if (!(c[k] ??= []).includes(v)) c[k].push(v);
      }
    }
    // "plain" is only a real choice where flavoured variants exist (zobeni napitak), not for chia or tofu natur
    for (const c of Object.values(out)) if (c.okus?.length && !c.okus.includes(PLAIN)) c.okus.unshift(PLAIN);
    return out;
  }
}

async function finishRun(
  db: ReturnType<typeof adminDb>,
  runId: string | null,
  status: "done" | "error",
  ms: number,
  logs: StepLog[],
  error?: { stage: StageName; message: string },
) {
  if (!runId) return;
  await db
    .from("agent_runs")
    .update({
      status, finished_at: new Date().toISOString(), total_ms: ms,
      provider: logs.some((l) => l.model?.startsWith("openai:")) ? "gemini+openai" : "gemini",
      tokens_in: logs.reduce((s, l) => s + (l.tokensIn ?? 0), 0), tokens_out: logs.reduce((s, l) => s + (l.tokensOut ?? 0), 0),
    })
    .eq("id", runId);
  const rows = logs.map((l) => ({
    run_id: runId, stage: l.stage, model: l.model ?? null, prompt_version: l.prompt_version ?? null,
    output: (l.output ?? null) as never, ms: l.ms, error: null,
  }));
  if (error) rows.push({ run_id: runId, stage: error.stage, model: null, prompt_version: null, output: null, ms: 0, error: error.message } as never);
  if (rows.length) await db.from("agent_steps").insert(rows);
}
