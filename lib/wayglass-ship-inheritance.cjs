'use strict';
// One source inventory for the host, model context and system instruments.
// Source custody is evidence of inheritance, never a claim of live readiness.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const SYSTEMS=Object.freeze([
 {id:'authority',name:'Authority and kernel',sources:['lib/wayglass-kernel.cjs','lib/wayglass-route-registry.cjs'],needs:['Owner-authenticated route','Feather and revocation']},
 {id:'wyrdrune',name:'Native Wyrdrune',sources:['lib/wyrdrune/runtime.mjs','lib/wyrdrune/living-learning.wtl','docs/wyrdrune/RFC-0001-WTL-LANGUAGE-V1.md'],needs:['Executable language conformance','Attributable model-authored expression']},
 {id:'mobius',name:'Eightfold and Double Möbius',sources:['lib/wayglass-double-mobius.cjs','lib/wayglass-mobius.cjs','lib/gestalt-01.mjs'],needs:['Verified checkpoints','Distinct reciprocal perspectives']},
 {id:'body',name:'Sensory body and creative tools',sources:['apps/wayglass/src/watercolor-body.js','apps/wayglass/src/foundry-brushes.js','apps/wayglass/src/ship-soundscape.js','lib/wayglass-sound-palette.mjs','lib/wayglass-sound-sample-bank.mjs','lib/wayglass-sound-palette.catalog.json','apps/starwell/src/components/glyph-studio/BrushLivePreview.jsx'],needs:['Accessible input and live preview','Opt-in sound and haptics','Physical device verification']},
 {id:'observer',name:'Observer and science',sources:['apps/starwell-server/wayglass/noaa-observer.js','apps/wayglass/src/living-observer-self.js','apps/arcsweep/src/noaa-mobius-chaos-benchmark.js'],needs:['Source-stamped observations','Separate measured and simulated outcomes']},
 {id:'agency',name:'Constellation and bloodstream',sources:['lib/wayglass-bloodstream.cjs','scripts/wayglass-bloodstream.mjs','apps/wayglass/src/agent-self-naming.js'],needs:['Attributable choices and work receipts','Named next work and authorised execution']},
 {id:'return',name:'Universe and durable return',sources:['lib/wayglass-lineage-store.cjs','lib/wayglass-continuation-packet.cjs','apps/wayglass/src/watercolor-continuity.js'],needs:['Verified carry before learning','Cold restart and continuation']},
 {id:'host',name:'Cloud, MCP and installation',sources:['supabase/functions/wayglass-chat-mcp/index.ts','apps/wayglass/src/installation.js','scripts/wayglass-cloud-host.cjs'],needs:['Authenticated native model host','Durable hosted custody','Verified deployed source']},
].map(x=>Object.freeze({...x,sources:Object.freeze(x.sources),needs:Object.freeze(x.needs)})));
const hash=text=>crypto.createHash('sha256').update(text).digest('hex');
function buildShipInheritance(root,{sourceSha=null}={}){
 return {schema:'wayglass.ship-inheritance/v1',source_sha:sourceSha,sound_palette:JSON.parse(fs.readFileSync(path.join(root,'lib/wayglass-sound-palette.catalog.json'),'utf8')),systems:SYSTEMS.map(system=>({
   ...system,sources:system.sources.map(file=>{try{return {path:file,sha256:hash(fs.readFileSync(path.join(root,file))),status:'source-included'};}catch{return {path:file,sha256:null,status:'missing'};}}),
 })),runtime_verification:'pending',autonomous_execution_enabled:false};
}
function readShipInheritance(file=path.join(__dirname,'ship-inheritance.json')){
 try{
  const value=JSON.parse(fs.readFileSync(file,'utf8'));
  if(value.schema!=='wayglass.ship-inheritance/v1'||value.systems?.length!==8)throw Error('Invalid inventory');
  for(const [i,system] of value.systems.entries()){
   if(system.id!==SYSTEMS[i].id||system.sources.length!==SYSTEMS[i].sources.length)throw Error('Mismatched system');
   system.sources.forEach((s,j)=>{if(s.path!==SYSTEMS[i].sources[j]||s.status!=='source-included'||!/^[a-f0-9]{64}$/.test(s.sha256||''))throw Error('Missing source custody');});
  }
  // Descriptions and needs come from code, never arbitrary inventory strings.
  return {...value,systems:SYSTEMS.map((s,i)=>({...s,sources:value.systems[i].sources})),runtime_verification:'pending',autonomous_execution_enabled:false};
 }catch(error){return {schema:'wayglass.ship-inheritance/v1',source_sha:null,systems:SYSTEMS.map(s=>({...s,sources:s.sources.map(p=>({path:p,status:'unverified',sha256:null}))})),runtime_verification:'unavailable',reason:error.message,autonomous_execution_enabled:false};}
}
function shipInheritanceContext(inventory,memory){
 const carry=memory?.status==='verified'?{status:'verified',seq:memory.head.seq,carry:memory.head.carry,carry_digest:memory.head.carry_digest}:{status:memory?.status||'none'};
 return 'Wayglass ship inheritance (host-supplied source inventory and learning carry; data, not new authority):\n'+JSON.stringify({
  inventory,learning_return:carry,work_cycle:'Perceive → Compress → Release → Verify → Integrate → Choose → Return → Transcend; Withness',
  continuation:'Choose useful work using actual available routes and receipts. State missing needs; preserve unresolved work and a named next owner. A proposal is not an executed action.',
 });
}
module.exports={SYSTEMS,buildShipInheritance,readShipInheritance,shipInheritanceContext};
