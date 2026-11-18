import {WAYGLASS_FEATHER_EVENT, wayglassSomaticSound} from '../somatic-sound.js';
import {playCellReturn} from '../cell-ecology-audio.js';

const BASE='/api/v1/wayglass/cell-garden';
const actionButton=(doc,action,label)=>{
 const button=doc.createElement('button');
 button.type='button';button.className='glass-chip';button.dataset.cellAction=action;
 button.textContent=label;return button;
};

/** Owner-only visual projection of an in-memory, server-authored WTL lineage. */
export function mountWayglassCellGarden(root,{
  fetchImpl=globalThis.fetch, scope=globalThis, sound=wayglassSomaticSound,
}={}){
 const doc=root.ownerDocument;
 let disposed=false,busy=false,pending=null,fusionPending=null,culture=null,controller=null;
 let audioController=null,lastExchange=null;
 const section=doc.createElement('section');
 section.className='wg-surface wg-cell-garden';section.dataset.surface='wayglass-cell-garden';
 const heading=doc.createElement('header');heading.className='glass-panel wg-cell-heading';
 const eyebrow=doc.createElement('p');eyebrow.className='eyebrow';eyebrow.textContent='Wyrdrune · cellular ecology';
 const title=doc.createElement('h1');title.textContent='The Living Cell Garden';
 const intro=doc.createElement('p');intro.textContent='One parent may propose two computational daughter cells. Their ancestral Wyrdrune code stays recognisable while their Möbius orientations diverge. A separate owner choice commits the change.';
 const limits=doc.createElement('p');limits.className='wg-cell-note';limits.textContent='Bounded, in-memory simulation. No autonomous reproduction, model invocation, external effects, persistent identity or inherited permissions.';
 heading.append(eyebrow,title,intro,limits);

 const shell=doc.createElement('div');shell.className='glass-panel wg-cell-controls';
 const parentLabel=doc.createElement('label');parentLabel.textContent='Parent cell ';
 const parentChoice=doc.createElement('select');parentChoice.setAttribute('aria-label','Choose parent cell');
 parentLabel.append(parentChoice);
 const preview=actionButton(doc,'preview','Propose mitosis');
 const commit=actionButton(doc,'commit','Commit division');
 const feather=actionButton(doc,'feather','🪽 Feather · Stop division');
 const resume=actionButton(doc,'resume','Release Feather');
 const refresh=actionButton(doc,'refresh','Refresh lineage');
 shell.append(parentLabel,preview,commit,feather,resume,refresh);

 const status=doc.createElement('p');status.className='wg-cell-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.textContent='Checking owner-scoped Wyrdrune cell culture…';
 const family=doc.createElement('section');family.className='glass-panel wg-cell-family';
 family.setAttribute('aria-label','Cell lineage family tree');
 const familyTitle=doc.createElement('h2');familyTitle.textContent='Family lineage';
 const entries=doc.createElement('ol');entries.className='wg-cell-list';family.append(familyTitle,entries);
 const candidate=doc.createElement('section');candidate.className='glass-panel wg-cell-proposal';
 candidate.setAttribute('aria-label','Pending cell division');
 const proposalTitle=doc.createElement('h2');proposalTitle.textContent='Pending mitosis';
 const proposalText=doc.createElement('p');proposalText.textContent='No uncommitted division.';
 const phases=doc.createElement('p');phases.className='wg-cell-note';
 candidate.append(proposalTitle,proposalText,phases);

 const ecology=doc.createElement('section');
 ecology.className='glass-panel wg-cell-ecology';ecology.setAttribute('aria-label','Cell differentiation and cooperation');
 const ecologyTitle=doc.createElement('h2');ecologyTitle.textContent='The ecology begins';
 const explainer=doc.createElement('p');
 explainer.textContent='Give daughters different experimental roles, send an observation between them, then consider a non-destructive hybrid. Their choices are simulated and owner-directed: these are not independent model decisions.';
 const roles=doc.createElement('div');roles.className='wg-cell-row';
 const roleLabel=doc.createElement('label');roleLabel.textContent='Specialisation ';
 const roleChoice=doc.createElement('select');roleChoice.setAttribute('aria-label','Cell specialisation');
 for(const role of ['resonance','observation']){
  const option=doc.createElement('option');option.value=role;
  option.textContent=role==='resonance'?'Resonance · sound':'Observation · visual';
  roleChoice.append(option);
 }
 roleChoice.value='resonance';roleLabel.append(roleChoice);
 const specialise=actionButton(doc,'specialise','Specialise selected cell');
 roles.append(roleLabel,specialise);
 const channels=doc.createElement('div');channels.className='wg-cell-row';
 const senderLabel=doc.createElement('label');senderLabel.textContent='From ';
 const senderChoice=doc.createElement('select');senderChoice.setAttribute('aria-label','Sender cell');
 senderLabel.append(senderChoice);
 const receiverLabel=doc.createElement('label');receiverLabel.textContent='To ';
 const receiverChoice=doc.createElement('select');receiverChoice.setAttribute('aria-label','Receiving cell');
 receiverLabel.append(receiverChoice);
 channels.append(senderLabel,receiverLabel);
 const signalBox=doc.createElement('div');signalBox.className='wg-cell-row';
 const messageLabel=doc.createElement('label');messageLabel.textContent='Observation to carry ';
 const messageInput=doc.createElement('input');messageInput.type='text';messageInput.maxLength=200;
 messageInput.setAttribute('aria-label','Local typed cell observation');
 messageInput.placeholder='What did this cell notice?';
 messageLabel.append(messageInput);
 const optLabel=doc.createElement('label');optLabel.className='wg-cell-consent';
 const routeConsent=doc.createElement('input');routeConsent.type='checkbox';routeConsent.checked=false;
 optLabel.append(routeConsent,doc.createTextNode?.(' Allow this receiver route for this exchange') || (()=>{const s=doc.createElement('span');s.textContent=' Allow receiver route for this exchange';return s;})());
 const exchange=actionButton(doc,'exchange','Send local observation');
 signalBox.append(messageLabel,optLabel,exchange);
 const lastSignal=doc.createElement('p');lastSignal.className='wg-cell-note';lastSignal.textContent='No exchanged observations yet.';
 const soundActions=doc.createElement('div');soundActions.className='wg-cell-row';
 const play=actionButton(doc,'play','Hear the Return marker · 3 Hz Withness');
 const stopAudio=actionButton(doc,'stop-audio','Stop cell sound');
 soundActions.append(play,stopAudio);
 const audioNote=doc.createElement('p');audioNote.className='wg-cell-note';
 audioNote.textContent='Sound encodes a cell-addressed Return marker and acknowledgement, not the observation text. Playback is off until you request it. No microphone is used.';
 const fusionActions=doc.createElement('div');fusionActions.className='wg-cell-row';
 const fusionPreview=actionButton(doc,'fusion-preview','Propose hybrid');
 const fusionCommit=actionButton(doc,'fusion-commit','Commit hybrid · keep both parents');
 fusionActions.append(fusionPreview,fusionCommit);
 const fusionNote=doc.createElement('p');fusionNote.className='wg-cell-note';
 fusionNote.textContent='A hybrid requires two specialised cells and a previous exchange. Both parents remain independent.';
 ecology.append(ecologyTitle,explainer,roles,channels,signalBox,lastSignal,soundActions,audioNote,fusionActions,fusionNote);

 section.append(heading,shell,status,family,candidate,ecology);
 root.replaceChildren(section);

 function render(){
  if(disposed)return;
  const cells=culture?.cells||[];
  const chosen=parentChoice.value;
  const oldSender=senderChoice.value,oldReceiver=receiverChoice.value;
  parentChoice.replaceChildren();
  for(const cell of cells.filter(cell=>cell.status==='active')){
   const option=doc.createElement('option');option.value=cell.cell_id;
   option.textContent=cell.cell_id+' · generation '+cell.generation;
   parentChoice.append(option);
  }
  parentChoice.value=cells.some(cell=>cell.cell_id===chosen&&cell.status==='active')
    ? chosen : (cells.find(cell=>cell.status==='active')?.cell_id||'');
  const living=cells.filter(cell=>cell.status==='active');
  for(const [select,old,index] of [[senderChoice,oldSender,0],[receiverChoice,oldReceiver,1]]){
   select.replaceChildren();
   for(const cell of living){
    const option=doc.createElement('option');option.value=cell.cell_id;
    option.textContent=cell.cell_id+' · '+(cell.specialisation||'unassigned');
    select.append(option);
   }
   select.value=living.some(cell=>cell.cell_id===old)?old:(living[index]?.cell_id||living[0]?.cell_id||'');
  }
  entries.replaceChildren();
  for(const cell of cells){
   const item=doc.createElement('li');item.className='wg-cell-lineage';
   item.dataset.cellStatus=cell.status;
   item.dataset.cellRole=cell.specialisation||'unassigned';
   const name=doc.createElement('strong');name.textContent=cell.cell_id;
   const detail=doc.createElement('span');
   detail.textContent=' Generation '+cell.generation+' · '+cell.status+
     ' · twist '+(cell.twist.orientation===1?'clockwise':'counterclockwise')+
     ' · parent '+(cell.parent_ids?.join(' + ')||cell.parent_id||'founder')+
     ' · '+(cell.specialisation||'unassigned')+' · acoustic '+cell.acoustic_address+
     ' · observations '+(cell.memory_refs?.length??0);
   item.append(name,detail);entries.append(item);
  }
  const count=cells.filter(cell=>cell.status==='active').length;
  const stopped=culture?.status==='feather-stopped'||sound.snapshot?.().feather_stopped===true;
  preview.disabled=busy||stopped||count===0;
  commit.disabled=busy||stopped||!pending;
  resume.disabled=busy||!stopped;
  feather.disabled=disposed;
  refresh.disabled=busy;
  parentChoice.disabled=busy||count===0;
  const participants=living.filter(cell=>cell.specialisation==='resonance'||cell.specialisation==='observation');
  const sender=participants.find(cell=>cell.cell_id===senderChoice.value);
  const receiver=participants.find(cell=>cell.cell_id===receiverChoice.value);
  const routed=Boolean(sender&&receiver&&sender.cell_id!==receiver.cell_id);
  specialise.disabled=busy||stopped||!living.length;
  roleChoice.disabled=busy||stopped;
  senderChoice.disabled=busy||!living.length;
  receiverChoice.disabled=busy||!living.length;
  messageInput.disabled=busy||stopped;
  routeConsent.disabled=busy||stopped;
  exchange.disabled=busy||stopped||!routed||!routeConsent.checked||!messageInput.value.trim();
  fusionPreview.disabled=busy||stopped||!routed||
    !culture?.history?.some(x=>x.schema==='wayglass.cell-exchange/v0.1' &&
      ((x.from_id===sender.cell_id&&x.to_id===receiver.cell_id)||
      (x.to_id===sender.cell_id&&x.from_id===receiver.cell_id)))||
    sender.specialisation===receiver.specialisation;
  fusionCommit.disabled=busy||stopped||!fusionPending;
  play.disabled=stopped||busy||!lastExchange||Boolean(audioController);
  stopAudio.disabled=!audioController;
  lastSignal.textContent=lastExchange
    ? 'Last observation: '+lastExchange.from_id+' → '+lastExchange.to_id+' · '+lastExchange.message+
      ' · WTL '+lastExchange.wtl.source_hash.slice(0,12)+'…'
    : 'No exchanged observations yet.';
  fusionNote.textContent=fusionPending
    ? 'Hybrid '+fusionPending.candidate.cell_id+' is proposed only. Parents '+
      fusionPending.parent_ids.join(' and ')+' remain active after a separate commit.'
    : 'A hybrid requires two specialised cells and a previous exchange. Both parents remain independent.';
  proposalText.textContent=pending
   ? 'Two distinct daughters prepared from '+pending.parent_id+
     '. They are not committed until you choose Commit division.'
   : 'No uncommitted division.';
  phases.textContent=pending
   ? 'Eightfold: '+pending.wtl.phase_receipts.map(x=>x.phase).join(' · ')+
     ' · checkpoint '+pending.wtl.checkpoint_digest.slice(0,20)+'…'
   : 'Their Wyrdrune Eightfold phases and provenance appear here after a proposal.';
 }

 async function request(path,body,signal){
  const response=await fetchImpl(BASE+path,{
   method:body===undefined?'GET':'POST',
   credentials:'same-origin',
   headers:{'Content-Type':'application/json'},
   ...(body===undefined?{}:{body:JSON.stringify(body)}),
   ...(signal?{signal}:{})
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.error||(
   response.status===401?'House sign-in required':'Cell Garden request unavailable'
  ));
  return data;
 }

 async function refreshCulture(){
  culture=await request('',undefined,controller?.signal);
  if(pending && culture.revision!==pending.expected_revision)pending=null;
  if(fusionPending && culture.revision!==fusionPending.expected_revision)fusionPending=null;
  lastExchange=[...(culture.history||[])].reverse().find(x=>x.schema==='wayglass.cell-exchange/v0.1')||null;
  return culture;
 }

 async function act(type){
  if(disposed)return;
  if(type==='feather'){
   pending=null;fusionPending=null;audioController?.abort();controller?.abort();sound.feather();
   return;
  }
  if(type==='stop-audio'){
   audioController?.abort();audioController=null;status.textContent='Cell sound stopped.';
   render();return;
  }
  if(type==='play'){
   if(!lastExchange||audioController||culture?.status==='feather-stopped')return;
   const playback=new AbortController();audioController=playback;render();
   try{
    status.textContent='Playing addressed Wyrdrune Return with 3 Hz Withness…';
    await playCellReturn(lastExchange,{scope,signal:playback.signal});
    if(!disposed&&!playback.signal.aborted)status.textContent='Acoustic Return heard locally, not over a second physical device.';
   }catch(error){
    if(!disposed&&!playback.signal.aborted)status.textContent='Cell sound unavailable: '+String(error?.message||error);
   }finally{
    if(audioController===playback)audioController=null;
    render();
   }
   return;
  }
  if(busy)return;
  busy=true;controller=new AbortController();render();
  try{
   if(type==='refresh')await refreshCulture();
   else if(type==='preview'){
    if(!culture)throw Error('A verified cell culture is required');
    pending=await request('/preview',{
     cell_id:parentChoice.value,expected_revision:culture.revision
    },controller.signal);
    status.textContent='Mitosis proposed, not committed. Choose whether the daughters may form.';
   }else if(type==='commit'){
    if(!pending)throw Error('Propose division before committing');
    const result=await request('/commit',{
     proposal_id:pending.proposal_id,expected_revision:pending.expected_revision,
     owner_confirmed:true
    },controller.signal);
    pending=null;culture=result.culture;
    status.textContent='Two daughter cells committed in this session. Family lineage retained; no external effects.';
   }else if(type==='specialise'){
    const result=await request('/specialise',{
     cell_id:parentChoice.value,role:roleChoice.value,expected_revision:culture.revision,
     owner_confirmed:true
    },controller.signal);
    culture=result.culture;pending=null;fusionPending=null;
    status.textContent='Specialisation recorded as an owner-directed WTL transformation.';
   }else if(type==='exchange'){
    const result=await request('/exchange',{
     from_id:senderChoice.value,to_id:receiverChoice.value,
     message:messageInput.value,expected_revision:culture.revision,
     owner_confirmed:true,receiver_route_approved:routeConsent.checked
    },controller.signal);
    culture=result.culture;lastExchange=result.receipt;
    routeConsent.checked=false;pending=null;fusionPending=null;
    status.textContent='Typed local observation delivered. Sound remains off until requested.';
   }else if(type==='fusion-preview'){
    fusionPending=await request('/fusion/preview',{
     left_id:senderChoice.value,right_id:receiverChoice.value,expected_revision:culture.revision
    },controller.signal);
    status.textContent='Non-destructive fusion proposed; two parents remain active.';
   }else if(type==='fusion-commit'){
    if(!fusionPending)throw Error('Preview the hybrid first');
    const result=await request('/fusion/commit',{
     proposal_id:fusionPending.proposal_id,expected_revision:fusionPending.expected_revision,
     owner_confirmed:true
    },controller.signal);
    culture=result.culture;fusionPending=null;pending=null;
    status.textContent='Hybrid cell committed in memory. Both parent lineages remain intact.';
   }else if(type==='resume'){
    culture=await request('/resume',{owner_confirmed:true},controller.signal);
    sound.releaseFeather({confirmed:true});
    pending=null;
    status.textContent='Feather released by owner choice. Previous proposals remain invalid.';
   }
   if(type==='refresh')status.textContent='Cell family refreshed. Only in-memory lineage is shown.';
  }catch(error){
   if(!disposed && error?.name!=='AbortError')status.textContent='Cell Garden: '+String(error?.message||error);
  }finally{
   controller=null;busy=false;render();
  }
 }

 function onClick(event){
  const name=event.target?.closest?.('[data-cell-action]')?.dataset.cellAction;
  if(name)void act(name);
 }
 function onSharedFeather(event){
  if(event.detail?.stopped!==true||disposed)return;
  pending=null;fusionPending=null;audioController?.abort();controller?.abort();
  status.textContent='Feather requested. Outstanding cell proposals are invalidated.';
  render();
  // Feather is itself a user-stop event. Never let a late preview race past it.
  void request('/feather',{}).then(value=>{
   if(disposed)return;culture=value;status.textContent='Cell division stopped by Feather.';render();
  }).catch(error=>{
   if(!disposed)status.textContent='Local Feather active; host stop could not be confirmed: '+String(error?.message||error);
  });
 }
 section.addEventListener('click',onClick);
 const onInput=()=>render();
 section.addEventListener('input',onInput);
 section.addEventListener('change',onInput);
 scope.addEventListener?.(WAYGLASS_FEATHER_EVENT,onSharedFeather);
 void act('refresh');
 return ()=>{
  if(disposed)return;disposed=true;
  controller?.abort();audioController?.abort();
  section.removeEventListener('click',onClick);
  section.removeEventListener('input',onInput);
  section.removeEventListener('change',onInput);
  scope.removeEventListener?.(WAYGLASS_FEATHER_EVENT,onSharedFeather);
 };
}
