/* ---------------------------------------------------------------
   BADGE CHECK-IN / CHECK-OUT
---------------------------------------------------------------- */
// a badge's current status = its most recent event; no events, or the
// most recent one being a check-in, means it's available
function badgeStatus(badgeId){
  const events = STATE.badgeEvents
    .filter(e=>e.badge_id===badgeId)
    .slice()
    .sort((a,b)=> new Date(b.created_at) - new Date(a.created_at));
  const latest = events[0];
  if(!latest || latest.action==='checkin') return {out:false};
  return {out:true, event:latest};
}

// roster ids currently holding some badge — excluded from the "Who's
// taking it?" picker on every OTHER badge, so nobody double-holds
function volunteersWithBadgeOut(){
  const ids = new Set();
  STATE.badges.forEach(b=>{
    const st = badgeStatus(b.id);
    if(st.out && st.event.volunteer_id) ids.add(st.event.volunteer_id);
  });
  return ids;
}

// every badge whose most recent event is a checkout — i.e. still out
// there with someone right now
function badgesCurrentlyOut(){
  return STATE.badges.filter(b=>badgeStatus(b.id).out);
}

// per-event, per-badge "on hand or not" — badges themselves are
// season-wide (see badgeStatus above); this is purely which of them you
// actually brought to THIS event. No row = active (the default).
function isBadgeActiveForEvent(badgeId, eventId){
  return !STATE.eventInactiveBadges.some(r=>r.event_id===eventId && r.badge_id===badgeId);
}
async function toggleBadgeActiveForEvent(badgeId){
  const eventId = currentEvent().id;
  if(isBadgeActiveForEvent(badgeId, eventId)){
    await db(sb.from('event_inactive_badges').insert({event_id:eventId, badge_id:badgeId}), 'mark badge not on hand');
  }else{
    await db(sb.from('event_inactive_badges').delete().eq('event_id',eventId).eq('badge_id',badgeId), 'mark badge on hand');
  }
}

function badgeRowHTML(b, active){
  const st = badgeStatus(b.id);
  const unknown = st.out && !st.event.volunteer_id;
  const accent = unknown ? 'var(--danger)' : (st.out ? 'var(--help)' : 'var(--good)');
  return `
    <div class="roster-row${unknown ? ' badge-alert' : ''}${active ? '' : ' badge-inactive'}" data-open-badge="${b.id}">
      <div class="avatar" style="background:${accent};font-size:9px;">${st.out?'OUT':'IN'}</div>
      <div class="info">
        <div class="name">${b.label}</div>
        <div class="role" style="color:${accent};">${st.out ? 'Out — '+st.event.volunteer_name_snapshot : 'Available'}</div>
      </div>
      <label class="switch" title="On hand for this event" data-badge-active-toggle="${b.id}">
        <input type="checkbox" ${active ? 'checked' : ''}>
        <span class="track"></span>
        <span class="knob"></span>
      </label>
    </div>`;
}

function renderBadges(){
  const list = document.getElementById('badge-list');
  const checkInAllBtn = document.getElementById('badge-checkin-all-btn');
  if(checkInAllBtn){
    const outCount = badgesCurrentlyOut().length;
    checkInAllBtn.style.display = outCount ? 'inline-block' : 'none';
    document.getElementById('badge-checkin-all-count').textContent = outCount;
  }
  if(!STATE.badges.length){
    list.innerHTML = `<div class="roster-empty">No badges yet. Add one below.</div>`;
    return;
  }
  // fixed order (not grouped active-first/inactive-last) so flipping a
  // switch dims that row in place instead of relocating it to a
  // different group — regrouping on every toggle was reflowing the
  // whole list and made the screen feel like it jumped
  const eventId = currentEvent().id;
  list.innerHTML = STATE.badges.map(b=>badgeRowHTML(b, isBadgeActiveForEvent(b.id, eventId))).join('');
}

