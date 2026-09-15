/* ---------------------------------------------------------------
   CONFIRM DIALOG (generic) — either a plain yes/no ("Confirm"/Cancel,
   the common case) by passing a callback, or a multi-choice prompt
   ("Clear Needs a Hand" vs "Clear Field", say) by passing an array of
   {label, className, onClick} actions instead. Cancel always closes it
   with no action, however many choice buttons there are.
---------------------------------------------------------------- */
const confirmOverlay = document.getElementById('confirm-overlay');
const confirmMsg = document.getElementById('confirm-msg');
const confirmActions = document.getElementById('confirm-actions');
function openConfirm(msg, actionsOrOnConfirm){
  confirmMsg.textContent = msg;
  const actions = Array.isArray(actionsOrOnConfirm)
    ? actionsOrOnConfirm
    : [{label:'Confirm', className:'danger', onClick:actionsOrOnConfirm}];
  confirmActions.innerHTML = '';
  actions.forEach(a=>{
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = a.label;
    if(a.className) btn.className = a.className;
    btn.addEventListener('click', ()=>{
      confirmOverlay.style.display = 'none';
      a.onClick();
    });
    confirmActions.appendChild(btn);
  });
  confirmOverlay.style.display = 'flex';
}
document.getElementById('confirm-cancel').addEventListener('click', ()=>{ confirmOverlay.style.display='none'; });

/* ---------------------------------------------------------------
   EVENT MANAGEMENT
---------------------------------------------------------------- */
document.getElementById('event-select').addEventListener('change', e=>{
  viewingEventId = e.target.value;
  renderAll();
});
document.getElementById('btn-set-current').addEventListener('click', ()=>{
  const evt = currentEvent();
  openConfirm(`Go live with "${evt.name}"? Every volunteer who opens the app (no login needed) will see this event by default instead of whichever one is live now.`, async ()=>{
    await db(sb.from('events').update({is_current:false}).eq('is_current', true), 'unset current');
    await db(sb.from('events').update({is_current:true}).eq('id', viewingEventId), 'set current');
  });
});

const eventForm = document.getElementById('event-form');
const eventFormLabel = document.getElementById('event-form-label');
const eventFormName = document.getElementById('event-form-name');
const eventFormDate = document.getElementById('event-form-date');
const eventFormTemplate = document.getElementById('event-form-template');
const eventFormType = document.getElementById('event-form-type');
let eventFormMode = 'new';

