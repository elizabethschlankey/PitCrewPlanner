/* ---------------------------------------------------------------
   ITINERARY — a day-of timeline per event (bus departure, warm-up,
   performance time, load-out, ...). Viewable by everyone, same as the
   field/Needs a Hand — editing (paste-import, add/edit/remove an item)
   is data-badges-only (Director/Admin in Edit Mode, or Lead Volunteer),
   matching Crew Roster's access level. Lives as its own full-screen
   takeover (#itinerary-screen), the same mechanism #admin-screen uses
   — see itineraryOpen/applyScreen() in admin.js.

   This same screen doubles as the editor for Itinerary Templates (see
   editingItineraryTemplateId in state.js and the Itinerary Templates
   section of js/admin.js) — every function below reads/writes through
   currentItineraryCtx() instead of hardcoding itinerary_items/
   event_id, so paste-import/add/edit/remove all work identically
   whether the thing being edited is a real event's itinerary or a
   reusable template's.
---------------------------------------------------------------- */

// Finds every recognizable clock time ANYWHERE in the pasted text —
// not just at the start of a line break — and starts a new itinerary
// item at each one, running until the next recognized time (or the
// end of the text). Copying a schedule out of a PDF or a web page
// often collapses several time slots onto one wrapped line, or breaks
// lines in places that don't line up with each entry at all, so
// splitting only on \n (the original approach) would swallow every
// entry after the first one on a line into that first entry's label.
// Recognizes "7:00 AM - Label", "7:00pm Label", "07:00 - Label"
// (24-hour, no am/pm — hour bounded to 0-23), and "7 AM - Label" (no
// minutes — hour bounded to 1-12, since a bare hour is always spoken
// on a 12-hour clock). Those hour bounds are what keep this from
// misfiring on ordinary text containing numbers, e.g. a score "45:12"
// (45 is out of range) or "3 water jugs" (no colon, no am/pm). Also
// swallows a "-H:MM" range end glued directly onto the first time with
// no space ("5:00-6:15 pm") into that SAME match, using the range's
// START as the item's time — without this, "6:15" would wrongly start
// a second match of its own, splitting one activity into two entries
// (a real one, and a spurious untitled one at the bare start time).
// A normal "TIME - Label" separator is unaffected: that hyphen has a
// space before it, so it never matches this glued-range pattern.
// Falls back to one item per actual line break, each with no time, if
// the whole paste has no recognizable time in it anywhere — so a
// plain unordered list of events (no times at all) still imports.
// A leading "~" or "approx."/"approximately" glued right onto the
// front of a time (its own optional group, so it's consumed INTO the
// match instead of leaking into the previous item's label) marks that
// item tentative — same flag the Tentative checkbox sets by hand.
const ITINERARY_TIME_RE = /(?<tent1>~\s*|approx(?:imately)?\.?\s+)?\b(?<h1>[01]?\d|2[0-3]):(?<m1>[0-5]\d)(?:-(?:[01]?\d|2[0-3]):[0-5]\d)?\s*(?<ap1>[AaPp]\.?[Mm]\.?)?\b|(?<tent2>~\s*|approx(?:imately)?\.?\s+)?\b(?<h2>0?[1-9]|1[0-2])\s*(?<ap2>[AaPp]\.?[Mm]\.?)\b/g;
function cleanItineraryLabel(text){
  return text.replace(/[\r\n]+/g,' ').replace(/^[\s\-–—:.)]+/,'').replace(/\s+/g,' ').trim();
}
function parseItineraryText(raw){
  const matches = [...raw.matchAll(ITINERARY_TIME_RE)];
  if(!matches.length){
    return raw.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(label=>({timeValue:null, label, isTentative:false}));
  }
  const items = [];
  const preamble = cleanItineraryLabel(raw.slice(0, matches[0].index));
  if(preamble) items.push({timeValue:null, label:preamble, isTentative:false});

  matches.forEach((m, i)=>{
    const segmentEnd = i+1<matches.length ? matches[i+1].index : raw.length;
    const g = m.groups;
    const hour = g.h1!==undefined ? parseInt(g.h1,10) : parseInt(g.h2,10);
    const minute = g.m1!==undefined ? parseInt(g.m1,10) : 0;
    const ampmRaw = g.ap1 || g.ap2;
    const isTentative = !!(g.tent1 || g.tent2);
    let hour24 = hour;
    if(ampmRaw){
      const ampm = ampmRaw.toLowerCase().replace(/\./g,'');
      if(ampm==='pm' && hour<12) hour24 = hour+12;
      if(ampm==='am' && hour===12) hour24 = 0;
    }
    const timeValue = `${String(hour24).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00`;
    const afterToken = raw.slice(m.index+m[0].length, segmentEnd);
    const label = cleanItineraryLabel(afterToken) || '(untitled)';
    items.push({timeValue, label, isTentative});
  });
  return items;
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
// Live "NOW" line (see renderItinerary below) only needs to re-render
// itself, not the whole app, and only while someone's actually looking
// at the timeline — the interval starts on open and stops on close so
// it isn't quietly re-rendering a hidden screen every 30s forever.
let itineraryNowInterval = null;
function openItineraryScreen(){
  editingItineraryTemplateId = null;
  itineraryOpen = true;
  adminOpen = false;
  applyScreen();
  renderAll();
  if(typeof setMobileNavView==='function') setMobileNavView('itinerary');
  if(!itineraryNowInterval) itineraryNowInterval = setInterval(renderItinerary, 30000);
}
// Opens the SAME screen in template-editing mode instead — from a
// template's "Edit Items" button in Admin > Templates (js/admin.js).
function openItineraryTemplateEditor(id){
  if(!STATE.itineraryTemplates.find(t=>t.id===id)) return;
  editingItineraryTemplateId = id;
  itineraryOpen = true;
  adminOpen = false;
  applyScreen();
  renderAll();
}
// "Back" from a real event's itinerary returns to the field/mobile
// nav; "Back" out of a template's editor instead returns to Admin's
// Templates tab, since there's no event view to go back to
function closeItineraryScreen(){
  const wasEditingTemplate = !!editingItineraryTemplateId;
  editingItineraryTemplateId = null;
  itineraryOpen = false;
  if(itineraryNowInterval){ clearInterval(itineraryNowInterval); itineraryNowInterval = null; }
  if(wasEditingTemplate){
    adminOpen = true;
    setAdminTab('templates');
  }
  applyScreen();
  renderAll();
  if(!wasEditingTemplate && typeof setMobileNavView==='function') setMobileNavView('field');
}
document.getElementById('btn-itinerary').addEventListener('click', openItineraryScreen);
document.getElementById('btn-itinerary-back').addEventListener('click', closeItineraryScreen);
// The bottom nav's own Itinerary tab is handled by the mobile-nav
// click handler in field.js (it needs to close Crew's Admin screen
// first if that's what's open) — not wired up separately here.

// "HH:MM:SS", zero-padded to match Postgres's time format exactly —
// so it can be compared against item.timeValue with plain string
// comparison (works correctly since both are always zero-padded).
function nowTimeString(){
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
}

/* --- render ------------------------------------------------------ */
function renderItinerary(){
  const nameEl = document.getElementById('itinerary-event-name');
  const list = document.getElementById('itinerary-list');
  const titleEl = document.getElementById('itinerary-screen-title');
  const backBtn = document.getElementById('btn-itinerary-back');
  const applyCard = document.getElementById('itinerary-apply-template-card');
  if(!nameEl || !list) return;
  const isTemplate = !!editingItineraryTemplateId;
  if(titleEl) titleEl.textContent = isTemplate ? 'Itinerary Template' : 'Itinerary';
  if(backBtn) backBtn.textContent = isTemplate ? '← Back to Templates' : '← Back to Event';
  // applying a template onto ANOTHER template isn't a thing this UI
  // offers — that card only makes sense while looking at a real event
  if(applyCard) applyCard.style.display = isTemplate ? 'none' : '';
  const evt = isTemplate ? currentItineraryTemplate() : currentEvent();
  nameEl.textContent = evt.name || '';
  const items = currentItineraryCtx().items || [];
  if(!isTemplate){
    const applySelect = document.getElementById('itinerary-apply-template-select');
    if(applySelect){
      const prev = applySelect.value;
      applySelect.innerHTML = '<option value="">Choose a template…</option>' + itineraryTemplateOptionsFor(evt.eventType);
      if([...applySelect.options].some(o=>o.value===prev)) applySelect.value = prev;
    }
  }
  if(!items.length){
    list.innerHTML = `<div class="roster-empty">No itinerary yet${isTemplate ? ' in this template' : ' for this event'}.</div>`;
    return;
  }
  // Live "NOW" line — only for a real event happening TODAY (a
  // template has no date, and comparing clock time against an event
  // days away would be meaningless, so past/current/upcoming styling
  // and the line itself just don't appear in either case). currentIdx
  // is the LAST item at or before the current time — i.e. "what's
  // happening right now" — everything before it is past, everything
  // after is still upcoming. Untimed items never advance it (there's
  // no time to compare), so they always render as upcoming regardless
  // of where they sort.
  const showNow = !isTemplate && evt.date && evt.date===todayISO();
  const nowStr = showNow ? nowTimeString() : null;
  let currentIdx = -1;
  if(showNow){
    items.forEach((it,i)=>{ if(it.timeValue && it.timeValue<=nowStr) currentIdx = i; });
  }
  const rows = items.map((it,i)=>{
    const timeDisplay = formatItineraryTime(it.timeValue);
    const tentative = !!(timeDisplay && it.isTentative);
    const timeText = tentative ? `~${timeDisplay}` : (timeDisplay || 'TBD');
    const state = !showNow ? '' : i<currentIdx ? ' itinerary-past' : i===currentIdx ? ' itinerary-current' : '';
    const nowBadge = showNow && i===currentIdx ? ' <span class="itinerary-now-badge">Now</span>' : '';
    return `
    <div class="itinerary-row${state}">
      <div class="itinerary-time${timeDisplay ? '' : ' no-time'}${tentative ? ' tentative' : ''}"${tentative ? ' title="Approximate / tentative time"' : ''}>${timeText}${tentative ? '<div class="itinerary-tentative-tag">approx.</div>' : ''}</div>
      <div class="itinerary-body">
        <div class="itinerary-label">${it.label}${nowBadge}</div>
        ${it.notes ? `<div class="itinerary-notes">${it.notes}</div>` : ''}
      </div>
      <div class="itinerary-actions" data-badges-only>
        <button type="button" data-edit-itinerary="${it.uid}" title="Edit">✎</button>
        <button type="button" class="itinerary-remove-btn" data-remove-itinerary="${it.uid}" title="Remove">×</button>
      </div>
    </div>`;
  });
  // the divider itself sits right after whatever's currently happening
  // (or at the very top, if the day's schedule hasn't started yet)
  if(showNow){
    rows.splice(currentIdx+1, 0, `<div class="itinerary-now-line"><span>Now — ${formatItineraryTime(nowStr)}</span></div>`);
  }
  list.innerHTML = rows.join('');
}

/* --- add / edit form (mirrors startEditVolunteer/cancelEditVolunteer
   in admin.js) ------------------------------------------------------ */
let editingItineraryId = null;
const itineraryTimeInput = document.getElementById('itinerary-time-input');
const itineraryLabelInput = document.getElementById('itinerary-label-input');
const itineraryNotesInput = document.getElementById('itinerary-notes-input');
const itineraryTentativeInput = document.getElementById('itinerary-tentative-input');
const itineraryAddBtn = document.getElementById('itinerary-add-btn');
const itineraryCancelEditBtn = document.getElementById('itinerary-cancel-edit-btn');
const itineraryFormLabel = document.getElementById('itinerary-form-label');

function startEditItineraryItem(id){
  const it = (currentItineraryCtx().items||[]).find(i=>i.uid===id);
  if(!it) return;
  editingItineraryId = id;
  itineraryTimeInput.value = it.timeValue ? it.timeValue.slice(0,5) : '';
  itineraryLabelInput.value = it.label;
  itineraryNotesInput.value = it.notes || '';
  itineraryTentativeInput.checked = !!it.isTentative;
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
  itineraryTentativeInput.checked = false;
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
  const isTentative = timeValue ? itineraryTentativeInput.checked : false;
  const ctx = currentItineraryCtx();
  if(editingItineraryId){
    const ok = await db(sb.from(ctx.table).update({time_value: timeValue, label, notes, is_tentative: isTentative}).eq('id', editingItineraryId), 'update itinerary item');
    if(ok) cancelEditItineraryItem();
  }else{
    if(!ctx.ownerId) return;
    const ok = await db(sb.from(ctx.table).insert({[ctx.fk]: ctx.ownerId, time_value: timeValue, label, notes, is_tentative: isTentative}), 'add itinerary item');
    if(ok) cancelEditItineraryItem();
  }
});

