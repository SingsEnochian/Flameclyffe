import test from 'node:test';
import assert from 'node:assert/strict';
import {StorySoundscape} from '../src/story-soundscape.js';
import {BLUEBIRD_WEIGHTED_HOME} from '../src/bluebird-weighted-home.js';
import {createDefaultState,saveState,setStateExtensionSnapshot,clearStateExtensionSnapshot,readPersistedStateExtension} from '../src/storage.js';
test('all world roots share existing mixer composition without altering Bluebird calibrated route',()=>{
 const sound=new StorySoundscape(),original=structuredClone(BLUEBIRD_WEIGHTED_HOME);
 assert.equal(sound.context,null);assert.equal(sound.composition.snapshot().audio_enabled,false);
 for(const [id,root]of [['luna',432],['terra-aeterna',220],['equestria-starsong',528],['taveren-vaen',120]]){
  sound.setWorld({id});assert.equal(sound.composition.snapshot().scene.root_hz,root);assert.equal(sound.composition.snapshot().scene.id,id);
 }
 sound.composition.setMix({density:1,mono:true});assert.deepEqual(BLUEBIRD_WEIGHTED_HOME,original);assert.equal(original.stereo.leftHz,432);assert.equal(original.stereo.rightHz,437.5);sound.composition.dispose();
});
test('actual ancestor state extension saves score checkpoint and cold composer restores paused/muted',async t=>{
 const prior=globalThis.localStorage,map=new Map();globalThis.localStorage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 t.after(()=>{globalThis.localStorage=prior;clearStateExtensionSnapshot('wayglassSoundComposition');});
 const source=new StorySoundscape();source.setWorld({id:'luna'});source.composition.startGeneration({confirmed:true});source.composition.setMix({density:.75});
 const checkpoint=source.composition.checkpoint();setStateExtensionSnapshot('wayglassSoundComposition',checkpoint);
 await saveState(createDefaultState(),{reason:'test-composition-return'});const persisted=await readPersistedStateExtension('wayglassSoundComposition');assert.deepEqual(persisted,checkpoint);
 const cold=new StorySoundscape();cold.composition.restore(persisted);assert.deepEqual(cold.composition.snapshot().layers,source.composition.snapshot().layers);assert.equal(cold.composition.snapshot().generating,false);assert.equal(cold.composition.snapshot().audio_enabled,false);assert.equal(cold.context,null);
 source.composition.dispose();cold.composition.dispose();
});