function openEventForm(kind){
  eventFormMode = kind;
  // "start from a template" only makes sense for a brand new event —
  // duplicating/renaming an existing one already has its own layout
  eventFormTemplate.style.display = kind==='new' ? '' : 'none';
  if(kind==='new'){
    eventFormTemplate.innerHTML = '<option value="">Start Blank</option>' +
      STATE.templates.map(t=>`<option value="${t.id}">${t.name}</option>`).join('');
  }
  if(kind==='duplicate'){
    eventFormLabel.textContent = 'Duplicate “'+currentEvent().name+'”';
    eventFormName.value = currentEvent().name + ' (Copy)';
    eventFormDate.value = '';
    eventFormType.value = currentEvent().eventType || '';
  }else if(kind==='rename'){
    eventFormLabel.textContent = 'Rename “'+currentEvent().name+'”';
    eventFormName.value = currentEvent().name;
    eventFormDate.value = currentEvent().date || '';
    eventFormType.value = currentEvent().eventType || '';
  }else{
    eventFormLabel.textContent = 'New Event';
    eventFormName.value = '';
    eventFormDate.value = todayISO();
    eventFormType.value = '';
  }
  document.getElementById('event-form-create').textContent = kind==='rename' ? 'Save' : 'Create';
  eventForm.classList.add('open');
  eventFormName.focus();
}
// shared by "Duplicate Event" and "New Event from Template" — copies a
// source items array onto a freshly-created event with no assignments
// EXCEPT anchored ones ("📌 pinned" helpers — someone reliable enough to
// carry over automatically) — everyone else starts unassigned, since a
// fresh event shouldn't assume last game's volunteer availability.
// Template items never carry anchoredIds (templates have no assignment
// table at all — see copyItemsToTemplate below), so this is a no-op for
// "New Event from Template", only "Duplicate Event" actually has any to
// carry. What to Do/Wrap It Up text and media are NOT copied here —
// they're shared per equipment type now (see typeNotesFor in state.js),
// so every item of that type already shows them with no copy needed.
// Returns the number of items that failed to copy (0 = every item
// copied cleanly) so callers can surface a warning instead of silently
// reporting success — each insert's error used to only go to
// console.error, so a copy that failed outright (e.g. a stale/expired
// session) looked identical to one that worked, just with an empty result.
async function copyItemsToEvent(srcItems, eventId){
  let failed = 0;
  for(const it of srcItems){
    const {data:newItem, error:ie} = await sb.from('items').insert({
      event_id:eventId, type_id:it.typeId, label:it.label, x_pct:it.xPct, y_pct:it.yPct,
      needs_help:it.needsHelp, helpers_needed:it.helpersNeeded, timing:it.timing,
      student_name:it.studentName
    }).select().single();
    if(ie){ failed++; console.error(ie); continue; }
    for(const volunteerId of (it.anchoredIds || [])){
      const {error:ae} = await sb.from('item_assignments').insert({item_id:newItem.id, volunteer_id:volunteerId, anchored:true});
      if(ae) console.error(ae);
    }
  }
  return failed;
}
// same idea as copyItemsToEvent, but onto a template's template_items —
// shared by "Save Event as Template" and "Duplicate Template". Also
// returns a failure count, for the same reason.
async function copyItemsToTemplate(srcItems, templateId){
  let failed = 0;
  for(const it of srcItems){
    const {error:ie} = await sb.from('template_items').insert({
      template_id:templateId, type_id:it.typeId, label:it.label, x_pct:it.xPct, y_pct:it.yPct,
      needs_help:it.needsHelp, helpers_needed:it.helpersNeeded, timing:it.timing,
      student_name:it.studentName
    });
    if(ie){ failed++; console.error(ie); }
  }
  return failed;
}
// one line for every "copied N items, M failed" status — used after
// every duplicate/save-as-template/new-from-template action below
function copyResultMessage(kind, total, failed){
  if(!total) return `${kind} created`;
  if(!failed) return 'All changes saved';
  return `${kind} created, but ${failed} of ${total} item(s) failed to copy — open the browser console (F12) for the error`;
}
document.getElementById('btn-new-event').addEventListener('click', ()=>openEventForm('new'));
document.getElementById('btn-dup-event').addEventListener('click', ()=>openEventForm('duplicate'));
document.getElementById('btn-rename-event').addEventListener('click', ()=>openEventForm('rename'));
document.getElementById('event-form-cancel').addEventListener('click', ()=>eventForm.classList.remove('open'));
const eventFormCreateBtn = document.getElementById('event-form-create');
eventFormCreateBtn.addEventListener('click', async ()=>{
  // guard against a double-tap firing this async handler twice and
  // creating two events — see the identical guard on template-form-create
  if(eventFormCreateBtn.disabled) return;
  const name = eventFormName.value.trim();
  if(!name) return;
  const date = eventFormDate.value || null;
  const eventType = eventFormType.value || '';
  eventFormCreateBtn.disabled = true;
  try{
    if(eventFormMode==='rename'){
      await db(sb.from('events').update({name, date, event_type: eventType}).eq('id', currentEvent().id), 'rename event');
    }else if(eventFormMode==='duplicate'){
      const srcItems = clone(currentEvent().items);
      const {data:newEvt, error} = await sb.from('events').insert({name, date, event_type: eventType, template_id: currentEvent().templateId || null}).select().single();
      if(error){ statusEl.textContent = 'Error: '+error.message; return; }
      // fresh event, fresh helper list — layout/tagging/student carry
      // over, but nobody starts pre-assigned to help. Crew roster status
      // (Signed Up/Backup) is per-event too and has no rows yet for this
      // new event, so everyone naturally starts as Potential automatically.
      const failed = await copyItemsToEvent(srcItems, newEvt.id);
      viewingEventId = newEvt.id;
      await reload();
      statusEl.textContent = copyResultMessage('Event', srcItems.length, failed);
      if(typeof startSetupWizard==='function') startSetupWizard(newEvt.id, name);
    }else{
      const templateId = eventFormTemplate.value || null;
      const {data:newEvt, error} = await sb.from('events').insert({name, date, event_type: eventType, template_id: templateId}).select().single();
      if(error){ statusEl.textContent = 'Error: '+error.message; return; }
      let failed = 0, total = 0;
      if(templateId){
        const tmpl = STATE.templates.find(t=>t.id===templateId);
        if(tmpl){ total = tmpl.items.length; failed = await copyItemsToEvent(clone(tmpl.items), newEvt.id); }
      }
      viewingEventId = newEvt.id;
      await reload();
      statusEl.textContent = copyResultMessage('Event', total, failed);
      if(typeof startSetupWizard==='function') startSetupWizard(newEvt.id, name);
    }
    eventForm.classList.remove('open');
  }finally{
    eventFormCreateBtn.disabled = false;
  }
});

/* ---------------------------------------------------------------
   SWITCH TEMPLATE — change which template an event follows, any time,
   not just at creation. Re-linking optionally ADDS that template's
   items onto the field (via the same copyItemsToEvent used for
   Duplicate/New-from-template) — it never removes what's already
   there; Clear Field is still the only way to wipe the field.
---------------------------------------------------------------- */
const switchTemplateForm = document.getElementById('switch-template-form');
const switchTemplateSelect = document.getElementById('switch-template-select');
document.getElementById('btn-switch-template').addEventListener('click', ()=>{
  switchTemplateSelect.innerHTML = '<option value="">No Template</option>' +
    STATE.templates.map(t=>`<option value="${t.id}">${t.name}</option>`).join('');
  switchTemplateSelect.value = currentEvent().templateId || '';
  switchTemplateForm.classList.add('open');
});
document.getElementById('switch-template-cancel').addEventListener('click', ()=>switchTemplateForm.classList.remove('open'));
document.getElementById('switch-template-apply').addEventListener('click', async ()=>{
  const evt = currentEvent();
  const newTemplateId = switchTemplateSelect.value || null;
  const alreadyLinked = newTemplateId === (evt.templateId || null);
  statusEl.textContent = 'Saving…';
  const {error} = await sb.from('events').update({template_id: newTemplateId}).eq('id', evt.id);
  if(error){ statusEl.textContent = 'Error: '+error.message; return; }
  // only add items when actually switching TO a template (not clearing
  // to "No Template", and not re-picking the one already linked — that'd
  // duplicate everything already on the field for no reason)
  if(newTemplateId && !alreadyLinked){
    const tmpl = STATE.templates.find(t=>t.id===newTemplateId);
    if(tmpl) await copyItemsToEvent(clone(tmpl.items), evt.id);
  }
  switchTemplateForm.classList.remove('open');
  await reload();
  statusEl.textContent = 'All changes saved';
});

