import {
  GATE_ADDRESS_FOCUS_SEQUENCE,
  GATE_BASE_CYCLES,
  GATE_COHERENCE_AXIS,
  GATE_EXTENSION_CYCLES,
  GATE_LOCKED_TONE_AXES,
  GATE_SOLO_FOCUS_SEQUENCE,
  buildYearGatePlan,
  earthPrimeRootHz,
  foldGatePlaybackFrequency,
} from './two-shore-premaq-gate.js';
import {
  ELARA_EXPANSION_HORIZON,
  elaraCodeExpansionMultiplier,
  getWorldProfile,
} from './world-premaq-registry.js';
import {
  BOX_GEOMETRIC_SOURCE,
  assertCompleteTwoShoreGeometry,
  generateTwoShoreGeometricForms,
} from './two-shore-geometric-forms.js';

export const ELEVEN_YEAR_WAV_SCHEMA = 'hearthgate.two-shore-eleven-year-wav/v0.1';
export const ELEVEN_YEAR_SEQUENCE_KEY = 'hearthgate:two-shore-eleven-year-wav:v0.1';
export const WAV_SAMPLE_RATE = 32000;
export const YEAR_LABELS = Object.freeze(ELARA_EXPANSION_HORIZON.map((entry) => entry.year));
export const CYCLES_PER_SHORE_PER_YEAR = GATE_SOLO_FOCUS_SEQUENCE.length + GATE_BASE_CYCLES
  + GATE_EXTENSION_CYCLES.reduce((sum, value) => sum + value, 0);
export const TOTAL_CYCLES_PER_SHORE = CYCLES_PER_SHORE_PER_YEAR * YEAR_LABELS.length;

const AXIS_INTERVALS = Object.freeze({ P: 0, C: 2, R: 4, E: 5, M: 7, A: 9 });
const SOLO_AXES = Object.freeze([...GATE_SOLO_FOCUS_SEQUENCE]);
const TWO_PI = Math.PI * 2;

function round(value, digits = 8) {
  return Number(Number(value).toFixed(digits));
}

function clamp(value, minimum = -1, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, Number(value) || 0));
}

function compactState(state) {
  if (!state) return null;
  return {
    schema: state.schema,
    state_id: state.state_id,
    created_at: state.created_at,
    temporal_coordinate: state.temporal_coordinate,
    sequence: state.sequence,
    premaq: state.premaq,
    qualia: state.qualia,
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
    history: state.history?.slice(-1) ?? [],
    receipts: state.receipts?.slice(-1) ?? [],
  };
}

function freshEarthCalibration(baseCalibration, year, clock) {
  const multiplier = elaraCodeExpansionMultiplier(year);
  return Object.freeze({
    ...baseCalibration,
    schema: 'hearthgate.earth-prime-annual-premaq-generation/v0.1',
    generated_for_year: year,
    elara_multiplier: multiplier,
    observed_at: clock().toISOString(),
    values: Object.freeze({ ...baseCalibration.values, Q: 0 }),
    qualia: Object.freeze(structuredClone(baseCalibration.qualia ?? null)),
    source_calibration_schema: baseCalibration.schema,
    generation_law: 'fresh Earth Prime P/C/R/E/M/A observation conditions the compression of the preceding release; Qualia remains firsthand context',
  });
}

function annualTargetCalibration(yearPlan, year) {
  return Object.freeze({
    ...yearPlan.target_world.calibration,
    schema: 'hearthgate.target-world-annual-premaq-generation/v0.1',
    generated_for_year: year,
    elara_multiplier: elaraCodeExpansionMultiplier(year),
    values: Object.freeze({ ...yearPlan.target_world.calibration.values, Q: 0 }),
    qualia: Object.freeze(structuredClone(yearPlan.target_world.calibration.qualia ?? null)),
    source_calibration_schema: yearPlan.target_world.calibration.schema,
    generation_law: 'fresh target-world P/C/R/E/M/A conditions the compression of the preceding release; Qualia remains firsthand context',
  });
}

