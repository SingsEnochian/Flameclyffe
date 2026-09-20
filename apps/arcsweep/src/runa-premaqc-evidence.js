export const RUNA_PREMAQC_EVIDENCE_SCHEMA = 'hearthgate.runa-premaqc-evidence/v1';
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
} = {}) {
  const source = normalizeRunaReceipt(receipt);
  const coherenceProxy = mean([source.P, source.R]);

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
    semantic_guards: Object.freeze({
      same_letter_translation_for_E_M_A: false,
      aqc_is_premaqc_axis: false,
      qualia_magnitude_inference_allowed: false,
      unsupported_fields_remain_unknown: true,
    }),
  });
}
