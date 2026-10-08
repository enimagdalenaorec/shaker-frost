-- App tables. Catalog ids (concept_id, item_id) are plain text without FKs,
-- so reloading the catalog never touches users' saved data.

create table profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  display_name    text,
  household_size  int not null default 2,
  excluded_tags   text[] not null default '{}',
  created_at      timestamptz not null default now()
);

create table recipes (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users (id) on delete cascade,   -- NULL = guest run, not saved
  title              text,
  source_url         text,
  source_kind        text not null check (source_kind in ('url', 'text')),
  ingest_method      text check (ingest_method in ('jsonld', 'site_api', 'llm_html', 'web', 'pasted')),
  raw_text           text not null,
  servings_original  int,
  servings_target    int,
  veganized_steps    jsonb,                                              -- [{n, text_hr, changed}]
  status             text not null default 'processing' check (status in ('processing', 'done', 'error')),
  saved_at           timestamptz,
  created_at         timestamptz not null default now()
);
create index recipes_user_idx on recipes (user_id, saved_at desc);

create table recipe_ingredients (
  id                  uuid primary key default gen_random_uuid(),
  recipe_id           uuid not null references recipes (id) on delete cascade,
  position            int not null,
  raw_text            text not null,
  name_hr             text,
  ingredient_slug     text,
  quantity            numeric,
  unit                text check (unit in ('g', 'ml', 'kom')),
  quantity_estimated  boolean not null default false,
  role                text,
  is_vegan            boolean,
  reason_hr           text,
  confidence          numeric
);
create index recipe_ingredients_recipe_idx on recipe_ingredients (recipe_id, position);

create table ingredient_alternatives (
  id                    uuid primary key default gen_random_uuid(),
  recipe_ingredient_id  uuid not null references recipe_ingredients (id) on delete cascade,
  concept_id            text,
  facets                jsonb not null default '{}',
  rank                  int not null,
  ratio                 numeric,
  required_qty          numeric,
  required_unit         text,
  reasoning_hr          text,
  confidence            numeric,
  has_products          boolean not null default true,
  is_selected           boolean not null default false
);
create index ingredient_alternatives_ingredient_idx on ingredient_alternatives (recipe_ingredient_id, rank);

create table baskets (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references auth.users (id) on delete cascade,
  strategy          text not null default 'cheapest' check (strategy in ('one_store', 'cheapest', 'nutrition')),
  nutrition_metric  text not null default 'proteins'
                    check (nutrition_metric in ('energy_kcal', 'fat', 'saturated_fat', 'carbohydrates', 'sugars', 'proteins', 'salt', 'fiber')),
  nutrition_order   text not null default 'desc' check (nutrition_order in ('asc', 'desc')),
  created_at        timestamptz not null default now()
);

create table basket_items (
  id              uuid primary key default gen_random_uuid(),
  basket_id       uuid not null references baskets (id) on delete cascade,
  kind            text not null check (kind in ('concept', 'product')),
  -- concept: from a recipe; the optimiser picks the product AND the store
  concept_id      text,
  facets          jsonb not null default '{}',
  required_qty    numeric,
  required_unit   text,
  -- product: from search / often-bought; the product is fixed, the optimiser picks the store
  item_id         text,
  packages        int not null default 1 check (packages > 0),
  recipe_id       uuid references recipes (id) on delete set null,
  alternative_id  uuid references ingredient_alternatives (id) on delete set null,
  pinned_item_id  text,
  created_at      timestamptz not null default now(),
  check ((kind = 'concept' and concept_id is not null) or (kind = 'product' and item_id is not null))
);
create index basket_items_basket_idx on basket_items (basket_id);

-- Append-only log of every "Dodaj u košaricu"; powers "Često u tvojoj košarici".
create table basket_history (
  id          bigserial primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('concept', 'product')),
  concept_id  text,
  facets      jsonb not null default '{}',
  item_id     text,
  source      text not null check (source in ('recipe', 'search', 'often')),
  added_at    timestamptz not null default now()
);
create index basket_history_user_idx on basket_history (user_id, added_at desc);

create table agent_runs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users (id) on delete set null,
  recipe_id    uuid references recipes (id) on delete cascade,
  status       text not null default 'running' check (status in ('running', 'done', 'error')),
  provider     text,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  total_ms     int,
  tokens_in    int,
  tokens_out   int
);

create table agent_steps (
  id              bigserial primary key,
  run_id          uuid not null references agent_runs (id) on delete cascade,
  stage           text not null check (stage in ('ingest', 'extract', 'alternatives', 'offers', 'rewrite')),
  model           text,
  prompt_version  text,
  input           jsonb,
  output          jsonb,
  ms              int,
  error           text,
  created_at      timestamptz not null default now()
);
create index agent_steps_run_idx on agent_steps (run_id, id);
