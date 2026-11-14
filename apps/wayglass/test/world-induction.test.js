import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ASPECT_SCHEMA,WORLD_INDUCTION_SCHEMA,worldInductionProfile,writingInductionScore,
  explicitIAmLines,validatedAspect,inductionScript,
} from '../src/world-induction-model.js';

test('world induction identifies an illustrative tone proposal, never a measured world frequency',()=>{
  const profile=worldInductionProfile({world_id:'evil-gene:film-2015',name:'The Evil Gene'});
  assert.equal(profile.schema,WORLD_INDUCTION_SCHEMA);
  assert.equal(profile.source_status,'original-illustrative-proposal');
  assert.match(profile.provenance,/not a film soundtrack/);
  assert.ok(profile.listenFor.includes('tension'));
  assert.ok(profile.why.length>10);
});
test('unknown world names do not acquire falsely canonical tone sources',()=>{
  const profile=worldInductionProfile({world_id:'world:unknown',name:'New World'});
  assert.equal(profile.world_id,'world:unknown');
  assert.equal(profile.name,'New World');
  assert.equal(profile.source_status,'original-illustrative-proposal');
  assert.match(profile.provenance,/illustrative/);
});
test('declared tone sources are accepted only when bounded and attributed',()=>{
  const base={world_id:'world:custom',name:'Custom World'};
  const ignored=worldInductionProfile({...base,induction_tones:{rootHz:300}});
  assert.equal(ignored.rootHz,220);
  const accepted=worldInductionProfile({...base,induction_tones:{rootHz:300,bpm:63,source_ref:'owner:world-score/001'}});
  assert.equal(accepted.rootHz,300);
  assert.equal(accepted.bpm,63);
  assert.equal(accepted.provenance,'owner:world-score/001');
  const bad=worldInductionProfile({...base,induction_tones:{rootHz:10000,source_ref:'owner:world-score/001'}});
  assert.equal(bad.rootHz,220);
});
test('writing changes upper voice and rhythmic pacing without psychological inference',()=>{
  const profile=worldInductionProfile({world_id:'wayglass:writing-room',name:'Writing Room'});
  const before=writingInductionScore(profile,'');
  const after=writingInductionScore(profile,'I entered the room. Rain fell, and I wrote.');
  assert.equal(before.wordCount,0);
  assert.ok(after.wordCount>before.wordCount);
  assert.notEqual(after.counterpartHz,before.counterpartHz);
  assert.ok(after.beatBpm>before.beatBpm);
  assert.match(after.evidence,/no mood or personal-state inference/);
  assert.equal(after.rootHz,before.rootHz);
});
test('first-person voice is written by the owner and must match the world',()=>{
  const profile=worldInductionProfile({world_id:'world:a',name:'World A'});
  const aspect=validatedAspect({world_id:'world:a',name:'Lantern',role:'Witness',
    affirmations:'I AM permitted to choose.\nNot an I AM line\nI AM free to return.'});
  assert.equal(aspect.schema,ASPECT_SCHEMA);
  assert.deepEqual(aspect.affirmations,['I AM permitted to choose.','I AM free to return.']);
  const script=inductionScript(profile,aspect);
  assert.deepEqual(script.iam,aspect.affirmations);
  assert.match(script.transcript,/Listen for this:/);
  assert.match(script.transcript,/Why listen:/);
  assert.equal(script.hypnosis_or_effect_claimed,false);
  assert.throws(()=>inductionScript(worldInductionProfile({world_id:'world:b'}),aspect),/another world/);
});
test('no I means no invented identity or automatic affirmations',()=>{
  const profile=worldInductionProfile({world_id:'world:empty',name:'Empty World'});
  assert.deepEqual(inductionScript(profile).iam,[]);
  assert.deepEqual(explicitIAmLines('Only silence\nYou are brave'),[]);
  assert.throws(()=>validatedAspect({world_id:'world:empty',name:'Chosen',affirmations:'You are brave'}),/explicit I AM/);
  assert.throws(()=>validatedAspect({world_id:'world:empty',name:'',affirmations:'I AM here'}),/Name your aspect/);
});
