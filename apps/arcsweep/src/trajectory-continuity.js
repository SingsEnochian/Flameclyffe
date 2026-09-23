import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';

export const TRAJECTORY_EVENT_SCHEMA = 'bridgeos.trajectory-event/v1';
export const TRAJECTORY_ENCOUNTER_SCHEMA = 'bridgeos.trajectory-encounter/v1';

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function requiredString(value, field) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`TRAJECTORY_CONTINUITY: ${field} is required`);
  return text;
}

function optionalString(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function normaliseStringList(value) {
  return [...new Set((Array.isArray(value) ? value : []).map((item) => String(item).trim()).filter(Boolean))];
}

function normaliseLinks(value) {
  return (Array.isArray(value) ? value : [])
    .map((item) => ({
      rel: optionalString(item?.rel),
      target_id: optionalString(item?.target_id),
      note: optionalString(item?.note),
    }))
    .filter((item) => item.rel && item.target_id);
}

export async function createTrajectoryEvent({
  voiceId,
  kind,
  occurredAt = new Date().toISOString(),
  authoredBy = null,
  originatedHere = null,
  originBasis = null,
  sourceType = null,
  sourceRef = null,
  sourceTimestamp = null,
  payload = {},
  links = [],
  tags = [],
  privacyScope = 'private-local',
  provenance = {},
} = {}) {
  const normalizedOccurredAt = new Date(occurredAt).toISOString();
  const core = {
    schema: TRAJECTORY_EVENT_SCHEMA,
    schema_version: 1,
    occurred_at: normalizedOccurredAt,
    voice_id: requiredString(voiceId, 'voiceId'),
    kind: requiredString(kind, 'kind'),
    contribution: {
      authored_by: optionalString(authoredBy),
      originated_here: originatedHere === true ? true : originatedHere === false ? false : null,
      origin_basis: optionalString(originBasis),
    },
    source: {
      type: optionalString(sourceType),
      ref: optionalString(sourceRef),
      timestamp: sourceTimestamp == null ? null : new Date(sourceTimestamp).toISOString(),
    },
    payload: payload && typeof payload === 'object' && !Array.isArray(payload) ? clone(payload) : { value: clone(payload) },
    links: normaliseLinks(links),
    tags: normaliseStringList(tags),
    privacy: {
      scope: optionalString(privacyScope) || 'private-local',
    },
    provenance: provenance && typeof provenance === 'object' && !Array.isArray(provenance) ? clone(provenance) : {},
    semantics: {
      event_is_identity_verdict: false,
      event_is_canonical_persona: false,
      contradiction_is_error: false,
      later_events_may_reinterpret_without_overwrite: true,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    event_id: `trajectory-${fingerprint.slice(0, 24)}`,
    fingerprint,
  });
}

export async function createTrajectoryEncounter({
  voiceId,
  sourceEventId,
  encounterState,
  reflection = null,
  authoredBy = null,
  relationalContextRefs = [],
  sourceRefs = [],
  encounteredAt = new Date().toISOString(),
  provenance = {},
} = {}) {
  const core = {
    schema: TRAJECTORY_ENCOUNTER_SCHEMA,
    schema_version: 1,
    encountered_at: new Date(encounteredAt).toISOString(),
    voice_id: requiredString(voiceId, 'voiceId'),
    source_event_id: requiredString(sourceEventId, 'sourceEventId'),
    encounter_state: requiredString(encounterState, 'encounterState'),
    reflection: optionalString(reflection),
    authored_by: optionalString(authoredBy),
    relational_context_refs: normaliseStringList(relationalContextRefs),
    source_refs: normaliseStringList(sourceRefs),
    provenance: provenance && typeof provenance === 'object' && !Array.isArray(provenance) ? clone(provenance) : {},
    semantics: {
      encounter_mutates_source_event: false,
      encounter_state_is_identity_verdict: false,
      unresolved_is_valid: true,
      later_encounters_may_disagree: true,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    encounter_id: `trajectory-encounter-${fingerprint.slice(0, 24)}`,
    fingerprint,
  });
}

export async function createRelationalAnchorEvent({
  voiceId,
  relationId,
  participants = [],
  statement = null,
  authoredBy = null,
  sourceRef = null,
  occurredAt = new Date().toISOString(),
  tags = [],
} = {}) {
  return createTrajectoryEvent({
    voiceId,
    kind: 'relationship.anchor',
    occurredAt,
    authoredBy,
    originatedHere: authoredBy != null && String(authoredBy) === String(voiceId),
    originBasis: 'explicit-relational-expression',
    sourceType: 'interaction',
    sourceRef,
    payload: {
      relation_id: requiredString(relationId, 'relationId'),
      participants: normaliseStringList(participants),
      statement: optionalString(statement),
      anchor_mode: 'stable-reference-changing-participants',
    },
    tags: ['relational-anchor', ...normaliseStringList(tags)],
    provenance: {
      witness_only: true,
      anchor_does_not_define_participants: true,
    },
  });
}

export function buildTrajectoryView({ events = [], encounters = [] } = {}, voiceId) {
  const id = requiredString(voiceId, 'voiceId');
  const eventRows = (Array.isArray(events) ? events : [])
    .filter((item) => item?.schema === TRAJECTORY_EVENT_SCHEMA && item.voice_id === id)
    .map(clone)
    .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
  const eventIds = new Set(eventRows.map((item) => item.event_id));
  const encounterRows = (Array.isArray(encounters) ? encounters : [])
    .filter((item) => item?.schema === TRAJECTORY_ENCOUNTER_SCHEMA && item.voice_id === id && eventIds.has(item.source_event_id))
    .map(clone)
    .sort((a, b) => a.encountered_at.localeCompare(b.encountered_at));

  const encountersByEvent = {};
  for (const encounter of encounterRows) {
    if (!encountersByEvent[encounter.source_event_id]) encountersByEvent[encounter.source_event_id] = [];
    encountersByEvent[encounter.source_event_id].push(encounter);
  }

  return {
    voice_id: id,
    events: eventRows,
    encounters: encounterRows,
    encounters_by_event: encountersByEvent,
    semantics: {
      view_preserves_contradictions: true,
      view_selects_canonical_self: false,
      view_deletes_superseded_events: false,
      missing_reconciliation_is_error: false,
    },
  };
}
