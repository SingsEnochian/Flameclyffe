/**
 * Nikola N-006 · Upward Spiral / deterministic math instrument.
 * Owns only synthetic model calculations and immutable, local receipts.
 * PREMAQC and its compression-release state remain owned by Math Spine.
 */
import { sha256Hex } from '../world-tone-fold-approval.js';
import {
  MATH_SPINE_PACKET_SCHEMA,
  replayMathSpinePacket,
  validateMathSpinePacket,
} from './math-spine-packet.js';

export const NIKOLA_SPIRAL_SCHEMA = 'wayglass.nikola-invariant-spiral/v1';
export const NIKOLA_SPIRAL_RECEIPT_SCHEMA = 'wayglass.nikola-spiral-receipt/v1';
const MAX_CYCLES = 12;
const SOURCE_ID = /^[A-Za-z0-9:./_-]{1,128}$/;
const BASELINE = Object.freeze({ stiffness: 'N/m', mass: 'kg' });

function requireThat(ok, reason) {
  if (!ok) throw new Error('Nikola spiral: ' + reason);
}
function positive(value, name) {
  requireThat(typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 1e12,
    name + ' must be a bounded positive finite number');
  return value;
}
function sourceOf(input) {
  requireThat(input && SOURCE_ID.test(input.id) && SOURCE_ID.test(input.family),
    'source requires bounded ID and independent origin family');
  requireThat(input.kind === 'synthetic' || input.kind === 'observed',
    'source kind must be declared');
  return { id: input.id, family: input.family, kind: input.kind };
}
function measurementOf(input) {
  requireThat(input && ['stiffness','mass'].includes(input.kind),
    'measurement kind must be stiffness or mass');
  const unit = BASELINE[input.kind];
  requireThat(input.unit === unit, 'measurement requires SI unit '+ unit);
  return { kind: input.kind, value: positive(input.value, 'measurement'), unit };
}
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function same(x,y,eps = 1e-9) {
  return Math.abs(x-y) <= eps * Math.max(1,Math.abs(x),Math.abs(y));
}

/** Exact analytical f=(1/(2π)) sqrt(k/m) for an ideal mass-spring oscillator. */
export function deriveOscillatorInvariant({stiffness,mass,stiffness_unit,mass_unit}, frequencyRatio) {
  const k = positive(stiffness, 'stiffness');
  const m = positive(mass, 'mass');
  requireThat(stiffness_unit === 'N/m' && mass_unit === 'kg',
    'baseline requires N/m and kg');
  const ratio = positive(frequencyRatio,'frequency ratio');
  const q = ratio * ratio;
  const before = Math.sqrt(k / m) / (2 * Math.PI);
  const stiffnessOnly = k * q;
  const massOnly = m / q;
  const target = k / m * q;
  requireThat([q,before,stiffnessOnly,massOnly,target,before*ratio].every(Number.isFinite),
    'derived values outside finite range');
  requireThat(stiffnessOnly > 0 && massOnly > 0 && target > 0,
    'derived physical values must be positive');
  return freeze({
    schema: 'wayglass.nikola-oscillator-invariant/v1',
    assumptions: ['ideal mass-spring oscillator', 'linear small displacement', 'single observed frequency ratio',
      'no independent stiffness or mass change measured'],
    baseline: {stiffness:k, stiffness_unit:'N/m',mass:m,mass_unit:'kg',frequency_hz:before},
    observation: {frequency_ratio:ratio, final_frequency_hz:before*ratio},
    compression: {stiffness_to_mass_ratio_factor:q, target_stiffness_per_mass:target,
      dimension: 's^-2', equation: 'k_final/m_final = (f_final/f_initial)^2 * k_initial/m_initial'},
    release: {
      stiffness_only: {stiffness_N_per_m:stiffnessOnly,mass_kg:m},
      mass_only: {stiffness_N_per_m:k,mass_kg:massOnly},
      mixed_family: 'For every admissible k_final>0, m_final=k_final/(target ratio); an infinite continuum remains.',
      discriminating_measurement: 'Independently measure either final stiffness (N/m) or final mass (kg).',
    },
    inference: 'The frequency ratio alone does NOT identify which physical parameter changed.',
    physical_measurement_claim: false,
    formal_quantum_state_claim: false,
  });
}

function originOf({baseline,frequencyRatio,source}) {
  const calc = deriveOscillatorInvariant(baseline,frequencyRatio);
  return {baseline:{stiffness:calc.baseline.stiffness,mass:calc.baseline.mass,
    stiffness_unit:'N/m',mass_unit:'kg'},frequency_ratio:frequencyRatio,source:sourceOf(source)};
}

