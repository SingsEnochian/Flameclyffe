import assert from 'node:assert/strict';
import test from 'node:test';
import { normaliseRuntimeWorldContext } from '../../../netlify/functions/_shared/runtime-world-context.mjs';
import {
  buildProductionSmokeWorldContext,
  productionSmokeWorldContextCore,
  sha256ProductionSmoke,
} from '../../../netlify/functions/_shared/production-smoke-world-context.mjs';

test('production smoke world context carries a canonical SHA-256 fingerprint', async () => {
  const context = await buildProductionSmokeWorldContext('2026-09-09T04:11:00.000Z');
  const expected = await sha256ProductionSmoke(productionSmokeWorldContextCore());

  assert.match(context.context_fingerprint, /^[0-9a-f]{64}$/);
  assert.equal(context.context_fingerprint, expected);
  assert.equal(context.context_id, `runtime-world:terra-prime:${expected.slice(0, 24)}`);
});

test('production smoke world context is accepted by the server runtime contract', async () => {
  const context = await buildProductionSmokeWorldContext('2026-09-09T04:11:00.000Z');
  const normalised = normaliseRuntimeWorldContext({
    metadata: { world_id: 'terra-prime', world_context: context },
  });

  assert.equal(normalised.identity_anchor.world_id, 'terra-prime');
  assert.equal(normalised.world.name, 'Terra Prime');
  assert.equal(normalised.context_fingerprint, context.context_fingerprint);
});
