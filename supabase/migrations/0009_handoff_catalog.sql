-- The catalog now comes from the data teammate's handoff (data-science/HANDOFF.md) in their own structure,
-- replacing the mock §4.2 import (chains/stores/concepts/products/offers + import_rows).
-- Loader: scripts/catalog/export_handoff.py (parquet → CSV) → npm run load:catalog (CSV → these tables).
-- The §6 contract views keep their column names, so app code reads the new tables unchanged.

-- ── drop the mock catalog ────────────────────────────────────────────────────────────────────
drop function if exists refresh_catalog();
drop function if exists get_offers(text[], text[]);
drop function if exists get_offers_for_items(text[]);
drop function if exists search_products(text, boolean, text, int);
drop function if exists todays_deals(int);
drop view if exists v_product_best, v_product_offers, v_best_offers, v_offers, v_products, v_rules, v_concepts;
drop materialized view if exists best_offers;
drop materialized view if exists latest_offers;
drop table if exists offers, products, stores, concepts, import_rows;
truncate chains;

-- ── tables (column names as in HANDOFF.md) ───────────────────────────────────────────────────
create table concepts (
  concept_id             text primary key,
  naziv                  text not null,
  run                    text,                              -- 'A' = vegan substitute, 'B' = plain plant food
  obitelj                text,
  roditelj               text,
  razina                 int,
  put_nazivi             text,
  korijeni               text[] not null default '{}',
  sinonimi               text[] not null default '{}',
  zamjenjuje             text[] not null default '{}',      -- what the substitute replaces ('mlijeko', 'jaje kao vezivo')
  n_products             int not null default 0             -- buyable products incl. descendants, set by refresh_catalog()
);

create table products (
  product_key              text primary key,                -- EAN without leading zeros, else chain:id / shop:id
  has_barcode              boolean not null default false,
  name                     text not null,
  brand                    text,
  brands                   text[] not null default '{}',
  url                      text,                            -- web-shop page
  vegan_class              text not null check (vegan_class in ('vegan', 'potencijalno_vegan')),
  vegan_reason             text,
  evidence_class           text,
  vegan_evidence           jsonb,
  kcal                     numeric,
  fat                      numeric,
  saturated_fat            numeric,
  carbohydrates            numeric,
  sugars                   numeric,
  protein                  numeric,
  salt                     numeric,
  fiber                    numeric,
  nutrition_izvor          text,
  nutrition_izvor_opis     text,
  nutrition_procijenjeno   boolean,
  nutrition_nedostaje      text[] not null default '{}',
  nutrition_praznina_opis  text,
  concept_id               text references concepts (concept_id) on delete set null,
  concept_put              text[] not null default '{}',    -- path from the root concept, incl. own concept
  std_naziv                text,
  atr_okus                 text[] not null default '{}',
  atr_zasladenost          text[] not null default '{}',
  atr_prehrambena_svojstva text[] not null default '{}',
  atr_oblik_obrada         text[] not null default '{}',
  atr_namjena              text[] not null default '{}',
  atr_porijeklo            text[] not null default '{}',
  pakiranje_kolicina       numeric,                         -- g or ml per piece
  pakiranje_jedinica       text check (pakiranje_jedinica in ('g', 'ml')),
  pakiranje_komada         int not null default 1,
  tags                     text[] not null default '{}',    -- allergens derived by the exporter: soja, gluten, orasi
  search_text              text,
  -- filled by refresh_catalog(); unaccent() is not immutable, so these can't be generated columns
  name_norm                text not null default '',
  search_norm              text not null default ''
);
create index products_concept_idx on products (concept_id);
create index products_concept_put_idx on products using gin (concept_put);
create index products_search_trgm_idx on products using gin (search_norm extensions.gin_trgm_ops);

