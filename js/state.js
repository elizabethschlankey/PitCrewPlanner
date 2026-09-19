/* ---------------------------------------------------------------
   STATE (fetched from Supabase, reshaped into the same in-memory
   shape the UI works with)
---------------------------------------------------------------- */
function clone(o){ return JSON.parse(JSON.stringify(o)); }
function todayISO(){ return new Date().toISOString().slice(0,10); }

// {url, type} for the setup ("What to Do") or teardown ("Wrap It Up")
// media on an items/template_items row. Falls back to the legacy
// teardown_video_url column (as a 'video') for clips uploaded before
// setup/teardown media were unified into *_media_url/*_media_type.
function mediaFromRow(row, prefix){
  if(row[prefix+'_media_url']) return {url: row[prefix+'_media_url'], type: row[prefix+'_media_type'] || 'video'};
  if(prefix==='teardown' && row.teardown_video_url) return {url: row.teardown_video_url, type: 'video'};
  return {url: null, type: null};
}

let STATE = {roster:[], events:[], activeEventId:null, badges:[], badgeEvents:[], eventVolunteerStatus:[], eventInactiveBadges:[], itemTypeNotes:{}, templates:[]};
let viewingEventId = null;
let editingTemplateId = null;
let session = null;
let mode = 'view';
let loaded = false;

/* ---------------------------------------------------------------
   STATE CACHE — the first paint on a repeat visit doesn't have to
   wait on a round trip to Supabase: the last successful loadState()
   result is stashed in localStorage, and boot.js renders straight
   from it (see hydrateFromCache()) before the real fetch even starts,
   then re-renders again once fresh data actually arrives. Realtime
   (see the subscription at the top of boot.js) keeps that fresh data
   in sync afterward same as always — this only speeds up the very
   first paint, it doesn't change anything about how up to date the
   app stays once it's open. Bump the key's "v1" suffix if STATE's
   shape ever changes incompatibly, so an old cached shape from before
   the change can't get loaded and crash rendering.
---------------------------------------------------------------- */
const STATE_CACHE_KEY = 'pcp-cached-state-v2'; // v2: events now carry an itinerary array too
function saveStateCache(){
  try{
    localStorage.setItem(STATE_CACHE_KEY, JSON.stringify({state: STATE, viewingEventId, savedAt: Date.now()}));
  }catch(e){} // private browsing / storage quota / disabled storage — cache is a nice-to-have, never fatal
}
function hydrateFromCache(){
  try{
    const raw = localStorage.getItem(STATE_CACHE_KEY);
    if(!raw) return false;
    const cached = JSON.parse(raw);
    if(!cached || !cached.state || !Array.isArray(cached.state.events) || !Array.isArray(cached.state.roster)) return false;
    STATE = cached.state;
    if(cached.viewingEventId) viewingEventId = cached.viewingEventId;
    loaded = true;
    return true;
  }catch(e){ return false; }
}

// ROLE — 'guest' (no login), 'lead_volunteer'/'director' (shared PIN,
// signed into one of the two internal accounts below), or 'admin' (the
// one real organizer login). Re-derived from `session` any time it
// changes (boot.js), never persisted separately — Supabase's own token
// storage is what survives a page reload.
let role = 'guest';
function roleForSession(sess){
  if(!sess) return 'guest';
  const email = (sess.user && sess.user.email || '').toLowerCase();
  const accounts = (window.SUPABASE_CONFIG || {}).roleAccounts || {};
  if(accounts.director && accounts.director.email && email === accounts.director.email.toLowerCase()) return 'director';
  if(accounts.lead_volunteer && accounts.lead_volunteer.email && email === accounts.lead_volunteer.email.toLowerCase()) return 'lead_volunteer';
  return 'admin';
}

function currentEvent(){
  return STATE.events.find(e=>e.id===viewingEventId) || STATE.events[0] || {id:null,name:'',date:'',items:[]};
}

function currentTemplate(){
  return STATE.templates.find(t=>t.id===editingTemplateId) || {id:null,name:'',description:'',items:[]};
}

