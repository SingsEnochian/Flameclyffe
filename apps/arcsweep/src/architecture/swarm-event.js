export const SWARM_EVENT_SCHEMA = 'arcsweep.swarm-event/v0.1';

export const SWARM_STAGES = Object.freeze([
  'relate',
  'understand',
  'reason',
  'act',
  'reflect',
  'repair',
  'grow',
  'teach',
]);

export const EPISTEMIC_MODES = Object.freeze([
  'observed',
  'inferred',
  'modelled',
  'interpreted',
  'reported',
  'remembered',
  'imagined',
  'unknown',
  'contradicted',
  'chosen',
]);

export const SWARM_EVENT_KINDS = Object.freeze([
  'message',
  'observation',
  'interpretation',
  'proposal',
  'dissent',
  'capability-request',
  'capability-decision',
  'execution-receipt',
  'reflection',
  'repair',
  'lesson',
]);

function freezeArray(value) {
  return Object.freeze([...(Array.isArray(value) ? value : [])]);
}

function freezeRecord(value) {
  return Object.freeze({ ...(value && typeof value === 'object' ? value : {}) });
}

function iso(now) {
  const value = typeof now === 'function' ? now() : new Date();
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function createSwarmEvent({
  id,
  traceId,
  conversationId,
  participant,
  stage,
  kind,
  mode = 'general',
  body = null,
  epistemicMode = 'unknown',
  parentEventIds = [],
  evidenceRefs = [],
  stateRefs = [],
  claims = [],
  alternatives = [],
  authority = null,
  receipt = null,
  metadata = {},
} = {}, { now = () => new Date() } = {}) {
  if (!id) throw new Error('swarm-event-id-required');
  if (!traceId) throw new Error('swarm-event-trace-required');
  if (!conversationId) throw new Error('swarm-event-conversation-required');
  if (!participant?.id) throw new Error('swarm-event-participant-required');
  if (!SWARM_STAGES.includes(stage)) throw new Error(`swarm-event-stage-invalid:${stage}`);
  if (!SWARM_EVENT_KINDS.includes(kind)) throw new Error(`swarm-event-kind-invalid:${kind}`);
  if (!EPISTEMIC_MODES.includes(epistemicMode)) throw new Error(`swarm-event-epistemic-mode-invalid:${epistemicMode}`);
  if (!['general', 'action', 'roleplay'].includes(mode)) throw new Error(`swarm-event-mode-invalid:${mode}`);

  return Object.freeze({
    schema: SWARM_EVENT_SCHEMA,
    id: String(id),
    traceId: String(traceId),
    conversationId: String(conversationId),
    participant: Object.freeze({
      id: String(participant.id),
      kind: String(participant.kind || 'agent'),
      model: participant.model ? String(participant.model) : null,
      version: participant.version ? String(participant.version) : null,
    }),
    stage,
    kind,
    mode,
    body,
    epistemicMode,
    parentEventIds: freezeArray(parentEventIds).map(String),
    evidenceRefs: freezeArray(evidenceRefs).map(String),
    stateRefs: freezeArray(stateRefs).map(String),
    claims: freezeArray(claims),
    alternatives: freezeArray(alternatives),
    authority: authority ? freezeRecord(authority) : null,
    receipt: receipt ? freezeRecord(receipt) : null,
    metadata: freezeRecord(metadata),
    occurredAt: iso(now),
  });
}

export function validateSwarmTrace(events = []) {
  const violations = [];
  const seen = new Set();
  let previousStageIndex = -1;

  for (const event of events) {
    if (!event || event.schema !== SWARM_EVENT_SCHEMA) {
      violations.push('event-schema-invalid');
      continue;
    }
    if (seen.has(event.id)) violations.push(`duplicate-event:${event.id}`);
    seen.add(event.id);

    const stageIndex = SWARM_STAGES.indexOf(event.stage);
    if (stageIndex < previousStageIndex && event.stage !== 'repair') {
      violations.push(`stage-regression:${event.id}:${event.stage}`);
    }
    previousStageIndex = Math.max(previousStageIndex, stageIndex);

    for (const parentId of event.parentEventIds || []) {
      if (!seen.has(parentId)) violations.push(`missing-parent:${event.id}:${parentId}`);
    }

    if (event.kind === 'execution-receipt' && !event.receipt) {
      violations.push(`receipt-missing:${event.id}`);
    }
    if (event.kind === 'capability-decision' && !event.authority) {
      violations.push(`authority-decision-missing:${event.id}`);
    }
  }

  return Object.freeze({ valid: violations.length === 0, violations: Object.freeze(violations) });
}

export function redactSwarmTrace(events = [], {
  privateMetadataKeys = ['privateLocator', 'rawSource', 'secret', 'token'],
} = {}) {
  const blocked = new Set(privateMetadataKeys);
  return Object.freeze(events.map((event) => {
    const metadata = Object.fromEntries(
      Object.entries(event.metadata || {}).filter(([key]) => !blocked.has(key)),
    );
    return Object.freeze({
      ...event,
      metadata: Object.freeze(metadata),
    });
  }));
}
