/* ---------------------------------------------------------------
   RENDER
---------------------------------------------------------------- */
const dropLayer = document.getElementById('drop-layer');
const fieldWrap = document.getElementById('field-wrap');
const statusEl = document.getElementById('save-status');

function initialsFor(name){ return name.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase(); }
function volunteerName(id){ const v = STATE.roster.find(r=>r.id===id); return v ? v.name : null; }

function renderHeader(){
  const evt = currentEvent();
  document.getElementById('hdr-evt-name').textContent = loaded ? (evt.name + (evt.date ? ' — '+evt.date : '')) : 'Loading…';
  const evtPill = document.getElementById('hdr-evt-pill');
  if(evt.id && evt.id === STATE.activeEventId){ evtPill.textContent='🔴 Live'; evtPill.className='pill current'; evtPill.title = 'This is the event volunteers see by default'; }
  else { evtPill.textContent='Draft'; evtPill.className='pill other'; evtPill.title = 'Not live yet — volunteers won\'t see this event until you Go Live with it'; }
  const modePill = document.getElementById('hdr-mode-pill');
  if(mode==='edit'){ modePill.textContent='Editing'; modePill.className='pill mode-edit'; }
  else { modePill.textContent='View Only'; modePill.className='pill mode-view'; }

  // ROLE — drives which controls show at all (see the [data-*-only] CSS
  // rules) and the header's role badge/Sign-Out-vs-Lock label.
  const ROLE_LABELS = {admin:'Admin', director:'Director', lead_volunteer:'Lead Volunteer'};
  const rolePill = document.getElementById('hdr-role-pill');
  if(role==='guest'){ rolePill.textContent=''; rolePill.style.display='none'; }
  else { rolePill.textContent='🔒 '+ROLE_LABELS[role]; rolePill.style.display=''; rolePill.className='pill role-'+role; }
  document.body.classList.toggle('signed-in', role!=='guest');
  document.body.classList.toggle('badges-unlocked', mode==='edit' || role==='lead_volunteer');
  document.body.classList.toggle('role-admin', role==='admin');
  // Lead Volunteer can only ever reach the Badges palette tab (Equipment/
  // Instruments are data-edit-only) — the markup defaults to Equipment
  // active/Badges hidden, so force Badges active the first time this
  // role shows up, or the palette would render empty for them.
  if(role==='lead_volunteer'){
    const badgesTabBtn = document.querySelector('.tab-btn[data-tab="badges"]');
    if(badgesTabBtn && !badgesTabBtn.classList.contains('active')) badgesTabBtn.click();
  }

  btnModeToggle.style.display = role==='lead_volunteer' ? 'none' : '';
  // sets the label span + title/aria-label, not the button's whole
  // content — on phones this collapses to an icon-only button (see
  // styles.css), so the text still has to live somewhere for a screen
  // reader and the hover tooltip even when it's visually hidden
  const modeToggleLabel = mode==='edit' ? 'Exit to Volunteer View' : ((role==='director'||role==='admin') ? 'Enter Edit Mode' : 'Sign In');
  btnModeToggle.querySelector('.btn-label').textContent = modeToggleLabel;
  btnModeToggle.title = modeToggleLabel;
  btnModeToggle.setAttribute('aria-label', modeToggleLabel);
  const signOutBtn = document.getElementById('btn-signout');
  const signOutLabel = role==='admin' ? 'Sign Out' : 'Lock';
  signOutBtn.querySelector('.btn-label').textContent = signOutLabel;
  signOutBtn.title = signOutLabel;
  signOutBtn.setAttribute('aria-label', signOutLabel);
}

