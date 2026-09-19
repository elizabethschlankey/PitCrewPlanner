/* ---------------------------------------------------------------
   ITINERARY — a day-of timeline per event (bus departure, warm-up,
   performance time, load-out, ...). Viewable by everyone, same as the
   field/Needs a Hand — editing (paste-import, add/edit/remove an item)
   is data-badges-only (Director/Admin in Edit Mode, or Lead Volunteer),
   matching Crew Roster's access level. Lives as its own full-screen
   takeover (#itinerary-screen), the same mechanism #admin-screen uses
   — see itineraryOpen/applyScreen() in admin.js.
---------------------------------------------------------------- */

// Parses one pasted line into {timeValue, label}. timeValue is a
// "HH:MM:00" 24-hour string when a leading time is recognized, or null
// when it isn't — in which case the WHOLE line becomes the label
// (still imported, just sorts after every timed item). Recognizes
// "7:00 AM - Label", "7:00pm Label", "07:00 - Label" (24-hour, no
// am/pm), and "7 AM - Label" (no minutes). A bare leading number with
// neither a colon nor am/pm (e.g. "3 water jugs") is deliberately NOT
// treated as a time — too easy to misfire on ordinary text.
function parseItineraryLine(rawLine){
  const line = rawLine.trim();
  if(!line) return null;
  let hour = null, minute = 0, ampmRaw = null, rest = null;

  let m = line.match(/^(\d{1,2}):([0-5]\d)\s*([AaPp]\.?[Mm]\.?)?\s*[-–—:.)]*\s*(.*)$/);
  if(m){
    hour = parseInt(m[1],10); minute = parseInt(m[2],10); ampmRaw = m[3]; rest = m[4];
  }else{
    m = line.match(/^(\d{1,2})\s*([AaPp]\.?[Mm]\.?)\s*[-–—:.)]*\s*(.*)$/);
    if(m){ hour = parseInt(m[1],10); ampmRaw = m[2]; rest = m[3]; }
  }
  if(hour===null || hour<1 || hour>23) return {timeValue: null, label: line};

  let hour24 = hour;
  if(ampmRaw){
    const ampm = ampmRaw.toLowerCase().replace(/\./g,'');
    if(ampm==='pm' && hour<12) hour24 = hour+12;
    if(ampm==='am' && hour===12) hour24 = 0;
  }
  const timeValue = `${String(hour24).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00`;
  const label = (rest||'').trim() || '(untitled)';
  return {timeValue, label};
}
function parseItineraryText(raw){
  return raw.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(parseItineraryLine).filter(Boolean);
}
// "07:00:00" (Postgres time, or already-trimmed "07:00") -> "7:00 AM"
function formatItineraryTime(timeValue){
  if(!timeValue) return null;
  const [hStr, mStr] = timeValue.split(':');
  const hour = parseInt(hStr,10);
  const ampm = hour>=12 ? 'PM' : 'AM';
  let hour12 = hour % 12; if(hour12===0) hour12 = 12;
  return `${hour12}:${mStr} ${ampm}`;
}

/* --- screen open/close — same takeover mechanism as Admin ------- */
function openItineraryScreen(){
  itineraryOpen = true;
  adminOpen = false;
  applyScreen();
  renderAll();
  if(typeof setMobileNavView==='function') setMobileNavView('itinerary');
}
function closeItineraryScreen(){
  itineraryOpen = false;
  applyScreen();
  renderAll();
  if(typeof setMobileNavView==='function') setMobileNavView('field');
}
document.getElementById('btn-itinerary').addEventListener('click', openItineraryScreen);
document.getElementById('btn-itinerary-back').addEventListener('click', closeItineraryScreen);
const mobileItineraryBtn = document.querySelector('#mobile-nav [data-nav="itinerary"]');
if(mobileItineraryBtn) mobileItineraryBtn.addEventListener('click', openItineraryScreen);

/* --- render ------------------------------------------------------ */
function renderItinerary(){
  const nameEl = document.getElementById('itinerary-event-name');
  const list = document.getElementById('itinerary-list');
  if(!nameEl || !list) return;
  const evt = currentEvent();
  nameEl.textContent = evt.name || '';
  const items = evt.itinerary || [];
  if(!items.length){
    list.innerHTML = `<div class="roster-empty">No itinerary yet for this event.</div>`;
    return;
  }
  list.innerHTML = items.map(it=>{
    const timeDisplay = formatItineraryTime(it.timeValue);
    return `
    <div class="itinerary-row">
      <div class="itinerary-time${timeDisplay ? '' : ' no-time'}">${timeDisplay || 'No time set'}</div>
      <div class="itinerary-body">
        <div class="itinerary-label">${it.label}</div>
        ${it.notes ? `<div class="itinerary-notes">${it.notes}</div>` : ''}
      </div>
      <div class="itinerary-actions" data-badges-only>
        <button type="button" data-edit-itinerary="${it.uid}" title="Edit">✎</button>
        <button type="button" class="itinerary-remove-btn" data-remove-itinerary="${it.uid}" title="Remove">×</button>
      </div>
    </div>`;
  }).join('');
}

