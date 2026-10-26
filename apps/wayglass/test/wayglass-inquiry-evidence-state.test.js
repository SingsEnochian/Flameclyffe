import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildInquiryEvidenceState, INQUIRY_EVIDENCE_SCHEMA } from '../src/inquiry-evidence-state.js';

function view() {
  return {schema:'wayglass.inquiry-loom.view/v0.1',inquiry_id:'wgi:synthetic',stance:'open-unresolved',
    events:[
      {kind:'opened',data:{question:'Where is the map?'},event_id:'e0'},
      {kind:'contributed',data:{claim_kind:'interpretation',source_refs:[]},event_id:'e1'},
      {kind:'contributed',data:{claim_kind:'alternative',source_refs:['source:claim']},event_id:'e2'},
      {kind:'contributed',data:{claim_kind:'challenge',source_refs:[]},event_id:'e3'},
      {kind:'contributed',data:{claim_kind:'revision',reply_to:'e1',source_refs:[]},event_id:'e4'},
      {kind:'contributed',data:{claim_kind:'observation',source_refs:['source:unverified']},event_id:'e5'},
      {kind:'contributed',data:{claim_kind:'experiment',source_refs:[]},event_id:'e6'},
      {kind:'contributed',data:{claim_kind:'outcome',source_refs:[]},event_id:'e7'},
      {kind:'contributed',data:{claim_kind:'new-question',source_refs:[]},event_id:'e8'},
      {kind:'paused',data:{stop_point:'return later'},event_id:'e9'},
    ],return_marker:{adopted_by_return_engine:false}};
}

test('Inquiry panel distinguishes recorded history, hypotheses, dissent and unverified claims',()=>{
  const x=buildInquiryEvidenceState(view());
  assert.equal(x.schema,INQUIRY_EVIDENCE_SCHEMA);
  assert.equal(x.recorded.event_count,10);
  assert.equal(x.recorded.contributed_events,8);
  assert.equal(x.interpreted.proposal_count,3);
  assert.equal(x.unresolved.open_questions,2);
  assert.equal(x.unresolved.challenges,1);
  assert.equal(x.awaiting_verification.reported_observations_experiments_outcomes,3);
  assert.equal(x.awaiting_verification.source_references_claimed,2);
  assert.equal(x.provenance.host_event_hash_chain_is_signature,false);
  assert.equal(x.claims.external_evidence_verified,false);
  assert.equal(x.claims.autonomous_question_closed,false);
});

test('An open authorised Loom view is required: no invented closed or signed state',()=>{
  const x=view();x.stance='closed';
  assert.throws(()=>buildInquiryEvidenceState(x),/authorised, open inquiry view/);
  assert.throws(()=>buildInquiryEvidenceState({ ...view(),schema:'caller:view' }),/authorised/);
  assert.throws(()=>buildInquiryEvidenceState(null),/authorised/);
});

test('Missing and malformed claims are ignored, not promoted into evidence',()=>{
  const x=view();x.events.push({kind:'contributed',data:{source_refs:['attacker:claim']}});
  const y=buildInquiryEvidenceState(x);
  assert.equal(y.recorded.event_count,11);
  assert.equal(y.recorded.contributed_events,8);
  assert.equal(y.claims.canon_promoted,false);
});

test('Existing panel renders the read-only projection without new network or authority paths',async()=>{
  const src=await readFile(new URL('../src/surfaces/inquiry-loom-panel.js',import.meta.url),'utf8');
  assert.match(src,/buildInquiryEvidenceState/);
  assert.match(src,/id="wg-inquiry-evidence-state"/);
  assert.match(src,/Recorded \(journal only\)/);
  assert.doesNotMatch(src,/fetch\s*\(/);
  assert.doesNotMatch(src,/adopted_by_return_engine\s*:\s*true/);
});