function renderEventSelect(){
  const sel = document.getElementById('event-select');
  sel.innerHTML = STATE.events.map(e=>{
    const label = e.name + (e.date ? ' ('+e.date+')' : '') + (e.id===STATE.activeEventId ? ' ★' : '');
    return `<option value="${e.id}" ${e.id===viewingEventId?'selected':''}>${label}</option>`;
  }).join('');
  document.getElementById('btn-set-current').disabled = (viewingEventId === STATE.activeEventId);
  document.getElementById('btn-del-event').disabled = STATE.events.length<=1;

  const evt = currentEvent();
  const tmpl = evt.templateId ? STATE.templates.find(t=>t.id===evt.templateId) : null;
  document.getElementById('hdr-template-pill').textContent = tmpl ? 'Template: '+tmpl.name : 'No Template';
}

function renderPaletteCounts(){
  const counts = {};
  currentItemsCtx().items.forEach(it=>{
    const key = resolveTypeId(it.typeId);
    counts[key] = (counts[key]||0)+1;
  });
  document.querySelectorAll('.count-badge').forEach(badge=>{
    const n = counts[badge.dataset.countFor] || 0;
    badge.textContent = n;
    badge.classList.toggle('has-count', n>0);
  });
}

// per-event signup status for a volunteer — no explicit row means
// "potential" (the default, catch-all bucket)
function volunteerStatusFor(volunteerId){
  const evtId = currentEvent().id;
  const row = STATE.eventVolunteerStatus.find(s=>s.event_id===evtId && s.volunteer_id===volunteerId);
  return row ? row.status : 'potential';
}

function rosterRowHTML(v, statusKey){
  return `
    <div class="roster-row" data-edit-volunteer="${v.id}">
      <div class="avatar">${initialsFor(v.name)}</div>
      <div class="info">
        <div class="name">${v.name}</div>
        ${v.role ? `<div class="role">${v.role}</div>` : ''}
        ${v.description ? `<div class="desc">${v.description}</div>` : ''}
      </div>
      <select class="status-select" data-status-volunteer="${v.id}" title="Status for this event">
        <option value="signed_up" ${statusKey==='signed_up'?'selected':''}>Signed Up</option>
        <option value="backup" ${statusKey==='backup'?'selected':''}>Backup</option>
        <option value="potential" ${statusKey==='potential'?'selected':''}>Potential</option>
      </select>
      <button class="remove-btn" data-remove-volunteer="${v.id}" type="button" title="Remove">&times;</button>
    </div>`;
}

function renderRoster(){
  const list = document.getElementById('roster-list');
  if(!STATE.roster.length){
    list.innerHTML = `<div class="roster-empty">No volunteers yet. Add your crew below.</div>`;
    return;
  }
  const groups = {signed_up:[], backup:[], potential:[]};
  STATE.roster.forEach(v=> groups[volunteerStatusFor(v.id)].push(v));

  const section = (title, key, cls, emptyText) => `
    <div class="roster-section">
      <div class="roster-section-title ${cls}">${title} <span class="count">${groups[key].length}</span></div>
      ${groups[key].length ? groups[key].map(v=>rosterRowHTML(v, key)).join('') : `<div class="roster-empty">${emptyText}</div>`}
    </div>`;

  list.innerHTML =
    section(`Signed Up — ${currentEvent().name}`, 'signed_up', 'signed-up', 'Nobody signed up yet.') +
    section('Backups', 'backup', 'backup', 'No backups set.') +
    section('All Other Volunteers', 'potential', 'potential', 'Everyone is signed up or a backup.');
}