/* ---------------------------------------------------------------
   SAVE EVENT AS TEMPLATE — turn an old game's field layout into a
   reusable template. Copies items into template_items the same way
   copyItemsToEvent() copies a template onto a fresh event, just in
   reverse. Templates have no assignment table at all (see schema.sql),
   so this is inherently "without volunteers assigned" — there's no
   item_assignments row to even bring along.
---------------------------------------------------------------- */
const saveAsTemplateForm = document.getElementById('save-as-template-form');
const saveAsTemplateSource = document.getElementById('save-as-template-source');
const saveAsTemplateName = document.getElementById('save-as-template-name');
const saveAsTemplateDescription = document.getElementById('save-as-template-description');
document.getElementById('btn-save-as-template').addEventListener('click', ()=>{
  saveAsTemplateSource.textContent = currentEvent().name;
  saveAsTemplateName.value = currentEvent().name;
  saveAsTemplateDescription.value = '';
  saveAsTemplateForm.classList.add('open');
  saveAsTemplateName.focus();
});
document.getElementById('save-as-template-cancel').addEventListener('click', ()=>saveAsTemplateForm.classList.remove('open'));
const saveAsTemplateCreateBtn = document.getElementById('save-as-template-create');
saveAsTemplateCreateBtn.addEventListener('click', async ()=>{
  // guard against a double-tap firing this async handler twice — see the
  // identical guard on template-form-create
  if(saveAsTemplateCreateBtn.disabled) return;
  const name = saveAsTemplateName.value.trim();
  if(!name) return;
  const description = saveAsTemplateDescription.value.trim();
  saveAsTemplateCreateBtn.disabled = true;
  try{
    const srcItems = clone(currentEvent().items);
    const {data:newTmpl, error} = await sb.from('templates').insert({name, description}).select().single();
    if(error){ statusEl.textContent = 'Error: '+error.message; return; }
    const failed = await copyItemsToTemplate(srcItems, newTmpl.id);
    saveAsTemplateForm.classList.remove('open');
    await reload();
    statusEl.textContent = failed
      ? copyResultMessage('Template', srcItems.length, failed)
      : `Saved "${name}" as a template`;
  }finally{
    saveAsTemplateCreateBtn.disabled = false;
  }
});

document.getElementById('btn-del-event').addEventListener('click', ()=>{
  if(STATE.events.length<=1) return;
  openConfirm(`Delete "${currentEvent().name}"? This can't be undone.`, async ()=>{
    const deletingId = viewingEventId;
    const wasActive = STATE.activeEventId === deletingId;
    await sb.from('events').delete().eq('id', deletingId);
    if(wasActive){
      await loadState();
      if(STATE.events[0]) await sb.from('events').update({is_current:true}).eq('id', STATE.events[0].id);
    }
    viewingEventId = null;
    await reload();
    statusEl.textContent = 'All changes saved';
  });
});

/* ---------------------------------------------------------------
   ADMIN SCREEN — template CRUD (a template is edited by reusing the
   same field editor as a normal event, via currentItemsCtx()) and the
   Crew Roster tab (moved here from the per-event palette, since the
   roster is reused across every event, not a per-event thing).
---------------------------------------------------------------- */
let adminOpen = false;
let adminTab = 'templates';

function applyScreen(){
  document.body.classList.toggle('admin-open', adminOpen || !!editingTemplateId);
  document.body.classList.toggle('editing-template', !!editingTemplateId);
  const nameEl = document.getElementById('template-edit-name');
  if(editingTemplateId) nameEl.textContent = '“'+currentTemplate().name+'”';
  // the field lock never applies while editing a template — re-sync
  // the body class every time editingTemplateId might have changed
  applyFieldLockUI();
}

function setAdminTab(tab){
  adminTab = tab;
  document.querySelectorAll('.admin-tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.adminTab===tab));
  document.getElementById('admin-tab-templates').style.display = tab==='templates' ? 'block' : 'none';
  document.getElementById('admin-tab-roster').style.display = tab==='roster' ? 'block' : 'none';
  document.getElementById('admin-tab-analytics').style.display = tab==='analytics' ? 'block' : 'none';
  document.getElementById('admin-tab-access').style.display = tab==='access' ? 'block' : 'none';
}
document.querySelectorAll('.admin-tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>setAdminTab(btn.dataset.adminTab));
});

document.getElementById('btn-admin').addEventListener('click', ()=>{
  // already sitting in the Admin hub — clicking Admin again acts as a
  // toggle back to the event view, instead of just doing nothing
  if(adminOpen && !editingTemplateId){
    adminOpen = false;
    applyScreen();
    renderAll();
    return;
  }
  adminOpen = true;
  editingTemplateId = null;
  // Templates/Crew Roster are edit-mode-only (see their data-edit-only
  // tabs/panels) — a Lead Volunteer opening Admin has nothing to see
  // there, so land them straight on the one tab that's actually theirs
  setAdminTab(mode==='edit' ? 'templates' : 'analytics');
  applyScreen();
  renderAll();
});
document.getElementById('btn-admin-back').addEventListener('click', ()=>{
  adminOpen = false;
  applyScreen();
  renderAll();
  if(typeof setMobileNavView==='function') setMobileNavView('field');
});
document.getElementById('btn-template-edit-done').addEventListener('click', ()=>{
  editingTemplateId = null;
  adminOpen = true;
  applyScreen();
  renderAll();
});

