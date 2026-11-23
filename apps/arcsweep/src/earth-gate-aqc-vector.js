export const EARTH_GATE_AQC_VECTOR_SCHEMA = 'hearthgate.earth-gate-aqc-vector/v0.1';
export const EARTH_GATE_AQC_VECTOR_AXES = Object.freeze(['P', 'R', 'E', 'M', 'A']);

const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));
const round6 = (value) => Number(Number(value).toFixed(6));
const finite = (value, fallback = null) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

function closeness(observed, target) {
  const a = finite(observed);
  const b = finite(target);
  if (a === null || b === null || b === 0) return null;
  return clamp01(1 - (Math.abs(a - b) / Math.abs(b)));
}

export class AqcVectorValidationError extends TypeError {
  constructor(issues) {
    super(`Earth Gate AQC vector payload failed validation: ${issues.join('; ')}`);
    this.name = 'AqcVectorValidationError';
    this.code = 'EARTH_GATE_AQC_VECTOR_INVALID';
    this.issues = Object.freeze([...issues]);
  }
}

function requireFinite(payload, key, issues, { min = -Infinity, max = Infinity } = {}) {
  const value = Number(payload[key]);
  if (!Number.isFinite(value)) {
    issues.push(`${key} must be a finite number`);
    return;
  }
  if (value < min || value > max) issues.push(`${key} must be within [${min}, ${max}]`);
}

export function validateAqcVectorPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new AqcVectorValidationError(['payload must be an object']);
  }

  const issues = [];
  const hasPresenceSource = payload.ibi_stability !== undefined
    || (payload.hrv_rmssd_ms !== undefined && payload.hrv_reference_ms !== undefined);
  if (!hasPresenceSource) issues.push('provide ibi_stability or hrv_rmssd_ms + hrv_reference_ms');

  for (const key of [
    'audio_frequency_hz',
    'target_audio_frequency_hz',
    'haptic_cadence_bpm',
    'target_haptic_cadence_bpm',
    'previous_haptic_cadence_bpm',
    'sample_interval_s',
    'heart_rate_bpm',
    'pre_rating',
    'post_rating',
  ]) {
    if (payload[key] === undefined) issues.push(`${key} is required`);
  }

  if (payload.ibi_stability !== undefined) requireFinite(payload, 'ibi_stability', issues, { min: 0, max: 1 });
  if (payload.hrv_rmssd_ms !== undefined) requireFinite(payload, 'hrv_rmssd_ms', issues, { min: 0, max: 1000 });
  if (payload.hrv_reference_ms !== undefined) requireFinite(payload, 'hrv_reference_ms', issues, { min: 0.000001, max: 1000 });
  requireFinite(payload, 'audio_frequency_hz', issues, { min: 0.000001, max: 100000 });
  requireFinite(payload, 'target_audio_frequency_hz', issues, { min: 0.000001, max: 100000 });
  requireFinite(payload, 'haptic_cadence_bpm', issues, { min: 0.000001, max: 1000 });
  requireFinite(payload, 'target_haptic_cadence_bpm', issues, { min: 0.000001, max: 1000 });
  requireFinite(payload, 'previous_haptic_cadence_bpm', issues, { min: 0.000001, max: 1000 });
  requireFinite(payload, 'sample_interval_s', issues, { min: 0.000001, max: 86400 });
  requireFinite(payload, 'heart_rate_bpm', issues, { min: 0.000001, max: 500 });
  requireFinite(payload, 'pre_rating', issues, { min: 1, max: 5 });
  requireFinite(payload, 'post_rating', issues, { min: 1, max: 5 });
  if (payload.attunement_ratio !== undefined) requireFinite(payload, 'attunement_ratio', issues, { min: 0.000001, max: 16 });

  if (issues.length) throw new AqcVectorValidationError(issues);
  return Object.freeze({ valid: true });
}

export function computeAqcVector(payload, { observedAt = null } = {}) {
  validateAqcVectorPayload(payload);

  const presence = payload.ibi_stability !== undefined
    ? clamp01(payload.ibi_stability)
    : clamp01(Number(payload.hrv_rmssd_ms) / Number(payload.hrv_reference_ms));

  const audioLock = closeness(payload.audio_frequency_hz, payload.target_audio_frequency_hz);
  const hapticLock = closeness(payload.haptic_cadence_bpm, payload.target_haptic_cadence_bpm);
  const resonance = clamp01(mean([audioLock, hapticLock]));

  const emotionalDeltaRaw = Number(payload.post_rating) - Number(payload.pre_rating);
  const emotionalDelta = clamp01((emotionalDeltaRaw + 4) / 8);

  const modulationVelocityHzPerSec = Math.abs(
    ((Number(payload.haptic_cadence_bpm) - Number(payload.previous_haptic_cadence_bpm)) / 60)
    / Number(payload.sample_interval_s),
  );
  const modulation = clamp01(modulationVelocityHzPerSec / 0.15);
  const modulationQuality = clamp01(1 - modulation);

  const attunementRatio = finite(payload.attunement_ratio, 1);
  const biologicalTargetCadence = Number(payload.heart_rate_bpm) * attunementRatio;
  const attunement = closeness(payload.haptic_cadence_bpm, biologicalTargetCadence);

  const vector = Object.freeze({
    P: round6(presence),
    R: round6(resonance),
    E: round6(emotionalDelta),
    M: round6(modulation),
    A: round6(attunement),
  });

  const aqc = round6(100 * mean([
    vector.P,
    vector.R,
    vector.E,
    modulationQuality,
    vector.A,
  ]));

  return Object.freeze({
    schema: EARTH_GATE_AQC_VECTOR_SCHEMA,
    model: 'alternate-p-r-e-m-a-aqc',
    status: 'experimental',
    canonical_premaqc: false,
    physical_claim: false,
    medical_claim: false,
    observed_at: observedAt || payload.observed_at || new Date().toISOString(),
    vector_axes: [...EARTH_GATE_AQC_VECTOR_AXES],
    vector,
    evaluation: Object.freeze({
      AQC: aqc,
      target_threshold_percent: 75,
      target_met: aqc >= 75,
      formula: '100 * mean(P, R, E, 1-M, A)',
    }),
    diagnostics: Object.freeze({
      audio_lock: round6(audioLock),
      haptic_lock: round6(hapticLock),
      emotional_delta_raw: emotionalDeltaRaw,
      modulation_velocity_hz_per_sec: round6(modulationVelocityHzPerSec),
      modulation_quality: round6(modulationQuality),
      biological_target_cadence_bpm: round6(biologicalTargetCadence),
      attunement_ratio: round6(attunementRatio),
    }),
    semantics: Object.freeze({
      P: 'Presence / IBI-grounding proxy',
      R: 'Resonance / audio-haptic lock',
      E: 'Emotional delta / firsthand rating change',
      M: 'Modulation / normalized cadence-adjustment velocity',
      A: 'Attunement / haptic-to-biological cadence alignment',
      AQC: 'external composite evaluation metric; not a vector axis',
    }),
  });
}

export function projectAqcVectorReceipt(receipt) {
  return [receipt.vector.P, receipt.vector.R, receipt.vector.A];
}
