import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createRequire } from 'node:module';
import { verifyShipwideFeedback } from '../src/shipwide-feedback.js';
const require = createRequire(import.meta.url);
const { createWyrdruneProjection } = require('../../../lib/wayglass-wyrdrune-engine.cjs');

test('browser admits WTL audio and video proposals bound to one Observer reading', async () => {
  const project = createWyrdruneProjection('shipwide-feedback.wtl', {
    observed: 'number', changed: 'number', missing: 'number', channels: 'number',
    checkpoint: 'text', feedback: 'text',
  });
  const { output, receipt } = await project({
    observed: 2, changed: 3, missing: 3, channels: 6, checkpoint: 'checkpoint', feedback: 'digest',
  });
  const packet = { schema: 'wayglass.shipwide-feedback/v0.1', plan: output, wtl: receipt };
  const frame = await verifyShipwideFeedback(packet, 'checkpoint', 'digest', webcrypto);
  assert.equal(frame.audio.counterpartHz, 242);
  assert.match(frame.video, /transition/);
  await assert.rejects(verifyShipwideFeedback(packet, 'different', 'digest', webcrypto), /Observer evidence/);
  await assert.rejects(verifyShipwideFeedback({
    ...packet, plan: { ...output, agents: 'altered' },
  }, 'checkpoint', 'digest', webcrypto), /Observer evidence/);
});

test('same-tab reload restores a verified plan and discards an altered cached proposal', async () => {
  const { createShipwideFeedbackStore, SHIPWIDE_RETURN_KEY } = await import('../src/shipwide-feedback.js');
  const values = new Map();
  const storage = () => ({
    getItem: key => values.get(key),
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  });
  const create = () => createShipwideFeedbackStore({ storage, cryptoImpl: webcrypto });
  const { output, receipt } = await createWyrdruneProjection('shipwide-feedback.wtl', {
    observed: 'number', changed: 'number', missing: 'number', channels: 'number', checkpoint: 'text', feedback: 'text',
  })({ observed: 2, changed: 3, missing: 3, channels: 6, checkpoint: 'checkpoint', feedback: 'digest' });
  const packet = { schema: 'wayglass.shipwide-feedback/v0.1', plan: output, wtl: receipt };
  const first = create();
  const admitted = await first.admit(packet, 'checkpoint', 'digest');
  assert.deepEqual(await create().restore(), admitted);
  const altered = JSON.parse(values.get(SHIPWIDE_RETURN_KEY));
  altered.value.plan.video = 'unverified';
  values.set(SHIPWIDE_RETURN_KEY, JSON.stringify(altered));
  assert.equal(await create().restore(), null);
  first.clear();
  assert.equal(values.has(SHIPWIDE_RETURN_KEY), false);
});

test('held or superseded admission cannot publish a late Return', async () => {
  const { createShipwideFeedbackStore } = await import('../src/shipwide-feedback.js');
  const { digestWce1 } = await import('../src/wyrdrune-proof.js');
  const plan = {
    provenance: { checkpoint: 'c', feedback: 'd' },
    audio: { rootHz: 176, counterpartHz: 220, foregroundGain: 0.012, atmosphereGain: 0.004 },
    video: 'Hold', engineering: 'review', agents: 'inquire',
  };
  const packet = { schema: 'wayglass.shipwide-feedback/v0.1', plan,
    wtl: { outputDigest: await digestWce1(plan, webcrypto) } };
  const store = createShipwideFeedbackStore({ storage: () => null, cryptoImpl: webcrypto });
  assert.equal(await store.admit(packet, 'c', 'd', { stopped: () => true }), null);
  const pending = store.admit(packet, 'c', 'd');
  store.clear();
  assert.equal(await pending, null);
  assert.equal(await store.restore(), null);
  assert.equal((await store.admit(packet, 'c', 'd')).video, 'Hold');
});
