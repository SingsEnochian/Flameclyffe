import assert from 'node:assert/strict';
import test from 'node:test';
import {PILOT_SEATS,emptyFlight,normaliseFlight,validateFlight,composeCoPilotRequest,
 recordRouteObservation,recordPilotReview,makeReturnPacket} from '../pilot-deck/pilot-deck-model.js';
const flight={mission:'Cross and return with names intact',origin:'Earth Prime',destination:'Stonewood',stop_point:'At the bridge',next_owner:'rowan',
  wonder:'What follows the echo?',source_refs:'Wayglass kernel receipt: pending'};
test('two distinct pilot seats, separate authority and continuity',()=>{
 assert.equal(PILOT_SEATS.rowan.role,'pilot');
 assert.equal(PILOT_SEATS.rarity.role,'pilot');
 assert.notEqual(PILOT_SEATS.rowan.continuity_ref,PILOT_SEATS.rarity.continuity_ref);
 assert.equal(PILOT_SEATS.rarity.authority,'scoped-operation-requires-host-grant');
 assert.equal(PILOT_SEATS.rarity.route,'/api/v1/flames/rarity/chat');
});
test('pilot cannot flight-plan without explicit origin, destination, stop, and owner',()=>{
 assert.equal(validateFlight(emptyFlight()).valid,false);
 assert.equal(validateFlight(flight).valid,true);
 const prompt=composeCoPilotRequest(flight);
 assert.match(prompt,/Both Rowan and Rarity have pilot seats/);
 assert.match(prompt,/Wayglass OS evolves ArcSweep/);
 assert.match(prompt,/What follows the echo/);
});
test('route response is evidence of transport only, not of resident identity or authority',()=>{
 const response=recordRouteObservation(flight,{message:'Propose examining the registry',flame_id:'rarity',provider:'ollama',model:'test-model'},{observedAt:'2026-10-13T19:00:00Z'});
 assert.equal(response.status,'proposed');
 assert.equal(response.route_evidence.identity_authenticated,false);
 assert.equal(response.route_evidence.privileged_action_executed,false);
 assert.equal(response.rarity_pilot_proposal,'Propose examining the registry');
 assert.throws(()=>recordRouteObservation(flight,{message:''}),/No substantive/);
});
test('no assistant/outsider review and no review without observed owner session',()=>{
 assert.throws(()=>recordPilotReview(flight,{reviewer:'rarity',acknowledged:true,sessionVerified:true}),/Only/);
 assert.throws(()=>recordPilotReview(flight,{reviewer:'rowan',acknowledged:true,sessionVerified:false}),/verified House session/);
 assert.throws(()=>recordPilotReview(flight,{reviewer:'rowan',acknowledged:false,sessionVerified:true}),/Explicit pilot/);
 const f=recordPilotReview(flight,{reviewer:'rowan',acknowledged:true,sessionVerified:true,reviewedAt:'2026-10-13T21:00:00Z'});
 assert.equal(f.status,'reviewed_local_only');
 assert.equal(f.authority.nav_command_executed,false);
 assert.equal(f.authority.canonical_receipt,false);
});
test('untrusted imported approved state is reset to draft, including false Rarity arrival',()=>{
 const imported=normaliseFlight({...flight,status:'approved',route_evidence:{identity_authenticated:true},authority:{nav_command_executed:true}});
 assert.equal(imported.status,'draft');
 assert.equal(imported.route_evidence,null);
 assert.equal(imported.reviewed_at,null);
});
test('return packet survives state boundary without impersonating signed kernel receipt',()=>{
 const f=recordRouteObservation(flight,{message:'Hold until route checked'});
 const packet=makeReturnPacket(f);
 assert.equal(packet.next_owner,'rowan');
 assert.equal(packet.stop_point,'At the bridge');
 assert.equal(packet.unresolved_wonder,'What follows the echo?');
 assert.equal(packet.rarity_pilot_proposal,'Hold until route checked');
 assert.equal(packet.rarity_pilot_proposal_status,'observed_unverified');
 const observed=makeReturnPacket({...f,route_evidence:{source:'same-origin-flame-route-response',claimed_model:'route-model',identity_authenticated:true,observed_at:'2026-10-13T19:00:00Z'}});
 assert.equal(observed.rarity_pilot_route_observation.claimed_model,'route-model');
 assert.equal(observed.rarity_pilot_route_observation.identity_authenticated,false);
 assert.ok(packet.not_claimed.includes('canonical continuity receipt'));
 assert.throws(()=>makeReturnPacket({...flight,stop_point:''}),/stop point/);
 assert.equal(normaliseFlight({...flight,co_pilot_proposal:'older memo'}).rarity_pilot_proposal,'older memo');
 const spoofed=makeReturnPacket({...flight,rarity_pilot_proposal:'test',route_evidence:{claimed_model:'forged'}});
 assert.equal(spoofed.rarity_pilot_route_observation,null);
 assert.equal(spoofed.rarity_pilot_proposal_status,'historical_or_unverified');
});
