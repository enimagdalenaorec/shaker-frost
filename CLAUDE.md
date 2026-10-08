# CLAUDE.md — veganizir.ai

> Status: **v6: the real catalog from the data teammate's handoff (`data-science/HANDOFF.md`) is live in Supabase in their own structure (§4); the mock catalog is retired; rules remapped to the real concepts.** Items marked ❓ are still open. This file is the source of truth: if code and this file disagree, fix one of them in the same commit.
>
> Context: hackathon **today in Zagreb, ~8 h**. Theme: an app with a medium-complexity AI layer that solves an everyday problem. **LLM provider: OpenAI or Google AI Studio (Gemini), as given by the organisers. No Anthropic API.** Team of 4: 2 build (app + data), 2 do branding and the pitch. A working demo beats completeness.

---

## 1. What we are building

**One line:** Paste a link to any online recipe. veganizir.ai finds the non-vegan ingredients, suggests several vegan alternatives for each, shows real products for every alternative in Zagreb stores, and builds a basket you can sort by one store, cheapest, or any nutrition value.

**The core loop (the demo; it must never break):**

1. Paste a recipe URL (text paste as a fallback) and tap **Veganiziraj**. **No account needed.**
2. The ingredients are extracted; **non-vegan** ones are flagged with a reason.
3. Per non-vegan ingredient: **2–3 vegan alternatives** (concepts), with reasoning, quantity ratio and confidence.
4. Per alternative: **several products from different stores**, with price, akcija and nutrition.
5. Add to the **Košarica** (works without an account; stored in the browser) and sort it:
   - **Sve u jednoj trgovini**: one store if possible, else the cheapest combination of the fewest stores (max 3). Exact.
   - **Najjeftinije**: the cheapest option per item.
   - **Nutritivne vrijednosti**: the best option per item by any of the **8 nutrition values**, ascending or descending.
6. **Spremi recept** requires logging in. Logged-in users also get the basket stored in the database (synced across devices).

**The home page (agreed by the team):**
- **One smart input:** "Zalijepi link recepta ili traži proizvod (npr. kruh)".
  - A URL or long multi-line text → **Veganiziraj**.
  - A short query → **Traži**.
  - The button label changes live as you type, so the user always knows what will happen.
- **Product search across the whole vegan catalogue,** not only recipe alternatives. "kruh" → a **"Na akciji" strip** first (matching products on akcija, biggest discount first), then **all results sorted by price per kg**. Each result shows the cheapest store, "+N trgovina" and **Dodaj u košaricu**.
- **"Često u tvojoj košarici":** the items the user adds to the basket most often, each with today's cheapest offer and the akcija badge; one tap adds it again. Empty state (new users and judges): **"Na akciji danas"**, the biggest vegan discounts.

**Why AI is essential (pitch sentence):** A keyword search cannot know that butter for *frying* becomes oil while butter for *flavour* becomes vegan butter, that milk for palačinke must be *unsweetened and unflavoured* while for a cake vanilla is fine, or that sarma needs *smoked* tofu to replace panceta. The model understands the recipe, the role of each ingredient and which product attributes fit. The database supplies every fact. **The model never invents a product, price or nutrition value.**

**Out of scope:** chatbot, price tracking, checkout, other diets, maps/routes, other cities, non-Croatian UI.

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| App | **Next.js 16.4 (App Router, `cacheComponents` on) + React 19 + TypeScript strict**, on **Vercel**. ⚠️ Newer than most training data: **read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code** (see `AGENTS.md`) |
| UI | **Tailwind + shadcn/ui**, mobile-first; tokens from the branding pair |
| Database | **One hosted Supabase project (region Frankfurt) = one Postgres database** for everything. No local Docker, no Supabase CLI: SQL migrations in `supabase/migrations/` are applied by `npm run db:migrate` (Node + `pg` over `DATABASE_URL`) |
| Auth | Supabase **email + password**, **"Confirm email" turned OFF** (judges register instantly). Guests use the app without an account (§5.4) |
| LLM | ✅ **Gemini via Google AI Studio** (`@google/genai` SDK), behind `lib/ai/llm.ts`. OpenAI stays possible through the same wrapper |
| Validation / tests | **Zod** for every LLM output and payload; **Vitest** for the optimiser and the JSON-LD parser |