function renderTemplates(){
  const list = document.getElementById('template-list');
  if(!STATE.templates.length){
    list.innerHTML = `<div class="roster-empty">No templates yet. Create one below to reuse as a starting layout for new events.</div>`;
    return;
  }
  list.innerHTML = STATE.templates.map(t=>`
    <div class="template-row">
      <div class="info">
        <div class="name">${t.name}</div>
        ${t.description ? `<div class="desc">${t.description}</div>` : ''}
        <div class="count">${t.items.length} item${t.items.length===1?'':'s'} placed</div>
      </div>
      <button class="small primary" data-edit-template="${t.id}" type="button">Edit Layout</button>
      <button class="small ghost" data-dup-template="${t.id}" type="button">Duplicate</button>
      <button class="small ghost" data-rename-template="${t.id}" type="button">Rename</button>
      <button class="small danger" data-del-template="${t.id}" type="button">Delete</button>
    </div>`).join('');
}
document.getElementById('template-list').addEventListener('click', e=>{
  const editBtn = e.target.closest('[data-edit-template]');
  if(editBtn){
    editingTemplateId = editBtn.dataset.editTemplate;
    applyScreen();
    renderAll();
    return;
  }
  const dupBtn = e.target.closest('[data-dup-template]');
  if(dupBtn){ openTemplateForm('duplicate', dupBtn.dataset.dupTemplate); return; }
  const renameBtn = e.target.closest('[data-rename-template]');
  if(renameBtn){ openTemplateForm('rename', renameBtn.dataset.renameTemplate); return; }
  const delBtn = e.target.closest('[data-del-template]');
  if(delBtn){
    const id = delBtn.dataset.delTemplate;
    const t = STATE.templates.find(x=>x.id===id);
    openConfirm(`Delete template "${t.name}"? This can't be undone.`, async ()=>{
      await db(sb.from('templates').delete().eq('id', id), 'delete template');
    });
  }
});

const templateForm = document.getElementById('template-form');
const templateFormLabel = document.getElementById('template-form-label');
const templateFormName = document.getElementById('template-form-name');
const templateFormDescription = document.getElementById('template-form-description');
let templateFormMode = 'new';
let templateFormTargetId = null;
function openTemplateForm(kind, id){
  templateFormMode = kind;
  templateFormTargetId = id || null;
  if(kind==='rename'){
    const t = STATE.templates.find(x=>x.id===id) || {name:'',description:''};
    templateFormLabel.textContent = 'Rename “'+t.name+'”';
    templateFormName.value = t.name;
    templateFormDescription.value = t.description;
  }else if(kind==='duplicate'){
    const t = STATE.templates.find(x=>x.id===id) || {name:'',description:''};
    templateFormLabel.textContent = 'Duplicate “'+t.name+'”';
    templateFormName.value = t.name + ' (Copy)';
    templateFormDescription.value = t.description;
  }else{
    templateFormLabel.textContent = 'New Template';
    templateFormName.value = '';
    templateFormDescription.value = '';
  }
  document.getElementById('template-form-create').textContent = kind==='rename' ? 'Save' : 'Create';
  templateForm.classList.add('open');
  templateFormName.focus();
}
document.getElementById('btn-new-template').addEventListener('click', ()=>openTemplateForm('new'));
document.getElementById('template-form-cancel').addEventListener('click', ()=>templateForm.classList.remove('open'));
const templateFormCreateBtn = document.getElementById('template-form-create');
templateFormCreateBtn.addEventListener('click', async ()=>{
  // guard against a double-tap (common on phones, especially once the
  // network round trip makes the first tap's feedback feel delayed)
  // firing this async handler twice and creating two templates
  if(templateFormCreateBtn.disabled) return;
  const name = templateFormName.value.trim();
  if(!name) return;
  const description = templateFormDescription.value.trim();
  templateFormCreateBtn.disabled = true;
  try{
    if(templateFormMode==='rename'){
      await db(sb.from('templates').update({name, description}).eq('id', templateFormTargetId), 'rename template');
    }else if(templateFormMode==='duplicate'){
      const src = STATE.templates.find(t=>t.id===templateFormTargetId);
      const srcItems = clone(src ? src.items : []);
      const {data:newTmpl, error} = await sb.from('templates').insert({name, description}).select().single();
      if(error){ statusEl.textContent = 'Error: '+error.message; return; }
      const failed = await copyItemsToTemplate(srcItems, newTmpl.id);
      await reload();
      statusEl.textContent = copyResultMessage('Template', srcItems.length, failed);
    }else{
      const {data:newTmpl, error} = await sb.from('templates').insert({name, description}).select().single();
      if(error){ statusEl.textContent = 'Error: '+error.message; return; }
      // give the organizer a real starting point instead of a blank
      // canvas — the actual Coppell Away layout every time, helper tags
      // included, not just icons in the right spot. No notes field here —
      // What to Do/Wrap It Up are shared per equipment type (see
      // typeNotesFor in state.js) and Coppell Away's own items already
      // seeded those via the item_type_notes backfill in schema.sql.
      const {error: ie} = await sb.from('template_items').insert(
        STARTER_TEMPLATE_ITEMS.map(it=>({
          template_id: newTmpl.id, type_id: it.typeId, label: it.label, x_pct: it.xPct, y_pct: it.yPct,
          needs_help: it.needsHelp || false, helpers_needed: it.helpersNeeded || 1,
          timing: it.timing || ''
        }))
      );
      if(ie) console.error(ie);
      await reload();
      statusEl.textContent = ie
        ? `Template created, but starter items failed to copy — open the browser console (F12) for the error`
        : 'All changes saved';
    }
    templateForm.classList.remove('open');
  }finally{
    templateFormCreateBtn.disabled = false;
  }
});

/* ---------------------------------------------------------------
   ROSTER MANAGEMENT
---------------------------------------------------------------- */
let editingVolunteerId = null;
const rosterNameInput = document.getElementById('roster-name');
const rosterRoleInput = document.getElementById('roster-role');
const rosterDescInput = document.getElementById('roster-description');
const rosterAddBtn = document.getElementById('roster-add-btn');
const rosterCancelEditBtn = document.getElementById('roster-cancel-edit-btn');

