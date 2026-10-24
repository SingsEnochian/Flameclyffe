import { FIELDS, normaliseDraft, validateDraft, proposeHandoff, promptForAgent, exportDraft } from './loom-model.js';

const KEY='wayglass.atelier.code-loom.draft/v0.2';
const node=id=>document.getElementById(id);
const status=message=>{node('status').textContent=message;};
let handoff=null;
let draft=normaliseDraft(null);
function readForm() {
  for(const field of FIELDS) draft[field]=node(field).value;
  return draft;
}
function paint(fields){
  for(const field of FIELDS) node(field).value=fields[field]||'';
}
function save(showMessage=true){
  try{
    const current=normaliseDraft(readForm());
    localStorage.setItem(KEY,JSON.stringify(current));
    if(showMessage)status('Local draft saved in this browser. No agent was launched.');
    return true;
  }catch(error){
    status('Browser storage is unavailable. Export a JSON draft to preserve your work.');
    return false;
  }
}
try {
  const saved=localStorage.getItem(KEY);
  if(saved){draft=normaliseDraft(JSON.parse(saved));paint(draft);status('Local draft restored. Its evidence and handoffs remain unverified.');}
} catch{status('Local draft unavailable. You can continue and export your work.');}
let pending=null;
node('loom-form').addEventListener('input',()=>{
  clearTimeout(pending);
  pending=setTimeout(()=>save(false),450);
});
node('save').addEventListener('click',()=>save());
node('propose').addEventListener('click',()=>{
  const report=validateDraft(readForm());
  if(!report.ok) {status('Before proposing a handoff: '+report.issues.join(' '));return;}
  try{
    handoff=proposeHandoff(report.draft,node('seat').value,node('assignment').value);
    const prompt=promptForAgent(handoff);
    node('handoff-preview').textContent=prompt;
    node('copy').disabled=false;
    draft.handoffs=Array.isArray(draft.handoffs)?draft.handoffs:[];
    draft.handoffs.push({seat:handoff.seat,assignment:handoff.assignment,status:handoff.status});
    save(false);
    status('Handoff composed locally. Copy it to an authorised agent route to submit it.');
  } catch(error) {status(error.message||String(error));}
});
node('copy').addEventListener('click',async()=>{
  if(!handoff)return;
  try{
    await navigator.clipboard.writeText(promptForAgent(handoff));
    status('Handoff copied. This does not dispatch or authenticate an agent.');
  }catch{
    status('Clipboard unavailable. Select the handoff preview text and copy manually.');
  }
});
node('export').addEventListener('click',()=>{
  const report=validateDraft(readForm());
  const packet=exportDraft(report.draft);
  const blob=new Blob([JSON.stringify(packet,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='wayglass-code-loom-draft.json';document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
  status(report.ok?'Draft exported, not yet a verified kernel receipt.':'Partial draft exported. Missing: '+report.issues.join(' '));
});
node('import').addEventListener('click',()=>node('import-file').click());
node('import-file').addEventListener('change',async(event)=>{
 const file=event.target.files?.[0];
 event.target.value='';
 if(!file)return;
 if(file.size>512_000){status('Import rejected: exceeds the 500 KiB draft limit.');return;}
 try{
  const value=JSON.parse(await file.text());
  if(!value||typeof value!=='object'||!['wayglass.atelier.code-loom/v0.2','wayglass.atelier.code-loom-draft/v1'].includes(value.schema)){
   status('Import rejected: this is not a recognised Code Loom draft.');return;
  }
  draft=normaliseDraft(value);paint(draft);
  handoff=null;node('handoff-preview').textContent='Imported draft. No agent status or execution result was accepted as verified.';
  node('copy').disabled=true;
  save(false);
  status('Draft imported. Any claimed agent statuses reset to proposed and unverified.');
 }catch{status('Could not parse the imported JSON draft. The current bench is unchanged.');}
});
node('clear').addEventListener('click',()=>{
 if(!confirm('Clear this browser’s Code Loom draft? Export first if you wish to preserve it.'))return;
 draft=normaliseDraft(null);paint(draft);handoff=null;node('assignment').value='';
 node('handoff-preview').textContent='No handoff composed.';
 node('copy').disabled=true;
 try{localStorage.removeItem(KEY);}catch{}
 status('Local bench cleared. No remote records were touched.');
});
