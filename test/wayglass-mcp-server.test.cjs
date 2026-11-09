'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { once } = require('node:events');
const { createWayglassMcpServer } = require('../lib/wayglass-mcp-server.cjs');

test('composed server serves discovery, health, protected MCP and rejects unknown paths', async () => {
  const server = createWayglassMcpServer({
    resourceUrl: 'https://wayglass.example/mcp',
    authorizationServerUrl: 'https://auth.wayglass.example',
    verifyBearer: async token => token === 'valid'
      ? { active: true, ownerAuthorized: true, subject: 'synthetic-owner', scopes: ['wayglass:constellation'] } : null,
    listRoutes: () => [{ route_id: 'test:route' }],
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    const health = await (await fetch(base + '/healthz')).json();
    assert.equal(health.service, 'wayglass-mcp');
    assert.equal(health.bearerVerifierInjected, true);
    assert.equal(health.oauthAuthorizationServerVerified, false);
    assert.equal(health.nativeRouterBound, false);
    assert.equal(health.durableReceiptsVerified, false);
    assert.equal(Object.hasOwn(health, 'oauthConfigured'), false);
    const readiness = await fetch(base + '/readyz');
    assert.equal(readiness.status, 503, 'liveness cannot masquerade as deployment readiness');
    assert.equal(readiness.headers.get('cache-control'), 'no-store');
    assert.equal((await readiness.json()).ready, false);
    const metadata = await (await fetch(base + '/.well-known/oauth-protected-resource/mcp')).json();
    assert.equal(metadata.resource, 'https://wayglass.example/mcp');
    assert.deepEqual(metadata.authorization_servers, ['https://auth.wayglass.example/']);
    const unauth = await fetch(base + '/mcp', { method: 'POST' });
    assert.equal(unauth.status, 401);
    const response = await fetch(base + '/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid', 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'wayglass_routes' } }),
    });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.deepEqual(JSON.parse(result.result.content[0].text), [{ route_id: 'test:route' }]);
    assert.equal((await fetch(base + '/not-found')).status, 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('server refuses to start without real verifier dependency', () => {
  assert.throws(() => createWayglassMcpServer({
    resourceUrl: 'https://wayglass.example/mcp',
    authorizationServerUrl: 'https://auth.wayglass.example',
  }), /verified OAuth bearer adapter required/i);
});


test('MCP gateway fails closed for revoked, inactive, wrong-scope and invalid bearers', async () => {
  const calls = [];
  const server = createWayglassMcpServer({
    resourceUrl: 'https://wayglass.example/mcp',
    authorizationServerUrl: 'https://auth.wayglass.example',
    verifyBearer: async (token, context) => {
      calls.push({ token, context });
      if (token === 'revoked') throw new Error('revoked token: secret internal detail');
      if (token === 'consent-revoked') return { active: true, ownerAuthorized: true, subject: 'synthetic-owner', consentRevoked: true, scopes: ['wayglass:constellation'] };
      if (token === 'inactive') return { active: false, scopes: ['wayglass:constellation'] };
      if (token === 'bluebird') return { active: true, scopes: ['wayglass:bluebird'] };
      if (token === 'nonowner') return { active: true, ownerAuthorized: false, scopes: ['wayglass:constellation'] };
      if (token === 'valid') return { active: true, ownerAuthorized: true, subject: 'synthetic-owner', scopes: ['wayglass:constellation'] };
      return null;
    },
    listRoutes: () => [{ route_id: 'private:test' }],
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  const request = token => fetch(base + '/mcp', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'wayglass_routes' } }),
  });
  try {
    for (const token of ['revoked', 'consent-revoked', 'inactive', 'bluebird', 'nonowner', 'unknown']) {
      const response = await request(token);
      assert.ok([401, 403].includes(response.status), token);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const text = await response.text();
      assert.doesNotMatch(text, /private:test|secret internal detail/);
    }
    const allowed = await request('valid');
    assert.equal(allowed.status, 200);
    assert.equal(calls.length, 7);
    for (const call of calls) {
      assert.equal(call.context.resource, 'https://wayglass.example/mcp');
      assert.equal(call.context.requiredScope, 'wayglass:constellation');
    }
    const wrongOrigin = await fetch(base + '/mcp', {
      method: 'POST',
      headers: {
        Origin: 'https://untrusted.example',
        Authorization: 'Bearer valid',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 8, method: 'tools/list' }),
    });
    assert.equal(wrongOrigin.status, 403);
    assert.equal(calls.length, 7, 'origin denial precedes token verification and makes no additional verifier call');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
