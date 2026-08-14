import test from 'node:test';
import assert from 'node:assert/strict';
import { authoriseHouseRequest, houseSessionCookie, issueHouseSession, validateStewardCredential, verifyHouseSessionToken } from '../../../netlify/functions/_shared/house-session.mjs';
import { connectHouseRuntime, disconnectHouseRuntime, HOUSE_COOKIE_SESSION, readHouseObservations, restoreHouseRuntimeSession } from '../src/house-runtime.js';

const env = (values) => ({ get: (name) => values[name] });

test('broker issues an expiring signed Steward session and rejects tampering', () => {
  const runtime = env({ ARCSWEEP_STEWARD_KEY: 'door-key', HOUSE_SESSION_SECRET: 'signing-key' });
  assert.equal(validateStewardCredential('door-key', runtime), true);
  const issued = issueHouseSession(runtime, 1_000_000);
  assert.equal(verifyHouseSessionToken(issued.token, runtime, 1_000_001)?.role, 'steward');
  assert.equal(verifyHouseSessionToken(`${issued.token}x`, runtime, 1_000_001), null);
  assert.equal(verifyHouseSessionToken(issued.token, runtime, (issued.claims.exp + 1) * 1000), null);
});

test('sealed cookie authenticates House requests while bearer remains available to native clients', () => {
  const runtime = env({ ARCSWEEP_RUNTIME_TOKEN: 'native-key', HOUSE_SESSION_SECRET: 'signing-key' });
  const issued = issueHouseSession(runtime);
  const cookie = houseSessionCookie(new Request('https://house.example/session'), issued.token, issued.ttl).split(';')[0];
  assert.equal(authoriseHouseRequest(new Request('https://house.example/api', { headers: { cookie } }), runtime)?.mode, 'session');
  assert.equal(authoriseHouseRequest(new Request('https://house.example/api', { headers: { authorization: 'Bearer native-key' } }), runtime)?.mode, 'bearer');
});

test('browser exchanges the credential and retains only the opaque cookie-session state', async () => {
  const calls = [];
  const fetchImpl = async (_url, options = {}) => {
    calls.push(options);
    return new Response(JSON.stringify({ connected: true }), { status: options.method === 'POST' ? 201 : 200, headers: { 'content-type': 'application/json' } });
  };
  assert.equal(await connectHouseRuntime('door-key', { hosted: true, storage: null, fetchImpl }), HOUSE_COOKIE_SESSION);
  assert.equal(await restoreHouseRuntimeSession(fetchImpl), HOUSE_COOKIE_SESSION);
  await disconnectHouseRuntime({ hosted: true, storage: null, fetchImpl });
  assert.deepEqual(calls.map((call) => call.method || 'GET'), ['POST', 'GET', 'DELETE']);
  assert.ok(calls.every((call) => call.credentials === 'same-origin'));
});

test('every House surface reads the same world-scoped observation endpoint', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ schema: 'hearthgate.runtime-observation-live-read/v1', snapshots: [] }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const live = await readHouseObservations(HOUSE_COOKIE_SESSION, 'terra-aeterna', fetchImpl);
  assert.equal(live.schema, 'hearthgate.runtime-observation-live-read/v1');
  assert.equal(calls[0].url, '/api/v1/house/observations?world_id=terra-aeterna');
  assert.equal(calls[0].options.credentials, 'same-origin');
  assert.deepEqual(calls[0].options.headers, {});
});
