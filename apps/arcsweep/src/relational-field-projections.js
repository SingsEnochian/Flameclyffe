import { PREMAQC_AXES, PREMAQC_CONTEXT_ONLY_AXES } from '../../starwell/src/premaqc-contract.js';
import { RELATIONAL_FIELD_SCHEMA, relationalFieldProjection } from './relational-field.js';

export const RELATIONAL_OBSERVER_PROJECTION_SCHEMA = 'arcsweep.relational-observer-projection/v0.1';
export const RELATIONAL_PREMAQC_PROJECTION_SCHEMA = 'arcsweep.relational-premaqc-projection/v0.1';
export const RELATIONAL_RUNA_PROJECTION_SCHEMA = 'arcsweep.relational-runa-projection/v0.1';

const clone = (value) => value == null ? value : structuredClone(value);
const text = (value) => String(value ?? '').trim();

function assertField(field) {
  if (!field || field.schema !== RELATIONAL_FIELD_SCHEMA) throw new TypeError('A valid relational field is required.');
}

export function projectRelationalFieldToObserver(field, {
  observedAt = new Date().toISOString(),
  observerId = 'observer',
} = {}) {
  assertField(field);
  return Object.freeze({
    schema: RELATIONAL_OBSERVER_PROJECTION_SCHEMA,
    observer_id: text(observerId) || 'observer',
    observed_at: observedAt,
    relation: relationalFieldProjection(field),
    transition: field.last_event ? clone(field.last_event) : null,
    authority: Object.freeze({
      mutates_relation: false,
      canon_commit: false,
      inference: false,
      role: 'witness',
    }),
  });
}

function axisUnknown(axis) {
  return Object.freeze({
    axis,
    present: false,
    asserted: false,
    value: null,
    confidence: null,
    evidence_refs: Object.freeze([]),
    note: 'No compatible explicit relational evidence supplied.',
  });
}

export function projectRelationalFieldToPremaqc(field, {
  evidence = {},
  observedAt = new Date().toISOString(),
} = {}) {
  assertField(field);
  const axes = {};
  for (const axis of PREMAQC_AXES) {
    const supplied = evidence?.[axis];
    if (!supplied || typeof supplied !== 'object') {
      axes[axis] = axisUnknown(axis);
      continue;
    }
    if (PREMAQC_CONTEXT_ONLY_AXES.includes(axis)) {
      const firsthand = supplied.firsthand === true && supplied.inferred !== true;
      axes[axis] = Object.freeze({
        axis,
        present: firsthand,
        asserted: firsthand,
        value: firsthand ? clone(supplied.value ?? null) : null,
        confidence: firsthand ? (supplied.confidence ?? null) : null,
        evidence_refs: Object.freeze(Array.isArray(supplied.evidence_refs) ? [...supplied.evidence_refs] : []),
        note: firsthand ? text(supplied.note) || 'Firsthand context only.' : 'Qualia remains firsthand-only and non-inferred.',
      });
      continue;
    }
    const asserted = supplied.asserted === true && supplied.inferred !== true;
    axes[axis] = Object.freeze({
      axis,
      present: asserted,
      asserted,
      value: asserted ? clone(supplied.value ?? null) : null,
      confidence: asserted ? (supplied.confidence ?? null) : null,
      evidence_refs: Object.freeze(Array.isArray(supplied.evidence_refs) ? [...supplied.evidence_refs] : []),
      note: asserted ? text(supplied.note) || null : 'Unasserted relational evidence remains unknown.',
    });
  }

  return Object.freeze({
    schema: RELATIONAL_PREMAQC_PROJECTION_SCHEMA,
    vocabulary: 'PREMAQC',
    relation_id: field.relation_id,
    participant_ids: Object.freeze([...(field.participant_ids || [])]),
    observed_at: observedAt,
    axes: Object.freeze(axes),
    authority: Object.freeze({
      mutates_relation: false,
      canon_commit: false,
      unsupported_fields_remain_unknown: true,
      same_letter_translation_forbidden: true,
      qualia_firsthand_only: true,
    }),
  });
}

export function projectRelationalFieldToRuna(field, {
  resonance = null,
  cadence = null,
  timbre = null,
  glyph = null,
  haptic = null,
  projectedAt = new Date().toISOString(),
} = {}) {
  assertField(field);
  const channels = {
    resonance: resonance == null ? null : clone(resonance),
    cadence: cadence == null ? null : clone(cadence),
    timbre: timbre == null ? null : clone(timbre),
    glyph: glyph == null ? null : clone(glyph),
    haptic: haptic == null ? null : clone(haptic),
  };
  return Object.freeze({
    schema: RELATIONAL_RUNA_PROJECTION_SCHEMA,
    relation_id: field.relation_id,
    participant_ids: Object.freeze([...(field.participant_ids || [])]),
    projected_at: projectedAt,
    channels: Object.freeze(channels),
    active_channels: Object.freeze(Object.entries(channels).filter(([, value]) => value != null).map(([key]) => key)),
    authority: Object.freeze({
      source_state_mutation: false,
      physical_output_claim: false,
      semantic_projection_only: true,
      canon_commit: false,
    }),
  });
}