-- One row per product × chain (or web shop): the 25th percentile of the chain's current Zagreb store prices.
-- No per-store rows and no history: akcija is summarised as "N of M stores".
create table offers (
  product_key      text not null references products (product_key) on delete cascade,
  seller           text not null references chains (code) on delete cascade,
  source           text not null check (source in ('lanac', 'trgovina')),
  price            numeric not null check (price > 0),   -- what you pay (p25, akcija included)
  regular_price    numeric,                              -- p25 of the regular price
  akcija           boolean not null default false,       -- price < regular_price
  akcija_price     numeric,                              -- lowest special price in any store
  n_stores         int,
  n_stores_akcija  int,
  prilika          boolean not null default false,       -- ≥ 5 % below the monthly median (from the handoff)
  price_date       date,
  url              text,
  primary key (product_key, seller)
);
create index offers_seller_idx on offers (seller);

-- ── contract views (CLAUDE.md §6): same column names as before ───────────────────────────────
create view v_concepts with (security_invoker = true) as
select c.concept_id, c.naziv as name_hr, c.roditelj as parent, c.obitelj as group_name, c.run, c.zamjenjuje, c.n_products
from concepts c;

create view v_rules with (security_invoker = true) as
select r.ingredient_slug, r.role, r.concept_id, c.naziv as concept_name, c.obitelj as concept_group,
       r.prefer, r.ratio, r.notes_hr, r.rank
from substitution_rules r
join concepts c on c.concept_id = r.concept_id;

-- Facets are lists (a product can be 'mljeveno' and 'integralno'): okus, zasladeno, namjena, oblik, svojstva.
create view v_products with (security_invoker = true) as
select p.product_key as item_id, case when p.has_barcode then p.product_key end as barcode, p.name, p.brand,
       null::text as image_url, p.url as product_url,
       p.concept_id, c.naziv as concept_name, c.obitelj as concept_group, p.concept_put, p.std_naziv,
       p.atr_okus as okus, p.atr_zasladenost as zasladeno, p.atr_namjena as namjena, p.atr_oblik_obrada as oblik,
       p.atr_prehrambena_svojstva as svojstva,
       p.atr_porijeklo && array['eko / bio / organsko', 'demeter'] as eko, p.tags,
       case when p.pakiranje_kolicina > 0 then p.pakiranje_kolicina * p.pakiranje_komada end as net_qty,
       p.pakiranje_kolicina as size_value, p.pakiranje_jedinica as size_unit, p.pakiranje_komada as pack_count,
       case when p.vegan_class = 'vegan' then 'vegan' else 'probably' end as vegan_status,
       p.vegan_class <> 'vegan' as provjeri, p.vegan_reason, p.vegan_evidence,
       p.kcal as energy_kcal, round(p.kcal * 4.184) as energy_kj,
       p.fat, p.saturated_fat, p.carbohydrates, p.sugars, p.protein as proteins, p.salt, p.fiber,
       p.nutrition_izvor as nutrition_source, p.nutrition_izvor_opis as nutrition_source_hr,
       p.nutrition_procijenjeno as nutrition_estimated
from products p
left join concepts c on c.concept_id = p.concept_id;

create view v_offers with (security_invoker = true) as
select o.product_key as item_id, o.seller as chain_code, ch.name as chain_name, ch.kind as chain_kind,
       ch.logo_url as chain_logo_url,
       o.seller || case when ch.kind = 'webshop' then ':online' else ':all' end as store_id,
       null::text as store_address, 'Zagreb'::text as store_city, true as is_chainwide,
       o.price, o.regular_price, o.akcija as is_akcija,
       case when o.regular_price > o.price then round((1 - o.price / o.regular_price) * 100)::int else 0 end as discount_pct,
       case when p.pakiranje_jedinica in ('g', 'ml') and p.pakiranje_kolicina > 0
            then round(o.price / (p.pakiranje_kolicina * p.pakiranje_komada) * 1000, 2) end as unit_price_per_kg_l,
       o.price_date, o.akcija_price, o.n_stores, o.n_stores_akcija, o.prilika
