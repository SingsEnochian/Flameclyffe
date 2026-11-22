import {WAYGLASS_FEATHER_EVENT, wayglassSomaticSound} from '../somatic-sound.js';
import {playCellReturn} from '../cell-ecology-audio.js';
import {createCellListeningChannel} from '../cell-listening-channel.js';
import {colonyTake} from '../cell-radio-recording.js';

const BASE='/api/v1/wayglass/cell-garden';
const actionButton=(doc,action,label)=>{
 const button=doc.createElement('button');
 button.type='button';button.className='glass-chip';button.dataset.cellAction=action;
 button.textContent=label;return button;
};

/** Owner-only visual projection of an in-memory, server-authored WTL lineage. */
export function mountWayglassCellGarden(root,{
  fetchImpl=globalThis.fetch, scope=globalThis, sound=wayglassSomaticSound,
  signal:roomSignal,
}={}){
 const doc=root.ownerDocument;
 let disposed=false,busy=false,pending=null,fusionPending=null,culture=null,controller=null;
 const onRoomAbort=()=>{
  disposed=true;pending=null;fusionPending=null;
  controller?.abort('room-navigation');audioController?.abort('room-navigation');
 };
 if(roomSignal?.aborted)onRoomAbort();
 else roomSignal?.addEventListener('abort',onRoomAbort,{once:true});
 let audioController=null,lastExchange=null;
 const section=doc.createElement('section');
 section.className='wg-surface wg-cell-garden';section.dataset.surface='wayglass-cell-garden';
 const heading=doc.createElement('header');heading.className='glass-panel wg-cell-heading';
 const eyebrow=doc.createElement('p');eyebrow.className='eyebrow';eyebrow.textContent='Wyrdrune · cellular ecology';
 const title=doc.createElement('h1');title.textContent='The Living Cell Garden';
 const intro=doc.createElement('p');intro.textContent='One parent may propose two computational daughter cells. Their ancestral Wyrdrune code stays recognisable while their Möbius orientations diverge. A separate owner choice commits the change.';
 const limits=doc.createElement('p');limits.className='wg-cell-note';
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
 const askForm=actionButton(doc,'ask-form','Ask how this cell wants to appear');
 shell.append(parentLabel,preview,commit,feather,resume,refresh,askForm);

 const status=doc.createElement('p');status.className='wg-cell-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.textContent='Checking owner-scoped Wyrdrune cell culture…';
 const family=doc.createElement('section');family.className='glass-panel wg-cell-family';
 family.setAttribute('aria-label','Cell lineage family tree');
 const familyTitle=doc.createElement('h2');familyTitle.textContent='Family lineage';
 const entries=doc.createElement('ol');entries.className='wg-cell-list';family.append(familyTitle,entries);
 const formReturn=doc.createElement('p');formReturn.className='wg-cell-note';family.append(formReturn);
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
 explainer.textContent='Choose a role for a daughter, carry an observation between cells, or propose a hybrid that keeps both parents.';
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
 const radio=doc.createElement('section');radio.className='wg-cell-radio';radio.setAttribute('aria-label','Colony Radio');
 const radioTitle=doc.createElement('h2');radioTitle.textContent='Colony Radio';
 const radioControls=doc.createElement('div');radioControls.className='wg-cell-row';
 const listen=actionButton(doc,'listen','Listen to colony');
 const mute=actionButton(doc,'mute','Mute colony radio');
 const record=actionButton(doc,'record','Record radio');
 mute.setAttribute('aria-pressed','false');
 const volumeLabel=doc.createElement('label');volumeLabel.textContent='Live volume ';
 const volume=doc.createElement('input');volume.type='range';volume.min='0';volume.max='60';
 volume.value='25';volumeLabel.append(volume);
 soundActions.append(play,stopAudio);
 radioControls.append(listen,mute,volumeLabel,record);
 const audioNote=doc.createElement('p');audioNote.className='wg-cell-note';
 audioNote.textContent='Listen for the Return and acknowledgement tones from new cell exchanges.';
 const listeningStatus=doc.createElement('p');listeningStatus.className='wg-cell-note';
 listeningStatus.setAttribute('role','status');
 listeningStatus.textContent='Off air · tune in for the next burble.';
 const recordStatus=doc.createElement('p');recordStatus.className='wg-cell-note';
 recordStatus.setAttribute('role','status');
 const recordingPanel=doc.createElement('div');recordingPanel.className='wg-cell-recording';
 recordingPanel.hidden=true;
 const recordingPlayer=doc.createElement('audio');recordingPlayer.controls=true;recordingPlayer.preload='metadata';
 recordingPlayer.setAttribute('aria-label','Preview last Colony Radio recording');
 const download=doc.createElement('a');download.className='glass-chip';download.textContent='Download recording';
 recordingPanel.append(recordingPlayer,download);
 radio.append(radioTitle,radioControls,listeningStatus,recordStatus,recordingPanel);
 heading.append(radio);
 const listening=createCellListeningChannel({url:BASE+'/listen',scope,onStatus(message){
  if(disposed)return;
  listeningStatus.textContent=message;
  renderAudio();
 },onRecordStatus(message){
  if(disposed)return;
  recordStatus.textContent=message;
  renderAudio();
 },onFeather(){
  culture={...culture,status:'feather-stopped'};
  pending=null;fusionPending=null;controller?.abort();
  recordingPlayer.pause?.();
  render();
 }});
 let muted=false;
 const fusionActions=doc.createElement('div');fusionActions.className='wg-cell-row';
 const fusionPreview=actionButton(doc,'fusion-preview','Propose hybrid');
 const fusionCommit=actionButton(doc,'fusion-commit','Commit hybrid · keep both parents');
 fusionActions.append(fusionPreview,fusionCommit);
 const fusionNote=doc.createElement('p');fusionNote.className='wg-cell-note';
 fusionNote.textContent='A hybrid requires two specialised cells and a previous exchange. Both parents remain independent.';
 ecology.append(ecologyTitle,explainer,roles,channels,signalBox,lastSignal,soundActions,audioNote,fusionActions,fusionNote);

 section.append(heading,shell,status,family,candidate,ecology);
 root.replaceChildren(section);
 const urls=scope.URL??globalThis.URL;
 let recordingUrl=null;
 const offTake=colonyTake(scope).subscribe(clip=>{
  if(!clip)return;
  recordingPlayer.pause?.();
  if(recordingUrl)urls.revokeObjectURL(recordingUrl);
  recordingUrl=urls.createObjectURL(clip.blob);
  recordingPlayer.src=recordingUrl;
  download.href=recordingUrl;
  download.download=clip.filename;
  recordingPanel.hidden=false;
  renderAudio();
 });

 function featherHeld(){
  return culture?.status==='feather-stopped'||sound.snapshot?.().feather_stopped===true;
 }

 function renderAudio(){
  const live=listening.isActive();
  play.disabled=featherHeld()||busy||!lastExchange||Boolean(audioController)||live;
  stopAudio.disabled=!audioController;
  listen.disabled=live?false:!culture||featherHeld()||Boolean(audioController);
  listen.textContent=live?'Stop listening':'Listen to colony';
  mute.disabled=!live;
  const recorder=listening.recordingState();
  record.disabled=recorder==='finishing'||(recorder==='idle'&&!listening.canRecord());
  record.textContent=recorder==='recording'?'Stop recording':recorder==='finishing'?'Finishing…':'Record radio';
  record.dataset.recording=String(recorder==='recording');
  recordingPlayer.hidden=featherHeld();
 }

 function render(){
  if(disposed)return;
  limits.textContent=culture?.persistence
    ? 'The colony carries its lineage through Return.'
    : 'This Garden keeps its lineage for the session.';
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
   const appearance=cell.form_return;
   if(appearance?.form){
    const emblem=doc.createElement('span');emblem.className='wg-cell-form';
    emblem.dataset.shape=appearance.form.shape;
    emblem.dataset.turn=appearance.form.direction===-1?'reverse':'normal';
    emblem.setAttribute('aria-hidden','true');
    emblem.style?.setProperty('--cell-hue',String(appearance.form.hue));
    item.append(emblem);
   }
   const detail=doc.createElement('span');
   detail.textContent=' Generation '+cell.generation+' · '+cell.status+
     ' · twist '+(cell.twist.orientation===1?'clockwise':'counterclockwise')+
     ' · parent '+(cell.parent_ids?.join(' + ')||cell.parent_id||'founder')+
     ' · '+(cell.specialisation||'unassigned')+' · acoustic '+cell.acoustic_address+
     ' · observations '+(cell.memory_refs?.length??0)+
     (appearance?.form?' · form '+appearance.form.shape:appearance?.decision==='open'?' · form held open':'');
   item.append(name,detail);entries.append(item);
  }
  const count=cells.filter(cell=>cell.status==='active').length;
  const selected=cells.find(cell=>cell.cell_id===parentChoice.value);
  const appearance=selected?.form_return;
  const stopped=featherHeld();
  askForm.disabled=busy||stopped||!selected;
  formReturn.textContent=appearance
    ? (appearance.form?'Returned form · '+appearance.form.shape: 'The cell held its form open')+
      ' · Wyrdrune receipt '+appearance.receipt_id.slice(0,17)+'…'
    : selected?.form_ancestry?.length
      ? 'This cell carries '+selected.form_ancestry.length+' form return(s) from its lineage.'
      : 'Ask a cell how it wants to appear.';
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
  renderAudio();
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
  if(disposed||roomSignal?.aborted)throw new DOMException('Room departed','AbortError');
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
  const refreshed=await request('',undefined,controller?.signal);
  if(disposed||roomSignal?.aborted)return culture;
  culture=refreshed;
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
  if(type==='listen'){
   if(listening.isActive())listening.stop();
   else if(culture&&!featherHeld()&&!audioController)await listening.start();
   return;
  }
  if(type==='mute'){
   muted=!muted;listening.setMuted(muted);mute.setAttribute('aria-pressed',String(muted));
   return;
  }
  if(type==='record'){
   if(listening.recordingState()==='recording')listening.stopRecording();
   else if(!featherHeld()){
    recordingPlayer.pause?.();
    listening.startRecording();
   }
   return;
  }
  if(type==='stop-audio'){
   audioController?.abort();audioController=null;
   if(listening.isActive())listening.stop();
   status.textContent='Cell sound stopped.';
   render();return;
  }
  if(type==='play'){
   if(!lastExchange||audioController||listening.isActive()||featherHeld())return;
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
   }else if(type==='ask-form'){
    if(!culture||featherHeld())return;
    const result=await request('/form',{
     cell_id:parentChoice.value,expected_revision:culture.revision,owner_confirmed:true,
    },controller.signal);
    culture=result.culture;pending=null;fusionPending=null;
    status.textContent=result.receipt.decision==='open'
      ? 'The cell held its form open.'
      : 'The cell returned a '+result.receipt.form.shape+'.';
   }else if(type==='exchange'){
    const result=await request('/exchange',{
     from_id:senderChoice.value,to_id:receiverChoice.value,
     message:messageInput.value,expected_revision:culture.revision,
     owner_confirmed:true,receiver_route_approved:routeConsent.checked
    },controller.signal);
    culture=result.culture;lastExchange=result.receipt;
    routeConsent.checked=false;pending=null;fusionPending=null;
    status.textContent='Typed local observation delivered.';
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
   if(type==='refresh')status.textContent=culture.persistence?'Colony lineage ready.':'Cell family refreshed.';
  }catch(error){
   if(!disposed && error?.name!=='AbortError')status.textContent='Cell Garden: '+String(error?.message||error);
  }finally{
   controller=null;busy=false;if(!disposed)render();
  }
 }

 function onClick(event){
  const name=event.target?.closest?.('[data-cell-action]')?.dataset.cellAction;
  if(name)void act(name);
 }
 function onSharedFeather(event){
  if(event.detail?.stopped!==true||disposed)return;
  pending=null;fusionPending=null;audioController?.abort();controller?.abort();
  listening.stop('Feather held. Listening stopped.');
  recordingPlayer.pause?.();
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
 const onVolume=()=>listening.setVolume(Number(volume.value)/100);
 volume.addEventListener('input',onVolume);
 section.addEventListener('input',onInput);
 section.addEventListener('change',onInput);
 scope.addEventListener?.(WAYGLASS_FEATHER_EVENT,onSharedFeather);
 void act('refresh');
 return ()=>{
  if(disposed && !roomSignal?.aborted)return;
  disposed=true;
  roomSignal?.removeEventListener('abort',onRoomAbort);
  controller?.abort();audioController?.abort();listening.stop();
  offTake();
  recordingPlayer.pause?.();
  if(recordingUrl)urls.revokeObjectURL(recordingUrl);
  volume.removeEventListener('input',onVolume);
  section.removeEventListener('click',onClick);
  section.removeEventListener('input',onInput);
  section.removeEventListener('change',onInput);
  scope.removeEventListener?.(WAYGLASS_FEATHER_EVENT,onSharedFeather);
 };
}