// What to Do / Wrap It Up (text + media) is shared per equipment TYPE —
// edit it once, it's the same on every item of that type, in every
// event and template, going forward. Legacy type ids (see
// LEGACY_TYPE_ALIASES in catalog.js) resolve to the same shared record
// as their renamed equivalent, so old and new events agree.
// Falls back to the ITEM's own (pre-this-feature) notes/media when no
// shared record exists yet for its type — before the one-time backfill
// runs (see schema.sql), or if item_type_notes hasn't been migrated at
// all, this keeps every item showing exactly what it always showed
// instead of going blank.
function typeNotesFor(it){
  const row = STATE.itemTypeNotes[resolveTypeId(it.typeId)];
  if(row) return {
    notes: row.notes||'', teardownNotes: row.teardown_notes||'',
    setupMediaUrl: row.setup_media_url||null, setupMediaType: row.setup_media_type||null,
    teardownMediaUrl: row.teardown_media_url||null, teardownMediaType: row.teardown_media_type||null
  };
  return {
    notes: it.notes||'', teardownNotes: it.teardownNotes||'',
    setupMediaUrl: it.setupMediaUrl||null, setupMediaType: it.setupMediaType||null,
    teardownMediaUrl: it.teardownMediaUrl||null, teardownMediaType: it.teardownMediaType||null
  };
}

// Returns which items collection is currently being edited — a normal
// event's items, or (when editingTemplateId is set, i.e. the Admin
// screen has a template open) a template's items. Every item-CRUD call
// site reads this instead of hardcoding the `items` table/event_id, so
// the same field editor UI works for both without duplicating it.
function currentItemsCtx(){
  if(editingTemplateId){
    const t = currentTemplate();
    return {items: t.items, table: 'template_items', fk: 'template_id', ownerId: t.id};
  }
  const e = currentEvent();
  return {items: e.items, table: 'items', fk: 'event_id', ownerId: e.id};
}

async function loadState(){
  const [rosterRes, eventsRes, itemsRes, assignRes, badgesRes, badgeEventsRes, volStatusRes, templatesRes, templateItemsRes, inactiveBadgesRes, typeNotesRes, itineraryRes] = await Promise.all([
    sb.from('roster').select('*').order('created_at'),
    sb.from('events').select('*').order('created_at'),
    sb.from('items').select('*'),
    sb.from('item_assignments').select('*'),
    sb.from('badges').select('*').order('created_at'),
    sb.from('badge_events').select('*').order('created_at'),
    sb.from('event_volunteer_status').select('*'),
    sb.from('templates').select('*').order('created_at'),
    sb.from('template_items').select('*'),
    sb.from('event_inactive_badges').select('*'),
    sb.from('item_type_notes').select('*'),
    sb.from('itinerary_items').select('*').order('time_value', {nullsFirst:false}).order('created_at')
  ]);
  if(rosterRes.error || eventsRes.error || itemsRes.error || assignRes.error || badgesRes.error || badgeEventsRes.error || volStatusRes.error || templatesRes.error || templateItemsRes.error){
    statusEl.textContent = 'Load error — check config.js and your connection';
    console.error(rosterRes.error||eventsRes.error||itemsRes.error||assignRes.error||badgesRes.error||badgeEventsRes.error||volStatusRes.error||templatesRes.error||templateItemsRes.error);
    return false;
  }
  // event_inactive_badges / item_type_notes are checked separately, not
  // folded into the hard failure above — if either migration hasn't been
  // run yet, that feature should degrade (every badge active; every item
  // falls back to its own old per-item notes, see typeNotesFor above)
  // instead of blocking the whole app from loading
  if(inactiveBadgesRes.error) console.error(inactiveBadgesRes.error);
  if(typeNotesRes.error) console.error(typeNotesRes.error);
  if(itineraryRes.error) console.error(itineraryRes.error);
  const itineraryByEvent = {};
  if(!itineraryRes.error){
    itineraryRes.data.forEach(row=>{
      (itineraryByEvent[row.event_id] ||= []).push({
        uid: row.id, timeValue: row.time_value, label: row.label, notes: row.notes||''
      });
    });
  }
  const assigns = assignRes.data;
  const itemsByEvent = {};
  itemsRes.data.forEach(row=>{
    const setupMedia = mediaFromRow(row, 'setup');
    const teardownMedia = mediaFromRow(row, 'teardown');
    (itemsByEvent[row.event_id] ||= []).push({
      uid: row.id, typeId: row.type_id, label: row.label,
      xPct: Number(row.x_pct), yPct: Number(row.y_pct),
      needsHelp: row.needs_help, helpersNeeded: row.helpers_needed,
      notes: row.notes||'', timing: row.timing||'', studentName: row.student_name||'',
      teardownNotes: row.teardown_notes||'', teardownVideoUrl: row.teardown_video_url||null,
      setupMediaUrl: setupMedia.url, setupMediaType: setupMedia.type,
      teardownMediaUrl: teardownMedia.url, teardownMediaType: teardownMedia.type,
      assignedIds: assigns.filter(a=>a.item_id===row.id).map(a=>a.volunteer_id),
      // anchored = a volunteer who reliably runs this spot every game —
      // "Clear Volunteers" skips these instead of unassigning them
      anchoredIds: assigns.filter(a=>a.item_id===row.id && a.anchored).map(a=>a.volunteer_id)
    });
  });
  const itemsByTemplate = {};
  templateItemsRes.data.forEach(row=>{
    const setupMedia = mediaFromRow(row, 'setup');
    const teardownMedia = mediaFromRow(row, 'teardown');
    (itemsByTemplate[row.template_id] ||= []).push({
      uid: row.id, typeId: row.type_id, label: row.label,
      xPct: Number(row.x_pct), yPct: Number(row.y_pct),
      needsHelp: row.needs_help, helpersNeeded: row.helpers_needed,
      notes: row.notes||'', timing: row.timing||'', studentName: row.student_name||'',
      teardownNotes: row.teardown_notes||'', teardownVideoUrl: row.teardown_video_url||null,
      setupMediaUrl: setupMedia.url, setupMediaType: setupMedia.type,
      teardownMediaUrl: teardownMedia.url, teardownMediaType: teardownMedia.type,
      assignedIds: []
    });
  });
  STATE = {
    roster: rosterRes.data.map(r=>({id:r.id, name:r.name, role:r.role||'', description:r.description||''})),
    events: eventsRes.data.map(e=>({id:e.id, name:e.name, date:e.date||'', templateId: e.template_id||null, eventType: e.event_type||'', items: itemsByEvent[e.id]||[], itinerary: itineraryByEvent[e.id]||[]})),
    activeEventId: (eventsRes.data.find(e=>e.is_current) || eventsRes.data[0] || {}).id || null,
    badges: badgesRes.data,
    badgeEvents: badgeEventsRes.data,
    eventVolunteerStatus: volStatusRes.data,
    eventInactiveBadges: inactiveBadgesRes.error ? [] : inactiveBadgesRes.data,
    itemTypeNotes: typeNotesRes.error ? {} : Object.fromEntries(typeNotesRes.data.map(r=>[r.type_id, r])),
    templates: templatesRes.data.map(t=>({id:t.id, name:t.name, description:t.description||'', items: itemsByTemplate[t.id]||[]}))
  };
  if(!STATE.events.find(e=>e.id===viewingEventId)) viewingEventId = STATE.activeEventId || (STATE.events[0]||{}).id;
  if(editingTemplateId && !STATE.templates.find(t=>t.id===editingTemplateId)) editingTemplateId = null;
  loaded = true;
  saveStateCache();
  return true;
}

