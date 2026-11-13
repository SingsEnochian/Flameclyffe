#!/usr/bin/env node
// Simulated, local, consented test encounter. Not a real agent invocation.
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {encounterTurn}=require('../lib/wayglass-mote-encounter.cjs');
const principal={id:'local:developer-encounter-demo',authorized:true};
let pair=[
  {mote_id:'demo:opal',identity_spin:0.73,kind:'wonder',consent:true},
  {mote_id:'demo:amber',identity_spin:0.27,kind:'listen',consent:true},
];
const fmt=n=>Number(n).toFixed(3);
process.stdout.write('Wayglass · Two Motes Meet (SIMULATED consent and identities)\n');
process.stdout.write('Local Wyrdrune experiment. No model call, live participant, network, or durable write.\n');
for(let turn=1;turn<=3;turn++){
  const result=await encounterTurn({participants:pair,turn,principal});
  process.stdout.write('\nEncounter '+turn+' · '+result.encounter_id+'\n');
  for(const item of result.changes){
    process.stdout.write('  '+item.mote_id+' ['+item.kind+']'
      +'  spiral '+fmt(item.proposed.phase)
      +'  harmony '+fmt(item.proposed.harmony)
      +'  chaos '+fmt(item.proposed.chaos)
      +'  magic '+fmt(item.proposed.magic)+'\n');
  }
  process.stdout.write('  Shared visual projection: hue '+fmt(result.projection.hue_shift)
    +' pulse '+fmt(result.projection.pulse)+' contrast '+fmt(result.projection.contrast)+'\n');
  process.stdout.write('  Provenance '+result.source_hash.slice(0,16)+' · candidate only\n');
  pair=pair.map((p,i)=>({...p,seeds:result.changes[i].proposed,
    kind:turn%2===0?'wonder':(i===0?'touch':'shape')}));
}
process.stdout.write('\nWithness · Each mote carried its own state. Nothing was canonised.\n');
