/* ---------------------------------------------------------------
   FIELD LOCK — for badge check-in/out duty on a phone: locks dragging
   new Equipment/Instruments onto the field and repositioning/deleting
   what's already there, without touching Badges (or opening an item to
   view/edit its details, which stays available either way). Persisted
   per device, same as the legend's open/closed state, since "I'm out
   here just doing badges" is an ongoing thing, not a one-tap toggle.
---------------------------------------------------------------- */
// defaults to locked — Equipment/Instruments placement is done once a
// season and rarely touched again, Badges is the thing happening every
// game, so "locked" is the safer out-of-the-box state. Only applies the
// first time on a given device; once someone's actually flipped it,
// that explicit choice (on OR off) sticks.
let fieldLocked = true;
try{
  const saved = localStorage.getItem('field-locked');
  if(saved!==null) fieldLocked = saved==='1';
}catch(e){}
// the lock is meant for badge duty on a live event, not template
// editing — if it's on from earlier event work and you step into Admin
// to edit a template (where the toggle itself is hidden, being
// data-event-only), it doesn't apply there, so there's never a
// dead-end where dragging is blocked with no visible way to unlock it
function isFieldLocked(){ return fieldLocked && !editingTemplateId; }
function applyFieldLockUI(){
  document.body.classList.toggle('field-locked', isFieldLocked());
  const toggle = document.getElementById('field-lock-toggle');
  if(toggle) toggle.checked = fieldLocked;
}
document.getElementById('field-lock-toggle').addEventListener('change', e=>{
  fieldLocked = e.target.checked;
  try{ localStorage.setItem('field-locked', fieldLocked?'1':'0'); }catch(e){}
  applyFieldLockUI();
  statusEl.textContent = fieldLocked ? 'Equipment/Instruments locked' : 'Equipment/Instruments unlocked';
});
applyFieldLockUI();

/* ---------------------------------------------------------------
   DRAG FROM PALETTE -> FIELD
---------------------------------------------------------------- */
let ghost = null;
// Pointer Events alone cover mouse, touch, and pen — no separate touch
// listeners needed. A device that fires both would otherwise start two
// overlapping drag sessions per tap, each inserting its own item.
let paletteDragActive = false;
function startPaletteDrag(typeId, label, clientX, clientY){
  if(mode!=='edit' || paletteDragActive || pinchActive || isFieldLocked()) return;
  paletteDragActive = true;
  const cat = catalogFor(typeId);
  const {w:ghostW, h:ghostH} = chipDims(cat);
  ghost = document.createElement('div');
  ghost.className = 'drag-ghost';
  ghost.innerHTML = `<div class="chip" style="width:${ghostW}px;height:${ghostH}px;background:${cat.color};color:#fff;">${ICONS[cat.icon]}</div><div class="tag">${label}</div>`;
  document.body.appendChild(ghost);
  moveGhost(clientX, clientY);
  function moveGhost(x,y){ ghost.style.left = x+'px'; ghost.style.top = y+'px'; ghost.style.transform='translate(-50%,-50%)'; }
  function onMove(e){ moveGhost(e.clientX, e.clientY); }
  let done = false;
  function onUp(e){
    if(done) return;
    done = true;
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.body.removeChild(ghost);
    ghost = null;
    paletteDragActive = false;
    const rect = fieldWrap.getBoundingClientRect();
    if(e.clientX>=rect.left && e.clientX<=rect.right && e.clientY>=rect.top && e.clientY<=rect.bottom){
      const xPct = ((e.clientX-rect.left)/rect.width)*100;
      const yPct = ((e.clientY-rect.top)/rect.height)*100;
      const ctx = currentItemsCtx();
      db(sb.from(ctx.table).insert({
        [ctx.fk]: ctx.ownerId, type_id: typeId, label, x_pct: xPct, y_pct: yPct
      }), 'add item');
    }
  }
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
}
function wirePaletteDrag(row, typeId, label){
  row.addEventListener('pointerdown', e=>{
    if(mode!=='edit' || isFieldLocked()) return;
    // let the Pit/Props buttons (see wireCategoryToggle below) work as
    // an ordinary click instead of hijacking their pointerdown into
    // dragging the whole row onto the field
    if(e.target.closest('[data-category-toggle-for]')) return;
    e.preventDefault();
    startPaletteDrag(typeId, label, e.clientX, e.clientY);
  });
}

// Pit/Props tag for an Equipment type — event-delegated on the palette
// list itself (buildPaletteList in render.js only builds each row's
// buttons once, but that's fine here, this doesn't need per-button
// listeners). Persists to item_type_notes, the same shared-per-type
// row What to Do/Wrap It Up already use.
palList.addEventListener('click', e=>{
  const btn = e.target.closest('.pal-cat-btn');
  if(!btn) return;
  const toggle = btn.closest('[data-category-toggle-for]');
  const typeId = toggle.dataset.categoryToggleFor;
  const newCategory = btn.classList.contains('active') ? '' : btn.dataset.cat;
  db(sb.from('item_type_notes').upsert({type_id: resolveTypeId(typeId), category: newCategory}, {onConflict:'type_id'}), 'set item category');
});

