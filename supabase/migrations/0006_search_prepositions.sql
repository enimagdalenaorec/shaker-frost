-- Search ranking: a token right after a preposition ("smjesa ZA kruh", "napitak OD zobi") describes what the
-- product is FOR or MADE OF, not what it IS, so it ranks in tier 3 below real matches ("Tost kruh").

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
