begin;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists zenou_private;
revoke all on schema zenou_private from public, anon, authenticated;
create table if not exists zenou_private.accounts (
 id uuid primary key default extensions.gen_random_uuid(),
 username text unique not null check(username ~ '^[a-z0-9_]{3,24}$'),
 password_hash text not null, created_at timestamptz not null default now()
);
create table if not exists zenou_private.sessions (
 token_hash text primary key, user_id uuid not null references zenou_private.accounts on delete cascade,
 expires_at timestamptz not null default now() + interval '30 days'
);
create index if not exists sessions_user on zenou_private.sessions(user_id);
create table if not exists zenou_private.attempts (
 username text primary key, failures int not null default 0, started_at timestamptz not null default now()
);
create table if not exists zenou_private.library (
 user_id uuid references zenou_private.accounts on delete cascade,
 key text not null, value jsonb, primary key(user_id,key)
);
alter table zenou_private.accounts enable row level security;
alter table zenou_private.sessions enable row level security;
alter table zenou_private.attempts enable row level security;
alter table zenou_private.library enable row level security;
revoke all on all tables in schema zenou_private from public, anon, authenticated;

create or replace function public.zenou_auth(action text, username text default '', password text default '', token text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 name text := lower(trim(username));
 person zenou_private.accounts%rowtype;
 attempt zenou_private.attempts%rowtype;
 new_token text;
 session_account_id uuid;
begin
 if action in ('session','logout') then
  select s.user_id into session_account_id from zenou_private.sessions s
   where s.token_hash=encode(extensions.digest(token,'sha256'),'hex') and s.expires_at>now();
  if action='logout' then
   delete from zenou_private.sessions s where s.token_hash=encode(extensions.digest(token,'sha256'),'hex');
   return jsonb_build_object('ok',true);
  end if;
  if session_account_id is null then return jsonb_build_object('session',null); end if;
  select * into person from zenou_private.accounts a where a.id=session_account_id;
  return jsonb_build_object('user',jsonb_build_object('id',person.id,'username',person.username));
 end if;
 if name !~ '^[a-z0-9_]{3,24}$' then return jsonb_build_object('error','Use 3–24 letters, numbers or underscores.'); end if;
 if action='available' then
  return jsonb_build_object('available',not exists(select 1 from zenou_private.accounts a where a.username=name));
 end if;
 if action not in ('register','login') then return jsonb_build_object('error','Unsupported action.'); end if;
 if octet_length(password)>72 or length(password)<10 then return jsonb_build_object('error','Use a password of at least 10 characters and at most 72 bytes.'); end if;
 perform pg_advisory_xact_lock(hashtextextended(name,0));
 select * into attempt from zenou_private.attempts a where a.username=name;
 if attempt.failures>=5 and attempt.started_at>now()-interval '15 minutes' then
  return jsonb_build_object('error','Too many attempts. Try again in 15 minutes.');
 end if;
 select * into person from zenou_private.accounts a where a.username=name;
 if action='register' then
  if person.id is not null then return jsonb_build_object('error','That username is already taken.'); end if;
  insert into zenou_private.accounts(username,password_hash) values(name,extensions.crypt(password,extensions.gen_salt('bf',12))) returning * into person;
 else
  if person.id is null or person.password_hash<>extensions.crypt(password,person.password_hash) then
   insert into zenou_private.attempts as a(username,failures) values(name,1)
    on conflict on constraint attempts_pkey do update set
    failures=case when a.started_at<now()-interval '15 minutes' then 1 else a.failures+1 end,
    started_at=case when a.started_at<now()-interval '15 minutes' then now() else a.started_at end;
   return jsonb_build_object('error','Incorrect username or password.');
  end if;
 end if;
 delete from zenou_private.attempts a where a.username=name;
 delete from zenou_private.sessions s where s.user_id=person.id and s.expires_at<=now();
 new_token := encode(extensions.gen_random_bytes(32),'hex');
 insert into zenou_private.sessions(token_hash,user_id) values(encode(extensions.digest(new_token,'sha256'),'hex'),person.id);
 return jsonb_build_object('token',new_token,'user',jsonb_build_object('id',person.id,'username',person.username));
end $$;

create or replace function public.zenou_library(token text, changes jsonb default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare account_id uuid; item record; result jsonb;
begin
 select s.user_id into account_id from zenou_private.sessions s
  where s.token_hash=encode(extensions.digest(token,'sha256'),'hex') and s.expires_at>now();
 if account_id is null then raise exception 'Session expired. Sign in again.' using errcode='28000'; end if;
 if changes is not null then
  if jsonb_typeof(changes)<>'object' or octet_length(changes::text)>1048576 then raise exception 'Invalid library data'; end if;
  for item in select * from jsonb_each(changes) loop
   if item.key not in ('zenou_fav','zenou_recent','zenou_ratings','zenou_notes','zenou_playtime','zenou_hidden','zenou_playlists','zenou_xp','zenou_ach','zenou_days') then raise exception 'Unsupported library field'; end if;
   insert into zenou_private.library(user_id,key,value) values(account_id,item.key,item.value)
    on conflict(user_id,key) do update set value=excluded.value;
  end loop;
 end if;
 select coalesce(jsonb_object_agg(l.key,l.value),'{}'::jsonb) into result from zenou_private.library l where l.user_id=account_id;
 return result;
end $$;
revoke all on function public.zenou_auth(text,text,text,text) from public;
revoke all on function public.zenou_library(text,jsonb) from public;
grant execute on function public.zenou_auth(text,text,text,text) to anon;
grant execute on function public.zenou_library(text,jsonb) to anon;
-- Carry a signed-in legacy account's cloud library into its new username account.
create or replace function public.zenou_migrate_library(token text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare account_id uuid; legacy_id uuid := auth.uid();
begin
 if legacy_id is null then raise exception 'Previous session required'; end if;
 select s.user_id into account_id from zenou_private.sessions s
  where s.token_hash=encode(extensions.digest(token,'sha256'),'hex') and s.expires_at>now();
 if account_id is null then raise exception 'Session expired'; end if;
 insert into zenou_private.library(user_id,key,value)
 select account_id,l.key,l.value from public.user_library l where l.user_id=legacy_id
 on conflict(user_id,key) do nothing;
 return true;
end $$;
revoke all on function public.zenou_migrate_library(text) from public, anon;
grant execute on function public.zenou_migrate_library(text) to authenticated;
commit;
