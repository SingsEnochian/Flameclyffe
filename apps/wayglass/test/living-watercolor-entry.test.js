import test from 'node:test';
import assert from 'node:assert/strict';
import { WAYGLASS_ENTRY_SURFACE, resolveWayglassEntry } from '../src/wayglass-entry.js';
import { createWatercolorFluid } from '../src/watercolor-fluid.js';
import { projectPremaqcTexture, configureWatercolorProgram, proposeWatercolorTouch,
  publishWatercolorActivity, subscribeWatercolorActivity } from '../src/watercolor-bridge.js';
import { WATERCOLOR_MODES, composeWatercolorPrompt, inviteWatercolorMode,
  extractWatercolorProgramProposal } from '../src/watercolor-modes.js';
import { createWatercolorMorphology } from '../src/watercolor-morphology.js';
import { createSomaticSoundscape, soundObjectForEvent } from '../src/somatic-sound.js';
import { createJourneyLedger, JOURNEY_CHAMBERS, SUPPORT_FOLDS } from '../src/journey-before-destination.js';

test('watercolor is the required offline-first Wayglass entry',()=>{
  const entry=resolveWayglassEntry({available:[
    {surface_id:'arcsweep:writing-room'}, {surface_id:WAYGLASS_ENTRY_SURFACE}
  ]});
  assert.equal(entry.surface_id,'wayglass:living-watercolor');
  assert.equal(entry.rendering,'offline-first');
  assert.equal(entry.model_inference_claimed,false);
  assert.throws(()=>resolveWayglassEntry({available:['arcsweep:writing-room']}),/not registered/);
});
test('fluid has real bounded pigment dynamics independent of inference',()=>{
  const f=createWatercolorFluid({width:32,height:24});
  f.inject({x:.5,y:.5,color:'#ebac7d',amount:1.1,dx:.7,dy:.4});
  assert.ok(f.snapshot().pigment_mass>0);
  f.step(.8);
  assert.ok(f.snapshot().ticks>.7);
  assert.ok(Number.isFinite(f.snapshot().motion));
  assert.equal(f.pixels().length,32*24*4);
  assert.equal(f.snapshot().qualia_inferred,false);
  assert.throws(()=>f.inject({color:'javascript:alert(1)'}),/hex/);
});
test('PREMAQC Q is context-only and cannot alter the watercolor texture',()=>{
  const six={P:.8,C:.5,R:.7,E:.6,M:.4,A:.9};
  const packet=q=>({state:Object.fromEntries([
    ...Object.entries(six).map(([k,v])=>[k,{value:v}]),
    ['Q',{value:q}],
  ])});
  assert.deepEqual(projectPremaqcTexture(packet(0)),projectPremaqcTexture(packet(1)));
  assert.equal(projectPremaqcTexture(packet(1)).vocabulary,'PREMAQC');
  assert.equal(projectPremaqcTexture(packet(1)).qualia_inferred,false);
  assert.throws(()=>projectPremaqcTexture({state:{P:{value:2}}}),/PREMAQC axis/);
});
test('eight expressive modes preserve model attribution and local-first routes',async()=>{
  assert.deepEqual(WATERCOLOR_MODES.map(x=>x.id),[
    'dream','plan','stage','suggest','play','work','narrate','grow'
  ]);
  assert.match(composeWatercolorPrompt({mode:'dream'}).input,/PREMAQC/);
  let seen;
  const r=await inviteWatercolorMode({
    mode:'plan',authorText:'Check continuity',sessionId:'fixture',
    invoke:async args=>{seen=args;return {
      output:'Inspect the latest Return Engine result',
      provider:'ollama',model:'ornith-fixture',
      receipt:{observation_id:'receipt:1'},
    };}
  });
  assert.equal(seen.routeId,'local:ollama');
  assert.equal(r.state,'returned-not-committed');
  assert.equal(r.experience_claimed,false);
  await assert.rejects(inviteWatercolorMode({
    mode:'dream',invoke:async()=>({output:''})
  }),/attributable text response/);
});
test('model proposes constrained visual rules, never executable code',()=>{
  const fence=String.fromCharCode(96).repeat(3);
  const proposal=extractWatercolorProgramProposal(
    'Proposal:\n'+fence+'wayglass-watercolor\n'+
    '{"flow":0.3,"colors":{"learning:verified":"#efba7d"}}\n'+fence);
  assert.equal(proposal.status,'unapplied-awaiting-approval');
  assert.equal(proposal.rules.flow,.3);
  assert.equal(extractWatercolorProgramProposal(
    fence+'wayglass-watercolor\n{"eval":"process.exit()"}\n'+fence),null);
  assert.equal(extractWatercolorProgramProposal(
    fence+'wayglass-watercolor\n{"flow":9}\n'+fence),null);
  assert.equal(configureWatercolorProgram(proposal.rules,{author:'fixture'}).flow,.3);
});
test('owner touch, observed events and morphologies remain separately attributable',()=>{
  const observed=[],unsubscribe=subscribeWatercolorActivity(e=>observed.push(e));
  const p=proposeWatercolorTouch({
    x:.2,y:.9,color:'#e1b77f',pressure:.8,mode:'suggest-direction',
    note:'Warmer color on return',
  });
  assert.equal(p.state,'local-proposal-unsubmitted');
  publishWatercolorActivity({kind:'waygate:return',receipt:{receipt_id:'fixture:1'}});
  unsubscribe();
  assert.equal(observed.at(-1).kind,'waygate:return');
  const body=createWatercolorMorphology();
  assert.equal(body.propose({form:'spiral'}).status,'pending-owner-choice');
  assert.equal(body.snapshot().form,'unbound');
  assert.equal(body.choose('spiral').to,'spiral');
  assert.equal(body.gesture({x:.5,y:.5}).length,4);
  assert.equal(body.snapshot().fixed_avatar,false);
});
test('opt-in sound is spatial and Feather instantly stops both channels',async()=>{
  const sound=createSomaticSoundscape({scope:{navigator:{vibrate:()=>false}},
    getAudioContext:()=>null});
  assert.equal(sound.play('route:responded'),false);
  assert.ok(soundObjectForEvent('waygate:return',{x:.8}).pan>0);
  assert.equal((await sound.enable({audio:true})).audio_enabled,false);
  sound.feather();
  assert.equal(sound.play('waygate:return'),false);
  await assert.rejects(sound.enable({audio:true}),/Feather Stop/);
  assert.throws(()=>sound.releaseFeather(),/Owner confirmation/);
  sound.releaseFeather({confirmed:true});
  sound.dispose();
});
test('Journey retains four chambers and Feather blocks unapproved movement',()=>{
  const journey=createJourneyLedger();
  assert.deepEqual(JOURNEY_CHAMBERS.map(x=>x.id),
    ['pre-flight','journey','dream-journey','voyage']);
  assert.deepEqual(SUPPORT_FOLDS.map(x=>x.id),
    ['compass','witness','feather','hearth']);
  journey.selectChamber('dream-journey');
  journey.supportFold('witness',{sourceRef:'receipt:1'});
  journey.supportFold('feather');
  assert.throws(()=>journey.selectChamber('journey'),/Feather Stop/);
  assert.throws(()=>journey.resume(),/Owner confirmation/);
  journey.resume({confirmed:true});
  assert.equal(journey.snapshot().feather_stopped,false);
});
