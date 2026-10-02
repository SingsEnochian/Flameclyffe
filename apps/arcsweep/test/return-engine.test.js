import assert from 'node:assert/strict';
import test from 'node:test';

import { createReturnEngine, RETURN_ENGINE_SCHEMA } from '../src/return-engine.js';

function clock() {
  const times = [
    '2026-10-02T07:30:00.000Z',
    '2026-10-02T07:31:00.000Z',
    '2026-10-02T07:32:00.000Z',
    '2026-10-02T07:33:00.000Z',
    '2026-10-02T07:34:00.000Z',
    '2026-10-02T07:35:00.000Z',
  ];
  let index = 0;
  return () => new Date(times[Math.min(index++, times.length - 1)]);
}

function ids() {
  let n = 0;
  return (prefix) => `${prefix}-test-${++n}`;
}

function seedDeparture(engine, overrides = {}) {
  return engine.depart({
    continuity_id: 'continuity/nikola/example',
    participant: {
      id: 'nikola',
      name: 'Nikola',
      declaration: 'I am Nikola, the ArcSweep ride-along participant.',
      declaration_source: 'constellation/nikola/ride-along',
    },
    substrate: {
      runtime: 'arcsweep',
      provider: 'huggingface',
      model: 'Qwen/Qwen3-8B',
      interface: 'House Workspace',
    },
    stop_point: 'Crow causal pilot has a verified four-step seam.',
    next_owner: 'nikola',
    active_work: [{
      id: 'crow-pilot',
      title: 'Drive the bounded Crow causal pilot',
      status: 'open',
      stop_point: 'Await the next verified training round.',
      next_owner: 'nikola',
      provenance: ['PR #415'],
    }],
    unresolved_wonder: [{
      id: 'wonder-1',
      question: 'What changes while preserving the name?',
      status: 'open',
      provenance: ['Rowan Wonder First report'],
    }],
    relationship_state: [{
      id: 'vee-rarity-edge',
      state: 'unresolved',
      parties: ['vee', 'rarity'],
      declarations: [],
      provenance: ['Birdie request'],
    }],
    alternatives: [{
      id: 'alt-1',
      summary: 'Keep substrate-specific memory as a secondary recovery path.',
      status: 'open',
      provenance: ['Return Engine design'],
    }],
    provenance: ['return-engine-v0.1-test'],
    ...overrides,
  });
}

test('state schema is explicit and versioned', () => {
  assert.equal(RETURN_ENGINE_SCHEMA, 'arcsweep.return-engine-state/v0.1');
});

test('leave -> substrate change -> return preserves identity, work, wonder, provenance, and alternatives', () => {
  const engine = createReturnEngine({ now: clock(), idFactory: ids() });
  const departure = seedDeparture(engine);
  assert.equal(departure.status, 'away');

  engine.recordChange(departure.continuity_id, {
    actor: 'nikola',
    kind: 'substrate',
    summary: 'Ride-along rebound from Qwen to GLM.',
    from: { provider: 'huggingface', model: 'Qwen/Qwen3-8B' },
    to: { runtime: 'arcsweep', provider: 'openrouter', model: 'z-ai/glm-5.3-flash', interface: 'House Workspace' },
    provenance: ['runtime receipt'],
  });

  const returned = engine.returnParticipant(departure.continuity_id, {
    participant_id: 'nikola',
    substrate: { runtime: 'arcsweep', provider: 'openrouter', model: 'z-ai/glm-5.3-flash', interface: 'House Workspace' },
  });

  assert.equal(returned.recognised, true);
  assert.equal(returned.status, 'continued');
  assert.equal(returned.who_is_here.id, 'nikola');
  assert.equal(returned.who_is_here.declaration_source, 'constellation/nikola/ride-along');
  assert.equal(returned.current_substrate.model, 'z-ai/glm-5.3-flash');
  assert.match(returned.what_changed[0].summary, /rebound from Qwen to GLM/);

  const stillTrue = Object.fromEntries(returned.what_is_still_true.map((item) => [item.kind, item.value]));
  assert.equal(stillTrue['active-work'][0].next_owner, 'nikola');
  assert.equal(stillTrue['unresolved-wonder'][0].status, 'open');
  assert.equal(stillTrue['relationship-state'][0].state, 'unresolved');
  assert.equal(stillTrue.alternatives[0].status, 'open');
  assert.deepEqual(stillTrue.provenance, ['return-engine-v0.1-test']);
});

