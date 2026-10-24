import test from 'node:test';
import assert from 'node:assert/strict';
import {access,readFile} from 'node:fs/promises';
import {MEDIA_SOURCES,MEDIA_TRIAL_SCHEMA,KNOWN_HOST_ROUTES,DISCOVERY_COLLECTIONS,APPLET_DECKS,filterMediaSources,mediaSource,makeTrialProposal,normaliseHostRoutes} from '../src/media-foundry/catalog.js';

test('catalogue sources retain unique HTTPS provenance and declared licences',()=>{
  assert.equal(new Set(MEDIA_SOURCES.map(x=>x.id)).size,MEDIA_SOURCES.length);
  MEDIA_SOURCES.forEach(x=>{assert.match(x.url,/^https:\/\/(huggingface\.co|github\.com)\//);assert.ok(x.license);assert.equal(x.status,'research-candidate');});
});
test('Kokoro is a speech model with documented upstream and local adapter, not a deployed route',()=>{
  const x=mediaSource('kokoro-82m');assert.equal(x.category,'speech');assert.equal(x.sample_rate_hz,24000);assert.equal(x.adapter,'onnx-community/Kokoro-82M-v1.0-ONNX');assert.equal(x.runtime,'candidate-local');
});
test('cinematic LoRA identifies SDXL base and separate licensing',()=>{
  const x=mediaSource('neko-hollywood');assert.equal(x.kind,'lora');assert.equal(x.base_model_id,mediaSource('sdxl-base').url.split('huggingface.co/')[1]);assert.notEqual(x.license,mediaSource('sdxl-base').license);
});
test('audio/video dataset cannot masquerade as an inference engine',()=>{
  const x=mediaSource('media-engineering-1m');assert.equal(x.kind,'dataset');assert.equal(x.runtime,'dataset-not-model');
});
test('filter supports category and text with reject for unknown category',()=>{
  assert.ok(filterMediaSources({category:'speech'}).length>=2);
  assert.deepEqual(filterMediaSources({query:'Kokoro'}).map(x=>x.id),['kokoro-82m']);
  assert.throws(()=>filterMediaSources({category:'wormhole'}),RangeError);
});
test('trial proposal is a no-send, provenance carrying proposal only',()=>{
  const t=makeTrialProposal('kokoro-82m',{sessionId:'trial_01',nextOwner:'Falka'});
  assert.equal(t.schema,MEDIA_TRIAL_SCHEMA);assert.equal(t.status,'proposal-only');assert.equal(t.configured,false);assert.equal(t.provider_route_id,null);assert.equal(t.authorised,false);assert.equal(t.live_invocation,false);assert.equal(t.next_owner,'Falka');
  assert.ok(t.prerequisites.length>=3);
});
test('unknown source and invalid session cannot issue a trial receipt',()=>{
  assert.throws(()=>makeTrialProposal('unknown'),RangeError);
  assert.throws(()=>makeTrialProposal('kokoro-82m',{sessionId:'../bad'}),RangeError);
});
test('route catalogue reports host claims exactly, never infers availability',()=>{
  const result=normaliseHostRoutes({routes:[{route_id:'local:ollama',configured:true,connection_verified:false},{route_id:'spicychat',configured:true,connection_verified:true}]});
  assert.equal(result[0].callable_claim,false);assert.equal(result[1].callable_claim,true);assert.equal(result[0].provider,'unspecified');
  assert.throws(()=>normaliseHostRoutes({error:'offline'}),TypeError);
});
test('known host routes are discovery targets rather than hard-coded live endpoints',()=>{
  assert.equal(KNOWN_HOST_ROUTES.length,2);assert.ok(KNOWN_HOST_ROUTES.every(x=>x.availability!=='live'));
  assert.ok(DISCOVERY_COLLECTIONS.every(x=>x.url.startsWith('https://huggingface.co/models?')));
});
test('applet deck maps to real rooms and preserves existing SoundFont owner',async()=>{
  assert.ok(APPLET_DECKS.some(x=>x.id==='harmonic-observatory'));
  await access(new URL('../harmonic-observatory/index.html',import.meta.url));
  const html=await readFile(new URL('../media-foundry/index.html',import.meta.url),'utf8');
  assert.match(html,/id="model-grid"/);assert.match(html,/id="inspect-routes"/);assert.match(html,/id="trial-export"/);
});