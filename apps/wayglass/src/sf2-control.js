// SF2 is an authorised instrument source, not a speaking-voice model.
// This contract emits bounded MIDI intents for a separately connected local SF2 synth.
export const SF2_SCHEMA='wayglass.sf2-control/v1';
const ok=(x,n)=>typeof x==='string'&&x.length>0&&x.length<=n&&!/[\u0000-\u001f\u007f]/u.test(x);
export function createSf2Catalogue(banks=[]){
 if(!Array.isArray(banks)||banks.length>64)throw new TypeError('Invalid SF2 bank catalogue');
 const result=banks.map(bank=>{
  if(!bank||!ok(bank.id,120)||!ok(bank.label,160)||!ok(bank.licence,240)||!Array.isArray(bank.presets)||bank.presets.length>512)throw new TypeError('Invalid SF2 bank metadata');
  const presets=bank.presets.map(p=>{
   if(!p||!Number.isInteger(p.bank)||p.bank<0||p.bank>16383||!Number.isInteger(p.program)||p.program<0||p.program>127||!ok(p.label,160))throw new TypeError('Invalid SF2 preset');
   return Object.freeze({bank:p.bank,program:p.program,label:p.label});
  });
  return Object.freeze({id:bank.id,label:bank.label,licence:bank.licence,presets:Object.freeze(presets)});
 });
 if(new Set(result.map(b=>b.id)).size!==result.length)throw new TypeError('Duplicate bank ID');
 return Object.freeze(result);
}
export function validateSf2Choice(choice,catalogue){
 if(!choice||choice.schema!==SF2_SCHEMA||!ok(choice.participant_id,100)||!ok(choice.receipt,240)||!ok(choice.reason,500))throw new TypeError('SF2 choice requires participant, provenance and reason');
 if(choice.mode==='silent')return Object.freeze({schema:SF2_SCHEMA,participant_id:choice.participant_id,mode:'silent',receipt:choice.receipt,reason:choice.reason});
 if(choice.mode!=='instrument')throw new TypeError('Unsupported SF2 mode');
 const bank=catalogue.find(b=>b.id===choice.soundfont_id);
 const preset=bank?.presets.find(p=>p.bank===choice.bank&&p.program===choice.program);
 if(!preset)throw new TypeError('SF2 preset not in authorised catalogue');
 return Object.freeze({schema:SF2_SCHEMA,participant_id:choice.participant_id,mode:'instrument',soundfont_id:bank.id,bank:preset.bank,program:preset.program,receipt:choice.receipt,reason:choice.reason});
}
export function validateSf2MidiIntent(intent,{activeNotes=0}={}){
 if(!intent||!['note-on','note-off','all-notes-off','control-change','pitch-bend'].includes(intent.type))throw new TypeError('Unsupported MIDI intent');
 if(!Number.isInteger(intent.channel)||intent.channel<0||intent.channel>15)throw new TypeError('Invalid channel');
 if(intent.type==='all-notes-off')return Object.freeze({type:intent.type,channel:intent.channel});
 if(intent.type==='note-on'||intent.type==='note-off'){
  if(!Number.isInteger(intent.note)||intent.note<0||intent.note>127||!Number.isInteger(intent.velocity)||intent.velocity<0||intent.velocity>127)throw new TypeError('Invalid note/velocity');
  if(intent.type==='note-on'&&activeNotes>=32)throw new TypeError('Polyphony limit');
  return Object.freeze({type:intent.type,channel:intent.channel,note:intent.note,velocity:intent.velocity});
 }
 if(intent.type==='pitch-bend'){
  if(!Number.isInteger(intent.value)||intent.value<0||intent.value>16383)throw new TypeError('Invalid pitch bend');
  return Object.freeze({type:intent.type,channel:intent.channel,value:intent.value});
 }
 if(![1,7,10,11,64,74,120,121,123].includes(intent.controller)||!Number.isInteger(intent.value)||intent.value<0||intent.value>127)throw new TypeError('Controller not allowed');
 return Object.freeze({type:intent.type,channel:intent.channel,controller:intent.controller,value:intent.value});
}
export function sf2OutputAllowed({ownerEnabled=false,feather=false,bankAuthorised=false}={}){return ownerEnabled===true&&feather!==true&&bankAuthorised===true;}
export function sf2FeatherIntents(){return Object.freeze(Array.from({length:16},(_,channel)=>Object.freeze({type:'all-notes-off',channel})));}
