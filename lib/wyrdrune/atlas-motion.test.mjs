import test from 'node:test';
import assert from 'node:assert/strict';
import {babylon5Atlas,worldRune,worldCoordinates} from './typed-atlas.mjs';
import {MemoryWorldStore,RelationalWorldGraph} from './relational-worlds.mjs';
import {planAtlasMotion,emitAtlasMotionFrame,playAtlasMotion,createAtlasMotionBridges} from './atlas-motion.mjs';
import {createWyrdruneRuntime} from './runtime.mjs';
import {readFileSync} from 'node:fs';

const owner={owner:true},allow=async(_action,c)=>c?.owner===true;
const coords=(branch,t,x)=>worldCoordinates('b5',branch,t,x,0,0);
async function fixture({withness=true,permeability=.75,gate='b5:jumpgate',coordsEnabled=true}={}){
  let atlas=babylon5Atlas();
  const minbar=worldRune('verified:minbar'),narn=worldRune('verified:narn');
  const minbarCoord=coordsEnabled?coords('minbar',0,0):null;
  const narnCoord=coordsEnabled?coords('narn',20,100):null;
  atlas=await atlas.bind('b5:minbar',{rune:minbar,coordinates:minbarCoord},allow,owner);
  atlas=await atlas.bind('b5:narn',{rune:narn,coordinates:narnCoord},allow,owner);
  atlas=await atlas.bind('b5:jumpgate',{rune:worldRune('verified:jumpgate')},allow,owner);
  const graph=new RelationalWorldGraph({store:new MemoryWorldStore(),authorize:allow});
  await graph.registerWorld({id:'b5:minbar',rune:minbar,coordinates:minbarCoord},owner);
  await graph.registerWorld({id:'b5:narn',rune:narn,coordinates:narnCoord},owner);
  await graph.connect({id:gate,from:'b5:minbar',to:'b5:narn',
    permeability:{movement:permeability,possibility:1},bidirectional:true,withness},owner);
  return {atlas,graph};
}
const options={universeId:'b5',from:'b5:minbar',to:'b5:narn',gatewayId:'b5:jumpgate'};
test('verified Wyrdrune motion has interpolated spatial and temporal frames, not physical travel',async()=>{
  const {atlas,graph}=await fixture();
  const motion=await planAtlasMotion({atlas,graph,...options,steps:8});
  assert.equal(motion.membraneVerified,true);
  assert.equal(motion.withness,true);
  assert.equal(motion.frames.length,9);
  assert.equal(motion.frames[0].position.x,0);
  assert.equal(motion.frames[4].position.x,50);
  assert.equal(motion.frames[4].position.time,10);
  assert.equal(motion.frames[8].position.x,100);
  assert.equal(motion.frames[8].position.branch,'narn');
  assert.equal(motion.frames[4].permeability,.75);
  assert.equal(motion.executed,false);
  assert.equal(motion.authorizedForPhysicalTravel,false);
  assert.equal(Object.isFrozen(motion.frames[4].position),true);
  assert.equal((await graph.snapshot()).events.at(-1).kind,'membrane.connected');
});
test('rune-only navigation produces real progress frames without invented coordinates',async()=>{
  const {atlas,graph}=await fixture({coordsEnabled:false});
  const motion=await planAtlasMotion({atlas,graph,...options,steps:2});
  assert.equal(motion.coordinatesAvailable,false);
  assert.equal(motion.frames[1].position,null);
  assert.equal(motion.frames[1].progress,.5);
});
test('wrong gateway, sealed membrane, or missing Withness cannot project a verified route',async()=>{
  const wrong=await fixture({gate:'other-gateway'});
  await assert.rejects(planAtlasMotion({...wrong,...options}),/Gateway does not match/);
  const sealed=await fixture({permeability:0});
  await assert.rejects(planAtlasMotion({...sealed,...options}),/No permitted/);
  const without=await fixture({withness:false});
  await assert.rejects(planAtlasMotion({...without,...options}),/Withness membrane/);
  const unbound=await fixture();
  const atlas=babylon5Atlas();
  await assert.rejects(planAtlasMotion({atlas,graph:unbound.graph,...options}),/Both destinations must be bound/);
});
test('atlas and graph must agree on actual world identity, not merely labels',async()=>{
  const {atlas,graph}=await fixture();
  const bad=await atlas.bind('b5:minbar',{rune:worldRune('different')},allow,owner);
  await assert.rejects(planAtlasMotion({atlas:bad,graph,...options}),/not found/);
  await assert.rejects(planAtlasMotion({atlas,graph,...options,steps:100}),/steps must/);
});
test('emitting a motion frame is explicit and rejects authority-shaped payloads',async()=>{
  const {atlas,graph}=await fixture();
  const plan=await planAtlasMotion({atlas,graph,...options,steps:2});
  const seen=[];
  class FakeEvent{constructor(type,{detail}){this.type=type;this.detail=detail;}}
  const scope={CustomEvent:FakeEvent,dispatchEvent:e=>seen.push(e)};
  emitAtlasMotionFrame(plan.frames[1],{scope});
  assert.equal(seen[0].type,'wayglass:atlas-motion-frame');
  assert.equal(seen[0].detail.progress,.5);
  assert.throws(()=>emitAtlasMotionFrame({...plan.frames[1],physicalActuation:true},{scope}),/simulated/);
});

test('the spiral moves frame by frame, Feather halts it, reduced motion is still legible',async()=>{
  const {atlas,graph}=await fixture();
  const plan=await planAtlasMotion({atlas,graph,...options,steps:4});
  const seen=[];
  const completed=await playAtlasMotion(plan,{onFrame:frame=>seen.push(frame.index),frameDelayMs:16});
  assert.deepEqual(seen,[0,1,2,3,4]);
  assert.equal(completed.status,'completed');
  const controller=new AbortController(),paused=[];
  const stopped=await playAtlasMotion(plan,{signal:controller.signal,frameDelayMs:16,
    onFrame:frame=>{paused.push(frame.index);controller.abort('Feather');}});
  assert.deepEqual(paused,[0]);assert.equal(stopped.status,'feather-stopped');
  const still=[];
  const reduced=await playAtlasMotion(plan,{reducedMotion:true,
    onFrame:frame=>still.push(frame.index)});
  assert.deepEqual(still,[4]);assert.equal(reduced.framesEmitted,1);
  assert.equal((await graph.snapshot()).worlds.length,2);
});

test('native WTL drives the passage through all Eightfold phases and verifies its issued motion plan',async()=>{
  const {atlas,graph}=await fixture();
  const bridges=createAtlasMotionBridges({atlas,graph,...options,steps:4});
  const source=readFileSync(new URL('./atlas-passage.wtl',import.meta.url),'utf8');
  const runtime=createWyrdruneRuntime({hashSource:s=>'motion:'+s.length});
  const result=await runtime.execute(runtime.compile(source),{bridges});
  assert.deepEqual(result.receipts.map(r=>r.phase),[
    'perceive','compress','release','verify','integrate','choose','return','transcend']);
  assert.equal(result.output[0],true);
  assert.equal(result.output[1].kind,'wyrdrune.relation/v1');
  assert.equal(result.output[2].kind,'wyrdrune.whisper-phrase/v1');
  assert.equal(result.output[3].schema,'wyrdrune.atlas-motion/v1');
  assert.equal(result.output[3].frames.length,5);
  assert.equal(result.output[3].executed,false);
  assert.equal((await graph.snapshot()).worlds.length,2);
  await assert.rejects(bridges.atlas.verify({arguments:[{...result.output[3]}]}),/Unknown or invalid/);
});
