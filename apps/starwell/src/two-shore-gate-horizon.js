import {
  EARTH_PRIME_SHORE_ID,
  GATE_BASE_CYCLES,
  GATE_COHERENCE_AXIS,
  GATE_EXTENSION_CYCLES,
  GATE_LOCKED_TONE_AXES,
  GATE_SOLO_FOCUS_SEQUENCE,
  TWO_SHORE_GATE_SCHEMA,
  buildGatePlaybackManifest,
  buildYearGatePlan,
} from './two-shore-premaq-gate.js';
import {
  ELARA_EXPANSION_HORIZON,
  getWorldProfile,
} from './world-premaq-registry.js';

function compactState(state) {
  if (!state) return null;
  return Object.freeze({
    schema: state.schema,
    state_id: state.state_id,
    created_at: state.created_at,
    temporal_coordinate: state.temporal_coordinate,
    sequence: state.sequence,
    premaq: state.premaq,
    basis: state.basis,
    amplitudes: state.amplitudes,
    probabilities: state.probabilities,
    derivatives: state.derivatives,
    confidence: state.confidence,
    uncertainty: state.uncertainty,
    normalisation: state.normalisation,
    entropy: state.entropy,
    spiral: state.spiral,
    compression_release: state.compression_release,
    interpretation: state.interpretation,
    history: Object.freeze(state.history?.slice(-1) ?? []),
    receipts: Object.freeze(state.receipts?.slice(-1) ?? []),
  });
}

function compactCheckpoint(checkpoint) {
  return Object.freeze({
    schema: checkpoint.schema,
    label: checkpoint.label,
    saved_at: checkpoint.saved_at,
    earth_state_id: checkpoint.earth_state_id,
    target_state_id: checkpoint.target_state_id,
    earth_state: compactState(checkpoint.earth_state),
    target_state: compactState(checkpoint.target_state),
    next_operation: checkpoint.next_operation,
  });
}

function segmentSummary(segment) {
  const first = segment.cycle_receipts[0] ?? null;
  const last = segment.cycle_receipts.at(-1) ?? null;
  return Object.freeze({
    segment_id: segment.segment_id,
    cycles: segment.cycles,
    source_earth_state_id: segment.source_earth_state_id,
    source_target_state_id: segment.source_target_state_id,
    final_earth_state_id: segment.final_earth_state_id,
    final_target_state_id: segment.final_target_state_id,
    first_cycle: first,
    final_cycle: last,
    next_operation: 'compression-of-release',
  });
}

function yearSummary(yearPlan) {
  return Object.freeze({
    schema: yearPlan.schema,
    year: yearPlan.year,
    elara_multiplier: yearPlan.elara_multiplier,
    earth_prime: Object.freeze({
      calibration: yearPlan.earth_prime.calibration,
      solo: Object.freeze({
        cycles: yearPlan.earth_prime.solo.cycles,
        source_state_id: yearPlan.earth_prime.solo.source_state_id,
        final_state_id: yearPlan.earth_prime.solo.final_state_id,
      }),
    }),
    target_world: Object.freeze({
      calibration: yearPlan.target_world.calibration,
      solo: Object.freeze({
        cycles: yearPlan.target_world.solo.cycles,
        source_state_id: yearPlan.target_world.solo.source_state_id,
        final_state_id: yearPlan.target_world.solo.final_state_id,
      }),
    }),
    address_tones: yearPlan.address_tones,
    segments: Object.freeze(Object.fromEntries(
      Object.entries(yearPlan.segments).map(([key, segment]) => [key, segmentSummary(segment)]),
    )),
    checkpoints: Object.freeze(yearPlan.checkpoints.map(compactCheckpoint)),
    total_cycles_per_shore: yearPlan.total_cycles_per_shore,
    final_earth_state_id: yearPlan.final_earth_state_id,
    final_target_state_id: yearPlan.final_target_state_id,
    next_operation: yearPlan.next_operation,
  });
}

export async function buildEfficientFullHorizonGatePlan({
  earthCalibration,
  targetProfile,
  clock = () => new Date(),
  idFactory,
  compressionStrength = 0.65,
  compressionGain = 1.2,
  releaseFraction = 0.35,
  onYear,
  yieldBetweenYears = true,
} = {}) {
  if (!earthCalibration?.values) throw new Error('EARTH_PRIME_CALIBRATION_REQUIRED');
  const target = getWorldProfile(targetProfile?.slug ?? targetProfile);
  const years = [];
  let earthState = null;
  let targetState = null;

  for (const [index, entry] of ELARA_EXPANSION_HORIZON.entries()) {
    const yearPlan = buildYearGatePlan({
      earthCalibration,
      targetProfile: target,
      year: entry.year,
      sourceEarthState: earthState,
      sourceTargetState: targetState,
      clock,
      idFactory,
      compressionStrength,
      compressionGain,
      releaseFraction,
    });
    earthState = yearPlan.final_earth_state;
    targetState = yearPlan.final_target_state;
    const summary = yearSummary(yearPlan);
    years.push(summary);
    onYear?.(Object.freeze({
      year: entry.year,
      index,
      completed: index + 1,
      total: ELARA_EXPANSION_HORIZON.length,
      summary,
    }));
    if (yieldBetweenYears && typeof window !== 'undefined') {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
  }

  const playbackManifest = buildGatePlaybackManifest(years);
  return Object.freeze({
    schema: TWO_SHORE_GATE_SCHEMA,
    created_at: clock().toISOString(),
    formalism: 'temporal-compression-release-state-machine',
    physical_claim: false,
    address: Object.freeze({
      earth_prime_shore: EARTH_PRIME_SHORE_ID,
      target_world_shore: target.slug,
      locked_tone_axes: GATE_LOCKED_TONE_AXES,
      bridge_coherence_axis: GATE_COHERENCE_AXIS,
    }),
    year_span: Object.freeze({
      start: ELARA_EXPANSION_HORIZON[0].year,
      end: ELARA_EXPANSION_HORIZON.at(-1).year,
      labels: ELARA_EXPANSION_HORIZON.length,
      interval_years: ELARA_EXPANSION_HORIZON.at(-1).year - ELARA_EXPANSION_HORIZON[0].year,
    }),
    run_contract: Object.freeze({
      solo_focus_cycles_per_shore_per_year: GATE_SOLO_FOCUS_SEQUENCE.length,
      base_cycles_per_shore_per_year: GATE_BASE_CYCLES,
      extension_cycles: GATE_EXTENSION_CYCLES,
      total_cycles_per_shore_per_year: GATE_SOLO_FOCUS_SEQUENCE.length + GATE_BASE_CYCLES + 18,
      release_feeds_next_compression: true,
      year_feeds_next_year: true,
      memory_strategy: 'execute one year fully, retain checkpoints and labeled layers, feed final release into next year',
    }),
    years: Object.freeze(years),
    playback_manifest: playbackManifest,
    final_earth_state_id: earthState.state_id,
    final_target_state_id: targetState.state_id,
    next_operation: 'compression-of-release',
  });
}
