do $library_setup$
begin
  create table if not exists public.user_library (
    user_id uuid not null references auth.users(id) on delete cascade,
    key text not null check (key in ('zenou_fav','zenou_recent','zenou_ratings','zenou_notes','zenou_playtime','zenou_hidden','zenou_playlists','zenou_xp','zenou_ach','zenou_days')),
    value jsonb check (octet_length(value::text) <= 1048576),
    updated_at timestamptz not null default now(),
    primary key (user_id, key)
  );
  alter table public.user_library alter column value drop not null;
  alter table public.user_library enable row level security;
  revoke all on public.user_library from anon;
  grant select, insert, update on public.user_library to authenticated;
  drop policy if exists "Read own library" on public.user_library;
  drop policy if exists "Insert own library" on public.user_library;
  drop policy if exists "Update own library" on public.user_library;
  create policy "Read own library" on public.user_library for select to authenticated using ((select auth.uid()) = user_id);
  create policy "Insert own library" on public.user_library for insert to authenticated with check ((select auth.uid()) = user_id);
  create policy "Update own library" on public.user_library for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
end;
$library_setup$;
