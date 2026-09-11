/* ---------------------------------------------------------------
   TOOLBAR ACTIONS
---------------------------------------------------------------- */
document.getElementById('btn-clear').addEventListener('click', ()=>{
  const ctx = currentItemsCtx();
  if(!ctx.items.length) return;
  const label = editingTemplateId ? currentTemplate().name : currentEvent().name;
  const needsHelpIds = ctx.items.filter(it=>it.needsHelp).map(it=>it.uid);

  openConfirm(
    `Clear "${label}"? "Needs a Hand" releases the tags/volunteers but keeps items on the field. `+
    `"Clear Field" also removes every item. Either way, this can't be undone.`,
    [
    {
      label: `Needs a Hand${needsHelpIds.length ? ' ('+needsHelpIds.length+')' : ''}`,
      className: 'danger',
      onClick: async ()=>{
        if(!needsHelpIds.length){ statusEl.textContent = 'Nothing is tagged as needing help.'; return; }
        // untags every item and releases its assigned volunteers, but
        // leaves the items themselves right where they are on the field
        statusEl.textContent = 'Saving…';
        const {error} = await sb.from(ctx.table).update({needs_help:false}).in('id', needsHelpIds);
        if(error){ statusEl.textContent = 'Error: '+error.message; return; }
        if(ctx.table==='items'){
          // anchored assignments (a reliable helper who always covers
          // this spot) survive even a full "Needs a Hand" clear
          const {error: ae} = await sb.from('item_assignments').delete().in('item_id', needsHelpIds).eq('anchored', false);
          if(ae) console.error(ae);
        }
        await reload();
        statusEl.textContent = 'All changes saved';
      }
    },
    {
      label: 'Clear Field',
      className: 'danger',
      onClick: async ()=>{
        // deleting the items cascades to item_assignments in the DB, so
        // this removes both the field layout and who's assigned to it
        await db(sb.from(ctx.table).delete().eq(ctx.fk, ctx.ownerId), 'clear items');
      }
    }
  ]);
});

// Unassigns everyone from every "Needs a Hand" item in the current
// event — but leaves the items tagged/placed exactly as they are, and
// skips anchored assignments (a reliable helper who runs the same spot
// every game shouldn't need re-assigning each week). That's the
// difference from "Clear Items → Needs a Hand" above: this only touches
// who's assigned, never the needs-help tag or the field layout itself.
document.getElementById('btn-clear-volunteers').addEventListener('click', ()=>{
  const items = currentEvent().items.filter(it=>it.needsHelp);
  const itemIds = items.map(it=>it.uid);
  const assignedCount = items.reduce((sum,it)=> sum + (it.assignedIds||[]).length, 0);
  const anchoredCount = items.reduce((sum,it)=> sum + (it.anchoredIds||[]).length, 0);
  if(!assignedCount){ statusEl.textContent = 'Nobody is currently assigned.'; return; }
  const clearable = assignedCount - anchoredCount;
  if(!clearable){ statusEl.textContent = 'Everyone assigned is anchored — nothing to clear.'; return; }

  openConfirm(
    `Clear assigned volunteers from "${currentEvent().name}"? ${clearable} assignment${clearable===1?'':'s'} will be unassigned.` +
    (anchoredCount ? ` ${anchoredCount} anchored assignment${anchoredCount===1?'':'s'} will be kept.` : ''),
    async ()=>{
      await db(sb.from('item_assignments').delete().in('item_id', itemIds).eq('anchored', false), 'clear volunteers');
    }
  );
});

