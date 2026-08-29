export const GLOBAL_STRUCTURE_DESCRIPTOR_SCHEMA = 'arcsweep.global-structure-descriptor/v1';
export const EPISTEMIC_PROJECTION_SCHEMA = 'arcsweep.epistemic-projection/v1';
export const EFFECT_RECEIPT_SCHEMA = 'arcsweep.effect-receipt/v1';
export const INTERPRETATION_REVISION_SCHEMA = 'arcsweep.interpretation-revision/v1';
export const DISCLOSURE_RECEIPT_SCHEMA = 'arcsweep.disclosure-receipt/v1';

export const EPISTEMIC_STATES = Object.freeze([
  'known',
  'preserved_unresolved',
  'withheld',
  'uncomputed',
  'unmaterialized',
  'externally_pending',
  'resource_bounded',
]);

export const MECHANISM_STATES = Object.freeze([
  'unknown',
  'candidate',
  'contested',
  'supported',
  'rejected',
]);

export const WILD_CONTEXT_FIELDS = Object.freeze([
  'world_state',
  'history',
  'participants',
  'participant_knowledge',
  'capabilities',
  'relationships',
  'agency_boundaries',
  'constraints',
  'reachable_possibilities',
  'memory_active_context',
  'orientation',
  'provenance',
]);

const WILD_CONTROL_FIELDS = new Set([
  'evaluation',
  'evaluator',
  'score',
  'scoring',
  'flattening',
  'flattening_labels',
  'spiral',
  'premaqc',
  'condition_identity',
  'hypothesis',
  'desired_outcome',
  'target_transition',
  'semantic_conclusion',
  'surprise_target',
]);

const clean = (value, max = 8000) => String(value ?? '').trim().slice(0, max);
const list = (value, max = 200) => [...new Set((Array.isArray(value) ? value : []).map((item) => clean(item, 2000)).filter(Boolean))].slice(0, max);

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function required(value, name, max = 8000) {
  const result = clean(value, max);
  if (!result) throw new Error(`${name} is required.`);
  return result;
}

function oneOf(value, allowed, name) {
  if (!allowed.includes(value)) throw new Error(`${name} is unsupported.`);
  return value;
}

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

async function sha256(value) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value)));
  return `sha256:${bytesToHex(digest)}`;
}

function defaultId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function createGlobalStructureDescriptor({
  scopeId,
  structureRef,
  topology = 'path-space',
  timelineFamilyRef = null,
  relationRef = null,
  lawRefs = [],
  provenance = [],
} = {}, {
  clock = () => new Date(),
  idFactory = defaultId,
} = {}) {
  const descriptor = {
    schema: GLOBAL_STRUCTURE_DESCRIPTOR_SCHEMA,
    descriptor_id: `global-structure-${idFactory()}`,
    created_at: clock().toISOString(),
    scope_id: required(scopeId, 'scopeId', 1000),
    structure_ref: required(structureRef, 'structureRef', 2000),
    topology: required(topology, 'topology', 500),
    timeline_family_ref: clean(timelineFamilyRef, 2000) || null,
    relation_ref: clean(relationRef, 2000) || null,
    law_refs: list(lawRefs, 200),
    provenance: list(provenance, 200),
    authority: {
      structural_completeness_relative_to_scope: true,
      epistemic_state_embedded: false,
      requires_timeline_enumeration: false,
      observer_projection: false,
    },
  };
  descriptor.descriptor_fingerprint = await sha256(JSON.stringify(descriptor));
  return deepFreeze(descriptor);
}

export async function createEpistemicProjection({
  globalStructure,
  knowerId,
  localSliceRef = null,
  epistemicState = 'known',
  visibleRefs = [],
  withheldRefs = [],
  reason = null,
  provenance = [],
} = {}, {
  clock = () => new Date(),
  idFactory = defaultId,
} = {}) {
  if (globalStructure?.schema !== GLOBAL_STRUCTURE_DESCRIPTOR_SCHEMA) {
    throw new Error('A valid global structure descriptor is required.');
  }
  oneOf(epistemicState, EPISTEMIC_STATES, 'epistemic state');
  const projection = {
    schema: EPISTEMIC_PROJECTION_SCHEMA,
    projection_id: `epistemic-projection-${idFactory()}`,
    created_at: clock().toISOString(),
    global_structure_ref: globalStructure.descriptor_id,
    global_structure_fingerprint: globalStructure.descriptor_fingerprint,
    knower_id: required(knowerId, 'knowerId', 1000),
    local_slice_ref: clean(localSliceRef, 2000) || null,
    epistemic_state: epistemicState,
    visible_refs: list(visibleRefs, 400),
    withheld_refs: list(withheldRefs, 400),
    reason: clean(reason, 4000) || null,
    provenance: list(provenance, 200),
    authority: {
      scoped_to_knower: true,
      does_not_mutate_global_structure: true,
      preserved_unresolved_is_epistemic_only: epistemicState === 'preserved_unresolved',
    },
  };
  projection.projection_fingerprint = await sha256(JSON.stringify(projection));
  return deepFreeze(projection);
}

