export const RUNA_PREMAQC_EVIDENCE_SCHEMA = 'hearthgate.runa-premaqc-evidence/v1';
export const RUNA_REALTIME_SENSOR_EVIDENCE_SCHEMA = 'hearthgate.runa-realtime-sensor-evidence/v1';
export const CANONICAL_PREMAQC_AXES = Object.freeze(['P', 'C', 'R', 'E', 'M', 'A', 'Q']);

const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));
const round6 = (value) => Number(Number(value).toFixed(6));
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

function proxyEvidence(value, sourcePath, confidence, note) {
  return Object.freeze({
    status: 'proxy-evidence',
    normalized_value: round6(clamp01(value)),
    source_path: sourcePath,
    confidence: round6(clamp01(confidence)),
    note,
  });
}

function derivedEvidence(value, sourcePaths, confidence, note) {
  return Object.freeze({
    status: 'derived-proxy-evidence',
    normalized_value: round6(clamp01(value)),
    source_paths: Object.freeze([...sourcePaths]),
    confidence: round6(clamp01(confidence)),
    note,
  });
}

function unasserted(reason) {
  return Object.freeze({
    status: 'unasserted',
    normalized_value: null,
    confidence: null,
    reason,
  });
}

function normalizeRunaReceipt(receipt) {
  if (!receipt || typeof receipt !== 'object' || !receipt.vector || !receipt.evaluation) {
    throw new TypeError('Runa evidence adapter requires an experimental vector receipt.');
  }
  if (receipt.canonical_premaqc !== false) {
    throw new TypeError('Runa evidence adapter accepts only non-canonical experimental receipts.');
  }

  const model = String(receipt.model || 'unknown');
  const P = clamp01(receipt.vector.P);
  const R = model === 'alternate-baseline65-attunement'
    ? clamp01(receipt.diagnostics?.resonance_normalized)
    : clamp01(receipt.vector.R);

  return Object.freeze({
    model,
    P,
    R,
    operational: Object.freeze({
      emotional_delta: receipt.vector.E ?? null,
      modulation: receipt.vector.M ?? null,
      attunement: receipt.vector.A ?? null,
      AQC: receipt.evaluation.AQC ?? null,
      aqc_threshold_met: receipt.evaluation.target_met ?? null,
    }),
  });
}

function normalizeSensorObservation(observation, index) {
  if (!observation || typeof observation !== 'object' || Array.isArray(observation)) {
    throw new TypeError(`Sensor observation ${index} must be an object.`);
  }

  const metric = String(observation.metric || '').trim();
  const sourceId = String(observation.source_id || '').trim();
  const observedAt = String(observation.observed_at || '').trim();
  if (!metric) throw new TypeError(`Sensor observation ${index} requires metric.`);
  if (!sourceId) throw new TypeError(`Sensor observation ${index} requires source_id.`);
  if (!observedAt || Number.isNaN(Date.parse(observedAt))) {
    throw new TypeError(`Sensor observation ${index} requires an ISO observed_at timestamp.`);
  }

  const normalizedValue = observation.normalized_value === null || observation.normalized_value === undefined
    ? null
    : Number(observation.normalized_value);
  if (normalizedValue !== null && (!Number.isFinite(normalizedValue) || normalizedValue < 0 || normalizedValue > 1)) {
    throw new RangeError(`Sensor observation ${index} normalized_value must be within [0, 1].`);
  }

  const confidence = observation.confidence === undefined ? 0.5 : Number(observation.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new RangeError(`Sensor observation ${index} confidence must be within [0, 1].`);
  }

  return Object.freeze({
    metric,
    source_id: sourceId,
    observed_at: observedAt,
    raw_value: observation.raw_value ?? null,
    unit: observation.unit ?? null,
    normalized_value: normalizedValue === null ? null : round6(normalizedValue),
    confidence: round6(confidence),
    authority: observation.authority ?? 'instrument',
    provenance_ref: observation.provenance_ref ?? null,
  });
}

/**
 * Packages future realtime sensor observations into an evidence-only envelope.
 * Device-specific normalization happens before this boundary. This layer never
 * invents physiological normalizations from raw sensor values.
 *
 * Direct PREMAQC candidates are intentionally narrow:
 * - presence_grounding -> P proxy candidate
 * - resonance_lock -> R proxy candidate
 * - agency_score -> A candidate only with explicit-user-control authority
 * - qualia_report_present -> Q context flag only with firsthand authority
 *
 * All other observations remain upstream operational evidence.
 */