async function reload(){
  await loadState();
  renderAll();
}

async function db(promise, label){
  statusEl.textContent = 'Saving…';
  try{
    const {error} = await promise;
    if(error){
      statusEl.textContent = 'Error: '+error.message;
      console.error(label, error);
      return false;
    }
    await reload();
    statusEl.textContent = 'All changes saved';
    return true;
  }catch(err){
    // a network failure (offline, blocked request, bad URL/key in
    // config.js) rejects instead of returning {error} — without this,
    // that silently killed the save with no visible sign anything failed
    statusEl.textContent = 'Connection error — check your internet or config.js';
    console.error(label, err);
    return false;
  }
}

/* ---------------------------------------------------------------
   MODE / AUTH
---------------------------------------------------------------- */
function setMode(next){
  if(next==='edit' && role!=='director' && role!=='admin') return;
  const enteringEdit = next==='edit' && mode!=='edit';
  mode = next;
  document.body.classList.toggle('mode-edit', mode==='edit');
  renderAll();
  // default the palette to Badges every time Edit Mode is entered —
  // Equipment/Instruments placement is usually locked in for the season,
  // Badges is the thing that actually needs attention at each event.
  // Only fires on the view->edit transition, not every re-render, so it
  // doesn't fight anyone who deliberately switches to Equipment mid-session.
  if(enteringEdit){
    const badgesTabBtn = document.querySelector('.tab-btn[data-tab="badges"]');
    if(badgesTabBtn) badgesTabBtn.click();
  }
}

const btnModeToggle = document.getElementById('btn-mode-toggle');
btnModeToggle.addEventListener('click', ()=>{
  if(mode==='edit'){ setMode('view'); return; }
  if(role==='director' || role==='admin'){ setMode('edit'); return; }
  openLogin();
});
document.getElementById('btn-signout').addEventListener('click', async ()=>{
  await sb.auth.signOut();
});

