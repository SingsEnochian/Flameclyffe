export const RELATIONAL_FIELD_SCHEMA = 'arcsweep.relational-field/v0.1';
export const RELATIONAL_FIELD_EVENT_SCHEMA = 'arcsweep.relational-field-event/v0.1';

const clone = (value) => value == null ? value : structuredClone(value);
const text = (value) => String(value ?? '').trim();

const unique = (values) => [...new Set(values.map(text).filter(Boolean))];

function assertParticipantSet(participantIds) {
  const participants = unique(Array.isArray(participantIds) ? participantIds : []);
  if (participants.length < 2) {
    throw new TypeError('Relational fields require at least two distinct participants.');
  }
  return participants;
}

export function createRelationalField({
  relationId,
  participantIds,
  environmentId = null,
  kind = 'relationship',
  state = {},
  historyRefs = [],
  provenance = {},
  createdAt = null,
} = {}) {
  const id = text(relationId);
  if (!id) throw new TypeError('relationId is required.');

  const participants = assertParticipantSet(participantIds);
  if (participants.includes(id)) {
    throw new TypeError('A relation must remain distinct from every participant identity.');
  }

  return Object.freeze({
    schema: RELATIONAL_FIELD_SCHEMA,
    relation_id: id,
    kind: text(kind) || 'relationship',
    participant_ids: Object.freeze(participants),
    environment_id: text(environmentId) || null,
    revision: 0,
    state: clone(state) ?? {},
    history_refs: Object.freeze(unique(Array.isArray(historyRefs) ? historyRefs : [])),
    provenance: clone(provenance) ?? {},
    created_at: createdAt ?? null,
    updated_at: createdAt ?? null,
    last_event: null,
  });
}

export function applyRelationalFieldEvent(field, event = {}) {
  if (!field || field.schema !== RELATIONAL_FIELD_SCHEMA) {
    throw new TypeError('A valid relational field is required.');
  }

  const eventId = text(event.eventId ?? event.event_id);
  if (!eventId) throw new TypeError('eventId is required.');

  const nextState = event.nextState ?? event.next_state;
  const patch = event.patch;
  const previousState = clone(field.state) ?? {};

  let resolvedState = previousState;
  if (nextState != null) {
    resolvedState = clone(nextState);
  } else if (patch && typeof patch === 'object' && !Array.isArray(patch)) {
    resolvedState = { ...previousState, ...clone(patch) };
  }

  const historyRefs = unique([
    ...(field.history_refs ?? []),
    ...(Array.isArray(event.historyRefs ?? event.history_refs)
      ? (event.historyRefs ?? event.history_refs)
      : []),
    eventId,
  ]);

  const timestamp = event.timestamp ?? null;
  const receipt = Object.freeze({
    schema: RELATIONAL_FIELD_EVENT_SCHEMA,
    event_id: eventId,
    relation_id: field.relation_id,
    participant_ids: Object.freeze([...(field.participant_ids ?? [])]),
    environment_id: field.environment_id ?? null,
    previous_revision: field.revision ?? 0,
    next_revision: (field.revision ?? 0) + 1,
    timestamp,
    source_ref: text(event.sourceRef ?? event.source_ref) || null,
    note: text(event.note) || null,
  });

  return Object.freeze({
    ...field,
    revision: receipt.next_revision,
    state: resolvedState,
    history_refs: Object.freeze(historyRefs),
    updated_at: timestamp,
    last_event: receipt,
  });
}

export function relationalFieldProjection(field) {
  if (!field || field.schema !== RELATIONAL_FIELD_SCHEMA) {
    throw new TypeError('A valid relational field is required.');
  }

  return Object.freeze({
    schema: 'arcsweep.relational-field-projection/v0.1',
    relation_id: field.relation_id,
    participant_ids: Object.freeze([...(field.participant_ids ?? [])]),
    environment_id: field.environment_id ?? null,
    revision: field.revision ?? 0,
    state: clone(field.state) ?? {},
    provenance: clone(field.provenance) ?? {},
  });
}
