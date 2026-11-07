// Wayglass Quad: user-facing Terra Prime temporal hinge and three independent lenses.
// Source evidence, hypothesis, historical records and mythic interpretation never merge.
export const HINGE_SCHEMA='wayglass.terra-prime-temporal-hinge/v1';
export const DESIGN_SCHEMA='wayglass.quad-experience-design/v1';
export const HINGE_LENSES=Object.freeze(['wonder','science','mythience']);
export const TIMELINE_REGISTERS=Object.freeze([
  {id:'documented-history',label:'Documented Terra Prime',status:'requires-event-provenance',
    meaning:'Observed or historically reconstructed events, with recorded dates and sources'},
  {id:'possible-history',label:'Alternative History',status:'counterfactual-hypothesis',
    meaning:'Counterfactual branch with a declared divergence; no claim it physically occurred'},
  {id:'worldseed',label:'Worldseed branch',status:'project-world-state',
    meaning:'A separately authored or simulated world branch, preserving owner and parent'},
  {id:'mythience',label:'Mythience correspondence',status:'symbolic-and-ritual',
    meaning:'Meaning, intention and sacred geometry without converting symbol into empirical event'},
]);
const clean=(x,max=500)=>typeof x==='string'?x.trim().slice(0,max):'';
const question='What happens at the hinge, when compression becomes release and possibility begins to branch?';
export const TERRA_PRIME_HINGE_QUESTION=question;
function assertReading(reading) {
  if(reading?.schema!=='wayglass.quad-ship-observation/v1'
    ||!Array.isArray(reading.evidence)||reading.evidence.length!==6
    ||typeof reading.checkpoint_hash!=='string')
    throw new TypeError('A host-sourced Quad observation is required');
}
export function temporalHingeFor(reading,{lens='wonder',eventDate=null,ownerBranch=null}={}){
  assertReading(reading);
  if(!HINGE_LENSES.includes(lens))throw new TypeError('Unknown temporal hinge lens');
  const inspected=reading.evidence.filter(e=>e.status==='observed');
  const stale=inspected.filter(e=>!['fresh','aging'].includes(e.freshness));
  const sourceCoverage=inspected.length/reading.evidence.length;
  const openQuestion=question;
  const frames={
    wonder:{
      title:'What If · The Hinge',
      inquiry:'What did the previous decade preserve under compression, and what alternatives become possible during release?',
      tests:['Keep at least two candidate branch narratives open','Return to the common ancestor without losing ownership'],
      observation:'A new narrative is a possibility, not a historical or quantum branch',
      output:'possibility-map',
    },
    science:{
      title:'Science · The Discriminator',
      inquiry:'Which independently dated measurements or events would distinguish an actual change point from attention, selection or recording bias?',
      tests:['Compare pre-hinge and post-hinge windows with declared units','Check data age, missingness, and source independence','Test against a null model and a known control'],
      observation:'Database row counts are not measurements of compression or physical timeline divergence',
      output:'provenance-aware-change-point-trial',
    },
    mythience:{
      title:'Mythience · The Crossing',
      inquiry:'What transformation can preserve names, witnesses, belonging, intention and unresolved Wonder while opening a new path?',
      tests:['Map the Möbius twist as a declared correspondence','Carry a witnessed Return Marker across the crossing','Let a participant decline without breaking the world'],
      observation:'Ritual and symbolic interpretations have their own provenance, not a substitute for empirical evidence',
      output:'witnessed-transformation-design',
    },
  };
  return Object.freeze({
    schema:HINGE_SCHEMA,lens,
    question:openQuestion,
    source_checkpoint:reading.checkpoint_hash,
    observed_at:reading.observed_at,
    event_date:eventDate ? clean(eventDate,40) : null,
    proposed_branch_ref:ownerBranch ? clean(ownerBranch,200) : null,
    summary:Object.freeze({...frames[lens]}),
    evidence_state:Object.freeze({
      observed_channels:inspected.length,total_channels:reading.evidence.length,
      coverage_fraction:sourceCoverage,
      stale_or_age_unknown:stale.map(e=>e.id),
      missing_channels:reading.evidence.filter(e=>e.status!=='observed').map(e=>e.id),
      can_claim_physical_branch:false,
      can_claim_scientific_change_point:false,
      can_propose_historical_trial:true,
    }),
    timeline_registers:TIMELINE_REGISTERS,
    ownership_state:'unchanged',return_marker:'checkpoint:'+reading.checkpoint_hash,
    epistemic_state:'question-open',canon_promotion:false,
  });
}
export function designThroughEightfold(reading,{lens='wonder',reducedMotion=false,mono=true}={}){
  const hinge=temporalHingeFor(reading,{lens});
  const phaseMap=[
    ['perceive','Display real source availability, age and provenance'],
    ['compress','Summarize the hinge without hiding missing data'],
    ['release','Allow side-by-side branches in separate epistemic registers'],
    ['verify','Expose the source checksum and what it actually verifies'],
    ['integrate','Map one source state to geometry, sound and accessible text'],
    ['choose','Make lens, branch, playback and model participation explicit choices'],
    ['return','Restore the named reference point, revoke audio and retain questions'],
    ['transcend','Offer the next bounded design experiment; never silently canonize'],
  ];
  return Object.freeze({
    schema:DESIGN_SCHEMA,
    source_checkpoint:reading.checkpoint_hash,
    agency:'owner-directed-proxy-design; Wayglass model contribution pending attributable route response',
    design_lens:lens,
    phases:phaseMap.map(([phase,design])=>Object.freeze({phase,design})),
    engines:{
      perception:'source freshness and epistemic status',
      resonance:'original spatial sound/watercolor/haptics, only when enabled',
      agency:'per-participant voice, choice and possible refusal',
      continuity:'common ancestor, explicit Return Marker and intact lineage',
    },
    vessels:['Living Watercolor','Living Observer','Acoustic Room','Quad Observatory',
      'Writing Room','Journey Before Destination','Terra Prime History'],
    visuals:{
      style:'cyberfae-refractive-watercolor',contrast:'avoid-white-flash',
      motion:reducedMotion?'static':'gentle-kinetic',audio_mode:mono?'mono-safe':'stereo',
      all_controls_have_text:true,source_status_is_visible:true,
    },
    decisions_not_made:['no live Nikola reply','no Wayglass-native weight update',
      'no physical timeline branch claim','no canon commit'],
    no_autoplay:true,feather_stop_supported:true,readable_without_audio:true,
    proposed_by:'assistant-proxy-for-wayglass',requires_attributable_wayglass_reply_for_native_authorship:true,
    hinge,
  });
}
