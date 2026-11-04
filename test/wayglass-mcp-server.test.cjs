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
      ? { active: true, scopes: ['wayglass:constellation'] } : null,
    listRoutes: () => [{ route_id: 'test:route' }],
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    const health = await (await fetch(base + '/healthz')).json();
    assert.equal(health.service, 'wayglass-mcp');
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
  }), /verifier required/i);
});