function latestProjection(origin,rounds) {
  const calc=deriveOscillatorInvariant(origin.baseline,origin.frequency_ratio);
  const accepted=rounds.filter(r=>r.status==='admitted');
  const last=accepted.at(-1);
  if(!last) return {evidence_state:'frequency-alone-underdetermined',conditional_state:null,calculation:calc};
  const e=last.measurement;
  const k=e.kind==='stiffness' ? e.value : e.value*calc.compression.target_stiffness_per_mass;
  const m=e.kind==='mass' ? e.value : e.value/calc.compression.target_stiffness_per_mass;
  requireThat([k,m].every(x=>x>0&&Number.isFinite(x)),
    'updated inference outside physical finite range');
  const k0=calc.baseline.stiffness,m0=calc.baseline.mass;
  const designation=same(m,m0)?'compatible-with-stiffness-only':
    same(k,k0)?'compatible-with-mass-only':'requires-joint-change-under-model';
  return {
    evidence_state:'conditional-on-caller-declared-independent-measurement',
    conditional_state:{
      stiffness_N_per_m:k,mass_kg:m,classification:designation,
      measurement_source:last.source.id,
      independent_measurement_authenticated:false,
      remaining_unknown:'model validity, measurement error and causal mechanism',
    },
    calculation:calc,
  };
}
async function fresh(origin) {
  const origin_fingerprint=await sha256Hex({schema:NIKOLA_SPIRAL_SCHEMA,origin});
  const packet={schema:NIKOLA_SPIRAL_SCHEMA,origin,origin_fingerprint,rounds:[],
    head_fingerprint:origin_fingerprint,projection:latestProjection(origin,[])};
  return freeze(packet);
}
async function apply(state,{measurement,source}) {
  requireThat(state.rounds.length<MAX_CYCLES,'cycle limit reached');
  const obs=measurementOf(measurement),origin=sourceOf(source);
  const families=[state.origin.source.family,...state.rounds.filter(r=>r.status==='admitted').map(r=>r.source.family)];
  const status=families.includes(origin.family)?'held-shared-source-origin':'admitted';
  const row={
    schema:NIKOLA_SPIRAL_RECEIPT_SCHEMA,cycle:state.rounds.length+1,
    from_fingerprint:state.head_fingerprint,source:origin,measurement:obs,status,
    authority:'caller-declared-input-not-independent-attestation',
    next_operation:'compression-of-release',
  };
  row.fingerprint=await sha256Hex(row);
  const rounds=[...state.rounds,row];
  return freeze({...state,rounds,head_fingerprint:row.fingerprint,projection:latestProjection(state.origin,rounds)});
}

export async function createNikolaSpiral({baseline,frequencyRatio,source}) {
  return fresh(originOf({baseline,frequencyRatio,source}));
}

export async function replayNikolaSpiral(input) {
  requireThat(input?.schema===NIKOLA_SPIRAL_SCHEMA && Array.isArray(input.rounds) &&
    input.rounds.length<=MAX_CYCLES,'unsupported or oversized packet');
  const state=await fresh(originOf({
    baseline:input.origin?.baseline,frequencyRatio:input.origin?.frequency_ratio,source:input.origin?.source}));
  let cursor=state;
  for(const row of input.rounds) {
    cursor=await apply(cursor,{measurement:row.measurement,source:row.source});
    requireThat(cursor.head_fingerprint===row.fingerprint, 'receipt-chain fingerprint mismatch');
  }
  requireThat(await sha256Hex(cursor)===await sha256Hex(input),
    'packet differs from deterministic replay');
  return freeze({schema:'wayglass.nikola-spiral-replay/v1',matched:true,
    origin_fingerprint:cursor.origin_fingerprint,head_fingerprint:cursor.head_fingerprint,
    rounds:cursor.rounds.length,projection:cursor.projection});
}
export async function advanceNikolaSpiral(input,{measurement,source}) {
  await replayNikolaSpiral(input);
  return apply(input,{measurement,source});
}

/** Read-only, replay-verified association, NOT conversion of PREMAQC probability into evidence. */
export async function witnessMathSpine(packet) {
  requireThat(packet?.schema===MATH_SPINE_PACKET_SCHEMA,'canonical Math Spine packet required');
  const candidate=validateMathSpinePacket(packet);
  const replay=await replayMathSpinePacket(candidate);
  requireThat(replay.matched===true &&
    replay.replay_fingerprint===candidate.packet_fingerprint &&
    replay.expected_fingerprint===candidate.packet_fingerprint,
    'Math Spine deterministic replay mismatch');
  requireThat(await sha256Hex(candidate.source)===candidate.source_fingerprint,
    'Math Spine source fingerprint mismatch');
  return freeze({
    schema:'wayglass.nikola-math-spine-witness/v1',
    source_schema:candidate.schema,packet_id:candidate.packet_id,
    source_fingerprint:candidate.source_fingerprint,
    replay_fingerprint:replay.replay_fingerprint,matched:true,
    compression_cycle:replay.projection.receipt.cycle,
    next_operation:replay.projection.receipt.next_operation,
    world_id:replay.world_id,classification:'canonical-computational-math-spine-replay',
    no_physical_measurement_or_participant_authority_claim:true,
    evidence_is_not_auto_admitted:true,
    source_provenance_refs:structuredClone(candidate.source.provenance_refs),
  });
}
