/* ---------------------------------------------------------------
   SETUP GUIDE — a step-by-step banner for "I just created an event,
   now what?" Walks a volunteer through Create Event -> Add Your Crew
   -> Assign on the Field, actually DRIVING them to the right
   screen/tab at each step (Admin > Crew Roster, then back to the
   field) instead of leaving them to discover Crew Roster and Needs a
   Hand on their own. Started by startSetupWizard() (called from
   admin.js right after a new/duplicated event is created); lives
   entirely in this file so admin.js/field.js don't need to know it
   exists — they're called defensively via typeof checks, the same
   loose-coupling convention used elsewhere (see setMobileNavView
   calls in admin.js).
---------------------------------------------------------------- */
let wizardEventId = null;
let wizardEventName = '';
let wizardStep = 0; // 0 = inactive/dismissed

function startSetupWizard(eventId, eventName){
  wizardEventId = eventId;
  wizardEventName = eventName;
  goToWizardStep(1);
}
function endSetupWizard(){
  wizardEventId = null;
  wizardEventName = '';
  wizardStep = 0;
  renderSetupWizard();
}
function goToWizardStep(step){
  wizardStep = step;
  if(step===2){
    adminOpen = true;
    editingTemplateId = null;
    setAdminTab('roster');
    applyScreen();
    renderAll();
    if(typeof setMobileNavView==='function') setMobileNavView('crew');
    // default the Import Signed-Up Volunteers picker to the event this
    // wizard is actually about, not whichever event happens to be live
    // (renderImportEventSelect() falls back to the LIVE event, which is
    // rarely the one someone just created)
    const importSel = document.getElementById('import-event-select');
    if(importSel && wizardEventId) importSel.value = wizardEventId;
  }else{
    // steps 1 and 3 both land on the normal field screen — 1 as a
    // "you're set, here's what's next" confirmation, 3 to actually do
    // the assigning — just with different banner copy/highlighting
    adminOpen = false;
    applyScreen();
    renderAll();
    if(typeof setMobileNavView==='function') setMobileNavView('field');
  }
  renderSetupWizard();
}
function renderSetupWizard(){
  const banner = document.getElementById('setup-wizard');
  if(!banner) return;
  banner.hidden = !wizardEventId;
  if(!wizardEventId) return;
  document.querySelectorAll('.setup-wizard-step').forEach(btn=>{
    const step = Number(btn.dataset.wizardStep);
    btn.classList.toggle('active', step===wizardStep);
    btn.classList.toggle('done', step<wizardStep);
    btn.querySelector('.num').textContent = step<wizardStep ? '✓' : String(step);
  });
  const msgEl = document.getElementById('setup-wizard-msg');
  const nextBtn = document.getElementById('setup-wizard-next');
  if(wizardStep===1){
    msgEl.textContent = `"${wizardEventName}" is created! Next, let's get your crew on the roster.`;
    nextBtn.textContent = 'Add Your Crew →';
  }else if(wizardStep===2){
    msgEl.textContent = `Paste a Signup.com list, or add volunteers one at a time below. Once your crew's in, head to the field.`;
    nextBtn.textContent = 'Continue to Field Map →';
  }else{
    msgEl.textContent = `Drag a volunteer from Needs a Hand onto an item on the field, or tap an item to assign helpers.`;
    nextBtn.textContent = 'Finish Setup';
  }
}
document.getElementById('setup-wizard-next').addEventListener('click', ()=>{
  if(wizardStep>=3){ endSetupWizard(); return; }
  goToWizardStep(wizardStep+1);
});
document.getElementById('setup-wizard-dismiss').addEventListener('click', endSetupWizard);
document.querySelectorAll('.setup-wizard-step').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    if(!wizardEventId) return;
    goToWizardStep(Number(btn.dataset.wizardStep));
  });
});
