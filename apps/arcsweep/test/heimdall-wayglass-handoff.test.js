import test from 'node:test';
import assert from 'node:assert/strict';
import { createWayglassFoldHandoff, inspectWayglassFoldHandoff } from '../src/heimdall-wayglass-handoff.js';
const telemetry = {schema:'arcsweep.heimdall-foldwatch/v1',state:'CROSSING',sigma_min:0.01,sigma_max:1,rank_loss_score:0.9,relational_participation:null};
const base = {telemetry,sourceRefs:[{source_id:'house-ledger',observation_id:'obs-001'}],stopReceiptId:'stop-001',nextOwner:'Wayglass Reviewer'};
test('Crossing is unsupported without continuation evidence',()=>{
 const packet=createWayglassFoldHandoff(base);
 assert.equal(packet.crossing.status,'unsupported');
 assert.equal(packet.measurement.relational_participation,null);
 assert.equal(packet.measurement.relational_participation_status,'unavailable');
 assert.equal(packet.permissions.canon_write,false);
 assert.deepEqual(inspectWayglassFoldHandoff(packet).return_marker,packet.return_marker);
});
test('continuation evidence remains a candidate, never automatic approval',()=>{
 const packet=createWayglassFoldHandoff({...base,continuationEvidence:['branch trace receipt 2'],specialistReports:[{role:'Geometry',author_id:'Yggdrasil',text:'Candidate'}]});
 assert.equal(packet.crossing.status,'candidate_requires_review');
 assert.equal(packet.permissions.auto_approve,false);
 assert.equal(packet.interpretations[0].status,'interpretation');
});
test('missing provenance and return owner are rejected',()=>{
 assert.throws(()=>createWayglassFoldHandoff({...base,sourceRefs:[]}),/source observation/);
 assert.throws(()=>createWayglassFoldHandoff({...base,nextOwner:''}),/nextOwner/);
});
test('handoff rejects escalation on re-entry',()=>{
 const packet=createWayglassFoldHandoff(base);
 assert.throws(()=>inspectWayglassFoldHandoff({...packet,permissions:{...packet.permissions,read_only:false}}),/escalation/);
});
