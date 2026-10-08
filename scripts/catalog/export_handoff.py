# Converts the data teammate's handoff (data-science/*.parquet, see data-science/HANDOFF.md) into the three
# CSVs that `npm run load:catalog` loads: concepts.csv, products.csv, offers.csv.
#   - products: vegan + potencijalno_vegan only (the app hides the rest)
#   - offers:   one row per product x chain = 25th percentile of the chain's current Zagreb store prices
#               (akcija included; stale prices and history dropped), plus one row per web-shop offer
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
  select product_key, chain, current_price, special_price, "current_date", prilika,
         -- the handoff's current_price does not include the special price; pay the lower one on akcija
         case when akcija and special_price > 0 then least(current_price, special_price) else current_price end as eff,
         coalesce(regular_price, current_price) as reg
  from 'store_prices.parquet'
  where not stale and current_price > 0
    and not (chain = 'kaufland' and scope = 'nacionalno')        -- national price lists of non-Zagreb stores
    and product_key in (select product_key from c_products)
), chain_rows as (
  select product_key, chain as seller, 'lanac' as source,
         round(quantile_cont(eff, 0.25), 2) as price,
         round(quantile_cont(greatest(reg, eff), 0.25), 2) as regular_price,
         min(eff) filter (where eff < reg) as akcija_price,
         count(*) as n_stores,
         count(*) filter (where eff < reg) as n_stores_akcija,
         bool_or(prilika) as prilika,
         max("current_date") as price_date,
         null as url
  from store_rows group by 1, 2
), shop_regular as (
  select url, max(regular_price) as regular_price from 'shop_products.parquet' group by 1
), shop_rows as (
  select o.product_key, o.seller, 'trgovina' as source, o.price,
         case when s.regular_price > o.price then s.regular_price end as regular_price,
         case when o.akcija then o.price end as akcija_price,
         1 as n_stores, case when o.akcija then 1 else 0 end as n_stores_akcija,
         coalesce(o.prilika, false) as prilika, o.price_date, o.url
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
  pakiranje_kolicina, pakiranje_jedinica,
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
