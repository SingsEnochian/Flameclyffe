import assert from 'node:assert/strict';
import test from 'node:test';
import { createBlindReturnContext } from '../src/glyph-blind-context.js';
import { sealNarrative } from '../src/glyph-continuity.js';

test('return-side context carries the Earth seal without Earth prose', async () => {
  const earthText = 'This sentence must stay outside the return-side context.';
  const earthSeal = await sealNarrative({
    side: 'earth',
    text: earthText,
    source: 'observer-earth',
    sealedAt: '2026-08-14T06:10:00.000Z',
  });
  const context = createBlindReturnContext({ earthSeal, pairId: 'pair-1' });
  const serialised = JSON.stringify(context);
  assert.equal(context.earth.seal_id, earthSeal.seal_id);
  assert.equal(context.earth.content_hash, earthSeal.content_hash);
  assert.equal(serialised.includes(earthText), false);
  assert.equal(Object.hasOwn(context.earth, 'text'), false);
});

test('return-side context rejects a return-side seal in the Earth slot', async () => {
  const returnSeal = await sealNarrative({
    side: 'return',
    text: 'Independent return narrative.',
    sealedAt: '2026-08-14T06:11:00.000Z',
  });
  assert.throws(
    () => createBlindReturnContext({ earthSeal: returnSeal }),
    /requires an Earth-side seal/,
  );
});
