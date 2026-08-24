import { createQualiaRecord, qualiaComponent, qualiaPresenceBit } from './qualia-contract.js';

export const FIELD_AXES = Object.freeze([
  ['P', 'Presence'], ['C', 'Coherence'], ['R', 'Resonance'], ['E', 'Entanglement'],
  ['M', 'Memory'], ['A', 'Agency'], ['Q', 'Qualia report'],
]);

export function isHostedBrowser(location = globalThis.location) {
  if (!location || !['http:', 'https:'].includes(location.protocol)) return false;
  return !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
}

function finite(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function acceptedQualiaAxis(premaqc) {
  if (premaqc?.qualia?.present === true) {
    return {
      value: 1,
      status: 'firsthand-reported',
      provenance: premaqc.qualia.report_receipt_id || premaqc.receipt_id || premaqc.id || null,
      provenanceType: 'firsthand report receipt',
      legacyValue: null,
    };
  }
  const legacy = finite(premaqc?.state?.Q?.value);
  return {
    value: 0,
    status: legacy !== null && ![0, 1].includes(legacy) ? 'legacy-scalar-unresolved' : 'unreported',
    provenance: premaqc?.receipt_id || premaqc?.id || null,
    provenanceType: 'receipt',
    legacyValue: legacy !== null && ![0, 1].includes(legacy) ? legacy : null,
  };
}

export function classifyFieldInstrument({ acceptedPremaqc = null, ambient = null, now = Date.now() } = {}) {
  const generatedAt = ambient?.generated_at || null;
  const generatedMs = generatedAt ? Date.parse(generatedAt) : NaN;
  const ageMs = Number.isFinite(generatedMs) ? Math.max(0, Number(now) - generatedMs) : null;
  const stale = ageMs === null || ageMs > 6 * 60 * 60 * 1000;
  const source = acceptedPremaqc ? 'accepted-feedback' : ambient?.field ? 'ambient-projection' : 'unavailable';
  const axes = Object.fromEntries(FIELD_AXES.map(([axis]) => {
    if (axis === 'Q') {
      if (source !== 'accepted-feedback') return [axis, {
        value: null,
        status: 'unavailable',
        provenance: null,
        provenanceType: null,
        semantics: 'firsthand-report-presence-bit',
      }];
      return [axis, { ...acceptedQualiaAxis(acceptedPremaqc), semantics: 'firsthand-report-presence-bit' }];
    }
    const accepted = finite(acceptedPremaqc?.state?.[axis]?.value);
    const projected = finite(ambient?.field?.[axis]);
    const value = source === 'accepted-feedback' ? accepted : source === 'ambient-projection' ? projected : null;
    return [axis, {
      value,
      status: source === 'accepted-feedback' && value !== null ? 'accepted'
        : source === 'ambient-projection' && value !== null ? 'source-projected'
          : 'unavailable',
      provenance: source === 'accepted-feedback'
        ? acceptedPremaqc.receipt_id || acceptedPremaqc.id || null
        : source === 'ambient-projection' && value !== null ? generatedAt : null,
      provenanceType: source === 'accepted-feedback' && value !== null ? 'receipt'
        : source === 'ambient-projection' && value !== null ? 'source observation'
          : null,
    }];
  }));
  return Object.freeze({ source, axes, generatedAt, ageMs, stale, acceptedPremaqc });
}

export function formatFieldAge(ageMs) {
  if (ageMs === null || ageMs === undefined) return 'age unknown';
  const hours = ageMs / 3600000;
  if (hours < 1) return `${Math.max(0, Math.round(hours * 60))} minutes old`;
  if (hours < 48) return `${Math.round(hours)} hours old`;
  return `${Math.round(hours / 24)} days old`;
}

export function createFieldObservationPremaqc({ worldId, ambient, qualia, narrative = '', priorPremaqc = null, observedAt = new Date().toISOString() } = {}) {
  if (!worldId) throw new Error('Field observation requires a world.');
  const instrument = classifyFieldInstrument({ ambient, now: Date.parse(observedAt) });
  const missing = FIELD_AXES.filter(([axis]) => axis !== 'Q' && instrument.axes[axis].value === null).map(([axis]) => axis);
  if (missing.length) throw new Error(`Live Field evidence is missing ${missing.join(', ')}.`);
  const stamp = String(observedAt).replace(/[^0-9]/g, '').slice(0, 17);
  const receiptId = `observer-field-${worldId}-${stamp}`;
  const qualiaRecord = createQualiaRecord(qualia, { receiptId, observedAt });
  const sequence = Number(priorPremaqc?.sequence || 0) + 1;
  const state = Object.fromEntries(FIELD_AXES.map(([axis]) => {
    if (axis === 'Q') {
      return [axis, qualiaComponent(qualiaRecord, [{
        source_id: receiptId,
        source_kind: 'firsthand-qualia-report',
        observed_at: observedAt,
      }])];
    }
    return [axis, {
      value: instrument.axes[axis].value,
      derivative: 0,
      uncertainty: .12,
      confidence: .78,
      contributors: [{
        source_id: ambient.generated_at,
        source_kind: 'ambient-source-projection',
        observed_at: observedAt,
      }],
    }];
  }));
  return Object.freeze({
    schema_version: '2.0.0', id: `premaqc-${worldId}-field-${sequence}`, observed_at: observedAt,
    registry_version: 'premaqc-registry/1.0', receipt_id: receiptId, sequence,
    prior_state_ref: priorPremaqc?.id || null, model_version: 'arcsweep-field-observer/1.1',
    provenance_refs: [
      `observer-receipt:${receiptId}`,
      `ambient-observation:${ambient.generated_at}`,
      `firsthand-qualia:${receiptId}`,
      ...(priorPremaqc?.receipt_id ? [`prior-premaqc:${priorPremaqc.receipt_id}`] : []),
      ...(String(narrative).trim() ? [`narrative-observation:${receiptId}`] : []),
    ],
    qualia: qualiaRecord,
    state,
    authority: {
      qualia_presence_bit: qualiaPresenceBit(qualiaRecord),
      qualia_is_firsthand_only: true,
      qualia_magnitude_inference_allowed: false,
    },
  });
}
