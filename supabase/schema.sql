-- Public-safe Supabase setup for Schedule Time Matcher.
-- Run this in the Supabase SQL editor before setting VITE_ENABLE_SUPABASE_SYNC=true.

create extension if not exists pgcrypto;

create table if not exists public.schedule_events (
  id text primary key
);

alter table public.schedule_events
  add column if not exists schedule jsonb,
  add column if not exists write_token_hash text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.schedule_events
  alter column schedule set not null;

alter table public.schedule_events enable row level security;
revoke all on table public.schedule_events from anon, authenticated;

drop function if exists public.save_event(text, jsonb);

create or replace function public.hash_event_token(write_token text)
returns text
language sql
immutable
set search_path = public, extensions, pg_temp
as $$
  select encode(digest(write_token, 'sha256'), 'hex');
$$;

create or replace function public.assert_event_payload(
  event_id text,
  event_schedule jsonb,
  write_token text
)
returns void
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if event_id is null or event_id !~ '^event-[A-Za-z0-9_-]{16,160}$' then
    raise exception 'Invalid event id';
  end if;

  if write_token is null or length(write_token) < 32 or length(write_token) > 256 then
    raise exception 'Invalid edit token';
  end if;

  if event_schedule is null or jsonb_typeof(event_schedule) <> 'object' then
    raise exception 'Invalid event payload';
  end if;

  if event_schedule->>'id' <> event_id then
    raise exception 'Event id mismatch';
  end if;

  if pg_column_size(event_schedule) > 200000 then
    raise exception 'Event payload is too large';
  end if;

  if jsonb_typeof(event_schedule->'participants') is distinct from 'array' then
    raise exception 'Participants must be an array';
  end if;

  if jsonb_array_length(event_schedule->'participants') > 100 then
    raise exception 'Too many participants';
  end if;
end;
$$;

create or replace function public.get_event(event_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  saved_schedule jsonb;
begin
  select schedule
    into saved_schedule
    from public.schedule_events
   where id = event_id;

  return saved_schedule;
end;
$$;

create or replace function public.create_event(
  event_id text,
  event_schedule jsonb,
  write_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  saved_schedule jsonb;
begin
  perform public.assert_event_payload(event_id, event_schedule, write_token);

  insert into public.schedule_events as events (
    id,
    schedule,
    write_token_hash
  )
  values (
    event_id,
    event_schedule,
    public.hash_event_token(write_token)
  )
  on conflict (id) do update
     set schedule = excluded.schedule,
         write_token_hash = excluded.write_token_hash,
         updated_at = now()
   where events.write_token_hash is null
      or events.write_token_hash = excluded.write_token_hash
  returning events.schedule into saved_schedule;

  if saved_schedule is null then
    raise exception 'Event already exists or edit token is invalid';
  end if;

  return saved_schedule;
end;
$$;

create or replace function public.save_event(
  event_id text,
  event_schedule jsonb,
  write_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  saved_schedule jsonb;
begin
  perform public.assert_event_payload(event_id, event_schedule, write_token);

  update public.schedule_events
     set schedule = event_schedule,
         updated_at = now()
   where id = event_id
     and write_token_hash = public.hash_event_token(write_token)
   returning schedule into saved_schedule;

  if saved_schedule is null then
    raise exception 'Event not found or edit token is invalid';
  end if;

  return saved_schedule;
end;
$$;

revoke all on function public.hash_event_token(text) from public;
revoke all on function public.assert_event_payload(text, jsonb, text) from public;
revoke all on function public.get_event(text) from public;
revoke all on function public.create_event(text, jsonb, text) from public;
revoke all on function public.save_event(text, jsonb, text) from public;

grant execute on function public.get_event(text) to anon, authenticated;
grant execute on function public.create_event(text, jsonb, text) to anon, authenticated;
grant execute on function public.save_event(text, jsonb, text) to anon, authenticated;
