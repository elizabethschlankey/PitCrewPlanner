/* ---------------------------------------------------------------
   SVG FIELD (identical geometry to the Artifact version)
---------------------------------------------------------------- */
const svg = document.getElementById('field');
const W = 1200, H = 620;
const fieldTop = 60, fieldBottom = 396, fieldLeft = 30, fieldRight = W-30;
const pitW = 640, pitH = 92;
const pitX = (W-pitW)/2, pitY = fieldBottom + 20;
// pit box -> blue line and blue line -> sideline are kept equal, so the
// line sits centered between the two rather than hugging either one
const pitGap = 16;
const trackY = pitY + pitH + pitGap*2, trackH = 46;
const hashY1 = fieldTop + (fieldBottom-fieldTop)*0.34;
const hashY2 = fieldTop + (fieldBottom-fieldTop)*0.66;

(function drawField(){
  let s = '';
  for(let i=0;i<20;i++){
    const x = fieldLeft + (i*(fieldRight-fieldLeft)/20);
    s += `<rect x="${x}" y="${fieldTop}" width="${(fieldRight-fieldLeft)/20}" height="${fieldBottom-fieldTop}" fill="${i%2===0?'var(--turf-a)':'var(--turf-b)'}"/>`;
  }
  const yards = 100;
  for(let y=0;y<=yards;y+=5){
    const x = fieldLeft + (y/yards)*(fieldRight-fieldLeft);
    const major = (y%10===0);
    s += `<line x1="${x}" y1="${fieldTop}" x2="${x}" y2="${fieldBottom}" stroke="${major?'var(--line)':'var(--line-dim)'}" stroke-width="${major?1.6:1}"/>`;
    if(major){
      const label = y<=50 ? y : 100-y;
      s += `<text x="${x}" y="${fieldTop+26}" text-anchor="middle" font-family="Oswald" font-size="16" font-weight="600" fill="var(--line)" stroke="#204a1d" stroke-width="3" paint-order="stroke">${label===0?'0':label}</text>`;
      s += `<text x="${x}" y="${fieldBottom-12}" text-anchor="middle" font-family="Oswald" font-size="16" font-weight="600" fill="var(--line)" stroke="#204a1d" stroke-width="3" paint-order="stroke">${label===0?'0':label}</text>`;
    }
  }
  [fieldTop, hashY1, hashY2, fieldBottom].forEach((yy,idx)=>{
    s += `<line x1="${fieldLeft}" y1="${yy}" x2="${fieldRight}" y2="${yy}" stroke="var(--line-dim)" stroke-width="${idx===0||idx===3?2:1}"/>`;
  });
  s += `<line x1="${fieldLeft + (fieldRight-fieldLeft)/2}" y1="${fieldTop}" x2="${fieldLeft + (fieldRight-fieldLeft)/2}" y2="${fieldBottom}" stroke="var(--gold)" stroke-width="1.4" stroke-dasharray="2 6" opacity=".7"/>`;
  s += `<rect x="${fieldLeft}" y="${fieldTop}" width="${fieldRight-fieldLeft}" height="${fieldBottom-fieldTop}" fill="none" stroke="var(--line)" stroke-width="2.5"/>`;
  // left half / right half labels — for splitting equipment or crew by wing.
  // Big, centered watermark-style text in the middle of each half.
  const sideLabelY = (fieldTop+fieldBottom)/2 + 10;
  const leftHalfX = fieldLeft + (fieldRight-fieldLeft)*0.25;
  const rightHalfX = fieldLeft + (fieldRight-fieldLeft)*0.75;
  s += `<text x="${leftHalfX}" y="${sideLabelY}" text-anchor="middle" font-family="Oswald" font-size="32" font-weight="700" fill="var(--line)" opacity=".5" letter-spacing="3" stroke="#204a1d" stroke-width="4" paint-order="stroke">SIDE 1 · LEFT</text>`;
  s += `<text x="${rightHalfX}" y="${sideLabelY}" text-anchor="middle" font-family="Oswald" font-size="32" font-weight="700" fill="var(--line)" opacity=".5" letter-spacing="3" stroke="#204a1d" stroke-width="4" paint-order="stroke">SIDE 2 · RIGHT</text>`;

  // Visitor (top) / Home (bottom) — same treatment, placed clear of the
  // hash rows and the center logo
  const midX = fieldLeft + (fieldRight-fieldLeft)/2;
  const visitorY = fieldTop + 62;
  const homeY = fieldBottom - 56;
  s += `<text x="${midX}" y="${visitorY}" text-anchor="middle" font-family="Oswald" font-size="32" font-weight="700" fill="var(--line)" opacity=".5" letter-spacing="3" stroke="#204a1d" stroke-width="4" paint-order="stroke">VISITOR</text>`;
  s += `<text x="${midX}" y="${homeY}" text-anchor="middle" font-family="Oswald" font-size="32" font-weight="700" fill="var(--line)" opacity=".5" letter-spacing="3" stroke="#204a1d" stroke-width="4" paint-order="stroke">HOME</text>`;
  s += `<rect x="${pitX-3}" y="${pitY-3}" width="${pitW+6}" height="${pitH+6}" fill="#0e1116"/>`;
  s += `<rect id="pit-box-rect" x="${pitX}" y="${pitY}" width="${pitW}" height="${pitH}" fill="#f4f1e8" stroke="#0e1116" stroke-width="4"/>`;
  s += `<text x="${pitX+pitW/2}" y="${pitY+pitH/2+16}" text-anchor="middle" font-family="Oswald" font-size="48" font-weight="700" fill="#12161c" opacity=".13" letter-spacing="4">PIT BOX</text>`;
  // the painted blue restraining line most HS fields have between the
  // team/pit box and the track — speakers' back wheels typically line up
  // on it, so it's a real placement reference, not just decoration
  s += `<line x1="0" y1="${pitY+pitH+pitGap}" x2="${W}" y2="${pitY+pitH+pitGap}" stroke="#2f6fed" stroke-width="2"/>`;
  s += `<rect x="0" y="${trackY}" width="${W}" height="${trackH}" fill="var(--track)"/>`;
  for(let i=0;i<40;i++){
    s += `<rect x="${i*(W/40)}" y="${trackY}" width="${(W/40)*0.55}" height="${trackH}" fill="var(--track-line)" opacity=".55"/>`;
  }
  s += `<text x="18" y="${trackY+28}" font-family="Oswald" font-size="14" font-weight="600" fill="#fff" opacity=".85">SIDELINE</text>`;
  const cx = fieldLeft + (fieldRight-fieldLeft)/2, cy = (fieldTop+fieldBottom)/2;
  s += `<g transform="translate(${cx-70},${cy-70}) scale(1.4)" opacity=".95">
    <polygon points="20,15 40,15 40,42 60,42 60,15 80,15 80,50 65,50 50,70 35,50 20,50" fill="#2c3f8f" stroke="#0c1230" stroke-width="3"/>
    <polygon points="46,55 54,55 50,72" fill="#e0b13c"/>
  </g>`;
  svg.innerHTML = s;
})();

