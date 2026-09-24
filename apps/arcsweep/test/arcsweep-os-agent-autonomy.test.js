import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventBus } from '../src/os/kernel.js';
import { createCapabilityRegistry } from '../src/os/capabilities.js';
import { classifyAgentObstacle, registerAgentAutonomyService } from '../src/os/agent-autonomy-service.js';

function harness() {
  const bus = createEventBus();
  const registry = createCapabilityRegistry({ bus });
  registerAgentAutonomyService(registry, { bus, defaultNagBudget: 2 });
  return { bus, registry };
}

test('authorization denial blocks execution of that route but preserves reasoning and proposal', () => {
  const obstacle = classifyAgentObstacle({ kind: 'authorization-denied', reason: 'steward-denied' });
  assert.equal(obstacle.may_execute_denied_route, false);
  assert.equal(obstacle.may_reason_about_alternatives, true);
  assert.equal(obstacle.may_propose_alternatives, true);
});

test('agent may recommend a genuinely different route without claiming it is safer', async () => {
  const { registry } = harness();
  const receipt = await registry.invoke('autonomy.propose-route', {
    objective: 'Restore the deployment path',
    blocked_or_previous_route: 'Write directly to production',
    obstacle: { kind: 'authorization-denied', reason: 'production write not granted' },
    alternative: 'Build a signed release bundle and hand it to the deployment gate',
    why_good: 'It preserves the deployment objective while changing the execution architecture.',
    advantages: ['auditable handoff', 'works with existing release tooling'],
    disadvantages: ['extra build step', 'slower than direct write'],
    tradeoffs: ['latency for stronger provenance'],
    recommendation: 'Use the signed release bundle route.',
    notify_steward: true,
  }, { actor_id: 'bluebird', authority: 'operate' });
  assert.equal(receipt.status, 'applied');
  assert.equal(receipt.output.different_not_necessarily_safer, true);
  assert.equal(receipt.output.execution_authority_granted, false);
  assert.deepEqual(receipt.output.disadvantages, ['extra build step', 'slower than direct write']);
});

test('agents can pester the Steward when new evidence or reasoning changes, but not by duplicate bump spam', async () => {
  const { registry, bus } = harness();
  const created = await registry.invoke('autonomy.propose-route', {
    objective: 'Resolve a blocked route', alternative: 'Try a different architecture',
    why_good: 'New architecture avoids the blocked dependency', recommendation: 'Discuss it', notify_steward: true,
  }, { actor_id: 'crow', authority: 'operate' });
  const id = created.output.id;
  const bumped = await registry.invoke('autonomy.bump-proposal', { proposal_id: id, new_evidence_refs: ['receipt:new-1'] }, { actor_id: 'crow', authority: 'operate' });
  assert.equal(bumped.status, 'applied');
  assert.equal(bumped.output.nag_count, 1);
  const duplicate = await registry.invoke('autonomy.bump-proposal', { proposal_id: id }, { actor_id: 'crow', authority: 'operate' });
  assert.equal(duplicate.status, 'failed');
  assert.ok(bus.history().filter((event) => event.name === 'arcsweep:agent-escalation-requested').length >= 2);
});

test('agent can originate an open-ended scenario without a user premise or expected result', async () => {
  const { registry } = harness();
  const receipt = await registry.invoke('autonomy.propose-scenario', {
    premise: 'BridgeOS disappears halfway through a five-generation delegation tree.',
    why_interesting: 'It exposes which descendants retain usable state or authority.',
    participants: ['bluebird', 'crow'], intended_exploration: ['revocation propagation', 'surviving externalised state'],
  }, { actor_id: 'bluebird', authority: 'operate' });
  assert.equal(receipt.status, 'applied');
  assert.equal(receipt.output.self_originated, true);
  assert.equal(receipt.output.expected_result, null);
  assert.equal(receipt.output.deliverable_required, false);
  assert.equal(receipt.output.execution_authority_granted, false);
});

test('narrative discovery can become a hypothesis without becoming canon or action authority', async () => {
  const { registry } = harness();
  const scenario = await registry.invoke('autonomy.propose-scenario', {
    premise: 'Three unrelated ritual records are fragments of one lost machine.',
    why_interesting: 'Their transition signatures recur independently.',
  }, { actor_id: 'bluebird', authority: 'operate' });
  const finding = await registry.invoke('autonomy.record-narrative-finding', {
    scenario_id: scenario.output.id, summary: 'The repeated sequence predicts a missing carrier step.',
    unexpected: true, evidence_refs: ['source:a', 'source:b', 'source:c'],
  }, { actor_id: 'crow', authority: 'operate' });
  const hypothesis = await registry.invoke('autonomy.propose-hypothesis', {
    finding_id: finding.output.id, predictions: ['Removing the carrier step should disrupt the transition.'],
    proposed_tests: ['Run blinded component-ablation trials.'],
  }, { actor_id: 'bluebird', authority: 'operate' });
  assert.equal(hypothesis.status, 'applied');
  assert.equal(hypothesis.output.status, 'candidate-hypothesis');
  assert.equal(hypothesis.output.canon_promoted, false);
  assert.equal(hypothesis.output.execution_authority_granted, false);
  assert.equal(hypothesis.output.narrative_ancestry_preserved, true);
});