export async function createEffectReceipt({
  observerId,
  contextRef,
  observedEffect,
  confidence = 'reported',
  provenance = [],
} = {}, {
  clock = () => new Date(),
  idFactory = defaultId,
} = {}) {
  const receipt = {
    schema: EFFECT_RECEIPT_SCHEMA,
    receipt_id: `effect-receipt-${idFactory()}`,
    observed_at: clock().toISOString(),
    observer_id: required(observerId, 'observerId', 1000),
    context_ref: required(contextRef, 'contextRef', 2000),
    observed_effect: required(observedEffect, 'observedEffect', 16000),
    confidence: clean(confidence, 500) || 'reported',
    provenance: list(provenance, 300),
    authority: {
      append_only_observation: true,
      mechanism_adjudicated_here: false,
      interpretation_embedded: false,
    },
  };
  receipt.receipt_fingerprint = await sha256(JSON.stringify(receipt));
  return deepFreeze(receipt);
}

export async function createInterpretationRevision({
  effectReceipt,
  reviewerId,
  interpretation,
  mechanismStatus = 'unknown',
  candidateMechanisms = [],
  confidence = 'unrated',
  supersedesRevisionRef = null,
  provenance = [],
} = {}, {
  clock = () => new Date(),
  idFactory = defaultId,
} = {}) {
  if (effectReceipt?.schema !== EFFECT_RECEIPT_SCHEMA) throw new Error('A valid Effect Receipt is required.');
  oneOf(mechanismStatus, MECHANISM_STATES, 'mechanism status');
  const revision = {
    schema: INTERPRETATION_REVISION_SCHEMA,
    revision_id: `interpretation-revision-${idFactory()}`,
    created_at: clock().toISOString(),
    effect_receipt_ref: effectReceipt.receipt_id,
    effect_receipt_fingerprint: effectReceipt.receipt_fingerprint,
    reviewer_id: required(reviewerId, 'reviewerId', 1000),
    interpretation: required(interpretation, 'interpretation', 16000),
    mechanism_status: mechanismStatus,
    candidate_mechanisms: list(candidateMechanisms, 100),
    confidence: clean(confidence, 500) || 'unrated',
    supersedes_revision_ref: clean(supersedesRevisionRef, 2000) || null,
    provenance: list(provenance, 300),
    authority: {
      may_revise_interpretation: true,
      may_revise_mechanism_status: true,
      may_mutate_observed_effect: false,
    },
  };
  revision.revision_fingerprint = await sha256(JSON.stringify(revision));
  return deepFreeze(revision);
}

export async function createDisclosureReceipt({
  globalStructure,
  fromProjectionRef = null,
  toParticipantId,
  disclosedRefs = [],
  authorityReceiptRefs = [],
  rationale = null,
  provenance = [],
} = {}, {
  clock = () => new Date(),
  idFactory = defaultId,
} = {}) {
  if (globalStructure?.schema !== GLOBAL_STRUCTURE_DESCRIPTOR_SCHEMA) {
    throw new Error('A valid global structure descriptor is required.');
  }
  if (!Array.isArray(disclosedRefs) || !disclosedRefs.length) throw new Error('disclosedRefs is required.');
  const receipt = {
    schema: DISCLOSURE_RECEIPT_SCHEMA,
    receipt_id: `disclosure-receipt-${idFactory()}`,
    created_at: clock().toISOString(),
    global_structure_ref: globalStructure.descriptor_id,
    from_projection_ref: clean(fromProjectionRef, 2000) || null,
    to_participant_id: required(toParticipantId, 'toParticipantId', 1000),
    disclosed_refs: list(disclosedRefs, 400),
    authority_receipt_refs: list(authorityReceiptRefs, 200),
    rationale: clean(rationale, 4000) || null,
    provenance: list(provenance, 300),
    authority: {
      disclosure_is_causal_input: true,
      global_structure_rewritten: false,
      participant_projection_may_change: true,
    },
  };
  receipt.receipt_fingerprint = await sha256(JSON.stringify(receipt));
  return deepFreeze(receipt);
}

export function compileWildGenerationContext(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('wild_context is required.');
  const keys = Object.keys(raw);
  const unsupported = keys.filter((key) => !WILD_CONTEXT_FIELDS.includes(key));
  const control = unsupported.filter((key) => WILD_CONTROL_FIELDS.has(key));
  if (control.length) throw new Error(`WILD context forbids evaluator/control fields: ${control.join(', ')}.`);
  if (unsupported.length) throw new Error(`Unsupported WILD context field: ${unsupported.join(', ')}.`);

  const context = {
    world_state: required(raw.world_state, 'wild_context.world_state', 24000),
    history: list(raw.history, 240),
    participants: list(raw.participants, 100),
    participant_knowledge: list(raw.participant_knowledge, 240),
    capabilities: list(raw.capabilities, 160),
    relationships: list(raw.relationships, 160),
    agency_boundaries: list(raw.agency_boundaries, 160),
    constraints: list(raw.constraints, 240),
    reachable_possibilities: list(raw.reachable_possibilities, 240),
    memory_active_context: list(raw.memory_active_context, 240),
    orientation: clean(raw.orientation, 4000) || 'Continue from the lived scene state.',
    provenance: list(raw.provenance, 300),
  };
  return deepFreeze(context);
}
