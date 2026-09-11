/* ---------------------------------------------------------------
   ITEM INSPECTOR
---------------------------------------------------------------- */
const inspOverlay = document.getElementById('inspector-overlay');
const inspNeedsHelp = document.getElementById('insp-needs-help');
const inspHelpFields = document.getElementById('insp-help-fields');
const inspHelpersVal = document.getElementById('insp-helpers-val');
const inspTiming = document.getElementById('insp-timing');
const inspVolunteers = document.getElementById('insp-volunteers');
const inspNotes = document.getElementById('insp-notes');
const inspTeardown = document.getElementById('insp-teardown');
let inspectorUid = null;
let inspectorDraft = null;

inspTiming.innerHTML = TIMING_OPTIONS.map(t=>`<option value="${t.v}">${t.label}</option>`).join('');

// three-step read-only view: Placement / What to Do / Wrap It Up
document.querySelectorAll('#insp-view-body [data-insp-tab]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('#insp-view-body [data-insp-tab]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    ['placement','whattodo','wrapup'].forEach(name=>{
      document.getElementById('insp-tab-'+name).style.display = (name===btn.dataset.inspTab) ? 'flex' : 'none';
    });
  });
});
function resetInspViewTabs(){
  document.querySelectorAll('#insp-view-body [data-insp-tab]').forEach(b=>b.classList.remove('active'));
  document.querySelector('#insp-view-body [data-insp-tab="placement"]').classList.add('active');
  document.getElementById('insp-tab-placement').style.display = 'flex';
  document.getElementById('insp-tab-whattodo').style.display = 'none';
  document.getElementById('insp-tab-wrapup').style.display = 'none';
}

// same step-by-step idea as the volunteer view, but with its own extra
// "Assignment" comes first — it's the field an organizer opens an item
// to change most often (tagging it as needing help, picking who's
// covering it), so it shouldn't be buried behind Placement/What to Do
const EDIT_TAB_NAMES = ['assignment','placement','whattodo','wrapup'];
document.querySelectorAll('#insp-edit-body [data-edit-tab]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('#insp-edit-body [data-edit-tab]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    EDIT_TAB_NAMES.forEach(name=>{
      document.getElementById('edit-tab-'+name).style.display = (name===btn.dataset.editTab) ? 'flex' : 'none';
    });
  });
});
function resetInspEditTabs(){
  document.querySelectorAll('#insp-edit-body [data-edit-tab]').forEach(b=>b.classList.remove('active'));
  document.querySelector('#insp-edit-body [data-edit-tab="assignment"]').classList.add('active');
  EDIT_TAB_NAMES.forEach(name=>{
    document.getElementById('edit-tab-'+name).style.display = (name==='assignment') ? 'flex' : 'none';
  });
}

const inspViewBody = document.getElementById('insp-view-body');
const inspEditBody = document.getElementById('insp-edit-body');

function openInspector(itemUid){
  const it = currentItemsCtx().items.find(i=>i.uid===itemUid);
  if(!it) return;
  inspectorUid = itemUid;
  const cat = catalogFor(it.typeId);
  document.getElementById('insp-title').textContent = it.label;
  document.getElementById('insp-sub').textContent = cat.name;
  document.getElementById('insp-pos').textContent = 'On field: ' + describePosition(it.xPct, it.yPct);
  const inspIcon = document.getElementById('insp-icon');
  inspIcon.innerHTML = DETAIL_ICONS[cat.icon] || ICONS[cat.icon] || '';
  inspIcon.style.background = cat.color + '26'; // ~15% tint of the catalog color, so the reference icon still ties back to its field-chip color

  if(mode==='edit'){
    const typeNotes = typeNotesFor(it);
    inspectorDraft = {
      needsHelp: !!it.needsHelp,
      helpersNeeded: it.helpersNeeded || 1,
      assignedIds: (it.assignedIds||[]).slice(),
      notes: typeNotes.notes,
      timing: it.timing || '',
      studentName: it.studentName || '',
      teardownNotes: typeNotes.teardownNotes
    };
    document.getElementById('insp-student-group').style.display = isInstrumentItem(catalogFor(it.typeId)) ? 'flex' : 'none';
    resetInspEditTabs();
    renderMiniMap(it, 'edit-mini-map');
    initMediaPreview('setup', typeNotes.setupMediaUrl, typeNotes.setupMediaType);
    initMediaPreview('teardown', typeNotes.teardownMediaUrl, typeNotes.teardownMediaType);
    inspViewBody.style.display = 'none';
    inspEditBody.style.display = 'flex';
    syncInspectorUI();
  }else{
    inspectorDraft = null;
    inspEditBody.style.display = 'none';
    inspViewBody.style.display = 'flex';
    renderInspectorViewOnly(it);
  }
  inspOverlay.style.display = 'flex';
}
function closeInspector(){ inspOverlay.style.display = 'none'; inspectorUid = null; inspectorDraft = null; }