document.getElementById('itinerary-list').addEventListener('click', e=>{
  const removeBtn = e.target.closest('[data-remove-itinerary]');
  if(removeBtn){
    const id = removeBtn.dataset.removeItinerary;
    const ctx = currentItineraryCtx();
    const it = (ctx.items||[]).find(i=>i.uid===id);
    openConfirm(`Remove "${it ? it.label : 'this item'}" from the itinerary?`, async ()=>{
      if(editingItineraryId===id) cancelEditItineraryItem();
      await db(sb.from(ctx.table).delete().eq('id', id), 'remove itinerary item');
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
  const ctx = currentItineraryCtx();
  if(!ctx.ownerId){ resultEl.textContent = editingItineraryTemplateId ? 'No template selected.' : 'No event selected.'; return; }
  statusEl.textContent = 'Importing…';
  const rows = parsed.map(p=>({[ctx.fk]: ctx.ownerId, time_value: p.timeValue, label: p.label, is_tentative: p.isTentative}));
  const {error} = await sb.from(ctx.table).insert(rows);
  if(error){
    statusEl.textContent = 'Error: '+error.message;
    resultEl.textContent = 'Import failed — nothing was added.';
    return;
  }
  await reload();
  const timedCount = parsed.filter(p=>p.timeValue).length;
  const tentativeCount = parsed.filter(p=>p.timeValue && p.isTentative).length;
  resultEl.textContent = `Imported ${parsed.length} item${parsed.length===1?'':'s'} — ${timedCount} with a recognized time${tentativeCount ? ` (${tentativeCount} marked tentative)` : ''}, ${parsed.length-timedCount} without.`;
  input.value = '';
  statusEl.textContent = 'All changes saved';
});

/* --- apply an itinerary template onto the current event ----------- */
const itineraryApplyTemplateBtn = document.getElementById('itinerary-apply-template-btn');
if(itineraryApplyTemplateBtn){
  itineraryApplyTemplateBtn.addEventListener('click', async ()=>{
    const resultEl = document.getElementById('itinerary-apply-template-result');
    const select = document.getElementById('itinerary-apply-template-select');
    resultEl.textContent = '';
    const templateId = select.value;
    if(!templateId){ resultEl.textContent = 'Pick a template first.'; return; }
    const tmpl = STATE.itineraryTemplates.find(t=>t.id===templateId);
    if(!tmpl || !tmpl.items.length){ resultEl.textContent = 'That template has no items yet.'; return; }
    const eventId = currentEvent().id;
    if(!eventId) return;
    statusEl.textContent = 'Applying…';
    const failed = await copyItineraryToEvent(clone(tmpl.items), eventId);
    await reload();
    resultEl.textContent = failed
      ? `Applied, but ${failed} of ${tmpl.items.length} item(s) failed to copy — open the browser console (F12) for the error`
      : `Added ${tmpl.items.length} item${tmpl.items.length===1?'':'s'} from “${tmpl.name}”.`;
    statusEl.textContent = 'All changes saved';
  });
}
