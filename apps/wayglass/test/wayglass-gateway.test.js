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


test('double-Möbius runtime endpoint is House-gated and preserves the host crossing verdict', async () => {
  let count = 0;
  const fetchImpl = async (url, options) => {
    count++;
    assert.equal(url, 'https://host.example/api/v1/wayglass/kernel/double-mobius');
    assert.equal(options.headers.authorization, 'Bearer fixture-host-token');
    return Response.json({ schema: 'wayglass.gateway-double-mobius/v0.1',
      status: 'completed-in-memory', return_verification: { verdict: 'accepted' } });
  };
  const request = () => new Request('https://preview.example/api/v1/wayglass/kernel/double-mobius', {
    method: 'POST', body: '{}',
  });
  const rejected = createWayglassGatewayHandler({ env, fetchImpl, authorise: () => false });
  assert.equal((await rejected(request())).status, 401);
  assert.equal(count, 0);
  const accepted = createWayglassGatewayHandler({ env, fetchImpl, authorise: () => true });
  const response = await accepted(request());
  assert.equal(response.status, 200);
  assert.equal((await response.json()).return_verification.verdict, 'accepted');
  assert.equal(count, 1);
  assert.equal((await accepted(new Request('https://preview.example/api/v1/wayglass/kernel/double-mobius', { method: 'DELETE' }))).status, 405);
});


test('Wyrdrune score route requires House auth and cannot be used for unrelated HTTP methods', async () => {
  let called=0;
  const fetchImpl=async()=>{called++;return Response.json({status:'scored'});};
  const url='https://preview.example/api/v1/wayglass/wyrdrune/story-soundscape';
  const make=()=>new Request(url,{method:'POST',body:'{}'});
  const denied=createWayglassGatewayHandler({env,fetchImpl,authorise:()=>false});
  assert.equal((await denied(make())).status,401);
  assert.equal(called,0);
  const allowed=createWayglassGatewayHandler({env,fetchImpl,authorise:()=>true});
  assert.equal((await allowed(make())).status,200);
  assert.equal((await allowed(new Request(url))).status,405);
  assert.equal(called,1);
});

test('full-spectrum composition cannot be reached without the House session',async()=>{
  let called=0;
  const url='https://preview.example/api/v1/wayglass/wyrdrune/full-spectrum';
  const fetchImpl=async ()=>{called++;return Response.json({schema:'wayglass.full-spectrum/v0.1'});};
  const request=()=>new Request(url,{method:'POST',body:JSON.stringify({events:[]})});
  assert.equal((await createWayglassGatewayHandler({env,fetchImpl,authorise:()=>false})(request())).status,401);
  assert.equal(called,0);
  const allowed=createWayglassGatewayHandler({env,fetchImpl,authorise:()=>true});
  assert.equal((await allowed(request())).status,200);
  assert.equal((await allowed(new Request(url))).status,405);
  assert.equal(called,1);
});


test('Resonance Atlas only crosses the authenticated House gateway as a numeric POST',async()=>{
 let called=0;
 const endpoint='https://preview.example/api/v1/wayglass/wyrdrune/resonance-atlas';
 const fetchImpl=async()=>{called++;return Response.json({schema:'wayglass.resonance-atlas/v0.1'});};
 const request=()=>new Request(endpoint,{method:'POST',body:JSON.stringify({scales:{instant:.5}})});
 const denied=createWayglassGatewayHandler({env,fetchImpl,authorise:()=>false});
 assert.equal((await denied(request())).status,401);
 assert.equal(called,0);
 const allowed=createWayglassGatewayHandler({env,fetchImpl,authorise:()=>true});
 assert.equal((await allowed(request())).status,200);
 assert.equal((await allowed(new Request(endpoint))).status,405);
 assert.equal(called,1);
});


test('native Wyrdrune Living Learning is behind the House Steward gateway',async()=>{
 const url='https://preview.example/api/v1/wayglass/wyrdrune/living-learning';
 let forwards=0;
 const fetchImpl=async()=>{forwards++;return Response.json({status:'wyrdrune-returned'});};
 const request=()=>new Request(url,{method:'POST',body:JSON.stringify({learning:{}})});
 assert.equal((await createWayglassGatewayHandler({env,fetchImpl,authorise:()=>false})(request())).status,401);
 assert.equal(forwards,0);
 const allowed=createWayglassGatewayHandler({env,fetchImpl,authorise:()=>true});
 assert.equal((await allowed(request())).status,200);
 assert.equal((await allowed(new Request(url))).status,405);
 assert.equal(forwards,1);
});