document.getElementById('btn-export').addEventListener('click', ()=>{
  statusEl.textContent = 'Preparing export…';
  try{
    // use the OUTER viewport, not #field-wrap — field-wrap itself carries
    // the pit-box zoom transform, so its rect balloons when zoomed in and
    // throws off every chip's size/position in the exported image
    const rect = fieldViewport.getBoundingClientRect();
    // the field SVG uses var(--turf-a) etc., which only resolve while it's
    // inline in the page. Exporting loads it as a standalone image with no
    // access to the page's CSS, so those variables silently fail — bake
    // the real colors into a cloned copy before serializing it out.
    const svgClone = svg.cloneNode(true);
    const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleEl.textContent = ':root{--turf-a:#3f7a3a;--turf-b:#457f41;--line:#f4f4ec;--line-dim:rgba(244,244,236,.35);--track:#8a3b23;--track-line:#c96a3f;--gold:#e0b13c;}';
    svgClone.insertBefore(styleEl, svgClone.firstChild);
    const svgData = new XMLSerializer().serializeToString(svgClone);

    // everything below is drawn at 2x canvas resolution for crispness —
    // coordinates already assume that doubling, matching how the field
    // image itself is drawn (no separate ctx.scale needed).
    const fieldW = rect.width*2, fieldH = rect.height*2;
    const helpItems = currentEvent().items.filter(it=>it.needsHelp);
    const timingLabel = v => (TIMING_OPTIONS.find(t=>t.v===v)||{}).label || '';
    const rowH = 92, rowHWithNotes = 128, headerH = 76, listPad = 32;
    const rowHeights = helpItems.map(it=>typeNotesFor(it).notes ? rowHWithNotes : rowH);
    const listH = helpItems.length ? headerH + rowHeights.reduce((a,b)=>a+b,0) + listPad : 0;

    const canvas = document.createElement('canvas');
    canvas.width = fieldW; canvas.height = fieldH + listH;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const svgBlob = new Blob([svgData], {type:'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(svgBlob);
    img.onload = ()=>{
      ctx.fillStyle = '#12161c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // safety-net backdrop in case any browser still fails to resolve
      // the inlined variables, so the export is never worse than blank
      ctx.fillStyle = '#3f7a3a';
      ctx.fillRect(0, 0, fieldW, fieldH);
      ctx.drawImage(img, 0, 0, fieldW, fieldH);
      URL.revokeObjectURL(url);

      currentEvent().items.forEach(it=>{
        const cat = catalogFor(it.typeId);
        const {w,h} = chipDims(cat);
        const x = (it.xPct/100)*fieldW;
        const y = (it.yPct/100)*fieldH;
        // canvas is rendered at 2x for crispness, so the CSS chip size
        // (w/h) already equals the half-extent in canvas-space
        const rx = w, ry = h;
        if(it.needsHelp){
          ctx.strokeStyle = '#d9772e'; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.roundRect(x-rx-3,y-ry-3,(rx+3)*2,(ry+3)*2,13); ctx.stroke();
        }
        ctx.fillStyle = cat.color;
        ctx.beginPath();
        const rr=10;
        ctx.moveTo(x-rx+rr,y-ry);
        ctx.arcTo(x+rx,y-ry,x+rx,y+ry,rr);
        ctx.arcTo(x+rx,y+ry,x-rx,y+ry,rr);
        ctx.arcTo(x-rx,y+ry,x-rx,y-ry,rr);
        ctx.arcTo(x-rx,y-ry,x+rx,y-ry,rr);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle='rgba(255,255,255,.6)'; ctx.lineWidth=2; ctx.stroke();
        ctx.fillStyle = '#f4f1e8';
        const padY = ry+18;
        ctx.font = '700 20px Inter, sans-serif';
        ctx.textAlign = 'center';
        const tw = ctx.measureText(it.label).width+16;
        ctx.fillRect(x-tw/2, y+padY-18, tw, 24);
        ctx.fillStyle = '#12161c';
        ctx.fillText(it.label, x, y+padY);

        // who's assigned (or how many are needed), right under the label —
        // mirrors the on-field "assign-note" shown on screen
        if(it.needsHelp){
          const names = (it.assignedIds||[]).map(volunteerName).filter(Boolean);
          const who = names.length ? names.join(', ') : `Needs ${it.helpersNeeded||1}`;
          ctx.font = '700 15px Inter, sans-serif';
          const padY2 = padY + 22;
          const tw2 = ctx.measureText(who).width+14;
          ctx.fillStyle = 'rgba(12,15,19,.85)';
          ctx.fillRect(x-tw2/2, y+padY2-16, tw2, 20);
          ctx.fillStyle = '#d9772e';
          ctx.fillText(who, x, y+padY2);
        }
      });

      // "Needs a Hand" list underneath — full assignment sheet so anyone
      // reading a printout knows exactly who's carrying what
      if(helpItems.length){
        ctx.textAlign = 'left';
        ctx.fillStyle = '#d9772e';
        ctx.font = '700 28px Oswald, sans-serif';
        ctx.fillText(`NEEDS A HAND  (${helpItems.length})`, 32, fieldH+50);
        let rowY = fieldH + headerH;
        helpItems.forEach((it,i)=>{
          const cat = catalogFor(it.typeId);
          const names = (it.assignedIds||[]).map(volunteerName).filter(Boolean);
          const need = it.helpersNeeded||1;
          const filled = names.length>=need;
          const rh = rowHeights[i];

          ctx.fillStyle = 'rgba(255,255,255,.04)';
          ctx.fillRect(24, rowY+6, canvas.width-48, rh-16);

          ctx.fillStyle = cat.color;
          ctx.fillRect(24, rowY+6, 8, rh-16);

          ctx.textBaseline = 'alphabetic';
          ctx.fillStyle = '#f4f1e8';
          ctx.font = '700 24px Inter, sans-serif';
          ctx.fillText(it.label, 52, rowY+38);

          ctx.fillStyle = '#9aa2b2';
          ctx.font = '400 18px Inter, sans-serif';
          const posText = describePosition(it.xPct, it.yPct) + (it.timing ? '   ·   ' + timingLabel(it.timing) : '');
          ctx.fillText(posText, 52, rowY+64);

          ctx.textAlign = 'right';
          ctx.font = '700 20px Inter, sans-serif';
          ctx.fillStyle = filled ? '#4a9a5b' : '#d9772e';
          ctx.fillText(`${names.length}/${need} helpers`, canvas.width-90, rowY+38);
          ctx.font = '600 20px Inter, sans-serif';
          if(names.length){
            ctx.fillStyle = '#eceef2';
            ctx.fillText(names.join(', '), canvas.width-90, rowY+64);
          }else{
            ctx.fillStyle = '#d9772e';
            ctx.font = 'italic 400 18px Inter, sans-serif';
            ctx.fillText('Unassigned — needs a volunteer', canvas.width-90, rowY+64);
          }
          ctx.textAlign = 'left';

          const itNotes = typeNotesFor(it).notes;
          if(itNotes){
            ctx.fillStyle = '#9aa2b2';
            ctx.font = 'italic 400 17px Inter, sans-serif';
            ctx.fillText(itNotes, 52, rowY+92);
          }
          rowY += rh;
        });
      }

      const link = document.createElement('a');
      link.download = 'field-setup.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      statusEl.textContent = 'All changes saved';
    };
    img.src = url;
  }catch(e){
    statusEl.textContent = 'Export failed';
  }
});

function csvEscape(v){
  v = String(v==null ? '' : v);
  return /[",\r\n]/.test(v) ? '"'+v.replace(/"/g,'""')+'"' : v;
}
document.getElementById('btn-export-data').addEventListener('click', ()=>{
  const rows = [['Event','Event Date','Item','Type','Student','Position on Field','Needs Help','Helpers Needed','Assigned Volunteers','Timing','Notes']];
  STATE.events.forEach(evt=>{
    evt.items.forEach(it=>{
      const cat = catalogFor(it.typeId);
      const names = (it.assignedIds||[]).map(volunteerName).filter(Boolean).join('; ');
      const timingLbl = (TIMING_OPTIONS.find(t=>t.v===it.timing)||{}).label || '';
      rows.push([evt.name, evt.date||'', it.label, cat.name, it.studentName||'', describePosition(it.xPct, it.yPct),
        it.needsHelp?'Yes':'No', it.needsHelp?(it.helpersNeeded||1):'', names, timingLbl, typeNotesFor(it).notes]);
    });
  });
  const csv = rows.map(r=>r.map(csvEscape).join(',')).join('\r\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const link = document.createElement('a');
  link.download = 'field-setup-season-export.csv';
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
});

