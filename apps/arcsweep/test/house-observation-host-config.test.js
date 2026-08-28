import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveSupabaseRuntimeConfig, FLAMECLYFFE_SUPABASE_URL } from '../../../netlify/functions/_shared/supabase-runtime-config.mjs';
import { createHouseObservationRuntimeHandler } from '../../../netlify/functions/_shared/house-observation-runtime.mjs';

function rawEnv(values = {}) { return { get(name) { return values[name]; } }; }

test('hosted Supabase resolver accepts deployed service-key aliases and the canonical Flameclyffe URL', () => {
  const resolved = resolveSupabaseRuntimeConfig(rawEnv({ SUPABASE_SERVICE_KEY: 'service-secret' }));
  assert.equal(resolved.configured, true);
  assert.equal(resolved.url, FLAMECLYFFE_SUPABASE_URL);
  assert.equal(resolved.env.get('SUPABASE_SERVICE_ROLE_KEY'), 'service-secret');
});

test('observation live read does not report unconfigured when a service-key alias is present', async () => {
  const resolved = resolveSupabaseRuntimeConfig(rawEnv({ ARCSWEEP_RUNTIME_TOKEN: 'house', SUPABASE_SERVICE_KEY: 'service-secret' }));
  const fetchImpl = async () => new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  const handler = createHouseObservationRuntimeHandler({ env: resolved.env, fetchImpl, clock: () => new Date('2026-08-28T06:45:00.000Z') });
  const response = await handler(new Request('https://example.test/api/v1/house/observations?world_id=terra-prime', { headers: { authorization: 'Bearer house' } }));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.notEqual(data.error, 'House observation ledgers are not configured.');
  assert.equal(data.world_id, 'terra-prime');
});
