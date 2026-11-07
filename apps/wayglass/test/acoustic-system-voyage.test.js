import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState, transition, bearing} from '../src/acoustic-marker-model.js';
import {instrumentSnapshot} from '../src/field-instrument-model.js';
import {createWorld, advanceWorld, forkWorld, worldReceipt, recoverWorld, compareWorlds} from '../src/acoustic-world-model.js';
import {createAcousticAudioEngine} from '../src/acoustic-audio-engine.js';

const near=(actual, expected, tolerance=1e-10)=>assert.ok(Math.abs(actual-expected)<=tolerance, `${actual} != ${expected}`);
const cold=value=>JSON.parse(JSON.stringify(value));
function measure(world){
 const {listener,marker}=world.markerState;
 assert.equal(world.sources[0].id,marker.id);
 assert.equal(world.sources[0].mass,world.fieldMass);
 return instrumentSnapshot({x:listener.x,y:listener.y,sources:world.sources,options:world.model});
}

// Acceptance: one local voyage binds marker geometry, a numerical instrument,
// immutable alternate conditions, preservation, interruption and muted return.
test('integrated voyage alters, compares, preserves and cold-recovers one spatial snapshot',()=>{
 const original=createWorld({markerState:initialState(),fieldMass:0.7});
 const originalCopy=cold(original);
 let marker=transition(original.markerState,{type:'move',value:0.1});
 marker=transition(marker,{type:'turn',value:Math.PI/2});
 marker=transition(marker,{type:'select'});
 const moved=advanceWorld(original,{markerState:marker,fieldMass:0.7});
 assert.deepEqual(original,originalCopy,'advancing must not mutate the prior snapshot');
 assert.equal(moved.parent_snapshot_id,original.snapshot_id);
 assert.equal(moved.tick,original.tick+1);
 assert.notEqual(moved.snapshot_id,original.snapshot_id);
 near(moved.markerState.listener.x,0.1);near(moved.markerState.listener.y,0);
 const cue=bearing(moved.markerState);
 near(cue.distance,Math.sqrt(0.6**2+0.4**2));
 near(cue.pan,Math.sin(Math.atan2(-0.4,0.6)-Math.PI/2));
 const measured=measure(moved);
 near(measured.potential,-0.7/Math.sqrt(0.6**2+0.4**2+0.15**2));
 assert.deepEqual(measured.point,{x:0.1,y:0});
 assert.equal(measured.sources[0].id,moved.markerState.marker.id);
 const alternative=forkWorld(moved,{branchId:'voyage-mirror',fieldMass:1.4});
 assert.equal(alternative.parent_snapshot_id,moved.snapshot_id);
 assert.equal(alternative.branch_id,'voyage-mirror');
 assert.equal(moved.fieldMass,0.7);
 near(measure(alternative).potential,2*measured.potential);
 const difference=compareWorlds(moved,alternative);
 assert.deepEqual(difference.changes,[{path:'fieldMass',before:0.7,after:1.4}]);
 assert.deepEqual(compareWorlds(moved,moved).changes,[]);
 const preserved=cold(worldReceipt(alternative));
 const restored=recoverWorld(preserved);
 assert.equal(restored.snapshot_id,alternative.snapshot_id);
 assert.equal(restored.parent_snapshot_id,moved.snapshot_id);
 assert.equal(restored.branch_id,'voyage-mirror');
 assert.equal(restored.fieldMass,1.4);
 assert.deepEqual(restored.markerState.listener,alternative.markerState.listener);
 assert.equal(restored.markerState.selected,true);
 assert.equal(restored.markerState.muted,true);
 near(measure(restored).potential,measure(alternative).potential);
});