function describePosition(xPct, yPct){
  const svgX = (xPct/100)*W, svgY = (yPct/100)*H;
  if(svgY > pitY - 6 && svgY < pitY+pitH+8 && svgX>=pitX-10 && svgX<=pitX+pitW+10) return 'Pit Box';
  if(svgY >= trackY-6) return 'Sideline / Staging';
  if(svgY < fieldTop-10) return 'Behind Back End Line';
  if(svgY > fieldBottom+10) return 'Behind Front End Line';
  // Home sits at the bottom of the field, Visitor at the top (see the
  // watermark labels above) — "front" sideline/hash is nearest Home,
  // "back" is nearest Visitor, matching the end-line labels just above.
  let row;
  if(svgY<hashY1) row='Back Sideline';
  else if(svgY<(hashY1+hashY2)/2) row='Back Hash';
  else if(svgY<hashY2) row='Front Hash';
  else row='Front Sideline';
  const pct = Math.max(0,Math.min(1,(svgX-fieldLeft)/(fieldRight-fieldLeft)));
  const yardRaw = Math.round(pct*100);
  const yard = yardRaw<=50 ? yardRaw : 100-yardRaw;
  let yardLabel;
  if(yard===50) yardLabel = '50 (Midfield)';
  else yardLabel = `Side ${yardRaw<50?1:2} · ${yard}`;
  return `${yardLabel} · ${row}`;
}

