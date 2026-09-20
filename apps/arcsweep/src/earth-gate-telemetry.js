const MATH_SPINE = 'hearthgate.math-spine/v1.8';
export const EARTH_GATE_TELEMETRY_SCHEMA = 'hearthgate.earth-gate-telemetry/v1';
export const PREMAQC_BEARING_SCHEMA = 'hearthgate.premaqc-bearing/v1';
export const PREMAQC_AXES = Object.freeze(['P', 'C', 'R', 'E', 'M', 'A', 'Q']);
export const PREMAQC_DYNAMIC_AXES = Object.freeze(['P', 'C', 'R', 'E', 'M', 'A']);

const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));
const round6 = (value) => Number(Number(value).toFixed(6));
const finite = (value, fallback = null) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const mean = (values) => {
  const usable = values.filter((value) => Number.isFinite(value));
  if (!usable.length) return null;
  return usable.reduce((sum, value) => sum + value, 0) / usable.length;
};

function closeness(observed, target) {
  const a = finite(observed);
  const b = finite(target);
  if (a === null || b === null || b === 0) return null;
  return clamp01(1 - (Math.abs(a - b) / Math.abs(b)));
}

function rating01(value) {
  const number = finite(value);
  if (number === null) return null;
  return clamp01((number - 1) / 4);
}

function axisEstimate(deltaEstimate, confidence, contributors, note) {
  if (!Number.isFinite(deltaEstimate)) {
    return Object.freeze({
      status: 'unasserted',
      delta_estimate: null,
      confidence: null,
      contributors: [],
      note,
    });
  }
  return Object.freeze({
    status: 'estimated',
    delta_estimate: round6(deltaEstimate),
    confidence: clamp01(confidence),
    contributors: [...contributors],
    note,
  });
}

function unasserted(note) {
  return axisEstimate(null, null, [], note);
}

function buildPremaqcBearing({ presence, coherence, resonance, agencyScore = null, qualiaReportPresent = false }) {
  const centred = (value, scale = 0.2) => Number.isFinite(value) ? (value - 0.5) * scale : null;
  return Object.freeze({
    schema: PREMAQC_BEARING_SCHEMA,
    vocabulary: 'PREMAQC',
    dynamic_axes: [...PREMAQC_DYNAMIC_AXES],
    context_only_axes: ['Q'],
    axes: Object.freeze({
      P: axisEstimate(centred(presence), 0.55, ['presence_grounding'], 'Telemetry proxy only; not a direct measurement of Presence.'),
      C: axisEstimate(centred(coherence), 0.55, ['coherence_index'], 'Telemetry proxy only; not a direct measurement of Coherence.'),
      R: axisEstimate(centred(resonance), 0.65, ['resonance_lock'], 'Audio/haptic lock projection into PREMAQC bearing.'),
      E: unasserted('Entanglement is not inferred from HR/HRV, rating, audio, or haptic telemetry.'),
      M: unasserted('Memory is not inferred from session telemetry without a memory-specific observation.'),
      A: Number.isFinite(agencyScore)
        ? axisEstimate(centred(clamp01(agencyScore)), 0.7, ['agency_score'], 'Agency requires an explicit agency/control measure.')
        : unasserted('Agency remains unknown unless an explicit agency/control measure is supplied.'),
      Q: Object.freeze({
        status: 'context-only',
        report_present: qualiaReportPresent === true,
        value: qualiaReportPresent === true ? 1 : 0,
        derivative: 0,
        inferred: false,
        authority: 'firsthand-only',
      }),
    }),
    authority: Object.freeze({
      qualia_is_firsthand_only: true,
      qualia_magnitude_inference_allowed: false,
      unsupported_or_ungranted_fields_remain_unknown: true,
      canon_commit: false,
      physical_claim: false,
    }),
  });
}

