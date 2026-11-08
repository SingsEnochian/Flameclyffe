import test from 'node:test';
import assert from 'node:assert/strict';
import {StorySoundscape} from '../src/story-soundscape.js';
const declaration={voices:[{voice_id:'declared-a',source_ref:'fixture:voice-source-a'},{voice_id:'declared-b',source_ref:'fixture:voice-source-b'}],affinity:{value:.75,source_ref:'fixture:declared-affinity'}};
test('actual StorySoundscape executes user WTL on writing observations and cold return preserves anchor and declarations',async t=>{
 const sound=new StorySoundscape(),cold=new StorySoundscape();t.after(()=>{sound.composition.dispose();cold.composition.dispose();});
 sound.seedText('The river and wind move through shadow.');sound.setStoryScoreContext(declaration);
 sound.composition.startGeneration({confirmed:true});await sound.composition.waitForScore();
 let score=sound.composition.snapshot();assert.equal(score.source_kind,'wyrdrune-program');assert.equal(score.score_status,'source-score-ready');assert.equal(score.layers.length,4);
 assert.equal(score.program_provenance.phase_receipts.length,16);assert.deepEqual(score.program_provenance.frames[1].voices,declaration.voices);assert.equal(sound.context,null,'quiet composition creates no audio context');
 const anchor=score.program_provenance.return_anchor;
 sound.clearTurn('water fire');await sound.composition.advance();score=sound.composition.snapshot();assert.equal(score.program_provenance.holds[0].turns,1);assert.deepEqual(score.program_provenance.return_anchor,anchor);
 const binding=sound.storyScoreBinding.checkpoint(),checkpoint=sound.composition.checkpoint();
 cold.storyScoreBinding.restore(binding);cold.composition.restore(checkpoint);
 assert.deepEqual(cold.storyScoreBinding.getContext(),declaration);assert.equal(cold.storyScoreTurns,1);assert.equal(cold.composition.snapshot().generating,false);assert.equal(cold.composition.snapshot().audio_enabled,false);
 await assert.rejects(cold.composition.enableAudio({confirmed:true}),/evaluation required/);
 cold.composition.startGeneration({confirmed:true});await cold.composition.waitForScore();
 assert.deepEqual(cold.composition.snapshot().program_provenance.return_anchor,anchor);assert.equal(cold.composition.snapshot().program_provenance.holds[1].turns,1);
});
test('missing relationship declarations never fall back to unrelated procedural music',async t=>{
 const sound=new StorySoundscape();t.after(()=>sound.composition.dispose());sound.composition.startGeneration({confirmed:true});await sound.composition.waitForScore();
 assert.equal(sound.composition.snapshot().score_status,'source-score-unavailable');assert.deepEqual(sound.composition.snapshot().layers,[]);assert.equal(sound.context,null);
 assert.throws(()=>sound.setStoryScoreContext({...declaration,affinity:{value:.5}}),/declare their affinity/);
});
