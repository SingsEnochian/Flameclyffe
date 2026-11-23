import assert from 'node:assert/strict';
import test from 'node:test';
import {createCellEcology} from '../src/wtl-cell-ecology.js';
import {GROUNDING_SCHEMA,groundAcceptedCellSignal} from '../src/wtl-cell-semantic-grounding.js';

function culture(){
  const colony=createCellEcology({maxCells:4,seed:11,radius:3,mutationRate:0,autonomousFusion:false});
  colony.plant('a','explorer',0,0);
  colony.plant('b','explorer',1,0);
  return colony;
}

test('babies explain only accepted, source-bound in-process signals',()=>{
  const colony=culture();
  for(let i=0;i<4;i++)colony.step();
  const snapshot=colony.snapshot();
  assert.equal(snapshot.generation,4);
  assert.ok(snapshot.groundedUtterances.length>=2);
  for(const line of snapshot.groundedUtterances){
    assert.equal(line.schema,GROUNDING_SCHEMA);
    assert.equal(line.observation_kind,'simulated');
    assert.equal(line.status,'source-bound-explanation');
    assert.equal(line.provenance.physical_hearing_verified,false);
    assert.match(line.phrase,/I queued a (pulse|spiral|echo) signal/);
    assert.match(line.explanation.why,/using my twist/);
    assert.equal(line.change.sender.after,line.change.sender.before+1);
    assert.equal(line.change.receiver.after,line.change.receiver.before+1);
    const matching=snapshot.events.find(event=>event.type==='signal'&&
      event.tick===line.source_receipt.tick&&event.from===line.source_receipt.from&&
      event.to===line.source_receipt.to&&event.signal_type===line.source_receipt.signal_type);
    assert.ok(matching,'never generate grounded speech without an existing accepted event');
  }
});

test('grounding refuses fabricated receipts, unsupported decisions and invented counter changes',()=>{
  const valid={
    receipt:{type:'signal',tick:4,from:'a',to:'b',signal_type:'pulse'},
    generation:4,sender:'a',receiver:'b',neighbours:['b'],twist:0.1,dialectBias:0,
    senderBefore:0,senderAfter:1,receiverBefore:2,receiverAfter:3,
  };
  assert.equal(groundAcceptedCellSignal(valid).explanation.what,'I queued a pulse signal for b.');
  assert.throws(()=>groundAcceptedCellSignal({...valid,receipt:{...valid.receipt,to:'c'}}),/matching accepted/);
  assert.throws(()=>groundAcceptedCellSignal({...valid,senderAfter:4}),/before\/after/);
  assert.throws(()=>groundAcceptedCellSignal({...valid,dialectBias:2}),/does not match/);
});

test('Feather stops new simulated observations and existing explanations remain unchanged',()=>{
  const colony=culture();
  for(let i=0;i<4;i++)colony.step();
  const previous=colony.snapshot();
  colony.feather();
  const stopped=colony.step();
  assert.equal(stopped.paused,true);
  const after=colony.snapshot();
  assert.deepEqual(after.groundedUtterances,previous.groundedUtterances);
});

test('original expressive poetry is preserved separately from source-grounded explanations',()=>{
  const colony=culture();
  for(let i=0;i<24;i++)colony.step();
  const snap=colony.snapshot();
  assert.ok(snap.groundedUtterances.length>0);
  assert.ok(Array.isArray(snap.utterances));
  for(const poem of snap.utterances){
    assert.equal(poem.origin,'composed');
    assert.equal('source_receipt' in poem,false);
  }
  assert.ok(snap.groundedUtterances.every(line=>line.provenance.verified_against_before_after===true));
  assert.ok(snap.groundedUtterances.every(line=>line.provenance.host_effects===false));
});