export function buildRealtimeSensorEvidenceFrame(observations, {
  frameId = null,
  observedAt = null,
} = {}) {
  if (!Array.isArray(observations) || observations.length === 0) {
    throw new TypeError('Realtime sensor evidence requires a non-empty observations array.');
  }

  const normalized = observations.map(normalizeSensorObservation);
  const presence = normalized.filter((item) => item.metric === 'presence_grounding' && item.normalized_value !== null);
  const resonance = normalized.filter((item) => item.metric === 'resonance_lock' && item.normalized_value !== null);
  const agency = normalized.filter((item) => (
    item.metric === 'agency_score'
    && item.normalized_value !== null
    && item.authority === 'explicit-user-control'
  ));
  const qualia = normalized.some((item) => (
    item.metric === 'qualia_report_present'
    && item.authority === 'firsthand'
    && item.raw_value === true
  ));

  const aggregate = (items) => items.length ? round6(mean(items.map((item) => item.normalized_value))) : null;
  const confidence = (items) => items.length ? round6(mean(items.map((item) => item.confidence))) : null;

  return Object.freeze({
    schema: RUNA_REALTIME_SENSOR_EVIDENCE_SCHEMA,
    frame_id: frameId,
    observed_at: observedAt || normalized.map((item) => item.observed_at).sort().at(-1),
    adapter_mode: 'evidence-only',
    canonical_commit: false,
    observations: Object.freeze(normalized),
    candidates: Object.freeze({
      P: presence.length
        ? proxyEvidence(aggregate(presence), 'sensor.presence_grounding', confidence(presence), 'Realtime normalized grounding evidence; candidate only.')
        : unasserted('No normalized presence_grounding evidence supplied.'),
      R: resonance.length
        ? proxyEvidence(aggregate(resonance), 'sensor.resonance_lock', confidence(resonance), 'Realtime normalized resonance evidence; candidate only.')
        : unasserted('No normalized resonance_lock evidence supplied.'),
      E: unasserted('Realtime physiological/interaction sensors do not establish PREMAQC Entanglement.'),
      M: unasserted('Realtime physiological/interaction sensors do not establish PREMAQC Memory.'),
      A: agency.length
        ? proxyEvidence(aggregate(agency), 'sensor.agency_score', confidence(agency), 'Agency candidate accepted only from explicit user-control evidence.')
        : unasserted('Agency requires explicit-user-control evidence; physiological inference is forbidden.'),
      Q: Object.freeze({
        status: 'context-only',
        report_present: qualia,
        inferred: false,
        authority: 'firsthand-only',
      }),
    }),
    semantic_guards: Object.freeze({
      raw_sensor_value_auto_normalization_allowed: false,
      physiological_inference_of_E_M_A_allowed: false,
      qualia_magnitude_inference_allowed: false,
      same_letter_translation_for_E_M_A: false,
    }),
  });
}

/**
 * Converts a Runa physiological/interaction-vector receipt into structured
 * evidence for the canonical PREMAQC adapter.
 *
 * This is intentionally NOT a same-letter axis translation. Only P and R have
 * compatible proxy semantics. C is derived from those two proxies. Runa E/M/A
 * are preserved as upstream operational evidence but are forbidden from
 * silently becoming PREMAQC Entanglement/Memory/Agency.
 */
export function buildRunaPremaqcEvidence(receipt, {
  qualiaReportPresent = false,
  realtimeSensorEvidence = null,
} = {}) {
  const source = normalizeRunaReceipt(receipt);
  const coherenceProxy = mean([source.P, source.R]);

  if (realtimeSensorEvidence !== null && realtimeSensorEvidence?.schema !== RUNA_REALTIME_SENSOR_EVIDENCE_SCHEMA) {
    throw new TypeError('realtimeSensorEvidence must be a Runa realtime sensor evidence frame.');
  }

  return Object.freeze({
    schema: RUNA_PREMAQC_EVIDENCE_SCHEMA,
    source_model: source.model,
    target_vocabulary: 'PREMAQC',
    canonical_premaqc: true,
    adapter_mode: 'evidence-only',
    canonical_commit: false,
    physical_claim: false,
    medical_claim: false,
    canonical_axis_order: [...CANONICAL_PREMAQC_AXES],
    evidence: Object.freeze({
      P: proxyEvidence(
        source.P,
        'runa.vector.P',
        0.55,
        'Runa Presence/Grounding is accepted only as a proxy candidate for PREMAQC Presence.',
      ),
      C: derivedEvidence(
        coherenceProxy,
        ['runa.vector.P', 'runa.vector.R'],
        0.50,
        'Coherence proxy is derived as mean(Presence/Grounding, Resonance).',
      ),
      R: proxyEvidence(
        source.R,
        'runa.vector.R',
        0.65,
        'Runa audio/haptic Resonance is accepted as a proxy candidate for PREMAQC Resonance.',
      ),
      E: unasserted('Runa E means Emotional Delta; PREMAQC E means Entanglement. Same-letter mapping is forbidden.'),
      M: unasserted('Runa M means Modulation; PREMAQC M means Memory. Same-letter mapping is forbidden.'),
      A: unasserted('Runa A means Attunement; PREMAQC A means Agency. Same-letter mapping is forbidden.'),
      Q: Object.freeze({
        status: 'context-only',
        report_present: qualiaReportPresent === true,
        inferred: false,
        authority: 'firsthand-only',
        note: 'Runa telemetry may record that a firsthand report exists; it may not infer a Q magnitude.',
      }),
    }),
    upstream_operational_evidence: source.operational,
    realtime_sensor_evidence: realtimeSensorEvidence,
    semantic_guards: Object.freeze({
      same_letter_translation_for_E_M_A: false,
      aqc_is_premaqc_axis: false,
      qualia_magnitude_inference_allowed: false,
      unsupported_fields_remain_unknown: true,
      realtime_sensor_frame_is_evidence_not_commit: true,
    }),
  });
}