function verifySimpleReceiptChain(sourceStateId, receipts, finalStateId, label) {
  let expected = sourceStateId;
  for (const receipt of receipts) {
    if (receipt?.focus === 'Q') throw new Error(`${label}_QUALIA_DYNAMIC_FORBIDDEN`);
    if (receipt?.from_state_id !== expected) throw new Error(`${label}_FROM_STATE_MISMATCH`);
    expected = receipt.to_state_id;
  }
  if (expected !== finalStateId) throw new Error(`${label}_FINAL_STATE_MISMATCH`);
  return true;
}

function verifyPairedSegment(segment, label) {
  let earth = segment.source_earth_state_id;
  let target = segment.source_target_state_id;
  for (const receipt of segment.cycle_receipts) {
    if (receipt.focus === 'Q') throw new Error(`${label}_QUALIA_DYNAMIC_FORBIDDEN`);
    if (receipt.earth_from_state_id !== earth) throw new Error(`${label}_EARTH_LINEAGE_MISMATCH`);
    if (receipt.target_from_state_id !== target) throw new Error(`${label}_TARGET_LINEAGE_MISMATCH`);
    earth = receipt.earth_to_state_id;
    target = receipt.target_to_state_id;
  }
  if (earth !== segment.final_earth_state_id) throw new Error(`${label}_EARTH_FINAL_MISMATCH`);
  if (target !== segment.final_target_state_id) throw new Error(`${label}_TARGET_FINAL_MISMATCH`);
  return true;
}

function verifyYearPlan(plan, previousYear) {
  verifySimpleReceiptChain(
    plan.earth_prime.solo.source_state_id,
    plan.earth_prime.solo.receipts,
    plan.earth_prime.solo.final_state_id,
    `${plan.year}_EARTH_SOLO`,
  );
  verifySimpleReceiptChain(
    plan.target_world.solo.source_state_id,
    plan.target_world.solo.receipts,
    plan.target_world.solo.final_state_id,
    `${plan.year}_TARGET_SOLO`,
  );
  verifyPairedSegment(plan.segments.base, `${plan.year}_369`);
  verifyPairedSegment(plan.segments.plus3, `${plan.year}_PLUS_3`);
  verifyPairedSegment(plan.segments.plus6, `${plan.year}_PLUS_6`);
  verifyPairedSegment(plan.segments.plus9, `${plan.year}_PLUS_9`);

  if (plan.segments.base.source_earth_state_id !== plan.earth_prime.solo.final_state_id) {
    throw new Error(`${plan.year}_PRIMARY_EARTH_SOURCE_MISMATCH`);
  }
  if (plan.segments.base.source_target_state_id !== plan.target_world.solo.final_state_id) {
    throw new Error(`${plan.year}_PRIMARY_TARGET_SOURCE_MISMATCH`);
  }
  if (plan.segments.plus3.source_earth_state_id !== plan.segments.base.final_earth_state_id) {
    throw new Error(`${plan.year}_PLUS_3_EARTH_SOURCE_MISMATCH`);
  }
  if (plan.segments.plus6.source_earth_state_id !== plan.segments.plus3.final_earth_state_id) {
    throw new Error(`${plan.year}_PLUS_6_EARTH_SOURCE_MISMATCH`);
  }
  if (plan.segments.plus9.source_earth_state_id !== plan.segments.plus6.final_earth_state_id) {
    throw new Error(`${plan.year}_PLUS_9_EARTH_SOURCE_MISMATCH`);
  }
  if (plan.segments.plus3.source_target_state_id !== plan.segments.base.final_target_state_id) {
    throw new Error(`${plan.year}_PLUS_3_TARGET_SOURCE_MISMATCH`);
  }
  if (plan.segments.plus6.source_target_state_id !== plan.segments.plus3.final_target_state_id) {
    throw new Error(`${plan.year}_PLUS_6_TARGET_SOURCE_MISMATCH`);
  }
  if (plan.segments.plus9.source_target_state_id !== plan.segments.plus6.final_target_state_id) {
    throw new Error(`${plan.year}_PLUS_9_TARGET_SOURCE_MISMATCH`);
  }
  if (previousYear) {
    if (plan.earth_prime.solo.source_state_id !== previousYear.final_earth_state_id) {
      throw new Error(`${plan.year}_EARTH_YEAR_CONTINUITY_MISMATCH`);
    }
    if (plan.target_world.solo.source_state_id !== previousYear.final_target_state_id) {
      throw new Error(`${plan.year}_TARGET_YEAR_CONTINUITY_MISMATCH`);
    }
  }
  if (plan.total_cycles_per_shore !== CYCLES_PER_SHORE_PER_YEAR) {
    throw new Error(`${plan.year}_CYCLE_COUNT_INCOMPLETE`);
  }
  return true;
}

