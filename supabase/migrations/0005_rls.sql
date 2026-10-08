-- Row level security + grants (CLAUDE.md §5.3).
-- Server code uses the secret key (bypasses RLS) for guest recipes, agent logs and catalog loading.

-- Catalog + knowledge: public read-only.
do $$
declare t text;
begin
  foreach t in array array['chains', 'stores', 'concepts', 'products', 'offers', 'ingredients', 'substitution_rules'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "public read" on %I for select to anon, authenticated using (true)', t);
    execute format('grant select on %I to anon, authenticated', t);
  end loop;
end $$;

grant select on latest_offers, best_offers to anon, authenticated;
grant select on v_concepts, v_rules, v_products, v_offers, v_best_offers, v_product_offers, v_product_best
  to anon, authenticated;

-- Server only: staging + AI logs. RLS on, no policies.
alter table import_rows enable row level security;
alter table agent_runs enable row level security;
alter table agent_steps enable row level security;
revoke all on import_rows, agent_runs, agent_steps from anon, authenticated;

-- Per-user app data.
alter table profiles enable row level security;
create policy "own profile" on profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

alter table recipes enable row level security;
create policy "own recipes" on recipes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table recipe_ingredients enable row level security;
create policy "own recipe ingredients" on recipe_ingredients for all to authenticated
  using (exists (select 1 from recipes r where r.id = recipe_id and r.user_id = auth.uid()))
  with check (exists (select 1 from recipes r where r.id = recipe_id and r.user_id = auth.uid()));

alter table ingredient_alternatives enable row level security;
create policy "own alternatives" on ingredient_alternatives for all to authenticated
  using (exists (
    select 1 from recipe_ingredients ri join recipes r on r.id = ri.recipe_id
    where ri.id = recipe_ingredient_id and r.user_id = auth.uid()))
  with check (exists (
    select 1 from recipe_ingredients ri join recipes r on r.id = ri.recipe_id
    where ri.id = recipe_ingredient_id and r.user_id = auth.uid()));

alter table baskets enable row level security;
create policy "own basket" on baskets for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table basket_items enable row level security;
create policy "own basket items" on basket_items for all to authenticated
  using (exists (select 1 from baskets b where b.id = basket_id and b.user_id = auth.uid()))
  with check (exists (select 1 from baskets b where b.id = basket_id and b.user_id = auth.uid()));

alter table basket_history enable row level security;
create policy "own history read" on basket_history for select to authenticated using (user_id = auth.uid());
create policy "own history insert" on basket_history for insert to authenticated with check (user_id = auth.uid());

grant select, insert, update, delete on profiles, recipes, recipe_ingredients, ingredient_alternatives,
  baskets, basket_items to authenticated;
grant select, insert on basket_history to authenticated;
grant usage on sequence basket_history_id_seq to authenticated;

-- Functions: catalog reads for everyone, often_bought for logged-in users, refresh_catalog server only.
revoke execute on function refresh_catalog() from public, anon, authenticated;
grant execute on function get_offers(text[], text[]), get_offers_for_items(text[]),
  search_products(text, boolean, text, int), todays_deals(int) to anon, authenticated;
revoke execute on function often_bought(int) from public, anon;
grant execute on function often_bought(int) to authenticated;
