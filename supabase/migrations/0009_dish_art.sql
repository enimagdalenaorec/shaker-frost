-- Dish illustrations, drawn by the OpenAI image model in the background after a run (lib/ai/dish-art.ts).
-- One picture per dish and prompt version, reused by every recipe of that dish.
-- The files live in the public Storage bucket "dish-art"; only server code (secret key) uploads.

create table dish_art (
  key             text primary key,                -- normalised dish name, as dish_research.key
  dish            text not null,
  path            text not null,                   -- object path in the dish-art bucket
  url             text not null,                   -- public URL
  model           text not null,
  prompt_version  text not null,
  created_at      timestamptz not null default now()
);

alter table recipes
  add column art_url     text,
  add column art_status  text check (art_status in ('pending', 'done', 'error'));   -- NULL = no picture

alter table agent_steps drop constraint agent_steps_stage_check;
alter table agent_steps add constraint agent_steps_stage_check
  check (stage in ('ingest', 'analyze', 'research', 'alternatives', 'offers', 'rewrite', 'save', 'art'));

alter table dish_art enable row level security;
create policy "public read" on dish_art for select to anon, authenticated using (true);
grant select on dish_art to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('dish-art', 'dish-art', true)
on conflict (id) do nothing;
