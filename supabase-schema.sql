-- Run this in Supabase Dashboard > SQL Editor for your project.
create table if not exists public.saved_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) <= 180),
  tool text not null check (tool in ('tk','sub','df','gr','mf','toolkit','diff','grade','finder')),
  content text not null check (char_length(content) <= 60000),
  created_at timestamptz not null default now()
);

alter table public.saved_resources enable row level security;
revoke all on public.saved_resources from anon;
grant select, insert, delete on public.saved_resources to authenticated;

drop policy if exists "Users can read their own saved resources" on public.saved_resources;
create policy "Users can read their own saved resources" on public.saved_resources
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own saved resources" on public.saved_resources;
create policy "Users can insert their own saved resources" on public.saved_resources
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own saved resources" on public.saved_resources;
create policy "Users can delete their own saved resources" on public.saved_resources
  for delete to authenticated using ((select auth.uid()) = user_id);
