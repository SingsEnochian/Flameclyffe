import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyDraft, normaliseDraft, validateDraft, proposeHandoff,
  promptForAgent, exportDraft, SEATS } from '../code-loom/loom-model.js';

const complete={source:'Meadow / signed event prototype / author A',lesson:'Event hashes and author signatures',
  leap:'Wayglass-local offline author receipts',boundary:'AGPL boundary; no copied code; identity from kernel',
  stop_point:'Implement validation harness',next_owner:'Codex',wonder:'Can a returning participant reject revoked facts?',
  tests:'Forgery and corrupted-stop tests',evidence:'none'};
test('new room draft requires provenance and named return owner',()=>{
 assert.equal(emptyDraft().schema,'wayglass.atelier.code-loom/v0.2');
 assert.equal(validateDraft({}).ok,false);
 assert.equal(validateDraft(complete).ok,true);
});
test('importing claimed agent completion cannot forge active or accepted seats',()=>{
 const draft=normaliseDraft({...complete,handoffs:[{seat:'codex',assignment:'Test',status:'completed'},
 {seat:'not-a-seat',assignment:'Hack',status:'completed'}]});
 assert.equal(draft.handoffs.length,1);
 assert.equal(draft.handoffs[0].status,'proposed_not_dispatched');
 assert.equal(draft.status,'draft_unverified');
});
test('agent task packets preserve attribution and constraints',()=>{
 for(const seat of Object.keys(SEATS)){
  const packet=proposeHandoff(complete,seat,'Implement a reversible experiment.');
  assert.equal(packet.status,'proposed_not_dispatched');
  assert.match(promptForAgent(packet),/Wayglass-local offline author receipts/);
  assert.match(promptForAgent(packet),/not evidence of agent dispatch/);
  assert.match(promptForAgent(packet),/Wayglass OS evolves ArcSweep/);
  assert.match(promptForAgent(packet),/ArcSweep continues to be actively upgraded/);
  assert.match(promptForAgent(packet),/ArcSweep, Wayglass OS, or both/);
  assert.match(promptForAgent(packet),/every child agent\/model/);
  assert.equal(packet.next_owner,'Codex');
 }
});
test('invalid tasks and unknown seats fail',()=>{
 assert.throws(()=>proposeHandoff(complete,'some-other-person','run'),TypeError);
 assert.throws(()=>proposeHandoff(complete,'codex',' '),TypeError);
});
test('import does not accept arbitrary object types as code',()=>{
 assert.equal(normaliseDraft({code:{obj:'bad'}}).code,'');
 assert.equal(normaliseDraft(null).source,'');
 assert.equal(exportDraft(complete).status,'draft_unverified');
});