function mathematicalSpine(plan) {
  return Object.freeze({
    formalism: 'temporal-compression-release-state-machine',
    recurrence: 'compression → release → compression of the release → release → infinite continuation',
    qualia_dynamic: false,
    earth_source_state_id: plan.earth_prime.solo.source_state_id,
    target_source_state_id: plan.target_world.solo.source_state_id,
    earth_solo_final_state_id: plan.earth_prime.solo.final_state_id,
    target_solo_final_state_id: plan.target_world.solo.final_state_id,
    base_369: Object.freeze({
      cycles: plan.segments.base.cycles,
      earth_from_state_id: plan.segments.base.source_earth_state_id,
      earth_to_state_id: plan.segments.base.final_earth_state_id,
      target_from_state_id: plan.segments.base.source_target_state_id,
      target_to_state_id: plan.segments.base.final_target_state_id,
    }),
    plus_3: Object.freeze({
      cycles: plan.segments.plus3.cycles,
      earth_from_state_id: plan.segments.plus3.source_earth_state_id,
      earth_to_state_id: plan.segments.plus3.final_earth_state_id,
      target_from_state_id: plan.segments.plus3.source_target_state_id,
      target_to_state_id: plan.segments.plus3.final_target_state_id,
    }),
    plus_6: Object.freeze({
      cycles: plan.segments.plus6.cycles,
      earth_from_state_id: plan.segments.plus6.source_earth_state_id,
      earth_to_state_id: plan.segments.plus6.final_earth_state_id,
      target_from_state_id: plan.segments.plus6.source_target_state_id,
      target_to_state_id: plan.segments.plus6.final_target_state_id,
    }),
    plus_9: Object.freeze({
      cycles: plan.segments.plus9.cycles,
      earth_from_state_id: plan.segments.plus9.source_earth_state_id,
      earth_to_state_id: plan.segments.plus9.final_earth_state_id,
      target_from_state_id: plan.segments.plus9.source_target_state_id,
      target_to_state_id: plan.segments.plus9.final_target_state_id,
    }),
    lineage_verified: true,
  });
}

function compactYear(plan, earthCalibration, targetCalibration, earthGeometry, targetGeometry) {
  return Object.freeze({
    schema: 'hearthgate.two-shore-complete-year/v0.1',
    year: plan.year,
    elara_multiplier: plan.elara_multiplier,
    premaq_generation: Object.freeze({
      earth_prime: earthCalibration,
      target_world: targetCalibration,
    }),
    mathematical_state: Object.freeze({
      earth_prime: Object.freeze({
        start_state_id: plan.earth_prime.solo.source_state_id,
        final_state_id: plan.final_earth_state_id,
        start_premaq: earthCalibration.values,
        final_premaq: plan.final_earth_state.premaq,
        qualia: plan.final_earth_state.qualia,
      }),
      target_world: Object.freeze({
        start_state_id: plan.target_world.solo.source_state_id,
        final_state_id: plan.final_target_state_id,
        start_premaq: targetCalibration.values,
        final_premaq: plan.final_target_state.premaq,
        qualia: plan.final_target_state.qualia,
      }),
    }),
    tonal_state: plan.address_tones,
    compression_release_spine: mathematicalSpine(plan),
    deep_groundwire: Object.freeze({
      status: earthCalibration.status,
      browser: earthCalibration.browser,
      groundwire: earthCalibration.groundwire,
      unknowns: earthCalibration.unknowns,
      source_boundary: earthCalibration.source_boundary,
    }),
    geometric_state: Object.freeze({
      earth_prime: earthGeometry,
      target_world: targetGeometry,
      source: BOX_GEOMETRIC_SOURCE,
    }),
    cycle_contract: Object.freeze({
      solo_cycles_per_shore: GATE_SOLO_FOCUS_SEQUENCE.length,
      solo_axes: Object.freeze([...GATE_SOLO_FOCUS_SEQUENCE]),
      context_only_axes: Object.freeze(['Q']),
      base_cycles_per_shore: GATE_BASE_CYCLES,
      extension_cycles: GATE_EXTENSION_CYCLES,
      total_cycles_per_shore: CYCLES_PER_SHORE_PER_YEAR,
    }),
    final_earth_state_id: plan.final_earth_state_id,
    final_target_state_id: plan.final_target_state_id,
    next_operation: 'compression-of-release',
    complete: true,
  });
}