function renderField(){
  dropLayer.innerHTML = '';
  currentItemsCtx().items.forEach(it=>{
    const cat = catalogFor(it.typeId);
    const el = document.createElement('div');
    el.className = 'placed' + (it.needsHelp ? ' needs-help' : '');
    el.style.left = it.xPct+'%';
    el.style.top = it.yPct+'%';
    el.style.transform = 'translate(-50%,-50%) scale(var(--chip-scale))';
    el.dataset.uid = it.uid;
    el.title = it.label;

    // On a crowded mobile field, the who-matters-most info is who's
    // carrying it. Once someone's assigned, their name becomes the whole
    // label (equipment identity is still one tap away); otherwise show
    // the (abbreviated) equipment name, plus "Needs N" if unassigned.
    const names = it.needsHelp ? (it.assignedIds||[]).map(volunteerName).filter(Boolean) : [];
    let labelHTML;
    if(names.length){
      labelHTML = `<div class="tag name-tag">${names.join(', ')}</div>`;
    }else{
      labelHTML = `<div class="tag">${abbreviateLabel(it.label)}</div>`;
      if(it.needsHelp) labelHTML += `<div class="assign-note">Needs ${it.helpersNeeded||1}</div>`;
    }
    // speakers, subs, and podiums need precise placement — show the
    // approximate yard line/hash right on the field, not just on tap
    if(showsPositionRef(cat)){
      labelHTML += `<div class="pos-note">${describePositionShort(it.xPct, it.yPct)}</div>`;
    }

    // if the assigned helper currently has a badge checked out, show
    // their check-out photo right on the chip — visible in both modes
    let badgeThumbHTML = '';
    if(it.needsHelp && it.assignedIds && it.assignedIds.length){
      const vb = it.assignedIds.map(volunteerBadge).find(Boolean);
      if(vb && vb.event.photo_url){
        badgeThumbHTML = `<img class="chip-badge-thumb" src="${vb.event.photo_url}" title="${vb.badge.label}">`;
      }
    }

    const {w:chipW, h:chipH} = chipDims(cat);
    el.innerHTML = `
      <div class="del" data-del="${it.uid}">&times;</div>
      <div class="chip" style="width:${chipW}px;height:${chipH}px;background:${cat.color};color:#fff;">
        ${ICONS[cat.icon]}
        ${it.needsHelp ? `<span class="help-badge">${it.helpersNeeded||1}</span>` : ''}
        ${badgeThumbHTML}
      </div>
      ${labelHTML}`;
    dropLayer.appendChild(el);
  });
  renderPaletteCounts();
  updateOffscreenArrows();
}

// the badge (if any) currently checked out to a given volunteer
function volunteerBadge(volunteerId){
  for(const b of STATE.badges){
    const st = badgeStatus(b.id);
    if(st.out && st.event.volunteer_id===volunteerId) return {badge:b, event:st.event};
  }
  return null;
}

// view-only "find your name" search — lets a volunteer type their own
// name to jump straight to whatever they're tagged to help carry,
// instead of scanning the whole Needs a Hand list by eye
let assignSearchQuery = '';
function renderAssignments(){
  const allItems = currentEvent().items.filter(it=>it.needsHelp);
  const totalHelpersNeeded = allItems.reduce((sum,it)=> sum + (it.helpersNeeded||1), 0);
  document.getElementById('assign-count').textContent = totalHelpersNeeded;
  const q = assignSearchQuery.trim().toLowerCase();
  const items = q ? allItems.filter(it => (it.assignedIds||[]).some(id => (volunteerName(id)||'').toLowerCase().includes(q))) : allItems;
  const list = document.getElementById('assign-list');
  if(!items.length){
    list.innerHTML = q
      ? `<div class="assign-empty">No one matching your search is tagged to help with anything right now.</div>`
      : `<div class="assign-empty">No items are flagged for extra hands right now. ${mode==='edit' ? 'Click an item on the field to tag it.' : ''}</div>`;
    return;
  }
  const timingLabel = v => (TIMING_OPTIONS.find(t=>t.v===v)||{}).label || '';
  list.innerHTML = items.map(it=>{
    const ids = (it.assignedIds||[]).filter(id=>volunteerName(id));
    const need = it.helpersNeeded||1;
    const filled = ids.length >= need;
    const whoHTML = ids.length ? ids.map(id=>{
      const vb = volunteerBadge(id);
      const badgeHTML = vb ? `${vb.event.photo_url ? `<img class="who-badge-thumb" src="${vb.event.photo_url}">` : ''}<span class="who-badge-label">${vb.badge.label}</span>` : '';
      // an "anchor" is a helper who reliably covers this same spot every
      // game — pinning them here means Clear Volunteers leaves them
      // assigned instead of wiping them out along with everyone else
      const anchored = (it.anchoredIds||[]).includes(id);
      const anchorHTML = mode==='edit'
        ? `<button type="button" class="anchor-toggle ${anchored?'anchored':''}" data-anchor-item="${it.uid}" data-anchor-volunteer="${id}" title="${anchored ? 'Anchored here every game — click to unpin' : 'Pin as an anchor so Clear Volunteers leaves them assigned'}">📌</button>`
        : (anchored ? `<span class="anchor-badge" title="Anchored here every game">📌</span>` : '');
      return `<span class="who-person">${volunteerName(id)}${badgeHTML}${anchorHTML}</span>`;
    }).join('') : '<span class="unassigned">Unassigned — needs a volunteer</span>';
    return `
    <div class="assign-card" data-open-inspector="${it.uid}">
      <div class="top-row">
        <div class="item-label">${it.label}</div>
        <div class="helper-pill ${filled?'filled':''}">${ids.length}/${need} helpers</div>
      </div>
      ${it.studentName ? `<div class="student-tag">Student: <strong>${it.studentName}</strong></div>` : ''}
      <div class="pos">${describePosition(it.xPct, it.yPct)}</div>
      <div class="who">${whoHTML}</div>
      ${it.timing ? `<div class="timing-tag">${timingLabel(it.timing)}</div>` : ''}
      ${typeNotesFor(it).notes ? `<div class="notes">${typeNotesFor(it).notes}</div>` : ''}
    </div>`;
  }).join('');
}

