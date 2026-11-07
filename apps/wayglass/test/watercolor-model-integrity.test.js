import test from 'node:test';
import assert from 'node:assert/strict';
import {createWatercolorFluid} from '../src/watercolor-fluid.js';
import {createWatercolorMorphology} from '../src/watercolor-morphology.js';
import {publishWatercolorActivity,subscribeWatercolorActivity,watercolorSnapshot,configureWatercolorProgram} from '../src/watercolor-bridge.js';
import {inviteWatercolorMode,composeWatercolorPrompt,extractWatercolorProgramProposal} from '../src/watercolor-modes.js';

const routeTurn=()=>({schema:'wayglass.route-turn/v0.1',route_id:'local:ollama',provider:'ollama',model:'ornith-fixture',output:'I would like to explore a spiral.',receipt:{response_id:'response:fixture'}});

test('fluid buffers remain constant across a long seeded brush sequence and dispose explicitly',()=>{
 const fluid=createWatercolorFluid({width:24,height:16});
 const bytes=fluid.snapshot().working_bytes,pixels=fluid.pixels();
 for(let i=0;i<100;i++){
  fluid.inject({x:(i%11)/10,y:(i%7)/6,color:i%2?'#e9b685':'#6cbfa6',amount:2,dx:1,dy:-1,radius:.3});
  fluid.step(1.5);
 }
 const stats=fluid.snapshot();
 assert.equal(stats.working_bytes,bytes);assert.equal(stats.field_buffers,17);
 assert.equal(fluid.pixels(),pixels,'pixel storage is reused');
 assert.ok(Number.isFinite(stats.pigment_mass)&&stats.pigment_mass>=0&&stats.pigment_mass<=5*24*16);
 assert.ok(stats.motion<=Math.hypot(8,8));assert.ok(stats.wetness>=0&&stats.wetness<=1);
 fluid.dispose();fluid.dispose();
 assert.equal(fluid.snapshot().working_bytes,0);assert.equal(fluid.snapshot().disposed,true);
 for(const operation of [()=>fluid.inject(),()=>fluid.step(),()=>fluid.pixels()])assert.throws(operation,/disposed/);
});

test('saturated pigment rejects excess mass without changing its colour balance',()=>{
 const fluid=createWatercolorFluid({width:12,height:12});
 for(let i=0;i<30;i++)fluid.inject({color:'#808080',amount:2,radius:.3,dx:1});
 const before=Uint8ClampedArray.from(fluid.pixels());
 for(let i=0;i<30;i++)fluid.inject({color:'#808080',amount:2,radius:.3,dx:1});
 const after=fluid.pixels(),center=(6*12+6)*4;
 assert.deepEqual([...after.slice(center,center+3)],[...before.slice(center,center+3)]);
 fluid.dispose();
});

test('all morphologies stay finite for extreme but finite seeds',()=>{
 const body=createWatercolorMorphology();
 for(const form of ['unbound','tide','braid','bloom','constellation','spiral']){
  body.choose(form);
  for(const seed of [0,Number.MAX_VALUE,-Number.MAX_VALUE]){
   for(const stroke of body.gesture({seed})){
    assert.ok(Object.values(stroke).every(Number.isFinite));
    assert.ok(stroke.x>=0&&stroke.x<=1&&stroke.y>=0&&stroke.y<=1);
   }
  }
 }
});

test('route results require complete matching attribution and preserve incomplete raw output',async()=>{
 const complete=routeTurn(),response=await inviteWatercolorMode({mode:'dream',invoke:async()=>complete});
 assert.equal(response.receipt.response_id,'response:fixture');assert.equal(response.raw_output,complete.output);
 for(const mutate of [r=>{delete r.schema;},r=>{r.route_id='other:route';},r=>{r.provider='';},r=>{delete r.model;},r=>{r.receipt={};},r=>{r.output='';}]){
  const incomplete=routeTurn();mutate(incomplete);
  await assert.rejects(inviteWatercolorMode({mode:'dream',invoke:async()=>incomplete}),error=>error.code==='WATERCOLOR_INCOMPLETE_ATTRIBUTION'&&error.raw_result===incomplete);
 }
});