### LLM wrapper rules
- `lib/ai/llm.ts` exposes only `generateJson({ schema, system, user, tier })` and `researchJson({ schema, system, user })` (web-enabled). Nothing else imports a provider SDK.
- `tier: 'fast' | 'strong'`. Model ids: defaults in `lib/ai/models.ts`, chosen from the **live model list of our key** (never guessed), overridable by env `LLM_MODEL_FAST` / `LLM_MODEL_STRONG`.
- Structured output: OpenAI → Structured Outputs with a strict JSON schema. Gemini → `responseSchema`. Always `zod.parse`. On failure, one retry with the error, then fail the stage gracefully.
- Web: OpenAI → the Responses API `web_search` tool. Gemini → the `google_search` / `url_context` tools. If web tools can't be combined with structured output in one call, use 2 calls (research → structure). **Check the provider's current docs before coding; don't rely on memory.**
- ❓ Check the rate limits on the organisers' keys (~4 LLM calls per recipe).

---

## 3. Architecture

```
          ┌──────────────────────────── Next.js (Vercel) ────────────────────────────┐
Browser ─▶│ UI: Recept · Košarica · Moji recepti · Prijava (sheet)                   │
 (guest   │  ├─ POST /api/veganize ── SSE stage events ──▶ live stage cards          │
 basket in│  │     ingest → extract → choose alternatives → offers ∥ rewrite          │
 local-   │  ├─ POST /api/basket/optimize ── lib/basket/optimize.ts (pure, tested)   │
 Storage) │  └─ server actions: saveRecipe (login required), basket sync, ...        │
          └──────────────┬───────────────────────────────────────┬───────────────────┘
                         │ supabase-js                            │ lib/ai/llm.ts → OpenAI | Gemini
                         ▼
          ┌──────────────── ONE Supabase Postgres ──────────────────────────────┐
          │ CATALOG   chains · concepts · products · offers                     │
          │           (handoff parquet → 3 CSVs → loader, §4.2)                 │
          │ KNOWLEDGE ingredients · substitution_rules (ours)                   │
          │ ── CONTRACT VIEWS (app reads only these) ────────────────────────── │
          │   v_concepts · v_rules · v_products · v_offers · rpc get_offers     │
          │ APP       profiles · recipes · recipe_ingredients ·                 │
          │           ingredient_alternatives · baskets · basket_items ·        │
          │           agent_runs · agent_steps                                  │
          └─────────────────────────────────────────────────────────────────────┘
```

**The refresh rule:** a new handoff from the data teammate goes through `export_handoff.py` → `npm run load:catalog` → `npm run validate:catalog`. No app code changes. If their columns change, fix the exporter or one view. App code reads only the contract views (§6).

---

## 4. The catalog

### 4.1 Decisions
- **Source:** the data teammate's handoff in `data-science/` (`HANDOFF.md` documents every column). The tables keep **their column names** (`product_key`, `vegan_class`, `atr_okus`, `pakiranje_kolicina` …); the §6 views translate them to the app's names.
- **Products:** only `vegan_class in ('vegan', 'potencijalno_vegan')` (18,753). `potencijalno_vegan` → `provjeri` (the Provjeri list, never in totals). `nesigurno` / `nije_vegan` are not imported.
- **Concepts are a hierarchy** (447, `roditelj`, `products.concept_put` = path from the root). A concept means **itself and all descendants**: `tofu` includes `tofu_dimljeni`, `tofu_natur` … (`get_offers`, `search_products(p_concept_id)`, rules).
- **Facets are lists** (`atr_okus`, `atr_zasladenost`, `atr_namjena`, `atr_oblik_obrada`): a product can be `mljeveno` *and* `integralno`. The okus value **`bez okusa / natur` also matches products with no flavour listed** (most plain products).
- **Prices: one row per product × chain, no per-store rows, no history.** `price` = the **25th percentile** of the chain's current Zagreb store prices (akcija included); `regular_price` = p25 of the regular price; `akcija` = price < regular_price; plus `n_stores` / `n_stores_akcija` ("akcija u 12/30 trgovina") and `akcija_price` (the lowest special price in any store). Stale prices are dropped; Kaufland's national price lists (non-Zagreb stores) are dropped. Web shops (biobio, tzh) keep their one price.
- **Store ids** stay in the contract as `<chain>:all` (chain-wide) and `<shop>:online`; `store_address` is NULL.
- **Allergen tags** (`soja`, `gluten`, `orasi`) are derived by the exporter from name + concept keywords (the handoff has no allergen column).
- **Images:** none in the handoff; the UI falls back to a chain-coloured initial badge and a concept icon.
- Data quality is the teammate's job; the app only guards against crashes (NULL-safe, no division by zero).

### 4.2 Load path

```
data-science/*.parquet ──scripts/catalog/export_handoff.py (duckdb)──▶ fixtures/catalog/{concepts,products,offers}.csv (git-ignored)
                       ──npm run load:catalog──▶ concepts · products · offers · chains   (one transaction, then refresh_catalog())
```

