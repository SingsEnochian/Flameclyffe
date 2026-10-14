import assert from 'node:assert/strict';
import test from 'node:test';

import { POSSIBILITY_TOPOLOGY_SCHEMA, createPossibilityTopology } from '../src/possibility-topology.js';

const sourcePremaqc = Object.freeze({ schema: 'premaqc/v1', P: .82, C: .84, R: .81, E: .22, M: .76, A: .90, Q: .79 });
const destinationPremaqc = Object.freeze({ schema: 'premaqc/v1', P: .86, C: .88, R: .84, E: .19, M: .80, A: .91, Q: .82 });

function sample() {
  return createPossibilityTopology({
    arc: {
      id: 'arc-terra-prime-discovery',
      world_id: 'earth_prime',
      intention: 'Discover other-than-human intelligences, enable interstellar travel, and create transformative spaces between realities.',
    },
    runtimePacket: {
      world: { id: 'earth_prime' },
      continuity_packet_id: 'continuity:terra-prime:001',
      active_state: { premaqc: sourcePremaqc },
      lineage: {
        math_spine_packet_id: 'math-spine:001',
        deterministic_replay_matched: true,
        deep_time_record_id: 'deeptime:001',
        source_receipt_ids: ['observer:001', 'premaqc:001', 'math-spine:001'],
      },
    },
    bridgeTest: {
      crossing_complete: true,
      envelope: {
        crossing_id: 'bridge:earth-prime:terra-aeterna:001',
        source: { world_identity: 'earth_prime', state_id: 'prime:departure' },
        destination: { world_identity: 'terra-aeterna', state_id: 'ta:arrival' },
        destination_response: { post_state_id: 'ta:arrival:answered' },
        translation: {
          status: 'TRANSLATED',
          candidate_invariants: ['identity_lineage', 'provenance', 'agency', 'declared_intention'],
          transformed_fields: ['tone', 'glyph_geometry', 'sound_palette', 'narrative_diction', 'temporal_rhythm'],
          translated_state: {
            source_premaqc: sourcePremaqc,
            destination_premaqc: destinationPremaqc,
          },
        },
        projections: [
          { projection_type: 'glyph' },
          { projection_type: 'runa' },
          { projection_type: 'storywork' },
        ],
      },
    },
    worldseedSnapshot: {
      stages: { seedhouse: { fingerprint: 'worldseed:terra-aeterna:001' } },
    },
  });
}

test('Project Zero reads a crossing as trajectory through possibility rather than a winner score', () => {
  const topology = sample();

  assert.equal(topology.schema, POSSIBILITY_TOPOLOGY_SCHEMA);
  assert.equal(topology.orientation.principle, 'Intention orients traversal.');
  assert.equal(topology.principles.possibility_is_primary, true);
  assert.equal(topology.principles.identity_is_trajectory, true);
  assert.equal(topology.principles.memory_is_topology, true);
  assert.equal(topology.principles.learning_expands_possibility, true);
  assert.equal(topology.principles.optimisation_target, null);
  assert.deepEqual(topology.configuration.changed_axes, ['P', 'C', 'R', 'E', 'M', 'A', 'Q']);
  assert.equal(topology.configuration.delta_premaqc.P, .04);
  assert.equal(topology.configuration.delta_premaqc.E, -.03);
  assert.equal(topology.trajectory.deep_time_record_id, 'deeptime:001');
  assert.ok(topology.trajectory.path.includes('project-zero'));
  assert.deepEqual(topology.trajectory.continuity_pattern, ['identity_lineage', 'provenance', 'agency', 'declared_intention']);
  assert.deepEqual(topology.topology.possibility_expansion.newly_legible_modalities, ['glyph', 'runa', 'storywork']);
});

test('strength and coherence remain relational reads instead of collapsing into one scalar objective', () => {
  const topology = sample();

  assert.deepEqual(topology.relational_read.strength.evidence, {
    deterministic_replay_matched: true,
    crossing_complete: true,
    rooted_worldseed: true,
  });
  assert.equal(topology.relational_read.coherence.evidence.translation_status, 'TRANSLATED');
  assert.deepEqual(topology.relational_read.coherence.evidence.projections, ['glyph', 'runa', 'storywork']);
  assert.equal('score' in topology.relational_read.strength, false);
  assert.equal('score' in topology.relational_read.coherence, false);
});

test('the traversal articulates modality edges that later traversals can reuse or extend', () => {
  const topology = sample();

  assert.deepEqual(topology.topology.articulated_edges.map((edge) => edge.through), [
    'projection:glyph',
    'projection:runa',
    'projection:storywork',
  ]);
  assert.ok(topology.topology.known_edges_used.some(([from, to]) => from === 'deeptime' && to === 'bifrost'));
  assert.ok(topology.topology.known_edges_used.some(([from, to]) => from === 'projection:runa' && to === 'project-zero'));
});
