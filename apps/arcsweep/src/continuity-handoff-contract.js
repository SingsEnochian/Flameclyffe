export const MYTHIENCE_BOUNDARY_REF = Object.freeze({
  id: 'mythience-evidence-boundary',
  version: '1.0.0',
});

export const MYTHIENCE_DOMAINS = Object.freeze([
  'formalism',
  'measurement',
  'myth',
  'magic',
]);

export const WORK_BURST_RECEIPT_SCHEMA = 'hearthweave.work-burst-receipt/v1';
export const AGENT_HANDOFF_SCHEMA = 'hearthweave.agent-handoff/v1';

function requiredText(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} is required.`);
  }
  return value.trim();
}

function requiredStamp(value, field) {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new Error(`${field} must be an ISO timestamp.`);
  }
  return value;
}

function namedOwner(owner) {
  if (!owner || !['agent', 'human'].includes(owner.kind)) {
    throw new Error('next_owner must name an agent or human.');
  }
  return Object.freeze({
    kind: owner.kind,
    id: requiredText(owner.id, 'next_owner.id'),
    display_name: requiredText(owner.display_name, 'next_owner.display_name'),
  });
}

export function validateMythienceEvidenceUse({
  sourceDomain,
  claimDomain,
  translationLabel = null,
  sourceRef = null,
} = {}) {
  if (!MYTHIENCE_DOMAINS.includes(sourceDomain) || !MYTHIENCE_DOMAINS.includes(claimDomain)) {
    throw new Error('sourceDomain and claimDomain must name a Mythience domain.');
  }

  if (sourceDomain !== claimDomain && (!translationLabel?.trim() || !sourceRef?.trim())) {
    throw new Error('Cross-domain use requires an explicit translation label and source reference.');
  }

  return Object.freeze({
    allowed: true,
    source_domain: sourceDomain,
    claim_domain: claimDomain,
    translation_label: sourceDomain === claimDomain ? null : translationLabel.trim(),
    source_ref: sourceRef?.trim() || null,
    contract_ref: MYTHIENCE_BOUNDARY_REF,
  });
}

export function createWorkBurstReceipt({
  burstId,
  threadId,
  pickedUpAt,
  pickedUpFromReceipt = null,
  stoppedAt,
  stoppedState,
  nextStep,
  nextOwner,
  sourceReceiptRefs = [],
} = {}) {
  if (!Array.isArray(sourceReceiptRefs)) throw new Error('sourceReceiptRefs must be an array.');
  return Object.freeze({
    schema: WORK_BURST_RECEIPT_SCHEMA,
    burst_id: requiredText(burstId, 'burstId'),
    thread_id: requiredText(threadId, 'threadId'),
    picked_up: Object.freeze({
      at: requiredStamp(pickedUpAt, 'pickedUpAt'),
      from_receipt: pickedUpFromReceipt ? requiredText(pickedUpFromReceipt, 'pickedUpFromReceipt') : null,
    }),
    stopped_at: Object.freeze({
      at: requiredStamp(stoppedAt, 'stoppedAt'),
      state: requiredText(stoppedState, 'stoppedState'),
    }),
    next_step: requiredText(nextStep, 'nextStep'),
    next_owner: namedOwner(nextOwner),
    source_receipt_refs: Object.freeze(sourceReceiptRefs.map((ref) => requiredText(ref, 'sourceReceiptRef'))),
    visibility: 'shared-handoff-metadata',
    authority: Object.freeze({ external_write: false, production_authority: false, canon_promotion: false }),
  });
}

export function createAgentHandoff({
  handoffId,
  from,
  nextOwner,
  summary,
  createdAt,
  sourceReceiptRefs = [],
} = {}) {
  if (!from || !['agent', 'human'].includes(from.kind)) throw new Error('from must name an agent or human.');
  if (!Array.isArray(sourceReceiptRefs)) throw new Error('sourceReceiptRefs must be an array.');
  return Object.freeze({
    schema: AGENT_HANDOFF_SCHEMA,
    handoff_id: requiredText(handoffId, 'handoffId'),
    revision: 1,
    from: Object.freeze({
      kind: from.kind,
      id: requiredText(from.id, 'from.id'),
      display_name: requiredText(from.display_name, 'from.display_name'),
    }),
    next_owner: namedOwner(nextOwner),
    summary: requiredText(summary, 'summary'),
    created_at: requiredStamp(createdAt, 'createdAt'),
    source_receipt_refs: Object.freeze(sourceReceiptRefs.map((ref) => requiredText(ref, 'sourceReceiptRef'))),
    status: 'open',
    acknowledgement: Object.freeze({ status: 'pending', actor: null, at: null }),
    visibility: 'shared-handoff-metadata',
    authority: Object.freeze({ external_write: false, production_authority: false, canon_promotion: false }),
  });
}

// Callers append this new revision; they retain the original open handoff as history.
export function acknowledgeAgentHandoff(handoff, { actorId, acknowledgedAt } = {}) {
  if (handoff?.schema !== AGENT_HANDOFF_SCHEMA) throw new Error('A valid agent handoff is required.');
  const actor = requiredText(actorId, 'actorId');
  if (actor !== handoff.next_owner.id) throw new Error('Only the explicitly named next_owner can acknowledge this handoff.');
  if (handoff.acknowledgement.status === 'acknowledged') {
    if (handoff.acknowledgement.actor === actor) return handoff;
    throw new Error('Handoff acknowledgement is already bound to another actor.');
  }
  return Object.freeze({
    ...handoff,
    revision: handoff.revision + 1,
    supersedes_revision: handoff.revision,
    status: 'acknowledged',
    acknowledgement: Object.freeze({
      status: 'acknowledged',
      actor,
      at: requiredStamp(acknowledgedAt, 'acknowledgedAt'),
    }),
  });
}
