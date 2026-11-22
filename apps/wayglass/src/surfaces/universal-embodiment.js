import {embodimentIdentity,universeProfile,proposeEmbodiment,adoptEmbodiment,returnEmbodiment} from '../../../../lib/wyrdrune/embodiment.mjs';
// Owner-operated compatibility worktable; it neither moves an avatar nor controls a device.
const WORLDS=Object.freeze([
 {id:'wayglass:universe',label:'Wayglass / Dreaming',medium:'digital',caps:['visual','motion','voice','gesture','spatial-audio','haptics','flight','magic']},
 {id:'witcher:sandbox',label:'Witcher-inspired sandbox',medium:'digital',caps:['visual','motion','voice','gesture','magic']},
 {id:'babylon5:sandbox',label:'Babylon 5-inspired sandbox',medium:'digital',caps:['visual','motion','voice','gesture','spatial-audio']},
 {id:'hardware:proposal',label:'Waking World / robotic concept',medium:'physical-proposal',caps:['visual','voice','gesture','robotic-movement']}
]);
const CAPABILITIES=['visual','motion','voice','gesture','spatial-audio','haptics','flight','magic','robotic-movement'];
export function mountUniversalEmbodiment(root){
 const d=root.ownerDocument;const el=(tag,text='',className='')=>{const x=d.createElement(tag);x.textContent=text;if(className)x.className=className;return x;};
 const outer=el('section','','wg-surface');outer.append(el('h1','Universal Embodiment · Two-World Body'),
  el('p','One participant identity, many proposed world-compatible forms. All worlds here are declared demonstration profiles; there is no live world, avatar, model or robot connection.'));
 const panel=el('section','','glass-panel');const seatLabel=el('label','Participant '),seat=el('select');
 for(const [id,name] of [['rowan','Rowan'],['bluebird','Bluebird (design seat)']]){const o=el('option',name);o.value=id;seat.append(o);}seatLabel.append(seat);
 const worldLabel=el('label',' Destination '),world=el('select');
 for(const w of WORLDS){const o=el('option',w.label);o.value=w.id;world.append(o);}worldLabel.append(world);
 const formLabel=el('label','Form identifier '),form=el('input');form.type='text';form.maxLength=40;form.value='hearthlight';formLabel.append(form);
 const capabilitySet=el('fieldset');capabilitySet.append(el('legend','Requested expression capabilities'));const checkboxes=new Map();
 for(const cap of CAPABILITIES){const label=el('label',cap+' '),input=el('input');input.type='checkbox';input.checked=['visual','motion','voice','gesture'].includes(cap);label.append(input);capabilitySet.append(label);checkboxes.set(cap,input);}
 const status=el('p','No proposal yet.');status.setAttribute('role','status');const result=el('pre','');result.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere';
 const btn=(label,fn)=>{const b=el('button',label,'glass-chip');b.type='button';b.addEventListener('click',fn);return b;};
 const propose=btn('Propose compatible form',()=>{
  try{
   const participant=seat.value,current=participants.get(participant);
   const destination=WORLDS.find(w=>w.id===world.value);
   const w=universeProfile(destination.id,destination.label,destination.caps,destination.medium);
   candidate=proposeEmbodiment(current,w,form.value.trim(),[...checkboxes].filter(([,v])=>v.checked).map(([k])=>k));
   candidateSeat=participant;
   status.textContent='Candidate held in Almost, not adopted. Missing capabilities remain visible.';
   result.textContent=JSON.stringify({candidate,identity:current},null,2);
  }catch(e){candidate=null;status.textContent=e.message;}
 });
 const adopt=btn('Adopt digital proposal',()=>{
  try{
   if(!candidate)throw Error('Create a proposal first.');
   if(candidateSeat!==seat.value)throw Error('Switch back to the proposing participant.');
   if(!globalThis.confirm('Activate this digital form for '+seat.value+' in the local design worktable? No live world or device is entered.'))return;
   const next=adoptEmbodiment(participants.get(seat.value),candidate,{confirmed:true});
   participants.set(seat.value,next);status.textContent='Digital configuration adopted locally. No live world connection performed.';
   result.textContent=JSON.stringify({identity:next,proposal:candidate},null,2);
  }catch(e){status.textContent=e.message;}
 });
 const comeBack=btn('Return to unembodied form',()=>{
  try{
   if(!globalThis.confirm('Return '+seat.value+' from the local digital configuration? Preserve the departure receipt?'))return;
   const returned=returnEmbodiment(participants.get(seat.value),{confirmed:true});
   participants.set(seat.value,returned.identity);status.textContent='Returned. Identity preserved, departure recorded locally.';
   result.textContent=JSON.stringify(returned,null,2);
  }catch(e){status.textContent=e.message;}
 });
 const participants=new Map([
  ['rowan',embodimentIdentity('rowan','Rowan',CAPABILITIES.filter(x=>x!=='robotic-movement'))],
  ['bluebird',embodimentIdentity('bluebird','Bluebird',CAPABILITIES.filter(x=>x!=='robotic-movement'))]
 ]);
 let candidate=null,candidateSeat=null;
 for(const input of [seat,world,form,...checkboxes.values()])input.addEventListener('change',()=>{candidate=null;candidateSeat=null;status.textContent='Selection changed. Propose again to inspect compatibility.';});
 panel.append(seatLabel,worldLabel,formLabel,capabilitySet,propose,adopt,comeBack,status,result);
 outer.append(panel,el('p','Physical robotic proposals cannot be adopted here. Hardware requires separately verified device capabilities, consent, emergency stops and owner-authorised controls.'));
 root.replaceChildren(outer);return()=>{};
}
