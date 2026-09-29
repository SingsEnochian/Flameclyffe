export const MYTHIENCE_EVENT_SCHEMA = 'hearthweave.mythience-event/v0.1';

export const MYTHIENCE_PLANES = Object.freeze([
  'sensing',
  'cognition',
  'possibility',
  'reality',
  'capability',
  'execution',
]);

export const MYTHIENCE_EVIDENCE_CLASSES = Object.freeze([
  'established-science',
  'active-research',
  'speculative-theory',
  'fringe-inspiration',
  'implementation-task',
  'evidence-backed-finding',
  'synthetic-test',
]);

function freezeArray(value) {
  return Object.freeze(Array.isArray(value) ? [...value] : []);
}

export function createMythienceEvent({
  id,
  type,
  sourcePlane,
  sourceRuntime,
  subject,
  occurredAt,
  stateBefore = null,
  stateAfter = null,
  evidenceRefs = [],
  provenance = {},
  uncertainty = 1,
  authorityUsed = 'none',
  continuityRefs = [],
  receiptParent = null,
  evidenceClass = 'implementation-task',
  payload = {},
} = {}) {
  if (!id) throw new Error('mythience-event-id-required');
  if (!type) throw new Error('mythience-event-type-required');
  if (!MYTHIENCE_PLANES.includes(sourcePlane)) throw new Error(`mythience-invalid-plane:${sourcePlane}`);
  if (!sourceRuntime) throw new Error('mythience-source-runtime-required');
  if (!subject) throw new Error('mythience-subject-required');
  if (!MYTHIENCE_EVIDENCE_CLASSES.includes(evidenceClass)) throw new Error(`mythience-invalid-evidence-class:${evidenceClass}`);

  const boundedUncertainty = Number(uncertainty);
  if (!Number.isFinite(boundedUncertainty) || boundedUncertainty < 0 || boundedUncertainty > 1) {
    throw new Error('mythience-uncertainty-out-of-range');
  }

  return Object.freeze({
    schema: MYTHIENCE_EVENT_SCHEMA,
    id,
    type,
    sourcePlane,
    sourceRuntime,
    subject,
    occurredAt: occurredAt || new Date().toISOString(),
    stateBefore,
    stateAfter,
    evidenceRefs: freezeArray(evidenceRefs),
    provenance: Object.freeze({ ...provenance }),
    uncertainty: boundedUncertainty,
    authorityUsed,
    continuityRefs: freezeArray(continuityRefs),
    receiptParent,
    evidenceClass,
    payload: Object.freeze({ ...payload }),
  });
}

export function assertMythienceEvent(event) {
  if (event?.schema !== MYTHIENCE_EVENT_SCHEMA) throw new Error('mythience-event-schema-invalid');
  if (!MYTHIENCE_PLANES.includes(event.sourcePlane)) throw new Error(`mythience-invalid-plane:${event.sourcePlane}`);
  if (!MYTHIENCE_EVIDENCE_CLASSES.includes(event.evidenceClass)) throw new Error(`mythience-invalid-evidence-class:${event.evidenceClass}`);
  return true;
}
