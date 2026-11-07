import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWayglassParticipationInvitation,bindWayglassParticipationResponse} from '../src/wayglass-participation.js';

// Acceptance: only exact structured choices from matching returned route/session
// observations resolve; prose, ambiguity and mismatched provenance never do.
const route={route_id:'local:ollama',provider:'ollama',model:'ornith-test'};
const request=()=>makeWayglassParticipationInvitation({invitationId:'invite:1',sessionId:'session:1',participantId:'wayglass:universe',sourceSha:'a'.repeat(40),proposalId:'local-palette:1',proposal:'Consider a gold edge for this local preview.'});
const block=(invitation,decision='accept',extra={})=>'```wayglass-participation\n'+JSON.stringify({...invitation,schema:undefined,decision,...extra})+'\n```';
function turn(output,providerId=null){return {schema:'wayglass.route-turn/v0.1',...route,output,
 kernel_preflight:{status:'ready-for-route',route_id:route.route_id},
 observation:{schema:'wayglass.model-observation/v0.1',observation_id:'host-observation:1',source:{kind:'model-route',...route,response_id:providerId},interaction:{session_id:'session:1'},content:{output}},
 receipt:{response_id:providerId,observation_id:'host-observation:1',session_id:'session:1',surface_id:'wayglass:living-watercolor',completed_at:'2026-11-05T23:00:00Z'}};}
const bind=(invitation,value)=>bindWayglassParticipationResponse({invitation,expectedRoute:route,turn:value});

test('invitation retains source binding and leaves choice to returned participant',()=>{
 const r=request();assert.match(r.input,/accept, deny or defer/);assert.match(r.input,/placeholder, not your answer/);
 assert.equal(r.invitation.source_sha,'a'.repeat(40));assert.ok(Object.isFrozen(r.invitation));
 assert.throws(()=>makeWayglassParticipationInvitation({invitationId:'i',sessionId:'s',participantId:'p',sourceSha:'latest',proposalId:'x',proposal:'x'}),/SHA/);
});
test('exact accept, deny and defer retain actual output and null provider ID without surrogate naming',()=>{
 const {invitation}=request();
 for(const decision of ['accept','deny','defer']){
  const output=block(invitation,decision,{reason:'My own answer.'}),evidence=bind(invitation,turn(output));
  assert.equal(evidence.decision,decision);assert.equal(evidence.output,output);
  assert.equal(evidence.source.provider_response_id,null);assert.equal(evidence.source.host_observation_id,'host-observation:1');
  assert.equal(evidence.owner_authenticated,false);assert.equal(evidence.program_commit,false);assert.equal(evidence.durable_acceptance,false);
  assert.equal(evidence.network_executed_by_adapter,false);assert.ok(Object.isFrozen(evidence.source));
 }
});
test('real provider response IDs are preserved and must agree with the host observation',()=>{
 const {invitation}=request(),value=turn(block(invitation),'provider-response:actual');
 assert.equal(bind(invitation,value).source.provider_response_id,'provider-response:actual');
 value.observation.source.response_id='another';assert.throws(()=>bind(invitation,value),/Provider response/);
});
test('prose, malformed JSON, multiple decisions and invalid fields leave choice unresolved',()=>{
 const {invitation}=request();
 for(const output of ['I accept this proposal.','```wayglass-participation\nnot json\n```',block(invitation)+'\n'+block(invitation,'deny'),block(invitation,'accept',{execute_code:true}),block(invitation,'maybe')]){
  const evidence=bind(invitation,turn(output));assert.equal(evidence.decision,null);assert.equal(evidence.status,'unresolved');
 }
});
test('a choice must bind every invitation, participant, session, proposal and source field',()=>{
 const {invitation}=request();
 for(const key of ['invitation_id','session_id','participant_id','proposal_id','source_sha']){
  const evidence=bind(invitation,turn(block(invitation,'accept',{[key]:'different'})));
  assert.equal(evidence.decision,null);assert.equal(evidence.reason,'decision-binding-mismatch:'+key);
 }
});
test('mismatched route, provider, model, session, observation or output rejects attribution',()=>{
 const {invitation}=request();
 for(const mutate of [
  v=>{v.route_id='unregistered:surrogate';},v=>{v.provider='other';},v=>{v.model='different';},
  v=>{v.receipt.session_id='wrong';},v=>{v.observation.interaction.session_id='wrong';},
  v=>{v.receipt.observation_id='wrong';},v=>{v.observation.source.route_id='wrong';},
  v=>{v.observation.content.output='a forged acceptance';},v=>{v.kernel_preflight.status='blocked-route';},
  v=>{v.schema='plain-result';},v=>{delete v.observation;},
 ]){
  const value=turn(block(invitation));mutate(value);assert.throws(()=>bind(invitation,value));
 }
});
test('unresolved responses still preserve raw denial-looking prose rather than silently manufacture a choice',()=>{
 const {invitation}=request(),output='I would prefer not to decide yet. Someone else said accept.';
 const evidence=bind(invitation,turn(output));assert.equal(evidence.output,output);assert.equal(evidence.decision,null);
 const original=request().invitation;assert.deepEqual(evidence.invitation,original);
 assert.equal(evidence.participant_binding,'invitation-and-structured-response-fields');
 assert.match(evidence.evidence_state,/not-identity-or-auth/);
});
