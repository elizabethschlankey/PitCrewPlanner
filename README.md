# Field Setup Planner — standalone Supabase version

A self-hosted twin of the Claude Artifact planner, backed by a real database
so you can export/report on it and, later, let other tools read the data.
You edit; anyone with the link can view — enforced by the database itself,
not by who has which URL.

## Project files

Still a static site at runtime — no server, and you can still open
`index.html` straight from disk to test it. The one piece of light tooling
is `build.js`, which stitches the page's markup together from small files
so no single one is 500+ lines:

```
index.template.html   the page skeleton — <head> + <!-- include: x.html --> markers
partials/              the markup itself, one section per file (header,
                        event-bar, admin-screen, overlay-inspector, ...)
build.js               stitches index.template.html + partials/*.html into
                        index.html — no dependencies, just string concatenation
index.html             GENERATED — don't hand-edit; `node build.js` overwrites it
css/styles.css       every style in the app
js/
  supabase-client.js  wires up the Supabase client from config.js
  catalog.js          equipment/instrument definitions and their icons
  state.js            in-memory STATE, loading/saving, mode/login & roles
  field.js             the SVG field drawing, pit-box zoom, pinch-to-zoom
  render.js            renders the palette/field/roster/assignments lists
  admin.js              event + template + crew-roster + Access (PINs) management
  badges.js             badge check-in/check-out
  drag-drop.js           dragging items from the palette onto the field
  inspector.js            the per-item modal (Placement/What to Do/Assignment/Wrap It Up)
  toolbar.js               Clear Items, Export PNG, Export Season Data
  boot.js                  realtime subscriptions + app startup
config.js            your Supabase project URL/key/role logins (edit this one, step 5 below)
schema.sql           the database schema to run in Supabase's SQL Editor
```

**To change the page markup:** edit the relevant file under `partials/`
(or `index.template.html` for `<head>`/overall page order), then run
`node build.js` to regenerate `index.html`. Requires Node.js, but nothing
gets installed (`build.js` has zero dependencies) and nothing changes about
how the app runs — `index.html` it produces is a normal static file, openable
straight from disk, with the exact same markup as before, just no longer
hand-written as one 500-line file.

