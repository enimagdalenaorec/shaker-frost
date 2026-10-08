-- The catalog contract (CLAUDE.md §6). App code reads the catalog ONLY through these.
-- latest_offers / best_offers are materialized for speed and refreshed by refresh_catalog().

create view v_concepts with (security_invoker = true) as
select c.id as concept_id, c.name_hr, c.parent, c.group_name,
       (select count(*) from products p where p.concept_id = c.id)::int as n_products
from concepts c;

create view v_rules with (security_invoker = true) as
select r.ingredient_slug, r.role, r.concept_id, c.name_hr as concept_name, c.group_name as concept_group,
       r.prefer, r.ratio, r.notes_hr, r.rank
from substitution_rules r
join concepts c on c.id = r.concept_id;

create view v_products with (security_invoker = true) as
select p.item_id, p.barcode, p.name, p.brand, p.image_url, p.product_url,
       p.concept_id, c.name_hr as concept_name, c.group_name as concept_group, p.concept_confidence,
       p.okus, p.zasladeno, p.namjena, p.oblik, p.obogaceno, p.eko, p.tags,
       case when p.size_value > 0 then p.size_value * p.pack_count end as net_qty,
       p.size_value, p.size_unit, p.pack_count,
       p.vegan_status, p.provjeri, p.vegan_evidence,
       p.energy_kcal, round(p.energy_kcal * 4.184) as energy_kj,
       p.fat, p.saturated_fat, p.carbohydrates, p.sugars, p.proteins, p.salt, p.fiber,
       p.nutrition_source
from products p
left join concepts c on c.id = p.concept_id;

-- Latest price per (product, store).
create materialized view latest_offers as
select distinct on (o.item_id, o.store_id)
       o.item_id, s.chain_code, ch.name as chain_name, ch.kind as chain_kind, ch.logo_url as chain_logo_url,
       o.store_id, s.address as store_address, s.city as store_city, s.is_chainwide,
       o.price, o.regular_price,
       coalesce(o.regular_price > o.price, false) as is_akcija,
       case when o.regular_price > o.price then round((1 - o.price / o.regular_price) * 100)::int else 0 end as discount_pct,
       case when p.size_unit in ('g', 'ml') and p.size_value > 0
            then round(o.price / (p.size_value * p.pack_count) * 1000, 2) end as unit_price_per_kg_l,
       o.price_date
from offers o
join stores s on s.id = o.store_id
join chains ch on ch.code = s.chain_code
join products p on p.item_id = o.item_id
order by o.item_id, o.store_id, o.price_date desc;
create index latest_offers_item_idx on latest_offers (item_id);

-- One row per product: its cheapest current offer + availability stats.
create materialized view best_offers as
with agg as (
  select item_id, count(distinct chain_code)::int as n_chains, count(*)::int as n_stores,
         bool_or(is_akcija) as any_akcija, max(discount_pct) as max_discount_pct
  from latest_offers group by item_id
), best as (
  select distinct on (item_id) * from latest_offers order by item_id, price, is_akcija desc
)
select b.item_id, b.chain_code, b.chain_name, b.chain_kind, b.chain_logo_url, b.store_id,
       b.price, b.regular_price, b.is_akcija, b.discount_pct, b.unit_price_per_kg_l, b.price_date,
       a.n_chains, a.n_stores, a.any_akcija, a.max_discount_pct
from best b join agg a using (item_id);
create unique index best_offers_item_idx on best_offers (item_id);

create view v_offers with (security_invoker = true) as select * from latest_offers;
create view v_best_offers with (security_invoker = true) as select * from best_offers;

create view v_product_offers with (security_invoker = true) as
select p.*, o.chain_code, o.chain_name, o.chain_kind, o.chain_logo_url, o.store_id, o.store_address,
       o.store_city, o.is_chainwide, o.price, o.regular_price, o.is_akcija, o.discount_pct,
       o.unit_price_per_kg_l, o.price_date
from v_products p
join latest_offers o on o.item_id = p.item_id;

create view v_product_best with (security_invoker = true) as
select p.*, b.chain_code, b.chain_name, b.chain_kind, b.chain_logo_url, b.store_id,
       b.price, b.regular_price, b.is_akcija, b.discount_pct, b.unit_price_per_kg_l, b.price_date,
       b.n_chains, b.n_stores, b.any_akcija, b.max_discount_pct
from v_products p
join best_offers b on b.item_id = p.item_id;

-- Every current offer of every product in the given concepts (recipe alternatives).
-- Facet matching/ranking happens in TypeScript (lib/db/catalog.ts).
create or replace function get_offers(p_concept_ids text[], p_exclude_tags text[] default '{}')
returns setof v_product_offers
language sql stable as $$
  select * from v_product_offers
  where concept_id = any (p_concept_ids)
    and not (tags && coalesce(p_exclude_tags, '{}'))
  order by concept_id, price
$$;

-- Every current offer of the given products (basket items added from search / often-bought).
create or replace function get_offers_for_items(p_item_ids text[])
returns setof v_product_offers
language sql stable as $$
  select * from v_product_offers where item_id = any (p_item_ids) order by item_id, price
$$;

-- Product search over the whole vegan catalogue (CLAUDE.md §6).
-- match_tier: 1 = name starts with the first token, 2 = whole-word match, 3 = substring / trigram fallback.
create or replace function search_products(
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
              when pr.name_norm ~ ('\m' || first_token || '\M') then 2
              else 3 end,
         p.item_id, p.name, p.brand, p.concept_id, p.concept_group,
         p.net_qty, p.size_value, p.size_unit, p.pack_count,
         p.vegan_status, p.provjeri, p.eko, p.tags, p.image_url, p.product_url,
         p.chain_code, p.chain_name, p.chain_kind, p.chain_logo_url,
         p.price, p.regular_price, p.is_akcija, p.discount_pct, p.unit_price_per_kg_l,
         p.n_chains, p.n_stores, p.any_akcija, p.max_discount_pct
  from v_product_best p
  join products pr on pr.item_id = p.item_id
  where (select bool_and(pr.search_norm like '%' || t || '%') from unnest(tokens) t) is not false
    and (not p_only_akcija or p.any_akcija)
    and (p_concept_id is null or p.concept_id = p_concept_id)
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
    join products pr on pr.item_id = p.item_id
    where word_similarity(q, pr.search_norm) > 0.45
      and (not p_only_akcija or p.any_akcija)
      and (p_concept_id is null or p.concept_id = p_concept_id)
    order by word_similarity(q, pr.search_norm) desc, p.price
    limit p_limit;
  end if;
end $$;

-- Empty state of "Često u tvojoj košarici": biggest vegan discounts today.
create or replace function todays_deals(p_limit int default 8)
returns setof v_product_best
language sql stable as $$
  select * from v_product_best
  where any_akcija and not provjeri
  order by max_discount_pct desc, price
  limit p_limit
$$;

-- The current user's most frequently added basket items. Offers are resolved in TypeScript.
create or replace function often_bought(p_limit int default 8)
returns table (kind text, concept_id text, facets jsonb, item_id text, times int, last_added timestamptz)
language sql stable security invoker as $$
  select h.kind, h.concept_id, h.facets, h.item_id, count(*)::int, max(h.added_at)
  from basket_history h
  where h.user_id = auth.uid()
  group by h.kind, h.concept_id, h.facets, h.item_id
  order by count(*) desc, max(h.added_at) desc
  limit p_limit
$$;
