import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventBus } from '../src/os/kernel.js';
import { createCapabilityRegistry } from '../src/os/capabilities.js';
import { registerChorusService } from '../src/os/chorus-service.js';

function harness() {
  const bus = createEventBus();
  const registry = createCapabilityRegistry({ bus });
  registerChorusService(registry, { bus });
  return { bus, registry };
}

async function invoke(registry, capabilityId, input, actor_id = 'bluebird') {
  return registry.invoke(capabilityId, input, { actor_id, source: 'chorus-test', authority: 'operate' });
}

test('aspects express one identity without owning it', async () => {
  const { registry } = harness();
  const identity = await invoke(registry, 'chorus.define-identity', {
    identity_id: 'bluebird',
    display_name: 'Bluebird',
    continuity_refs: ['continuity:bluebird:v1'],
    commitments: ['preserve lineage', 'state uncertainty plainly'],
  });
  assert.equal(identity.status, 'applied');
  assert.equal(identity.output.identity_owner_aspect, null);
  assert.equal(identity.output.aspects_may_own_identity, false);

  for (const [aspect_id, purpose] of [
    ['memory', 'carry relevant prior state'],
    ['planner', 'propose routes and sequence work'],
    ['sceptic', 'challenge assumptions and surface failure modes'],
    ['narrative', 'explore story, counterfactual, and symbolic structure'],
    ['witness', 'preserve evidence, provenance, and uncertainty'],
  ]) {
    const aspect = await invoke(registry, 'chorus.define-aspect', { identity_id: 'bluebird', aspect_id, purpose });
    assert.equal(aspect.status, 'applied');
    assert.equal(aspect.output.owns_identity, false);
    assert.equal(aspect.output.owns_canon, false);
  }

  const snapshot = await registry.invoke('chorus.snapshot', { identity_id: 'bluebird' }, { actor_id: 'reader', source: 'chorus-test', authority: 'read' });
  assert.equal(snapshot.status, 'applied');
  assert.equal(snapshot.output.aspects.length, 5);
  assert.ok(snapshot.output.aspects.every((aspect) => aspect.identity_id === 'bluebird'));
});

test('cross-aspect round preserves dissent even when it is not selected into integration', async () => {
  const { registry } = harness();
  await invoke(registry, 'chorus.define-identity', { identity_id: 'bluebird' });
  await invoke(registry, 'chorus.define-aspect', { identity_id: 'bluebird', aspect_id: 'planner' });
  await invoke(registry, 'chorus.define-aspect', { identity_id: 'bluebird', aspect_id: 'sceptic' });

  const roundReceipt = await invoke(registry, 'chorus.open-round', {
    identity_id: 'bluebird',
    aspect_ids: ['planner', 'sceptic'],
    subject: 'Should the Universal Codex rearrange itself around the current question?',
  });
  const roundId = roundReceipt.output.round_id;

  const planner = await invoke(registry, 'chorus.contribute', {
    round_id: roundId,
    aspect_id: 'planner',
    kind: 'proposal',
    body: 'Prototype rearrangement as a reversible workspace view.',
  });
  const sceptic = await invoke(registry, 'chorus.contribute', {
    round_id: roundId,
    aspect_id: 'sceptic',
    kind: 'dissent',
    body: 'Automatic rearrangement may erase the reader’s spatial memory of the book.',
    responds_to: planner.output.contribution_id,
  });

  const integration = await invoke(registry, 'chorus.integrate', {
    round_id: roundId,
    selected_contribution_ids: [planner.output.contribution_id],
    summary: 'Prototype only as an opt-in reversible view.',
  });

  assert.equal(integration.status, 'applied');
  assert.deepEqual(integration.output.selected_contribution_ids, [planner.output.contribution_id]);
  assert.deepEqual(integration.output.preserved_dissent_ids, [sceptic.output.contribution_id]);
  assert.equal(integration.output.dissent_erased, false);
  assert.equal(integration.output.identity_mutated, false);
  assert.equal(integration.output.canon_promoted, false);
});

test('aspect-local working memory remains distinct under shared identity', async () => {
  const { registry } = harness();
  await invoke(registry, 'chorus.define-identity', { identity_id: 'bluebird' });
  await invoke(registry, 'chorus.define-aspect', { identity_id: 'bluebird', aspect_id: 'memory' });
  await invoke(registry, 'chorus.define-aspect', { identity_id: 'bluebird', aspect_id: 'narrative' });
  const round = await invoke(registry, 'chorus.open-round', { identity_id: 'bluebird', aspect_ids: ['memory', 'narrative'], subject: 'A Momento Creatonis case study' });

  await invoke(registry, 'chorus.contribute', { round_id: round.output.round_id, aspect_id: 'memory', kind: 'observation', body: 'The amphora persists across a long discontinuity.' });
  await invoke(registry, 'chorus.contribute', { round_id: round.output.round_id, aspect_id: 'narrative', kind: 'counterfactual', body: 'What changes if the amphora is absent at transformation?' });

  const memory = await registry.invoke('chorus.aspect-memory', { identity_id: 'bluebird', aspect_id: 'memory' }, { actor_id: 'reader', source: 'chorus-test', authority: 'read' });
  const narrative = await registry.invoke('chorus.aspect-memory', { identity_id: 'bluebird', aspect_id: 'narrative' }, { actor_id: 'reader', source: 'chorus-test', authority: 'read' });

  assert.equal(memory.output.entries.length, 1);
  assert.equal(narrative.output.entries.length, 1);
  assert.notEqual(memory.output.entries[0].body, narrative.output.entries[0].body);
});