- `export_handoff.py` needs `pip install duckdb`. It reads `products`, `store_prices`, `offers` (web shops), `shop_products` (web-shop regular prices) and `concepts`.
- **Handoff quirk handled in the exporter:** `store_prices.current_price` does **not** include the special price (it equals `regular_price` even when `special_price` is lower), so the paid price is `least(current_price, special_price)` when `akcija`.
- `refresh_catalog()` fills `products.name_norm` / `search_norm`, `concepts.n_products` (buyable incl. descendants) and refreshes `best_offers`.

### 4.3 Database tables (`0009_handoff_catalog.sql`)

```sql
chains   (code text pk, name text, kind text check in ('store','webshop'), logo_url text null)
concepts (concept_id text pk, naziv, run,            -- run 'A' = vegan substitute, 'B' = plain plant food
          obitelj, roditelj, razina, put_nazivi, korijeni text[], sinonimi text[],
          zamjenjuje text[],                         -- what the substitute replaces: 'mlijeko', 'jaje kao vezivo'
          n_products int)                            -- buyable incl. descendants, by refresh_catalog()
products (product_key text pk, has_barcode, name, brand, brands text[], url,
          vegan_class, vegan_reason, evidence_class, vegan_evidence jsonb,
          kcal, fat, saturated_fat, carbohydrates, sugars, protein, salt, fiber numeric null,
          nutrition_izvor, nutrition_izvor_opis, nutrition_procijenjeno, nutrition_nedostaje text[], nutrition_praznina_opis,
          concept_id → concepts NULL, concept_put text[], std_naziv,
          atr_okus, atr_zasladenost, atr_prehrambena_svojstva, atr_oblik_obrada, atr_namjena, atr_porijeklo text[],
          pakiranje_kolicina numeric, pakiranje_jedinica ('g'|'ml'), pakiranje_komada int,   -- per piece × pieces
          tags text[], search_text, name_norm, search_norm)    -- GIN on concept_put and trigram on search_norm
offers   (product_key → products, seller → chains, source ('lanac'|'trgovina'),
          price, regular_price, akcija bool, akcija_price, n_stores, n_stores_akcija, prilika bool,
          price_date, url, primary key (product_key, seller))
```

---

## 5. Our tables

### 5.1 Knowledge (curated, committed as seed SQL)

```sql
ingredients (slug text pk,           -- 'maslac','mlijeko','jaje','mljeveno_meso','panceta','tjestenina_s_jajima'…
             name_hr, aliases text[], is_vegan bool, category, grams_per_piece numeric)

substitution_rules (id bigserial pk, ingredient_slug → ingredients,
             role text,              -- 'any','frying','flavour','baking','binder','leavening','base','smoky',
                                     -- 'sweet','creaminess','liquid','sauce','glaze'
             concept_id text,        -- the teammate's concept id; matches the concept AND its descendants
             prefer jsonb,           -- facet values exactly as in the catalog {"zasladeno":"nezaslađeno","okus":"bez okusa / natur"}
             ratio numeric default 1,-- g/ml of substitute per g/ml of original
             notes_hr text, rank int)
```

`supabase/seed/knowledge.sql`: 54 ingredients (37 non-vegan, incl. `meso_komadi` for whole-cut meat, `riba`, `mascarpone`, `piskote`; **Vegeta is vegan**) and 93 rules on the real concept ids. `npm run validate:catalog` fails if a rule's concept has no buyable product or a `prefer` value doesn't exist in that concept.

### 5.2 App tables

```sql
profiles (id uuid pk → auth.users, display_name, household_size int default 2,
          excluded_tags text[] default '{}', created_at)

recipes (id uuid pk, user_id uuid NULL → auth.users,   -- NULL = guest run, not saved
         title, source_url, source_kind check in ('url','text'),
         ingest_method text,          -- 'jsonld','site_api','llm_html','web','pasted'
         raw_text text not null, servings_original int, servings_target int,
         veganized_steps jsonb, status check in ('processing','done','error'),
         saved_at timestamptz NULL, created_at)

recipe_ingredients (id uuid pk, recipe_id → recipes cascade, position int, raw_text,
         name_hr, ingredient_slug text NULL, quantity numeric, unit text,  -- g/ml/kom
         quantity_estimated bool, role text, is_vegan bool, reason_hr text, confidence numeric)

ingredient_alternatives (id uuid pk, recipe_ingredient_id → recipe_ingredients cascade,
         concept_id text, facets jsonb, rank int, ratio numeric,
         required_qty numeric, required_unit text,
         reasoning_hr text, confidence numeric, has_products bool, is_selected bool default false)

baskets (id uuid pk, user_id uuid unique → auth.users,     -- logged-in users only
         strategy check in ('one_store','cheapest','nutrition') default 'cheapest',
         nutrition_metric text default 'proteins', nutrition_order check in ('asc','desc') default 'desc')

basket_items (id uuid pk, basket_id → baskets cascade,
         kind text check in ('concept','product'),
         -- concept: from a recipe; the optimiser picks the product AND the store
         concept_id text NULL, facets jsonb, required_qty numeric, required_unit text,
         -- product: from search / often-bought; the product is fixed, the optimiser picks the store
         item_id text NULL, packages int default 1,
         recipe_id NULL, alternative_id NULL, pinned_item_id text NULL)

basket_history (id bigserial pk, user_id → auth.users, kind text,
         concept_id text NULL, facets jsonb, item_id text NULL,
         source text check in ('recipe','search','often'), added_at timestamptz default now())
         -- append-only log of every "Dodaj u košaricu"; powers "Često u tvojoj košarici"

agent_runs  (id uuid pk, user_id NULL, recipe_id, status, started_at, finished_at, total_ms,
             provider, tokens_in int, tokens_out int)
agent_steps (id bigserial pk, run_id → agent_runs cascade, stage, model, prompt_version,
             input jsonb, output jsonb, ms int, error text, created_at)
```

