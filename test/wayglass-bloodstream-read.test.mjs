import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { inspectBloodstreamComments } from '../lib/wayglass-bloodstream-read.mjs';
import { shipWeather } from '../lib/wayglass-mobius-training.mjs';
const require = createRequire(import.meta.url);
const { digest } = require('../lib/wyrdrune/canonical.cjs');

const cp = (root, prev, cycle, carry) => ({
  schema:'wayglass.mobius/v0.1',root,prev,cycle,face:cycle % 2 ? 'outer' : 'inner',
  carry,carry_digest:digest(carry),status:'committed'
});
const c1=cp('root-test','root-test',1,{count:1});
const c2=cp('root-test',digest(c1),2,{count:2});
const comment = (v,i) => ({
  body:'wayglass-mobius-checkpoint\nCycle '+v.cycle+'\n```json\n'+JSON.stringify(v)+'\n```',
  created_at:'2026-11-06T21:00:00Z',html_url:'https://github.com/SingsEnochian/Flameclyffe/issues/101#issuecomment-'+i
});
test('reconstructs two-cycle bloodstream chain, source and face without execution permission',()=>{
  const r=inspectBloodstreamComments([comment(c1,1),comment(c2,2)],{issueUrl:'https://github.com/SingsEnochian/Flameclyffe/issues/101',complete:true});
  assert.equal(r.verified,true);assert.equal(r.cycle,2);assert.equal(r.face,'inner');
  assert.equal(r.checkpoint_digest,digest(c2));assert.equal(r.action_permission,'none');
  assert.match(r.source_ref,/issuecomment-2/);
});
test('malformed, truncated and tampered bloodstream checkpoints are never verified',()=>{
  const changed={...c2,carry:{count:500}};
  assert.equal(inspectBloodstreamComments([comment(c1,1),comment(changed,2)]).verified,false);
  assert.equal(inspectBloodstreamComments([comment(c1,1)],{complete:false}).status,'incomplete-source');
  assert.equal(inspectBloodstreamComments([{body:'wayglass-mobius-checkpoint\n```json\nINVALID\n```'}]).status,'invalid-checkpoint');
  assert.equal(inspectBloodstreamComments([{body:'just a normal comment'}]).status,'no-checkpoint');
});
test('bloodstream context reports unknown when no chain, then sources verified cycle',()=>{
  const deep={version:'test',generated_at:'2026-11-06T20:00:00Z'};
  const absent=shipWeather(deep);
  assert.match(absent.context,/Bloodstream: no verified checkpoint/);
  const verified=inspectBloodstreamComments([comment(c1,1),comment(c2,2)]);
  const present=shipWeather(deep,{bloodstream:verified});
  assert.match(present.context,/Bloodstream: cycle 2/);
  assert.match(present.context,/face=inner/);
  assert.match(present.context,/read-only; not authority to dispatch or merge/);
});
