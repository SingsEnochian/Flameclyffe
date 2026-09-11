import { POSSIBILITY_PRINCIPLES_REF } from './possibility-principles.js';

export const POSSIBILITY_TOPOLOGY_SCHEMA = 'arcsweep.possibility-topology/v1';

const AXES = Object.freeze(['P', 'C', 'R', 'E', 'M', 'A', 'Q']);

function freeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(freeze));
  if (value && typeof value === 'object') {
    return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, item]) => [key, freeze(item)])));
  }
  return value;
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function axisDelta(source = {}, destination = {}) {
  return Object.fromEntries(AXES.map((axis) => {
    const a = Number(source?.[axis]);
    const b = Number(destination?.[axis]);
    return [axis, Number.isFinite(a) && Number.isFinite(b) ? Number((b - a).toFixed(6)) : null];
  }));
}

function changedAxes(delta) {
  return AXES.filter((axis) => Number.isFinite(delta?.[axis]) && delta[axis] !== 0);
}

export function createPossibilityTopology({ arc, runtimePacket, bridgeTest, worldseedSnapshot } = {}) {
  if (!arc?.id || !String(arc?.intention || '').trim()) throw new Error('POSSIBILITY_TOPOLOGY: Arc identity and intention are required');
  if (!runtimePacket?.lineage?.math_spine_packet_id) throw new Error('POSSIBILITY_TOPOLOGY: PREMAQC/Math Spine lineage is required');
  if (!bridgeTest?.envelope?.translation) throw new Error('POSSIBILITY_TOPOLOGY: translated crossing is required');

  const translation = bridgeTest.envelope.translation;
  const sourcePremaqc = translation.translated_state?.source_premaqc || runtimePacket.active_state?.premaqc || null;
  const destinationPremaqc = translation.translated_state?.destination_premaqc || null;
  const delta = axisDelta(sourcePremaqc, destinationPremaqc);
  const projections = (bridgeTest.envelope.projections || []).map((item) => item.projection_type).filter(Boolean);
  const continuityPattern = [...new Set(translation.candidate_invariants || [])];
  const transformedFields = [...new Set(translation.transformed_fields || [])];

  return freeze({
    schema: POSSIBILITY_TOPOLOGY_SCHEMA,
    principles_ref: POSSIBILITY_PRINCIPLES_REF,
    arc_id: String(arc.id),
    world_id: String(arc.world_id || runtimePacket.world?.id || ''),
    orientation: {
      ask: String(arc.intention).trim(),
      principle: 'Intention orients traversal.',
    },
    configuration: {
      departure: {
        state_id: bridgeTest.envelope.source?.state_id || runtimePacket.continuity_packet_id || null,
        premaqc: clone(sourcePremaqc),
      },
      arrival: {
        state_id: bridgeTest.envelope.destination_response?.post_state_id || bridgeTest.envelope.destination?.state_id || null,
        premaqc: clone(destinationPremaqc),
      },
      delta_premaqc: delta,
      changed_axes: changedAxes(delta),
    },
    trajectory: {
      path: [
        'observer',
        'premaqc',
        'math-spine',
        'deeptime',
        'bifrost',
        'worldseed',
        ...projections.map((type) => `projection:${type}`),
        'project-zero',
      ],
      crossing_id: bridgeTest.envelope.crossing_id || null,
      continuity_pattern: continuityPattern,
      transformed_fields: transformedFields,
      source_receipt_ids: [...new Set(runtimePacket.lineage?.source_receipt_ids || [])],
      deep_time_record_id: runtimePacket.lineage?.deep_time_record_id || null,
      worldseed_fingerprint: worldseedSnapshot?.stages?.seedhouse?.fingerprint || null,
    },
    relational_read: {
      strength: {
        description: 'How fully the present configuration sustains the relationships carrying this traversal.',
        evidence: {
          deterministic_replay_matched: runtimePacket.lineage?.deterministic_replay_matched === true,
          crossing_complete: bridgeTest.crossing_complete === true,
          rooted_worldseed: Boolean(worldseedSnapshot?.stages?.seedhouse?.fingerprint),
        },
      },
      coherence: {
        description: 'How the active relationships move together within the present configuration and Ask.',
        evidence: {
          translation_status: translation.status || null,
          source_world_id: bridgeTest.envelope.source?.world_identity || null,
          destination_world_id: bridgeTest.envelope.destination?.world_identity || null,
          projections,
        },
      },
    },
    topology: {
      known_edges_used: [
        ['observer', 'premaqc'],
        ['premaqc', 'math-spine'],
        ['math-spine', 'deeptime'],
        ['deeptime', 'bifrost'],
        ['bifrost', 'worldseed'],
        ...projections.map((type) => ['worldseed', `projection:${type}`]),
        ...projections.map((type) => [`projection:${type}`, 'project-zero']),
      ],
      articulated_edges: projections.map((type) => ({
        from: 'worldseed',
        through: `projection:${type}`,
        to: 'project-zero',
        carrying: continuityPattern,
      })),
      possibility_expansion: {
        destination_world_id: bridgeTest.envelope.destination?.world_identity || null,
        newly_legible_modalities: projections,
      },
    },
    principles: {
      possibility_is_primary: true,
      relationship_gives_possibility_structure: true,
      experience_changes_future_possibility: true,
      intention_is_orientation: true,
      identity_is_trajectory: true,
      meaning_is_relational: true,
      memory_is_topology: true,
      continuity_makes_transformation_intelligible: true,
      learning_expands_possibility: true,
      optimisation_target: null,
    },
  });
}
