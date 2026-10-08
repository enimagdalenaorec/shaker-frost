-- Our curated knowledge: which non-vegan ingredient is replaced by which catalog concept, in which role.
-- Seeded from supabase/seed/*.sql. concept_id is plain text (no FK) so a catalog reload never breaks it;
-- scripts/validate-catalog.ts checks that every concept_id exists and has products.

create table ingredients (
  slug             text primary key,       -- 'maslac', 'mlijeko', 'jaje', 'mljeveno_meso' ...
  name_hr          text not null,
  aliases          text[] not null default '{}',
  is_vegan         boolean not null,
  category         text,
  grams_per_piece  numeric                 -- jaje = 55, so 'kom' converts to grams
);

create table substitution_rules (
  id               bigserial primary key,
  ingredient_slug  text not null references ingredients (slug) on delete cascade,
  role             text not null default 'any', -- 'any','frying','flavour','binder','leavening','creaminess','smoky','sweet','base'
  concept_id       text not null,
  prefer           jsonb not null default '{}', -- soft facet preferences, e.g. {"zasladeno": "nezaslađeno", "okus": "bez okusa"}
  ratio            numeric not null default 1,  -- g/ml of substitute per g/ml of original
  notes_hr         text,
  rank             int not null default 1
);
create index substitution_rules_ingredient_idx on substitution_rules (ingredient_slug);
