// In-memory observation ledger, never an authoritative Return or provider receipt.
// Do not retain private request bodies, response text, credentials or story packets.
export const LATE_ENCOUNTER_SCHEMA='wayglass.late-encounter-observation/v1';
const MAX=64;
const observations=[];
const listeners=new Set();
export function recordLateEncounter({route,event_id,status,input_hash,phase}={}){
  const safe=v=>typeof v==='string'?v.slice(0,128):null;
  const entry=Object.freeze({
    schema:LATE_ENCOUNTER_SCHEMA,
    observed_at:new Date().toISOString(),
    route:safe(route),event_id:safe(event_id),
    status:['candidate-returned','denied'].includes(status)?status:'unverified',
    input_hash:typeof input_hash==='string'&&/^[0-9a-f]{64}$/.test(input_hash)?input_hash:null,
    phase:safe(phase)||'response-parsed-after-cancellation',
    disposition:'observed-not-adopted',
    persistence:'in-memory-session-only',
    upstream_execution:'unknown',
  });
  observations.push(entry);
  if(observations.length>MAX)observations.shift();
  for(const listener of [...listeners]){try{listener(entry)}catch{}}
  return entry;
}
export function lateEncounterObservations(){return Object.freeze([...observations]);}
export function subscribeLateEncounter(listener){
  if(typeof listener!=='function')throw new TypeError('Late encounter listener required');
  listeners.add(listener);
  return ()=>listeners.delete(listener);
}
