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
