import { clamp01 } from './signal-contract.js';

export const OBSERVER_IGNITION_OBSERVATION_SCHEMA = 'arcsweep.observer-ignition-observation/v0.1';

function finite01(value) {
  const number = Number(value);
  return Number.isFinite(number) ? clamp01(number) : null;
}

function cleanArray(value) {
  return Object.freeze(Array.isArray(value) ? structuredClone(value) : []);
}

export function adaptObserverEvent(payload, {
  id = null,
  relevance = null,
  coherence = null,
  uncertainty = null,
  contradicted = null,
  source = 'observer/deep',
} = {}) {
  if (!payload || typeof payload !== 'object') throw new Error('observer-payload-required');

  const field = payload.field && typeof payload.field === 'object' ? payload.field : {};
  const rawField = payload.raw_field ?? payload.rawField ?? null;
  const transformations = payload.transformation_receipts ?? payload.transformationReceipts ?? [];
  const contradictions = payload.contradictions ?? payload.conflicts ?? [];
  const explicitRelevance = finite01(relevance ?? payload.relevance);
  const explicitCoherence = finite01(coherence ?? payload.coherence);
  const explicitUncertainty = finite01(uncertainty ?? payload.uncertainty);

  const mappedRelevance = explicitRelevance ?? finite01(field.R) ?? 0;
  const mappedCoherence = explicitCoherence ?? finite01(field.C);
  const mappedUncertainty = explicitUncertainty;
  const isContradicted = contradicted == null
    ? payload.contradicted === true || (Array.isArray(contradictions) && contradictions.length > 0)
    : contradicted === true;

  const observationId = id
    || payload.observation_id
    || payload.receipt_id
    || payload.id
    || `${source}:${payload.generated_at || payload.observed_at || 'unidentified'}`;

  return Object.freeze({
    schema: OBSERVER_IGNITION_OBSERVATION_SCHEMA,
    id: String(observationId),
    type: 'observer-evidence',
    source: String(source),
    relevance: mappedRelevance,
    coherence: mappedCoherence,
    uncertainty: mappedUncertainty,
    contradicted: isContradicted,
    occurredAt: payload.generated_at || payload.observed_at || payload.occurred_at || null,
    field: Object.freeze(structuredClone(field)),
    rawField: rawField == null ? null : structuredClone(rawField),
    transformations: cleanArray(transformations),
    contradictions: cleanArray(contradictions),
    provenance: Object.freeze(structuredClone(payload.provenance || {})),
    mapping: Object.freeze({
      relevance: explicitRelevance != null ? 'explicit' : (finite01(field.R) != null ? 'field.R' : 'absent->0'),
      coherence: explicitCoherence != null ? 'explicit' : (finite01(field.C) != null ? 'field.C' : 'unmodified'),
      uncertainty: explicitUncertainty != null ? 'explicit' : 'unmodified',
      rawPreserved: rawField != null,
      transformationsPreserved: Array.isArray(transformations),
      measurementClaim: false,
    }),
  });
}