from offers o
join chains ch on ch.code = o.seller
join products p on p.product_key = o.product_key;

-- One row per product: its cheapest offer + availability stats. Refreshed by refresh_catalog().
create materialized view best_offers as
with agg as (
  select item_id, count(*)::int as n_chains, sum(coalesce(n_stores, 1))::int as n_stores,
         bool_or(is_akcija) as any_akcija, max(discount_pct) as max_discount_pct
  from v_offers group by item_id
), best as (
  select distinct on (item_id) * from v_offers order by item_id, price, is_akcija desc
)
select b.item_id, b.chain_code, b.chain_name, b.chain_kind, b.chain_logo_url, b.store_id,
       b.price, b.regular_price, b.is_akcija, b.discount_pct, b.unit_price_per_kg_l, b.price_date,
       b.n_stores_akcija, a.n_chains, a.n_stores, a.any_akcija, a.max_discount_pct
from best b join agg a using (item_id);
create unique index best_offers_item_idx on best_offers (item_id);

create view v_best_offers with (security_invoker = true) as select * from best_offers;

create view v_product_offers with (security_invoker = true) as
select p.*, o.chain_code, o.chain_name, o.chain_kind, o.chain_logo_url, o.store_id, o.store_address,
       o.store_city, o.is_chainwide, o.price, o.regular_price, o.is_akcija, o.discount_pct,
       o.unit_price_per_kg_l, o.price_date, o.akcija_price, o.n_stores, o.n_stores_akcija
from v_products p
join v_offers o on o.item_id = p.item_id;

create view v_product_best with (security_invoker = true) as
select p.*, b.chain_code, b.chain_name, b.chain_kind, b.chain_logo_url, b.store_id,
       b.price, b.regular_price, b.is_akcija, b.discount_pct, b.unit_price_per_kg_l, b.price_date,
       b.n_chains, b.n_stores, b.any_akcija, b.max_discount_pct
from v_products p
join best_offers b on b.item_id = p.item_id;

-- ── RPCs ─────────────────────────────────────────────────────────────────────────────────────
-- Every offer of every product in the given concepts OR THEIR DESCENDANTS (tofu → tofu_dimljeni …).
-- concept_id in the result is the REQUESTED concept, so callers can group by what they asked for.
create function get_offers(p_concept_ids text[], p_exclude_tags text[] default '{}')
returns setof v_product_offers
language sql stable as $$
  select (jsonb_populate_record(null::v_product_offers, to_jsonb(po) || jsonb_build_object('concept_id', c))).*
  from unnest(p_concept_ids) c
  join v_product_offers po on c = any (po.concept_put)
  where not (po.tags && coalesce(p_exclude_tags, '{}'))
  order by c, po.price
$$;

create function get_offers_for_items(p_item_ids text[])
returns setof v_product_offers
language sql stable as $$
  select * from v_product_offers where item_id = any (p_item_ids) order by item_id, price
$$;

-- Product search over the whole vegan catalogue (CLAUDE.md §6), unchanged ranking (0006).
create function search_products(
  p_query text,
  p_only_akcija boolean default false,
  p_concept_id text default null,
  p_limit int default 60
)
returns table (
  match_tier int, item_id text, name text, brand text, concept_id text, concept_group text,
  net_qty numeric, size_value numeric, size_unit text, pack_count int,
  vegan_status text, provjeri boolean, eko boolean, tags text[], image_url text, product_url text,
  chain_code text, chain_name text, chain_kind text, chain_logo_url text,
  price numeric, regular_price numeric, is_akcija boolean, discount_pct int, unit_price_per_kg_l numeric,
  n_chains int, n_stores int, any_akcija boolean, max_discount_pct int
)
language plpgsql stable
set search_path = public, extensions
as $$
#variable_conflict use_column
declare
  q text := trim(regexp_replace(lower(unaccent(coalesce(p_query, ''))), '[^a-z0-9]+', ' ', 'g'));
  tokens text[] := case when q = '' then '{}'::text[] else regexp_split_to_array(q, ' ') end;
  first_token text := tokens[1];
