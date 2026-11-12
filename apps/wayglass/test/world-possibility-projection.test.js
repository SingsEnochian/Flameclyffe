import test from 'node:test';
import assert from 'node:assert/strict';
import {MemoryWorldStore,RelationalWorldGraph,worldRune} from '../../../lib/wyrdrune/relational-worlds.mjs';
import {projectWorldPossibility,WORLD_POSSIBILITY_PROJECTION_SCHEMA} from '../src/world-possibility-projection.js';
const SHA='383eda1e67d92e05147f4bbdb63040fa7a9e75e1',TIME='2026-11-12T21:00:00.000Z';
test('native Wyrdrune world field becomes a non-authoritative sensory and Observer projection',async()=>{
  const graph=new RelationalWorldGraph({store:new MemoryWorldStore(),authorize:async()=>true});
  await graph.registerWorld({id:'A',rune:worldRune('A')},{});
  await graph.registerWorld({id:'B',rune:worldRune('B')},{});
  await graph.connect({id:'ab',from:'A',to:'B',permeability:{possibility:.5}},{});
  const field=await graph.possibilities(['A','B']);
  const frame=projectWorldPossibility(field,{sourceSha:SHA,sourceTime:TIME});
  assert.equal(frame.schema,WORLD_POSSIBILITY_PROJECTION_SCHEMA);
  assert.equal(frame.connection_state,'permeable');
  assert.equal(frame.geometry.folds,2);
  assert.equal(frame.observer.register,'computed-possibility');
  assert.equal(frame.observer.source_sha,SHA);
  assert.equal(frame.observer.measured,false);
  assert.equal(frame.sound.autoplay,false);
  assert.equal(frame.haptics.enabled,false);
  assert.equal(frame.canon_promotion,false);
  assert.equal(frame.model_response,false);
  assert.equal(frame.created,false);
  assert.equal((await graph.snapshot()).worlds.length,2);
  const paused=projectWorldPossibility(field,{sourceSha:SHA,sourceTime:TIME,feather:true});
  assert.equal(paused.visual_mode,'still');
  assert.equal(paused.sound.enabled,false);
});
test('no forged observation, model turn, creation or unprovenanced projection',()=>{
  const field={kind:'wyrdrune.possibility-field/v1',worlds:['A','B'],connected:true,created:false};
  for(const bad of [{...field,created:true},{...field,worlds:['A','A']},
    {...field,connected:'yes'},{...field,worlds:['A']}])
    assert.throws(()=>projectWorldPossibility(bad,{sourceSha:SHA,sourceTime:TIME}));
  assert.throws(()=>projectWorldPossibility(field,{sourceSha:'unknown',sourceTime:TIME}),/SHA/);
  assert.throws(()=>projectWorldPossibility(field,{sourceSha:SHA,sourceTime:'not a date'}),/Timestamped/);
});
