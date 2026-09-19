-- Pit Crew Field Setup Planner — Supabase schema
-- Run this once in your Supabase project's SQL Editor (Project > SQL Editor > New query > paste > Run).
--
-- ALREADY SET UP YOUR PROJECT BEFORE? Do NOT re-run this whole file —
-- the CREATE TABLE statements below will error with "relation already
-- exists" on any table you already have (harmless, but it stops the
-- whole paste partway through, including whatever came after it). Only
-- run the specific new block(s) called out to you for that change —
-- each one is self-contained and safe to paste on its own. When in
-- doubt, search this file for the table/column name being added rather
-- than running the file top to bottom again.

create extension if not exists pgcrypto;

create table roster (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  role       text not null default '',
  created_at timestamptz not null default now()
);

create table events (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  date       date,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);

-- only one event may be marked current at a time
create unique index one_current_event on events (is_current) where is_current;

create table items (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references events(id) on delete cascade,
  type_id        text not null,
  label          text not null,
  x_pct          numeric not null,
  y_pct          numeric not null,
  needs_help     boolean not null default false,
  helpers_needed int not null default 1,
  notes          text not null default '',
  timing         text not null default '',
  created_at     timestamptz not null default now()
);

create table item_assignments (
  item_id      uuid not null references items(id) on delete cascade,
  volunteer_id uuid not null references roster(id) on delete cascade,
  primary key (item_id, volunteer_id)
);

-- ---------------------------------------------------------------
-- Row Level Security: anyone can read (that's what makes the
-- volunteer view public/link-shareable), only a signed-in user
-- (you) can write. See README.md for how to create your one
-- login and lock out public sign-ups.
-- ---------------------------------------------------------------
alter table roster            enable row level security;
alter table events             enable row level security;
alter table items              enable row level security;
alter table item_assignments   enable row level security;

create policy "public read roster"     on roster            for select using (true);
create policy "public read events"     on events             for select using (true);
create policy "public read items"      on items              for select using (true);
create policy "public read item_assignments" on item_assignments for select using (true);

create policy "auth write roster"      on roster            for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth write events"      on events             for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth write items"       on items              for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth write item_assignments" on item_assignments for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------
-- Realtime: lets every open browser tab (yours and volunteers')
-- see changes live, the same way the Artifact version did.
-- ---------------------------------------------------------------
alter publication supabase_realtime add table roster, events, items, item_assignments;

-- ---------------------------------------------------------------
-- Seed one starter event so the app isn't empty on first load.
-- Safe to delete/rename later from inside the app.
-- ---------------------------------------------------------------
insert into events (name, date, is_current) values ('New Event', current_date, true);

-- ---------------------------------------------------------------
-- Badge check-in/check-out — who has which badge, with a photo
-- taken at each handoff, and a full history per badge.
-- ---------------------------------------------------------------
create table badges (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  notes      text not null default '',
  created_at timestamptz not null default now()
);

create table badge_events (
  id                     uuid primary key default gen_random_uuid(),
  badge_id               uuid not null references badges(id) on delete cascade,
  volunteer_id           uuid references roster(id) on delete set null,
  volunteer_name_snapshot text not null default '', -- keeps history readable even if the roster entry is later deleted
  action                 text not null check (action in ('checkout','checkin')),
  photo_url              text,
  created_at             timestamptz not null default now()
);

alter table badges       enable row level security;
alter table badge_events enable row level security;

create policy "public read badges"       on badges       for select using (true);
create policy "public read badge_events" on badge_events for select using (true);
create policy "auth write badges"        on badges       for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth write badge_events"  on badge_events for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

alter publication supabase_realtime add table badges, badge_events;

-- Storage bucket for the check-in/check-out photos. Public read (so
-- photos display for anyone with the link, same as everything else in
-- this app), writes restricted to your one signed-in login.
insert into storage.buckets (id, name, public)
  values ('badge-photos', 'badge-photos', true)
  on conflict (id) do nothing;

create policy "public read badge photos" on storage.objects
  for select using (bucket_id = 'badge-photos');
create policy "auth upload badge photos" on storage.objects
  for insert with check (bucket_id = 'badge-photos' and auth.role() = 'authenticated');
create policy "auth delete badge photos" on storage.objects
  for delete using (bucket_id = 'badge-photos' and auth.role() = 'authenticated');

-- ---------------------------------------------------------------
-- Per-event volunteer status — who's signed up / a backup for a
-- given event. No row for a (event, volunteer) pair = "Potential"
-- (the default bucket), so this table only needs to hold the two
-- explicit statuses.
-- ---------------------------------------------------------------
create table event_volunteer_status (
  event_id     uuid not null references events(id) on delete cascade,
  volunteer_id uuid not null references roster(id) on delete cascade,
  status       text not null check (status in ('signed_up','backup')),
  primary key (event_id, volunteer_id)
);

alter table event_volunteer_status enable row level security;
create policy "public read event_volunteer_status" on event_volunteer_status for select using (true);
create policy "auth write event_volunteer_status" on event_volunteer_status for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

alter publication supabase_realtime add table event_volunteer_status;

-- ---------------------------------------------------------------
-- Which student plays a given instrument — separate from which
-- volunteer is assigned to help carry it. Free text (students aren't
-- part of the adult Crew Roster).
-- ---------------------------------------------------------------
alter table items add column if not exists student_name text not null default '';

-- Teardown/wrap-up steps, separate from setup notes — shown under the
-- item's "Wrap It Up" tab.
alter table items add column if not exists teardown_notes text not null default '';

-- Optional short video clip showing how to wrap up a specific item,
-- replacing the generic coiling animation when present.
alter table items add column if not exists teardown_video_url text;

insert into storage.buckets (id, name, public)
  values ('teardown-clips', 'teardown-clips', true)
  on conflict (id) do nothing;

create policy "public read teardown clips" on storage.objects
  for select using (bucket_id = 'teardown-clips');
create policy "auth upload teardown clips" on storage.objects
  for insert with check (bucket_id = 'teardown-clips' and auth.role() = 'authenticated');
create policy "auth delete teardown clips" on storage.objects
  for delete using (bucket_id = 'teardown-clips' and auth.role() = 'authenticated');

-- ---------------------------------------------------------------
-- Templates — reusable starting layouts per event type (Football,
-- BOA Comp, UIL Comp, Percussion Only, ...). "New Event" can stamp
-- an event's items from a template instead of starting blank.
-- Mirrors events/items but has no assignment table — templates
-- aren't tied to real volunteers, only to job definitions.
-- ---------------------------------------------------------------
create table templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  created_at  timestamptz not null default now()
);

