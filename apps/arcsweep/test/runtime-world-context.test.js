import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRuntimeWorldContext, RUNTIME_WORLD_CONTEXT_SCHEMA } from '../src/runtime-world-context.js';

const T0 = '2026-08-20T20:30:00.000Z';
const T1 = '2026-08-20T20:31:00.000Z';

function state() {
  return {
    activeWorldId: 'terra-prime',
    worlds: [{
      id: 'terra-prime',
      name: 'Terra Prime',
      kind: 'Waking World',
      description: 'Current lived reality.',
      history: 'Birth world continuity.',
      rules: 'Preserve recorded provenance.',
      parentWorldId: null,
      parentSeedFingerprint: '',
      worldseedFingerprint: 'seed-terra-prime',
      descendantWorldIds: ['moon-hearth'],
      lineageLabel: 'Root world',
      branchPoint: '',
      forkReason: '',
      arrival: { location: 'St. Augustine', context: 'Current reality', orientation: 'Oriented and present.' },
      identity: { name: 'Rowan', pronouns: 'she/her', roles: 'Steward', form: 'human' },
    }],
    worldBirthReceipts: [{
      schema: 'arcsweep.world-birth-receipt/v1',
      version: 1,
      event: 'WORLD_BORN',
      id: 'world-born:terra-prime:origin',
      bornAt: '2026-08-19T00:00:00.000Z',
      worldId: 'terra-prime',
      source: 'world-registry',
      sourceRef: 'registry:create',
    }],
  };
}

test('mints a fingerprinted runtime context from the active World and its root receipt', async () => {
  const context = await buildRuntimeWorldContext(state(), 'terra-prime', T0);
  assert.equal(context.schema, RUNTIME_WORLD_CONTEXT_SCHEMA);
  assert.equal(context.active_world_id, 'terra-prime');
  assert.equal(context.world.name, 'Terra Prime');
  assert.equal(context.identity_anchor.world_birth_receipt_id, 'world-born:terra-prime:origin');
  assert.equal(context.identity_anchor.worldseed_fingerprint, 'seed-terra-prime');
  assert.equal(context.authored_context.arrival.location, 'St. Augustine');
  assert.equal(context.authority.model_may_rewrite_world_identity, false);
  assert.match(context.context_fingerprint, /^[0-9a-f]{64}$/);
  assert.match(context.context_id, /^runtime-world:terra-prime:/);
  assert.equal(Object.isFrozen(context), true);
});

test('context fingerprint is stable across mint times when World state is unchanged', async () => {
  const first = await buildRuntimeWorldContext(state(), 'terra-prime', T0);
  const second = await buildRuntimeWorldContext(state(), 'terra-prime', T1);
  assert.equal(first.context_fingerprint, second.context_fingerprint);
  assert.equal(first.context_id, second.context_id);
  assert.notEqual(first.minted_at, second.minted_at);
});

test('changing authored World context changes the runtime fingerprint', async () => {
  const original = state();
  const changed = state();
  changed.worlds[0].rules = 'A changed world law.';
  const first = await buildRuntimeWorldContext(original, 'terra-prime', T0);
  const second = await buildRuntimeWorldContext(changed, 'terra-prime', T0);
  assert.notEqual(first.context_fingerprint, second.context_fingerprint);
});
