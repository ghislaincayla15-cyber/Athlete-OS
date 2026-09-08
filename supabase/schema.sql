-- Exécuter une seule fois dans le SQL Editor du projet dédié Athlete OS.
create table if not exists public.athlete_spaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
alter table public.athlete_spaces enable row level security;
revoke all on public.athlete_spaces from anon;
grant select, insert, update, delete on public.athlete_spaces to authenticated;
create policy "Read own space" on public.athlete_spaces for select to authenticated using ((select auth.uid()) = user_id);
create policy "Create own space" on public.athlete_spaces for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own space" on public.athlete_spaces for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own space" on public.athlete_spaces for delete to authenticated using ((select auth.uid()) = user_id);
create or replace function public.athlete_touch_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end; $$;
create trigger athlete_space_updated before update on public.athlete_spaces for each row execute function public.athlete_touch_updated_at();
