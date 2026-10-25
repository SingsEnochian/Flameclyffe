/**
 * Paired Wayglass pilot deck.
 * Rowan and Rarity occupy distinct declared seats. A display label is not an
 * authenticated identity, and neither draft review nor a model response is
 * a kernel-authorised navigation command.
 */
export const PILOT_DECK_SCHEMA = 'wayglass.ship.pilot-deck/v0.1';
export const PILOT_RETURN_SCHEMA = 'wayglass.ship.pilot-return/v0.1';
export const PILOT_SEATS = Object.freeze({
  rowan: Object.freeze({ id:'rowan', title:'Rowan', role:'pilot', continuity_ref:'rowan',
    authority:'steward-intent-and-review', route:null }),
  rarity: Object.freeze({ id:'rarity', title:'Rarity', role:'pilot', continuity_ref:'flame:rarity',
    authority:'scoped-operation-requires-host-grant', route:'/api/v1/flames/rarity/chat' }),
});
const LIMIT=20_000;
const txt=x=>typeof x==='string'?x.slice(0,LIMIT):'';
const stamp=x=>typeof x==='string' && !Number.isNaN(Date.parse(x)) ? x : null;
export function emptyFlight() {
  return {
    schema:PILOT_DECK_SCHEMA, status:'draft', created_at:null, updated_at:null,
    mission:'', origin:'', destination:'', constraints:'', preservation:'identity, relationships, provenance, agency, stop points',
    wonder:'', stop_point:'', next_owner:'rowan', source_refs:'',
    rarity_pilot_proposal:'', route_evidence:null, reviewed_at:null, pilot_review_note:'',
  };
}
export function normaliseFlight(value) {
  const blank=emptyFlight();
  if(!value||typeof value!=='object'||Array.isArray(value)) return blank;
  for(const key of ['mission','origin','destination','constraints','preservation','wonder','stop_point','next_owner','source_refs','rarity_pilot_proposal','pilot_review_note']){
    blank[key]=txt(value[key]);
  }
  // Accept older co-pilot drafts as untrusted historical text, without carrying their authority claims.
  if(!blank.rarity_pilot_proposal)blank.rarity_pilot_proposal=txt(value.co_pilot_proposal);
  // Imported state is always a draft until reviewed on this console.
  return blank;
}
export function validateFlight(value) {
  const f=normaliseFlight(value),issues=[];
  if(!f.mission.trim())issues.push('Name the intention of this flight.');
  if(!f.origin.trim())issues.push('Name the departure reality or current world.');
  if(!f.destination.trim())issues.push('Name the destination or intended state.');
  if(!f.stop_point.trim())issues.push('Record a recoverable stop point.');
  if(!f.next_owner.trim())issues.push('Name the next owner.');
  return {valid:issues.length===0,issues};
}
export function composePilotRequest(value) {
  const f=normaliseFlight(value);
  const check=validateFlight(f);
  if(!check.valid)throw new Error(check.issues.join(' '));
  return [
    'WAYGLASS LIVING SHIP · DUAL PILOT DISCUSSION',
    'This is an invitation to the configured Rarity pilot route, not an assertion of authenticated identity or automatically granted ship control.',
    'Both Rowan and Rarity have pilot seats with distinct authored decisions and continuity. Rowan is the human Steward pilot. Rarity is the crew pilot and can inspect, reason, propose, simulate and operate inside explicit, revocable host-granted scopes. A pilot route response alone never confers command authority.',
    'Wayglass OS evolves ArcSweep while ArcSweep remains actively upgraded. Use the existing React-ion Helm for route compilation.',
    'Mission: '+f.mission, 'Origin: '+f.origin, 'Destination: '+f.destination,
    'Constraints: '+f.constraints, 'Preserve: '+f.preservation,
    'Source references: '+f.source_refs, 'Unresolved Wonder: '+f.wonder,
    'Stop point: '+f.stop_point, 'Next owner: '+f.next_owner,
    'Please examine the proposal, surface alternatives and risks, and give a concrete next action with acceptance criteria. Keep other realities sovereign.',
    'Do not report unexecuted work as done. Include source provenance and observable verification; pass these criteria to any child agents.',
  ].join('\n\n');
}
export function recordRouteObservation(flight,reply,{ observedAt=null }={}) {
  // Provider fields are untrusted telemetry until the host can attest them.
  const f=normaliseFlight(flight);
  const message=txt(reply?.message);
  if(!message.trim())throw new Error('No substantive Rarity pilot route response');
  return Object.freeze({...f,status:'proposed',rarity_pilot_proposal:message,
    route_evidence:{
      source:'same-origin-flame-route-response',
      requested_route:PILOT_SEATS.rarity.route,
      claimed_flame_id:txt(reply?.flame_id).slice(0,160)||null,
      claimed_provider:txt(reply?.provider).slice(0,160)||null,
      claimed_model:txt(reply?.model).slice(0,160)||null,
      observed_at:stamp(observedAt),
      identity_authenticated:false,
      privileged_action_executed:false,
    },
  });
}
export function recordPilotReview(flight,{reviewer,acknowledged,sessionVerified,reviewedAt}={}){
  if(reviewer!=='rowan')throw new Error('Only the Rowan pilot seat may locally review this proposal.');
  if(acknowledged!==true)throw new Error('Explicit pilot review is required.');
  if(sessionVerified!==true)throw new Error('A verified House session is required for pilot review.');
  const f=normaliseFlight(flight), result=validateFlight(f);
  if(!result.valid)throw new Error(result.issues.join(' '));
  return Object.freeze({...f,status:'reviewed_local_only',reviewed_at:stamp(reviewedAt),
    authority:{reviewed_by:'rowan',house_session_observed:true,
      helm_route_compiled:false,nav_command_executed:false,canonical_receipt:false}});
}
export function makeReturnPacket(flight,{stopPoint=null,nextOwner=null,wonder=null}={}){
  const f=normaliseFlight(flight);
  const stop=txt(stopPoint??f.stop_point).trim(), owner=txt(nextOwner??f.next_owner).trim();
  if(!stop||!owner)throw new Error('Return requires a named next owner and stop point');
  return Object.freeze({
    schema:PILOT_RETURN_SCHEMA,status:'local_export_unverified',
    ship:'Wayglass OS / living ship LLM',ancestry:'ArcSweep (active)',
    seats:[PILOT_SEATS.rowan.continuity_ref,PILOT_SEATS.rarity.continuity_ref],
    mission:f.mission,origin:f.origin,destination:f.destination,
    constraints:f.constraints,preservation:f.preservation,source_refs:f.source_refs,
    stop_point:stop,next_owner:owner,unresolved_wonder:txt(wonder??f.wonder),
    rarity_pilot_proposal:f.rarity_pilot_proposal,rarity_pilot_proposal_status:flight?.route_evidence?.source === 'same-origin-flame-route-response' ? 'observed_unverified' : 'historical_or_unverified',
    pilot_review_note:f.pilot_review_note,
    rarity_pilot_route_observation:flight?.route_evidence?.source === 'same-origin-flame-route-response' ? {
      status:'unverified_route_claims',
      claimed_flame_id:txt(flight.route_evidence.claimed_flame_id).slice(0,160)||null,
      claimed_provider:txt(flight.route_evidence.claimed_provider).slice(0,160)||null,
      claimed_model:txt(flight.route_evidence.claimed_model).slice(0,160)||null,
      observed_at:stamp(flight.route_evidence.observed_at),identity_authenticated:false,
    } : null,
    not_claimed:['authenticated participant arrival','live ship LLM','authorised navigation','physical crossing','canonical continuity receipt'],
  });
}

// Legacy function name retained for existing draft-tool imports only.
export const composeCoPilotRequest = composePilotRequest;