function renderAll(){
  applyScreen();
  renderHeader();
  renderEventSelect();
  renderField();
  renderRoster();
  renderAssignments();
  renderBadges();
  renderTemplates();
  renderImportEventSelect();
  if(openBadgeId) renderBadgeModalBody();
}

/* ---------------------------------------------------------------
   BUILD PALETTE
---------------------------------------------------------------- */
function buildPaletteList(container, catalog, subLabel){
  catalog.forEach(item=>{
    const row = document.createElement('div');
    row.className = 'pal-item';
    row.dataset.type = item.id;
    row.innerHTML = `
      <div class="swatch" style="background:${item.color}">${ICONS[item.icon]}</div>
      <div><div class="label">${item.name}</div><div class="sub">${subLabel}</div></div>
      <div class="count-badge" data-count-for="${item.id}">0</div>`;
    container.appendChild(row);
    wirePaletteDrag(row, item.id, item.name);
  });
}
const palList = document.getElementById('pal-list');
const palListInstruments = document.getElementById('pal-list-instruments');
// NOT called here — wirePaletteDrag() lives in drag-drop.js, which loads
// AFTER this file. Calling it at this file's top level (i.e. immediately,
// rather than from inside a function invoked later) used to throw
// "wirePaletteDrag is not defined" in a real browser the instant this
// script ran — script tags execute in order, so anything a LATER file
// defines isn't available yet at an EARLIER file's own top level, even
// though it will be by the time the page has actually finished loading.
// initPalette() (below) does the real building; boot.js calls it last,
// once every file — including drag-drop.js — has loaded.
function initPalette(){
  buildPaletteList(palList, CATALOG, 'Pit Crew Item');
  buildPaletteList(palListInstruments, INSTRUMENT_CATALOG, 'Pit Instrument');
}

let activeList = palList;
// scoped to [data-tab] specifically — .tab-btn alone is shared with the
// Admin screen's tab row (data-admin-tab) and the Inspector's two tab
// rows (data-insp-tab/data-edit-tab); binding to the bare class used to
// mean clicking any of THOSE also fired this handler, with an undefined
// btn.dataset.tab hiding every palette panel (crew/instruments/badges
// all matched 'none') until a real palette tab got clicked again
document.querySelectorAll('.tab-btn[data-tab]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.tab-btn[data-tab]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-crew').style.display = btn.dataset.tab==='crew' ? 'block' : 'none';
    document.getElementById('tab-instruments').style.display = btn.dataset.tab==='instruments' ? 'block' : 'none';
    document.getElementById('tab-badges').style.display = btn.dataset.tab==='badges' ? 'block' : 'none';
    // custom-item add is shared between the two equipment-ish tabs —
    // whichever one is active, new custom items land in that list
    document.getElementById('custom-add-wrap').style.display = (btn.dataset.tab==='crew'||btn.dataset.tab==='instruments') ? 'block' : 'none';
    if(btn.dataset.tab==='crew') activeList = palList;
    if(btn.dataset.tab==='instruments') activeList = palListInstruments;
  });
});

