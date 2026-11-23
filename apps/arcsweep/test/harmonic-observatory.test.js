import test from 'node:test';
import assert from 'node:assert/strict';
import {createSession,copySession,compileArrangement,validateSession,MATH_SPINE,DEVICE_PROFILES} from '../src/harmonic-observatory/core.js';
import {renderOffline,renderSamples} from '../src/harmonic-observatory/renderer.js';
import {analyseSpectrum,powerSpectrum} from '../src/harmonic-observatory/fft.js';
import {HarmonicAudioEngine} from '../src/harmonic-observatory/live-engine.js';
const update=(fn)=>{const s=createSession();fn(s);return s;};
test('canonical Hearthgate braid and independent three-voice arrangement',()=>{
  const a=compileArrangement(createSession());
  assert.equal(MATH_SPINE,'hearthgate.math-spine/v1.8');
  assert.equal(a.oscillators.length,6);
  assert.deepEqual([...new Set(a.oscillators.map(x=>x.stem_id))],['voice-a','voice-b','voice-c']);
  assert.equal(a.channels,2);
  assert.ok(a.oscillators[0].hz===196);
});
test('mono translation suppresses binaural interpretation; channels are physical mono',()=>{
  for(const profile of DEVICE_PROFILES.filter(x=>x!=='studio-stereo')){
    const s=update(x=>{x.mode='stereo-difference';x.device_profile=profile;});
    const a=compileArrangement(s);assert.equal(a.channels,1);
    assert.equal(a.perceptual_difference_hz,null);
    assert.equal(a.claims.binaural,'not-applicable');
    assert.equal(renderSamples(s).channels.length,1);
  }
});
test('5.5 Hz stereo pair is 196 and 201.5 Hz in separate ears',()=>{
  const a=compileArrangement(update(s=>s.mode='stereo-difference'));
  assert.deepEqual(a.oscillators.map(x=>x.hz),[196,201.5]);
  assert.deepEqual(a.oscillators.map(x=>x.pan),[-1,1]);
});
test('mono AM amplitude envelope differs from the stereo difference and stays bounded',()=>{
  const s=update(x=>{x.mode='mono-am';x.duration_seconds=1;x.fade_seconds=0.01;});
  const {channels}=renderSamples(s);
  assert.equal(channels.length,1);
  assert.ok(Math.max(...channels[0])<0.3);
  assert.ok(channels[0].some(x=>x<0));
});
test('quantized PCM header and offline receipt bind same bytes deterministically',async()=>{
  const s=update(x=>{x.duration_seconds=0.25;x.fade_seconds=0.01;});
  const one=await renderOffline(s),two=await renderOffline(s);
  assert.equal(one.receipt.input_sha256,two.receipt.input_sha256);
  assert.equal(one.receipt.wave_sha256,two.receipt.wave_sha256);
  assert.equal(Buffer.from(one.bytes).toString('ascii',0,4),'RIFF');
  assert.equal(new DataView(one.bytes.buffer).getUint32(24,true),48000);
  assert.equal(one.receipt.format.channels,2);
  assert.ok(one.receipt.measurements.rms[0]>0);
  assert.equal(one.receipt.measurements.integrated_lufs,null);
  assert.equal(one.receipt.measurements.true_peak_dbtp,null);
});
test('different voice pan changes output fingerprint',async()=>{
  const s=createSession();s.duration_seconds=0.25;
  const initial=await renderOffline(s);
  s.stems[0].pan=1;
  const changed=await renderOffline(s);
  assert.notEqual(initial.receipt.wave_sha256,changed.receipt.wave_sha256);
});
test('continuity questions and named next owner are preserved verbatim',async()=>{
  const s=createSession();s.duration_seconds=0.25;
  s.continuity={stop_point:'Compare the third voice',next_owner:'Rarity',unresolved_questions:['Is a close interval sweeter?']};
  const {receipt}=await renderOffline(s);
  assert.deepEqual(receipt.continuity,s.continuity);
  assert.equal(receipt.provenance.symbolic.phase,'WEAVE');
});
test('invalid inputs fail closed instead of silently being converted to zero',()=>{
  for(const bad of [null,Number.NaN,0,-4]){
    const s=createSession();s.root_hz=bad;
    assert.throws(()=>validateSession(s),RangeError);
  }
  const s=createSession();s.stems[0].enabled=false;s.stems[1].enabled=false;s.stems[2].enabled=false;
  assert.throws(()=>compileArrangement(s),/enable at least one voice/);
});
test('spectral power and entropy separate silence from flat noise',()=>{
  const silence=new Float32Array(2048);
  const spectrum=powerSpectrum(silence);
  assert.equal(analyseSpectrum(silence,48000).spectral_entropy,null);
  const sine=Float32Array.from({length:4096},(_,n)=>Math.sin(2*Math.PI*375*n/48000));
  const a=analyseSpectrum(sine,48000);
  assert.ok(a.spectral_entropy>=0&&a.spectral_entropy<0.3);
  assert.ok(Math.abs(a.dominant_bin_hz-375)<a.fft_bin_width_hz);
});
test('live engine never opens a device in its constructor and Feather disconnects nodes',async()=>{
  let created=0,stopped=0,disconnected=0,context;
  const audioParam=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},cancelScheduledValues(){}});
  const node=()=>({gain:audioParam(),frequency:audioParam(),pan:audioParam(),threshold:audioParam(),knee:audioParam(),ratio:audioParam(),attack:audioParam(),release:audioParam(),connect(){},disconnect(){disconnected++;},start(){},stop(){stopped++;},getFloatTimeDomainData(array){array.fill(0);}});
  const engine=new HarmonicAudioEngine({createContext:()=>{created++;context={state:'running',currentTime:5,destination:node(),createGain:node,createAnalyser:node,createDynamicsCompressor:node,createOscillator:node,createStereoPanner:node,close:async()=>{context.state='closed';}};return context;}});
  assert.equal(created,0);
  await engine.audition(update(s=>{s.duration_seconds=0.25;}));
  assert.equal(created,1);
  assert.equal(engine.state,'auditioning');
  assert.equal(engine.measureFrame().sample_peak,0);
  engine.feather();
  assert.equal(engine.state,'armed');assert.equal(engine.active.length,0);
  assert.ok(stopped>=6&&disconnected>=6);
  await engine.close();assert.equal(engine.state,'closed');
});