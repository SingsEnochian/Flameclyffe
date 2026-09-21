import {
  createStoredRelationalField,
  applyStoredRelationalFieldEvent,
  getRelationalField,
  listRelationalFields,
  relationalFieldStoreStatus,
} from '../relational-field-store.js';
import {
  projectRelationalFieldToObserver,
  projectRelationalFieldToPremaqc,
  projectRelationalFieldToRuna,
} from '../relational-field-projections.js';

export const RELATIONAL_FIELD_SERVICE_SCHEMA = 'arcsweep.relational-field-service/v0.1';
const freeze = (value) => Object.freeze(value);
const text = (value) => String(value ?? '').trim();

function relationId(input = {}) {
  return text(input.relation_id ?? input.relationId);
}

async function requireField(input = {}) {
  const id = relationId(input);
  if (!id) throw new TypeError('relation_id is required.');
  const field = await getRelationalField(id);
  if (!field) throw new Error(`Unknown relational field: ${id}`);
  return field;
}

export function registerRelationalFieldService(registry, { bus = null } = {}) {
  if (!registry?.registerService || !registry?.registerCapability) {
    throw new Error('Relational Field service requires the ArcSweep capability registry.');
  }

  if (bus?.define && bus?.eventNames) {
    const known = new Set(bus.eventNames());
    if (!known.has('arcsweep:relational-field-changed')) {
      bus.define('arcsweep:relational-field-changed', (payload) => payload?.schema === 'arcsweep.relational-field-change-event/v0.1' && Boolean(payload?.relation_id));
    }
    if (!known.has('arcsweep:relational-field-projected')) {
      bus.define('arcsweep:relational-field-projected', (payload) => payload?.schema === 'arcsweep.relational-field-projection-event/v0.1' && Boolean(payload?.relation_id));
    }
  }

  registry.registerService({
    service_id: 'relational-field',
    label: 'ArcSweep Relational Field',
    authority_boundary: {
      read_relation_state: true,
      create_relation: 'explicit-mutate-confirmation',
      apply_relation_event: 'explicit-mutate-confirmation',
      delete_relation: false,
      identity_collapse: false,
      canon_promotion: false,
      observer_projection: 'read-only',
      premaqc_projection: 'explicit-evidence-only',
      runa_projection: 'semantic-plan-only',
    },
    consumes: ['arcsweep-state', 'explicit-relation-event', 'explicit-projection-evidence'],
    emits: ['arcsweep:relational-field-changed', 'arcsweep:relational-field-projected'],
  });

  registry.registerCapability({
    capability_id: 'relation.status',
    service_id: 'relational-field',
    description: 'Read Relational Field durable-store status.',
    authority: 'read',
    execute: () => relationalFieldStoreStatus(),
  });

  registry.registerCapability({
    capability_id: 'relation.list',
    service_id: 'relational-field',
    description: 'List persisted Relational Field records.',
    authority: 'read',
    execute: async () => freeze({
      schema: 'arcsweep.relational-field-list/v0.1',
      relations: await listRelationalFields(),
    }),
  });

  registry.registerCapability({
    capability_id: 'relation.get',
    service_id: 'relational-field',
    description: 'Read one persisted Relational Field record.',
    authority: 'read',
    input_schema: { required: ['relation_id'] },
    validate: (input = {}) => Boolean(relationId(input)),
    execute: async (input = {}) => {
      const field = await requireField(input);
      return freeze({ schema: 'arcsweep.relational-field-read/v0.1', field });
    },
  });

  registry.registerCapability({
    capability_id: 'relation.create',
    service_id: 'relational-field',
    description: 'Create a new persistent relation while preserving participant identity.',
    authority: 'mutate',
    requires_confirmation: true,
    input_schema: { required: ['relation_id', 'participant_ids'] },
    validate: (input = {}) => Boolean(relationId(input)) && Array.isArray(input.participant_ids ?? input.participantIds),
    execute: async (input = {}) => {
      const result = await createStoredRelationalField(input);
      bus?.publish?.('arcsweep:relational-field-changed', {
        schema: 'arcsweep.relational-field-change-event/v0.1',
        action: 'create',
        relation_id: result.field.relation_id,
        revision: result.field.revision,
        participant_count: result.field.participant_ids.length,
        event_id: null,
      }, { source: 'relational-field' });
      return result;
    },
  });

  registry.registerCapability({
    capability_id: 'relation.apply-event',
    service_id: 'relational-field',
    description: 'Apply an explicit event to a persisted relation without rewriting participant identity.',
    authority: 'mutate',
    requires_confirmation: true,
    input_schema: { required: ['relation_id', 'event'] },
    validate: (input = {}) => Boolean(relationId(input)) && input.event && typeof input.event === 'object' && Boolean(text(input.event.eventId ?? input.event.event_id)),
    execute: async (input = {}) => {
      const result = await applyStoredRelationalFieldEvent(relationId(input), input.event);
      bus?.publish?.('arcsweep:relational-field-changed', {
        schema: 'arcsweep.relational-field-change-event/v0.1',
        action: 'apply-event',
        relation_id: result.field.relation_id,
        revision: result.field.revision,
        participant_count: result.field.participant_ids.length,
        event_id: result.field.last_event?.event_id || null,
      }, { source: 'relational-field' });
      return result;
    },
  });

  const project = (capabilityId, description, projector, inputMapper = (input) => input) => {
    registry.registerCapability({
      capability_id: capabilityId,
      service_id: 'relational-field',
      description,
      authority: 'read',
      input_schema: { required: ['relation_id'] },
      validate: (input = {}) => Boolean(relationId(input)),
      execute: async (input = {}) => {
        const field = await requireField(input);
        const projection = projector(field, inputMapper(input));
        bus?.publish?.('arcsweep:relational-field-projected', {
          schema: 'arcsweep.relational-field-projection-event/v0.1',
          relation_id: field.relation_id,
          projection_schema: projection.schema,
          revision: field.revision,
          persisted: false,
        }, { source: 'relational-field' });
        return projection;
      },
    });
  };

  project(
    'relation.project-observer',
    'Project one persisted relation into an Observer witness packet without mutation.',
    projectRelationalFieldToObserver,
    (input) => ({ observedAt: input.observed_at, observerId: input.observer_id }),
  );
  project(
    'relation.project-premaqc',
    'Project one persisted relation into canonical PREMAQC using only explicitly supplied compatible evidence.',
    projectRelationalFieldToPremaqc,
    (input) => ({ evidence: input.evidence || {}, observedAt: input.observed_at }),
  );
  project(
    'relation.project-runa',
    'Build a semantic-only Runa projection plan for one persisted relation; no physical output is claimed.',
    projectRelationalFieldToRuna,
    (input) => ({
      resonance: input.resonance,
      cadence: input.cadence,
      timbre: input.timbre,
      glyph: input.glyph,
      haptic: input.haptic,
      projectedAt: input.projected_at,
    }),
  );

  return freeze({
    schema: RELATIONAL_FIELD_SERVICE_SCHEMA,
    service_id: 'relational-field',
    capabilities: freeze([
      'relation.status',
      'relation.list',
      'relation.get',
      'relation.create',
      'relation.apply-event',
      'relation.project-observer',
      'relation.project-premaqc',
      'relation.project-runa',
    ]),
  });
}