const legend = document.getElementById('legend');
[
  {label:'Podiums / Rack', color:'#1b2a5e'},
  {label:'Speakers / Sub', color:'#2c3f8f'},
  {label:'Percussion (Timpani / Bass Drum)', color:'#8a5a2e'},
  {label:'Generator', color:'#2f2f33'},
].forEach(g=>{
  const el = document.createElement('div');
  el.className='item';
  el.innerHTML = `<span class="dot" style="background:${g.color}"></span>${g.label}`;
  legend.appendChild(el);
});
const ringEl = document.createElement('div');
ringEl.className='item';
ringEl.innerHTML = `<span class="ring"></span>Needs a helper to move`;
legend.appendChild(ringEl);

// legend accordion — collapsed by default to save space, remembered
// per viewer so it doesn't reset every visit
const legendToggle = document.getElementById('legend-toggle');
let legendOpen = false;
try{ legendOpen = localStorage.getItem('field-legend-open')==='1'; }catch(e){}
function applyLegendState(){
  legend.classList.toggle('open', legendOpen);
  legendToggle.classList.toggle('open', legendOpen);
}
legendToggle.addEventListener('click', ()=>{
  legendOpen = !legendOpen;
  try{ localStorage.setItem('field-legend-open', legendOpen?'1':'0'); }catch(e){}
  applyLegendState();
});
applyLegendState();

// Needs a Hand drawer — a real collapsible sidebar (see .assign-panel
// in styles.css), not just a shorter panel: collapsing it shrinks its
// width so the field/palette gain that room back, which matters most
// while placing instruments — the main field-editor task, and one
// Needs a Hand isn't useful for yet. The chevron lives on the section
// itself (not a separate header button), and the header row stays
// visible collapsed or not, so there's always a way back.
const assignPanel = document.getElementById('assign-panel');
const assignPanelToggle = document.getElementById('assign-panel-toggle');
let assignPanelOpen = true;
try{ assignPanelOpen = localStorage.getItem('assign-panel-open') !== '0'; }catch(e){}
function applyAssignPanelState(){
  assignPanel.classList.toggle('collapsed', !assignPanelOpen);
}
assignPanelToggle.addEventListener('click', ()=>{
  assignPanelOpen = !assignPanelOpen;
  try{ localStorage.setItem('assign-panel-open', assignPanelOpen?'1':'0'); }catch(e){}
  applyAssignPanelState();
});
applyAssignPanelState();

const assignSearchInput = document.getElementById('assign-search-input');
assignSearchInput.addEventListener('input', ()=>{
  assignSearchQuery = assignSearchInput.value;
  renderAssignments();
});

// Equipment palette — same collapsible-sidebar mechanism as Needs a
// Hand above, mirrored on the other side: collapsing it shrinks its
// width so the field/Needs a Hand gain that room back, which matters
// most while assigning volunteers — the palette isn't useful for that
// task, so tucking it away gives Needs a Hand more room to work in.
const palette = document.getElementById('palette');
const paletteToggle = document.getElementById('palette-toggle');
let paletteOpen = true;
try{ paletteOpen = localStorage.getItem('palette-open') !== '0'; }catch(e){}
function applyPaletteState(){
  palette.classList.toggle('collapsed', !paletteOpen);
}
paletteToggle.addEventListener('click', ()=>{
  paletteOpen = !paletteOpen;
  try{ localStorage.setItem('palette-open', paletteOpen?'1':'0'); }catch(e){}
  applyPaletteState();
});
applyPaletteState();

