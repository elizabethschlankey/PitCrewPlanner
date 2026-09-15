/* ---------------------------------------------------------------
   UPDATE CHECK — lets a deploy actually reach tabs that are already
   open, not just someone's next fresh visit (build.js's ASSET_VERSION
   is the other half of this — bump it before you deploy a change you
   want everyone to get). Polls version.json (always fetched fresh,
   see _headers) and compares it to the version this page itself was
   built with; a mismatch means a newer build has gone out since this
   tab loaded, so surface a small "Refresh" prompt instead of silently
   doing nothing until someone happens to reload on their own.

   Deliberately NOT automatic — force-reloading someone mid-drag on
   the field, or mid check-in on a badge, would be worse than the
   staleness it's fixing. It's also a no-op if index.html was opened
   directly from index.template.html (no build step run, so there's no
   version to compare) or from file:// without a local server, where
   the fetch below will just fail quietly and never show the banner.
---------------------------------------------------------------- */
const CURRENT_APP_VERSION = document.documentElement.dataset.appVersion || '';
const UPDATE_CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 min — cheap enough to poll a small JSON file this often
async function checkForUpdate(){
  if(!CURRENT_APP_VERSION) return;
  try{
    const res = await fetch('version.json?_='+Date.now(), {cache:'no-store'});
    if(!res.ok) return;
    const data = await res.json();
    if(data.version && data.version!==CURRENT_APP_VERSION){
      document.getElementById('update-banner').hidden = false;
    }
  }catch(e){} // offline/blocked this cycle — the next interval just tries again
}
document.getElementById('update-banner-refresh').addEventListener('click', ()=> location.reload());
document.getElementById('update-banner-dismiss').addEventListener('click', ()=>{
  document.getElementById('update-banner').hidden = true;
});
setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='visible') checkForUpdate(); });