/* ---------------------------------------------------------------
   LOGIN OVERLAY — one shared overlay for all three logins: Admin
   (email/password, unchanged) and Director/Lead Volunteer (a shared
   PIN). Picking Director or Lead Volunteer verifies the PIN server-side
   first (never sends it anywhere as plain text beyond that RPC call),
   then signs the browser into that role's internal Supabase Auth
   account — see roleForSession() above and README.md for why.
---------------------------------------------------------------- */
const loginOverlay = document.getElementById('login-overlay');
const loginError = document.getElementById('login-error');
const loginPinError = document.getElementById('login-pin-error');
const loginAdminForm = document.getElementById('login-admin-form');
const loginPinForm = document.getElementById('login-pin-form');
let loginRole = 'admin';

function setLoginRole(next){
  loginRole = next;
  document.querySelectorAll('[data-login-role]').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.loginRole===next);
  });
  loginAdminForm.style.display = next==='admin' ? '' : 'none';
  loginPinForm.style.display = next==='admin' ? 'none' : '';
  loginError.textContent = '';
  loginPinError.textContent = '';
  if(next==='admin') document.getElementById('login-email').focus();
  else document.getElementById('login-pin').focus();
}
document.querySelectorAll('[data-login-role]').forEach(btn=>{
  btn.addEventListener('click', ()=>setLoginRole(btn.dataset.loginRole));
});

function openLogin(){
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-pin').value = '';
  setLoginRole('admin');
  loginOverlay.style.display = 'flex';
}
document.getElementById('login-cancel').addEventListener('click', ()=>loginOverlay.style.display='none');
document.getElementById('login-cancel-pin').addEventListener('click', ()=>loginOverlay.style.display='none');
document.getElementById('login-submit').addEventListener('click', async ()=>{
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if(!email || !password){ loginError.textContent = 'Enter your email and password.'; return; }
  loginError.textContent = 'Signing in…';
  const {error} = await sb.auth.signInWithPassword({email, password});
  if(error){ loginError.textContent = error.message; return; }
  loginOverlay.style.display = 'none';
  setMode('edit');
});
document.getElementById('login-pin-submit').addEventListener('click', async ()=>{
  const pin = document.getElementById('login-pin').value.trim();
  const account = ((window.SUPABASE_CONFIG||{}).roleAccounts||{})[loginRole];
  if(!account || !account.email || !account.password){
    loginPinError.textContent = 'Setup incomplete — ask your Admin to finish config.js.';
    return;
  }
  if(!pin){ loginPinError.textContent = 'Enter the PIN.'; return; }
  loginPinError.textContent = 'Checking…';
  const {data: ok, error} = await sb.rpc('verify_role_pin', {p_role: loginRole, p_pin: pin});
  if(error){ loginPinError.textContent = error.message; return; }
  if(!ok){ loginPinError.textContent = 'Incorrect PIN.'; return; }
  const {error: signInErr} = await sb.auth.signInWithPassword(account);
  if(signInErr){ loginPinError.textContent = signInErr.message; return; }
  loginOverlay.style.display = 'none';
  // role/session update via the onAuthStateChange listener in boot.js —
  // one source of truth, no manual assignment here.
});

/* ---------------------------------------------------------------
   IDLE AUTO-LOCK — Director/Lead Volunteer only (a shared PIN on a
   phone left on a table is a real risk in a way Admin's own password
   session isn't; Admin's session lifecycle is unchanged/out of scope
   here). Any tap/click/key resets a ~5 minute timer; on expiry, sign
   out — identical to clicking "Lock" by hand.
---------------------------------------------------------------- */
const IDLE_LOCK_MS = 5 * 60 * 1000;
let idleLockTimer = null;
function resetIdleLockTimer(){
  if(idleLockTimer) clearTimeout(idleLockTimer);
  if(role!=='director' && role!=='lead_volunteer') return;
  idleLockTimer = setTimeout(()=>{ sb.auth.signOut(); }, IDLE_LOCK_MS);
}
['pointerdown','keydown','touchstart'].forEach(evt=>{
  document.addEventListener(evt, resetIdleLockTimer, {passive:true});
});

// the sb.auth.onAuthStateChange(...) LISTENER ITSELF is registered from
// boot.js, not here — Supabase can fire it almost immediately (often via
// a microtask, before the browser has even started loading the NEXT
// <script> tag), and its callback calls renderHeader(), which doesn't
// exist yet this early — that used to throw "renderHeader is not
// defined" in a real browser. Registering it only after every other
// file (including render.js) has loaded avoids the race entirely.

