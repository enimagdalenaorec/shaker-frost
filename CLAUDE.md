# CLAUDE.md — veganizir.ai

> Status: **v5: plan agreed (incl. home page search + "često u košarici"), catalog schema defined (slimmed from the data teammate's `c_products`), build starting.** Items marked ❓ are still open. This file is the source of truth: if code and this file disagree, fix one of them in the same commit.
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
          │ CATALOG   chains · stores · concepts · products · offers            │
          │           (filled by the loader from ONE flat import CSV, §4.2)     │
          │ KNOWLEDGE ingredients · substitution_rules (ours)                   │
          │ ── CONTRACT VIEWS (app reads only these) ────────────────────────── │
          │   v_concepts · v_rules · v_products · v_offers · rpc get_offers     │
          │ APP       profiles · recipes · recipe_ingredients ·                 │
          │           ingredient_alternatives · baskets · basket_items ·        │
          │           agent_runs · agent_steps                                  │
          └─────────────────────────────────────────────────────────────────────┘
```

**The swap rule:** mock and real data use **the same import CSV format and the same loader**. When the data teammate's real export is ready: `pnpm load:catalog real.csv`, then `pnpm validate:catalog`. No code changes. If their columns change, fix the loader mapping or one view. App code reads only the contract views (§6).

---

## 4. The catalog

### 4.1 Decisions
- **One row per (product, store) in the import** (the teammate's final format). The database **normalises** it into `products` (one row per product) + `offers` (one row per product × store). The product attributes are not repeated per store.
- **Every suggestable vegan product is imported:** `suggestable = true`, not excluded, no animal conflict, not a price outlier. **`concept_id` is optional.**
  - Products with a concept (≠ `ostalo`) can be recipe alternatives.
  - **All** imported products are searchable. Search needs this: e.g. *kruh* has no substitute concept. Stores: Zagreb stores, chain-wide prices (`store_id = all`) and the web shops. The teammate filters on export; the loader filters again defensively.
- **Store ids are namespaced:** `konzum:S10`, `lidl:all`, `tzh:online`. The raw `store_id` values (`S10`, `008`, `all`) are not unique across chains.
- **Images are optional:** `chains.logo_url` and `products.image_url` are nullable. The UI falls back to a chain-coloured initial badge and a `concept_group` icon.
- **Derived values are computed, not imported:** akcija, unit price, kJ, n_offers / n_chains, median price.
- The current values in `c_products` are **partly mock**. Data quality is the teammate's job; the app only guards against crashes (NULL-safe, no division by zero).

### 4.2 Import CSV format (the contract with the data teammate)

One flat CSV, UTF-8, header row, **one row per product × store**, ~41 columns (down from 68). Product columns are identical on every row of the same `item_id`.

| Import column | ← from `c_products` | Notes |
|---|---|---|
| `item_id` | item_id | product key |
| `barcode` | barcode | text, nullable |
| `name`, `brand` | name, brand | |
| `image_url` | *(new, optional)* | |
| `product_url` | url | optional, mostly web shops |
| `concept_id`, `concept`, `concept_parent`, `concept_group` | same | → `concepts` table |
| `concept_confidence` | std_confidence | < 0.5 → "manje sigurno" |
| `okus`, `zasladeno`, `namjena`, `oblik`, `obogaceno` | same | facets the AI chooses from |
| `eko` | eko | → "bio" badge |
| `tags` | components **+ allergens** | JSON list, e.g. `["soja","gluten"]`; ❓ allergens are new; until then the loader derives soja/gluten/orasi from `search_text` keywords |
| `size_value`, `size_unit`, `pack_count` | same | unit: `g`, `ml`, or `kom` |
| `vegan_status` | same | only `vegan` / `probably` arrive |
| `provjeri` | same | → Provjeri list, never in totals |
| `vegan_evidence` | vegan_evidence (+ evidence_source, vegan_rule folded in) | JSON |
| `energy_kcal`, `fat`, `saturated_fat`, `carbohydrates`, `sugars`, `proteins`, `salt`, `fiber` | same | per 100 g/ml, empty = unknown |
| `nutrition_source` | the 8 `*_src` collapsed into one | the least reliable source among the values: `deklaracija` / `web` / `procjena` |
| `search_text` | search_text | for the Zamijeni search |
| `store_chain` | store_chain | |
| `chain_logo_url` | *(new, optional)* | |
| `store_id` | store_id | raw; the loader namespaces it |
| `store_address`, `store_city` | store_address, *(new)* city | |
| `price`, `regular_price`, `price_date` | same | `akcija` = price < regular_price |

**Dropped (27):**
- **derivable:** `akcija`, `n_offers`, `n_chains`, `median_price`, `unit_price_eur_per_kg_l`, `name_norm`, `nutrition_complete7`, `source` (→ `chains.kind`);
- **used only by the teammate's pipeline (filtered before export):** `suggestable`, `excluded`, `animal_conflict`, `price_outlier`, `rule_candidates`;
- **merged:** `evidence_source`, `vegan_rule` (→ `vegan_evidence`); the 8 `*_src` (→ `nutrition_source`); `components` (→ `tags`);
- **unused:** `package` (replaced by the size fields), `plain` (covered by okus + zasladeno), `product_type`, `product_category` (13 % filled, concepts cover them), `nutrition_note`, `nutrition_refs`.

### 4.3 Database tables (normalised)

```sql
chains   (code text pk, name text, kind text check in ('store','webshop'), logo_url text null)
stores   (id text pk,                      -- 'konzum:S10', 'lidl:all', 'tzh:online'
          chain_code → chains, address text null, city text null,
          is_chainwide bool)               -- true for ':all' (price valid in every store of the chain)
concepts (id text pk, name_hr, parent, group_name)
products (item_id text pk, barcode, name, brand, image_url null, product_url null,
          concept_id → concepts NULL, concept_confidence numeric,
          okus, zasladeno, namjena, oblik, obogaceno, eko bool, tags text[],
          size_value numeric, size_unit text, pack_count int default 1,
          vegan_status text, provjeri bool, vegan_evidence jsonb,
          energy_kcal, fat, saturated_fat, carbohydrates, sugars, proteins, salt, fiber numeric null,
          nutrition_source text null, search_text text,
          search_norm text)              -- lower(unaccent(name ‖ brand ‖ search_text)), filled by refresh_catalog()
                                         -- (unaccent isn't immutable, so not a generated column); GIN trigram index
offers   (item_id → products, store_id → stores, price numeric, regular_price numeric null,
          price_date date, primary key (item_id, store_id, price_date))
```

Loader `scripts/load-catalog.ts`: streams the CSV with a real CSV parser into the staging table `import_rows` (all text). Then the SQL `refresh_catalog()` upserts chains → stores → concepts → products (distinct on `item_id`) → offers, and truncates the old catalog first.

---

## 5. Our tables

### 5.1 Knowledge (curated, committed as seed SQL)

```sql
ingredients (slug text pk,           -- 'maslac','mlijeko','jaje','mljeveno_meso','panceta','tjestenina_s_jajima'…
             name_hr, aliases text[], is_vegan bool, category, grams_per_piece numeric)

substitution_rules (id bigserial pk, ingredient_slug → ingredients,
             role text,              -- 'any','frying','flavour','binder','leavening','creaminess','smoky','sweet','base'
             concept_id text,        -- the teammate's concept ids (validated)
             prefer jsonb,           -- soft facet preferences {"zasladeno":"nezaslađeno","okus":"bez okusa"}
             ratio numeric default 1,-- g/ml of substitute per g/ml of original
             notes_hr text, rank int)
```

About 30 non-vegan ingredients × 2–3 rules. **The LLM drafts them from the real concept list** (`scripts/rules/draft.ts`), a human reviews them (~30 min), and they are committed. They use the teammate's real `concept_id`s, so they survive the switch to real data.

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
- Units: `g`, `ml`, `kom`. ml ≈ g. `kom` → grams via `grams_per_piece`.
- EUR `numeric`. `price` is what you pay (already the akcija price); `regular_price` is shown struck through when higher.
- Nutrition sort: any of the 8, user-chosen direction, NULL always last, `nutrition_source` badge visible. `energy_kj = round(energy_kcal × 4.184)` is display only.

---

## 6. Contract views (the only catalog interface for app code)

```sql
v_concepts (concept_id, name_hr, parent, group_name, n_products)
v_rules    (ingredient_slug, role, concept_id, prefer, ratio, notes_hr, rank)
v_products (item_id, barcode, name, brand, image_url, product_url, concept_id, concept_group,
            okus, zasladeno, namjena, oblik, obogaceno, eko, tags,
            net_qty,                         -- size_value × pack_count
            size_unit, pack_count, vegan_status, provjeri, vegan_evidence, concept_confidence,
            energy_kcal, energy_kj, fat, saturated_fat, carbohydrates, sugars, proteins, salt, fiber,
            nutrition_source)
v_offers   (item_id, chain_code, chain_name, chain_kind, chain_logo_url,
            store_id, store_address, is_chainwide,
            price, regular_price, is_akcija, unit_price_per_kg_l, price_date)  -- latest date per (item, store)
rpc get_offers(p_concepts jsonb, p_exclude_tags text[])
            -- p_concepts = [{concept_id, facets}] → v_products ⨝ v_offers + facet_match_score,
            -- ordered by score desc, then price
v_best_offers (item_id, chain_code, chain_name, price, regular_price, is_akcija, discount_pct,
               unit_price_per_kg_l, n_chains, any_akcija)   -- one row per product: its cheapest offer
rpc search_products(p_query text, p_only_akcija bool default false,
                    p_concept_id text default null, p_limit int default 40)
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

## 7. Mock data

**Plan A (preferred):** `scripts/mock/build.ts` takes the teammate's **current `c_products.csv`** (real product names, brands and the **real 198 `concept_id`s**), applies the §4.1 filters, and writes `fixtures/catalog_mock.csv` **in the §4.2 import format**:
- product columns mapped as in §4.2 (allergen tags derived from `search_text`);
- **synthetic per-store offers:** each product gets `n_chains` chains (its original chain + random others), 2–5 mocked Zagreb stores per chain, or a `:all` chain-wide row; prices = the original price ± up to 15 %; ~5 % akcija;
- seeded RNG, so the output is identical every run.

**Plan B (if the CSV isn't here by T+0:45):** the same script with a hand-written list of ~300 products, in the same format.

Either way: `pnpm load:catalog fixtures/catalog_mock.csv`. **The real data later goes through the same command.**

**The mock must contain** (checked by the validator):
- a concept sold in many chains (cheapest ≠ one store);
- a concept only at biobio/tzh (the "Proizvodi su raspršeni po trgovinama" fallback);
- a demo recipe coverable by one chain;
- akcija offers;
- missing nutrition values;
- `provjeri` products;
- unknown size;
- soy and soy-free options;
- an ingredient counted in `kom`;
- **for the search demo:** ≥ 5 *kruh* products across several chains, ≥ 1 of them on akcija, plus one "smjesa za kruh" (to show the match-tier ranking).

**Validator** `pnpm validate:catalog`:
- every `substitution_rules.concept_id` exists and has ≥ 1 non-provjeri product with an offer;
- it prints, per demo recipe, the alternatives and products found for each non-vegan ingredient.

---

## 8. AI pipeline (built: `lib/ai/pipeline.ts`, run from the terminal with `npm run veganize -- sarma|<url>`)

`POST /api/veganize` with body `{ url? | text? | example?, excludeTags? }` returns an SSE stream of `PipelineEvent`s. `/recept/novi` renders them live as stage cards, then redirects to `/recept/<id>`, which loads the saved result plus live offers.

| # | Stage | How | Typical time |
|---|---|---|---|
| 0 | **ingest** (`lib/recipe/ingest.ts`) | `recepti.index.hr` → its API `recepti-api.index.hr/api/services/app/Recipe/Get?Id=<number from URL>`. Any other URL → schema.org `Recipe` JSON-LD (coolinarika and most recipe sites; HTML entities decoded). No JSON-LD → page text → LLM extraction. Pasted text → LLM extraction. Example chips → saved real pages in `fixtures/recipes/*.json` (work offline) | 0–3 s |
| 1 | **analyze** (strong) | Per ingredient: `name_hr`, `slug` (from the `ingredients` vocabulary), quantity in g/ml/kom, **role** (binder / leavening / base / smoky / frying / flavour / baking / creaminess / sweet / liquid / any) and **status** (vegan / not_vegan / **depends**), plus a reason and a confidence. Also the dish category | 2–4 s |
| 2 | **research** (fast, cached) | One call for all risky ingredients plus the dish. Cached per `slug|role|dish category` (`substitution_research`) and per dish (`dish_research`), so repeats cost about 0.1 s. Tries Google Search grounding; **our free-tier key refuses it**, so it silently uses model knowledge (`method='ai'`). A billed key or OpenAI makes it web-grounded with sources, with no code change | 0.1–3 s |
| 3 | **alternatives** (strong) | Candidates from `v_rules` plus the facet values that actually exist per concept, plus the research notes. 1–3 alternatives per ingredient. **Ids and facet values are validated against the DB**; `concept_id=null` is allowed (e.g. "mineralna voda", "izostavi"), shown as "bez kupnje". The global concept list is sent only when some ingredient has no rule | 3–6 s |
| 4 | **offers** ∥ **rewrite** | `get_offers` SQL (no LLM) ∥ steps rewritten with the swaps (fast), changed steps flagged | 1–2 s |
| 5 | **save** | `recipes`, `recipe_ingredients`, `ingredient_alternatives`, `agent_runs`, `agent_steps` | 0.3 s |

**Measured end to end:** 8–12 s typical, about 20 s when the free tier is congested.

**LLM wrapper (`lib/ai/llm.ts`), learned the hard way on our key:**
- The key is **free tier**: Pro models have no quota, search grounding gets 429, and quotas are **per model**.
- **Model chains** (`lib/ai/models.ts`): strong = 3.5-flash-lite → 3.1-flash-lite → 3.5-flash → flash-latest; fast = 3.1-flash-lite → flash-lite-latest → 3.5-flash-lite. `gemini-3.5-flash` swings between 4 s and 100 s, so it is a fallback, not the lead.
- **Hedged calls:** if a model has not answered after 6 s (strong) or 3.5 s (fast), the next model starts in parallel and the first valid answer wins. Errors hand over immediately.
- **Thinking level** LOW (strong) / MINIMAL (fast): this cut the run from about 23 s to about 9 s.
- JSON-schema output from zod (`z.toJSONSchema`), validated with zod, plus one repair retry.

**Prompts** live in `lib/ai/prompts.ts` (versioned, logged in `agent_steps.prompt_version`). Croatian output; the model only chooses among ids and values we pass in.

## 9. Basket optimisation (`lib/basket/optimize.ts`, pure, tested)

**Optimise per chain; show stores within the chain.** There is no user location, so picking between 30 identical-price Konzums is arbitrary. The chain answers "where", and the store list answers "which shop".

- An offer for (item, chain): price = the min over that chain's offers (store-level or `:all`), plus the list of stores carrying it.
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
supabase/migrations/ 0001_catalog.sql (tables + import_rows + refresh_catalog) · 0002_knowledge.sql · 0003_app.sql · 0004_views.sql · 0005_rls.sql
supabase/seed/ ingredients.sql · substitution_rules.sql
scripts/ load-catalog.ts · validate-catalog.ts · rules/draft.ts · mock/build.ts
fixtures/ recipes/ · catalog_mock.csv
docs/AI-TOOLS.md
```

## 12. Commands

```bash
npm install
npm run env:check                                  # prints set/missing per variable, never the values
npm run db:migrate                                 # applies supabase/migrations/*.sql in order
npm run mock:build -- ~/Downloads/c_products.csv   # → fixtures/catalog_mock.csv
npm run load:catalog -- fixtures/catalog_mock.csv  # later: the real export
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
| _Data teammate_ | The real export in the §4.2 format; reviewing `substitution_rules`; real numbers for the pitch |
| _Branding pair_ | Logo, colours and font → Tailwind tokens by **T+3:00**; chain logos (optional); pitch deck, demo script, backup video, `docs/AI-TOOLS.md` |

## 16. Still open

1. ❓ Gemini rate limits on our key (free tier?). This decides the fast/strong models per stage.
2. ❓ The current `c_products.csv` file for Plan A (not in ~/Downloads yet; only the column description is).
3. ❓ Teammate: allergen tags feasible? A `store_city` column? Agree to the §4.2 format?
4. ✅ index.hr endpoint found: `Recipe/Get?Id=<id>`.
