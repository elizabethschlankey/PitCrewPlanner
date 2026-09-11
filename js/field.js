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
   ZOOM TO PIT BOX
---------------------------------------------------------------- */
const fieldViewport = document.getElementById('field-viewport');
const btnZoomPit = document.getElementById('btn-zoom-pit');
const btnZoomReset = document.getElementById('btn-zoom-reset');
let isZoomed = false;

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
}
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

// mobile bottom nav — jumps to the field, opens the Badges tab, or (for
// Crew) opens the Admin screen's Crew Roster tab, since roster
// management now lives there rather than in the per-event palette.
document.querySelectorAll('#mobile-nav [data-nav]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('#mobile-nav button').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.nav;
    if(target==='field'){
      document.querySelector('.stage').scrollIntoView({behavior:'smooth', block:'start'});
    }else if(target==='crew'){
      adminOpen = true;
      editingTemplateId = null;
      setAdminTab('roster');
      applyScreen();
      renderAll();
    }else{
      const tabBtn = document.querySelector(`.tab-btn[data-tab="badges"]`);
      if(tabBtn) tabBtn.click();
      document.getElementById('palette').scrollIntoView({behavior:'smooth', block:'start'});
    }
  });
});

