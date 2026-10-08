-- Sort offers by the normalised price (€/kg, €/l) so a bigger pack at a better price per kg comes first;
-- products without a known size last, then by package price. Same signature and body as 0010 otherwise.
create or replace function get_offers(p_concept_ids text[], p_exclude_tags text[] default '{}')
returns setof v_product_offers
language sql stable as $$
  select (jsonb_populate_record(null::v_product_offers, to_jsonb(po) || jsonb_build_object('concept_id', c))).*
  from unnest(p_concept_ids) c
  join v_product_offers po on c = any (po.concept_put)
  where not (po.tags && coalesce(p_exclude_tags, '{}'))
  order by c, po.unit_price_per_kg_l nulls last, po.price
$$;
