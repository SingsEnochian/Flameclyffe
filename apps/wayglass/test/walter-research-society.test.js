import test from 'node:test';
import assert from 'node:assert/strict';
import {createResearchSocietyState,runResearchSociety,exportResearchSocietyCheckpoint,validateSocietyState} from '../src/surfaces/walter-research-society.js';
const answer={finding:'Narrative relationship unverified',constraint:'Sources remain separate',open_question:'What is the third point?',discriminating_observation:'Inspect the original note',epistemic_label:'narrative-hypothesis',source_ids:['walter:1933','walter:1950']};
const fetchImpl=async()=>({ok:true,json:async()=>({output:JSON.stringify(answer)})});
test('society advances agenda and keeps proposed methods unpromoted',async()=>{
 const state=await runResearchSociety({fetchImpl,maxCycles:2});
 assert.equal(state.cycle,2);
 assert.equal(state.ledger.length,2);
 assert.equal(state.agenda.filter(a=>a.status==='open').length,3);
 assert(state.methods.slice(1).every(m=>m.status==='proposed'&&!m.eligible_for_promotion));
 assert(state.ledger.every(x=>x.canon_promoted===false));
 assert.equal(exportResearchSocietyCheckpoint(state).stop_point,'checkpoint');
});
test('revoked Walter source prevents autonomous execution',async()=>{
 const state=createResearchSocietyState();state.revoked_source_ids=['walter:1933'];
 await assert.rejects(runResearchSociety({state,fetchImpl}),/revoked/);
});
test('authority promotion fails validation',()=>{
 const state=createResearchSocietyState();state.canon_promoted=true;
 assert.throws(()=>validateSocietyState(state),/authority/);
});
