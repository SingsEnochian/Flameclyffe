import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { synthesizeSession, validateSession, SAMPLE_RATE_HZ, RENDERER_ID } from '../src/reference-renderer.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const session = async name => JSON.parse(await readFile(join(root,'examples',name),'utf8'));

test('stereo separate-ear fixture: deterministic WAV, channel map, receipts', async ()=>{
  const s=await session('stereo-difference.json');
  const {wav,receipt}=synthesizeSession(s);
  const replay=synthesizeSession(s);
  assert.ok(wav.equals(replay.wav));
  assert.deepEqual(receipt,replay.receipt);
  assert.equal(receipt.renderer_id,RENDERER_ID);
  assert.equal(wav.toString('ascii',0,4),'RIFF');
  assert.equal(wav.toString('ascii',8,12),'WAVE');
  assert.equal(wav.readUInt16LE(22),2);
  assert.equal(wav.readUInt32LE(24),SAMPLE_RATE_HZ);
  assert.equal(wav.readUInt16LE(34),16);
  assert.equal(wav.length,44+2*2*SAMPLE_RATE_HZ*2);
  assert.equal(receipt.format.frames,96000);
  assert.ok(receipt.measurements.sample_peak.every(x=>x>0 && x<0.15));
  assert.equal(receipt.measurements.integrated_lufs,null);
  assert.equal(receipt.measurements.true_peak_dbtp,null);
  assert.equal(receipt.measurements.roughness,null);
  assert.ok(receipt.measurements.stereo_correlation !== null);
  assert.equal(receipt.continuity.next_owner,'Wayglass-Mobius-Engineer');
  assert.equal(receipt.claims.at(-1).domain,'SYMBOLIC');
});

test('mono AM fixture has physical envelope, mono format and no stereo correlation',async()=>{
  const s=await session('mono-am.json');
  const {wav,receipt}=synthesizeSession(s);
  assert.equal(receipt.format.channels,1);
  assert.equal(wav.readUInt16LE(22),1);
  assert.equal(wav.length,44+2*SAMPLE_RATE_HZ*2);
  assert.equal(receipt.measurements.stereo_correlation,null);
  const first=wav.readInt16LE(44),last=wav.readInt16LE(wav.length-2);
  assert.equal(first,0);
  assert.ok(Math.abs(last)/32768<0.001);
  assert.ok(receipt.measurements.sample_peak[0]<0.1);
  assert.ok(receipt.measurements.rms[0]>0);
});

test('reference cannot claim device playback or autonomous initiation',async()=>{
  const s=await session('stereo-difference.json');
  assert.throws(()=>validateSession({...s,render_intent_confirmed:false}),/intent/);
  assert.throws(()=>validateSession({...s,output:{kind:'offline-diagnostic-wav',playback:true}}),/playback/);
});

test('invalid rates, amplitudes, unknowns and fabricated quantum fields reject',async()=>{
  const s=await session('stereo-difference.json');
  assert.throws(()=>synthesizeSession({...s,audio:{...s.audio,gain_linear:1}}),/gain_linear/);
  assert.throws(()=>synthesizeSession({...s,audio:{...s.audio,left_hz:24000}}),/left_hz/);
  assert.throws(()=>synthesizeSession({...s,audio:{...s.audio,quantum_state:'entangled'}}),/unsupported/);
  assert.throws(()=>synthesizeSession({...s,quantum_state:'collapsed'}),/unsupported/);
  assert.throws(()=>synthesizeSession({...s,mode:'quantum-simulation'}),/only supports/);
  assert.throws(()=>synthesizeSession({...s,unresolved_questions:['?'],mythic:{channel_state:'superposed'}}),/authored channel/);
});

test('mono and stereo formulations are not silently substituted',async()=>{
  const s=await session('stereo-difference.json');
  assert.throws(()=>synthesizeSession({...s,audio:{...s.audio,kind:'mono-am'}}),/unsupported|incomplete/);
  const m=await session('mono-am.json');
  assert.throws(()=>synthesizeSession({...m,audio:{...m.audio,right_hz:437.5}}),/unsupported/);
});
