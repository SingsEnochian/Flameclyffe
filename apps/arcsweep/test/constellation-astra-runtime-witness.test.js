import test from 'node:test';
import assert from 'node:assert/strict';
import { witnessConstellationReplyWithAstra } from '../src/constellation-runtime-adapter.js';
import { ASTRA_SLICE_RECEIPT_SCHEMA } from '../src/architecture/astra-vertical-slice.js';

const packet = {
  requestId: 'req-runtime-witness',
  fieldContext: {
    field: { key: 'scene:body' },
    page: { worldId: 'epra-a-new-hope' },
  },
};

const voice = { voiceId: 'rarity', displayName: 'Rarity' };

test('verified Constellation reply produces an Astra runtime witness receipt without a second runtime call', async () => {
  const receipt = await witnessConstellationReplyWithAstra({
    packet,
    voice,
    reply: {
      runtimeVerified: true,
      provider: 'claude',
      model: 'runtime-model',
      profileId: 'house:rarity:claude:runtime-model',
      text: 'Observed reply.',
      worldId: 'epra-a-new-hope',
    },
    occurredAt: '2026-09-30T13:00:00.000Z',
  });

  assert.equal(receipt.schema, ASTRA_SLICE_RECEIPT_SCHEMA);
  assert.equal(receipt.granted, true);
  assert.equal(receipt.provider_descriptor.id, 'claude');
  assert.equal(receipt.presence_receipt.before.identity_id, 'rarity');
  assert.equal(receipt.presence_receipt.after.identity_id, 'rarity');
  assert.equal(receipt.presence_receipt.before.surface, 'constellation-lens');
  assert.notEqual(receipt.presence_receipt.after.identity_id, receipt.provider_descriptor.id);
  assert.equal(receipt.execution_receipt.status, 'applied');
  assert.ok(receipt.events.some((event) => event.kind === 'delta' && event.delta === 'Observed reply.'));
  assert.ok(receipt.events.some((event) => event.kind === 'done'));
  assert.equal(Object.isFrozen(receipt), true);
});

test('unverified runtime reply cannot mint an Astra witness', async () => {
  const receipt = await witnessConstellationReplyWithAstra({
    packet,
    voice,
    reply: { runtimeVerified: false, provider: 'claude', text: 'Unverified.' },
  });
  assert.equal(receipt, null);
});

test('witness receipt excludes credentials and preserves read-only authority boundary', async () => {
  const receipt = await witnessConstellationReplyWithAstra({
    packet,
    voice,
    reply: {
      runtimeVerified: true,
      provider: 'claude',
      profileId: 'house:rarity:claude:model',
      text: 'Safe reply.',
      worldId: 'epra-a-new-hope',
    },
    occurredAt: '2026-09-30T13:01:00.000Z',
  });

  const serialised = JSON.stringify(receipt);
  for (const forbidden of ['api_key', 'credentials', 'secret', 'authorization', 'house_session']) {
    assert.equal(serialised.includes(forbidden), false, `receipt leaked forbidden field: ${forbidden}`);
  }
  assert.equal(receipt.capability_decision.authority, 'read-only');
  assert.equal(receipt.presence_receipt.authority_grants.length, 0);
});