function ra90(payload = {}) {
  const hrv = finite(payload.hrv_rmssd_ms ?? payload.hrv, 50);
  const hrvReference = Math.max(1, finite(payload.hrv_reference_ms, 100));
  const ibiStability = finite(payload.ibi_stability);
  const presenceGrounding = clamp01(ibiStability === null ? hrv / hrvReference : ibiStability);

  const audioFrequency = finite(payload.audio_frequency_hz ?? payload.audio_frequency, 432);
  const targetAudioFrequency = finite(payload.target_audio_frequency_hz, 432);
  const hapticCadence = finite(payload.haptic_cadence_bpm ?? payload.haptic_cadence, 60);
  const targetHapticCadence = finite(payload.target_haptic_cadence_bpm, 60);
  const audioLock = closeness(audioFrequency, targetAudioFrequency);
  const hapticLock = closeness(hapticCadence, targetHapticCadence);
  const resonanceLock = clamp01(mean([audioLock, hapticLock]) ?? 0);
  const coherenceIndex = clamp01(mean([presenceGrounding, resonanceLock]) ?? 0);

  const affectReport = rating01(payload.user_rating);
  const directVelocity = finite(payload.modulation_velocity_hz_per_sec);
  const previousCadence = finite(payload.previous_haptic_cadence_bpm);
  const sampleInterval = finite(payload.sample_interval_s);
  const modulationVelocity = directVelocity !== null
    ? Math.abs(directVelocity)
    : (previousCadence !== null && sampleInterval !== null && sampleInterval > 0
      ? Math.abs((hapticCadence - previousCadence) / 60) / sampleInterval
      : 0);
  const modulationQuality = clamp01(1 - (modulationVelocity / 0.15));
  const adaptiveQuality = clamp01(mean([
    presenceGrounding,
    resonanceLock,
    modulationQuality,
    affectReport,
  ]) ?? 0);

  const qualiaReportPresent = payload.qualia_report_present === true;
  const agencyScore = finite(payload.agency_score);

  return {
    status: 'STABLE',
    archetype: 'RA-90',
    implementation: 'Adaptive Runa Session Controller',
    inputs: {
      hrv_rmssd_ms: hrv,
      hrv_reference_ms: hrvReference,
      ibi_stability: ibiStability,
      audio_frequency_hz: audioFrequency,
      target_audio_frequency_hz: targetAudioFrequency,
      haptic_cadence_bpm: hapticCadence,
      target_haptic_cadence_bpm: targetHapticCadence,
      user_rating: finite(payload.user_rating),
      agency_score: agencyScore,
      qualia_report_present: qualiaReportPresent,
    },
    metrics: {
      presence_grounding: round6(presenceGrounding),
      audio_lock: round6(audioLock ?? 0),
      haptic_lock: round6(hapticLock ?? 0),
      resonance_lock: round6(resonanceLock),
      coherence_index: round6(coherenceIndex),
      affect_report: affectReport === null ? null : round6(affectReport),
      modulation_velocity_hz_per_sec: round6(modulationVelocity),
      adaptive_quality: round6(adaptiveQuality),
    },
    premaqc_bearing: buildPremaqcBearing({
      presence: presenceGrounding,
      coherence: coherenceIndex,
      resonance: resonanceLock,
      agencyScore,
      qualiaReportPresent,
    }),
  };
}

function chronoSpatial(payload = {}) {
  const drift = Math.max(0, finite(payload.observed_drift, 0));
  const frameIndex = Math.max(0, Math.trunc(finite(payload.frame_index, 0)));
  const degradedThreshold = Math.max(0, finite(payload.degraded_threshold, 0.005));
  const topologyThreshold = Math.max(degradedThreshold, finite(payload.topology_threshold, 0.01));
  const continuity = clamp01(1 - drift);
  return {
    status: 'STABLE',
    archetype: 'Chrono-Spatial Matrix Grid',
    implementation: 'Time-Indexed Coordinate Topology & State Graph',
    inputs: {
      observed_drift: drift,
      frame_index: frameIndex,
      degraded_threshold: degradedThreshold,
      topology_threshold: topologyThreshold,
    },
    metrics: {
      frame_continuity_index: round6(continuity),
      drift_vector_divergence: round6(drift),
      topology_changes_detected: drift >= topologyThreshold,
      continuity_band: drift < degradedThreshold ? 'EXCELLENT' : (drift < topologyThreshold ? 'DEGRADED' : 'TOPOLOGY_CHANGE'),
    },
    premaqc_bearing: buildPremaqcBearing({
      presence: null,
      coherence: continuity,
      resonance: null,
      qualiaReportPresent: false,
    }),
  };
}