function axisFrequency(yearReceipt, shore, axis) {
  if (axis === GATE_COHERENCE_AXIS) {
    const root = shore === 'earth-prime'
      ? earthPrimeRootHz(yearReceipt.premaq_generation.earth_prime.values)
      : yearReceipt.premaq_generation.target_world.root_hz;
    return foldGatePlaybackFrequency(root * (2 ** (AXIS_INTERVALS.C / 12)));
  }
  const tone = yearReceipt.tonal_state.tones[axis];
  return shore === 'earth-prime'
    ? tone.earth_prime_locked_hz
    : tone.target_world_locked_hz;
}

function axisValue(yearReceipt, shore, axis) {
  const source = shore === 'earth-prime'
    ? yearReceipt.premaq_generation.earth_prime.values
    : yearReceipt.premaq_generation.target_world.values;
  return Number(source[axis]);
}

function makeAudioPlan(years, timing = {}) {
  const soloSeconds = Number(timing.soloSeconds ?? 0.1);
  const baseCycleSeconds = Number(timing.baseCycleSeconds ?? 0.012);
  const extensionCycleSeconds = Number(timing.extensionCycleSeconds ?? 0.018);
  const yearGapSeconds = Number(timing.yearGapSeconds ?? 0.18);
  const events = [];
  const cues = [];
  let cursor = 0;

  function pushEvent(yearReceipt, phase, segment, axis, duration, cycleIndex, shoreMode) {
    if (axis === 'Q') throw new Error('WAV_QUALIA_SONIFICATION_FORBIDDEN');
    const earthHz = axisFrequency(yearReceipt, 'earth-prime', axis);
    const targetHz = axisFrequency(yearReceipt, 'target-world', axis);
    const earthValue = axisValue(yearReceipt, 'earth-prime', axis);
    const targetValue = axisValue(yearReceipt, 'target-world', axis);
    const earthCompression = Math.exp(0.008 + (0.025 * earthValue));
    const targetCompression = Math.exp(0.008 + (0.025 * targetValue));
    const multiplier = yearReceipt.elara_multiplier;
    events.push(Object.freeze({
      year: yearReceipt.year,
      phase,
      segment,
      axis,
      cycle_index: cycleIndex,
      start_seconds: round(cursor, 6),
      duration_seconds: duration,
      shore_mode: shoreMode,
      earth_locked_hz: earthHz,
      target_locked_hz: targetHz,
      earth_compression_hz: foldGatePlaybackFrequency(earthHz * earthCompression),
      earth_release_hz: foldGatePlaybackFrequency(earthHz / earthCompression),
      target_compression_hz: foldGatePlaybackFrequency(targetHz * targetCompression),
      target_release_hz: foldGatePlaybackFrequency(targetHz / targetCompression),
      earth_elara_hz: foldGatePlaybackFrequency(earthHz * multiplier),
      target_elara_hz: foldGatePlaybackFrequency(targetHz * multiplier),
      elara_multiplier: multiplier,
    }));
    cursor += duration;
  }

  for (const yearReceipt of years) {
    cues.push(Object.freeze({
      year: yearReceipt.year,
      start_seconds: round(cursor, 6),
      label: `${yearReceipt.year} · Earth Prime ⇄ ${yearReceipt.premaq_generation.target_world.name}`,
    }));

    SOLO_AXES.forEach((axis, index) => {
      pushEvent(yearReceipt, 'solo', 'earth-prime-dynamic-premaq', axis, soloSeconds, index + 1, 'earth-prime');
    });
    SOLO_AXES.forEach((axis, index) => {
      pushEvent(yearReceipt, 'solo', 'target-world-dynamic-premaq', axis, soloSeconds, index + 1, 'target-world');
    });

    for (let index = 0; index < GATE_BASE_CYCLES; index += 1) {
      const axis = GATE_ADDRESS_FOCUS_SEQUENCE[index % GATE_ADDRESS_FOCUS_SEQUENCE.length];
      pushEvent(yearReceipt, 'paired', '369', axis, baseCycleSeconds, index + 1, 'paired');
    }
    let extensionIndex = 0;
    for (const extension of GATE_EXTENSION_CYCLES) {
      for (let index = 0; index < extension; index += 1) {
        const axis = GATE_ADDRESS_FOCUS_SEQUENCE[(GATE_BASE_CYCLES + extensionIndex) % GATE_ADDRESS_FOCUS_SEQUENCE.length];
        pushEvent(
          yearReceipt,
          'paired-extension',
          `plus-${extension}`,
          axis,
          extensionCycleSeconds,
          index + 1,
          'paired',
        );
        extensionIndex += 1;
      }
    }
    cursor += yearGapSeconds;
  }

  return Object.freeze({
    schema: 'hearthgate.two-shore-eleven-year-audio-plan/v0.1',
    sample_rate: WAV_SAMPLE_RATE,
    channels: 2,
    duration_seconds: round(cursor, 6),
    events: Object.freeze(events),
    cues: Object.freeze(cues),
    year_count: years.length,
    event_count: events.length,
    cycles_per_shore: TOTAL_CYCLES_PER_SHORE,
    dynamic_axes: Object.freeze([...GATE_SOLO_FOCUS_SEQUENCE]),
    context_only_axes: Object.freeze(['Q']),
    qualia_sonified: false,
    locked_carrier_preserved: true,
    audible_elara_code_layer: true,
  });
}

