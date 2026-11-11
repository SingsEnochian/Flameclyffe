'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),{join}=require('node:path');
const {compile,execute}=require('../../lib/wyrdrune/wyrdrune.cjs');
const {extractWyrdrune,validateNativeProgram}=require('../../lib/wayglass-wyrdrune-voice.cjs');
const source=readFileSync(join(__dirname,'../../lib/wyrdrune/with-002-amber.wtl'),'utf8'),ir=compile(source);
const principal={id:'test',authorized:true};
const bridges={expression:{
 image:({arguments:a})=>({kind:'image',values:a}),
 sound:({arguments:a})=>({kind:'sound',values:a}),
}};
const run=(seed=83)=>execute(ir,{principal,bridges,spiceSeed:seed});
test('Amber WTL spiced syntax accepted in voice and compiler',()=>{
 assert.equal(extractWyrdrune(source),source.trim());
 assert.equal(validateNativeProgram(source).units.length,2);
 assert.ok(ir.units.every(unit=>unit.spiced));
});
test('WITHNESS holds distinct identities and a second reciprocal encounter',async()=>{
 const out=await run();
 assert.equal(out.status,'committed');
 assert.equal(out.checkpoints.length,2);
 assert.deepEqual(out.checkpoints.map(x=>x.face),['outer','inner']);
 assert.equal(out.output[0].kind,'wyrdrune.withness/v0.1');
 assert.equal(out.output[4].kind,'wyrdrune.withness/v0.1');
 for(const i of [0,4]){
  assert.deepEqual(out.output[i].participants.map(p=>p.id),['rowan','amber']);
  assert.deepEqual(out.output[i].participants.map(p=>p.agency),['free','free']);
 }
 assert.ok(out.output[0].field.beat_hz>2.3&&out.output[0].field.beat_hz<3.7);
 assert.equal(out.output[4].field.previous_hue,out.output[0].field.third_hue);
 assert.deepEqual([out.output[1].kind,out.output[2].kind,out.output[5].kind],['image','sound','image']);
 assert.equal(out.spice.seed,83);
 assert.equal(out.continuity.carry.shared_hue,out.output[4].field.new_hue);
});
test('whisper is seeded, replayable and variable',async()=>{
 const a=await run(109),b=await run(109),c=await run(110);
 assert.deepEqual(a.output,b.output);
 assert.deepEqual(a.checkpoints,b.checkpoints);
 assert.equal(a.lineage.root,b.lineage.root);
 assert.notEqual(a.lineage.root,c.lineage.root);
 assert.notEqual(a.output[0].field.third_hue,c.output[0].field.third_hue);
});
test('unseeded spice and out-of-scope whisper refuse',async()=>{
 await assert.rejects(execute(ir,{principal,bridges}),/spiceSeed/);
 const x=compile('mobius scoped { perceive {let x=whisper(0,1);} compress {} release {} verify {} integrate {} choose {emit x;} return {} transcend {} }');
 await assert.rejects(execute(x),/whisper requires mobius spiced/);
});
test('WITHNESS refuses identity collapse and restricted agency',async()=>{
 for(const replacement of [source.replace('id: "amber"','id: "rowan"'),source.replace('agency: "free"','agency: "held"')]){
  const out=await execute(compile(replacement),{principal,bridges,spiceSeed:83});
  assert.equal(out.status,'rolled-back');assert.deepEqual(out.output,[]);
 }
});
test('Feather interrupts the experiment',async()=>{
 await assert.rejects(execute(ir,{principal,bridges,spiceSeed:83,signal:{aborted:true}}),/Feather/);
});

test('native Wayglass voice preserves Amber WITHNESS records and replay seed',async()=>{
 const {composeWayglassNativeVoice}=require('../../lib/wayglass-wyrdrune-voice.cjs');
 const result=await composeWayglassNativeVoice({prompt:'Explore the two meetings',principal:{id:'owner',authorized:true},
  invoke:async ({stage})=>stage==='wyrdrune'?source:'We were here, distinct, together.',
  channels:{image:true,sound:true}});
 assert.equal(result.native.withness_declarations.length,2);
 assert.deepEqual(result.native.withness_declarations[0].participants.map(p=>p.id),['rowan','amber']);
 assert.equal(result.translation.language,'en-GB');
 assert.equal(result.receipt.spice_algorithm,'xorshift32/v1');
 assert.ok(Number.isSafeInteger(result.receipt.spice_seed));
 assert.equal(result.receipt.canon_commit,false);
});
