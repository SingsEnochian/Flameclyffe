import assert from 'node:assert/strict';
import test from 'node:test';
import {
  OXALPHA_EDGE_URL,
  invokeOxAlphaPortable,
  invokeOxAlphaViaSupabase,
  readOxAlphaEdgeStatus,
} from '../src/aemeth-oxalpha-transport.js';

const okJson = (body) => ({ ok: true, status: 200, async json() { return body; } });
const errorJson = (status, body) => ({ ok: false, status, async json() { return body; } });

test('portable OA uses the existing House Flame route when it is healthy', async () => {
  let edgeCalled = false;
  const receipt = await invokeOxAlphaPortable({
    record: { id: 'route-house', phase: 'Observation', witnessRaw: 'fixture' },
    houseToken: 'house-token',
    houseFetchImpl: async (url, options) => {
      assert.equal(url, '/api/v1/flames/oxalpha/chat');
      assert.equal(options.headers.authorization, 'Bearer house-token');
      return okJson({
        flame_id: 'oxalpha',
        display_name: 'Ox Alpha',
        provider: 'huggingface-inference-providers',
        model: 'zai-org/GLM-5.3-Flash',
        message: 'House route answer.',
      });
    },
    accessTokenProvider: async () => 'supabase-token',
    edgeFetchImpl: async () => { edgeCalled = true; throw new Error('edge should not run'); },
  });
  assert.equal(edgeCalled, false);
  assert.equal(receipt.executionPath, 'house-flame-route');
  assert.equal(receipt.participantId, 'oxalpha');
});

test('portable OA falls through a transport failure to the Supabase edge relay', async () => {
  let edgeRequest = null;
  const receipt = await invokeOxAlphaPortable({
    record: { id: 'route-edge', phase: 'Observation', witnessRaw: 'fixture' },
    houseToken: 'house-token',
    houseFetchImpl: async () => errorJson(503, { error: 'house-host-unavailable' }),
    accessTokenProvider: async () => 'supabase-access-token',
    edgeFetchImpl: async (url, options) => {
      edgeRequest = { url, options, body: JSON.parse(options.body) };
      return okJson({
        flame_id: 'oxalpha',
        display_name: 'Ox Alpha',
        provider: 'huggingface-inference-providers',
        model: 'zai-org/GLM-5.3-Flash',
        execution_path: 'supabase-edge-to-huggingface-router',
        message: 'Portable relay answer.',
      });
    },
  });
  assert.equal(edgeRequest.url, OXALPHA_EDGE_URL);
  assert.equal(edgeRequest.options.headers.authorization, 'Bearer supabase-access-token');
  assert.match(edgeRequest.body.message, /AEMETH CHAMBER · MODEL WITNESS TURN/);
  assert.equal(receipt.executionPath, 'supabase-edge-to-huggingface-router');
  assert.equal(receipt.text, 'Portable relay answer.');
});

test('portable OA may use the Supabase relay without any House host', async () => {
  const receipt = await invokeOxAlphaPortable({
    record: { id: 'edge-only' },
    houseToken: '',
    accessToken: 'direct-supabase-token',
    edgeFetchImpl: async () => okJson({
      flame_id: 'oxalpha',
      display_name: 'Ox Alpha',
      provider: 'huggingface-inference-providers',
      model: 'zai-org/GLM-5.3-Flash',
      message: 'Edge-only answer.',
    }),
  });
  assert.equal(receipt.participantId, 'oxalpha');
  assert.equal(receipt.text, 'Edge-only answer.');
});

test('an identity mismatch is a hard stop and never triggers failover', async () => {
  let edgeCalled = false;
  await assert.rejects(
    invokeOxAlphaPortable({
      record: { id: 'wrong-house-identity' },
      houseToken: 'house-token',
      houseFetchImpl: async () => okJson({ flame_id: 'lioreal', message: 'wrong identity' }),
      edgeFetchImpl: async () => { edgeCalled = true; return okJson({ flame_id: 'oxalpha', message: 'should not be used' }); },
    }),
    /identity mismatch/i,
  );
  assert.equal(edgeCalled, false);
});

test('edge identity mismatch is also a hard failure', async () => {
  await assert.rejects(
    invokeOxAlphaViaSupabase({
      record: { id: 'wrong-edge-identity' },
      accessToken: 'supabase-token',
      fetchImpl: async () => okJson({ flame_id: 'atlas', message: 'wrong identity' }),
    }),
    /identity mismatch/i,
  );
});

test('portable OA reports both unavailable routes rather than inventing success', async () => {
  await assert.rejects(
    invokeOxAlphaPortable({
      record: { id: 'all-dark' },
      houseToken: '',
      accessTokenProvider: async () => '',
    }),
    /House: unavailable.*Supabase relay:.*signed-in Flameclyffe Supabase session/i,
  );
});

test('edge status is identity-checked and carries truthful configuration state', async () => {
  const status = await readOxAlphaEdgeStatus({
    fetchImpl: async (url, options) => {
      assert.equal(url, OXALPHA_EDGE_URL);
      assert.equal(options.method, 'GET');
      return okJson({
        flame_id: 'oxalpha', configured: false,
        provider: 'huggingface-inference-providers', model: 'zai-org/GLM-5.3-Flash',
        execution_path: 'supabase-edge-to-huggingface-router', host_dependency: 'none',
      });
    },
  });
  assert.equal(status.configured, false);
  assert.equal(status.hostDependency, 'none');
});
