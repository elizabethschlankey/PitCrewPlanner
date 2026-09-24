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
const eventFormItineraryTemplate = document.getElementById('event-form-itinerary-template');
const eventFormType = document.getElementById('event-form-type');
let eventFormMode = 'new';

function refreshEventFormItineraryOptions(){
  if(!eventFormItineraryTemplate) return;
  const prev = eventFormItineraryTemplate.value;
  eventFormItineraryTemplate.innerHTML = '<option value="">No Itinerary Template</option>' +
    itineraryTemplateOptionsFor(eventFormType.value);
  if([...eventFormItineraryTemplate.options].some(o=>o.value===prev)) eventFormItineraryTemplate.value = prev;
}
// re-filter to the newly-picked type every time it changes, while the
// form is actually open on "New Event" (picking a type shouldn't do
// anything while renaming/duplicating, where this select is hidden)
eventFormType.addEventListener('change', ()=>{
  if(eventFormMode==='new') refreshEventFormItineraryOptions();
});

function openEventForm(kind){
  eventFormMode = kind;
  // "start from a template" only makes sense for a brand new event —
  // duplicating/renaming an existing one already has its own layout
  eventFormTemplate.style.display = kind==='new' ? '' : 'none';
  if(eventFormItineraryTemplate) eventFormItineraryTemplate.style.display = kind==='new' ? '' : 'none';
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
  if(kind==='new') refreshEventFormItineraryOptions();
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
// same idea again, but for an Itinerary Template's items landing on an
// event's own itinerary — used by "New Event" (when an itinerary
// template is picked alongside/instead of a field template) and by
// "Apply an Itinerary Template" on the Itinerary screen itself.
// Always ADDS (never clears first), same as Switch Template for the
// field layout, so applying one is safe to do more than once or
// alongside items already added by hand.
async function copyItineraryToEvent(srcItems, eventId){
  let failed = 0;
  for(const it of srcItems){
    const {error} = await sb.from('itinerary_items').insert({
      event_id: eventId, time_value: it.timeValue, label: it.label,
      notes: it.notes || '', is_tentative: !!it.isTentative
    });
    if(error){ failed++; console.error(error); }
  }
  return failed;
}

function eventTypeLabel(t){
  return t==='home' ? 'Home' : t==='away' ? 'Away' : t==='contest' ? 'Competition' : 'Any Type';
}
// <option> list for picking an Itinerary Template — an "Any Type"
// template (event_type '') always shows up regardless of eventType,
// same as a specific-type one only shows for a matching event. Passing
// '' (no event type set yet, or the picker isn't scoped to one) shows
// every template, tagged so it's still clear which type each is for.
function itineraryTemplateOptionsFor(eventType){
  return STATE.itineraryTemplates
    .filter(t=>!eventType || !t.eventType || t.eventType===eventType)
    .map(t=>`<option value="${t.id}">${t.name}${t.eventType ? ` (${eventTypeLabel(t.eventType)})` : ''}</option>`)
    .join('');
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
      const itineraryTemplateId = eventFormItineraryTemplate ? eventFormItineraryTemplate.value || null : null;
      const {data:newEvt, error} = await sb.from('events').insert({name, date, event_type: eventType, template_id: templateId}).select().single();
      if(error){ statusEl.textContent = 'Error: '+error.message; return; }
      let failed = 0, total = 0;
      if(templateId){
        const tmpl = STATE.templates.find(t=>t.id===templateId);
        if(tmpl){ total = tmpl.items.length; failed = await copyItemsToEvent(clone(tmpl.items), newEvt.id); }
      }
      if(itineraryTemplateId){
        const itmpl = STATE.itineraryTemplates.find(t=>t.id===itineraryTemplateId);
        if(itmpl && itmpl.items.length) await copyItineraryToEvent(clone(itmpl.items), newEvt.id);
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
// itineraryOpen lives here (not js/itinerary.js) so it sits right next
// to its sibling adminOpen — both are "which full-screen takeover is
// showing" state that applyScreen() below manages together
let itineraryOpen = false;

function applyScreen(){
  document.body.classList.toggle('admin-open', adminOpen || !!editingTemplateId);
  document.body.classList.toggle('itinerary-open', itineraryOpen);
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
  itineraryOpen = false;
  editingTemplateId = null;
  editingItineraryTemplateId = null;
  // Templates stays Director/Admin-only (see its data-edit-only tab/
  // panel) — a Lead Volunteer opening Admin has nothing to do there, so
  // land them on Crew Roster instead: signing volunteers up is their
  // actual reason for being in here, Analytics is one tab away if
  // that's what they came for instead
  setAdminTab(mode==='edit' ? 'templates' : 'roster');
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
   ITINERARY TEMPLATES — same idea as Field Templates above (a
   reusable, named starting point an admin sets up once), but for the
   Itinerary tab's timeline instead of the field layout. Each one is
   tagged with an event_type (Home/Away/Competition, or "Any Type") so
   it surfaces as a match for that kind of event — see
   itineraryTemplateOptionsFor above, used both by "New Event"'s
   itinerary-template picker and by "Apply an Itinerary Template" on
   the Itinerary screen (js/itinerary.js). Editing a template's items
   reuses that same Itinerary screen — see openItineraryTemplateEditor
   there — rather than a separate editor UI.
---------------------------------------------------------------- */
function renderItineraryTemplates(){
  const list = document.getElementById('itinerary-template-list');
  if(!list) return;
  if(!STATE.itineraryTemplates.length){
    list.innerHTML = `<div class="roster-empty">No itinerary templates yet. Create one below to reuse as a starting schedule for matching events.</div>`;
    return;
  }
  list.innerHTML = STATE.itineraryTemplates.map(t=>`
    <div class="template-row">
      <div class="info">
        <div class="name">${t.name} <span class="pill template">${eventTypeLabel(t.eventType)}</span></div>
        <div class="count">${t.items.length} item${t.items.length===1?'':'s'}</div>
      </div>
      <button class="small primary" data-edit-itinerary-template="${t.id}" type="button">Edit Items</button>
      <button class="small ghost" data-rename-itinerary-template="${t.id}" type="button">Rename</button>
      <button class="small danger" data-del-itinerary-template="${t.id}" type="button">Delete</button>
    </div>`).join('');
}
document.getElementById('itinerary-template-list').addEventListener('click', e=>{
  const editBtn = e.target.closest('[data-edit-itinerary-template]');
  if(editBtn){
    if(typeof openItineraryTemplateEditor==='function') openItineraryTemplateEditor(editBtn.dataset.editItineraryTemplate);
    return;
  }
  const renameBtn = e.target.closest('[data-rename-itinerary-template]');
  if(renameBtn){ openItineraryTemplateForm('rename', renameBtn.dataset.renameItineraryTemplate); return; }
  const delBtn = e.target.closest('[data-del-itinerary-template]');
  if(delBtn){
    const id = delBtn.dataset.delItineraryTemplate;
    const t = STATE.itineraryTemplates.find(x=>x.id===id);
    openConfirm(`Delete itinerary template "${t.name}"? This can't be undone — events that already applied it keep their own copy of its items either way.`, async ()=>{
      await db(sb.from('itinerary_templates').delete().eq('id', id), 'delete itinerary template');
    });
  }
});

const itineraryTemplateForm = document.getElementById('itinerary-template-form');
const itineraryTemplateFormLabel = document.getElementById('itinerary-template-form-label');
const itineraryTemplateFormName = document.getElementById('itinerary-template-form-name');
const itineraryTemplateFormType = document.getElementById('itinerary-template-form-type');
let itineraryTemplateFormMode = 'new';
let itineraryTemplateFormTargetId = null;
function openItineraryTemplateForm(kind, id){
  itineraryTemplateFormMode = kind;
  itineraryTemplateFormTargetId = id || null;
  if(kind==='rename'){
    const t = STATE.itineraryTemplates.find(x=>x.id===id) || {name:'',eventType:''};
    itineraryTemplateFormLabel.textContent = 'Rename “'+t.name+'”';
    itineraryTemplateFormName.value = t.name;
    itineraryTemplateFormType.value = t.eventType;
  }else{
    itineraryTemplateFormLabel.textContent = 'New Itinerary Template';
    itineraryTemplateFormName.value = '';
    itineraryTemplateFormType.value = '';
  }
  document.getElementById('itinerary-template-form-create').textContent = kind==='rename' ? 'Save' : 'Create';
  itineraryTemplateForm.classList.add('open');
  itineraryTemplateFormName.focus();
}
document.getElementById('btn-new-itinerary-template').addEventListener('click', ()=>openItineraryTemplateForm('new'));
document.getElementById('itinerary-template-form-cancel').addEventListener('click', ()=>itineraryTemplateForm.classList.remove('open'));
const itineraryTemplateFormCreateBtn = document.getElementById('itinerary-template-form-create');
itineraryTemplateFormCreateBtn.addEventListener('click', async ()=>{
  // same double-tap guard as template-form-create/event-form-create
  if(itineraryTemplateFormCreateBtn.disabled) return;
  const name = itineraryTemplateFormName.value.trim();
  if(!name) return;
  const eventType = itineraryTemplateFormType.value || '';
  itineraryTemplateFormCreateBtn.disabled = true;
  try{
    if(itineraryTemplateFormMode==='rename'){
      await db(sb.from('itinerary_templates').update({name, event_type: eventType}).eq('id', itineraryTemplateFormTargetId), 'rename itinerary template');
    }else{
      const {error} = await sb.from('itinerary_templates').insert({name, event_type: eventType});
      if(error){ statusEl.textContent = 'Error: '+error.message; return; }
      await reload();
      statusEl.textContent = 'All changes saved';
    }
    itineraryTemplateForm.classList.remove('open');
  }finally{
    itineraryTemplateFormCreateBtn.disabled = false;
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

/* ---------------------------------------------------------------
   AUTO-ASSIGN TO A RETURNING VOLUNTEER'S USUAL SPOT — the moment
   someone's marked Signed Up for an event, if they've been 📌
   anchored to some item type before (any past event — that's the
   whole point of anchoring: "this person reliably runs this spot
   every game"), and this event has a needs-a-hand item of that same
   type with room and nobody assigned yet, put them straight on it and
   re-anchor them there, so the streak keeps carrying forward with no
   manual re-dragging every single game. Silently does nothing if
   there's no anchor history for them, no matching item, or no open
   slot — this only ever ADDS an assignment, never bumps anyone else.
---------------------------------------------------------------- */
// Most recent anchored item across every event, by that event's date
// (falls back to '' so an event with no date sorts before any dated
// one rather than crashing the comparison) — "most recent" is what
// makes this self-correcting if someone's usual spot ever changes.
function findDesignatedPosition(volunteerId){
  let best = null;
  STATE.events.forEach(evt=>{
    const eventDate = evt.date || '';
    evt.items.forEach(it=>{
      if((it.anchoredIds||[]).includes(volunteerId) && (!best || eventDate>=best.eventDate)){
        best = {typeId: it.typeId, label: it.label, eventDate};
      }
    });
  });
  return best;
}
// reservedCounts (optional Map<itemId, count>) lets a caller looping
// over MANY volunteers in one batch (the paste-import below) track
// slots this same loop has already filled, without needing a full
// reload() between every single one — without it, two people signed
// up in the same paste could both read the item as having room and
// both land on it, over-booking a one-person slot.
async function autoAssignDesignatedPosition(volunteerId, eventId, reservedCounts){
  const designated = findDesignatedPosition(volunteerId);
  if(!designated) return null;
  const evt = STATE.events.find(e=>e.id===eventId);
  if(!evt) return null;
  if(evt.items.some(it=>(it.assignedIds||[]).includes(volunteerId))) return null; // already on something this event
  const candidates = evt.items.filter(it=>{
    if(it.typeId!==designated.typeId || !it.needsHelp) return false;
    const reserved = reservedCounts ? (reservedCounts.get(it.uid)||0) : 0;
    return (it.assignedIds||[]).length + reserved < (it.helpersNeeded||1);
  });
  if(!candidates.length) return null;
  // several of the same type (e.g. three marimbas) — prefer the one
  // whose label matches their historical spot over just "the first one"
  const target = candidates.find(it=>it.label===designated.label) || candidates[0];
  const {error} = await sb.from('item_assignments').insert({item_id: target.uid, volunteer_id: volunteerId, anchored: true});
  if(error){ console.error(error); return null; }
  if(reservedCounts) reservedCounts.set(target.uid, (reservedCounts.get(target.uid)||0)+1);
  return target;
}

document.getElementById('roster-list').addEventListener('change', async e=>{
  const select = e.target.closest('[data-status-volunteer]');
  if(!select) return;
  const volunteerId = select.dataset.statusVolunteer;
  const status = select.value;
  const evtId = currentEvent().id;
  if(status==='potential'){
    await db(sb.from('event_volunteer_status').delete().eq('event_id', evtId).eq('volunteer_id', volunteerId), 'clear volunteer status');
  }else{
    const ok = await db(sb.from('event_volunteer_status').upsert(
      {event_id: evtId, volunteer_id: volunteerId, status},
      {onConflict: 'event_id,volunteer_id'}
    ), 'set volunteer status');
    if(ok && status==='signed_up'){
      const assigned = await autoAssignDesignatedPosition(volunteerId, evtId);
      if(assigned){
        await reload();
        const v = STATE.roster.find(r=>r.id===volunteerId);
        statusEl.textContent = `${v ? v.name : 'Volunteer'} auto-assigned to their usual spot (${assigned.label})`;
      }
    }
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
  // same "put a returning volunteer back on their usual spot" as the
  // single Signed Up dropdown — just run for everyone this batch
  // marked Signed Up. reservedCounts tracks slots THIS loop has
  // already filled so two people in the same paste can't both land on
  // the same one-person item before either write actually lands.
  const reservedCounts = new Map();
  let autoAssignedCount = 0;
  for(const id of matchedIds){
    const assigned = await autoAssignDesignatedPosition(id, eventId, reservedCounts);
    if(assigned) autoAssignedCount++;
  }
  if(autoAssignedCount) await reload();

  const evtName = (STATE.events.find(e=>e.id===eventId) || {}).name || 'the event';
  const addedCount = toInsert.length;
  resultEl.textContent = `Imported ${names.length}: ${addedCount} new, ${names.length-addedCount} already on the roster — all marked Signed Up for "${evtName}"`
    + (autoAssignedCount ? `, ${autoAssignedCount} auto-assigned to their usual spot.` : '.');
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
// at (overall, and broken down by Home/Away/Competition/Other — see
// events.event_type), how many they'd signed up for, badge check-in/
// out accountability, and when they last helped. Plain counts
// throughout — an earlier version collapsed signup + badge history
// into one computed reliability %, but that number kept being more
// confusing than useful, so the raw numbers are what's shown instead
// and a Lead Volunteer can judge reliability with their own eyes.
function volunteerAnalytics(){
  const totalEvents = STATE.events.length;
  return STATE.roster.map(v=>{
    let eventsHelped = 0, eventsSignedUp = 0, anchoredCount = 0, lastHelpedDate = null;
    const eventsByType = {home:0, away:0, contest:0, other:0};
    STATE.events.forEach(evt=>{
      const statusRow = STATE.eventVolunteerStatus.find(s=>s.event_id===evt.id && s.volunteer_id===v.id);
      if(statusRow && statusRow.status==='signed_up') eventsSignedUp++;
      const helpedThisEvent = evt.items.some(it=>(it.assignedIds||[]).includes(v.id));
      if(helpedThisEvent){
        eventsHelped++;
        if(evt.eventType==='home'||evt.eventType==='away'||evt.eventType==='contest') eventsByType[evt.eventType]++;
        else eventsByType.other++; // unclassified events (event_type==='')
        if(evt.date && (!lastHelpedDate || evt.date>lastHelpedDate)) lastHelpedDate = evt.date;
      }
      if(evt.items.some(it=>(it.anchoredIds||[]).includes(v.id))) anchoredCount++;
    });
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
      anchoredCount, lastHelpedDate, badgeCheckouts, badgeReturns, badgesHeldNow
    };
  });
}
// compact "3/3" (or "1/3" flagged) for the Badges Returned column — a
// dash when they've never checked one out at all, so an empty column
// doesn't read as "0 returned" (bad) when it really means "N/A"
function badgeCellHTML(row){
  if(!row.badgeCheckouts) return `<span class="num-empty">—</span>`;
  const outstanding = row.badgeCheckouts - row.badgeReturns;
  const cls = outstanding<=0 ? 'good' : row.badgesHeldNow===outstanding ? 'mid' : 'low';
  const title = outstanding<=0
    ? 'All badge checkouts returned — none lost'
    : row.badgesHeldNow===outstanding
      ? `${row.badgesHeldNow} currently checked out`
      : `${outstanding-row.badgesHeldNow} unaccounted for`;
  return `<span class="badge-cell ${cls}" title="${title}">${row.badgeReturns}/${row.badgeCheckouts}</span>`;
}
// Season-wide numbers for the dashboard cards up top — the "guidance"
// view, answered before you even scroll to a single name: how big is
// the roster, how much has actually happened this season and what
// kind, how much help is the crew averaging, who needs a nudge,
// what's still checked out right now.
function seasonSummary(rows){
  const eventTypeCounts = {home:0, away:0, contest:0, unspecified:0};
  STATE.events.forEach(evt=>{
    if(evt.eventType==='home'||evt.eventType==='away'||evt.eventType==='contest') eventTypeCounts[evt.eventType]++;
    else eventTypeCounts.unspecified++;
  });
  const avgEventsHelped = rows.length ? (rows.reduce((s,r)=>s+r.eventsHelped,0)/rows.length) : 0;
  const neverHelped = rows.filter(r=>r.eventsHelped===0).length;
  const badgesOutNow = STATE.badges.filter(b=>badgeStatus(b.id).out).length;
  return {
    totalVolunteers: STATE.roster.length, totalEvents: STATE.events.length,
    eventTypeCounts, avgEventsHelped, neverHelped, badgesOutNow
  };
}
function summaryCardsHTML(summary){
  const typeLine = [
    `Home ${summary.eventTypeCounts.home}`, `Away ${summary.eventTypeCounts.away}`, `Competitions ${summary.eventTypeCounts.contest}`
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
      <div class="summary-value">${summary.avgEventsHelped.toFixed(1)}</div>
      <div class="summary-label">Avg. Events Helped / Volunteer</div>
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
let analyticsSort = 'helped';
function renderAnalytics(){
  const list = document.getElementById('analytics-list');
  const summaryEl = document.getElementById('analytics-summary');
  if(!list || !summaryEl) return; // partials not in the DOM yet on first paint before boot finishes
  const allRows = volunteerAnalytics();
  summaryEl.innerHTML = STATE.roster.length ? summaryCardsHTML(seasonSummary(allRows)) : '';
  if(!STATE.roster.length){
    list.innerHTML = `<tr><td colspan="9" class="analytics-empty">No volunteers on your roster yet.</td></tr>`;
    return;
  }

  const q = analyticsSearchQuery.trim().toLowerCase();
  let rows = allRows;
  if(q) rows = rows.filter(r=>r.name.toLowerCase().includes(q));
  const byName = (a,b)=> a.name.localeCompare(b.name);
  const byHelpedDesc = (a,b)=> b.eventsHelped-a.eventsHelped || byName(a,b);
  const byHelpedAsc = (a,b)=> a.eventsHelped-b.eventsHelped || byName(a,b);
  rows.sort(
    analyticsSort==='least' ? byHelpedAsc :
    analyticsSort==='name' ? byName :
    byHelpedDesc
  );
  if(!rows.length){
    list.innerHTML = `<tr><td colspan="9" class="analytics-empty">No volunteers match "${q}".</td></tr>`;
    return;
  }
  const numCell = n => n ? n : `<span class="num-empty">—</span>`;
  list.innerHTML = rows.map(row=>`
    <tr>
      <td class="volunteer-cell">
        <div class="avatar">${initialsFor(row.name)}</div>
        <div class="info">
          <div class="name">${row.name}</div>
          ${row.role ? `<div class="role">${row.role}</div>` : ''}
        </div>
      </td>
      <td class="num-cell">${numCell(row.eventsByType.home)}</td>
      <td class="num-cell">${numCell(row.eventsByType.away)}</td>
      <td class="num-cell">${numCell(row.eventsByType.contest)}</td>
      <td class="num-cell">${numCell(row.eventsByType.other)}</td>
      <td class="num-cell total-cell">${row.eventsHelped}${row.anchoredCount ? ` <span class="anchor-note" title="Anchored to ${row.anchoredCount} item(s) — Clear Volunteers leaves these assigned">📌${row.anchoredCount}</span>` : ''}</td>
      <td class="num-cell">${numCell(row.eventsSignedUp)}</td>
      <td class="num-cell">${badgeCellHTML(row)}</td>
      <td class="date-cell">${row.lastHelpedDate || '—'}</td>
    </tr>`).join('');
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

