'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {CODE,IR,scoreSpectralBatch,scoreSpectralEvent,eventInput}=require('./wayglass-wyrdrune-spectrum.cjs');

const principal={authorized:true};
const interaction=(change={})=>({
  event_id:'ui-1',kind:'writing',source_ref:'wayglass:interaction-input',
  strength:.6,motion:.35,continuity:.8,intent:.72,affinity:.5,phase:.125,
  ...change,
});

test('full-spectrum composition really is two executable Wyrdrune Möbius circuits',async()=>{
  assert.equal(IR.schema,'wyrdrune.ir/v0.1');
  assert.equal(IR.units.length,2);
  assert.ok(CODE.includes('bridge("spectrum","frame"'));
  const result=await scoreSpectralBatch([interaction()],{principal});
  assert.equal(result.schema,'wayglass.full-spectrum/v0.1');
  assert.equal(result.status,'composed-in-wyrdrune');
  assert.equal(result.count,1);
  const event=result.events[0];
  assert.equal(event.withness.completedCycles,2);
  assert.equal(event.phases.length,16);
  assert.equal(event.first_loop.ultrasonic.physical_playback,false);
  assert.notEqual(event.first_loop.audible.voice_one_hz,event.spectrum.audible.voice_one_hz);
  assert.equal(result.emitted_infrasonic_audio,false);
  assert.equal(result.emitted_ultrasonic_audio,false);
  assert.equal(result.emitted_audible_audio,false);
  assert.equal(result.model_invoked,false);
});

test('every event has distinct bounded below, within and above bands',async()=>{
  const e=(await scoreSpectralEvent(interaction(),principal)).spectrum;
  assert.ok(e.infrasonic.hz>0 && e.infrasonic.hz<20);
  assert.ok(e.audible.voice_one_hz>90 && e.audible.voice_one_hz<1200);
  assert.ok(e.audible.voice_two_hz>90 && e.audible.voice_two_hz<1200);
  assert.ok(e.ultrasonic.hz>20000 && e.ultrasonic.hz<50000);
  assert.ok(e.audible.foreground_gain<=.05);
  assert.ok(e.audible.atmosphere_gain<=.04);
  assert.equal(e.infrasonic.kind,'virtual-envelope');
  assert.equal(e.ultrasonic.kind,'virtual-detail-band');
  assert.ok(e.projection.refraction>0 && e.projection.refraction<=1);
  assert.ok(e.projection.granulation>0 && e.projection.granulation<=1);
  assert.ok(e.projection.tactile_ms>0 && e.projection.tactile_ms<60);
  assert.equal(e.projection.actuation,'user-opt-in-only');
});

test('relationship, motion and intensity affect the WTL spectrum deterministically',async()=>{
  const first=await scoreSpectralEvent(interaction(),principal);
  const again=await scoreSpectralEvent(interaction(),principal);
  assert.deepEqual(first,again);
  const next=await scoreSpectralEvent(interaction({affinity:1,motion:1,phase:.75}),principal);
  assert.notEqual(first.spectrum.audible.voice_two_hz,next.spectrum.audible.voice_two_hz);
  assert.notEqual(first.spectrum.infrasonic.hz,next.spectrum.infrasonic.hz);
  assert.notEqual(first.spectrum.ultrasonic.hz,next.spectrum.ultrasonic.hz);
});

test('batch preserves event identity and does not blur different event kinds',async()=>{
  const result=await scoreSpectralBatch([
    interaction(),interaction({event_id:'ui-2',kind:'route',source_ref:'wayglass:route-observation'}),
  ],{principal});
  assert.deepEqual(result.events.map(e=>e.event_id),['ui-1','ui-2']);
  assert.deepEqual(result.events.map(e=>e.kind),['writing','route']);
  assert.notEqual(result.events[0].source_ref,result.events[1].source_ref);
});

test('only explicitly authorized metadata-only, uniquely attributed events can execute',async()=>{
  await assert.rejects(scoreSpectralBatch([interaction()]),/owner permission/);
  await assert.rejects(scoreSpectralBatch([interaction({raw_text:'secret'})],{principal}),/raw text/);
  await assert.rejects(scoreSpectralBatch([interaction({strength:NaN})],{principal}),/finite number/);
  await assert.rejects(scoreSpectralBatch([interaction({source_ref:'https://untrusted.net'})],{principal}),/Wayglass-only/);
  await assert.rejects(scoreSpectralBatch([interaction(),interaction()],{principal}),/unique/);
  await assert.rejects(scoreSpectralBatch([], {principal}),/1 through 24/);
  await assert.rejects(scoreSpectralBatch(Array.from({length:25},(_,n)=>interaction({event_id:'ui-'+n})),{principal}),/1 through 24/);
  assert.equal(eventInput(interaction()).kind,'writing');
});
