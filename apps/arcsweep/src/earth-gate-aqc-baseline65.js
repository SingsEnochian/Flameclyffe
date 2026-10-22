export const EARTH_GATE_AQC_BASELINE65_SCHEMA = 'hearthgate.earth-gate-aqc-baseline65/v0.1';

const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));
const round6 = (value) => Number(Number(value).toFixed(6));

export function calculateBaseline65Attunement(heartRateBpm, hrvRmssdMs) {
  const heartRate = Number(heartRateBpm);
  const hrv = Number(hrvRmssdMs);
  if (!Number.isFinite(heartRate) || heartRate <= 0) {
    throw new TypeError('heartRateBpm must be a finite positive number');
  }
  if (!Number.isFinite(hrv) || hrv < 0) {
    throw new TypeError('hrvRmssdMs must be a finite non-negative number');
  }

  const driftFromBaseline = Math.abs(heartRate - 65);
  const normalizedPenalty = driftFromBaseline / 135;
  const heartRateEfficiency = clamp01(1 - normalizedPenalty);
  const hrvScale = clamp01(hrv / 100);
  return round6(clamp01(hrvScale * heartRateEfficiency));
}

export function computeBaseline65Aqc(payload, { observedAt = null } = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TypeError('Baseline-65 AQC payload must be an object');
  }

  const heartRate = Number(payload.heart_rate_bpm ?? payload.heartRate);
  const hrv = Number(payload.hrv_rmssd_ms ?? payload.hrv);
  const resonanceRaw = Number(payload.resonance);
  const emotionalDelta = Number(payload.emotional_delta ?? payload.emotionalDelta);
  const modulationVelocity = Number(payload.modulation_velocity ?? payload.modulationVelocity);

  const missing = [];
  if (!Number.isFinite(heartRate)) missing.push('heart_rate_bpm/heartRate');
  if (!Number.isFinite(hrv)) missing.push('hrv_rmssd_ms/hrv');
  if (!Number.isFinite(resonanceRaw)) missing.push('resonance');
  if (!Number.isFinite(emotionalDelta)) missing.push('emotional_delta/emotionalDelta');
  if (!Number.isFinite(modulationVelocity)) missing.push('modulation_velocity/modulationVelocity');
  if (missing.length) throw new TypeError(`Missing or invalid telemetry: ${missing.join(', ')}`);

  // These are structural test bounds, not physiological safety limits.
  if (heartRate <= 0 || heartRate > 500) throw new RangeError('heart_rate_bpm must be within (0, 500] for this experiment');
  if (hrv < 0 || hrv > 1000) throw new RangeError('hrv_rmssd_ms must be within [0, 1000] for this experiment');
  if (emotionalDelta < 1 || emotionalDelta > 5) throw new RangeError('emotional_delta must be within [1, 5]');
  if (modulationVelocity < 0) throw new RangeError('modulation_velocity must be non-negative');

  const attunement = calculateBaseline65Attunement(heartRate, hrv);
  const presence = round6(clamp01(hrv / 120));
  const resonance = round6(clamp01(resonanceRaw / 4));
  const aqc = round6(clamp01(
    (presence * 0.25)
    + (attunement * 0.45)
    + (resonance * 0.30),
  ) * 100);

  return Object.freeze({
    schema: EARTH_GATE_AQC_BASELINE65_SCHEMA,
    model: 'alternate-baseline65-attunement',
    status: 'experimental',
    canonical_premaqc: false,
    physical_claim: false,
    medical_claim: false,
    observed_at: observedAt || payload.observed_at || new Date().toISOString(),
    vector: Object.freeze({
      P: presence,
      R: resonanceRaw,
      E: emotionalDelta,
      M: modulationVelocity,
      A: attunement,
    }),
    evaluation: Object.freeze({
      AQC: aqc,
      target_threshold_percent: 75,
      target_met: aqc >= 75,
      formula: '100 * (0.25*P + 0.45*A + 0.30*R_normalized)',
    }),
    diagnostics: Object.freeze({
      heart_rate_bpm: heartRate,
      hrv_rmssd_ms: hrv,
      baseline_bpm: 65,
      drift_scale_bpm: 135,
      resonance_normalized: resonance,
    }),
  });
}

export function processBaseline65Batch(sessions = []) {
  if (!Array.isArray(sessions)) throw new TypeError('sessions must be an array');

  const receipts = [];
  const blocked = [];
  sessions.forEach((session, index) => {
    const id = String(session?.id ?? `session-${index + 1}`);
    try {
      receipts.push(Object.freeze({ id, receipt: computeBaseline65Aqc(session?.metrics ?? session) }));
    } catch (error) {
      blocked.push(Object.freeze({
        id,
        error: Object.freeze({
          name: error instanceof Error ? error.name : 'Error',
          message: error instanceof Error ? error.message : String(error),
        }),
      }));
    }
  });

  return Object.freeze({
    schema: 'hearthgate.earth-gate-aqc-batch-receipt/v0.1',
    processed: receipts.length,
    blocked: blocked.length,
    receipts: Object.freeze(receipts),
    blocked_sessions: Object.freeze(blocked),
  });
}
