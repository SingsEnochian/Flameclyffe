import './cell-garden.css';
import {WAYGLASS_FEATHER_EVENT, wayglassSomaticSound} from '../somatic-sound.js';

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
 let disposed=false,busy=false,pending=null,culture=null,controller=null;
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
 section.append(heading,shell,status,family,candidate);
 root.replaceChildren(section);

 function render(){
  if(disposed)return;
  const cells=culture?.cells||[];
  const chosen=parentChoice.value;
  parentChoice.replaceChildren();
  for(const cell of cells.filter(cell=>cell.status==='active')){
   const option=doc.createElement('option');option.value=cell.cell_id;
   option.textContent=cell.cell_id+' · generation '+cell.generation;
   parentChoice.append(option);
  }
  if(cells.some(cell=>cell.cell_id===chosen&&cell.status==='active'))parentChoice.value=chosen;
  entries.replaceChildren();
  for(const cell of cells){
   const item=doc.createElement('li');item.className='wg-cell-lineage';
   item.dataset.cellStatus=cell.status;
   const name=doc.createElement('strong');name.textContent=cell.cell_id;
   const detail=doc.createElement('span');
   detail.textContent=' Generation '+cell.generation+' · '+cell.status+
     ' · twist '+(cell.twist.orientation===1?'clockwise':'counterclockwise')+
     ' · parent '+(cell.parent_id||'founder');
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
  return culture;
 }

 async function act(type){
  if(disposed)return;
  if(type==='feather'){
   pending=null;controller?.abort();sound.feather();
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
   }else if(type==='resume'){
    sound.releaseFeather({confirmed:true});
    culture=await request('/resume',{owner_confirmed:true},controller.signal);
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
  pending=null;
  controller?.abort();
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
 scope.addEventListener?.(WAYGLASS_FEATHER_EVENT,onSharedFeather);
 void act('refresh');
 return ()=>{
  if(disposed)return;disposed=true;
  controller?.abort();
  section.removeEventListener('click',onClick);
  scope.removeEventListener?.(WAYGLASS_FEATHER_EVENT,onSharedFeather);
 };
}
