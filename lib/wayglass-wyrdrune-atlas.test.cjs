'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {IR,CODE,normaliseAtlasInput,scoreResonanceAtlas}=require('./wayglass-wyrdrune-atlas.cjs');
const base=()=>({instant:.8,room:.6,world:.4,universe:.3,affinity:.7,phase:.25,
  counts:{instant:1,room:4,world:16,universe:2}});
const owner={principal:{authorized:true}};

test('four-scale engine is written in two executable Wyrdrune Möbius units',async()=>{
  assert.equal(IR.schema,'wyrdrune.ir/v0.1');
  assert.equal(IR.units.length,2);
  assert.ok(CODE.includes('let coherence'));
  const result=await scoreResonanceAtlas(base(),owner);
  assert.equal(result.schema,'wayglass.resonance-atlas/v0.1');
  assert.equal(result.withness.completedCycles,2);
  assert.equal(result.phase_receipts.length,16);
  assert.notDeepEqual(result.first_pass,result.returned);
  assert.equal(result.returned.below.physical_playback,false);
  assert.equal(result.returned.above.physical_playback,false);
  assert.equal(result.returned.within.autoplay,false);
  assert.equal(result.model_invoked,false);
  assert.equal(result.persisted,false);
});

test('similar scopes reinforce coherence and differing scales retain interference',async()=>{
  const aligned=await scoreResonanceAtlas({...base(),instant:.5,room:.5,world:.5,universe:.5},owner);
  const divided=await scoreResonanceAtlas({...base(),instant:1,room:0,world:1,universe:0},owner);
  assert.equal(aligned.returned.structure.coherence,1);
  assert.equal(aligned.returned.structure.interference,0);
  assert.ok(divided.returned.structure.coherence<aligned.returned.structure.coherence);
  assert.ok(divided.returned.structure.interference>0);
  assert.ok(divided.returned.structure.granulation>=aligned.returned.structure.granulation);
});

test('reciprocal relation changes harmonics without rewriting observation counts',async()=>{
  const a=await scoreResonanceAtlas(base(),owner);
  const b=await scoreResonanceAtlas({...base(),affinity:0},owner);
  assert.notEqual(a.returned.within.counterpart_hz,b.returned.within.counterpart_hz);
  assert.deepEqual(a.counts,b.counts);
  assert.equal(a.source_sha256.length,64);
  assert.equal(a.input_sha256.length,64);
  assert.deepEqual(a,await scoreResonanceAtlas(base(),owner));
});

test('no raw text, unbounded frequencies, improper counts or unauthorised execution',async()=>{
  await assert.rejects(scoreResonanceAtlas(base()),/Authenticated/);
  await assert.rejects(scoreResonanceAtlas({...base(),raw_story:'secret'},owner),/raw text/);
  await assert.rejects(scoreResonanceAtlas({...base(),room:NaN},owner),/bounded/);
  await assert.rejects(scoreResonanceAtlas({...base(),phase:3},owner),/bounded/);
  await assert.rejects(scoreResonanceAtlas({...base(),counts:{...base().counts,universe:0}},owner),/count/);
  await assert.rejects(scoreResonanceAtlas({...base(),counts:{...base().counts,origin:1}},owner),/count/);
  assert.equal(normaliseAtlasInput(base()).counts.world,16);
});