document.getElementById('badge-add-btn').addEventListener('click', async ()=>{
  const input = document.getElementById('badge-label');
  const errorEl = document.getElementById('badge-label-error');
  errorEl.textContent = '';
  const label = input.value.trim();
  if(!label) return;
  const dup = STATE.badges.some(b=>b.label.trim().toLowerCase()===label.toLowerCase());
  if(dup){
    errorEl.textContent = `A badge named "${label}" already exists.`;
    return;
  }
  const ok = await db(sb.from('badges').insert({label}), 'add badge');
  if(ok) input.value = '';
});

// "Check In All" — bulk-return every badge that's currently checked
// out, for the end of an event when going around to check each one in
// individually (with its own return photo) isn't worth the time. No
// photo attached — there's no way to snap N individual return photos
// in one bulk action — so anyone who wants a photo on file for a
// specific badge should still check that one in on its own instead.
document.getElementById('badge-checkin-all-btn').addEventListener('click', ()=>{
  const out = badgesCurrentlyOut();
  if(!out.length) return;
  openConfirm(
    `Check in all ${out.length} badge${out.length===1?'':'s'} currently checked out? This assumes everyone actually returned theirs — check an individual badge in from its own card instead if you want a return photo on file.`,
    async ()=>{
      const rows = out.map(b=>{
        const st = badgeStatus(b.id);
        return {
          badge_id: b.id, volunteer_id: st.event.volunteer_id,
          volunteer_name_snapshot: st.event.volunteer_name_snapshot,
          action: 'checkin', photo_url: null
        };
      });
      await db(sb.from('badge_events').insert(rows), 'bulk badge check-in');
    }
  );
});

document.getElementById('badge-list').addEventListener('click', e=>{
  // the on-hand switch lives inside the row it toggles — handle it first
  // and stop there, or clicking it would also open the badge modal
  const toggle = e.target.closest('[data-badge-active-toggle]');
  if(toggle){ toggleBadgeActiveForEvent(toggle.dataset.badgeActiveToggle); return; }
  const row = e.target.closest('[data-open-badge]');
  if(row) openBadgeModal(row.dataset.openBadge);
});

let openBadgeId = null;
function openBadgeModal(id){
  if(!STATE.badges.find(b=>b.id===id)) return;
  openBadgeId = id;
  renderBadgeModalBody();
  document.getElementById('badge-overlay').style.display = 'flex';
}
function closeBadgeModal(){
  document.getElementById('badge-overlay').style.display = 'none';
  openBadgeId = null;
}
document.getElementById('badge-close').addEventListener('click', closeBadgeModal);
document.getElementById('badge-delete').addEventListener('click', ()=>{
  const b = STATE.badges.find(x=>x.id===openBadgeId);
  if(!b) return;
  openConfirm(`Delete "${b.label}" and its entire history? This can't be undone.`, async ()=>{
    closeBadgeModal();
    await db(sb.from('badges').delete().eq('id', b.id), 'delete badge');
  });
});

