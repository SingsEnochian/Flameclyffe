'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const native=require('./wyrdrune.cjs');
const bridge=()=>import('./fiction-mobius.mjs');
test('one piece of fiction becomes real canonical carried Möbius cycles with verified narrative events',async()=>{
 const {FICTION_EXAMPLE,fictionToWtl,verifyFictionExecution}=await bridge();
 const p=fictionToWtl(FICTION_EXAMPLE,{world:'wayglass:storybook',compile:native.compile});
 const r=await native.execute(p.ir,{principal:{id:'story-local',authorized:false},bridges:{},maxOperations:10000});
 const verified=verifyFictionExecution(p,r);
 assert.equal(r.status,'committed');assert.equal(r.withness.completedCycles,6);
 assert.equal(verified.crossings,6);assert.deepEqual(verified.carry,{story_step:6});
 assert.equal(verified.events.filter(x=>x.classification==='dialogue').length,1);
 assert.equal(verified.proposed_effects.length,2);
 assert.ok(verified.events.every(x=>x.physically_verified===false));
 assert.ok(p.wtl.includes('mobius scoped'));
 assert.ok(p.wtl.includes('require next_step == 6'));
});
test('spoken dialogue remains author-supplied text, not authenticated people',async()=>{
 const {fictionToWtl,verifyFictionExecution}=await bridge();
 const p=fictionToWtl('Falka: "Hello, dreamer."', {compile:native.compile});
 const result=verifyFictionExecution(p,await native.execute(p.ir,{bridges:{}}));
 assert.equal(result.events[0].speaker,'Falka');
 assert.equal(result.events[0].classification,'dialogue');
 assert.equal(result.events[0].passage,'"Hello, dreamer."');
 assert.equal(result.events[0].observation_kind,'authored-fiction');
});
test('fiction cannot silently execute commands, external effects or unrecognised directives',async()=>{
 const {fictionToWtl,verifyFictionExecution}=await bridge();
 assert.throws(()=>fictionToWtl('::delete the server'),/Unsupported fiction directive/);
 const prose='She opened every portal and sent messages to the stars.\n::cue video a golden sky';
 const p=fictionToWtl(prose,{compile:native.compile});
 const r=await native.execute(p.ir,{bridges:{}});
 const receipt=verifyFictionExecution(p,r);
 assert.deepEqual(receipt.external_effects,[]);
 assert.equal(receipt.events[0].classification,'narration');
 assert.equal(receipt.proposed_effects[0].effect_status,'proposal-only');
 assert.equal(r.output.length,4);
 assert.ok(!p.wtl.includes('bridge('));
});
test('source-bound fiction AST rejects forged scenes and never executes during compilation',async()=>{
 const {parseFiction,fictionToWtl}=await bridge();
 const x=parseFiction('Beyond the gate, the orchard turned blue.');
 assert.equal(fictionToWtl(x,{compile:native.compile}).executed,false);
 assert.throws(()=>fictionToWtl({...x,nodes:[{...x.nodes[0],passage:'Not the text'}]}),/differs/);
});
test('changing an emitted event invalidates the committed source-bound fiction receipt',async()=>{
 const {fictionToWtl,verifyFictionExecution}=await bridge();
 const p=fictionToWtl('The lantern answered.',{compile:native.compile});
 const r=await native.execute(p.ir,{bridges:{}});
 const tampered={...r,output:[{...r.output[0],passage:'Something else'},...r.output.slice(1)]};
 assert.throws(()=>verifyFictionExecution(p,tampered),/events disagree/);
});
test('empty and excessive fiction or device-like directives fail closed',async()=>{
 const {fictionToWtl}=await bridge();
 assert.throws(()=>fictionToWtl('   '),/Invalid fiction/);
 assert.throws(()=>fictionToWtl('line\n'.repeat(33)),/crossings/);
 assert.throws(()=>fictionToWtl('::cue microphone record everyone'),/Unsupported fiction directive/);
});
