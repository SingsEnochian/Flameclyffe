import {WAYGLASS_FEATHER_EVENT} from './somatic-sound.js';
import {publishWatercolorActivity} from './watercolor-bridge.js';
export async function readAuthorityExperiment(command=null,{fetchImpl=fetch}={}){
  const response=await fetchImpl('/api/v1/wayglass/authority/loki',{
    method:command?'POST':'GET',cache:'no-store',credentials:'same-origin',
    headers:{Accept:'application/json',...(command?{'Content-Type':'application/json'}:{})},
    ...(command?{body:JSON.stringify({command})}:{}),
  });
  const data=await response.json();if(!response.ok)throw new Error(data.error||'Authority host unavailable');
  if(data.schema!=='wayglass.loki-biscuit/v1')throw new Error('Unrecognised authority receipt');
  return data;
}
export function authoritySummary(data){
  const s=data.snapshot;
  return [s.undertakings.biscuits?.original||'No experiment prepared.',
    ...data.decisions.map(d=>d.action+': '+d.status+' · permitted effects: '+(d.allowed.join(', ')||'none')),
    ...s.objections.map(o=>'Unresolved objection · '+o.participant+': '+o.original),
    'Recorded local effects: '+data.effects.length,
    'Revision '+s.revision+' · '+(s.head||'no ledger yet'),
    ...(data.return_receipt?['Return receipt: '+data.return_receipt.storage_id]:[]),
    'Experimental local effects · no model turn or architectural construction.'].join('\n');
}
export function mountAuthorityLineageView(root,{request=readAuthorityExperiment,scope=globalThis,readOnly=false}={}){
  const panel=document.createElement('details');panel.className='glass-panel wg-authority-lineage';
  const title=document.createElement('summary');title.textContent='Authority lineage · Loki Biscuit Test';
  const description=document.createElement('p');description.textContent='Prepare the scenario, record the objection, then run queued work. Read the original words and the permissions that remain.';
  const output=document.createElement('pre');output.style.whiteSpace='pre-wrap';output.setAttribute('role','status');output.textContent='Open to inspect the authenticated host ledger.';
  const controls=document.createElement('div');controls.className='wg-authority-controls';let dead=false,pending=0,shownRevision=-1;
  async function act(command){
    if(dead||(pending&&!['feather','object'].includes(command)))return;
    pending++;
    try{const data=await request(command);if(!dead&&data.snapshot.revision>=shownRevision){shownRevision=data.snapshot.revision;output.textContent=authoritySummary(data);
      if(data.snapshot.head)publishWatercolorActivity({kind:'authority:recomputed',actor:'wayglass:authority-experiment',receipt:{schema:data.schema,receipt_id:data.snapshot.head},intensity:data.snapshot.objections.length?0.35:0.6});}}
    catch(error){if(!dead)output.textContent=error.message;}
    finally{pending--;}
  }
  for(const [command,label] of [[null,'Refresh'],['prepare','Prepare experiment'],['object','Record Loki’s objection'],['run','Run queued work'],['feather','Stop experiment'],['release','Release stop'],['return','Keep Return receipt']]){
    if(readOnly&&command)continue;
    const button=document.createElement('button');button.type='button';button.className='glass-chip';button.textContent=label;button.addEventListener('click',()=>act(command));controls.append(button);
  }
  panel.addEventListener('toggle',()=>{if(panel.open)act(null);});
  const feather=event=>{if(event.detail?.stopped===true)act('feather');};
  scope.addEventListener?.(WAYGLASS_FEATHER_EVENT,feather);
  panel.append(title,description,controls,output);root.append(panel);
  return {destroy(){dead=true;scope.removeEventListener?.(WAYGLASS_FEATHER_EVENT,feather);panel.remove();}};
}