create table template_items (
  id                  uuid primary key default gen_random_uuid(),
  template_id         uuid not null references templates(id) on delete cascade,
  type_id             text not null,
  label               text not null,
  x_pct               numeric not null,
  y_pct               numeric not null,
  needs_help          boolean not null default false,
  helpers_needed      int not null default 1,
  notes               text not null default '',
  timing              text not null default '',
  student_name        text not null default '',
  teardown_notes      text not null default '',
  teardown_video_url  text,
  created_at          timestamptz not null default now()
);

alter table templates      enable row level security;
alter table template_items enable row level security;

create policy "public read templates"      on templates      for select using (true);
create policy "public read template_items" on template_items for select using (true);
create policy "auth write templates"       on templates      for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "auth write template_items"  on template_items for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

alter publication supabase_realtime add table templates, template_items;

-- Which template a given event currently "follows" — set when the event
-- is created from a template, and changeable later via "Switch Template"
-- in the event bar. Purely a reference/label plus the target for that
-- switch action (which adds the new template's items to the event
-- without touching what's already placed) — it does NOT restrict which
-- equipment/instruments can be dragged onto the event; that palette
-- always shows the full catalog no matter which template (if any) an
-- event follows.
alter table events add column if not exists template_id uuid references templates(id) on delete set null;

-- "Anchor" a specific volunteer's assignment to a specific item — for
-- the reliable helper who runs the same station every single game.
-- The "Clear Volunteers" button (next to Needs a Hand) skips anchored
-- assignments, so re-setting up for a new game doesn't wipe out people
-- who don't need to be re-assigned each time.
alter table item_assignments add column if not exists anchored boolean not null default false;

-- "What to Do" and "Wrap It Up" can each carry a short video clip OR a
-- still photo now, not just teardown-only video. teardown_video_url
-- (above) is left as-is for backward compatibility with clips already
-- uploaded before this — the app reads it as a fallback when
-- teardown_media_url is empty, but every new upload (either tab, either
-- media type) goes through the *_media_url/*_media_type columns below.
alter table items add column if not exists setup_media_url text;
alter table items add column if not exists setup_media_type text check (setup_media_type in ('video','photo'));
alter table items add column if not exists teardown_media_url text;
alter table items add column if not exists teardown_media_type text check (teardown_media_type in ('video','photo'));

alter table template_items add column if not exists setup_media_url text;
alter table template_items add column if not exists setup_media_type text check (setup_media_type in ('video','photo'));
alter table template_items add column if not exists teardown_media_url text;
alter table template_items add column if not exists teardown_media_type text check (teardown_media_type in ('video','photo'));

-- Badges themselves are season-wide (see badges/badge_events above), not
-- tied to one event — but not every event actually has every badge on
-- hand (ordered and not arrived yet, only some come to an away/satellite
-- event, ...). Per-BADGE, per-event, not a blanket per-event switch — an
-- event might have some badges on hand and not others.
-- No row for an (event, badge) pair = active (the default), same
-- "absence is the common case" pattern as event_volunteer_status above —
-- only badges someone has explicitly marked "not here" for this event
-- get a row, so the normal case (everything on hand) costs nothing.
-- everything below is safe to re-run (unlike the CREATE TABLE blocks
-- earlier in this file) — if you're not sure whether you already ran
-- this block, just run it again
create table if not exists event_inactive_badges (
  event_id uuid not null references events(id) on delete cascade,
  badge_id uuid not null references badges(id) on delete cascade,
  primary key (event_id, badge_id)
);
alter table event_inactive_badges enable row level security;
drop policy if exists "public read event_inactive_badges" on event_inactive_badges;
create policy "public read event_inactive_badges" on event_inactive_badges for select using (true);
drop policy if exists "auth write event_inactive_badges" on event_inactive_badges;
create policy "auth write event_inactive_badges"  on event_inactive_badges for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'event_inactive_badges'
  ) then
    alter publication supabase_realtime add table event_inactive_badges;
  end if;
end $$;

-- What to Do / Wrap It Up (setup+teardown notes and their photo/video)
-- move from "copied once per item, snapshotted at creation time" to one
-- shared record per equipment TYPE — edit it on any item of that type,
-- in any event or template, and it updates everywhere, immediately
-- (realtime, like everything else — see boot.js), because everywhere
-- reads the same row. items.notes/teardown_notes/*_media_* and
-- template_items' equivalents are left in place but no longer read or
-- written by the app — harmless, just historical at this point.
-- Everything below is safe to re-run.
create table if not exists item_type_notes (
  type_id             text primary key,
  notes               text not null default '',
  teardown_notes      text not null default '',
  setup_media_url     text,
  setup_media_type    text check (setup_media_type in ('video','photo')),
  teardown_media_url  text,
  teardown_media_type text check (teardown_media_type in ('video','photo')),
  updated_at          timestamptz not null default now()
);
alter table item_type_notes enable row level security;
drop policy if exists "public read item_type_notes" on item_type_notes;
create policy "public read item_type_notes" on item_type_notes for select using (true);
drop policy if exists "auth write item_type_notes" on item_type_notes;
create policy "auth write item_type_notes" on item_type_notes for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'item_type_notes'
  ) then
    alter publication supabase_realtime add table item_type_notes;
  end if;
end $$;

-- One-time backfill from existing per-item notes/media, run once as part
-- of this same block: for each equipment type, seeds from whichever
-- existing item (any event OR template) most recently had something
-- filled in, so the most up-to-date version becomes the shared starting
-- point instead of an arbitrary/oldest one. ON CONFLICT DO NOTHING makes
-- this safe to re-run too — it only fills types with no shared record
-- yet, never overwrites one you've since edited through the app.
insert into item_type_notes (type_id, notes, teardown_notes, setup_media_url, setup_media_type, teardown_media_url, teardown_media_type)
select distinct on (type_id)
  type_id, notes, teardown_notes, setup_media_url, setup_media_type, teardown_media_url, teardown_media_type
from (
  select
    case type_id when 'timpani' then 'inst-timpani' when 'rack' then 'inst-rack' else type_id end as type_id,
    notes, teardown_notes, setup_media_url, setup_media_type, teardown_media_url, teardown_media_type, created_at
  from items
  where notes <> '' or teardown_notes <> '' or setup_media_url is not null or teardown_media_url is not null
  union all
  select
    case type_id when 'timpani' then 'inst-timpani' when 'rack' then 'inst-rack' else type_id end as type_id,
    notes, teardown_notes, setup_media_url, setup_media_type, teardown_media_url, teardown_media_type, created_at
  from template_items
  where notes <> '' or teardown_notes <> '' or setup_media_url is not null or teardown_media_url is not null
) combined
order by type_id, created_at desc
on conflict (type_id) do nothing;

insert into storage.buckets (id, name, public)
  values ('item-media', 'item-media', true)
  on conflict (id) do nothing;

create policy "public read item media" on storage.objects
  for select using (bucket_id = 'item-media');
create policy "auth upload item media" on storage.objects
  for insert with check (bucket_id = 'item-media' and auth.role() = 'authenticated');
create policy "auth delete item media" on storage.objects
  for delete using (bucket_id = 'item-media' and auth.role() = 'authenticated');

-- ---------------------------------------------------------------
-- Role-tiered access — shared PINs for Director and Lead Volunteer,
-- layered on top of the one Admin (email/password) login above.
-- Director/Lead Volunteer sign the browser into one of two shared,
-- non-personal Supabase Auth accounts behind the scenes (see README) so
-- every existing "auth.role() = 'authenticated'" policy above keeps
-- working completely unchanged — the PIN just gates whether the app is
-- allowed to perform that sign-in, verified here server-side first.
--
-- app_access has RLS enabled but NO policies at all, on purpose — with
-- zero policies, PostgREST can never select/insert/update/delete this
-- table directly (anon OR authenticated). The only way in is through the
-- two SECURITY DEFINER functions below, which run as the table owner and
-- so bypass RLS internally. This is the standard way to keep a "secret"
-- table off the public REST API entirely. pgcrypto is already enabled
-- above (see the top of this file).
-- ---------------------------------------------------------------
create table if not exists app_access (
  role       text primary key check (role in ('director','lead_volunteer')),
  pin_hash   text not null,
  updated_at timestamptz not null default now()
);
alter table app_access enable row level security;

-- Returns true/false only — never the hash — so it's safe to let anon
-- call this straight from the PIN pad, before any real session exists.
-- search_path includes "extensions" alongside "public" because Supabase
-- installs pgcrypto (crypt/gen_salt, used below) there by default on
-- most projects, not into public — without it here, crypt()/gen_salt()
-- raise "function ... does not exist" even though the extension is
-- enabled, since a SECURITY DEFINER function only sees what its own
-- search_path lists, not the caller's.
create or replace function verify_role_pin(p_role text, p_pin text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  found_hash text;
begin
  if p_role not in ('director','lead_volunteer') then
    return false;
  end if;
  select pin_hash into found_hash from app_access where role = p_role;
  if found_hash is null then
    return false; -- role's PIN was never set yet
  end if;
  return found_hash = crypt(p_pin, found_hash);
end;
$$;

-- Sets/changes a role's PIN. auth.role()='authenticated' guards against a
-- fully anonymous caller (Supabase grants EXECUTE on new public-schema
-- functions to anon by default, so this check can't be skipped) — note
-- this does NOT by itself distinguish Admin from Director/Lead Volunteer,
-- since under this design all three are equally "authenticated". The
-- Admin-only Access tab's UI gating is what stops the other two day to
-- day; see README for that disclosed tradeoff.
create or replace function set_role_pin(p_role text, p_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if auth.role() <> 'authenticated' then
    return; -- silent no-op for anon, not an error
  end if;
  if p_role not in ('director','lead_volunteer') then
    raise exception 'invalid role %', p_role;
  end if;
  if p_pin is null or length(p_pin) < 4 then
    raise exception 'PIN must be at least 4 characters';
  end if;
  insert into app_access (role, pin_hash, updated_at)
  values (p_role, crypt(p_pin, gen_salt('bf')), now())
  on conflict (role) do update set pin_hash = excluded.pin_hash, updated_at = now();
end;
$$;

revoke execute on function set_role_pin(text, text) from anon;
grant execute on function verify_role_pin(text, text) to anon, authenticated;
grant execute on function set_role_pin(text, text) to authenticated;

-- No realtime publication entry for app_access — it's never read by the
-- client directly, only touched through the two RPCs above.

-- ---------------------------------------------------------------
-- Event type (Home / Away / Contest) — lets Volunteer Analytics break
-- down participation by the kind of event, not just a raw count.
-- '' (the default) means unclassified — every event created before
-- this migration, and any new one nobody bothers to set. Set from the
-- New Event / Rename Event form. Idempotent — safe to re-run.
-- ---------------------------------------------------------------
alter table events add column if not exists event_type text not null default '' check (event_type in ('', 'home', 'away', 'contest'));

-- ---------------------------------------------------------------
-- Itinerary — a day-of timeline per event (bus departure, warm-up,
-- performance time, load-out, ...). time_value drives sort order and
-- is null when a pasted line's time couldn't be parsed (or an ad hoc
-- item genuinely has no time — e.g. "Lunch provided by boosters"); the
-- app falls back to showing `label` alone for those, so an
-- unparseable/timeless entry still displays sensibly instead of
-- breaking. Idempotent — safe to re-run.
-- ---------------------------------------------------------------
create table if not exists itinerary_items (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events(id) on delete cascade,
  time_value time,
  label      text not null,
  notes      text not null default '',
  created_at timestamptz not null default now()
);
alter table itinerary_items enable row level security;
drop policy if exists "public read itinerary_items" on itinerary_items;
create policy "public read itinerary_items" on itinerary_items for select using (true);
drop policy if exists "auth write itinerary_items" on itinerary_items;
create policy "auth write itinerary_items" on itinerary_items for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'itinerary_items'
  ) then
    alter publication supabase_realtime add table itinerary_items;
  end if;
end $$;
