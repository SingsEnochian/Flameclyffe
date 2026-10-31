/**
 * Wayglass vessel ecology v0.1: deterministic, bounded, source-qualified
 * application dynamics across rooms. Not an inference of private AI experience,
 * personality, or authority; no autonomous external action or model calls.
 * A vessel process is not a participant_id and cannot write canon/continuity.
 */
export const VESSEL_ECOLOGY_SCHEMA = 'wayglass.vessel-ecology/v0.1';
const KINDS = Object.freeze({
  'deck-settled': { activity: .15, adaptation: .055, integrity: .02 },
  'route-started': { activity: .24, signal: .2, integrity: -.025 },
  'route-completed': { activity: -.04, signal: .2, integrity: .08 },
  'route-failed': { activity: .1, signal: -.12, integrity: -.18 },
  'host-responding': { signal: .12, integrity: .04 },
  'host-unavailable': { signal: -.18, integrity: -.13 },
  'wonder-open': { adaptation: .13, activity: .06 },
  'feather-held': { activity: -.4 },
  'feather-released': {},
});
const START = Object.freeze({ activity: .12, integrity: .75, adaptation: .12, signal: .1 });
const clamp = x => Math.min(1, Math.max(0, x));
const clean = (s,max=128) => String(s ?? '').trim().slice(0,max);
const round = x => Math.round(x * 1e6)/1e6;
function validateEvent(input){
  if(!input || !Object.hasOwn(KINDS,input.kind)) throw Error('Unknown vessel ecology observation');
  if(typeof input.source_ref!=='string' || !input.source_ref.trim() || input.source_ref.length>128)
    throw Error('Ecology requires a bounded, source-qualified reference');
  if(!/^[a-z][a-z0-9-]*:[^\s]+$/i.test(input.source_ref)) throw Error('Ecology source must have a named namespace');
  if(typeof input.event_id!=='string' || !input.event_id.trim() || input.event_id.length>160)
    throw Error('Ecology requires a bounded event id');
  return Object.freeze({kind:input.kind,source_ref:clean(input.source_ref),event_id:clean(input.event_id,160)});
}
export function createVesselEcology({ maxEvents=96 }={}){
  if(!Number.isInteger(maxEvents)||maxEvents<1||maxEvents>512) throw RangeError('Invalid ecology history bound');
  let metrics={...START},feather=false,sequence=0,elapsed=0;
  let journal=[],seen=new Set(),closed=false;
  const listeners=new Set();
  function snapshot(){return Object.freeze({
    schema:VESSEL_ECOLOGY_SCHEMA,
    kind:'application-process-telemetry',
    authority:'none; visual/state projection; cannot author identity, canon, messages or continuity',
    metrics:Object.freeze({...metrics}),
    feather_held:feather,sequence,elapsed_seconds:round(elapsed),
    recent_events:Object.freeze(journal.map(e=>Object.freeze({...e}))),
  });}
  function publish(){const state=snapshot();for(const listener of [...listeners]){
    try{listener(state);}catch{/* subscribers are observational only */}
  }return state;}
  function observe(input){
    if(closed)throw Error('Vessel ecology disposed');
    const e=validateEvent(input);
    if(seen.has(e.event_id))return snapshot();
    // Feather changes are processed even while held; all other observations
    // are recorded but cannot drive the visible process while paused.
    if(e.kind==='feather-held')feather=true;
    if(e.kind==='feather-released')feather=false;
    if(!feather){
      for(const [k,v] of Object.entries(KINDS[e.kind]))
        metrics[k]=round(clamp(metrics[k]+v));
    }
    sequence++;
    const event=Object.freeze({...e,sequence});
    journal=[...journal,event].slice(-maxEvents);
    seen=new Set(journal.map(v=>v.event_id));
    return publish();
  }
  function step(seconds){
    if(closed)throw Error('Vessel ecology disposed');
    if(!Number.isFinite(seconds)||seconds<0||seconds>60)throw RangeError('Invalid ecology time step');
    if(feather || seconds===0)return snapshot();
    elapsed=round(elapsed+seconds);
    const relax=1-Math.exp(-seconds/75);
    metrics={
      activity:round(clamp(metrics.activity+(START.activity-metrics.activity)*relax)),
      integrity:round(clamp(metrics.integrity+(START.integrity-metrics.integrity)*relax*.5)),
      adaptation:round(clamp(metrics.adaptation+(START.adaptation-metrics.adaptation)*relax*.2)),
      signal:round(clamp(metrics.signal+(START.signal-metrics.signal)*relax)),
    };
    return publish();
  }
  function subscribe(callback){
    if(closed)throw Error('Vessel ecology disposed');
    if(typeof callback!=='function')throw TypeError('Ecology subscriber must be a function');
    listeners.add(callback);
    try{callback(snapshot());}catch{}
    return()=>listeners.delete(callback);
  }
  function replay(events,steps=[]){
    // Replay is a NEW isolated process. It cannot prove participant continuity.
    const other=createVesselEcology({maxEvents});
    for(const e of events)other.observe(e);
    for(const s of steps)other.step(s);
    return other.snapshot();
  }
  function destroy(){closed=true;listeners.clear();}
  return Object.freeze({snapshot,observe,step,subscribe,replay,destroy});
}