function startEditVolunteer(id){
  const v = STATE.roster.find(r=>r.id===id);
  if(!v) return;
  editingVolunteerId = id;
  rosterNameInput.value = v.name;
  rosterRoleInput.value = v.role || '';
  rosterDescInput.value = v.description || '';
  rosterAddBtn.textContent = 'Save Changes';
  rosterCancelEditBtn.style.display = 'inline-block';
  rosterNameInput.focus();
}
function cancelEditVolunteer(){
  editingVolunteerId = null;
  rosterNameInput.value = '';
  rosterRoleInput.value = '';
  rosterDescInput.value = '';
  rosterAddBtn.textContent = 'Add to Roster';
  rosterCancelEditBtn.style.display = 'none';
}
rosterCancelEditBtn.addEventListener('click', cancelEditVolunteer);

rosterAddBtn.addEventListener('click', async ()=>{
  const name = rosterNameInput.value.trim();
  if(!name) return;
  const role = rosterRoleInput.value.trim();
  const description = rosterDescInput.value.trim();
  if(editingVolunteerId){
    const ok = await db(sb.from('roster').update({name, role, description}).eq('id', editingVolunteerId), 'update volunteer');
    if(ok) cancelEditVolunteer();
  }else{
    const ok = await db(sb.from('roster').insert({name, role, description}), 'add volunteer');
    if(ok) cancelEditVolunteer();
  }
});
document.getElementById('roster-list').addEventListener('click', e=>{
  if(e.target.closest('select')) return; // let the status dropdown handle its own clicks
  const removeBtn = e.target.closest('[data-remove-volunteer]');
  if(removeBtn){
    const id = removeBtn.dataset.removeVolunteer;
    const v = STATE.roster.find(r=>r.id===id);
    openConfirm(`Remove ${v ? v.name : 'this volunteer'} from the roster? This also clears their assignments.`, async ()=>{
      if(editingVolunteerId===id) cancelEditVolunteer();
      await db(sb.from('roster').delete().eq('id', id), 'remove volunteer');
    });
    return;
  }
  const row = e.target.closest('[data-edit-volunteer]');
  if(row) startEditVolunteer(row.dataset.editVolunteer);
});

document.getElementById('roster-list').addEventListener('change', async e=>{
  const select = e.target.closest('[data-status-volunteer]');
  if(!select) return;
  const volunteerId = select.dataset.statusVolunteer;
  const status = select.value;
  const evtId = currentEvent().id;
  if(status==='potential'){
    await db(sb.from('event_volunteer_status').delete().eq('event_id', evtId).eq('volunteer_id', volunteerId), 'clear volunteer status');
  }else{
    await db(sb.from('event_volunteer_status').upsert(
      {event_id: evtId, volunteer_id: volunteerId, status},
      {onConflict: 'event_id,volunteer_id'}
    ), 'set volunteer status');
  }
});

/* ---------------------------------------------------------------
   IMPORT SIGNED-UP VOLUNTEERS — Signup.com has no API/MCP to pull
   from directly (checked: invite-only Zapier is the only integration
   they offer), so this takes whatever you paste from their export (or
   any list) instead: one name per line, or raw CSV/spreadsheet rows
   (first column wins, header rows are skipped).
---------------------------------------------------------------- */
function renderImportEventSelect(){
  const sel = document.getElementById('import-event-select');
  if(!sel) return;
  const prev = sel.value;
  sel.innerHTML = STATE.events.map(e=>{
    const label = e.name + (e.date ? ' ('+e.date+')' : '') + (e.id===STATE.activeEventId ? ' ★' : '');
    return `<option value="${e.id}">${label}</option>`;
  }).join('');
  // keep whatever was already picked if it's still a valid event, else
  // default to the current/active event — same convention the main
  // event dropdown in the header uses
  if(prev && STATE.events.find(e=>e.id===prev)) sel.value = prev;
  else sel.value = STATE.activeEventId || viewingEventId || (STATE.events[0]||{}).id || '';
}

// Collapses any run of whitespace — including non-breaking spaces
// (U+00A0), which web pages commonly use for table/cell spacing and
// which a copy straight off Signup.com's own page can carry along —
// down to one regular space, and trims. Used both to clean up the name
// text itself and, via nameMatchKey() below, to compare names for "is
// this already someone on the roster" without a stray nbsp/double-space
// making two identical names look different and slip past the
// duplicate check.
function cleanNameText(s){
  return s.replace(/[\s\u00A0]+/g, ' ').trim();
}
function nameMatchKey(s){
  return cleanNameText(s).toLowerCase();
}

function parseSignupNames(raw){
  const HEADER_WORDS = new Set(['name','full name','volunteer','volunteer name','participant','participant name']);
  const seen = new Set();
  const names = [];
  raw.split(/\r?\n/).forEach(line=>{
    // Signup.com's own participant list copies as a multi-column grid —
    // several names side by side on one line, tab-separated, each with
    // a "(N)" slot count appended (e.g. "Wayne Canfield (1)") — so every
    // TAB-separated cell on a line is its own name, not just the first.
    // A plain CSV/spreadsheet row instead uses commas to separate ONE
    // record's other fields (email, date, ...) after the name, so only
    // the first comma-segment of each cell is kept.
    line.split(/\t+/).forEach(cell=>{
      const firstField = cell.split(',')[0].trim();
      const name = cleanNameText(firstField.replace(/\s*\(\d+\)\s*$/, '')); // strip a trailing "(N)" slot count
      if(!name || HEADER_WORDS.has(name.toLowerCase())) return;
      const key = nameMatchKey(name);
      if(seen.has(key)) return; // duplicate within the pasted list itself
      seen.add(key);
      names.push(name);
    });
  });
  return names;
}