// compact yard-line reference for the on-field label — speakers and
// podiums need precise placement, so this shows at a glance without
// having to tap the item open
const ROW_ABBR = {'Front Sideline':'Fr SL','Front Hash':'Fr Hash','Back Hash':'Bk Hash','Back Sideline':'Bk SL'};
function describePositionShort(xPct, yPct){
  const svgX = (xPct/100)*W, svgY = (yPct/100)*H;
  if(svgY > pitY - 6 && svgY < pitY+pitH+8 && svgX>=pitX-10 && svgX<=pitX+pitW+10) return 'Pit Box';
  if(svgY >= trackY-6) return 'Sideline';
  if(svgY < fieldTop-10) return 'Beh. Back Line';
  if(svgY > fieldBottom+10) return 'Beh. Front Line';
  let row;
  if(svgY<hashY1) row='Back Sideline';
  else if(svgY<(hashY1+hashY2)/2) row='Back Hash';
  else if(svgY<hashY2) row='Front Hash';
  else row='Front Sideline';
  const pct = Math.max(0,Math.min(1,(svgX-fieldLeft)/(fieldRight-fieldLeft)));
  const yardRaw = Math.round(pct*100);
  const yard = yardRaw<=50 ? yardRaw : 100-yardRaw;
  const yardLabel = yard===50 ? '50' : `${yardRaw<50?1:2}·${yard}`;
  return `${yardLabel} ${ROW_ABBR[row]}`;
}
// which equipment types benefit from an always-visible position hint
function showsPositionRef(cat){
  return cat.icon==='speaker' || cat.icon==='sub' || cat.icon==='podium';
}
// only actual musical instruments have a student who plays them —
// equipment (podiums, speakers, generator, mixer, rack) doesn't
function isInstrumentItem(cat){
  return INSTRUMENT_CATALOG.some(c=>c.id===cat.id);
}

// the 4 speaker catalog entries (spkSL/spkLL/spkSR/spkLR) all share this
// icon — used to allow (and highlight) doubling a volunteer up across
// two speakers, since they usually sit close together on the field
function isSpeakerItem(cat){
  return cat.icon === 'speaker';
}

// which side of the field a speaker's on — spkSL/spkLL are both Left
// (small/large), spkSR/spkLR are both Right, so the type id's last
// letter always carries it. Doubling a volunteer up is only offered
// within the same side (small+large on their own side is fine, small on
// one side + small on the other isn't) — they usually stand together,
// a speaker on the opposite side of the field doesn't.
function speakerSide(typeId){
  return resolveTypeId(typeId).slice(-1);
}

// whoever's on the Small Podium can double up onto ANY speaker, either
// side — unlike speaker-to-speaker doubling, which is same-side only
// (see speakerSide above)
const PODIUM_DOUBLEUP_TYPE_ID = 'podS';
function isDoubleUpPodium(typeId){
  return resolveTypeId(typeId) === PODIUM_DOUBLEUP_TYPE_ID;
}
// true if two items can share the same volunteer as a double-up:
// same-side speakers, or the Small Podium with any speaker (either
// direction)
function canDoubleUp(typeIdA, typeIdB){
  const aPodium = isDoubleUpPodium(typeIdA), bPodium = isDoubleUpPodium(typeIdB);
  const aSpeaker = isSpeakerItem(catalogFor(typeIdA)), bSpeaker = isSpeakerItem(catalogFor(typeIdB));
  if(aPodium && bPodium) return true;
  if(aPodium) return bSpeaker;
  if(bPodium) return aSpeaker;
  return aSpeaker && bSpeaker && speakerSide(typeIdA)===speakerSide(typeIdB);
}

/* ---------------------------------------------------------------
   MOBILE FIELD SIZING — below 820px, .field-fill (styles.css) takes
   over the "grow to fill the tab" job from .field-viewport so plain
   flexbox (unambiguous) handles that, but that leaves .field-viewport
   itself with no way to size to the field's 1200:620 shape: it has no
   normal-flow content at all (field-wrap/offscreen-arrows/zoom-controls
   are all position:absolute), so CSS aspect-ratio has nothing to derive
   a size from once it isn't stretched to fill its parent, and collapses
   toward zero instead. Sized here in JS instead — the same kind of
   geometry math zoomToPit() below already does — fitting the largest
   1200:620 box within whatever space .field-fill actually has, the way
   object-fit:contain would for a replaced element like <img>.
---------------------------------------------------------------- */
const fieldFillEl = document.querySelector('.field-fill');
const MOBILE_FIELD_BREAKPOINT = 820;
function sizeMobileField(){
  if(window.innerWidth > MOBILE_FIELD_BREAKPOINT){
    fieldViewport.style.width = '';
    fieldViewport.style.height = '';
    return;
  }
  const fillRect = fieldFillEl.getBoundingClientRect();
  if(!fillRect.width || !fillRect.height) return; // hidden tab right now — sized again once it's shown, see setMobileNavView
  const ratio = 1200/620;
  let w = fillRect.width, h = w/ratio;
  if(h > fillRect.height){ h = fillRect.height; w = h*ratio; }
  fieldViewport.style.width = Math.floor(w)+'px';
  fieldViewport.style.height = Math.floor(h)+'px';
}
window.addEventListener('resize', sizeMobileField);