// read-only summary — what a volunteer sees when they click an item
// zoomed-in crop of the field, centered on an item, with a pulsing
// marker at its exact spot — reuses the live field SVG's own content
// (same document, so its var(--turf-a) etc. resolve normally) with a
// different, tighter viewBox instead of the full 0..W 0..H one
function renderMiniMap(it, targetId){
  const miniMap = document.getElementById(targetId || 'view-mini-map');
  const cx = (it.xPct/100)*W, cy = (it.yPct/100)*H;
  const zoom = 260; // crop window size in field units — a close-up with just enough surrounding context
  let vbX = cx - zoom/2, vbY = cy - zoom/2;
  vbX = Math.max(-20, Math.min(vbX, W - zoom + 20));
  vbY = Math.max(-20, Math.min(vbY, H - zoom + 20));
  miniMap.setAttribute('viewBox', `${vbX} ${vbY} ${zoom} ${zoom}`);
  miniMap.innerHTML = svg.innerHTML + `
    <circle cx="${cx}" cy="${cy}" r="10" fill="none" stroke="#ff5a3c" stroke-width="4" opacity=".85">
      <animate attributeName="r" values="9;20;9" dur="1.6s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values=".85;0;.85" dur="1.6s" repeatCount="indefinite"/>
    </circle>
    <circle cx="${cx}" cy="${cy}" r="6" fill="#ff5a3c" stroke="#fff" stroke-width="1.5"/>`;
}

// shows a saved video or photo (whichever `type` says) in the given
// pair of <video>/<img> elements, or hides both when there's no url
function renderViewMedia(videoElId, imgElId, url, type){
  const videoEl = document.getElementById(videoElId);
  const imgEl = document.getElementById(imgElId);
  if(url && type==='photo'){
    imgEl.src = url; imgEl.style.display = 'block';
    videoEl.style.display = 'none'; videoEl.removeAttribute('src');
  }else if(url){
    videoEl.src = url; videoEl.style.display = 'block';
    imgEl.style.display = 'none'; imgEl.removeAttribute('src');
  }else{
    videoEl.style.display = 'none'; videoEl.removeAttribute('src');
    imgEl.style.display = 'none'; imgEl.removeAttribute('src');
  }
}

function renderInspectorViewOnly(it){
  resetInspViewTabs();
  renderMiniMap(it);
  const typeNotes = typeNotesFor(it);
  const teardownEl = document.getElementById('view-teardown');
  if(typeNotes.teardownNotes){
    teardownEl.textContent = typeNotes.teardownNotes;
    teardownEl.classList.remove('empty');
  }else{
    teardownEl.textContent = 'No teardown steps provided for this role yet.';
    teardownEl.classList.add('empty');
  }
  // a real clip/photo for this equipment type replaces the generic illustration
  const genericEl = document.getElementById('view-teardown-generic');
  renderViewMedia('view-teardown-clip', 'view-teardown-photo', typeNotes.teardownMediaUrl, typeNotes.teardownMediaType);
  genericEl.style.display = typeNotes.teardownMediaUrl ? 'none' : 'flex';
  const studentGroup = document.getElementById('view-student-group');
  if(it.studentName){
    document.getElementById('view-student').textContent = it.studentName;
    studentGroup.style.display = 'flex';
  }else{
    studentGroup.style.display = 'none';
  }
  const descEl = document.getElementById('view-description');
  if(typeNotes.notes){
    descEl.textContent = typeNotes.notes;
    descEl.classList.remove('empty');
  }else{
    descEl.textContent = 'No description provided for this role yet.';
    descEl.classList.add('empty');
  }
  // setup media has no generic fallback illustration — just hide the
  // whole field-group when there's nothing uploaded for this equipment type
  const setupMediaGroup = document.getElementById('view-setup-media-group');
  if(typeNotes.setupMediaUrl){
    setupMediaGroup.style.display = 'flex';
    renderViewMedia('view-setup-clip', 'view-setup-photo', typeNotes.setupMediaUrl, typeNotes.setupMediaType);
  }else{
    setupMediaGroup.style.display = 'none';
  }
  const helpBlock = document.getElementById('view-help-block');
  if(it.needsHelp){
    helpBlock.style.display = 'flex';
    const names = (it.assignedIds||[]).map(volunteerName).filter(Boolean);
    const need = it.helpersNeeded||1;
    const pill = document.getElementById('view-helper-pill');
    pill.textContent = `${names.length}/${need} helpers`;
    pill.classList.toggle('filled', names.length>=need);
    const whoEl = document.getElementById('view-who');
    whoEl.innerHTML = names.length ? names.join(', ') : '<span class="unassigned">Unassigned — needs a volunteer</span>';
    const timingEl = document.getElementById('view-timing');
    if(it.timing){
      timingEl.textContent = (TIMING_OPTIONS.find(t=>t.v===it.timing)||{}).label || '';
      timingEl.style.display = 'inline-block';
    }else{
      timingEl.style.display = 'none';
    }
  }else{
    helpBlock.style.display = 'none';
  }
}
document.getElementById('insp-view-close').addEventListener('click', closeInspector);
// which OTHER items (excluding the one being edited) each already-
// assigned volunteer is on, keyed by volunteer id — this is what lets
// the Assignment picker both keep everyone else from being double-
// booked, and (for speakers only) allow — and highlight — a volunteer
// who's already covering one speaker to also cover a second, since
// speakers usually sit close together and one reliable person can run
// both instead of needing to explain the job to someone new
function otherAssignmentsByVolunteer(excludeItemUid){
  const map = new Map();
  currentEvent().items.forEach(it=>{
    if(it.uid===excludeItemUid) return;
    (it.assignedIds||[]).forEach(id=>{
      if(!map.has(id)) map.set(id, []);
      map.get(id).push(it);
    });
  });
  return map;
}