/* --- add / edit form (mirrors startEditVolunteer/cancelEditVolunteer
   in admin.js) ------------------------------------------------------ */
let editingItineraryId = null;
const itineraryTimeInput = document.getElementById('itinerary-time-input');
const itineraryLabelInput = document.getElementById('itinerary-label-input');
const itineraryNotesInput = document.getElementById('itinerary-notes-input');
const itineraryAddBtn = document.getElementById('itinerary-add-btn');
const itineraryCancelEditBtn = document.getElementById('itinerary-cancel-edit-btn');
const itineraryFormLabel = document.getElementById('itinerary-form-label');

function startEditItineraryItem(id){
  const it = (currentEvent().itinerary||[]).find(i=>i.uid===id);
  if(!it) return;
  editingItineraryId = id;
  itineraryTimeInput.value = it.timeValue ? it.timeValue.slice(0,5) : '';
  itineraryLabelInput.value = it.label;
  itineraryNotesInput.value = it.notes || '';
  itineraryFormLabel.textContent = 'Edit Item';
  itineraryAddBtn.textContent = 'Save Changes';
  itineraryCancelEditBtn.style.display = 'inline-block';
  itineraryLabelInput.focus();
}
function cancelEditItineraryItem(){
  editingItineraryId = null;
  itineraryTimeInput.value = '';
  itineraryLabelInput.value = '';
  itineraryNotesInput.value = '';
  itineraryFormLabel.textContent = 'Add an Item';
  itineraryAddBtn.textContent = 'Add Item';
  itineraryCancelEditBtn.style.display = 'none';
}
itineraryCancelEditBtn.addEventListener('click', cancelEditItineraryItem);

itineraryAddBtn.addEventListener('click', async ()=>{
  const label = itineraryLabelInput.value.trim();
  if(!label) return;
  const timeValue = itineraryTimeInput.value ? itineraryTimeInput.value+':00' : null;
  const notes = itineraryNotesInput.value.trim();
  if(editingItineraryId){
    const ok = await db(sb.from('itinerary_items').update({time_value: timeValue, label, notes}).eq('id', editingItineraryId), 'update itinerary item');
    if(ok) cancelEditItineraryItem();
  }else{
    const eventId = currentEvent().id;
    if(!eventId) return;
    const ok = await db(sb.from('itinerary_items').insert({event_id: eventId, time_value: timeValue, label, notes}), 'add itinerary item');
    if(ok) cancelEditItineraryItem();
  }
});

document.getElementById('itinerary-list').addEventListener('click', e=>{
  const removeBtn = e.target.closest('[data-remove-itinerary]');
  if(removeBtn){
    const id = removeBtn.dataset.removeItinerary;
    const it = (currentEvent().itinerary||[]).find(i=>i.uid===id);
    openConfirm(`Remove "${it ? it.label : 'this item'}" from the itinerary?`, async ()=>{
      if(editingItineraryId===id) cancelEditItineraryItem();
      await db(sb.from('itinerary_items').delete().eq('id', id), 'remove itinerary item');
    });
    return;
  }
  const editBtn = e.target.closest('[data-edit-itinerary]');
  if(editBtn) startEditItineraryItem(editBtn.dataset.editItinerary);
});

/* --- paste-import -------------------------------------------------- */
document.getElementById('itinerary-paste-btn').addEventListener('click', async ()=>{
  const resultEl = document.getElementById('itinerary-paste-result');
  const input = document.getElementById('itinerary-paste-input');
  resultEl.textContent = '';
  const parsed = parseItineraryText(input.value);
  if(!parsed.length){ resultEl.textContent = 'Paste at least one line first.'; return; }
  const eventId = currentEvent().id;
  if(!eventId){ resultEl.textContent = 'No event selected.'; return; }
  statusEl.textContent = 'Importing…';
  const rows = parsed.map(p=>({event_id: eventId, time_value: p.timeValue, label: p.label}));
  const {error} = await sb.from('itinerary_items').insert(rows);
  if(error){
    statusEl.textContent = 'Error: '+error.message;
    resultEl.textContent = 'Import failed — nothing was added.';
    return;
  }
  await reload();
  const timedCount = parsed.filter(p=>p.timeValue).length;
  resultEl.textContent = `Imported ${parsed.length} item${parsed.length===1?'':'s'} — ${timedCount} with a recognized time, ${parsed.length-timedCount} without.`;
  input.value = '';
  statusEl.textContent = 'All changes saved';
});
