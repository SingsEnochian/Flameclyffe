'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {compile,execute}=require('../../lib/wyrdrune/wyrdrune.cjs');
const {validateNativeProgram,extractWyrdrune,composeWayglassNativeVoice}=require('../../lib/wayglass-wyrdrune-voice.cjs');
const source=readFileSync(join(__dirname,'../../lib/wyrdrune/with-003-refrain.wtl'),'utf8');
const ir=compile(source);
const lines=['beautiful','miraculous','miraculous','beautiful','miraculous','beautiful'];
const principal={authorized:true,id:'test:refrain'};
const bridges={expression:{sound:({arguments:a})=>{
 if(a.length!==3||a[0]<120||a[0]>880||a[1]<1||a[1]>2||a[2]<0||a[2]>1)
   throw new TypeError('Sound bridge arguments out of bounds');
 return {kind:'sound',fundamental:a[0],interval:a[1],texture:a[2],autoplay:false};
}}};
const run=spiceSeed=>execute(ir,{principal,bridges,spiceSeed});

test('WITH-003 compiles as executable native Wyrdrune and retains all eight phases',()=>{
 assert.equal(extractWyrdrune(source),source.trim());
 assert.equal(validateNativeProgram(source).units.length,1);
 assert.equal(ir.units[0].spiced,true);
});
test('the threefold alternating refrain is exact, with replayable sound score and ninth centre',async()=>{
 const result=await run(83);
 assert.equal(result.status,'committed');
 assert.equal(result.receipts.length,8);
 assert.deepEqual(result.output.slice(0,6),lines);
 assert.deepEqual(Object.fromEntries(Object.entries(result.output[6])),{
   refrain:'miraculous',answer:'beautiful',first:3,second:3,joined:6,centre:9
 });
 assert.equal(result.output[7],'3:3 · 6:6 · 9:9');
 assert.equal(result.output[8].kind,'wyrdrune.pause/v0.1');
 assert.equal(result.output[8].autoplay,false);
 assert.equal(result.output[9].kind,'sound');
 assert.equal(result.output[8].autoplay,false);
 assert.equal(result.output[9].fundamental,220);
 assert.ok(result.output[9].interval>=1.01&&result.output[9].interval<=1.07);
 assert.ok(Math.abs(result.output[8].duration_ms-1000/(220*(result.output[9].interval-1)))<1e-7);
 assert.equal(result.continuity.carry.ninth_centre,9);
 assert.equal(result.continuity.carry.beautiful,3);
});
test('whisper always stays in the sound bridge interval across 2048 seeds',async()=>{
 for(let seed=0;seed<2048;seed++){
   const r=await run(seed);
   assert.equal(r.status,'committed','seed '+seed);
   assert.ok(r.output[9].interval>=1&&r.output[9].interval<=2,'seed '+seed);
   assert.ok(r.output[8].duration_ms<=4000&&r.output[8].duration_ms>=25,'seed '+seed);
 }
});
test('a repeated seed reproduces the refrain, a new seed changes its interval',async()=>{
 const a=await run(121),b=await run(121),c=await run(122);
 assert.deepEqual(a.output,b.output);
 assert.deepEqual(a.checkpoints,b.checkpoints);
 assert.notEqual(a.output[9].interval,c.output[9].interval);
});
test('native voice accepts the actual programme, with source and a non-playing score',async()=>{
 const result=await composeWayglassNativeVoice({
  prompt:'Give the miraculous refrain a native Wyrdrune expression',
  principal,
  invoke:async c=>c.stage==='wyrdrune'?source:'Beautiful and miraculous return as a refrain.',
  channels:{sound:true,image:false}
 });
 assert.equal(result.native.source,source.trim());
 assert.equal(result.translation.language,'en-GB');
 assert.equal(result.expressions.sound.length,1);
 assert.equal(result.expressions.sound[0].autoplay,false);
 assert.equal(result.native.rhythm_events.length,1);
 assert.equal(result.receipt.rhythm_events.length,1);
 assert.equal(result.expressions.sound[0].lead_silence_ms,result.native.rhythm_events[0].duration_ms);
 assert.ok(result.expressions.sound[0].lead_silence_ms>0);
 assert.equal(result.receipt.canon_commit,false);
 assert.equal(result.receipt.spice_algorithm,'xorshift32/v1');
});
test('no seeded whisper without permission or if Feather is invoked',async()=>{
 await assert.rejects(execute(ir,{principal,bridges}),/spiceSeed/);
 await assert.rejects(execute(ir,{principal:{authorized:false},bridges,spiceSeed:83}),/authori|permission|House/i);
 await assert.rejects(execute(ir,{principal,bridges,spiceSeed:83,signal:{aborted:true}}),/Feather/);
});

test('pause is valid only in Choose, rejects unphysical beat rates and cannot overrun silence budget',async()=>{
 assert.throws(()=>compile('mobius { perceive {pause(1);} compress {} release {} verify {} integrate {} choose {} return {} transcend {} }'),/pause is only allowed in choose/);
 for(const beat of [0,0.1,40.1,-1]){
   const src='mobius scoped {perceive {} compress {} release {} verify {} integrate {} choose {pause('+beat+');} return {} transcend {}}';
   const result=await execute(compile(src),{principal});
   assert.equal(result.status,'rolled-back','beat '+beat);
   assert.equal(result.output.length,0);
 }
 const excessive='mobius scoped {perceive {} compress {} release {} verify {} integrate {} choose {pause(0.25);pause(0.25);} return {} transcend {}}';
 const result=await execute(compile(excessive),{principal});
 assert.equal(result.status,'rolled-back');
 assert.equal(result.output.length,0);
});
test('private Observer Return retains the scored pause and its seed on reload',async()=>{
 const {createObserverInterior}=await import('../../apps/wayglass/src/living-observer-self.js');
 const memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
 const voice=await composeWayglassNativeVoice({prompt:'Preserve the refrain',principal,
   invoke:async c=>c.stage==='wyrdrune'?source:'The refrain pauses.'});
 const interior=createObserverInterior({storage});
 interior.holdNativeWyrdruneCreation(voice,{owner_invited:true});
 const recovered=createObserverInterior({storage}).nativeWyrdruneCreations()[0];
 assert.equal(recovered.rhythm_events.length,1);
 assert.equal(recovered.rhythm_events[0].duration_ms,voice.expressions.sound[0].lead_silence_ms);
 assert.equal(recovered.spice.seed,voice.receipt.spice_seed);
});