document.getElementById('custom-add-btn').addEventListener('click', ()=>{
  if(isFieldLocked()){ statusEl.textContent = 'Unlock Equipment/Instruments first.'; return; }
  const input = document.getElementById('custom-label');
  const val = input.value.trim();
  if(!val) return;
  const typeId = 'custom:'+val;
  const row = document.createElement('div');
  row.className = 'pal-item';
  row.dataset.type = typeId;
  row.innerHTML = `<div class="swatch" style="background:${CUSTOM_DEFAULTS.color}">${ICONS[CUSTOM_DEFAULTS.icon]}</div>
    <div><div class="label">${val}</div><div class="sub">Custom Item</div></div>
    <div class="count-badge" data-count-for="${typeId}">0</div>`;
  activeList.appendChild(row);
  wirePaletteDrag(row, typeId, val);
  renderPaletteCounts();
  input.value = '';
});

/* ---------------------------------------------------------------
   REPOSITION / DELETE / OPEN INSPECTOR FOR PLACED ITEMS
---------------------------------------------------------------- */
// On touch, opening an item requires a ~550ms hold with no movement —
// a plain tap does nothing. That keeps a pinch-zoom's first finger (or
// just scrolling around) from popping a modal open by accident. Mouse
// and pen keep the instant click-to-open workflow; only touch waits.
const LONG_PRESS_MS = 550;
dropLayer.addEventListener('pointerdown', e=>{
  if(pinchActive) return;
  // locked: still lets you tap/hold an item open to view or edit its
  // details (assignment, notes, badges, ...) — only the drag-to-move
  // and the on-field delete button are disabled
  const editable = mode==='edit' && !isFieldLocked();
  const delTarget = editable ? e.target.closest('[data-del]') : null;
  if(delTarget){
    const uidVal = delTarget.dataset.del;
    db(sb.from(currentItemsCtx().table).delete().eq('id', uidVal), 'delete item');
    return;
  }
  const placedEl = e.target.closest('.placed');
  if(!placedEl) return;
  e.preventDefault();
  const itemUid = placedEl.dataset.uid;
  const isTouch = e.pointerType==='touch';
  const rect = fieldWrap.getBoundingClientRect();
  const startX = e.clientX, startY = e.clientY;
  let moved = false, lastX=0, lastY=0, done=false;
  let holdTimer = null;

  function cleanup(){
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onCancel);
    if(holdTimer){ clearTimeout(holdTimer); holdTimer=null; }
    if(activeItemInteraction && activeItemInteraction.cancel===cancelSession) activeItemInteraction = null;
  }
  function cancelSession(){
    // an emerging pinch takes over — drop this session without moving,
    // opening, or saving anything
    if(done) return;
    done = true;
    cleanup();
  }
  activeItemInteraction = {cancel: cancelSession};

  function onMove(ev){
    if(ev.pointerId!==e.pointerId) return;
    if(!moved && (Math.abs(ev.clientX-startX)>4 || Math.abs(ev.clientY-startY)>4)){
      moved = true;
      if(holdTimer){ clearTimeout(holdTimer); holdTimer=null; }
    }
    if(!editable) return;
    let xPct = ((ev.clientX-rect.left)/rect.width)*100;
    let yPct = ((ev.clientY-rect.top)/rect.height)*100;
    xPct = Math.max(0,Math.min(100,xPct));
    yPct = Math.max(0,Math.min(100,yPct));
    lastX = xPct; lastY = yPct;
    placedEl.style.left = xPct+'%';
    placedEl.style.top = yPct+'%';
  }
  function onUp(ev){
    if(ev.pointerId!==e.pointerId || done) return;
    done = true;
    cleanup();
    if(editable && moved){
      db(sb.from(currentItemsCtx().table).update({x_pct:lastX, y_pct:lastY}).eq('id', itemUid), 'move item');
    }else if(!isTouch && !moved){
      openInspector(itemUid); // mouse/pen click — instant, no hold needed
    }
    // a touch tap that released before the hold fired does nothing
  }
  function onCancel(ev){
    if(ev.pointerId!==e.pointerId) return;
    done = true;
    cleanup();
  }

  if(isTouch){
    holdTimer = setTimeout(()=>{
      holdTimer = null;
      if(done || moved) return;
      done = true;
      cleanup();
      openInspector(itemUid);
    }, LONG_PRESS_MS);
  }

  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
  document.addEventListener('pointercancel', onCancel);
});

document.getElementById('assign-list').addEventListener('click', e=>{
  const anchorBtn = e.target.closest('[data-anchor-item]');
  if(anchorBtn){
    if(mode!=='edit') return;
    const itemUid = anchorBtn.dataset.anchorItem;
    const volunteerId = anchorBtn.dataset.anchorVolunteer;
    const item = currentEvent().items.find(it=>it.uid===itemUid);
    const isAnchored = !!(item && (item.anchoredIds||[]).includes(volunteerId));
    db(sb.from('item_assignments').update({anchored: !isAnchored}).eq('item_id', itemUid).eq('volunteer_id', volunteerId), 'toggle anchor');
    return; // don't also open the inspector for this click
  }
  const card = e.target.closest('[data-open-inspector]');
  if(card) openInspector(card.dataset.openInspector);
});