document.getElementById('import-names-btn').addEventListener('click', async ()=>{
  const eventId = document.getElementById('import-event-select').value;
  const resultEl = document.getElementById('import-names-result');
  if(!eventId){ resultEl.textContent = 'Pick an event first.'; return; }
  const names = parseSignupNames(document.getElementById('import-names-input').value);
  if(!names.length){ resultEl.textContent = 'Paste at least one name first.'; return; }

  statusEl.textContent = 'Importing…';
  resultEl.textContent = '';
  const existingByKey = new Map(STATE.roster.map(v=>[nameMatchKey(v.name), v]));
  const matchedIds = [];
  const toInsert = [];
  names.forEach(name=>{
    const existing = existingByKey.get(nameMatchKey(name));
    if(existing) matchedIds.push(existing.id);
    else toInsert.push(name);
  });

  if(toInsert.length){
    const {data:newRows, error} = await sb.from('roster').insert(toInsert.map(name=>({name}))).select();
    if(error){
      statusEl.textContent = 'Error: '+error.message;
      resultEl.textContent = 'Import failed while adding new volunteers — nothing was marked Signed Up.';
      return;
    }
    newRows.forEach(r=>matchedIds.push(r.id));
  }

  const {error: statusErr} = await sb.from('event_volunteer_status').upsert(
    matchedIds.map(id=>({event_id:eventId, volunteer_id:id, status:'signed_up'})),
    {onConflict: 'event_id,volunteer_id'}
  );
  if(statusErr){
    statusEl.textContent = 'Error: '+statusErr.message;
    resultEl.textContent = 'Volunteers were saved to the roster, but marking them Signed Up failed — try again.';
    return;
  }

  await reload();
  const evtName = (STATE.events.find(e=>e.id===eventId) || {}).name || 'the event';
  const addedCount = toInsert.length;
  resultEl.textContent = `Imported ${names.length}: ${addedCount} new, ${names.length-addedCount} already on the roster — all marked Signed Up for "${evtName}".`;
  document.getElementById('import-names-input').value = '';
  statusEl.textContent = 'All changes saved';
});

/* ---------------------------------------------------------------
   ACCESS TAB (Admin only) — set/change the shared Director and Lead
   Volunteer PINs via the set_role_pin RPC (schema.sql). app_access isn't
   part of STATE/loadState(), so this doesn't go through db()/reload() —
   just a direct RPC call and a status-line flash, same convention.
---------------------------------------------------------------- */
['director','lead_volunteer'].forEach(roleKey=>{
  const label = roleKey==='director' ? 'Director' : 'Lead Volunteer';
  document.getElementById(`access-pin-${roleKey}-save`).addEventListener('click', async ()=>{
    const pin = document.getElementById(`access-pin-${roleKey}`).value.trim();
    const confirm = document.getElementById(`access-pin-${roleKey}-confirm`).value.trim();
    const errorEl = document.getElementById(`access-pin-${roleKey}-error`);
    errorEl.textContent = '';
    if(pin.length < 4){ errorEl.textContent = 'PIN must be at least 4 characters.'; return; }
    if(pin !== confirm){ errorEl.textContent = 'PINs don\'t match.'; return; }
    statusEl.textContent = 'Saving…';
    const {error} = await sb.rpc('set_role_pin', {p_role: roleKey, p_pin: pin});
    if(error){
      statusEl.textContent = 'Error: '+error.message;
      errorEl.textContent = error.message;
      return;
    }
    document.getElementById(`access-pin-${roleKey}`).value = '';
    document.getElementById(`access-pin-${roleKey}-confirm`).value = '';
    statusEl.textContent = `${label} PIN updated`;
  });
});