function syncInspectorUI(){
  inspNeedsHelp.checked = inspectorDraft.needsHelp;
  inspHelpFields.style.display = inspectorDraft.needsHelp ? 'flex' : 'none';
  inspHelpersVal.textContent = inspectorDraft.helpersNeeded;
  inspTiming.value = inspectorDraft.timing;
  inspNotes.value = inspectorDraft.notes;
  inspTeardown.value = inspectorDraft.teardownNotes;
  document.getElementById('insp-student').value = inspectorDraft.studentName;
  // templates aren't tied to real volunteers — the picker only makes
  // sense once this layout has become a real event
  const assignGroup = document.getElementById('insp-assign-volunteers-group');
  if(editingTemplateId){ assignGroup.style.display = 'none'; return; }
  assignGroup.style.display = '';
  const noRosterNote = document.getElementById('insp-no-roster');
  const currentIt = currentEvent().items.find(i=>i.uid===inspectorUid);
  const isSpeaker = !!currentIt && isSpeakerItem(catalogFor(currentIt.typeId));
  const isLadder = !!currentIt && isLadderItem(currentIt.typeId);
  const doubleUpEligible = isSpeaker || isLadder;
  const otherByVolunteer = otherAssignmentsByVolunteer(inspectorUid);
  // normally anyone assigned elsewhere is excluded so nobody's double-
  // booked — but for a speaker or the Small Ladder, someone already
  // covering only compatible items (see canDoubleUp: same-side speakers
  // with each other, or the ladder with any speaker) is still offered
  const available = STATE.roster.filter(v=>{
    const others = otherByVolunteer.get(v.id) || [];
    if(!others.length) return true;
    return doubleUpEligible && others.every(o=>canDoubleUp(currentIt.typeId, o.typeId));
  });
  if(!STATE.roster.length){
    inspVolunteers.innerHTML = '';
    noRosterNote.textContent = 'Your crew roster is empty — add volunteers under the Crew Roster tab first.';
    noRosterNote.style.display = 'block';
  }else if(!available.length){
    inspVolunteers.innerHTML = '';
    noRosterNote.textContent = 'Everyone on your roster is already assigned to another item this event.';
    noRosterNote.style.display = 'block';
  }else{
    noRosterNote.style.display = 'none';
    // group by this event's signup status so it's obvious who actually
    // signed up for THIS event vs. who's just a potential/backup —
    // signed-up people first, a Backups section only when there are
    // any, then everyone else on the roster. Within each group, anyone
    // already on a compatible item (a double-up candidate) bubbles to
    // the top as the preferred pick.
    const groups = {signed_up:[], backup:[], potential:[]};
    available.forEach(v=> groups[volunteerStatusFor(v.id)].push(v));
    if(doubleUpEligible){
      Object.values(groups).forEach(list=>{
        list.sort((a,b)=> (otherByVolunteer.has(b.id)?1:0) - (otherByVolunteer.has(a.id)?1:0));
      });
    }
    const checkRow = v => {
      const others = otherByVolunteer.get(v.id) || [];
      const preferred = doubleUpEligible && others.length>0;
      const preferredTag = preferred ? `<span class="preferred-tag">Also on ${others.map(o=>o.label).join(', ')}</span>` : '';
      return `
      <label class="volunteer-check${preferred ? ' volunteer-check-preferred' : ''}">
        <input type="checkbox" value="${v.id}" ${inspectorDraft.assignedIds.includes(v.id)?'checked':''}>
        ${v.name}${v.role ? ' — '+v.role : ''}${preferredTag}
      </label>`;
    };
    const section = (title, cls, key) =>
      groups[key].length ? `<div class="volunteer-check-section-title ${cls}">${title}</div>${groups[key].map(checkRow).join('')}` : '';
    inspVolunteers.innerHTML =
      section('Signed Up', 'signed-up', 'signed_up') +
      section('Backups', 'backup', 'backup') +
      section('Other Volunteers', '', 'potential');
  }
}
inspNeedsHelp.addEventListener('change', ()=>{ inspectorDraft.needsHelp = inspNeedsHelp.checked; syncInspectorUI(); });
document.getElementById('insp-helpers-minus').addEventListener('click', ()=>{ inspectorDraft.helpersNeeded = Math.max(1, inspectorDraft.helpersNeeded-1); syncInspectorUI(); });
document.getElementById('insp-helpers-plus').addEventListener('click', ()=>{ inspectorDraft.helpersNeeded = Math.min(6, inspectorDraft.helpersNeeded+1); syncInspectorUI(); });
inspVolunteers.addEventListener('change', e=>{
  const cb = e.target;
  if(cb.type!=='checkbox') return;
  if(cb.checked) inspectorDraft.assignedIds.push(cb.value);
  else inspectorDraft.assignedIds = inspectorDraft.assignedIds.filter(id=>id!==cb.value);
});
// Setup/teardown media capture — wired once per section (these elements
// are static, never rebuilt via innerHTML, unlike the badge modal's),
// reset per-open by initMediaPreview() above. Each section can hold
// either a short video clip or a still photo — the accept type takes
// both, and useInspMediaFile() below picks the right preview element
// based on the actual file's MIME type once one is chosen.
const inspMedia = {
  setup: {file:null, removed:false},
  teardown: {file:null, removed:false}
};
function initMediaPreview(section, url, type){
  inspMedia[section] = {file:null, removed:false};
  const preview = document.getElementById('insp-'+section+'-media-preview');
  const removeBtn = document.getElementById('insp-'+section+'-media-remove-btn');
  if(url){
    preview.innerHTML = type==='photo'
      ? `<img style="width:100%;border-radius:8px;max-height:200px;object-fit:contain;background:#000;" src="${url}">`
      : `<video controls playsinline style="width:100%;border-radius:8px;max-height:200px;background:#000;" src="${url}"></video>`;
    preview.style.display = 'block';
    removeBtn.style.display = 'inline-block';
  }else{
    preview.innerHTML = '';
    preview.style.display = 'none';
    removeBtn.style.display = 'none';
  }
}
function useInspMediaFile(section, file){
  if(!file) return;
  inspMedia[section] = {file, removed:false};
  const isVideo = file.type.startsWith('video/');
  const url = URL.createObjectURL(file);
  const preview = document.getElementById('insp-'+section+'-media-preview');
  preview.innerHTML = isVideo
    ? `<video controls playsinline style="width:100%;border-radius:8px;max-height:200px;background:#000;" src="${url}"></video>`
    : `<img style="width:100%;border-radius:8px;max-height:200px;object-fit:contain;background:#000;" src="${url}">`;
  preview.style.display = 'block';
  document.getElementById('insp-'+section+'-media-remove-btn').style.display = 'inline-block';
}
['setup','teardown'].forEach(section=>{
  document.getElementById('insp-'+section+'-media-capture-btn').addEventListener('click', ()=> document.getElementById('insp-'+section+'-media-capture-input').click());
  document.getElementById('insp-'+section+'-media-choose-btn').addEventListener('click', ()=> document.getElementById('insp-'+section+'-media-choose-input').click());
  document.getElementById('insp-'+section+'-media-capture-input').addEventListener('change', e=> useInspMediaFile(section, e.target.files[0]));
  document.getElementById('insp-'+section+'-media-choose-input').addEventListener('change', e=> useInspMediaFile(section, e.target.files[0]));
  document.getElementById('insp-'+section+'-media-remove-btn').addEventListener('click', ()=>{
    inspMedia[section] = {file:null, removed:true};
    const preview = document.getElementById('insp-'+section+'-media-preview');
    preview.innerHTML = '';
    preview.style.display = 'none';
    document.getElementById('insp-'+section+'-media-remove-btn').style.display = 'none';
  });
});

