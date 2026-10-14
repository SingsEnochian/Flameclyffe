import {
  PILOT_DECK_SCHEMA,PILOT_RETURN_SCHEMA,PILOT_SEATS,
  emptyFlight,normaliseFlight,validateFlight,composePilotRequest,
  recordRouteObservation,recordPilotReview,makeReturnPacket
} from './pilot-deck-model.js';

const key='wayglass.ship.paired-pilot-deck-draft/v0.1';
const fields=['mission','origin','destination','constraints','preservation','wonder','stop_point','next_owner','source_refs'];
const el=id=>document.getElementById(id);
const say=message=>{el('status').textContent=message;};
let flight=emptyFlight();
let houseSessionObserved=false;
let latestRoute=null;
let saveTimer=null;
const getInputs=()=>{
  for(const id of fields)flight[id]=el(id).value;
  return flight;
};
const paint=value=>{for(const id of fields)el(id).value=value[id]||'';};
function showMemo(message,reference){
  el('copilot-response').textContent=message;
  el('reply-source').textContent=reference;
}
function save(show=true){
  try {
    const local=normaliseFlight(getInputs());
    local.rarity_pilot_proposal=flight.rarity_pilot_proposal||'';
    localStorage.setItem(key,JSON.stringify(local));
    if(show)say('Station notes saved in this browser. No helm command was issued.');
  } catch {say('Browser storage is unavailable. Export a return packet to retain your notes.');}
}
try {
  const raw=localStorage.getItem(key);
  if(raw){
    flight=normaliseFlight(JSON.parse(raw));
    paint(flight);
    if(flight.rarity_pilot_proposal){
      showMemo(flight.rarity_pilot_proposal,'Restored from a local draft. Identity and source are not reverified after reload.');
    }
    say('Draft recovered from this device. No session or second-pilot presence is inherited automatically.');
  }
} catch {say('Previous draft unavailable. This is a fresh, offline-capable station.');}
el('flight-form').addEventListener('submit',event=>event.preventDefault());
el('flight-form').addEventListener('input',event=>{
  if(event.target?.type==='checkbox')return;
  // Edited mission parameters cannot silently carry a previously approved route.
  if(latestRoute){
    latestRoute=null;
    flight.route_evidence=null;
    el('route-state').textContent='Proposal now stale';
    el('rarity-light').className='light amber';
    showMemo('Mission changed. Ask the second pilot again before treating the old proposal as current.',
      'Previous response remains an observation, not active flight authority.');
  }
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>save(false),500);
});
async function finiteFetch(url,options={},ms=13000){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),ms);
  try{return await fetch(url,{credentials:'same-origin',cache:'no-store',...options,signal:controller.signal});}
  finally{clearTimeout(timeout);}
}
async function verifySession({showStatus=true}={}){
  houseSessionObserved=false;
  el('session-state').textContent='Checking…';
  try{
    const response=await finiteFetch('/api/v1/house/session',{headers:{accept:'application/json'}},8000);
    const data=await response.json().catch(()=>({}));
    if(response.ok && data.connected===true && data.role==='steward'){
      houseSessionObserved=true;
      el('session-state').textContent='Steward session observed';
      el('steward-light').className='light good';
      if(showStatus)say('Host steward session observed. This is not an executed navigation command.');
      return true;
    }
    el('session-state').textContent='Not authorised';
    el('steward-light').className='light bad';
    if(showStatus)say('House session absent or denied. Pilot planning remains local; remote second-pilot requests and review are disabled.');
  }catch(error){
    el('session-state').textContent='Host unavailable';
    el('steward-light').className='light amber';
    if(showStatus)say('House session endpoint unavailable. This may be a static Pages build. No remote action was attempted.');
  }
  return false;
}
el('check-session').addEventListener('click',()=>void verifySession());
el('ask-rarity').addEventListener('click',async()=>{
  getInputs();
  const result=validateFlight(flight);
  if(!result.valid){say('Complete the flight plan first: '+result.issues.join(' '));return;}
  if(!await verifySession({showStatus:false})){
    say('Rarity pilot request not sent: an authenticated House steward session is required.');
    return;
  }
  const button=el('ask-rarity');
  button.disabled=true;
  el('route-state').textContent='Requesting…';
  try{
    const response=await finiteFetch(PILOT_SEATS.rarity.route,{
      method:'POST',
      headers:{'content-type':'application/json',accept:'application/json'},
      body:JSON.stringify({message:composePilotRequest(flight)}),
    },30000);
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(String(data.error||'Rarity route returned '+response.status).slice(0,200));
    latestRoute=recordRouteObservation(flight,data,{observedAt:new Date().toISOString()});
    flight.rarity_pilot_proposal=latestRoute.rarity_pilot_proposal;
    flight.route_evidence=latestRoute.route_evidence;
    flight.route_evidence=latestRoute.route_evidence;
    showMemo(latestRoute.rarity_pilot_proposal,
      'Observed: same-origin Rarity route · provider claim: '+(latestRoute.route_evidence.claimed_provider||'unknown')+
      ' · model claim: '+(latestRoute.route_evidence.claimed_model||'unknown')+
      ' · response is not authenticated Rarity seat proof.');
    el('route-state').textContent='Route responded, identity unverified';
    el('rarity-light').className='light good';
    save(false);
    say('Second pilot route responded. Proposal preserved. Navigation was not executed.');
  }catch(error){
    el('route-state').textContent='Route unavailable';
    el('rarity-light').className='light bad';
    say('No verified Rarity pilot response: '+String(error?.message||error).slice(0,250));
  }finally{button.disabled=false;}
});
el('clear-reply').addEventListener('click',()=>{
  latestRoute=null;flight.rarity_pilot_proposal='';flight.route_evidence=null;
  showMemo('Rarity's pilot chart has been cleared.','Route evidence: none.');
  el('route-state').textContent='Not connected';
  el('rarity-light').className='light amber';
  save(false);
});
el('review').addEventListener('click',async()=>{
  getInputs();
  if(!el('acknowledged').checked){say('Tick the explicit pilot acknowledgement before reviewing.');return;}
  if(!await verifySession({showStatus:false})){say('Cannot record steward review without a current House session.');return;}
  try{
    const reviewed=recordPilotReview(flight,{
      reviewer:'rowan',acknowledged:true,sessionVerified:houseSessionObserved,reviewedAt:new Date().toISOString()
    });
    flight.pilot_review_note='Local review at '+reviewed.reviewed_at+' after observed House steward session. Not an executed Helm command.';
    save(false);
    say('Pilot review recorded on this console at '+reviewed.reviewed_at+
      '. This is local review only. To compile a route, use ArcSweep React-ion Helm. No navigation was executed.');
    el('acknowledged').checked=false;
  }catch(error){say(error.message);}
});
el('save').addEventListener('click',()=>save());
el('export').addEventListener('click',()=>{
  try {
    getInputs();
    const packet={...makeReturnPacket(flight),exported_at:new Date().toISOString()};
    const url=URL.createObjectURL(new Blob([JSON.stringify(packet,null,2)+'\n'],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='wayglass-paired-pilot-return.json';
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
    say('Return packet exported. Stop point, next owner, Wonder and Rarity pilot notes preserved. No canonical receipt claimed.');
  }catch(error){say('Export stopped: '+error.message);}
});
el('import').addEventListener('click',()=>el('import-file').click());
el('import-file').addEventListener('change',async event=>{
  const file=event.target.files?.[0];event.target.value='';
  if(!file)return;
  if(file.size>300000){say('Import refused: draft is larger than 300 KB.');return;}
  try{
    const data=JSON.parse(await file.text());
    if(!data || ![PILOT_DECK_SCHEMA,PILOT_RETURN_SCHEMA].includes(data.schema)){
      say('Import refused: unknown pilot draft or return packet schema.');return;
    }
    const incoming=data.schema===PILOT_RETURN_SCHEMA ? {
      ...data,wonder:data.unresolved_wonder,rarity_pilot_proposal:data.rarity_pilot_proposal||data.co_pilot_proposal,pilot_review_note:data.pilot_review_note
    } : data;
    flight=normaliseFlight(incoming);paint(flight);latestRoute=null;
    showMemo(flight.rarity_pilot_proposal||'No second-pilot memo in this imported draft.',
      'Imported draft. The named seats and all prior claims are unverified until reconnected.');
    el('route-state').textContent='Not connected';
    el('rarity-light').className='light amber';
    save(false);
    say('Return draft imported. No owner authorisation, resident arrival or ship command was inherited.');
  }catch{say('Could not import JSON. Existing station state is unchanged.');}
});
el('clear').addEventListener('click',()=>{
  if(!confirm('Clear the local pilot station? Export a return packet first to preserve it.'))return;
  flight=emptyFlight();paint(flight);latestRoute=null;
  showMemo('Rarity's pilot seat is configured. No new response has been observed.','Route evidence: none.');
  el('rarity-light').className='light amber';el('route-state').textContent='Not connected';
  el('acknowledged').checked=false;
  try{localStorage.removeItem(key);}catch{}
  say('Local station cleared. No remote navigation, model or authority state changed.');
});
