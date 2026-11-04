'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createServer } = require('node:http');
const { once } = require('node:events');
const { makeMcpHttpHandler } = require('../lib/wayglass-mcp-http.cjs');

async function withServer(fn) {
  const handler = makeMcpHttpHandler({
    resourceUrl: 'https://wayglass.example/mcp',
    verifyBearer: async token => token === 'good'
      ? { active: true, ownerAuthorized: true, scopes: ['wayglass:constellation'] } : null,
    listRoutes: () => [{ route_id: 'test:route' }],
  });
  const server = createServer((req, res) => { handler(req, res).catch(() => { res.writeHead(500); res.end(); }); });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try { await fn('http://127.0.0.1:' + server.address().port + '/mcp'); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
test('rejects unauthenticated requests with OAuth resource challenge', async () => withServer(async url => {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(response.status, 401);
  assert.match(response.headers.get('www-authenticate'), /oauth-protected-resource\/mcp/);
}));
test('rejects bad tokens and missing scopes', async () => withServer(async url => {
  const response = await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer bad', 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(response.status, 403);
}));
test('serves MCP initialization and route tool over HTTP', async () => withServer(async url => {
  const send = (method, params) => fetch(url, {
    method: 'POST', headers: { Authorization: 'Bearer good', 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const initialized = await (await send('initialize')).json();
  assert.equal(initialized.result.serverInfo.name, 'wayglass');
  const called = await (await send('tools/call', { name: 'wayglass_routes' })).json();
  assert.deepEqual(JSON.parse(called.result.content[0].text), [{ route_id: 'test:route' }]);
}));
test('blocks foreign browser origins', async () => withServer(async url => {
  const response = await fetch(url, { method: 'POST', headers: { Origin: 'https://attacker.example', Authorization: 'Bearer good' } });
  assert.equal(response.status, 403);
}));

test('a scoped active token without explicit owner grant cannot access MCP tools', async () => {
  const handler = makeMcpHttpHandler({
    resourceUrl: 'https://wayglass.example/mcp',
    verifyBearer: async () => ({ active: true, scopes: ['wayglass:constellation'] }),
    listRoutes: () => { throw new Error('must not reach route service'); },
  });
  const server = createServer((req, res) => { handler(req, res).catch(() => { res.writeHead(500); res.end(); }); });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const response = await fetch('http://127.0.0.1:' + server.address().port + '/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer scoped', 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  } finally { await new Promise(resolve => server.close(resolve)); }
});
