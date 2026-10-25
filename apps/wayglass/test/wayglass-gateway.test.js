import test from 'node:test';
import assert from 'node:assert/strict';
import { createWayglassGatewayHandler } from '../../../api/_shared/wayglass-gateway.mjs';

const env = { get: key => ({ HEARTHGATE_GATEWAY_URL: 'https://host.example', HEARTHGATE_GATEWAY_TOKEN: 'fixture-host-token' })[key] };
test('gateway authenticates before invoking the host and fails closed without configuration', async () => {
  let called = 0;
  const fetchImpl = async () => { called++; return Response.json({}); };
  const request = new Request('https://preview.example/api/v1/wayglass/routes');
  assert.equal((await createWayglassGatewayHandler({ env, fetchImpl, authorise: () => false })(request)).status, 401);
  assert.equal((await createWayglassGatewayHandler({ env: { get: () => null }, fetchImpl, authorise: () => true })(request)).status, 503);
  assert.equal(called, 0);
});
test('gateway preserves rejected crossings and response bodies using only server credentials', async () => {
  let sent;
  const handler = createWayglassGatewayHandler({ env, authorise: () => true, fetchImpl: async (url, options) => {
    sent = { url, options }; return Response.json({ entered: false, status: 'blocked-continuation' }, { status: 409 });
  } });
  const response = await handler(new Request('https://preview.example/api/v1/wayglass/kernel/enter', { method: 'POST', headers: { authorization: 'Bearer client-secret', cookie: 'client-cookie' }, body: JSON.stringify({ participant_id: 'rowan' }) }));
  assert.equal(response.status, 409);
  assert.equal((await response.json()).status, 'blocked-continuation');
  assert.equal(sent.url, 'https://host.example/api/v1/wayglass/kernel/enter');
  assert.equal(sent.options.headers.authorization, 'Bearer fixture-host-token');
  assert.equal(sent.options.headers.cookie, undefined);
  assert.equal(sent.options.redirect, 'error');
});
test('gateway supports authenticated inbox read/reply and rejects unknown routes and methods', async () => {
  const calls = [];
  const handler = createWayglassGatewayHandler({ env, authorise: () => true, fetchImpl: async (url, options) => { calls.push(options.method); return Response.json({ fixture: true }, { status: options.method === 'POST' ? 201 : 200 }); } });
  const url = 'https://preview.example/api/v1/wayglass/voyage/messages';
  assert.equal((await handler(new Request(url))).status, 200);
  assert.equal((await handler(new Request(url, { method: 'POST', body: '{}' }))).status, 201);
  assert.equal((await handler(new Request(url, { method: 'DELETE' }))).status, 405);
  assert.equal((await handler(new Request('https://preview.example/api/v1/wayglass/arbitrary'))).status, 404);
  assert.deepEqual(calls, ['GET', 'POST']);
});
test('oversized bodies, invalid endpoints and unreachable hosts never fall back to synthetic output', async () => {
  const request = new Request('https://preview.example/api/v1/wayglass/respond', { method: 'POST', body: 'x'.repeat(65537) });
  const handler = createWayglassGatewayHandler({ env, authorise: () => true, fetchImpl: async () => { throw new Error('offline'); } });
  assert.equal((await handler(request)).status, 413);
  assert.equal((await handler(new Request('https://preview.example/api/v1/wayglass/routes'))).status, 502);
  const invalid = createWayglassGatewayHandler({ env: { get: key => key.endsWith('URL') ? 'http://host.example' : 'fixture' }, authorise: () => true });
  assert.equal((await invalid(new Request('https://preview.example/api/v1/wayglass/routes'))).status, 503);
});