App tables store catalog ids (`concept_id`, `pinned_item_id`) as **plain text without foreign keys**, so reloading the catalog never touches saved recipes.

### 5.3 Security (RLS)
- Catalog, knowledge and views: `select` for `anon` and `authenticated`.
- `recipes` and children: the client can only read/write rows where `user_id = auth.uid()`.
  Guest rows (`user_id is null`) are only touched by **server code with the service role**, by recipe id (an unguessable uuid).
- `baskets`, `basket_items`, `basket_history`, `profiles`: `user_id = auth.uid()`.
- `agent_runs` / `agent_steps`: server only.

### 5.4 Guest vs. logged in

| Action | Guest | Logged in |
|---|---|---|
| Veganize a recipe | ✅ (`recipes.user_id = NULL`) | ✅ |
| See alternatives and products | ✅ | ✅ |
| Basket + all 3 sorts | ✅ in **localStorage** | ✅ in the database |
| Exclusion chips | ✅ localStorage | ✅ `profiles.excluded_tags` |
| Product search | ✅ | ✅ |
| Često u tvojoj košarici | ✅ from the localStorage history | ✅ from `basket_history` |
| **Spremi recept** / Moji recepti | → login sheet | ✅ |

- **Login sheet** (email + password, "Registriraj se" / "Prijavi se"). After login, the pending action completes automatically:
  - `claimRecipe(id)`: `update recipes set user_id = auth.uid(), saved_at = now() where id = $1 and user_id is null`;
  - `mergeGuestBasket(items, history)`: appends the localStorage basket items **and history** to the DB, then clears localStorage.
- **Demo account** (seeded, password from env `DEMO_PASSWORD`): ~15 `basket_history` rows, so "Često u tvojoj košarici" looks real in the pitch.
- The basket UI uses one hook, `useBasket()`, with two storage adapters (local / DB). The optimiser is the same server route for both.