function renderBadgeModalBody(){
  const b = STATE.badges.find(x=>x.id===openBadgeId);
  if(!b){ closeBadgeModal(); return; }
  document.getElementById('badge-title').textContent = b.label;

  const st = badgeStatus(b.id);
  const statusLine = document.getElementById('badge-status-line');
  const photoEl = document.getElementById('badge-status-photo');
  if(st.out){
    const unknown = !st.event.volunteer_id;
    const nameHTML = unknown
      ? `<strong style="color:var(--danger);">Unknown</strong>`
      : `<strong>${st.event.volunteer_name_snapshot}</strong>`;
    statusLine.innerHTML = `Checked out to ${nameHTML} — ${new Date(st.event.created_at).toLocaleString()}`;
  }else{
    statusLine.textContent = 'Available';
  }
  if(st.out && st.event.photo_url){
    photoEl.src = st.event.photo_url;
    photoEl.style.display = 'block';
  }else{
    photoEl.style.display = 'none';
  }

  const CAMERA_ICON = `<svg viewBox="0 0 24 24" fill="none"><path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.6" stroke="currentColor" stroke-width="1.6"/></svg>`;
  const LIBRARY_ICON = `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="15" rx="1.6" stroke="currentColor" stroke-width="1.6"/><circle cx="8" cy="9.5" r="1.6" stroke="currentColor" stroke-width="1.6"/><path d="M4 16l5-5 3.5 3.5L16 11l4 5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
  const photoFieldHTML = `
      <div class="photo-capture">
        <button type="button" id="badge-photo-btn" class="photo-btn">${CAMERA_ICON}<span id="badge-photo-btn-label">Take Photo</span></button>
        <button type="button" id="badge-library-btn" class="photo-btn ghost">${LIBRARY_ICON}<span>Choose Existing</span></button>
        <img id="badge-photo-preview" class="photo-preview">
        <input type="file" accept="image/*" capture="environment" id="badge-photo-input" style="display:none;">
        <input type="file" accept="image/*" id="badge-library-input" style="display:none;">
      </div>`;

  const formEl = document.getElementById('badge-action-form');
  if(st.out){
    formEl.innerHTML = `
      <div class="field-group">
        <label>Return Photo (optional)</label>
        ${photoFieldHTML}
      </div>
      <button id="badge-action-btn" class="primary" type="button">Check In</button>`;
  }else{
    // a volunteer already holding a different badge can't also be
    // picked here — one badge per person at a time
    const takenIds = volunteersWithBadgeOut();
    const availableVols = STATE.roster.filter(v=>!takenIds.has(v.id));
    const takenNote = STATE.roster.length && !availableVols.length
      ? `<div class="no-roster-note">Everyone on your roster already has a different badge out.</div>` : '';
    const rosterOptions = availableVols.map(v=>`<option value="${v.id}">${v.name}</option>`).join('');
    formEl.innerHTML = `
      <div class="field-group">
        <label>Who's taking it?</label>
        <select id="badge-volunteer-select">
          <option value="">— Unknown —</option>
          ${rosterOptions}
        </select>
        ${takenNote}
      </div>
      <div class="field-group">
        <label>Photo (badge + person)</label>
        ${photoFieldHTML}
      </div>
      <div class="inline-error" id="badge-checkout-error"></div>
      <button id="badge-action-btn" class="primary" type="button">Check Out</button>`;
  }
  const actionBtn = document.getElementById('badge-action-btn');
  if(actionBtn) actionBtn.addEventListener('click', handleBadgeAction);
  wireBadgePhotoCapture();

  const events = STATE.badgeEvents
    .filter(e=>e.badge_id===b.id)
    .slice()
    .sort((a,b2)=> new Date(b2.created_at) - new Date(a.created_at));
  const historyEl = document.getElementById('badge-history');
  historyEl.innerHTML = events.length ? events.map(e=>`
    <div style="display:flex;gap:10px;align-items:center;background:var(--panel-2);border:1px solid var(--panel-edge);border-radius:8px;padding:8px;">
      ${e.photo_url
        ? `<img src="${e.photo_url}" style="width:44px;height:44px;object-fit:cover;border-radius:6px;flex:none;">`
        : `<div style="width:44px;height:44px;border-radius:6px;background:var(--panel-edge);flex:none;"></div>`}
      <div style="min-width:0;">
        <div style="font-size:12.5px;font-weight:700;">${e.action==='checkout'?'Checked out to':'Checked in — was with'} ${e.volunteer_name_snapshot||'—'}</div>
        <div style="font-size:11px;color:var(--text-lo);">${new Date(e.created_at).toLocaleString()}</div>
      </div>
    </div>`).join('') : `<div class="roster-empty">No history yet.</div>`;
}

// styled camera button + live thumbnail, standing in for the raw file
// input — clicking it still opens the phone's camera (via the hidden
// input's capture attribute), just with a nicer button and a preview
// of the shot before you submit. A second "Choose Existing" input (no
// capture attribute) opens the normal photo library instead, for when
// the photo was already taken earlier. Either one feeds the same
// preview and the same file used at submit time.
let badgeSelectedPhotoFile = null;
function wireBadgePhotoCapture(){
  const btn = document.getElementById('badge-photo-btn');
  const input = document.getElementById('badge-photo-input');
  const libBtn = document.getElementById('badge-library-btn');
  const libInput = document.getElementById('badge-library-input');
  const preview = document.getElementById('badge-photo-preview');
  const label = document.getElementById('badge-photo-btn-label');
  badgeSelectedPhotoFile = null;
  if(!btn || !input) return;
  function useFile(file){
    if(!file) return;
    badgeSelectedPhotoFile = file;
    preview.src = URL.createObjectURL(file);
    preview.style.display = 'block';
    label.textContent = 'Retake Photo';
  }
  btn.addEventListener('click', ()=> input.click());
  input.addEventListener('change', ()=> useFile(input.files[0]));
  if(libBtn && libInput){
    libBtn.addEventListener('click', ()=> libInput.click());
    libInput.addEventListener('change', ()=> useFile(libInput.files[0]));
  }
}

async function handleBadgeAction(){
  const b = STATE.badges.find(x=>x.id===openBadgeId);
  if(!b) return;
  const st = badgeStatus(b.id);
  const actionBtn = document.getElementById('badge-action-btn');
  const errorEl = document.getElementById('badge-checkout-error');
  if(errorEl) errorEl.textContent = '';

  // resolve who's taking it BEFORE uploading a photo, so a validation
  // failure doesn't leave an orphaned upload behind
  let volunteerId = null, volunteerLabel = 'Unknown';
  if(!st.out){
    const select = document.getElementById('badge-volunteer-select');
    const selectedId = select ? select.value : '';
    if(selectedId){
      const v = STATE.roster.find(r=>r.id===selectedId);
      if(!v) return;
      // defensive re-check — guards against another tab/device taking
      // this person for a different badge between render and this click
      if(volunteersWithBadgeOut().has(v.id)){
        if(errorEl) errorEl.textContent = `${v.name} already has a different badge checked out.`;
        renderBadgeModalBody();
        return;
      }
      volunteerId = v.id;
      volunteerLabel = v.name;
    }
  }

  actionBtn.disabled = true;
  statusEl.textContent = 'Saving…';

  const file = badgeSelectedPhotoFile;
  let photoUrl = null;
  if(file){
    const safeName = file.name.replace(/[^a-zA-Z0-9.]/g,'_');
    const path = `${b.id}/${Date.now()}-${safeName}`;
    const {error: upErr} = await sb.storage.from('badge-photos').upload(path, file, {contentType: file.type});
    if(upErr){
      statusEl.textContent = 'Error: '+upErr.message;
      actionBtn.disabled = false;
      return;
    }
    photoUrl = sb.storage.from('badge-photos').getPublicUrl(path).data.publicUrl;
  }

  if(st.out){
    const ok = await db(sb.from('badge_events').insert({
      badge_id: b.id, volunteer_id: st.event.volunteer_id,
      volunteer_name_snapshot: st.event.volunteer_name_snapshot,
      action: 'checkin', photo_url: photoUrl
    }), 'badge check-in');
    // a checkout still needs review (who's taking it, the photo) so it
    // stays open showing the result — a checkin is just confirming a
    // return, nothing left to look at once it's saved
    if(ok) closeBadgeModal();
  }else{
    await db(sb.from('badge_events').insert({
      badge_id: b.id, volunteer_id: volunteerId, volunteer_name_snapshot: volunteerLabel,
      action: 'checkout', photo_url: photoUrl
    }), 'badge check-out');
  }
}

