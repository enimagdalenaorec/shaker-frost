-- AI pipeline: reusable research cache + richer recipe results (CLAUDE.md §8).

-- How an ingredient is replaced in a given role and kind of dish. Reused across recipes,
-- so the second recipe with "jaje as binder in palačinke-type dishes" needs no research call.
create table substitution_research (
  key            text primary key,                 -- '<slug or name>|<role>|<dish category>'
  ingredient     text not null,
  role           text not null,
  dish_category  text not null,
  notes_hr       text not null,
  suggestions    jsonb not null default '[]',      -- [{substitute_hr, when_hr}]
  sources        jsonb not null default '[]',      -- [{title, url}] when web-grounded
  method         text not null check (method in ('web', 'ai')),
  model          text,
  created_at     timestamptz not null default now()
);

create table dish_research (
  key         text primary key,                    -- normalised dish name
  dish        text not null,
  notes_hr    text not null,
  sources     jsonb not null default '[]',
  method      text not null check (method in ('web', 'ai')),
  model       text,
  created_at  timestamptz not null default now()
);

alter table recipes
  add column source_name    text,
  add column image_url      text,
  add column dish_category  text,
  add column dish_notes_hr  text,
  add column tip_hr         text,
  add column sources        jsonb not null default '[]';

alter table recipe_ingredients
  add column status text check (status in ('vegan', 'not_vegan', 'depends'));

alter table ingredient_alternatives
  add column label_hr     text,
  add column source_urls  jsonb not null default '[]';

alter table agent_steps drop constraint agent_steps_stage_check;
alter table agent_steps add constraint agent_steps_stage_check
  check (stage in ('ingest', 'analyze', 'research', 'alternatives', 'offers', 'rewrite', 'save'));

-- research is generic knowledge: public read, server writes
alter table substitution_research enable row level security;
alter table dish_research enable row level security;
create policy "public read" on substitution_research for select to anon, authenticated using (true);
create policy "public read" on dish_research for select to anon, authenticated using (true);
grant select on substitution_research, dish_research to anon, authenticated;