The `js/` files load in that order via plain `<script src>` tags (no
bundler, no modules) and share one global scope, same as the single big
`<script>` block they used to be — just split by what each part does, so
finding and changing one thing doesn't mean scrolling through everything
else. Deploying still means dragging the *whole folder* onto Netlify (run
`node build.js` first if you touched any `partials/` file), not just
`index.html` — see step 6.

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up (free tier is fine).
2. **New project** → give it a name (e.g. `pit-crew-planner`), set a database
   password (store it in a password manager — you won't need it day to day),
   pick a region near you, and create it. Provisioning takes a minute or two.

## 2. Create the tables

1. In your project, open **SQL Editor** → **New query**.
2. Paste in the entire contents of [`schema.sql`](schema.sql) and click **Run**.
   This creates the `roster`, `events`, `items`, `item_assignments`,
   `badges`, `badge_events`, `event_volunteer_status`, `templates`, and
   `template_items` tables, sets up the public-read/you-only-write
   security rules, turns on realtime sync, and seeds one starter event.

   `templates`/`template_items` back the **Admin → Templates** screen —
   reusable starting layouts (Football, BOA Comp, UIL Comp, ...) you can
   optionally stamp a new event from instead of starting blank.

   If you already ran `schema.sql` once for an earlier version of this
   app, don't re-run the whole file (it'll error on tables that already
   exist) — just run the new block below in the SQL Editor instead:
   ```sql
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
   ```

   One more block if you're catching up from an earlier version — adds
   the column that lets an event remember which template it follows (for
   **Switch Template**, see "Using it" below):
   ```sql
   alter table events add column if not exists template_id uuid references templates(id) on delete set null;
   ```

   And one more if you're catching up — adds the column behind "anchored"
   helpers (see **Clear Volunteers** in "Using it" below):
   ```sql
   alter table item_assignments add column if not exists anchored boolean not null default false;
   ```

   Last one — lets "What to Do" carry a clip or photo the same way "Wrap
   It Up" already could (see "Using it" below):
   ```sql
   alter table items add column if not exists setup_media_url text;
   alter table items add column if not exists setup_media_type text check (setup_media_type in ('video','photo'));
   alter table items add column if not exists teardown_media_url text;
   alter table items add column if not exists teardown_media_type text check (teardown_media_type in ('video','photo'));

   alter table template_items add column if not exists setup_media_url text;
   alter table template_items add column if not exists setup_media_type text check (setup_media_type in ('video','photo'));
   alter table template_items add column if not exists teardown_media_url text;
   alter table template_items add column if not exists teardown_media_type text check (teardown_media_type in ('video','photo'));

   insert into storage.buckets (id, name, public)
     values ('item-media', 'item-media', true)
     on conflict (id) do nothing;

   create policy "public read item media" on storage.objects
     for select using (bucket_id = 'item-media');
   create policy "auth upload item media" on storage.objects
     for insert with check (bucket_id = 'item-media' and auth.role() = 'authenticated');
   create policy "auth delete item media" on storage.objects
     for delete using (bucket_id = 'item-media' and auth.role() = 'authenticated');
   ```

   And one more — adds role-tiered access (Director/Lead Volunteer PINs
   on top of your own login; see **4. Set up Director/Lead Volunteer PIN
   access** and "Using it" below). `app_access` deliberately has **no**
   read/write policies at all — it can't be queried directly over the
   API by anyone, admin or otherwise; the two functions below are the
   only way in, and never expose the stored PIN hash back to the client:
   ```sql
   create table app_access (
     role       text primary key check (role in ('director','lead_volunteer')),
     pin_hash   text not null,
     updated_at timestamptz not null default now()
   );
   alter table app_access enable row level security;

   create or replace function verify_role_pin(p_role text, p_pin text)
   returns boolean language plpgsql security definer set search_path = public as $$
   declare found_hash text;
   begin
     if p_role not in ('director','lead_volunteer') then return false; end if;
     select pin_hash into found_hash from app_access where role = p_role;
     if found_hash is null then return false; end if;
     return found_hash = crypt(p_pin, found_hash);
   end; $$;

   create or replace function set_role_pin(p_role text, p_pin text)
   returns void language plpgsql security definer set search_path = public as $$
   begin
     if auth.role() <> 'authenticated' then return; end if;
     if p_role not in ('director','lead_volunteer') then raise exception 'invalid role %', p_role; end if;
     if p_pin is null or length(p_pin) < 4 then raise exception 'PIN must be at least 4 characters'; end if;
     insert into app_access (role, pin_hash, updated_at)
     values (p_role, crypt(p_pin, gen_salt('bf')), now())
     on conflict (role) do update set pin_hash = excluded.pin_hash, updated_at = now();
   end; $$;

   revoke execute on function set_role_pin(text, text) from anon;
   grant execute on function verify_role_pin(text, text) to anon, authenticated;
   grant execute on function set_role_pin(text, text) to authenticated;
   ```

## 3. Create your login (and only yours)

1. Go to **Authentication → Users → Add user** and create yourself an
   account with your own email + a password. This is the *only* login the
   app will ever use — there's no "sign up" flow in the app itself.
2. Go to **Authentication → Providers → Email** and turn **off** "Allow new
   users to sign up." This makes sure nobody else can ever create an editor
   account, even if they found the login form.

## 4. Set up Director/Lead Volunteer PIN access

The app has two lighter-weight logins below your own (see **Using it**
below for what each can do), each unlocked by a shared PIN instead of an
email/password. Under the hood, a correct PIN silently signs the browser
into one of two internal, non-personal accounts — this is what lets
Director and Lead Volunteer write to the database at all under the
policies from step 2, without weakening them for anyone else.