export function buildCompleteElevenYearSequence({
  earthCalibration,
  targetProfile,
  clock = () => new Date(),
  idFactory,
  compressionStrength = 0.65,
  compressionGain = 1.2,
  releaseFraction = 0.35,
  timing,
} = {}) {
  if (!earthCalibration?.values) throw new Error('EARTH_PRIME_CALIBRATION_REQUIRED');
  const target = getWorldProfile(targetProfile?.slug ?? targetProfile);
  const years = [];
  let earthState = null;
  let targetState = null;
  let previousYear = null;

  for (const entry of ELARA_EXPANSION_HORIZON) {
    const annualEarth = freshEarthCalibration(earthCalibration, entry.year, clock);
    const plan = buildYearGatePlan({
      earthCalibration: annualEarth,
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
    verifyYearPlan(plan, previousYear);
    const annualTarget = annualTargetCalibration(plan, entry.year);
    const earthGeometry = generateTwoShoreGeometricForms({
      shoreId: 'earth-prime',
      year: entry.year,
      premaq: annualEarth.values,
      sourceStateId: plan.earth_prime.solo.source_state_id,
      elaraMultiplier: entry.multiplier,
      clock,
    });
    const targetGeometry = generateTwoShoreGeometricForms({
      shoreId: target.slug,
      year: entry.year,
      premaq: annualTarget.values,
      sourceStateId: plan.target_world.solo.source_state_id,
      elaraMultiplier: entry.multiplier,
      clock,
    });
    assertCompleteTwoShoreGeometry(earthGeometry);
    assertCompleteTwoShoreGeometry(targetGeometry);

    const compact = compactYear(plan, annualEarth, annualTarget, earthGeometry, targetGeometry);
    years.push(compact);
    previousYear = compact;
    earthState = compactState(plan.final_earth_state);
    targetState = compactState(plan.final_target_state);
  }

  if (years.length !== 11 || years[0].year !== 2025 || years.at(-1).year !== 2035) {
    throw new Error('ELEVEN_YEAR_SEQUENCE_INCOMPLETE');
  }
  const audioPlan = makeAudioPlan(years, timing);
  const complete = years.every((year) => year.complete)
    && audioPlan.cues.length === 11
    && audioPlan.cycles_per_shore === TOTAL_CYCLES_PER_SHORE
    && audioPlan.qualia_sonified === false;
  if (!complete) throw new Error('ELEVEN_YEAR_COMPLETION_GATE_FAILED');

  return Object.freeze({
    schema: ELEVEN_YEAR_WAV_SCHEMA,
    created_at: clock().toISOString(),
    physical_claim: false,
    target_world: Object.freeze({
      slug: target.slug,
      name: target.name,
      source_repository: target.source_repository,
      source_commit: target.source_commit,
      source_path: target.source_path,
    }),
    year_span: Object.freeze({ start: 2025, end: 2035, labels: 11, interval_years: 10 }),
    elara_formula: 'M(y)=1.15^(y-2025)',
    years: Object.freeze(years),
    audio_plan: audioPlan,
    total_cycles_per_shore: TOTAL_CYCLES_PER_SHORE,
    context_only_axes: Object.freeze(['Q']),
    qualia_sonified: false,
    final_earth_state_id: years.at(-1).final_earth_state_id,
    final_target_state_id: years.at(-1).final_target_state_id,
    geometric_source: BOX_GEOMETRIC_SOURCE,
    complete: true,
    next_operation: 'play-all-eleven-years-then-save-wav',
  });
}

function envelope(position) {
  const attack = 0.12;
  const release = 0.2;
  if (position < attack) return position / attack;
  if (position > 1 - release) return Math.max(0, (1 - position) / release);
  return 1;
}

function waveform(type, phase) {
  if (type === 'triangle') return (2 / Math.PI) * Math.asin(Math.sin(phase));
  return Math.sin(phase);
}

function addTone(left, right, sampleRate, startSeconds, durationSeconds, frequency, amplitude, pan, type) {
  if (!Number.isFinite(frequency) || frequency <= 0 || durationSeconds <= 0) return;
  const start = Math.max(0, Math.floor(startSeconds * sampleRate));
  const count = Math.max(1, Math.floor(durationSeconds * sampleRate));
  const leftGain = Math.cos(((clamp(pan) + 1) * Math.PI) / 4);
  const rightGain = Math.sin(((clamp(pan) + 1) * Math.PI) / 4);
  for (let offset = 0; offset < count && start + offset < left.length; offset += 1) {
    const position = offset / Math.max(1, count - 1);
    const value = waveform(type, TWO_PI * frequency * (offset / sampleRate))
      * amplitude
      * envelope(position);
    left[start + offset] += value * leftGain;
    right[start + offset] += value * rightGain;
  }
}

function renderEvent(event, left, right, sampleRate) {
  const half = event.duration_seconds / 2;
  const start = event.start_seconds;
  const earthActive = event.shore_mode !== 'target-world';
  const targetActive = event.shore_mode !== 'earth-prime';
  if (earthActive) {
    addTone(left, right, sampleRate, start, half, event.earth_compression_hz, 0.085, -0.62, 'sine');
    addTone(left, right, sampleRate, start + half, half, event.earth_release_hz, 0.085, -0.62, 'sine');
    addTone(left, right, sampleRate, start, event.duration_seconds, event.earth_elara_hz, 0.024, -0.24, 'triangle');
  }
  if (targetActive) {
    addTone(left, right, sampleRate, start, half, event.target_compression_hz, 0.075, 0.62, 'triangle');
    addTone(left, right, sampleRate, start + half, half, event.target_release_hz, 0.075, 0.62, 'triangle');
    addTone(left, right, sampleRate, start, event.duration_seconds, event.target_elara_hz, 0.022, 0.24, 'sine');
  }
}

function normalisePcm(left, right, ceiling = 0.82) {
  let peak = 0;
  for (let index = 0; index < left.length; index += 1) {
    peak = Math.max(peak, Math.abs(left[index]), Math.abs(right[index]));
  }
  const scale = peak > ceiling ? ceiling / peak : 1;
  if (scale < 1) {
    for (let index = 0; index < left.length; index += 1) {
      left[index] *= scale;
      right[index] *= scale;
    }
  }
  return { peak_before_normalisation: peak, scale };
}

function writeAscii(view, offset, value) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function encodeLabel(text) {
  const bytes = new TextEncoder().encode(`${text}\0`);
  const padded = bytes.length + (bytes.length % 2);
  return { bytes, padded };
}

function encodeWav(left, right, sampleRate, cues, metadata) {
  const channels = 2;
  const bitsPerSample = 16;
  const blockAlign = channels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const dataSize = left.length * blockAlign;
  const cueChunkSize = 4 + (cues.length * 24);
  const labels = cues.map((cue) => encodeLabel(cue.label));
  const listChunkSize = 4 + labels.reduce((sum, label) => sum + 8 + 4 + label.padded, 0);
  const infoText = encodeLabel(metadata);
  const infoListSize = 4 + 8 + infoText.padded;
  const totalSize = 12
    + 8 + 16
    + 8 + cueChunkSize
    + 8 + listChunkSize
    + 8 + infoListSize
    + 8 + dataSize;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  let offset = 0;

  writeAscii(view, offset, 'RIFF'); offset += 4;
  view.setUint32(offset, totalSize - 8, true); offset += 4;
  writeAscii(view, offset, 'WAVE'); offset += 4;

  writeAscii(view, offset, 'fmt '); offset += 4;
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint16(offset, channels, true); offset += 2;
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, byteRate, true); offset += 4;
  view.setUint16(offset, blockAlign, true); offset += 2;
  view.setUint16(offset, bitsPerSample, true); offset += 2;

  writeAscii(view, offset, 'cue '); offset += 4;
  view.setUint32(offset, cueChunkSize, true); offset += 4;
  view.setUint32(offset, cues.length, true); offset += 4;
  cues.forEach((cue, index) => {
    const identifier = index + 1;
    const sampleOffset = Math.min(left.length - 1, Math.max(0, Math.round(cue.start_seconds * sampleRate)));
    view.setUint32(offset, identifier, true); offset += 4;
    view.setUint32(offset, sampleOffset, true); offset += 4;
    writeAscii(view, offset, 'data'); offset += 4;
    view.setUint32(offset, 0, true); offset += 4;
    view.setUint32(offset, 0, true); offset += 4;
    view.setUint32(offset, sampleOffset, true); offset += 4;
  });

  writeAscii(view, offset, 'LIST'); offset += 4;
  view.setUint32(offset, listChunkSize, true); offset += 4;
  writeAscii(view, offset, 'adtl'); offset += 4;
  labels.forEach((label, index) => {
    writeAscii(view, offset, 'labl'); offset += 4;
    view.setUint32(offset, 4 + label.bytes.length, true); offset += 4;
    view.setUint32(offset, index + 1, true); offset += 4;
    new Uint8Array(buffer, offset, label.bytes.length).set(label.bytes);
    offset += label.padded;
  });

  writeAscii(view, offset, 'LIST'); offset += 4;
  view.setUint32(offset, infoListSize, true); offset += 4;
  writeAscii(view, offset, 'INFO'); offset += 4;
  writeAscii(view, offset, 'ICMT'); offset += 4;
  view.setUint32(offset, infoText.bytes.length, true); offset += 4;
  new Uint8Array(buffer, offset, infoText.bytes.length).set(infoText.bytes);
  offset += infoText.padded;

  writeAscii(view, offset, 'data'); offset += 4;
  view.setUint32(offset, dataSize, true); offset += 4;
  for (let index = 0; index < left.length; index += 1) {
    view.setInt16(offset, Math.round(clamp(left[index]) * 32767), true); offset += 2;
    view.setInt16(offset, Math.round(clamp(right[index]) * 32767), true); offset += 2;
  }
  return new Uint8Array(buffer);
}

export function renderCompleteElevenYearWav(sequence, {
  sampleRate = WAV_SAMPLE_RATE,
} = {}) {
  if (sequence?.schema !== ELEVEN_YEAR_WAV_SCHEMA || sequence?.complete !== true) {
    throw new Error('COMPLETE_ELEVEN_YEAR_SEQUENCE_REQUIRED');
  }
  if (sequence.years.length !== 11 || sequence.audio_plan.cues.length !== 11) {
    throw new Error('WAV_REQUIRES_ALL_ELEVEN_YEARS');
  }
  if (sequence.audio_plan.qualia_sonified !== false) throw new Error('WAV_QUALIA_SONIFICATION_FORBIDDEN');
  const sampleCount = Math.max(1, Math.ceil(sequence.audio_plan.duration_seconds * sampleRate));
  const left = new Float32Array(sampleCount);
  const right = new Float32Array(sampleCount);
  sequence.audio_plan.events.forEach((event) => renderEvent(event, left, right, sampleRate));
  const normalisation = normalisePcm(left, right);
  const metadata = [
    'Hearthgate Bifröst two-shore PREMAQ sequence',
    `Earth Prime ⇄ ${sequence.target_world.name}`,
    'Years 2025–2035, eleven labeled annual compositions',
    'Each year: fresh two-shore P/C/R/E/M/A + geometry + solo sequence + 369 + 3 + 6 + 9',
    'Qualia remains firsthand context and is not sonified',
    'Elara M(y)=1.15^(y-2025) audible code layer; locked carriers preserved',
    'Computational browser-audio model; no external physical claim',
  ].join(' · ');
  const bytes = encodeWav(left, right, sampleRate, sequence.audio_plan.cues, metadata);
  return Object.freeze({
    schema: 'hearthgate.two-shore-wav-render-receipt/v0.1',
    bytes,
    sample_rate: sampleRate,
    channels: 2,
    bits_per_sample: 16,
    sample_count: sampleCount,
    duration_seconds: sequence.audio_plan.duration_seconds,
    cue_count: sequence.audio_plan.cues.length,
    cues: sequence.audio_plan.cues,
    byte_length: bytes.byteLength,
    peak_before_normalisation: round(normalisation.peak_before_normalisation),
    normalisation_scale: round(normalisation.scale),
    qualia_sonified: false,
    complete: true,
  });
}

export function compactElevenYearReceipt(sequence, wavReceipt) {
  return Object.freeze({
    schema: 'hearthgate.two-shore-eleven-year-save-receipt/v0.1',
    created_at: sequence.created_at,
    target_world: sequence.target_world,
    year_span: sequence.year_span,
    years: Object.freeze(sequence.years.map((year) => Object.freeze({
      year: year.year,
      elara_multiplier: year.elara_multiplier,
      earth_start_state_id: year.mathematical_state.earth_prime.start_state_id,
      earth_final_state_id: year.final_earth_state_id,
      target_start_state_id: year.mathematical_state.target_world.start_state_id,
      target_final_state_id: year.final_target_state_id,
      earth_geometry_fingerprint: year.geometric_state.earth_prime.fingerprint,
      target_geometry_fingerprint: year.geometric_state.target_world.fingerprint,
      complete: year.complete,
    }))),
    cycles_per_shore: sequence.total_cycles_per_shore,
    context_only_axes: Object.freeze(['Q']),
    qualia_sonified: false,
    wav: Object.freeze({
      sample_rate: wavReceipt.sample_rate,
      channels: wavReceipt.channels,
      bits_per_sample: wavReceipt.bits_per_sample,
      duration_seconds: wavReceipt.duration_seconds,
      cue_count: wavReceipt.cue_count,
      byte_length: wavReceipt.byte_length,
    }),
    complete: true,
  });
}
