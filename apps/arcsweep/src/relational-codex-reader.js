import {
  getRelationalField,
  listRelationalFields,
  relationalFieldStoreStatus,
} from './relational-field-store.js';
import {
  projectRelationalFieldToObserver,
  projectRelationalFieldToPremaqc,
  projectRelationalFieldToRuna,
} from './relational-field-projections.js';

export const RELATIONAL_CODEX_READER_SCHEMA = 'arcsweep.relational-codex-reader/v0.1';
export const RELATIONAL_CODEX_PREVIEW_SCHEMA = 'arcsweep.relational-codex-preview/v0.1';

const clone = (value) => value == null ? value : structuredClone(value);
const text = (value) => String(value ?? '').trim();

export async function relationalCodexIndex() {
  const relations = await listRelationalFields();
  return Object.freeze(relations.map((field) => Object.freeze({
    relation_id: field.relation_id,
    kind: field.kind || 'relationship',
    participant_ids: Object.freeze([...(field.participant_ids || [])]),
    environment_id: field.environment_id || null,
    revision: Number(field.revision || 0),
    updated_at: field.updated_at || field.created_at || null,
  })));
}

export async function relationalCodexSnapshot(relationId) {
  const id = text(relationId);
  const [status, field] = await Promise.all([
    relationalFieldStoreStatus(),
    id ? getRelationalField(id) : Promise.resolve(null),
  ]);
  return Object.freeze({
    schema: RELATIONAL_CODEX_READER_SCHEMA,
    identity_law: 'A != B != R',
    status: clone(status),
    field: field ? clone(field) : null,
    authority: Object.freeze({
      read_only: true,
      mutation_controls_present: false,
      canon_promotion: false,
      identity_collapse: false,
    }),
  });
}

export async function relationalCodexProjectionPreview(relationId, target, options = {}) {
  const id = text(relationId);
  if (!id) throw new TypeError('relationId is required.');
  const field = await getRelationalField(id);
  if (!field) throw new Error(`Unknown relational field: ${id}`);

  let projection;
  const projectionTarget = text(target).toLowerCase();
  if (projectionTarget === 'observer') {
    projection = projectRelationalFieldToObserver(field, {
      observedAt: options.observedAt,
      observerId: options.observerId || 'codex-preview',
    });
  } else if (projectionTarget === 'premaqc') {
    projection = projectRelationalFieldToPremaqc(field, {
      evidence: options.evidence || {},
      observedAt: options.observedAt,
    });
  } else if (projectionTarget === 'runa') {
    projection = projectRelationalFieldToRuna(field, {
      resonance: options.resonance,
      cadence: options.cadence,
      timbre: options.timbre,
      glyph: options.glyph,
      haptic: options.haptic,
      projectedAt: options.projectedAt,
    });
  } else {
    throw new TypeError(`Unknown relation projection target: ${target}`);
  }

  return Object.freeze({
    schema: RELATIONAL_CODEX_PREVIEW_SCHEMA,
    relation_id: field.relation_id,
    revision: field.revision,
    target: projectionTarget,
    projection,
    persisted: false,
    relation_mutated: false,
    canon_promoted: false,
    identity_law: 'A != B != R',
  });
}
