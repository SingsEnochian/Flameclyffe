import assert from 'node:assert/strict';
import test from 'node:test';

import { greatBraidProjectZeroEvent, GREAT_BRAID_SCHEMA } from '../src/great-braid.js';
import { createPossibilityRouteSet } from '../src/possibility-broker.js';
import { ingestPossibilityPrinciples, POSSIBILITY_PRINCIPLES_REF } from '../src/possibility-principles.js';
import { POSSIBILITY_TOPOLOGY_SCHEMA } from '../src/possibility-topology.js';

function topology() {
  return {
    schema: POSSIBILITY_TOPOLOGY_SCHEMA,
    orientation: { ask: 'Find a path aligned with greater strength and coherence.' },
    trajectory: {
      path: ['observer', 'premaqc', 'math-spine', 'deeptime', 'bifrost', 'worldseed', 'project-zero'],
      crossing_id: 'crossing:plural-001',
      continuity_pattern: ['identity_lineage', 'provenance', 'agency', 'declared_intention'],
      source_receipt_ids: ['receipt:departure'],
    },
    relational_read: {
      strength: { evidence: { crossing_complete: true, rooted_worldseed: true } },
      coherence: { evidence: { translation_status: 'TRANSLATED' } },
    },
    topology: {
      possibility_expansion: { newly_legible_modalities: ['glyph', 'runa'] },
    },
  };
}

test('Codex ingest resolves the canonical possibility-topology principle record', async () => {
  let requestedTable = null;
  let requestedSlug = null;
  const supabase = {
    from(table) {
      requestedTable = table;
      return {
        select() { return this; },
        eq(_field, slug) { requestedSlug = slug; return this; },
        async single() {
          return { data: { slug: requestedSlug, title: 'Possibility Topology', body_md: 'Possibility is primary.', metadata: {}, updated_at: '2026-08-23T19:33:40Z' }, error: null };
        },
      };
    },
  };
  const ingested = await ingestPossibilityPrinciples(supabase);
  assert.equal(requestedTable, POSSIBILITY_PRINCIPLES_REF.table);
  assert.equal(requestedSlug, POSSIBILITY_PRINCIPLES_REF.slug);
  assert.equal(ingested.canonical.slug, POSSIBILITY_PRINCIPLES_REF.slug);
  assert.equal(ingested.runtime_principles.intention_is_orientation, 'Intention is orientation.');
});

test('Broker retains plural branches and carries route-specific strength/coherence evidence', () => {
  const routes = createPossibilityRouteSet({
    topology: topology(),
    availableModalities: [
      { modality: 'glyph', strength_evidence: { spatial_relation_clarity: true }, coherence_evidence: { symbolic_fit: true } },
      { modality: 'runa', strength_evidence: { temporal_pattern_support: true }, coherence_evidence: { acoustic_fit: true } },
      { modality: 'storywork', conditions: { requires_narrative_return: true } },
    ],
  });
  assert.equal(routes.branch_count, 3);
  assert.equal(routes.ranking, null);
  assert.equal(routes.winner, null);
  assert.deepEqual(routes.branches.map((branch) => branch.status), ['presently-legible', 'presently-legible', 'available-untraversed']);
  assert.equal(routes.branches[0].strength.path_specific.spatial_relation_clarity, true);
  assert.equal(routes.branches[1].coherence.path_specific.acoustic_fit, true);
  assert.equal(routes.branches[2].conditions.requires_narrative_return, true);
});

test('Great Braid Project Zero event carries orientation and topology downstream intact', () => {
  const receipt = {
    schema: GREAT_BRAID_SCHEMA,
    receipt_id: 'great-braid:plural-001',
    receipt_fingerprint: 'f'.repeat(64),
    generated_at: '2026-08-23T20:00:00.000Z',
    arc: { id: 'arc:plural', world_id: 'earth_prime', intention: 'Explore coherent plural routes.' },
    stages: { possibility_topology: topology(), project_zero: { plugin_id: 'arcsweep-runtime-bridge' } },
    lineage: { source_receipt_ids: ['receipt:departure'] },
  };
  const event = greatBraidProjectZeroEvent(receipt);
  const routes = createPossibilityRouteSet({ topology: event.payload.stages.possibility_topology, availableModalities: ['glyph', 'runa'] });
  assert.equal(routes.branch_count, 2);
  assert.equal(routes.orientation, 'Find a path aligned with greater strength and coherence.');
  assert.equal(routes.branches.every((branch) => branch.orientation === routes.orientation), true);
  assert.equal(event.payload.stages.possibility_topology.orientation.ask, routes.orientation);
});
