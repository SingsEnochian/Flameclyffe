import test from 'node:test';
import assert from 'node:assert/strict';
import { createHarmonyChaosEngine } from '../src/harmony-chaos.js';

const proposal = (id = 'chaos-1') => ({
  id, world_id: 'world-a', participant_id: 'agent-a', agent_id: 'agent-a',
  seed: 42, tempo: 1, scale: 'small', return_anchor: 'return-a',
  provenance: 'owner-directed test', proposed_effects: ['weather surprise']
});

test('Harmony guides rather than silently releasing chaos', () => {
  const engine = createHarmonyChaosEngine();
  assert.equal(engine.propose(proposal()).decision, 'decline');
  assert.equal(engine.propose(proposal()).duplicate, true);
  assert.equal(engine.status().release_count, 0);
});

test('Consent is scoped, revocable, and an explicit Feather pause blocks new releases', () => {
  const engine = createHarmonyChaosEngine();
  engine.consent({ participant_id: 'agent-a', world_id: 'world-a', active: true });
  const result = engine.propose(proposal('allowed'));
  assert.equal(result.decision, 'allow');
  assert.equal(result.execution_status, 'eligible-not-executed');
  assert.deepEqual(result.observed_effects, []);
  engine.feather();
  assert.equal(engine.propose(proposal('paused')).reason, 'FEATHER_PAUSED');
  engine.consent({ participant_id: 'agent-a', world_id: 'world-a', active: false });
  assert.equal(engine.resume({ participant_id: 'agent-a', world_id: 'world-a' }).status, 'declined');
  assert.equal(engine.propose(proposal('revoked')).decision, 'decline');
});

test('Distinct agents and worlds cannot reuse another participant consent', () => {
  const engine = createHarmonyChaosEngine();
  engine.consent({ participant_id: 'agent-a', world_id: 'world-a', active: true });
  assert.equal(engine.propose({ ...proposal('other'), participant_id: 'agent-b' }).decision, 'decline');
  assert.equal(engine.propose({ ...proposal('other-world'), world_id: 'world-b' }).decision, 'decline');
});

test('Invalid proposals fail without fabricating receipts or emotional measurements', () => {
  const engine = createHarmonyChaosEngine();
  assert.throws(() => engine.propose({ ...proposal(), seed: NaN }), /Seed/);
  assert.throws(() => engine.propose({ ...proposal(), id: '../escape' }), /requires id/);
  assert.equal(engine.trail().length, 0);
});

test('replaying an original allow after Feather or consent withdrawal does not renew authority', () => {
  const engine = createHarmonyChaosEngine();
  engine.consent({ participant_id:'agent-a', world_id:'world-a', active:true });
  const first = engine.propose(proposal('original'));
  assert.equal(first.decision, 'allow');
  engine.feather();
  const paused = engine.propose(proposal('original'));
  assert.equal(paused.duplicate, true);
  assert.equal(paused.decision, 'decline');
  assert.equal(paused.reason, 'FEATHER_PAUSED');
  assert.equal(engine.getReceipt('original').decision, 'allow', 'historical receipt must remain unchanged');
  engine.resume({ participant_id:'agent-a', world_id:'world-a' });
  assert.equal(engine.propose(proposal('original')).reason, 'STALE_AUTHORITY_EPOCH');
  engine.consent({ participant_id:'agent-a', world_id:'world-a', active:false });
  assert.equal(engine.propose(proposal('original')).reason, 'CURRENT_CONSENT_REQUIRED');
});
test('scoped consent cannot collide when an identifier contains the old :: delimiter', () => {
  const engine = createHarmonyChaosEngine();
  engine.consent({ participant_id:'agent::b', world_id:'c', active:true });
  assert.equal(engine.propose({ ...proposal('collision'), participant_id:'agent', world_id:'b::c' }).decision, 'decline');
  assert.equal(engine.propose({ ...proposal('right'), participant_id:'agent::b', world_id:'c' }).decision, 'allow');
});