1. **Authentication → Users → Add user**, twice — check **Auto Confirm
   User** both times, and use a long, random, generated password for each
   (nobody ever types these; a password manager's generator is fine):
   - `director@pitcrew.internal`
   - `lead-volunteer@pitcrew.internal`

   (Any email domain works — these aren't real inboxes. Keep them
   distinct from your own login and from each other.)
2. Open [`config.js`](config.js) and fill in `roleAccounts` with those two
   accounts' emails and passwords (see step 5 below for the full file).
3. Deploy/reload the app, sign in with **your own** Admin login, open
   **Admin → Access**, and set an actual Director PIN and Lead Volunteer
   PIN. Nobody can sign in as either role until you do this — a PIN that
   was never set is always rejected.

**Note on how much this actually protects:** `roleAccounts`' passwords
sit in `config.js` — a file every visitor's browser downloads, exactly
like the `anonKey` above. They're not a real secret; the PIN, checked
server-side before either password is ever used, is the actual gate a
person faces day to day. Under this design, Director and Lead Volunteer
end up with the *same database write permission* your own login has —
Postgres's row-level security doesn't distinguish between them, only the
app's UI and the PIN do. That's an intentional, simpler trade-off for
now; a Director or Lead Volunteer session is exactly as trusted as yours
once they're signed in, so treat both PINs like a door code, not a
password, and change one if it's ever shared more widely than intended
(**Admin → Access** any time).

## 5. Connect the app to your project

1. Go to **Project Settings → API**.
2. Copy the **Project URL** and the **`anon` `public`** key (not
   `service_role` — that one must never appear in client code).
3. Open [`config.js`](config.js) and paste them in, along with the two
   internal accounts from step 4:
   ```js
   window.SUPABASE_CONFIG = {
     url: 'https://your-project-ref.supabase.co',
     anonKey: 'eyJ...',
     roleAccounts: {
       director:       { email: 'director@pitcrew.internal',      password: '...' },
       lead_volunteer: { email: 'lead-volunteer@pitcrew.internal', password: '...' }
     }
   };
   ```
   Leaving `roleAccounts`' emails blank is fine to start — the Director/
   Lead Volunteer login tabs will just show "Setup incomplete" until you
   fill them in.

## 6. Deploy to Netlify

Simplest path (no git needed): go to [app.netlify.com/drop](https://app.netlify.com/drop)
and drag this whole project folder onto the page. Netlify gives you a live
URL immediately, and you can rename the site (Site settings → Change site
name) to something memorable.

If you'd rather deploy from git: push this folder to a repo, then in
Netlify choose **Add new site → Import an existing project**, point it at
the repo, leave the build command blank, and leave the publish directory
as `.` (the repo root).

Either way — no build step, no environment variables to set in Netlify;
everything the app needs is in `config.js`.

> **Before you drag the folder:** if `field-setup-planner.html` is still
> sitting in this folder (an old, unused file from an earlier version),
> delete it first so it doesn't get deployed alongside the real app.

### Caching, and pushing out a change

The `_headers` file tells Netlify to let browsers cache `js/*` and `css/*`
for a full year — repeat visits load those instantly from the browser's
own cache instead of re-downloading them. `index.html`, `version.json`,
and `config.js` stay short-lived, so every visit still picks up whichever
version is actually live.

That long caching is only safe because of `build.js`: every local
`<script>`/`<link>` tag gets a `?v=<ASSET_VERSION>` query string baked
in, and the browser treats a changed query string as a completely
different file to fetch. So:

- **Small day-to-day edits** (tweaking a color, fixing a typo): just run
  `node build.js` and redeploy as usual — no version bump needed.
- **A change you want everyone to get right away**, including anyone
  with the app already open on their phone mid-event: open `build.js`,
  bump the `ASSET_VERSION` string near the top (any string works — a
  date is easiest), then run `node build.js` and redeploy. New visits
  pick it up immediately; tabs that are already open will show a small
  "A newer version is available — Refresh" banner within about 10
  minutes (or as soon as someone switches back to that tab), instead of
  silently running stale code with no way to notice.

The app also caches the last data it loaded from Supabase in the
browser's local storage, so re-opening it shows your last-known event
right away instead of a blank/"Loading…" screen — then quietly checks
for anything newer in the background. You don't need to do anything for
this part; it's automatic.

## 7. Using it

- The page opens in **volunteer view**: read-only, shows the field, the
  current event, and the "Needs a Hand" list. No login needed for this.
- Click **Sign In** (top right) to unlock more, at one of three levels —
  each is a strict superset of the one before it:
  - **Lead Volunteer** (shared PIN) — everything volunteer view has,
    plus badge check-in/out. No editing, no Admin screen. A good level
    to hand a parent running check-in on game day without giving them
    anything they could accidentally move or delete.
  - **Director** (shared PIN) — full editing: palette, field layout,
    assignments, roster, templates, event management, Clear Items/
    Clear Volunteers, the field lock. Everything below except Access.
  - **Admin** (the email/password login from step 3) — everything
    Director has, plus **Admin → Access** to set/change the two PINs.
  - Director and Lead Volunteer auto-lock after about 5 minutes idle
    (any tap/click/key resets the timer) — useful for a phone left on a
    table mid-game. **Lock** (top right, replaces Sign Out for these two
    roles) locks immediately by hand; signing back in always goes
    through the PIN pad again.
- **Admin** (top right, once signed in as Director or Admin) opens a
  separate screen for Templates and the Crew Roster (plus **Access**,
  Admin only). A template is a reusable starting
  layout — build it once (drag items onto it exactly like an event) and
  pick it from the "New Event" form's template dropdown to stamp a fresh
  event from it, instead of starting blank. Only the layout carries over
  — helper assignments never do, since a template isn't tied to real
  volunteers. Admin's Equipment/Instruments palette always shows the
  full catalog, whichever template you're building — templates don't
  restrict what you can drag onto them.
- **⇄ Switch Template** (in the event bar, once signed in) changes which
  template an event follows — the pill next to the event dropdown shows
  the current one, or "No Template." Switching *adds* the newly-picked
  template's items to the field alongside whatever's already there; it
  never deletes anything, even if the event already had a different
  template's items on it — use **Clear Items** first if you actually
  want a clean slate. Picking the template the event is already on
  again is a no-op (it won't double up the items).
- **📌 Anchor a helper** by clicking the pin next to their name in Needs
  a Hand — for the reliable volunteer who runs the same station every
  game and doesn't need re-assigning each week. Then **Clear Volunteers**
  (button next to the Needs a Hand header) unassigns everyone *except*
  anchored helpers, so you can reset for a new game without losing the
  people who are always there. Volunteers see the pin too (read-only),
  so it's clear who's already covered.
- **What to Do** and **Wrap It Up** can each carry a short video clip or
  a still photo (Record/Take Photo, or Choose Existing — same either
  way) — a picture of the right cable connection is often faster to
  understand than a sentence. Both are copied along whenever a template
  is applied to an event (New Event from a template, or Switch
  Template), so update the template once and every future event built
  from it already has the right instructions and media.
- **Sign Out**/**Lock** (top right, whichever role you're in) any time to
  drop back to the public view. Volunteers never see the login form do
  anything but ask for credentials/a PIN — they can't get into edit mode
  or badges without one of the three.
- **Export Season Data** produces a CSV of every event's items, positions,
  help-tags, assigned volunteers, and notes — open it in Sheets/Excel for
  reporting, or pull it into another tool.

## Updating the app later

If you ask Claude to change this planner again, it'll edit whichever file
under `index.html`/`css/`/`js/` actually owns that part of the app (see
**Project files** above). Re-deploy by dragging the whole folder onto
Netlify Drop again (same site, if you drop it onto the existing site's
page instead of the general drop page — or just re-import if using git).