### 5.5 Conventions
- **Unknown = NULL, never 0.**
- Units: `g`, `ml`, `kom`. ml ≈ g. `kom` → grams via `grams_per_piece`; **no `grams_per_piece` → required quantity unknown → the basket buys 1 package** (never a guessed 50 g per piece).
- EUR `numeric`. `price` is what you pay (p25 of the chain's Zagreb stores, akcija included); `regular_price` is shown struck through when higher; `n_stores_akcija / n_stores` says how widespread the akcija is.
- Nutrition sort: any of the 8, user-chosen direction, NULL always last, `nutrition_source` badge visible. `energy_kj = round(energy_kcal × 4.184)` is display only.

---

## 6. Contract views (the only catalog interface for app code)

```sql
v_concepts (concept_id, name_hr, parent, group_name, run, zamjenjuje, n_products)
v_rules    (ingredient_slug, role, concept_id, concept_name, concept_group, prefer, ratio, notes_hr, rank)
v_products (item_id, barcode, name, brand, image_url, product_url, concept_id, concept_name, concept_group,
            concept_put, std_naziv,
            okus, zasladeno, namjena, oblik, svojstva,      -- text[] facets
            eko, tags,
            net_qty,                         -- size_value × pack_count
            size_value, size_unit, pack_count, vegan_status, provjeri, vegan_reason, vegan_evidence,
            energy_kcal, energy_kj, fat, saturated_fat, carbohydrates, sugars, proteins, salt, fiber,
            nutrition_source, nutrition_source_hr, nutrition_estimated)
v_offers   (item_id, chain_code, chain_name, chain_kind, chain_logo_url,
            store_id ('<chain>:all' | '<shop>:online'), store_address (NULL), store_city, is_chainwide (true),
            price, regular_price, is_akcija, discount_pct, unit_price_per_kg_l, price_date,
            akcija_price, n_stores, n_stores_akcija, prilika)          -- one row per product × chain
rpc get_offers(p_concept_ids text[], p_exclude_tags text[])
            -- every offer of every product in the concepts OR THEIR DESCENDANTS; concept_id in the result is
            -- the REQUESTED id. Facet matching happens in lib/catalog/basket-candidates.ts
rpc get_offers_for_items(p_item_ids text[])
v_best_offers (item_id, chain_code, chain_name, price, regular_price, is_akcija, discount_pct,
               unit_price_per_kg_l, n_chains, n_stores, any_akcija, max_discount_pct)   -- one row per product
rpc search_products(p_query text, p_only_akcija bool default false,
                    p_concept_id text default null, p_limit int default 60)   -- p_concept_id incl. descendants
            -- every token of the unaccented, lower-cased query must match search_norm (ILIKE);
            --   0 hits → trigram similarity fallback (typos: "kruhh")
            -- match_tier: 1 = the product name STARTS with a query token ("Kruh polubijeli"),
            --             2 = whole-word match ("Tost kruh"), 3 = substring/trigram ("Smjesa za kruh")
            -- order: match_tier, then unit_price_per_kg_l (NULL last), then price
            -- returns v_products + v_best_offers columns + match_tier; also used by "Zamijeni" (p_concept_id)
rpc often_bought(p_limit int default 8)
            -- auth.uid()'s basket_history grouped by (kind, concept_id, facets, item_id):
            -- count + last_added + today's cheapest offer; order by count desc, last_added desc
rpc todays_deals(p_limit int default 8)
            -- the empty state: akcija products with the biggest discount_pct
```

Why search sorts by **price per kg** and not package price: 300 g of bread at 0.99 € is more expensive than 1 kg at 2.49 €. Why it sorts by **match tier first**: otherwise the cheapest "kruh" result would be a bread-flour mix.

---

## 7. Validation (the mock is retired)

The synthetic mock catalog (`scripts/mock/`, `fixtures/catalog_mock.csv`) was removed when the real handoff arrived; it is in git history.

**Validator** `npm run validate:catalog`:
- every `substitution_rules.concept_id` exists and has ≥ 1 non-provjeri product with an offer (incl. descendants);
- every `prefer` facet value exists among that concept's products;
- per demo recipe: the best single chain for the rank-1 alternatives.

**LLM eval:** the 30 recipes in `test_links.txt` (coolinarika). Run each through `runPipeline` and read back `recipe_ingredients` + `ingredient_alternatives`; check missed non-vegan ingredients, roles, label ↔ concept agreement, facets and quantities.

---

## 8. AI pipeline (built: `lib/ai/pipeline.ts`, run from the terminal with `npm run veganize -- sarma|<url>`)

`POST /api/veganize` with body `{ url? | text? | example?, excludeTags? }` returns an SSE stream of `PipelineEvent`s. `/recept/novi` renders them live as stage cards, then redirects to `/recept/<id>`, which loads the saved result plus live offers.

| # | Stage | How | Typical time |
|---|---|---|---|
| 0 | **ingest** (`lib/recipe/ingest.ts`) | `recepti.index.hr` → its API `recepti-api.index.hr/api/services/app/Recipe/Get?Id=<number from URL>`. Any other URL → schema.org `Recipe` JSON-LD (coolinarika and most recipe sites; HTML entities decoded). No JSON-LD → page text → LLM extraction. Pasted text → LLM extraction. Example chips → saved real pages in `fixtures/recipes/*.json` (work offline) | 0–3 s |
| 1 | **analyze** (strong) | Per ingredient: `name_hr`, `slug` (from the `ingredients` vocabulary), quantity in g/ml (kom only for eggs), **role** (binder / leavening / base / smoky / frying / flavour / baking / creaminess / sauce / glaze / sweet / liquid / any) and **status** (vegan / not_vegan / **depends**), plus a reason and a confidence. Also the dish category. A line with several ingredients ("3 jaja, 1 kiselo vrhnje") yields several items with the **same** `index`; each item gets a `uid` (its position in the analysis) used by the later stages | 2–4 s |
| 2 | **research** (fast, cached) | One call for all risky ingredients plus the dish. Cached per `slug|role|dish category` (`substitution_research`) and per dish (`dish_research`), so repeats cost about 0.1 s. Tries Google Search grounding; **our free-tier key refuses it**, so it silently uses model knowledge (`method='ai'`). A billed key or OpenAI makes it web-grounded with sources, with no code change | 0.1–3 s |
| 3 | **alternatives** (strong) | Candidates from `v_rules` (with their `prefer` facets) plus the facet values that exist per concept (incl. descendants), plus the research notes. 1–3 alternatives per ingredient. **Ids and facet values are validated against the DB**; `concept_id=null` is allowed (e.g. "izostavi", "provjeri deklaraciju"), shown as "bez kupnje". **The label must fit the concept**: a label that shares no word stem with its concept is re-resolved from the label, or becomes `concept_id=null`. The global concept list (with `zamjenjuje` hints) is sent only when some ingredient has no rule | 3–6 s |
| 4 | **offers** ∥ **rewrite** | `get_offers` SQL (no LLM) ∥ steps rewritten with the swaps (fast), changed steps flagged | 1–2 s |
| 5 | **save** | `recipes`, `recipe_ingredients`, `ingredient_alternatives`, `agent_runs`, `agent_steps` | 0.3 s |

**Measured end to end:** 8–12 s typical, about 20 s when the free tier is congested.

**LLM wrapper (`lib/ai/llm.ts`), learned the hard way on our key:**
- The key is **free tier**: Pro models have no quota, search grounding gets 429, and quotas are **per model**.
- **Model chains** (`lib/ai/models.ts`): strong = 3.5-flash-lite → 3.1-flash-lite → 3.5-flash → flash-latest; fast = 3.1-flash-lite → flash-lite-latest → 3.5-flash-lite. `gemini-3.5-flash` swings between 4 s and 100 s, so it is a fallback, not the lead.
- **Hedged calls:** if a model has not answered after 6 s (strong) or 3.5 s (fast), the next model starts in parallel and the first valid answer wins. Errors hand over immediately.
- **Thinking level** LOW (strong) / MINIMAL (fast): this cut the run from about 23 s to about 9 s.
- JSON-schema output from zod (`z.toJSONSchema`), validated with zod, plus one repair retry.
- **OpenAI is the last-resort backup** (`lib/ai/openai.ts`). It is used only when every Gemini model failed and `OPENAI_API_KEY` is set. Default model is `gpt-5.4-mini` (measured: 16.6 s per recipe, vs 29 s for `gpt-5.5`). Calls use a strict JSON schema with `reasoning_effort` low/minimal; unsupported params are dropped automatically, and a rejected schema falls back to JSON mode. Test with `LLM_FORCE_FALLBACK=openai npm run veganize -- palacinke`. Runs that used it log `provider = 'gemini+openai'`.

**Prompts** live in `lib/ai/prompts.ts` (versioned, logged in `agent_steps.prompt_version`). Croatian output; the model only chooses among ids and values we pass in.

## 9. Basket optimisation (`lib/basket/optimize.ts`, pure, tested)

**Optimise per chain; show stores within the chain.** There is no user location, so picking between 30 identical-price Konzums is arbitrary. The chain answers "where", and the store list answers "which shop".

- An offer for (item, chain) is one catalog row: the chain's p25 Zagreb price (§4.1). There are no per-store rows, so the store list is "sve trgovine lanca" (`:all`).
- `packages = ceil(required_qty / net_qty)`, `line_cost = packages × price`, `used_cost = required_qty / net_qty × price` (shown as "iskorišteno").
- Totals exclude `provjeri` offers. **Unknown package size → assume 1 package**, flagged "pakiranje nepoznato" (`sizeKnown: false`, no "iskorišteno"). The same concept + facets from several recipes merge into one line.
- **Recipe swaps enter the basket as the alternative (concept), never as a fixed product.** "Dodaj: Chia sjemenke" stores `{kind: 'concept', conceptId, facets, forIngredient: 'jaje', requiredQty}`; the basket picks the product **and** the shop per sort mode. The basket shows "Chia sjemenke · za: jaje" plus the current pick. Products on the recipe screen are only a price preview.
- Facet preferences (e.g. unsweetened, smoked) are **strict** in `cheapest` / `nutrition`: only the best facet-matching tier is eligible. In `one_store` they are **soft**: fewer shop visits wins, then the best facet match inside the chosen shops (tested).
- **Two kinds of items:**
  - **concept** items (from recipes): the candidates are all offers of all products in the concept, facet-ranked;
  - **product** items (from search or often-bought): the candidates are only that product's offers, `line_cost = packages × price`.

  The strategies treat both kinds identically; a product item just has fewer candidates.

**Strategies:**
1. **one_store:** every subset of 1–3 chains (~22 chains incl. web shops → ≤ 1,793 subsets, trivial). Cost = the cheapest covering offer per item within the subset. Minimise (number of chains, cost). For the chosen chain(s), list **the Zagreb stores that carry all assigned items** (with `:all` = every store). Always show the best single chain and its missing items. If ≤ 3 chains can't cover everything: fall back to cheapest + "Proizvodi su raspršeni po trgovinama". Web shops are labelled "online".
2. **cheapest:** the minimum `line_cost` per item; tie-break by unit price.
3. **nutrition:** the best offer per item by the chosen metric and direction; NULL last; tie-break by cost. Plus a basket nutrition summary for the quantities used.

Zamijeni pins an item. Output: grouped by chain, subtotals, total, and the saving vs. the most expensive option.

---

## 10. Screens (Croatian, mobile-first, branding from the design pair)

Header on every page: logo · basket icon with item count · Prijava / profile.

1. **Početna** (`/`):
   - the **smart input** (§1), with a live button label: Veganiziraj / Traži;
   - chips under it: 3 example recipes + 2 example searches ("kruh", "zobeno mlijeko");
   - **"Često u tvojoj košarici"**: horizontal cards (name, "3×", cheapest chain + price, akcija badge, **+** button). Empty state: **"Na akciji danas"** (`todays_deals`);
   - for logged-in users: the last 3 saved recipes.
2. **Pretraga** (`/trazi?q=kruh`, a shareable URL):
   - the smart input on top, prefilled; live results while typing (300 ms debounce);
   - a **"Na akciji"** strip (akcija matches, biggest discount first);
   - **"Svi rezultati"**: sort chips **€/kg** (default) · **Cijena** · **Popust**, plus a **Samo akcije** toggle;
   - each row: name, brand, size, cheapest chain badge + price (regular price struck through), €/kg, "+N trgovina" (expands to every store's price), **Dodaj** with a quantity stepper;
   - empty result: "Nema rezultata za 'x'", plus a trigram "Jeste li mislili…" suggestion.
3. **Recept** (`/recept/[id]`, streamed after Veganiziraj):
   - exclusion chips and live stage cards;
   - the ingredient list (non-vegan highlighted) → alternative cards (facets, ratio, reasoning, confidence) → product rows (chain badge/logo, price, akcija + struck-through regular price, 8 nutrition values with source badge, Provjeri list, store link);
   - the veganised steps;
   - **Dodaj u košaricu**; **Spremi recept** (→ login sheet for guests).
4. **Košarica** (`/kosarica`):
   - 3 strategy toggles; metric selector (8) + direction;
   - items grouped by chain with "dostupno u: <stores>", recipe items and search items in the same list;
   - packages, price, "iskorišteno", Zamijeni (search within the concept), totals, nutrition summary;
   - a guest banner: "Prijavi se da sačuvaš košaricu".
5. **Moji recepti** (`/recepti`): logged in only; saved results, no AI re-run.
6. **Login sheet:** email + password, register or log in, then completes the pending action.
7. *Stretch:* demo replay of a stored real run; a product detail sheet.

All UI strings live in `lib/i18n/hr.ts`. Chain logos (if the branding pair has time): `public/chains/<code>.svg`.

---

## 11. Repository layout

```
app/  page.tsx (Početna) · trazi/ · recept/[id]/ · kosarica/ · recepti/ · api/veganize/route.ts · api/basket/optimize/route.ts · actions/
components/  SmartInput · ProductRow · OftenBoughtStrip · DealsStrip · StageCard · AlternativeCard · OfferRow · NutritionTable · StrategyToggle · LoginSheet · ChainBadge
lib/
  ai/llm.ts · ai/prompts/ · ai/schemas.ts
  ai/pipeline/ ingest/{jsonld,index-hr,html-llm,web}.ts · extract.ts · alternatives.ts · offers.ts · rewrite.ts · run.ts
  basket/optimize.ts · basket/useBasket.ts (local + DB adapters)
  db/{server,browser,catalog,types}.ts · i18n/hr.ts
supabase/migrations/ 0001–0008 (mock catalog, knowledge, app, views, RLS, pipeline, user data) · 0009_handoff_catalog.sql (real catalog + views)
supabase/seed/ knowledge.sql (ingredients + substitution_rules)
scripts/ catalog/export_handoff.py · load-catalog.ts · validate-catalog.ts · seed-knowledge.ts
fixtures/ recipes/ · catalog/ (exported CSVs, git-ignored)
data-science/ the data teammate's handoff (HANDOFF.md, reports; parquet files are git-ignored)
docs/AI-TOOLS.md
```

## 12. Commands

```bash
npm install
npm run env:check                                  # prints set/missing per variable, never the values
npm run db:migrate                                 # applies supabase/migrations/*.sql in order
python3 scripts/catalog/export_handoff.py data-science fixtures/catalog   # needs: pip install duckdb
npm run load:catalog                               # loads fixtures/catalog/*.csv
npm run seed:knowledge
npm run validate:catalog
npm run db:types                                   # npx supabase gen types --db-url $DATABASE_URL
npm run dev
npm test
```

Env (`.env.local`, git-ignored, chmod 600; the template `.env.example` is committed): `LLM_PROVIDER=gemini`, `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `DATABASE_URL`, `DEMO_PASSWORD`, `ENABLE_WEB_FALLBACK=true`, optional `LLM_MODEL_FAST` / `LLM_MODEL_STRONG`.
**Claude never reads or prints `.env.local`.** Use `npm run env:check` to verify it.

---

## 13. Rules for Claude (and humans) in this repo

- **Facts from the database, judgement from the model.** An LLM never outputs a price, product id or nutrition value.
- **Unknown = NULL, never 0.**
- **App code reads the catalog only through §6** (`lib/db/catalog.ts`).
- **Only `lib/ai/llm.ts` imports an LLM SDK.** Model ids come from env. Check the provider's current docs; don't guess parameters.
- Schema change = new migration + `pnpm db:types` + update §4–§6 here, in the same commit.
- Secrets are server-only; the service role is used only in server code. LLM calls only run in route handlers and server actions.
- Tests are written with the pure logic (`basket/optimize`, `ingest/jsonld`).
- Code in English; UI strings in Croatian via `lib/i18n/hr.ts`.
- No state library, no ORM, no extra services.
- **`main` must always be demoable.** Commit small and often.

---

## 14. Timeline (T = start of build, ~8 h)

| When | Phase | Exit criterion |
|---|---|---|
| T+0:00–0:30 | **P0** Next.js + shadcn, Supabase linked (Confirm email off), Vercel deploy, LLM smoke test | Blank app live; the LLM returns parsed JSON |
| T+0:30–1:30 | **P1** Migrations, loader, mock built from `c_products.csv` and loaded, contract views incl. `search_products` | `get_offers` and `search_products('kruh')` return sensible rows |
| T+1:00–2:00 | **P1b** Ingredients + rules drafted, reviewed by the data teammate, seeded; validator green | Every demo non-vegan ingredient → ≥ 2 concepts → ≥ 2 products in ≥ 2 chains |
| T+1:00–2:00 | **P2** `optimize.ts` (concept + product items) + tests (in parallel) | 3 strategies correct |
| T+2:00–3:15 | **P3** Ingest A(+B) + C/E, stages 1–4, SSE, logging | 3 demo URLs end to end in < 30 s |
| T+3:15–4:45 | **P4** Recept + Košarica UI (guest flow, localStorage basket) | **CUT LINE T+4:45: the core loop works on a phone, deployed** |
| T+4:45–5:30 | **P5** Početna: smart input, Pretraga page, Na akciji danas, Često u košarici (localStorage history) | "kruh" → akcija strip + €/kg list → Dodaj → appears in the basket and in Često |
| T+5:30–6:15 | **P6** Login sheet, claimRecipe, Moji recepti, DB basket + history + merge, demo account; exclusion chips | Guest → login → recipe saved, basket and history kept |
| T+6:15–6:45 | **P7** Branding applied; loading, empty and error states; tier D web fallback; demo replay if time allows | |
| **T+6:45** | **CODE FREEZE** | Only bug fixes after this point |
| T+6:45–8:00 | Rehearse on the deployed URL, record the backup video, finalise the pitch | |

**If we fall behind, cut in this order:**
1. demo replay;
2. tier D web fallback;
3. exclusion chips;
4. DB sync of the basket/history (keep localStorage + recipe saving);
5. the trigram "Jeste li mislili";
6. Moji recepti list (keep saving).

The core loop, search and "Često u košarici" are never cut.

## 15. Team

| Who | Owns |
|---|---|
| _You_ + Claude Code | The app: P0–P6 |
| _Data teammate_ | The handoff in `data-science/` (HANDOFF.md); reviewing `substitution_rules`; real numbers for the pitch |
| _Branding pair_ | Logo, colours and font → Tailwind tokens by **T+3:00**; chain logos (optional); pitch deck, demo script, backup video, `docs/AI-TOOLS.md` |

## 16. Still open

1. ❓ Gemini rate limits on our key (free tier?). This decides the fast/strong models per stage.
2. ✅ Real catalog loaded from the handoff (§4).
3. ❓ Teammate: `store_prices.current_price` ignores the special price (worked around in the exporter); `brands[1]` is sometimes a category or warehouse; "prehrambeni kvasac" has no concept (the classic vegan parmezan swap); allergen tags.
4. ❓ Per-store akcija dropdown ("akcija u Konzum Ilica") would need a slim per-store table; today only "N/M trgovina".
5. ✅ index.hr endpoint found: `Recipe/Get?Id=<id>`.
