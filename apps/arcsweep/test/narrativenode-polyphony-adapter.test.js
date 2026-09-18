import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildNarrativeNodeBootstrapPlan,
  buildNarrativeNodeClaimPlan,
  mapClaimToNarrativeNodeKnowledge,
  mapNameLineageToNarrativeNode,
  narrativeNodeInteropReceipt,
} from '../src/narrativenode-polyphony-adapter.js';

test('NarrativeNode bootstrap is protocol-only and begins with explicit user permission', () => {
  const plan = buildNarrativeNodeBootstrapPlan();
  assert.equal(plan.schema, 'arcsweep.narrativenode-mcp-plan/v0.1');
  assert.equal(plan.steps[0].tool, 'request_mcp_session');
  assert.equal(plan.steps[0].requires_active_session, false);
  assert.equal(plan.external_source_code_incorporated, false);
  assert.equal(plan.user_grant_required, true);
  assert.ok(plan.steps.some((step) => step.tool === 'create_custom_category' && step.args.name === 'Tradition'));
  assert.ok(plan.steps.some((step) => step.tool === 'create_tag' && step.args.name === 'productive-apocrypha'));
  assert.ok(plan.steps.some((step) => step.tool === 'add_story_seed' && step.args.name === 'Resonance Autonomy'));
  assert.equal(plan.steps.at(-1).tool, 'end_mcp_session');
  assert.deepEqual(Object.keys(plan.steps.at(-1).args), ['summary']);
});

test('claims become NarrativeNode Knowledge rather than canon mutations', () => {
  const mapped = mapClaimToNarrativeNodeKnowledge({
    id: 'fixture-origin-a',
    name: 'Fixture origin tradition A',
    summary: 'One deliberately conflicting in-world origin tradition.',
    truth_layer: 'folklore',
    productive_apocrypha: true,
    diegetic_provenance: { hops: 2 },
    source_ids: ['fixture:origin-a'],
    awareness: [{ observer: 'Fixture Character', level: 1 }],
  });
  assert.equal(mapped.create.tool, 'create_knowledge');
  assert.ok(mapped.tags.includes('folklore'));
  assert.ok(mapped.tags.includes('productive-apocrypha'));
  assert.ok(mapped.tags.includes('diegetic-source'));
  assert.equal(mapped.awareness[0].observer, 'Fixture Character');
});

test('claim plan keeps permission, knowledge, tags, awareness and close steps sequential', () => {
  const plan = buildNarrativeNodeClaimPlan({
    worldId: 'fixture-world',
    claims: [{
      id: 'fixture-origin-a',
      name: 'Fixture origin tradition A',
      productive_apocrypha: true,
      awareness: [{ observer: 'Fixture Witness', level: 2 }],
    }],
  });
  assert.equal(plan.steps[0].tool, 'request_mcp_session');
  assert.equal(plan.steps[1].tool, 'create_knowledge');
  assert.equal(plan.steps[1].capture_as, 'knowledge:claim:fixture-origin-a');
  assert.equal(plan.steps[2].tool, 'add_tags');
  assert.match(plan.steps[2].args.host, /^\$\{knowledge:claim:fixture-origin-a\}\.id$/);
  assert.equal(plan.steps[3].tool, 'set_knowledge_awareness');
  assert.equal(plan.steps.at(-1).tool, 'end_mcp_session');
});

test('name-lineage bridge uses aliases and chain-tracked Knowledge for scene events', () => {
  const bridge = mapNameLineageToNarrativeNode({
    entity: 'River Goddess',
    lineage: {
      names: [
        { id: 'n1', kind: 'imposed-name', value: 'Imperial Name', authority: 'conquest', consent: 'no' },
        { id: 'n2', kind: 'recovered-name', value: 'Old Name', authority: 'community', consent: 'yes' },
      ],
    },
    sceneByNameId: { n1: 'The Renaming', n2: 'The Recovery' },
  });
  assert.equal(bridge.calls.length, 2);
  assert.equal(bridge.calls[0].tool, 'add_aliases');
  assert.equal(bridge.calls[0].args.at, 'The Renaming');
  assert.match(bridge.calls[0].args.track_as_knowledge.description, /consent=no/);
  assert.ok(bridge.calls[0].tags.includes('imposed-name'));
  assert.ok(bridge.calls[1].tags.includes('recovered-name'));
});

test('interop receipt explicitly records no canon promotion or source-code incorporation', () => {
  const plan = buildNarrativeNodeClaimPlan({ worldId: 'terra-aeterna', claims: [] });
  const receipt = narrativeNodeInteropReceipt({ plan, executedSteps: [{ tool: 'request_mcp_session', status: 'granted' }], completedAt: '2026-09-17T22:00:00-04:00' });
  assert.equal(receipt.canon_promoted, false);
  assert.equal(receipt.external_source_code_incorporated, false);
  assert.equal(receipt.user_grant_was_required, true);
});
