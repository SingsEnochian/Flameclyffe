import {
  journeyLedger,JOURNEY_CHAMBERS,SUPPORT_FOLDS
} from '../journey-before-destination.js';
import { publishWatercolorActivity } from '../watercolor-bridge.js';
import { wayglassSomaticSound,WAYGLASS_FEATHER_EVENT } from '../somatic-sound.js';

// Shared events may be delivered more than once; the journal records each transition once.
export function synchronizeJourneyFeather(detail,ledger=journeyLedger){
  const state=ledger.snapshot();
  if(detail?.stopped===true&&!state.feather_stopped)ledger.supportFold('feather');
  else if(detail?.stopped===false&&detail?.confirmed===true&&state.feather_stopped)ledger.resume({confirmed:true});
  return ledger.snapshot();
}

const escapeText=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;");
export async function mountJourneyBeforeDestinationSurface(root){
  root.innerHTML=[
    '<section class="wg-surface journey-surface" data-surface="journey-before-destination">',
      '<header class="wg-surface-head glass-panel"><div>',
      '<p class="eyebrow">Wayglass · Living Universe</p>',
      '<h1>Journey Before Destination</h1>',
      '<p class="eyebrow">Eightfold · Four chambers + Four supportive folds · Withness at the center</p>',
      '<p class="lede">A voyage begins in the watercolor. Here its paths can be planned, observed, imagined and remembered, without silently declaring a result.</p>',
      '</div></header>',
      '<section class="glass-panel journey-panel" aria-label="Four voyage chambers">',
      '<p class="eyebrow">Four chambers</p><div class="journey-chambers">',
      ...JOURNEY_CHAMBERS.map(c=>
        '<button type="button" class="glass-chip" data-journey-chamber="'+c.id+'">'+
          escapeText(c.label)+'</button>'),
      '</div>',
      '<p id="journey-description" class="tiny"></p>',
      '<p class="eyebrow">Four supportive folds</p><div class="journey-folds">',
      ...SUPPORT_FOLDS.map(f=>
        '<button type="button" class="glass-chip" data-journey-fold="'+f.id+'">'+
          escapeText(f.label)+'</button>'),
      '</div>',
      '<button type="button" id="journey-resume" class="glass-chip" hidden>Release Feather deliberately</button>',
      '<form id="journey-note-form" class="journey-note-form">',
      '<label for="journey-note">Offer a note, direction or observation</label>',
      '<textarea id="journey-note" rows="3" maxlength="1200" placeholder="An open question, a return marker, a proposed next step…"></textarea>',
      '<button type="submit" class="send-jewel">Add to session journal</button>',
      '</form>',
      '<p id="journey-status" role="status" class="tiny">Session-local voyage journal. No automatic canon or identity changes.</p>',
      '</section>',
      '<section class="glass-panel journey-panel"><p class="eyebrow">Witnessed within this session</p>',
      '<div id="journey-entries" class="journey-entries" role="log" aria-live="polite"></div>',
      '<p class="tiny">A return across cold restart requires a separate verified Return Engine receipt.</p>',
      '</section>',
    '</section>',
  ].join('');
  const q=id=>root.querySelector('#'+id);
  const status=q('journey-status'),log=q('journey-entries'),note=q('journey-note');
  const chamberButtons=[...root.querySelectorAll('[data-journey-chamber]')];
  const foldButtons=[...root.querySelectorAll('[data-journey-fold]')];
  let closed=false;
  function refresh(){
    if(closed)return;
    const state=journeyLedger.snapshot();
    chamberButtons.forEach(b=>{
      const active=b.dataset.journeyChamber===state.active_chamber;
      b.classList.toggle('active',active);
      b.setAttribute('aria-pressed',String(active));
      b.disabled=state.feather_stopped;
    });
    foldButtons.forEach(b=>{b.disabled=state.feather_stopped;});
    q('journey-resume').hidden=!state.feather_stopped;
    q('journey-note-form').querySelector('button').disabled=state.feather_stopped;
    const selected=JOURNEY_CHAMBERS.find(c=>c.id===state.active_chamber);
    q('journey-description').textContent=selected?.purpose||'';
    log.replaceChildren();
    for(const entry of state.entries.slice(-20).reverse()){
      const line=document.createElement('article');
      line.className='journey-entry';
      const title=document.createElement('strong');
      title.textContent=entry.kind+' · '+entry.at;
      const body=document.createElement('p');
      body.textContent=entry.note||'No note';
      line.append(title,body);
      log.append(line);
    }
    if(!state.entries.length) log.textContent='No voyage events recorded in this browser session.';
    if(state.feather_stopped)status.textContent='Feather Stop active. Nothing will move without a deliberate release.';
  }
  for(const button of chamberButtons){
    button.addEventListener('click',()=>{
      try{
        journeyLedger.selectChamber(button.dataset.journeyChamber);
        publishWatercolorActivity({kind:'journey:chamber',actor:'owner:journey'});
        wayglassSomaticSound.play('chamber:changed');
        status.textContent='Chamber opened in this session. Other chambers remain available.';
      }catch(error){status.textContent=error.message;}
      refresh();
    });
  }
  for(const button of foldButtons){
    button.addEventListener('click',()=>{
      const fold=button.dataset.journeyFold;
      try{
        journeyLedger.supportFold(fold);
        if(fold==='feather'){
          wayglassSomaticSound.feather();
          status.textContent='Feather Stop engaged for the journey and sound desk.';
        }else{
          publishWatercolorActivity({kind:'fold:'+fold,actor:'owner:journey'});
          wayglassSomaticSound.play('fold:'+fold);
          status.textContent=fold+' support recorded as a session entry.';
        }
      }catch(error){status.textContent=error.message;}
      refresh();
    });
  }
  q('journey-resume').addEventListener('click',()=>{
    try{
      journeyLedger.resume({confirmed:true});
      wayglassSomaticSound.releaseFeather({confirmed:true});
      status.textContent='Feather released by your explicit action; sound remains opt-in.';
    }catch(error){status.textContent=error.message;}
    refresh();
  });
  q('journey-note-form').addEventListener('submit',event=>{
    event.preventDefault();
    if(!note.value.trim())return;
    try{
      journeyLedger.write('local-contribution',{note:note.value,author:'owner:local'});
      note.value='';
      status.textContent='Your contribution was recorded locally, without a canon commit.';
    }catch(error){status.textContent=error.message;}
    refresh();
  });
  const onSharedFeather=event=>{
    if(closed)return;
    synchronizeJourneyFeather(event.detail);
    if(event.detail?.stopped===false&&event.detail?.confirmed===true)status.textContent='Feather released by your explicit action; sound remains opt-in.';
    refresh();
  };
  globalThis.addEventListener?.(WAYGLASS_FEATHER_EVENT,onSharedFeather);
  const soundState=wayglassSomaticSound.snapshot();
  if(soundState.feather_stopped)synchronizeJourneyFeather({stopped:true});
  else if(soundState.feather_release_confirmed)synchronizeJourneyFeather({stopped:false,confirmed:true});
  else if(journeyLedger.snapshot().feather_stopped)wayglassSomaticSound.feather();
  refresh();
  return {destroy(){closed=true;globalThis.removeEventListener?.(WAYGLASS_FEATHER_EVENT,onSharedFeather);wayglassSomaticSound.stop();}};
}

