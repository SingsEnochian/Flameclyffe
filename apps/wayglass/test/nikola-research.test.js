import test from 'node:test';
import assert from 'node:assert/strict';
import { makeInquiry, mechanicsFixture, recordEvidence, revokeEvidence, evidenceReadout, amplitudeReadout, contextForModel } from '../src/nikola-research.js';

const measure = () => recordEvidence(mechanicsFixture(), { id: 'k-reading', source_id: 'synthetic-k-measure', likelihoods: [.9,.1] });
test('two distinct hypotheses and normalized priors are mandatory', () => {
  assert.throws(() => makeInquiry({ question:'a', hypotheses:[] }), /two named/);
  assert.throws(() => makeInquiry({ question:'a', hypotheses:[{id:'X',claim:'a'},{id:'X',claim:'b'}] }), /differ/);
  assert.throws(() => makeInquiry({ question:'a', hypotheses:[{id:'X',claim:'a'},{id:'Y',claim:'b'}], prior:[.6,.6] }), /normalized/);
});
test('uninformative frequency observation preserves underdetermination', () => {
  assert.deepEqual(evidenceReadout(mechanicsFixture()).probability,[.5,.5]);
});
test('explicit independent measurement shifts conditional classical posterior', () => {
  const p=evidenceReadout(measure());
  assert.ok(Math.abs(p.probability[0]-.9)<1e-12);
});
test('shared-origin echoes cannot manufacture independent corroboration', () => {
  const p=recordEvidence(measure(),{id:'echo',source_id:'synthetic-k-echo',likelihoods:[1,0]});
  assert.ok(Math.abs(evidenceReadout(p).probability[0]-.9)<1e-12);
  assert.deepEqual(evidenceReadout(p).excluded,[{id:'echo',reason:'shared-origin-family'}]);
});
test('revocation restores the original distribution without erasing the event', () => {
  const retired=revokeEvidence(measure(),'k-reading');
  assert.deepEqual(evidenceReadout(retired).probability,[.5,.5]);
  assert.deepEqual(evidenceReadout(retired).excluded,[{id:'k-reading',reason:'revoked'}]);
});
test('zero-degree context recovers formal prior', () => {
  const r=amplitudeReadout(mechanicsFixture()); assert.ok(Math.abs(r.probability[0]-.5)<1e-12);
});
test('45-degree coherent rotation and full dephasing diverge', () => {
  const p=mechanicsFixture();const coherent=amplitudeReadout(p,{angle:Math.PI/4}).probability;
  const dephased=amplitudeReadout(p,{angle:Math.PI/4,dephasing:1}).probability;
  assert.ok(coherent[0]<1e-12); assert.ok(Math.abs(dephased[0]-.5)<1e-12);
});
test('invalid angle and dephasing are rejected', () => {
  assert.throws(()=>amplitudeReadout(mechanicsFixture(),{angle:99}),/angle/);
  assert.throws(()=>amplitudeReadout(mechanicsFixture(),{dephasing:2}),/dephasing/);
});
test('external context requires explicit consent and redacts unapproved sources', () => {
  const p=measure();
  assert.throws(()=>contextForModel(p,{external:true}),/consent/);
  const r=contextForModel(p,{external:true,consent:true});
  assert.ok(!r.text.includes('synthetic-k-measure')); assert.deepEqual(r.visible_source_ids,['synthetic-frequency']);
  assert.match(r.text,/\[0.5,0.5\]/); // No leakage via derived posterior.
});
test('context budget fails closed rather than clipping', () => {
  assert.throws(()=>contextForModel(measure(),{maxChars:150}),/over budget/);
});
test('mutations are immutable and no source is silently accepted', () => {
  const p=mechanicsFixture();const q=recordEvidence(p,{id:'a',source_id:'synthetic-k-measure',likelihoods:[.5,.5]});
  assert.equal(p.evidence.length,1);assert.equal(q.evidence.length,2);
  assert.throws(()=>recordEvidence(p,{id:'x',source_id:'unknown',likelihoods:[.5,.5]}),/unknown source/);
});
test('forged packet evidence gets revalidated even with correct schema', () => {
  const p=measure();const forged={...p,evidence:[{id:'evil',source_id:'unknown',likelihoods:[.5,.5],active:true}]};
  assert.throws(()=>evidenceReadout(forged),/unknown source/);
});
