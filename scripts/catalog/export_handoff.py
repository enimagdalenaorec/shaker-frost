# Converts the data teammate's handoff (data-science/*.parquet, see data-science/HANDOFF.md) into the three
# CSVs that `npm run load:catalog` loads: concepts.csv, products.csv, offers.csv.
#   - products: vegan + potencijalno_vegan only (the app hides the rest)
#   - offers:   one row per product x chain: the MINIMUM (cheapest Zagreb store, what the basket pays) and
#               the AVERAGE over the chain's current Zagreb stores, plus that cheapest store's akcija / prilika
#               (stale prices and history dropped), and one row per web-shop offer
# Usage: pip install duckdb && python3 scripts/catalog/export_handoff.py [data-science] [fixtures/catalog]
import os
import sys

import duckdb

src = sys.argv[1] if len(sys.argv) > 1 else "data-science"
out = sys.argv[2] if len(sys.argv) > 2 else "fixtures/catalog"
os.makedirs(out, exist_ok=True)

c = duckdb.connect()
c.execute(f"set file_search_path = '{src}'")

c.sql("""
create temp table c_products as
select * from 'products.parquet' where vegan_class in ('vegan', 'potencijalno_vegan')
""")

# ── offers ──────────────────────────────────────────────────────────────────────────────────
c.sql("""
create temp table c_offers as
with store_rows as (
  select product_key, chain, store_id, address, "current_date", prilika, median_month, pct_vs_median,
         -- the handoff's current_price does not include the special price; pay the lower one on akcija
         case when akcija and special_price > 0 then least(current_price, special_price) else current_price end as eff,
         coalesce(regular_price, current_price) as reg
  from 'store_prices.parquet'
  where not stale and current_price > 0
    and not (chain = 'kaufland' and scope = 'nacionalno')        -- national price lists of non-Zagreb stores
    and product_key in (select product_key from c_products)
), ranked as (
  -- the cheapest store of the chain; on a tie prefer the one whose low price is an akcija / prilika
  select *, row_number() over (partition by product_key, chain order by eff, (eff < reg) desc, prilika desc) as rn
  from store_rows
), chain_rows as (
  select r.product_key, r.chain as seller, 'lanac' as source,
         round(r.eff, 2) as price,
         round(a.price_avg, 2) as price_avg,
         greatest(r.reg, r.eff) as regular_price,
         a.akcija_price,
         round(r.median_month, 2) as median_month,
         round(r.pct_vs_median, 1) as pct_vs_median,
         coalesce(r.prilika, false) as prilika,
         a.n_stores, a.n_stores_akcija, a.n_stores_prilika,
         r.store_id as cheapest_store_id, r.address as cheapest_store_address,
         a.price_date, null as url
  from ranked r
  join (
    select product_key, chain, avg(eff) as price_avg, min(eff) filter (where eff < reg) as akcija_price,
           count(*) as n_stores, count(*) filter (where eff < reg) as n_stores_akcija,
           count(*) filter (where prilika) as n_stores_prilika, max("current_date") as price_date
    from store_rows group by 1, 2
  ) a using (product_key, chain)
  where r.rn = 1
), shop_regular as (
  select url, max(regular_price) as regular_price from 'shop_products.parquet' group by 1
), shop_rows as (
  select o.product_key, o.seller, 'trgovina' as source, o.price, o.price as price_avg,
         case when s.regular_price > o.price then s.regular_price end as regular_price,
         case when o.akcija then o.price end as akcija_price,
         round(o.median_month, 2) as median_month, round(o.pct_vs_median, 1) as pct_vs_median,
         coalesce(o.prilika, false) as prilika,
         1 as n_stores, case when o.akcija then 1 else 0 end as n_stores_akcija,
         case when o.prilika then 1 else 0 end as n_stores_prilika,
         'online' as cheapest_store_id, null as cheapest_store_address,
         o.price_date, o.url
  from 'offers.parquet' o
  left join shop_regular s on s.url = o.url
  where o.source = 'trgovina' and not o.stale and o.price > 0
    and o.product_key in (select product_key from c_products)
  qualify row_number() over (partition by o.product_key, o.seller order by o.price) = 1   -- same product listed twice
)
select *, coalesce(regular_price > price, false) as akcija from chain_rows
union all by name
select *, coalesce(regular_price > price or akcija_price is not null, false) as akcija from shop_rows
""")

