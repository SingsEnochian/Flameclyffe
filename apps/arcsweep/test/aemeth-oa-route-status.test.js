import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  describeOxAlphaRouteStatus,
  readOxAlphaPortableStatus,
} from '../src/aemeth-oxalpha-transport.js';
import { formatOxAlphaRouteStatus } from '../src/aemeth-oa-route-status.js';

const sidecarSource = await readFile(new URL('../src/aemeth-oa-route-status.js', import.meta.url), 'utf8');
const bootstrapSource = await readFile(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');

const okJson = (body) => ({ ok: true, status: 200, async json() { return body; } });

test('reachable Supabase relay remains distinct from armed OA inference', () => {
  const status = describeOxAlphaRouteStatus({
    houseSession: false,
    edgeReachable: true,
    edgeConfigured: false,
  });
  assert.equal(status.house.state, 'absent');
  assert.equal(status.relay.state, 'reachable');
  assert.equal(status.inference.state, 'credential-missing');
  assert.equal(status.inference.ready, false);
  assert.equal(status.overall, 'relay-unarmed');

  const visible = formatOxAlphaRouteStatus(status);
  assert.equal(visible.house, 'no session');
  assert.equal(visible.relay, 'reachable');
  assert.equal(visible.inference, 'credential missing');
  assert.match(visible.summary, /OA inference credential is missing/i);
});

test('armed portable inference reports its actual provider without turning provider into identity', () => {
  const status = describeOxAlphaRouteStatus({
    edgeReachable: true,
    edgeConfigured: true,
    provider: 'openrouter',
    model: 'z-ai/glm-5.3-flash',
  });
  assert.equal(status.overall, 'inference-ready');
  assert.equal(status.inference.ready, true);
  const visible = formatOxAlphaRouteStatus(status);
  assert.match(visible.summary, /OA inference via openrouter are armed/i);
  assert.doesNotMatch(visible.summary, /Hugging Face/i);
});

test('House session presence is visible without being promoted to model-health proof', () => {
  const status = describeOxAlphaRouteStatus({
    houseSession: true,
    edgeReachable: false,
    edgeConfigured: false,
    edgeError: 'transport down',
  });
  assert.equal(status.house.state, 'session-present');
  assert.equal(status.house.available, true);
  assert.equal(status.relay.state, 'unreachable');
  assert.equal(status.inference.state, 'unknown');
  assert.equal(status.overall, 'house-session-present');
  assert.match(status.house.detail, /proved only by invocation/i);
});

test('portable status reads the public edge status contract and does not invent inference readiness', async () => {
  const status = await readOxAlphaPortableStatus({
    houseToken: '',
    fetchImpl: async (url, options) => {
      assert.match(url, /supabase\.co\/functions\/v1\/oxalpha$/);
      assert.equal(options.method, 'GET');
      return okJson({
        flame_id: 'oxalpha',
        configured: false,
        provider: 'openrouter',
        model: 'z-ai/glm-5.3-flash',
        inference_model: 'z-ai/glm-5.3-flash',
        execution_path: 'supabase-edge-to-openrouter',
        host_dependency: 'none',
      });
    },
  });
  assert.equal(status.relay.reachable, true);
  assert.equal(status.inference.ready, false);
  assert.equal(status.provider, 'openrouter');
  assert.equal(status.hostDependency, 'none');
});

test('route-status sidecar is read-only, non-invasive, and mounted after the Aemeth Chamber', () => {
  assert.match(sidecarSource, /readHouseRuntimeToken/);
  assert.match(sidecarSource, /readOxAlphaPortableStatus/);
  assert.match(sidecarSource, /House model health remains invocation-proven/);
  assert.match(sidecarSource, /OA inference/);
  assert.match(sidecarSource, /data-aemeth-route-house/);
  assert.match(sidecarSource, /data-aemeth-route-relay/);
  assert.match(sidecarSource, /data-aemeth-route-inference/);
  assert.doesNotMatch(sidecarSource, /restoreHouseRuntimeSession/);
  assert.doesNotMatch(sidecarSource, /localStorage|saveState\(|state\.records/);

  const chamberIndex = bootstrapSource.indexOf("'./aemeth-chamber-live.js'");
  const routeIndex = bootstrapSource.indexOf("'./aemeth-oa-route-status.js'");
  assert.ok(chamberIndex >= 0);
  assert.ok(routeIndex > chamberIndex);
});