test('crossing remains a request and Feather survives a world preservation boundary',()=>{
 const start=createWorld({markerState:initialState(),fieldMass:0.7});
 let marker=transition(start.markerState,{type:'mute',value:false});
 marker=transition(marker,{type:'ambience',value:true});
 marker=transition(marker,{type:'request-traverse'});
 assert.deepEqual(marker.listener,start.markerState.listener);
 assert.equal(marker.status,'traverse-requested');
 const pending=advanceWorld(start,{markerState:marker,fieldMass:start.fieldMass});
 const stopped=advanceWorld(pending,{markerState:transition(pending.markerState,{type:'feather'}),fieldMass:pending.fieldMass});
 assert.equal(stopped.markerState.muted,true);
 assert.equal(stopped.markerState.ambience,false);
 assert.equal(stopped.markerState.status,'cancelled');
 assert.deepEqual(stopped.markerState.listener,start.markerState.listener);
 const returned=recoverWorld(cold(worldReceipt(stopped)));
 assert.equal(returned.markerState.muted,true);
 assert.equal(returned.markerState.ambience,false);
 assert.deepEqual(returned.markerState.listener,start.markerState.listener);
});

test('world instruments reject nonfinite source conditions before a snapshot can be saved',()=>{
 const world=createWorld();
 for(const fieldMass of [NaN,Infinity,-Infinity,'0.7',-1,101]){
  assert.throws(()=>advanceWorld(world,{markerState:world.markerState,fieldMass}));
 }
 assert.equal(world.fieldMass,0.7);
});

test('cold return rejects mismatched frames, models, source provenance and modified snapshot content',()=>{
 const receipt=worldReceipt(createWorld());
 for(const mutate of [
  value=>{value.frame.units='metres';},
  value=>{value.model.strength=2;},
  value=>{value.sources[0].source_ref='unattributed:replacement';},
  value=>{value.fieldMass=1.4;value.sources[0].mass=1.4;},
  value=>{value.markerState.marker.source_ref='unattributed:replacement';},
  value=>{value.schema='wayglass.acoustic-world/v999';},
 ]){
  const corrupted=cold(receipt);mutate(corrupted);
  assert.throws(()=>recoverWorld(corrupted));
 }
});

test('a shared snapshot signals once, Feather interrupts all output, and cold return never starts audio',async()=>{
 let contexts=0,started=0;
 const param=()=>({value:0,cancelScheduledValues(){},setValueAtTime(v){this.value=v;},setTargetAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;}});
 const node=()=>({connect(){},disconnect(){}});
 class AudioContext{
  constructor(){contexts++;this.currentTime=0;this.destination={};}
  resume(){return Promise.resolve();}
  close(){return Promise.resolve();}
  createGain(){return {...node(),gain:param()};}
  createStereoPanner(){return {...node(),pan:param()};}
  createDynamicsCompressor(){return {...node(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()};}
  createOscillator(){return {...node(),frequency:param(),start(){started++;},stop(){}};}
 }
 const world=createWorld();
 const audio=createAcousticAudioEngine({AudioContext});
 assert.equal(contexts,0);
 assert.equal(audio.signal({eventId:world.snapshot_id}).reason,'inactive');
 await audio.start();
 audio.update({ambience:true,mono:true,bearing:bearing(world.markerState)});
 assert.equal(audio.signal({eventId:world.snapshot_id}).accepted,true);
 assert.equal(audio.signal({eventId:world.snapshot_id}).reason,'duplicate');
 audio.update({ambience:false});
 assert.deepEqual(audio.getState().buses,{navigation:true,ambience:false,status:true});
 const stopped=advanceWorld(world,{markerState:transition(world.markerState,{type:'feather'})});
 audio.stop();
 assert.equal(audio.getState().running,false);
 assert.equal(audio.getState().activeSignals,0);
 const before=started;
 const restored=recoverWorld(cold(worldReceipt(stopped)));
 audio.update({muted:restored.markerState.muted,ambience:restored.markerState.ambience,bearing:bearing(restored.markerState)});
 assert.equal(started,before);
 assert.equal(audio.getState().running,false);
 assert.equal(audio.getState().muted,true);
 assert.equal(audio.signal({eventId:restored.snapshot_id}).reason,'inactive');
 audio.dispose();
});