/* ---------------------------------------------------------------
   VOLUNTEER ANALYTICS — Lead Volunteers can't see individual events'
   full editing tools (Templates/Crew Roster stay data-edit-only), but
   this tab is exactly the thing they DO need: who's actually reliable
   across the whole season, not just this one event. "Helped" means
   assigned to at least one item that event — the only real signal of
   participation this app tracks (there's no separate attendance
   check-in for volunteers themselves, only for badges).
---------------------------------------------------------------- */
// per volunteer: how many events they were actually assigned to help
// at (overall, and broken down by Home/Away/Contest — see events.event_type),
// how many they'd signed up for, badge check-in/out accountability, when
// they last helped, and a reliability % (helped/signed-up) where that
// comparison makes sense — a volunteer never marked "Signed Up" for
// anything yet (this feature is easy to skip) falls back to ranking by
// raw events helped instead of a misleading "0 signed up, so 0/0" pct.
function volunteerAnalytics(){
  const totalEvents = STATE.events.length;
  return STATE.roster.map(v=>{
    let eventsHelped = 0, eventsSignedUp = 0, anchoredCount = 0, lastHelpedDate = null;
    const eventsByType = {home:0, away:0, contest:0};
    STATE.events.forEach(evt=>{
      const statusRow = STATE.eventVolunteerStatus.find(s=>s.event_id===evt.id && s.volunteer_id===v.id);
      if(statusRow && statusRow.status==='signed_up') eventsSignedUp++;
      const helpedThisEvent = evt.items.some(it=>(it.assignedIds||[]).includes(v.id));
      if(helpedThisEvent){
        eventsHelped++;
        if(evt.eventType && eventsByType[evt.eventType]!==undefined) eventsByType[evt.eventType]++;
        if(evt.date && (!lastHelpedDate || evt.date>lastHelpedDate)) lastHelpedDate = evt.date;
      }
      if(evt.items.some(it=>(it.anchoredIds||[]).includes(v.id))) anchoredCount++;
    });
    // Signed Up and actually-assigned are tracked independently — a
    // Lead Volunteer can drag someone onto an item without ever
    // updating their roster status for that event — so eventsHelped
    // can exceed eventsSignedUp. Dividing by the larger of the two
    // keeps the percentage from reading as an impossible-looking 200%:
    // "helped every event on record" always reads as 100%, whether the
    // signup bookkeeping caught every one of those events or not.
    const reliabilityDenom = Math.max(eventsSignedUp, eventsHelped);
    const reliabilityPct = reliabilityDenom>0 ? Math.round(eventsHelped/reliabilityDenom*100) : null;
    // Badge accountability — every checkout under their name vs. every
    // checkin recorded under their name (a checkin always keeps the
    // ORIGINAL holder's volunteer_id, see handleBadgeAction in
    // badges.js, regardless of who physically taps "Check In"), plus
    // however many badges they're holding RIGHT NOW per badgeStatus —
    // so "still out, mid-event" reads differently from "unreturned and
    // nobody's touched it since."
    const badgeCheckouts = STATE.badgeEvents.filter(e=>e.volunteer_id===v.id && e.action==='checkout').length;
    const badgeReturns = STATE.badgeEvents.filter(e=>e.volunteer_id===v.id && e.action==='checkin').length;
    const badgesHeldNow = STATE.badges.filter(b=>{ const st = badgeStatus(b.id); return st.out && st.event.volunteer_id===v.id; }).length;
    return {
      id:v.id, name:v.name, role:v.role, totalEvents, eventsHelped, eventsSignedUp, eventsByType,
      anchoredCount, lastHelpedDate, reliabilityPct, badgeCheckouts, badgeReturns, badgesHeldNow
    };
  });
}
function reliabilityPillHTML(row){
  if(row.reliabilityPct===null){
    return row.eventsHelped
      ? `<div class="reliability-pill none" title="Never formally marked Signed Up for an event — ranked by events helped instead">${row.eventsHelped}/${row.totalEvents} events</div>`
      : `<div class="reliability-pill none" title="No signups or assignments on record yet">No data</div>`;
  }
  const cls = row.reliabilityPct>=80 ? 'good' : row.reliabilityPct>=50 ? 'mid' : 'low';
  const title = row.eventsHelped > row.eventsSignedUp
    ? `Helped at ${row.eventsHelped} events — ${row.eventsSignedUp} of them formally marked Signed Up`
    : `Helped ${row.eventsHelped} of ${row.eventsSignedUp} events signed up for`;
  return `<div class="reliability-pill ${cls}" title="${title}">${row.reliabilityPct}%</div>`;
}
// "Home 2 · Away 1 · Contest 2" — only the types they've actually
// helped at, so a volunteer who's only ever done Home games doesn't
// show two zeroes cluttering their row
function eventTypeBreakdownText(row){
  const parts = [];
  if(row.eventsByType.home) parts.push(`Home ${row.eventsByType.home}`);
  if(row.eventsByType.away) parts.push(`Away ${row.eventsByType.away}`);
  if(row.eventsByType.contest) parts.push(`Contest ${row.eventsByType.contest}`);
  return parts.join(' · ');
}
function badgeAccountabilityHTML(row){
  if(!row.badgeCheckouts) return '';
  const outstanding = row.badgeCheckouts - row.badgeReturns;
  const cleanReturn = outstanding<=0;
  const cls = cleanReturn ? 'good' : row.badgesHeldNow===outstanding ? 'mid' : 'low';
  const label = cleanReturn
    ? `🏷 Badges: ${row.badgeReturns}/${row.badgeCheckouts} returned — none lost`
    : row.badgesHeldNow===outstanding
      ? `🏷 Badges: ${row.badgeReturns}/${row.badgeCheckouts} returned (${row.badgesHeldNow} currently checked out)`
      : `🏷 Badges: ${row.badgeReturns}/${row.badgeCheckouts} returned — ${outstanding-row.badgesHeldNow} unaccounted for`;
  return `<div class="stat-sub badge-accountability ${cls}">${label}</div>`;
}
// Season-wide numbers for the dashboard cards up top — the "guidance"
// view, answered before you even scroll to a single name: how big is
// the roster, how much has actually happened this season and what kind,
// how reliable is the crew on average, who needs a nudge, what's still
// checked out right now.
function seasonSummary(rows){
  const eventTypeCounts = {home:0, away:0, contest:0, unspecified:0};
  STATE.events.forEach(evt=>{
    if(evt.eventType==='home'||evt.eventType==='away'||evt.eventType==='contest') eventTypeCounts[evt.eventType]++;
    else eventTypeCounts.unspecified++;
  });
  const withReliability = rows.filter(r=>r.reliabilityPct!==null);
  const avgReliability = withReliability.length ? Math.round(withReliability.reduce((s,r)=>s+r.reliabilityPct,0)/withReliability.length) : null;
  const neverHelped = rows.filter(r=>r.eventsHelped===0).length;
  const badgesOutNow = STATE.badges.filter(b=>badgeStatus(b.id).out).length;
  return {
    totalVolunteers: STATE.roster.length, totalEvents: STATE.events.length,
    eventTypeCounts, avgReliability, neverHelped, badgesOutNow
  };
}
function summaryCardsHTML(summary){
  const typeLine = [
    `Home ${summary.eventTypeCounts.home}`, `Away ${summary.eventTypeCounts.away}`, `Contest ${summary.eventTypeCounts.contest}`
  ].join(' · ') + (summary.eventTypeCounts.unspecified ? ` · ${summary.eventTypeCounts.unspecified} unclassified` : '');
  return `
    <div class="summary-card">
      <div class="summary-value">${summary.totalVolunteers}</div>
      <div class="summary-label">Volunteers on Roster</div>
    </div>
    <div class="summary-card">
      <div class="summary-value">${summary.totalEvents}</div>
      <div class="summary-label">Events This Season</div>
      <div class="summary-sub">${typeLine}</div>
    </div>
    <div class="summary-card">
      <div class="summary-value">${summary.avgReliability!==null ? summary.avgReliability+'%' : '—'}</div>
      <div class="summary-label">Avg. Reliability</div>
    </div>
    <div class="summary-card${summary.neverHelped ? ' attention' : ''}" ${summary.neverHelped ? 'data-analytics-focus="never-helped" role="button" tabindex="0"' : ''}>
      <div class="summary-value">${summary.neverHelped}</div>
      <div class="summary-label">Never Helped</div>
      ${summary.neverHelped ? `<div class="summary-sub">Tap to see who →</div>` : ''}
    </div>
    <div class="summary-card${summary.badgesOutNow ? ' attention' : ''}">
      <div class="summary-value">${summary.badgesOutNow}</div>
      <div class="summary-label">Badges Out Right Now</div>
    </div>`;
}
let analyticsSearchQuery = '';
let analyticsSort = 'reliability';
function renderAnalytics(){
  const list = document.getElementById('analytics-list');
  const summaryEl = document.getElementById('analytics-summary');
  if(!list || !summaryEl) return; // partials not in the DOM yet on first paint before boot finishes
  if(!STATE.roster.length){
    summaryEl.innerHTML = '';
    list.innerHTML = `<div class="analytics-empty">No volunteers on your roster yet.</div>`;
    return;
  }
  const allRows = volunteerAnalytics();
  summaryEl.innerHTML = summaryCardsHTML(seasonSummary(allRows));

  const q = analyticsSearchQuery.trim().toLowerCase();
  let rows = allRows;
  if(q) rows = rows.filter(r=>r.name.toLowerCase().includes(q));
  const byName = (a,b)=> a.name.localeCompare(b.name);
  const byHelped = (a,b)=> b.eventsHelped-a.eventsHelped || byName(a,b);
  // "most reliable first": no-signup-history volunteers sink to the
  // bottom — there's no percentage to compare, and burying "no data
  // yet" below anyone with an actual track record (good or bad) beats
  // interleaving them arbitrarily among real percentages.
  const byReliabilityDesc = (a,b)=>{
    if(a.reliabilityPct===null && b.reliabilityPct===null) return byHelped(a,b);
    if(a.reliabilityPct===null) return 1;
    if(b.reliabilityPct===null) return -1;
    return b.reliabilityPct-a.reliabilityPct || byHelped(a,b);
  };
  // "needs attention first" is the opposite priority for that same
  // no-data case: nobody needs a follow-up MORE than someone with zero
  // track record at all, so nulls float to the TOP here instead.
  const byReliabilityAsc = (a,b)=>{
    if(a.reliabilityPct===null && b.reliabilityPct===null) return byHelped(a,b);
    if(a.reliabilityPct===null) return -1;
    if(b.reliabilityPct===null) return 1;
    return a.reliabilityPct-b.reliabilityPct || byHelped(b,a);
  };
  rows.sort(
    analyticsSort==='helped' ? byHelped :
    analyticsSort==='name' ? byName :
    analyticsSort==='least' ? byReliabilityAsc :
    byReliabilityDesc
  );
  if(!rows.length){
    list.innerHTML = `<div class="analytics-empty">No volunteers match "${q}".</div>`;
    return;
  }
  list.innerHTML = rows.map(row=>`
    <div class="analytics-row">
      <div class="avatar">${initialsFor(row.name)}</div>
      <div class="info">
        <div class="name">${row.name}</div>
        ${row.role ? `<div class="role">${row.role}</div>` : ''}
      </div>
      <div class="stats">
        <div class="stat-line">${row.eventsHelped} of ${row.totalEvents} event${row.totalEvents===1?'':'s'} helped${row.anchoredCount ? ` · 📌 ${row.anchoredCount}` : ''}</div>
        ${eventTypeBreakdownText(row) ? `<div class="stat-sub">${eventTypeBreakdownText(row)}</div>` : ''}
        ${badgeAccountabilityHTML(row)}
        <div class="stat-sub">${row.lastHelpedDate ? `Last helped ${row.lastHelpedDate}` : 'Never assigned to help'}</div>
      </div>
      ${reliabilityPillHTML(row)}
    </div>`).join('');
}
const analyticsSearchInput = document.getElementById('analytics-search-input');
if(analyticsSearchInput){
  analyticsSearchInput.addEventListener('input', ()=>{
    analyticsSearchQuery = analyticsSearchInput.value;
    renderAnalytics();
  });
}
const analyticsSortSelect = document.getElementById('analytics-sort');
if(analyticsSortSelect){
  analyticsSortSelect.addEventListener('change', ()=>{
    analyticsSort = analyticsSortSelect.value;
    renderAnalytics();
  });
}
// "Never Helped" summary card — tapping it jumps straight to the
// people it's counting instead of just reporting the number and
// leaving you to hunt for them in the sorted list yourself
const analyticsSummaryEl = document.getElementById('analytics-summary');
if(analyticsSummaryEl){
  analyticsSummaryEl.addEventListener('click', e=>{
    if(!e.target.closest('[data-analytics-focus="never-helped"]')) return;
    analyticsSearchQuery = '';
    if(analyticsSearchInput) analyticsSearchInput.value = '';
    analyticsSort = 'least';
    if(analyticsSortSelect) analyticsSortSelect.value = 'least';
    renderAnalytics();
  });
}