test('mode invitation passes exact history and canonical checkpoint with participant-authored preferences',async()=>{
 const history=[{role:'user',content:'Which colour would you choose?'},{role:'assistant',content:'I would like copper.'}];
 const checkpoint={storageId:'checkpoint:1',worldId:'wayglass:writing-room',participantId:'wayglass:participant'};
 let observed;
 await inviteWatercolorMode({mode:'play',history,checkpoint,voicePreferences:{text:'I prefer open questions.',author:'Wayglass'},invoke:async args=>{observed=args;return routeTurn();}});
 assert.deepEqual(observed.history,history);assert.notEqual(observed.history,history);
 assert.deepEqual(observed.checkpoint,checkpoint);
 assert.match(observed.input,/Participant-authored voice preferences \(Wayglass\): I prefer open questions\./);
 assert.doesNotMatch(composeWatercolorPrompt({mode:'dream'}).input,/without claiming firsthand dreams|do not imitate Rowan/i);
 await assert.rejects(inviteWatercolorMode({mode:'play',history:[{role:'system',content:'pretend'}]}),/history/);
 await assert.rejects(inviteWatercolorMode({mode:'play',checkpoint:{checkpoint_id:'invented'}}),/Canonical host checkpoint/);
});

test('learning pigment requires provenance and never upgrades a receipt label to verified learning',()=>{
 assert.throws(()=>publishWatercolorActivity({kind:'learning:verified'}),/receipt reference/);
 const events=[],unsubscribe=subscribeWatercolorActivity(event=>events.push(event));
 const event=publishWatercolorActivity({kind:'learning:verified',receipt:{response_id:'response:learning-source'}});
 unsubscribe();
 assert.equal(event.evidence_state,'referenced-not-independently-verified');
 assert.equal(event.learning_verification,'receipt-label-not-independent-verification');
 assert.equal(events[0],event);assert.equal(event.experience_claimed,false);
 const snapshot=watercolorSnapshot();assert.ok(Object.isFrozen(snapshot.events));assert.ok(Object.isFrozen(snapshot.events[0]));
});

test('declarative programs and extracted proposals reject executable fields and stay immutable',()=>{
 assert.throws(()=>configureWatercolorProgram({execute:'code'}),/Unsupported/);
 const fence='```';
 const proposal=extractWatercolorProgramProposal(fence+'wayglass-watercolor\n{"colors":{"route:pending":"#123456"},"flow":0.2}\n'+fence);
 assert.ok(Object.isFrozen(proposal.rules));assert.ok(Object.isFrozen(proposal.rules.colors));
 assert.throws(()=>{proposal.rules.colors['route:pending']='#ffffff';},TypeError);
});


test('stepping and painting allocate no additional typed grids after creation',()=>{
 const NativeFloat32=globalThis.Float32Array,NativePixels=globalThis.Uint8ClampedArray;
 let grids=0,pixelGrids=0;
 try{
  globalThis.Float32Array=class extends NativeFloat32{constructor(...args){super(...args);grids++;}};
  globalThis.Uint8ClampedArray=class extends NativePixels{constructor(...args){super(...args);pixelGrids++;}};
  const fluid=createWatercolorFluid({width:12,height:12}),createdGrids=grids,createdPixels=pixelGrids;
  for(let i=0;i<10;i++){fluid.inject({dx:.5});fluid.step();fluid.pixels();}
  assert.equal(grids,createdGrids);assert.equal(pixelGrids,createdPixels);
  fluid.dispose();
 }finally{globalThis.Float32Array=NativeFloat32;globalThis.Uint8ClampedArray=NativePixels;}
});