/* ---------------------------------------------------------------
   ZOOM TO PIT BOX
---------------------------------------------------------------- */
const fieldViewport = document.getElementById('field-viewport');
const btnZoomPit = document.getElementById('btn-zoom-pit');
const btnZoomReset = document.getElementById('btn-zoom-reset');
let isZoomed = false;
sizeMobileField();

// Icons scale naturally with the zoom transform (like zooming into a
// real map) instead of staying a fixed screen size — that's what lets
// you actually judge whether equipment fits tightly in the pit box.
// curScale/curTx/curTy are the single source of truth for the field's
// transform — both the zoom buttons and pinch-to-zoom write to them.
let curScale = 1, curTx = 0, curTy = 0;
function applyFieldTransform(){
  fieldWrap.style.transform = `translate(${curTx}px,${curTy}px) scale(${curScale})`;
  isZoomed = curScale > 1.001;
  btnZoomPit.style.display = isZoomed ? 'none' : 'inline-block';
  btnZoomReset.style.display = isZoomed ? 'inline-block' : 'none';
  updateOffscreenArrows();
}

/* ---------------------------------------------------------------
   OFF-SCREEN ARROWS — zoomed into the Pit Box, a Needs a Hand item can
   end up entirely outside the crop. Points toward each one from the
   edge of the viewport instead of leaving it silently out of view.
   Tapping an arrow re-centers the (still-zoomed) view on that item.
---------------------------------------------------------------- */
const offscreenArrowsLayer = document.getElementById('offscreen-arrows');
function updateOffscreenArrows(){
  offscreenArrowsLayer.innerHTML = '';
  if(!isZoomed) return;
  const vRect = fieldViewport.getBoundingClientRect();
  if(!vRect.width || !vRect.height) return;
  const margin = 34;
  const cx = vRect.width/2, cy = vRect.height/2;
  const halfW = Math.max(cx-margin, 10), halfH = Math.max(cy-margin, 10);
  currentItemsCtx().items.filter(it=>it.needsHelp).forEach(it=>{
    const screenX = curTx + (it.xPct/100)*vRect.width*curScale;
    const screenY = curTy + (it.yPct/100)*vRect.height*curScale;
    if(screenX>=0 && screenX<=vRect.width && screenY>=0 && screenY<=vRect.height) return; // already visible
    const dx = screenX-cx, dy = screenY-cy;
    const angle = Math.atan2(dy, dx);
    const ux = Math.cos(angle), uy = Math.sin(angle);
    // clamp the direction vector to the viewport rectangle's edge
    const scale = (Math.abs(ux)*halfH > Math.abs(uy)*halfW) ? halfW/Math.abs(ux) : halfH/Math.abs(uy);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'offscreen-arrow';
    btn.style.left = (cx+ux*scale)+'px';
    btn.style.top = (cy+uy*scale)+'px';
    btn.style.setProperty('--arrow-rot', (angle*180/Math.PI)+'deg');
    btn.title = `${it.label} needs a hand — off screen, tap to jump to it`;
    btn.dataset.jumpTo = it.uid;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none"><path d="M4 4L20 12L4 20Z" fill="currentColor"/></svg>`;
    offscreenArrowsLayer.appendChild(btn);
  });
}
offscreenArrowsLayer.addEventListener('click', e=>{
  const btn = e.target.closest('[data-jump-to]');
  if(!btn) return;
  const it = currentItemsCtx().items.find(i=>i.uid===btn.dataset.jumpTo);
  if(!it) return;
  const vRect = fieldViewport.getBoundingClientRect();
  curTx = vRect.width/2 - (it.xPct/100)*vRect.width*curScale;
  curTy = vRect.height/2 - (it.yPct/100)*vRect.height*curScale;
  applyFieldTransform();
});
function zoomToPit(){
  const vRect = fieldViewport.getBoundingClientRect();
  const scaleX = vRect.width / W, scaleY = vRect.height / H;
  const pxX = pitX*scaleX, pxY = pitY*scaleY, pxW = pitW*scaleX, pxH = pitH*scaleY;
  let zoom = Math.min((vRect.width*0.9)/pxW, (vRect.height*0.78)/pxH);
  zoom = Math.max(1, Math.min(zoom, 10));
  curScale = zoom;
  curTx = (vRect.width - pxW*zoom)/2 - pxX*zoom;
  curTy = (vRect.height - pxH*zoom)/2 - pxY*zoom;
  applyFieldTransform();
}
function zoomReset(){
  curScale = 1; curTx = 0; curTy = 0;
  applyFieldTransform();
}
btnZoomPit.addEventListener('click', zoomToPit);
btnZoomReset.addEventListener('click', zoomReset);
window.addEventListener('resize', ()=>{ if(isZoomed) zoomToPit(); });

