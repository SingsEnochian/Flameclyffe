import test from 'node:test';
import assert from 'node:assert/strict';
import { authoriseHouseRequest, houseSessionCookie, issueHouseSession, validateStewardCredential, verifyHouseSessionToken } from '../../../netlify/functions/_shared/house-session.mjs';
import {
  HOUSE_COOKIE_SESSION,
  connectHouseRuntime,
  disconnectHouseRuntime,
  readHouseObservations,
  restoreHouseRuntimeSession,
  reviewHouseObservation,
  startHouseBraidLiveUpdates,
} from '../src/house-runtime.js';

const env = (values) => ({ get: (name) => values[name] });

test('broker issues an expiring signed Steward session and rejects tampering', () => {
  const runtime = env({
    ARCSWEEP_STEWARD_KEY: 'door-key',
    ARCSWEEP_STEWARD_KEY_SECONDARY: 'second-door-key',
    HOUSE_SESSION_SECRET: 'signing-key',
  });
  assert.equal(validateStewardCredential('door-key', runtime), true);
  assert.equal(validateStewardCredential('second-door-key', runtime), true);
  assert.equal(validateStewardCredential('wrong-door-key', runtime), false);
  const issued = issueHouseSession(runtime, 1_000_000);
  assert.equal(verifyHouseSessionToken(issued.token, runtime, 1_000_001)?.role, 'steward');
  assert.equal(verifyHouseSessionToken(`${issued.token}x`, runtime, 1_000_001), null);
  assert.equal(verifyHouseSessionToken(issued.token, runtime, (issued.claims.exp + 1) * 1000), null);
});

test('legacy runtime token remains the Steward credential only when no explicit primary key exists', () => {
  const legacy = env({ ARCSWEEP_RUNTIME_TOKEN: 'legacy-door', HOUSE_SESSION_SECRET: 'signing-key' });
  assert.equal(validateStewardCredential('legacy-door', legacy), true);

  const explicit = env({
    ARCSWEEP_RUNTIME_TOKEN: 'native-only',
    ARCSWEEP_STEWARD_KEY: 'primary-door',
    ARCSWEEP_STEWARD_KEY_SECONDARY: 'secondary-door',
    HOUSE_SESSION_SECRET: 'signing-key',
  });
  assert.equal(validateStewardCredential('primary-door', explicit), true);
  assert.equal(validateStewardCredential('secondary-door', explicit), true);
  assert.equal(validateStewardCredential('native-only', explicit), false);
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

test('House observation review client sends an idempotent sealed Runtime Braid command', async () => {
  let sent;
  const fetchImpl = async (url, options) => {
    sent = { url, options, body: JSON.parse(options.body) };
    return new Response(JSON.stringify({ schema: 'hearthgate.runtime-braid-command-result/v1', applied: true }), { status: 201, headers: { 'content-type': 'application/json' } });
  };
  const result = await reviewHouseObservation(HOUSE_COOKIE_SESSION, 'cycle-1', 'accepted', {
    commandId: 'review-command-1',
    requestedAt: '2026-08-14T18:20:00.000Z',
  }, fetchImpl);
  assert.equal(result.applied, true);
  assert.equal(sent.url, '/api/v1/house/observations');
  assert.equal(sent.body.schema, 'hearthgate.runtime-braid-command/v1');
  assert.equal(sent.body.command_id, 'review-command-1');
  assert.equal(sent.body.decision, 'accepted');
  assert.deepEqual(sent.options.headers, { 'content-type': 'application/json' });
});

test('House Runtime client consumes private braid events and advances its resume cursor', async () => {
  const events = [];
  const states = [];
  const stream = [
    'event: ready\ndata: {"schema":"hearthgate.runtime-braid-stream/v1","cursor":4}\n\n',
    'id: 5\nevent: braid\ndata: {"event":{"event_sequence":5,"event_id":"event-5","world_id":"terra-aeterna"}}\n\n',
    'event: reconnect\ndata: {"cursor":5}\n\n',
  ].join('');
  const fetchImpl = async (url, options) => {
    assert.equal(url, '/api/v1/house/braid/stream?cursor=4&world_id=terra-aeterna');
    assert.equal(options.credentials, 'same-origin');
    return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } });
  };
  const live = startHouseBraidLiveUpdates(HOUSE_COOKIE_SESSION, {
    worldId: 'terra-aeterna',
    cursor: 4,
    reconnect: false,
    fetchImpl,
    onEvent: (event) => events.push(event),
    onState: (state) => states.push(state.state),
  });
  await live.done;
  assert.deepEqual(events.map((event) => event.event_id), ['event-5']);
  assert.equal(live.cursor, 5);
  assert.ok(states.includes('live'));
  assert.ok(states.includes('closed'));
});
