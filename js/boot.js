/* ---------------------------------------------------------------
   REALTIME — keep every open tab (yours and volunteers') in sync
---------------------------------------------------------------- */
sb.channel('planner-changes')
  .on('postgres_changes', {event:'*', schema:'public', table:'roster'}, ()=>reload())
  .on('postgres_changes', {event:'*', schema:'public', table:'events'}, ()=>reload())
  .on('postgres_changes', {event:'*', schema:'public', table:'items'}, ()=>reload())
  .on('postgres_changes', {event:'*', schema:'public', table:'item_assignments'}, ()=>reload())
  .on('postgres_changes', {event:'*', schema:'public', table:'badges'}, ()=>reload())
  .on('postgres_changes', {event:'*', schema:'public', table:'badge_events'}, ()=>reload())
  .on('postgres_changes', {event:'*', schema:'public', table:'event_volunteer_status'}, ()=>reload())
  .on('postgres_changes', {event:'*', schema:'public', table:'templates'}, ()=>reload())
  .on('postgres_changes', {event:'*', schema:'public', table:'template_items'}, ()=>reload())
  .on('postgres_changes', {event:'*', schema:'public', table:'event_inactive_badges'}, ()=>reload())
  .on('postgres_changes', {event:'*', schema:'public', table:'item_type_notes'}, ()=>reload())
  .subscribe();

/* ---------------------------------------------------------------
   BOOT — runs last, once every other file has fully loaded, so it's
   the one safe place to (a) build the palette (needs wirePaletteDrag
   from drag-drop.js) and (b) start listening for auth changes (the
   callback needs renderHeader from render.js). See the comments in
   render.js/state.js next to what used to live here directly.
---------------------------------------------------------------- */
initPalette();

sb.auth.onAuthStateChange((_event, sess)=>{
  session = sess;
  role = roleForSession(sess);
  if(mode==='edit' && role!=='director' && role!=='admin') setMode('view');
  resetIdleLockTimer(); // starts the timer on login, clears it on logout
  renderHeader();
});

(async function boot(){
  // paint immediately from whatever we last successfully loaded, instead
  // of a blank/"Loading…" screen for the whole round trip to Supabase —
  // the real fetch below still runs right away and replaces it as soon
  // as it lands, this is purely about not staring at nothing meanwhile
  const cacheHit = hydrateFromCache();
  if(cacheHit){
    renderAll();
    statusEl.textContent = 'Showing your last-loaded data — updating…';
  }
  const {data:{session:sess}} = await sb.auth.getSession();
  session = sess;
  role = roleForSession(sess);
  await loadState();
  renderAll();
  statusEl.textContent = 'All changes saved';
})();