/* ---------------------------------------------------------------
   PINCH TO ZOOM (touch) — scoped to the field, not the whole page.
   A pinch beginning on an item cancels that item's tap/hold/drag
   session so the two gestures never fight each other.
---------------------------------------------------------------- */
let pinchActive = false;
let activeItemInteraction = null; // set by the .placed pointerdown handler; lets a pinch cancel it
const pinchPointers = new Map(); // pointerId -> {x,y}, touch only
let pinchStartDist = 1, pinchStartScale = 1, pinchStartTx = 0, pinchStartTy = 0, pinchMidStart = {x:0,y:0};

function ptDist(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }
function ptMid(a,b){ return {x:(a.x+b.x)/2, y:(a.y+b.y)/2}; }

fieldViewport.addEventListener('pointerdown', e=>{
  if(e.pointerType!=='touch') return;
  pinchPointers.set(e.pointerId, {x:e.clientX, y:e.clientY});
  if(pinchPointers.size===2){
    pinchActive = true;
    if(activeItemInteraction) activeItemInteraction.cancel();
    fieldWrap.classList.add('pinching');
    const pts = [...pinchPointers.values()];
    pinchStartDist = Math.max(ptDist(pts[0], pts[1]), 1);
    pinchStartScale = curScale;
    pinchStartTx = curTx; pinchStartTy = curTy;
    pinchMidStart = ptMid(pts[0], pts[1]);
  }
}, {capture:true});

fieldViewport.addEventListener('pointermove', e=>{
  if(!pinchPointers.has(e.pointerId)) return;
  pinchPointers.set(e.pointerId, {x:e.clientX, y:e.clientY});
  if(!pinchActive || pinchPointers.size!==2) return;
  e.preventDefault();
  const pts = [...pinchPointers.values()];
  const dist = ptDist(pts[0], pts[1]);
  const mid = ptMid(pts[0], pts[1]);
  let scale = pinchStartScale * (dist/pinchStartDist);
  scale = Math.max(1, Math.min(scale, 10));
  // keep the field-space point under the fingers fixed as the scale changes
  const vRect = fieldViewport.getBoundingClientRect();
  const fieldPX = (pinchMidStart.x - vRect.left - pinchStartTx)/pinchStartScale;
  const fieldPY = (pinchMidStart.y - vRect.top - pinchStartTy)/pinchStartScale;
  curScale = scale;
  curTx = (mid.x - vRect.left) - fieldPX*scale;
  curTy = (mid.y - vRect.top) - fieldPY*scale;
  applyFieldTransform();
}, {capture:true});

function endPinchPointer(e){
  if(!pinchPointers.has(e.pointerId)) return;
  pinchPointers.delete(e.pointerId);
  if(pinchPointers.size<2 && pinchActive){
    pinchActive = false;
    fieldWrap.classList.remove('pinching');
  }
}
fieldViewport.addEventListener('pointerup', endPinchPointer, {capture:true});
fieldViewport.addEventListener('pointercancel', endPinchPointer, {capture:true});

// labels on/off — a per-viewer display preference (not shared app state),
// handy on a crowded mobile screen since the Needs a Hand panel already
// lists every assignment in full
const btnToggleLabels = document.getElementById('btn-toggle-labels');
let labelsHidden = false;
try{ labelsHidden = localStorage.getItem('field-labels-hidden')==='1'; }catch(e){}
function applyLabelVisibility(){
  document.body.classList.toggle('hide-labels', labelsHidden);
  btnToggleLabels.textContent = labelsHidden ? 'Show Labels' : 'Hide Labels';
}
btnToggleLabels.addEventListener('click', ()=>{
  labelsHidden = !labelsHidden;
  try{ localStorage.setItem('field-labels-hidden', labelsHidden?'1':'0'); }catch(e){}
  applyLabelVisibility();
});
applyLabelVisibility();

