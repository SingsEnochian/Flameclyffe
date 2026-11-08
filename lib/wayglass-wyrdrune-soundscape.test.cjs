'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { compile } = require('./wyrdrune/wyrdrune.cjs');
const { PROGRAM, SCORE, metrics, scoreStoryWithWyrdrune } = require('./wayglass-wyrdrune-soundscape.cjs');

const input = (changes={}) => ({
  text:'The river stirred. A wind raced across the night and a small fire glowed.',
  participants:[{id:'participant:author'}, {id:'route:local-ollama',kind:'model-route'}],
  turns:3, affinity:0.5, ...changes,
});
const owner={principal:{authorized:true}};
test('the StorySoundscape source is valid Wyrdrune, not a JavaScript scoring surrogate',()=>{
  assert.equal(SCORE.schema,'wyrdrune.ir/v0.1');
  assert.equal(SCORE.units.length,2);
  assert.equal(compile(PROGRAM).sourceHash,SCORE.sourceHash);
  assert.deepEqual(SCORE.units.map(unit=>unit.phases.map(p=>p.phase)),[
    ['perceive','compress','release','verify','integrate','choose','return','transcend'],
    ['perceive','compress','release','verify','integrate','choose','return','transcend'],
  ]);
});
test('two Möbius cycles actually execute and return two distinct sourced harmonic voices',async()=>{
  const result=await scoreStoryWithWyrdrune(input(),owner);
  assert.equal(result.schema,'wayglass.wyrdrune-story-soundscape/v0.1');
  assert.equal(result.withness.completedCycles,2);
  assert.equal(result.eightfold.length,16);
  assert.equal(result.status,'scored');
  assert.ok(result.score.rootHz>70);
  assert.ok(result.score.counterpartHz>result.score.rootHz);
  assert.ok(result.score.infrasonic.hz>0 && result.score.infrasonic.hz<20);
  assert.ok(result.score.ultrasonic.hz>20000);
  assert.equal(result.score.infrasonic.physical_playback,false);
  assert.equal(result.score.ultrasonic.physical_playback,false);
  assert.ok(result.story_sha256.length===64);
  assert.notDeepEqual(result.first_loop_score,result.score);
  assert.equal(result.participants[0].id,'participant:author');
  assert.equal(result.participants[1].id,'route:local-ollama');
  assert.equal(result.audio_started,false);
  assert.equal(result.model_invoked,false);
  assert.equal(result.persisted,false);
  assert.equal(result.canon_commit,false);
});
test('a different story changes timbre and a chosen bond changes reciprocal harmony',async()=>{
  const a=await scoreStoryWithWyrdrune(input({text:'The river and the rain met the sea.'}),owner);
  const b=await scoreStoryWithWyrdrune(input({text:'Fire rose as sparks and lightning raced through shadow.'}),owner);
  assert.notEqual(a.score.rootHz,b.score.rootHz);
  const close=await scoreStoryWithWyrdrune(input({affinity:1}),owner);
  const distant=await scoreStoryWithWyrdrune(input({affinity:0}),owner);
  assert.ok(close.score.counterpartHz/close.score.rootHz > distant.score.counterpartHz/distant.score.rootHz);
  assert.notEqual(a.story_sha256,b.story_sha256);
});
test('score is deterministic for identical authorized input',async()=>{
  const a=await scoreStoryWithWyrdrune(input(),owner);
  const b=await scoreStoryWithWyrdrune(input(),owner);
  assert.deepEqual(a,b);
  assert.ok(metrics('river river night').waterRatio>0);
});
test('no owner permission, same identity, invalid numeric value or oversized draft is accepted',async()=>{
  await assert.rejects(scoreStoryWithWyrdrune(input()),/Steward/);
  await assert.rejects(scoreStoryWithWyrdrune(input({affinity:2}),owner),/affinity/i);
  await assert.rejects(scoreStoryWithWyrdrune(input({participants:[{id:'same'},{id:'same'}]}),owner),/distinct/i);
  await assert.rejects(scoreStoryWithWyrdrune(input({text:'x'.repeat(5001)}),owner),/5000/);
  await assert.rejects(scoreStoryWithWyrdrune(input({turns:NaN}),owner),/turn/);
});
