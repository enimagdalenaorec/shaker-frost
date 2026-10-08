-- Catalog: filled from ONE flat import CSV (one row per product x store), see CLAUDE.md §4.
-- Loader: scripts/load-catalog.ts -> import_rows -> select refresh_catalog();

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

create table chains (
  code      text primary key,
  name      text not null,
  kind      text not null default 'store' check (kind in ('store', 'webshop')),
  logo_url  text
);

create table stores (
  id            text primary key,              -- 'konzum:S10', 'lidl:all', 'tzh:online'
  chain_code    text not null references chains (code) on delete cascade,
  address       text,
  city          text,
  is_chainwide  boolean not null default false -- true = price valid in every store of the chain
);
create index stores_chain_idx on stores (chain_code);

create table concepts (
  id          text primary key,
  name_hr     text not null,
  parent      text,
  group_name  text
);

create table products (
  item_id             text primary key,
  barcode             text,
  name                text not null,
  brand               text,
  image_url           text,
  product_url         text,
  concept_id          text references concepts (id) on delete set null,
  concept_confidence  numeric,
  okus                text,
  zasladeno           text,
  namjena             text,
  oblik               text,
  obogaceno           text,
  eko                 boolean,
  tags                text[] not null default '{}',
  size_value          numeric,
  size_unit           text check (size_unit in ('g', 'ml', 'kom')),
  pack_count          int not null default 1,
  vegan_status        text not null check (vegan_status in ('vegan', 'probably')),
  provjeri            boolean not null default false,
  vegan_evidence      jsonb,
  energy_kcal         numeric,
  fat                 numeric,
  saturated_fat       numeric,
  carbohydrates       numeric,
  sugars              numeric,
  proteins            numeric,
  salt                numeric,
  fiber               numeric,
  nutrition_source    text check (nutrition_source in ('deklaracija', 'web', 'procjena')),
  search_text         text,
  -- filled by refresh_catalog(); unaccent() is not immutable, so these can't be generated columns
  name_norm           text not null default '',
  search_norm         text not null default ''
);
create index products_concept_idx on products (concept_id);
create index products_search_trgm_idx on products using gin (search_norm extensions.gin_trgm_ops);

create table offers (
  item_id        text not null references products (item_id) on delete cascade,
  store_id       text not null references stores (id) on delete cascade,
  price          numeric not null check (price > 0),
  regular_price  numeric,
  price_date     date not null,
  primary key (item_id, store_id, price_date)
);
create index offers_store_idx on offers (store_id);

-- Staging: exact mirror of the import CSV, everything text. Unknown CSV columns are ignored by the loader.
create table import_rows (
  item_id text, barcode text, name text, brand text, image_url text, product_url text,
  concept_id text, concept text, concept_parent text, concept_group text, concept_confidence text,
  okus text, zasladeno text, namjena text, oblik text, obogaceno text, eko text, tags text,
  size_value text, size_unit text, pack_count text,
  vegan_status text, provjeri text, vegan_evidence text,
  energy_kcal text, fat text, saturated_fat text, carbohydrates text, sugars text,
  proteins text, salt text, fiber text, nutrition_source text, search_text text,
  store_chain text, chain_logo_url text, store_id text, store_address text, store_city text,
  price text, regular_price text, price_date text
);

-- Lenient casts: bad values become NULL instead of failing the whole import.
create or replace function try_numeric(v text) returns numeric
language plpgsql immutable as $$
begin
  v := nullif(trim(replace(v, ',', '.')), '');
  return v::numeric;
exception when others then
  return null;
end $$;

create or replace function try_bool(v text) returns boolean
language sql immutable as $$
  select case lower(trim(coalesce(v, '')))
    when 'true' then true when 't' then true when '1' then true when 'yes' then true when 'da' then true
    when 'false' then false when 'f' then false when '0' then false when 'no' then false when 'ne' then false
    else null end
$$;

create or replace function try_jsonb(v text) returns jsonb
language plpgsql immutable as $$
begin
  return nullif(trim(v), '')::jsonb;
exception when others then
  return null;
end $$;

create or replace function try_date(v text) returns date
language plpgsql immutable as $$
begin
  return nullif(trim(v), '')::date;
exception when others then
  return null;
end $$;

create or replace function try_text_array(v text) returns text[]
language plpgsql immutable as $$
declare j jsonb := try_jsonb(v);
begin
  if j is null or jsonb_typeof(j) <> 'array' then
    return '{}';
  end if;
  return array(select lower(trim(x)) from jsonb_array_elements_text(j) x where trim(x) <> '');
end $$;

create or replace function chain_display_name(code text) returns text
language sql immutable as $$
  select case code
    when 'konzum' then 'Konzum' when 'lidl' then 'Lidl' when 'spar' then 'Spar'
    when 'kaufland' then 'Kaufland' when 'plodine' then 'Plodine' when 'dm' then 'dm'
    when 'metro' then 'Metro' when 'tommy' then 'Tommy' when 'eurospin' then 'Eurospin'
    when 'biobio' then 'bio&bio' when 'tzh' then 'Tvornica zdrave hrane'
    when 'vrutak' then 'Vrutak' when 'roto' then 'Roto' when 'lorenco' then 'Lorenco'
    when 'stridon' then 'Stridon' when 'zabac' then 'Žabac' when 'gavranovic' then 'Gavranović'
    when 'stanic' then 'Stanić' when 'ntl' then 'NTL' when 'dukat' then 'Dukat'
    else initcap(code) end