// mobile bottom nav — a real view switcher: exactly one of Field /
// Help (Needs a Hand) / Badges-or-Equipment fills the screen below the
// header at a time (see the body[data-mobile-view="..."] rules in
// styles.css), instead of everything being stacked in one long scroll
// with the field map squeezed in among it. Crew is the one exception —
// it still opens the existing Admin screen rather than a panel here.
function setMobileNavView(view){
  document.body.dataset.mobileView = view;
  document.querySelectorAll('#mobile-nav [data-nav]').forEach(b=>{
    b.classList.toggle('active', b.dataset.nav===view);
  });
  // .field-fill measures as 0x0 while its tab is hidden (display:none),
  // so re-measure now that switching to Field just made it visible
  if(view==='field') sizeMobileField();
}
document.querySelectorAll('#mobile-nav [data-nav]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const target = btn.dataset.nav;
    setMobileNavView(target);
    if(target==='crew'){
      adminOpen = true;
      editingTemplateId = null;
      setAdminTab('roster');
      applyScreen();
      renderAll();
    }else if(target==='palette'){
      // land on whichever sub-tab actually applies — Equipment for a
      // signed-in editor, Badges for everyone else who can reach this
      // tab at all (Lead Volunteer/Admin, via the data-badges-only gate)
      const wantTab = document.body.classList.contains('mode-edit') ? 'crew' : 'badges';
      const tabBtn = document.querySelector(`.tab-btn[data-tab="${wantTab}"]`);
      if(tabBtn) tabBtn.click();
    }
  });
});
setMobileNavView('field');

// mobile edit-mode "More" menu — Rename/New Event/Duplicate/Switch
// Template/Save as Template/Delete Event/Export Season Data/Clear
// Items all need to see the field at the same time as you use them,
// which is a desktop thing; on a phone they were just crowding the
// header/event bar above the field. Collapsing them into one menu
// (Go Live stays put — that one IS used from a phone) gives the
// Field tab noticeably more height to work with. Admin isn't in this
// menu at all — the Crew tab (bottom nav) already opens that screen.
(function(){
  const moreMenu = document.getElementById('mobile-more-menu');
  const moreToggle = document.getElementById('mobile-more-toggle');
  if(!moreMenu || !moreToggle) return;
  const ids = ['btn-export-data','btn-clear','btn-rename-event','btn-new-event',
    'btn-dup-event','btn-switch-template','btn-save-as-template','btn-del-event'];
  const homes = ids.map(id=>{
    const el = document.getElementById(id);
    return el ? {el, parent:el.parentNode, next:el.nextSibling} : null;
  }).filter(Boolean);

  function closeMenu(){
    document.body.classList.remove('mobile-more-open');
    moreMenu.hidden = true;
    moreToggle.setAttribute('aria-expanded', 'false');
  }
  function openMenu(){
    const r = moreToggle.getBoundingClientRect();
    moreMenu.style.top = Math.round(r.bottom + 8) + 'px';
    moreMenu.hidden = false;
    document.body.classList.add('mobile-more-open');
    moreToggle.setAttribute('aria-expanded', 'true');
  }

  // elements physically move into the menu on phones and back into
  // their original header/event-bar slot above that width, so desktop
  // stays exactly as it was — this only ever runs the "mobile" branch
  // on a screen narrow enough that the bottom nav is already showing
  const mq = window.matchMedia('(max-width:820px)');
  function layout(isMobile){
    homes.forEach(({el, parent, next})=>{
      if(isMobile){
        moreMenu.appendChild(el);
      }else if(el.parentNode !== parent){
        parent.insertBefore(el, next);
      }
    });
    closeMenu();
  }
  layout(mq.matches);
  mq.addEventListener('change', e=>layout(e.matches));

  moreToggle.addEventListener('click', ()=>{
    if(moreMenu.hidden) openMenu(); else closeMenu();
  });
  // tapping any action inside closes the menu — each button's own
  // handler (attached elsewhere, unaffected by the move) still runs
  moreMenu.addEventListener('click', e=>{ if(e.target.closest('button')) closeMenu(); });
  document.addEventListener('click', e=>{
    if(!moreMenu.hidden && !moreMenu.contains(e.target) && !moreToggle.contains(e.target)) closeMenu();
  });
})();

