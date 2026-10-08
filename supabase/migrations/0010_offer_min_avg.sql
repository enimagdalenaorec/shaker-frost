-- Offers per product × chain now keep the MINIMUM (cheapest Zagreb store; `price`, what the basket pays) and the
-- AVERAGE over the chain's Zagreb stores (`price_avg`), plus the cheapest store's prilika against its monthly
-- median (the p25 of 0009 lost it). regular_price / akcija / prilika describe that cheapest store.

drop function if exists get_offers(text[], text[]);
drop function if exists get_offers_for_items(text[]);
drop function if exists todays_deals(int);
drop view if exists v_product_best, v_product_offers, v_best_offers;
drop materialized view if exists best_offers;
drop view if exists v_offers;

alter table offers
  add column price_avg               numeric,      -- average current price over the chain's Zagreb stores
  add column median_month            numeric,      -- the cheapest store's monthly median
  add column pct_vs_median           numeric,      -- price vs that median, in % (negative = cheaper)
  add column n_stores_prilika        int,
  add column cheapest_store_id       text,         -- the chain's own store id, 'online' for web shops
  add column cheapest_store_address  text;
comment on column offers.price is 'minimum: the cheapest Zagreb store of the chain (akcija included)';
comment on column offers.prilika is 'the cheapest store is >= 5 % below its monthly median (from the handoff)';

create view v_offers with (security_invoker = true) as
select o.product_key as item_id, o.seller as chain_code, ch.name as chain_name, ch.kind as chain_kind,
       ch.logo_url as chain_logo_url,
       o.seller || case when ch.kind = 'webshop' then ':online' else ':all' end as store_id,
       null::text as store_address, 'Zagreb'::text as store_city, true as is_chainwide,
       o.price, o.regular_price, o.akcija as is_akcija,
       case when o.regular_price > o.price then round((1 - o.price / o.regular_price) * 100)::int else 0 end as discount_pct,
       case when p.pakiranje_jedinica in ('g', 'ml') and p.pakiranje_kolicina > 0
            then round(o.price / (p.pakiranje_kolicina * p.pakiranje_komada) * 1000, 2) end as unit_price_per_kg_l,
       o.price_date, o.akcija_price, o.n_stores, o.n_stores_akcija,
       o.price_avg, o.median_month, o.pct_vs_median, o.prilika as is_prilika, o.n_stores_prilika,
       o.cheapest_store_id, o.cheapest_store_address
from offers o
join chains ch on ch.code = o.seller
join products p on p.product_key = o.product_key;

create materialized view best_offers as
with agg as (
  select item_id, count(*)::int as n_chains, sum(coalesce(n_stores, 1))::int as n_stores,
         bool_or(is_akcija) as any_akcija, max(discount_pct) as max_discount_pct,
         bool_or(is_prilika) as any_prilika
  from v_offers group by item_id
), best as (
  select distinct on (item_id) * from v_offers order by item_id, price, is_akcija desc, is_prilika desc
)
select b.item_id, b.chain_code, b.chain_name, b.chain_kind, b.chain_logo_url, b.store_id,
       b.price, b.regular_price, b.is_akcija, b.discount_pct, b.unit_price_per_kg_l, b.price_date,
       b.n_stores_akcija, b.price_avg, b.is_prilika, b.pct_vs_median, b.cheapest_store_address,
       a.n_chains, a.n_stores, a.any_akcija, a.max_discount_pct, a.any_prilika
from best b join agg a using (item_id);
create unique index best_offers_item_idx on best_offers (item_id);

create view v_best_offers with (security_invoker = true) as select * from best_offers;

create view v_product_offers with (security_invoker = true) as
select p.*, o.chain_code, o.chain_name, o.chain_kind, o.chain_logo_url, o.store_id, o.store_address,
       o.store_city, o.is_chainwide, o.price, o.regular_price, o.is_akcija, o.discount_pct,
       o.unit_price_per_kg_l, o.price_date, o.akcija_price, o.n_stores, o.n_stores_akcija,
       o.price_avg, o.median_month, o.pct_vs_median, o.is_prilika, o.n_stores_prilika,
       o.cheapest_store_id, o.cheapest_store_address
from v_products p
join v_offers o on o.item_id = p.item_id;

create view v_product_best with (security_invoker = true) as
select p.*, b.chain_code, b.chain_name, b.chain_kind, b.chain_logo_url, b.store_id,
       b.price, b.regular_price, b.is_akcija, b.discount_pct, b.unit_price_per_kg_l, b.price_date,
       b.price_avg, b.is_prilika, b.pct_vs_median, b.cheapest_store_address,
       b.n_chains, b.n_stores, b.any_akcija, b.max_discount_pct, b.any_prilika
from v_products p
join best_offers b on b.item_id = p.item_id;

-- same bodies as 0009; recreated because their row types changed
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

create function todays_deals(p_limit int default 8)
returns setof v_product_best
language sql stable as $$
  select * from v_product_best
  where any_akcija and not provjeri
  order by max_discount_pct desc, price
  limit p_limit
$$;

grant select on best_offers to anon, authenticated;
grant select on v_offers, v_best_offers, v_product_offers, v_product_best to anon, authenticated;
