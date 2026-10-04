-- Online backup for dymeApp. Run this ONCE in the Supabase dashboard:
--   SQL Editor -> New query -> paste everything -> Run.
-- It is safe to run again (everything is "if not exists" / "or replace").
--
-- How the app uses it (see src/sync):
--   * public.app_data holds every kind of data as JSON rows: records, shopping,
--     DTR, profile, category layout. One row per item.
--   * Account/card numbers, passwords, ID numbers and photos are encrypted ON
--     THE PHONE before upload, so this database only holds ciphertext for them.
--   * Row Level Security makes each signed-in user able to see and change only
--     their own rows. The publishable key in the app can do nothing else.
--   * The storage bucket "record-images" holds encrypted photos, one folder
--     per user.

-- ---------------------------------------------------------------- table
create table if not exists public.app_data (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  collection text        not null,
  item_id    text        not null,
  data       jsonb,
  deleted    boolean     not null default false,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, collection, item_id)
);

-- Pulls ask for "rows of this collection changed after <time>", oldest first.
create index if not exists app_data_pull_idx
  on public.app_data (user_id, collection, updated_at);

-- The server, not the phone's clock, decides when a row changed. clock_timestamp()
-- (not now()) so rows saved in one batch still get distinct times.
create or replace function public.app_data_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists app_data_touch on public.app_data;
create trigger app_data_touch
  before insert or update on public.app_data
  for each row execute function public.app_data_touch();

-- ---------------------------------------------------------------- row level security
alter table public.app_data enable row level security;

drop policy if exists "Users manage their own rows" on public.app_data;
create policy "Users manage their own rows"
  on public.app_data
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------- photos (storage)
insert into storage.buckets (id, name, public)
values ('record-images', 'record-images', false)
on conflict (id) do nothing;

drop policy if exists "Users manage their own photos" on storage.objects;
create policy "Users manage their own photos"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'record-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'record-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ---------------------------------------------------------------- optional clean-up
-- The "todos" test table from the Supabase quickstart isn't used any more:
-- drop table if exists public.todos;