begin
  return query
  select case when first_token is null then 1
              when pr.name_norm like first_token || '%' then 1
              when pr.name_norm ~ ('\m(za|od|bez|s|sa|iz|na|u) ' || first_token) then 3
              when pr.name_norm ~ ('\m' || first_token || '\M') then 2
              else 3 end,
         p.item_id, p.name, p.brand, p.concept_id, p.concept_group,
         p.net_qty, p.size_value, p.size_unit, p.pack_count,
         p.vegan_status, p.provjeri, p.eko, p.tags, p.image_url, p.product_url,
         p.chain_code, p.chain_name, p.chain_kind, p.chain_logo_url,
         p.price, p.regular_price, p.is_akcija, p.discount_pct, p.unit_price_per_kg_l,
         p.n_chains, p.n_stores, p.any_akcija, p.max_discount_pct
  from v_product_best p
  join products pr on pr.product_key = p.item_id
  where (select bool_and(pr.search_norm like '%' || t || '%') from unnest(tokens) t) is not false
    and (not p_only_akcija or p.any_akcija)
    and (p_concept_id is null or p_concept_id = any (p.concept_put))
  order by 1, p.unit_price_per_kg_l nulls last, p.price
  limit p_limit;

  if not found and first_token is not null then
    -- typo tolerance: "kruhh", "zobno mljeko"
    return query
    select 3,
           p.item_id, p.name, p.brand, p.concept_id, p.concept_group,
           p.net_qty, p.size_value, p.size_unit, p.pack_count,
           p.vegan_status, p.provjeri, p.eko, p.tags, p.image_url, p.product_url,
           p.chain_code, p.chain_name, p.chain_kind, p.chain_logo_url,
           p.price, p.regular_price, p.is_akcija, p.discount_pct, p.unit_price_per_kg_l,
           p.n_chains, p.n_stores, p.any_akcija, p.max_discount_pct
    from v_product_best p
    join products pr on pr.product_key = p.item_id
    where word_similarity(q, pr.search_norm) > 0.45
      and (not p_only_akcija or p.any_akcija)
      and (p_concept_id is null or p_concept_id = any (p.concept_put))
    order by word_similarity(q, pr.search_norm) desc, p.price
    limit p_limit;
  end if;
end $$;

create function todays_deals(p_limit int default 8)
returns setof v_product_best
language sql stable as $$
  select * from v_product_best
  where any_akcija and not provjeri
  order by max_discount_pct desc, price
  limit p_limit
$$;

-- Called by the loader after the CSVs are in: search columns, concept counts, best offers.
create function refresh_catalog() returns jsonb
language plpgsql
set search_path = public, extensions
as $$
declare result jsonb;
begin
  update products set
    name_norm = lower(unaccent(name)),
    search_norm = lower(unaccent(concat_ws(' ', name, brand, search_text)));

  update concepts c set n_products = (
    select count(distinct p.product_key) from products p
    where c.concept_id = any (p.concept_put) and exists (select 1 from offers o where o.product_key = p.product_key));

  refresh materialized view best_offers;

  select jsonb_build_object(
    'chains', (select count(*) from chains),
    'concepts', (select count(*) from concepts),
    'products', (select count(*) from products),
    'products_with_offer', (select count(*) from best_offers),
    'offers', (select count(*) from offers),
    'offers_akcija', (select count(*) from offers where akcija)
  ) into result;
  return result;
end $$;

-- ── security: catalog is public read-only ────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['concepts', 'products', 'offers'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "public read" on %I for select to anon, authenticated using (true)', t);
    execute format('grant select on %I to anon, authenticated', t);
  end loop;
end $$;
grant select on best_offers to anon, authenticated;
grant select on v_concepts, v_rules, v_products, v_offers, v_best_offers, v_product_offers, v_product_best
  to anon, authenticated;