# ── package sizes the handoff is missing ───────────────────────────────────────────────────────
# Needed for €/kg sorting. Taken from the sellers' own fields, in this order: size_text ("200g"), a size inside
# unit ("500g", "ca. 1kg", "0,7l"), per-kg / per-l pricing (unit "kg" → quantity kg, default 1 kg: loose
# produce), then the product name ("Pivo 0,5l"). Most common answer per product wins.
c.sql(r"""
create temp table size_fill as
with parsed as (
  select product_key, size_text, unit, quantity, name,
         regexp_extract(lower(replace(coalesce(size_text, ''), ',', '.')), '(\d+(?:\.\d+)?)\s*(kg|g|ml|cl|dl|l)\b', ['v', 'u']) as st,
         regexp_extract(lower(replace(coalesce(unit, ''), ',', '.')), '(\d+(?:\.\d+)?)\s*(kg|g|ml|cl|dl|l)\b', ['v', 'u']) as un,
         regexp_extract(lower(replace(coalesce(name, ''), ',', '.')), '(\d+(?:\.\d+)?)\s*(kg|g|ml|cl|dl|l)\b', ['v', 'u']) as nm,
         try_cast(replace(trim(coalesce(quantity, '')), ',', '.') as double) as q
  from 'offers.parquet'
  where product_key in (select product_key from c_products where pakiranje_kolicina is null)
), picked as (
  select product_key,
         case when st.v <> '' then st when un.v <> '' then un
              when lower(trim(unit)) in ('kg', 'l') then {'v': case when q between 0.05 and 5 then q::varchar else '1' end, 'u': lower(trim(unit))}
              when nm.v <> '' then nm end as p,
         case when st.v <> '' or un.v <> '' or lower(trim(unit)) in ('kg', 'l') then 'trgovina' when nm.v <> '' then 'naziv' end as src
  from parsed
), norm as (
  select product_key, src,
         try_cast(p.v as double) * case p.u when 'kg' then 1000 when 'l' then 1000 when 'dl' then 100 when 'cl' then 10 else 1 end as qty,
         case when p.u in ('kg', 'g') then 'g' else 'ml' end as unit
  from picked where p is not null
)
select product_key, mode(qty) as qty, mode(unit) as unit, mode(src) as src
from norm where qty > 0 and qty <= 50000
group by 1
""")
print("package sizes filled:", c.sql("select src, count(*) from size_fill group by 1").fetchall())

# ── products ────────────────────────────────────────────────────────────────────────────────
c.sql(r"""
create temp table c_products_out as
select
  product_key, has_barcode, name,
  brands[1] as brand,
  to_json(coalesce(brands, []))::varchar as brands,
  coalesce(shop_url, best_url) as url,
  vegan_class, vegan_reason, evidence_class, vegan_evidence,
  kcal, fat, saturated_fat, carbohydrates, sugars, protein, salt, fiber,
  nutrition_izvor, nutrition_izvor_opis, nutrition_procijenjeno,
  to_json(coalesce(nutrition_nedostaje, []))::varchar as nutrition_nedostaje,
  nutrition_praznina_opis,
  concept_id,
  to_json(coalesce(concept_put, []))::varchar as concept_put,
  std_naziv,
  to_json(coalesce(atr_okus, []))::varchar as atr_okus,
  to_json(coalesce(atr_zasladenost, []))::varchar as atr_zasladenost,
  to_json(coalesce(atr_prehrambena_svojstva, []))::varchar as atr_prehrambena_svojstva,
  to_json(coalesce(atr_oblik_obrada, []))::varchar as atr_oblik_obrada,
  to_json(coalesce(atr_namjena, []))::varchar as atr_namjena,
  to_json(coalesce(atr_porijeklo, []))::varchar as atr_porijeklo,
  coalesce(pakiranje_kolicina, f.qty) as pakiranje_kolicina,
  coalesce(pakiranje_jedinica, f.unit) as pakiranje_jedinica,
  coalesce(pakiranje_komada, 1)::int as pakiranje_komada,
  -- allergen tags from keywords (the handoff has no allergen column)
  to_json(list_filter([
    case when regexp_matches(lower(concat_ws(' ', name, concept_naziv, concept_id)), 'soj|tofu|tempeh|edamame|miso') then 'soja' end,
    case when not list_contains(coalesce(atr_prehrambena_svojstva, []), 'bez glutena')
          and regexp_matches(lower(concat_ws(' ', name, concept_naziv, concept_id)), 'pšen|psen|seitan|pir|ječm|jecam|raž|razen|zob|brašn|brasn|tjesten|kruh|keks') then 'gluten' end,
    case when regexp_matches(lower(concat_ws(' ', name, concept_naziv, concept_id)), 'badem|lješnj|ljesnj|orah|oraš|oras|indijsk|pistac|kikiriki|makadam') then 'orasi' end
  ], x -> x is not null))::varchar as tags,
  array_to_string(list_distinct(list_concat(coalesce(names, []), [std_naziv, concept_naziv])), ' | ') as search_text
from c_products
left join size_fill f using (product_key)
""")

# ── concepts ────────────────────────────────────────────────────────────────────────────────
c.sql("""
create temp table c_concepts as
select concept_id, naziv, run, obitelj, roditelj, razina, put_nazivi,
       to_json(coalesce(korijeni, []))::varchar as korijeni,
       to_json(coalesce(sinonimi, []))::varchar as sinonimi,
       to_json(coalesce(zamjenjuje, []))::varchar as zamjenjuje
from 'concepts.parquet'
""")

for name, table in [("concepts", "c_concepts"), ("products", "c_products_out"), ("offers", "c_offers")]:
    path = os.path.join(out, f"{name}.csv")
    c.sql(f"copy {table} to '{path}' (header, delimiter ',')")
    print(f"{path}: {c.sql(f'select count(*) from {table}').fetchone()[0]} rows")
print("akcija offers:", c.sql("select count(*) from c_offers where akcija").fetchone()[0])