// uploads (or clears) whichever section's media actually changed since
// the inspector opened; mutates updatePayload in place. Returns an
// error object on failure, or null on success/no-op.
async function applyMediaChange(section, itemUid, updatePayload){
  const state = inspMedia[section];
  if(state.file){
    const safeName = state.file.name.replace(/[^a-zA-Z0-9.]/g,'_');
    const path = `${itemUid}/${section}-${Date.now()}-${safeName}`;
    const {error: upErr} = await sb.storage.from('item-media').upload(path, state.file, {contentType: state.file.type});
    if(upErr) return upErr;
    updatePayload[section+'_media_url'] = sb.storage.from('item-media').getPublicUrl(path).data.publicUrl;
    updatePayload[section+'_media_type'] = state.file.type.startsWith('video/') ? 'video' : 'photo';
  }else if(state.removed){
    updatePayload[section+'_media_url'] = null;
    updatePayload[section+'_media_type'] = null;
  }
  return null;
}

document.getElementById('insp-cancel').addEventListener('click', closeInspector);
document.getElementById('insp-save').addEventListener('click', async ()=>{
  const itemUid = inspectorUid;
  const it = currentItemsCtx().items.find(i=>i.uid===itemUid);
  const draft = inspectorDraft;
  const notes = inspNotes.value.trim();
  const teardownNotes = inspTeardown.value.trim();
  const timing = inspTiming.value;
  const studentName = document.getElementById('insp-student').value.trim();
  const uploading = inspMedia.setup.file || inspMedia.teardown.file;
  // if "needs a helper" is off, any volunteers previously checked for it
  // must be released too — otherwise they stay silently "reserved" on
  // an item that no longer shows up anywhere, blocking them from being
  // picked for anything else
  const assignedIds = draft.needsHelp ? draft.assignedIds : [];
  closeInspector();
  statusEl.textContent = uploading ? 'Uploading…' : 'Saving…';

  // needs_help/helpers/timing/student stay per placed item; What to Do,
  // Wrap It Up, and their media are shared per equipment type (see
  // typeNotesFor) — two separate writes, same as reading them
  const itemPayload = {
    needs_help: draft.needsHelp, helpers_needed: draft.helpersNeeded, timing, student_name: studentName
  };
  const typeNotesPayload = {type_id: resolveTypeId(it.typeId), notes, teardown_notes: teardownNotes};
  const setupErr = await applyMediaChange('setup', itemUid, typeNotesPayload);
  if(setupErr){ statusEl.textContent = 'Error: '+setupErr.message; return; }
  const teardownErr = await applyMediaChange('teardown', itemUid, typeNotesPayload);
  if(teardownErr){ statusEl.textContent = 'Error: '+teardownErr.message; return; }
  statusEl.textContent = 'Saving…';
  const itemsTable = currentItemsCtx().table;
  const {error:e1} = await sb.from(itemsTable).update(itemPayload).eq('id', itemUid);
  if(e1){ statusEl.textContent = 'Error: '+e1.message; return; }
  const {error:e2} = await sb.from('item_type_notes').upsert(typeNotesPayload, {onConflict:'type_id'});
  if(e2){ statusEl.textContent = 'Error: '+e2.message; return; }
  // templates aren't tied to real volunteers — no item_assignments table for them
  if(itemsTable==='items'){
    await sb.from('item_assignments').delete().eq('item_id', itemUid);
    if(assignedIds.length){
      await sb.from('item_assignments').insert(assignedIds.map(vid=>({item_id:itemUid, volunteer_id:vid})));
    }
  }
  await reload();
  statusEl.textContent = 'All changes saved';
});
document.getElementById('insp-delete').addEventListener('click', ()=>{
  const targetUid = inspectorUid;
  const targetTable = currentItemsCtx().table;
  closeInspector();
  openConfirm('Remove this item from the field?', async ()=>{
    await db(sb.from(targetTable).delete().eq('id', targetUid), 'delete item');
  });
});