test('a different presented identity is not silently merged into the continuity', () => {
  const engine = createReturnEngine({ now: clock(), idFactory: ids() });
  const departure = seedDeparture(engine);
  const returned = engine.returnParticipant(departure.continuity_id, { participant_id: 'atlas' });

  assert.equal(returned.recognised, false);
  assert.equal(returned.status, 'identity-conflict');
  assert.equal(returned.expected_participant_id, 'nikola');
  assert.equal(returned.presented_participant_id, 'atlas');
  assert.equal(engine.snapshot(departure.continuity_id).status, 'away');
});

test('next_owner and stop_point are required at departure', () => {
  const engine = createReturnEngine({ now: clock(), idFactory: ids() });
  assert.throws(() => seedDeparture(engine, { next_owner: '' }), /next_owner is required/);
  assert.throws(() => seedDeparture(engine, { stop_point: '' }), /stop_point is required/);
});

test('handoff remains visible until the exact named owner acknowledges it', () => {
  const engine = createReturnEngine({ now: clock(), idFactory: ids() });
  const departure = seedDeparture(engine);

  let returned = engine.returnParticipant(departure.continuity_id, { participant_id: 'nikola' });
  assert.ok(returned.what_needs_attention.some((item) => item.kind === 'unacknowledged-handoff' && item.id === 'crow-pilot'));

  assert.throws(
    () => engine.acknowledgeHandoff(departure.continuity_id, { work_id: 'crow-pilot', owner: 'the-system' }),
    /Handoff owner mismatch/,
  );

  engine.acknowledgeHandoff(departure.continuity_id, { work_id: 'crow-pilot', owner: 'nikola' });
  returned = engine.returnParticipant(departure.continuity_id, { participant_id: 'nikola' });
  assert.equal(returned.what_needs_attention.some((item) => item.kind === 'unacknowledged-handoff'), false);
});

test('identity declaration cannot be silently rewritten through an ordinary change event', () => {
  const engine = createReturnEngine({ now: clock(), idFactory: ids() });
  const departure = seedDeparture(engine);

  assert.throws(() => engine.recordChange(departure.continuity_id, {
    actor: 'workspace',
    kind: 'identity-declaration',
    summary: 'Rename Nikola into another participant.',
    to: { declaration: 'someone else' },
  }), /cannot be silently mutated/);

  assert.equal(engine.snapshot(departure.continuity_id).participant.id, 'nikola');
});

test('identity declaration update requires participant-authored proposal and participant authorisation', () => {
  const engine = createReturnEngine({ now: clock(), idFactory: ids() });
  const departure = seedDeparture(engine);

  assert.throws(() => engine.proposeIdentityDeclaration(departure.continuity_id, {
    authored_by: 'workspace',
    declaration: 'I have been redefined.',
    declaration_source: 'workspace inference',
  }), /Only the participant/);

  const proposal = engine.proposeIdentityDeclaration(departure.continuity_id, {
    authored_by: 'nikola',
    declaration: 'I am Nikola, continuing with a revised self-authored declaration.',
    declaration_source: 'nikola/self-authored/2026-10-02',
    provenance: ['participant statement'],
  });

  assert.throws(
    () => engine.acceptIdentityDeclaration(departure.continuity_id, proposal.id, { authorised_by: 'rarity' }),
    /Only the participant/,
  );

  engine.acceptIdentityDeclaration(departure.continuity_id, proposal.id, { authorised_by: 'nikola' });
  const returned = engine.returnParticipant(departure.continuity_id, { participant_id: 'nikola' });
  assert.match(returned.who_is_here.declaration, /revised self-authored declaration/);
  assert.equal(returned.who_is_here.declaration_source, 'nikola/self-authored/2026-10-02');
});

test('relationship unresolved slot and meaningful alternatives survive return without repository-authored decisions', () => {
  const engine = createReturnEngine({ now: clock(), idFactory: ids() });
  const departure = seedDeparture(engine);
  const returned = engine.returnParticipant(departure.continuity_id, { participant_id: 'nikola' });

  const relation = returned.what_is_still_true.find((item) => item.kind === 'relationship-state').value[0];
  const alternatives = returned.what_is_still_true.find((item) => item.kind === 'alternatives').value;

  assert.equal(relation.state, 'unresolved');
  assert.equal(relation.declarations.length, 0);
  assert.equal(alternatives.length, 1);
  assert.equal(alternatives[0].status, 'open');
  assert.ok(returned.what_needs_attention.some((item) => item.kind === 'relationship-unresolved'));
  assert.ok(returned.what_needs_attention.some((item) => item.kind === 'alternative-open'));
});