$$;

-- Rebuilds the whole catalog from import_rows. Returns row counts.
create or replace function refresh_catalog() returns jsonb
language plpgsql
set search_path = public, extensions
as $$
declare result jsonb;
begin
  truncate offers, products, stores, concepts, chains;

  insert into chains (code, name, kind, logo_url)
  select c, chain_display_name(c),
         case when c in ('tzh', 'biobio') then 'webshop' else 'store' end,
         max(nullif(trim(chain_logo_url), ''))
  from (select lower(trim(store_chain)) c, chain_logo_url from import_rows where nullif(trim(store_chain), '') is not null) s
  group by c;

  insert into stores (id, chain_code, address, city, is_chainwide)
  select distinct on (sid)
         sid, c, nullif(trim(store_address), ''), nullif(trim(store_city), ''),
         raw_sid in ('', 'all')
  from (
    select lower(trim(store_chain)) c,
           lower(trim(coalesce(store_id, ''))) raw_sid,
           lower(trim(store_chain)) || ':' || coalesce(nullif(lower(trim(store_id)), ''), 'all') sid,
           store_address, store_city
    from import_rows where nullif(trim(store_chain), '') is not null
  ) s
  order by sid;

  insert into concepts (id, name_hr, parent, group_name)
  select distinct on (trim(concept_id))
         trim(concept_id), coalesce(nullif(trim(concept), ''), trim(concept_id)),
         nullif(trim(concept_parent), ''), nullif(trim(concept_group), '')
  from import_rows
  where nullif(trim(concept_id), '') is not null and trim(concept_id) <> 'ostalo'
  order by trim(concept_id);

  insert into products (
    item_id, barcode, name, brand, image_url, product_url, concept_id, concept_confidence,
    okus, zasladeno, namjena, oblik, obogaceno, eko, tags, size_value, size_unit, pack_count,
    vegan_status, provjeri, vegan_evidence,
    energy_kcal, fat, saturated_fat, carbohydrates, sugars, proteins, salt, fiber,
    nutrition_source, search_text, name_norm, search_norm)
  select distinct on (trim(item_id))
    trim(item_id), nullif(trim(barcode), ''), trim(name), nullif(trim(brand), ''),
    nullif(trim(image_url), ''), nullif(trim(product_url), ''),
    case when nullif(trim(concept_id), '') is null or trim(concept_id) = 'ostalo' then null else trim(concept_id) end,
    try_numeric(concept_confidence),
    nullif(trim(okus), ''), nullif(trim(zasladeno), ''), nullif(trim(namjena), ''),
    nullif(trim(oblik), ''), nullif(trim(obogaceno), ''), try_bool(eko), try_text_array(tags),
    try_numeric(size_value),
    case when lower(trim(size_unit)) in ('g', 'ml', 'kom') then lower(trim(size_unit)) end,
    coalesce(try_numeric(pack_count)::int, 1),
    lower(trim(vegan_status)), coalesce(try_bool(provjeri), false), try_jsonb(vegan_evidence),
    try_numeric(energy_kcal), try_numeric(fat), try_numeric(saturated_fat), try_numeric(carbohydrates),
    try_numeric(sugars), try_numeric(proteins), try_numeric(salt), try_numeric(fiber),
    case when lower(trim(nutrition_source)) in ('deklaracija', 'web', 'procjena') then lower(trim(nutrition_source)) end,
    nullif(trim(search_text), ''),
    lower(unaccent(trim(name))),
    lower(unaccent(concat_ws(' ', trim(name), trim(brand), trim(search_text))))
  from import_rows
  where nullif(trim(item_id), '') is not null
    and nullif(trim(name), '') is not null
    and lower(trim(vegan_status)) in ('vegan', 'probably')
  order by trim(item_id);

  insert into offers (item_id, store_id, price, regular_price, price_date)
  select trim(r.item_id),
         lower(trim(r.store_chain)) || ':' || coalesce(nullif(lower(trim(r.store_id)), ''), 'all'),
         try_numeric(r.price),
         try_numeric(r.regular_price),
         coalesce(try_date(r.price_date), current_date)
  from import_rows r
  join products p on p.item_id = trim(r.item_id)
  where try_numeric(r.price) > 0 and nullif(trim(r.store_chain), '') is not null
  on conflict do nothing;

  -- created in 0004_views.sql
  if to_regclass('public.latest_offers') is not null then
    refresh materialized view latest_offers;
    refresh materialized view best_offers;
  end if;

  select jsonb_build_object(
    'chains', (select count(*) from chains),
    'stores', (select count(*) from stores),
    'concepts', (select count(*) from concepts),
    'products', (select count(*) from products),
    'products_with_concept', (select count(*) from products where concept_id is not null),
    'offers', (select count(*) from offers)
  ) into result;
  return result;
end $$;