function stableObject(value) {
  if (Array.isArray(value)) return value.map(stableObject);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableObject(value[key])]));
}

export function canonicalJson(value) {
  return JSON.stringify(stableObject(value));
}

export async function sha256Hex(value) {
  const input = new TextEncoder().encode(typeof value === 'string' ? value : canonicalJson(value));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', input);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function temporalAnchor(payload = {}) {
  const worldId = String(payload.world_id || '').trim();
  const sessionId = String(payload.session_id || '').trim();
  const observedAt = String(payload.observed_at || new Date().toISOString());
  const frameIndex = Math.max(0, Math.trunc(finite(payload.frame_index, 0)));
  if (!worldId || !sessionId) throw new TypeError('Temporal Anchoring Rod requires world_id and session_id.');

  const checkpointPacket = {
    schema: 'hearthgate.temporal-anchor-checkpoint/v1',
    world_id: worldId,
    session_id: sessionId,
    observed_at: observedAt,
    frame_index: frameIndex,
    prior_checkpoint_digest: payload.prior_checkpoint_digest || null,
    state_ref: payload.state_ref || null,
  };
  const checkpointDigest = await sha256Hex(checkpointPacket);

  return {
    status: 'STABLE',
    archetype: 'Temporal Anchoring Rod',
    implementation: 'Deterministic State Checkpoint Engine',
    inputs: checkpointPacket,
    metrics: {
      digest_algorithm: 'SHA-256',
      checkpoint_digest: checkpointDigest,
      deterministic_replay_ready: true,
      reconstruction_fidelity: null,
      replay_verification: 'not-yet-replayed',
    },
    premaqc_bearing: buildPremaqcBearing({
      presence: null,
      coherence: null,
      resonance: null,
      qualiaReportPresent: false,
    }),
  };
}

export async function processEarthGateTelemetry(archetype, payload = {}, { observedAt = null } = {}) {
  let body;
  if (archetype === 'RA-90') body = ra90(payload);
  else if (archetype === 'Temporal Anchoring Rod') body = await temporalAnchor(payload);
  else if (archetype === 'Chrono-Spatial Matrix Grid') body = chronoSpatial(payload);
  else throw new RangeError(`Unknown Earth Gate telemetry archetype: ${archetype}`);

  return Object.freeze({
    schema: EARTH_GATE_TELEMETRY_SCHEMA,
    math_spine: MATH_SPINE,
    observed_at: observedAt || payload.observed_at || new Date().toISOString(),
    calibration_status: 'experimental',
    physical_claim: false,
    medical_claim: false,
    ...body,
  });
}

export function projectEarthGateReceipt(receipt) {
  if (receipt?.archetype === 'RA-90') {
    return [
      receipt.metrics.presence_grounding,
      receipt.metrics.coherence_index,
      receipt.metrics.resonance_lock,
    ];
  }
  if (receipt?.archetype === 'Chrono-Spatial Matrix Grid') {
    return [
      receipt.metrics.frame_continuity_index,
      receipt.metrics.drift_vector_divergence,
      receipt.metrics.topology_changes_detected ? 1 : 0,
    ];
  }
  if (receipt?.archetype === 'Temporal Anchoring Rod') {
    return [
      receipt.inputs.frame_index,
      receipt.metrics.deterministic_replay_ready ? 1 : 0,
      0,
    ];
  }
  return [0, 0, 0];
}
