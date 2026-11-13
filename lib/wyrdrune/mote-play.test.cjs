'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {playObservation,playTurn}=require('../wayglass-mote-play.cjs');
const {DEFAULT_SEEDS}=require('../wayglass-wyrdrune-motes.cjs');
const owner={principal:{id:'dev:play-test',authorized:true}};
test('each kind of play generates attributable WTL work and a next turn',async()=>{
  for(const kind of ['wonder','touch','shape','listen']){
    const result=await playTurn({kind,turn:1,...owner});
    assert.equal(result.schema,'wayglass.play-work-spiral/v0.1');
    assert.equal(result.kind,kind);
    assert.equal(result.work.evidence.phase_receipts,8);
    assert.equal(result.work.checkpoints,1);
    assert.ok(result.work.phase_delta>0);
    assert.ok(result.work.elevation_delta>0);
    assert.ok(result.work.changed_fields.includes('magic'));
    assert.equal(result.play_again,true);
    assert.equal(result.persisted,false);
    assert.equal(result.proposal.canon_adopted,false);
  }
});
test('play-work-play-return carries changed state and replay is deterministic',async()=>{
  const a=await playTurn({kind:'wonder',turn:1,...owner});
  const b=await playTurn({kind:'shape',turn:2,seeds:a.state,...owner});
  assert.ok(b.state.phase>a.state.phase);
  assert.ok(b.state.elevation>a.state.elevation);
  assert.deepEqual(a,await playTurn({kind:'wonder',turn:1,...owner}));
  assert.deepEqual(b,await playTurn({kind:'shape',turn:2,seeds:a.state,...owner}));
  assert.notDeepEqual(a.observation.signals,b.observation.signals);
});
test('input provenance changes with gesture and turn, while identity remains distinct',()=>{
  const a=playObservation({kind:'touch',turn:1});
  const b=playObservation({kind:'touch',turn:2});
  const c=playObservation({kind:'touch',turn:1,mote_id:'wayglass:mote:other'});
  assert.notEqual(a.source.source_hash,b.source.source_hash);
  assert.notEqual(a.source.source_hash,c.source.source_hash);
  assert.equal(a.identity_spin,b.identity_spin);
  assert.equal(a.mote_id,b.mote_id);
});
test('invalid play, intensity, turn and unauthorised execution are denied',async()=>{
  assert.throws(()=>playObservation({kind:'telepathy'}),/Choose/);
  assert.throws(()=>playObservation({kind:'touch',intensity:NaN}),/intensity/);
  assert.throws(()=>playObservation({kind:'touch',turn:0}),/Turn/);
  await assert.rejects(playTurn({kind:'touch'}),/authenticated House/);
  const controller=new AbortController();controller.abort();
  await assert.rejects(playTurn({kind:'touch',...owner,signal:controller.signal}),/Feather/);
});
