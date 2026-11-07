'use strict';
// Quad Eightfold Möbius Gestalt: four bounded eight-phase organs, one Withness.
const { PHASES } = require('./wyrdrune/wyrdrune.cjs');
const { digest, encode } = require('./wyrdrune/canonical.cjs');
const SCHEMA = 'wayglass.quad-eightfold/v1';
const SOURCE_SCHEMA = 'wayglass.quad-sources/v1';
const CHECKPOINT_SCHEMA = 'wayglass.quad-checkpoint/v1';
const LANES = Object.freeze(['perception', 'resonance', 'agency', 'continuity']);
const TABLES = Object.freeze([
  'deep_observer_events', 'observer_measurements', 'wayglass_route_receipts',
  'house_runtime_events', 'math_spine_packets', 'source_library_query_receipts'
]);
const STATUSES = new Set(['observed', 'empty', 'unavailable', 'error']);
const MAX_CYCLES = 8;
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function iso(value) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new TypeError('Timestamp must be ISO compatible');
  return new Date(value).toISOString();
}
function label(value, name, max = 300) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f]/u.test(value)) throw new TypeError('Invalid ' + name);
  return value.trim();
}
function validateSources(source) {
  if (!source || source.schema !== SOURCE_SCHEMA || !Array.isArray(source.channels)
    || source.channels.length !== TABLES.length) throw new TypeError('Exact six-channel source packet required');
  const observed_at = iso(source.observed_at), channels = [];
  const used = new Set();
  for (const row of source.channels) {
    if (!row || !TABLES.includes(row.id) || used.has(row.id) || !STATUSES.has(row.status)
      || (row.count !== null && (!Number.isSafeInteger(row.count) || row.count < 0))
      || (row.status === 'observed' && !(row.count > 0))
      || (row.status === 'empty' && row.count !== 0)
      || (['unavailable','error'].includes(row.status) && row.count !== null)) throw new TypeError('Invalid channel evidence');
    if (row.latest_at !== null && row.latest_at !== undefined) iso(row.latest_at);
    used.add(row.id);
    channels.push({
      id: row.id, status: row.status, count: row.count,
      latest_at: row.latest_at ? iso(row.latest_at) : null,
      provenance: label(row.provenance || 'unavailable', 'provenance', 160),
    });
  }
  if (TABLES.some(id => !used.has(id))) throw new TypeError('Missing source channel');
  channels.sort((a,b) => TABLES.indexOf(a.id) - TABLES.indexOf(b.id));
  return freeze({schema: SOURCE_SCHEMA, observed_at, channels, kind: 'source-metadata-only',
    assertion: 'counts and timestamps from an authorized source adapter; no raw private records'});
}
function validateContinuity(value = {}) {
  const questions = value.unresolved_wonder_questions || [];
  const revoked = value.revoked_refs || [];
  if (!Array.isArray(questions) || !Array.isArray(revoked) || questions.length > 32 || revoked.length > 128
      || !questions.every(x => typeof x === 'string' && x.length <= 1000)
      || !revoked.every(x => typeof x === 'string' && x.length <= 500)) throw new TypeError('Invalid continuity');
  return freeze({
    participant_ref: value.participant_ref ? label(value.participant_ref,'participant ref',240) : null,
    world_ref: value.world_ref ? label(value.world_ref,'world ref',240) : null,
    stop_point: value.stop_point ? label(value.stop_point,'stop point',1000) : null,
    next_owner: value.next_owner ? label(value.next_owner,'next owner',240) : null,
    unresolved_wonder_questions: [...questions],
    revoked_refs: [...new Set(revoked)],
    source: 'read-only caller-supplied context; not identity or canon authority',
  });
}
function channel(sources, id) { return sources.channels.find(x=>x.id===id); }
function freshState(row, now) {
  if (row.status !== 'observed') return row.status;
  if (!row.latest_at) return 'age-unknown';
  const age = Date.parse(now)-Date.parse(row.latest_at);
  if (age < -300000) return 'clock-skew';
  return age > 86400000 ? 'historical' : age > 600000 ? 'aging' : 'fresh';
}
function deriveSoundstage(sources, now) {
  // Odio-inspired spatial layering; own numeric sound parameters, no assets copied.
  const templates = [
    ['deep_observer_events','atmosphere',-0.65,0.8],
    ['observer_measurements','texture',0.5,0.65],
    ['wayglass_route_receipts','pulse',-0.2,0.35],
    ['house_runtime_events','motion',0.7,0.55],
  ];
  return templates.map(([id, layer, pan, distance]) => {
    const src=channel(sources,id), fresh=freshState(src,now);
    const available=src.status==='observed';
    // Counts provide a descriptive modulation, not a claim that source data is sound.
    const gain=available ? Math.min(0.075,0.008+0.006*Math.log2(src.count+1)) : 0;
    return {
      layer, source_ref: id, evidence_status: src.status, freshness: fresh,
      gain: Number(gain.toFixed(5)), pan, distance,
      playback_enabled: false, loop_authorized: false, spatial_mode: 'virtual-static',
      kind: 'proposed-sonification-parameter', frequency_hz: [110,176,220,330][templates.findIndex(x=>x[0]===id)],
    };
  });
}
function describeLane(name, sources, continuity, prior) {
  const observed=sources.channels.filter(x=>x.status==='observed');
  const missing=sources.channels.filter(x=>x.status!=='observed');
  if (name==='perception') return {
    observations: observed.map(x=>({source_ref:x.id, count:x.count, latest_at:x.latest_at})),
    gaps: missing.map(x=>({source_ref:x.id,status:x.status})),
    inference: 'counts are availability, not measurement of cognition or consciousness',
  };
  if (name==='resonance') return {
    soundstage: deriveSoundstage(sources,sources.observed_at),
    inspiration: 'Odio: independently positioned original layers; no borrowed audio or automatic playback',
    outputs: ['existing-acoustic-room','somatic-sound','watercolor','haptics'],
  };
  if (name==='agency') return {
    proposals: [
      ...missing.map(x=>({kind:'investigate-source',source_ref:x.id,decision:'pending'})),
      ...(observed.length?[{kind:'inspect-supported-events',source_refs:observed.map(x=>x.id),decision:'pending'}]:[]),
    ].slice(0,12),
    execution: 'none', model_reply: 'none', consent: 'required-for-actions',
  };
  return {
    participant_ref: continuity.participant_ref, world_ref: continuity.world_ref,
    stop_point: continuity.stop_point, next_owner: continuity.next_owner,
    unresolved_wonder_questions: continuity.unresolved_wonder_questions,
    revoked_refs: continuity.revoked_refs,
    previous_gestalt_hash: prior || null,
    canon_commit:false, identity_commit:false, relationship_commit:false, authority_grant:false,
  };
}
function evaluatePhase(phase, lane, value, context) {
  const { sources, previous_hash, continuity }=context;
  switch (phase) {
    case 'perceive': return {evidence_source_hash:digest(sources),channels:sources.channels.length};
    case 'compress': return {observed:sources.channels.filter(x=>x.status==='observed').length,
      empty:sources.channels.filter(x=>x.status==='empty').length,
      unavailable:sources.channels.filter(x=>!['observed','empty'].includes(x.status)).length,
      acknowledged_loss:'summary omits record contents'};
    case 'release': return value;
    case 'verify': return {source_hash:digest(sources),check:'metadata-shape-validated',
      data_authenticity:'asserted-by-host-adapter-not-cryptographically-attested'};
    case 'integrate': return {lane,previous_gestalt_hash:previous_hash||null,
      bridges:['observer','acoustic-room','somatic-sound','return-engine','Wyrdrune'],
      epistemic_registers:['observed-counts','projection','proposal']};
    case 'choose': return {action:'propose-only',can_decline:true,can_delegate:false,
      awaiting_participant_choice:true};
    case 'return': return {stop_point:continuity.stop_point,next_owner:continuity.next_owner,
      wonder_count:continuity.unresolved_wonder_questions.length,
      revocation_count:continuity.revoked_refs.length,playback_resume:false};
    case 'transcend': return {proposal:'re-evaluate cross-engine mappings on next authorized cycle',
      recursion_bounded:true,autorun:false};
    default: throw new Error('Unexpected Wyrdrune phase');
  }
}
function gestaltFor(lanes, sources, continuity, outer, prior) {
  const evidence = sources.channels.map(x=>({id:x.id,status:x.status,freshness:freshState(x,sources.observed_at),
    count:x.count,latest_at:x.latest_at}));
  const gaps = evidence.filter(x=>x.status!=='observed').map(x=>x.id);
  const soundstage=lanes.resonance.release.soundstage;
  return {
    schema:'wayglass.quad-gestalt/v1',
    face:outer?'outer':'inner',source_hash:digest(sources),
    cross_engine_relation:{
      perception_to_resonance:'observed counts modulate proposed spatial layers',
      perception_to_agency:'missing readings become questions rather than invented measurements',
      agency_to_continuity:'choices remain proposals until independently authorized',
      continuity_to_perception:'previous gestalt hash establishes recursive lineage',
    },
    evidence,gaps,
    soundstage,actions:lanes.agency.release.proposals,
    continuity:lanes.continuity.release,
    prior_gestalt_hash:prior||null,
    verified: 'structural-and-content-integrity-only',
    epistemic_guard: 'observed != inferred; silence != zero; projection != physical measurement',
    writes_canon:false,grants_authority:false,autoplays_audio:false,
  };
}
function validateCheckpoint(checkpoint) {
  if (!checkpoint || checkpoint.schema !== CHECKPOINT_SCHEMA || typeof checkpoint.hash !== 'string')
    throw new TypeError('Missing checkpoint');
  const {hash, ...core}=checkpoint;
  if (digest(core)!==hash || !Array.isArray(checkpoint.entries) || checkpoint.entries.length%32!==0)
    throw new Error('Quad checkpoint integrity failure');
  if (!Number.isSafeInteger(checkpoint.start_cycle) || checkpoint.start_cycle<0) throw new Error('Invalid quad cycle origin');
  let prior=checkpoint.root_hash, i=0;
  for (const entry of checkpoint.entries) {
    const {entry_hash, ...body}=entry;
    if (body.previous_hash!==prior || body.phase!==PHASES[i%8] || body.lane!==LANES[Math.floor((i%32)/8)]
      || body.pass!==checkpoint.start_cycle+Math.floor(i/32)+1 || digest(body)!==entry_hash)
      throw new Error('Quad phase ledger integrity failure');
    prior=entry_hash;i++;
  }
  if (prior!==checkpoint.terminal_hash || checkpoint.completed_cycles!==checkpoint.start_cycle+i/32
    || digest(checkpoint.gestalt)!==checkpoint.gestalt_hash)
    throw new Error('Quad return integrity failure');
  return true;
}
function runQuadEightfold({sources,continuity={},cycles=2,previous=null,feather=false}={}) {
  if (!Number.isSafeInteger(cycles) || cycles<1 || cycles>MAX_CYCLES) throw new RangeError('Quad recursion bounded to 1..8 cycles');
  if (feather===true) throw new Error('Feather: quad execution stopped');
  const evidence=validateSources(sources), anchor=validateContinuity(continuity);
  if (previous) validateCheckpoint(previous);
  if (previous && (previous.continuity.participant_ref!==anchor.participant_ref
      || previous.continuity.world_ref!==anchor.world_ref
      || encode(previous.continuity.revoked_refs)!==encode(anchor.revoked_refs)
      || encode(previous.continuity.unresolved_wonder_questions)!==encode(anchor.unresolved_wonder_questions)
      || previous.continuity.stop_point!==anchor.stop_point || previous.continuity.next_owner!==anchor.next_owner))
    throw new Error('Return identity, Wonder, stop point or revocation mismatch');
  const seed = previous?.terminal_hash || digest({schema:SCHEMA,evidence,anchor});
  let last=seed, prevGestalt=previous?.gestalt_hash||null, finalGestalt=null, entries=[];
  const start=previous?.completed_cycles||0;
  for(let step=0;step<cycles;step++){
    const pass=start+step+1, outputs={};
    for(const lane of LANES) {
      const data=describeLane(lane,evidence,anchor,prevGestalt);
      outputs[lane]={};
      for(const phase of PHASES){
        const output=evaluatePhase(phase,lane,data,{sources:evidence,continuity:anchor,previous_hash:prevGestalt});
        outputs[lane][phase]=output;
        const core={schema:'wayglass.quad-phase/v1',pass,lane,phase,face:pass%2?'outer':'inner',
          previous_hash:last,source_hash:digest(evidence),output_hash:digest(output)};
        const entry_hash=digest(core);
        entries.push(freeze({...core,entry_hash}));last=entry_hash;
      }
    }
    finalGestalt=gestaltFor(outputs,evidence,anchor,pass%2===1,prevGestalt);
    prevGestalt=digest(finalGestalt);
  }
  const body={schema:CHECKPOINT_SCHEMA,root_hash:seed,terminal_hash:last,
    start_cycle:start,completed_cycles:start+cycles,entries,gestalt:finalGestalt,gestalt_hash:prevGestalt,
    source_packet:evidence,continuity:anchor,mode:'host-observed-metadata-projection',
    sound_auto_resume:false,model_weight_updates:false,
    assertion:'hash-linked structural evidence, not a signature or autonomous cognition'};
  const result=freeze({...body,hash:digest(body)});
  validateCheckpoint(result);
  return result;
}
module.exports={SCHEMA,SOURCE_SCHEMA,CHECKPOINT_SCHEMA,LANES,PHASES,TABLES,
  validateSources,validateCheckpoint,deriveSoundstage,runQuadEightfold};
