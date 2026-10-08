-- Per-user conveniences: a basket that syncs across devices keeps the same labels as the local one.
alter table basket_items
  add column label text,
  add column for_ingredient text;

alter table basket_history
  add column label text;

-- one basket row per user is created on first sync
create index if not exists baskets_user_idx on baskets (user_id);
