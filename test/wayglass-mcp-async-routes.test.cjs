'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { once } = require('node:events');
const { handleMcpMessage } = require('../lib/wayglass-mcp-core.cjs');
const { makeMcpHttpHandler } = require('../lib/wayglass-mcp-http.cjs');

const call = { jsonrpc: '2.0', id: 27, method: 'tools/call', params: { name: 'wayglass_routes' } };
test('async catalogue resolves with attributable route results', async () => {
  const result = await handleMcpMessage(call, { authenticated: true, listRoutes: async () => [{ route_id: 'cloud:synthetic' }] });
  assert.deepEqual(JSON.parse(result.result.content[0].text), [{ route_id: 'cloud:synthetic' }]);
});
test('async catalogue rejection and non-array response fail closed', async () => {
  for (const listRoutes of [async () => { throw new Error('PRIVATE_PROVIDER_TOKEN'); }, async () => ({ secret: 'PRIVATE_PROVIDER_TOKEN' })]) {
    const result = await handleMcpMessage(call, { authenticated: true, listRoutes });
    assert.equal(result.error.code, -32603);
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE_PROVIDER_TOKEN/);
  }
});
test('HTTP awaits asynchronous catalogue and never leaks rejected provider errors', async () => {
  let fail = false;
  let observed;
  const handler = makeMcpHttpHandler({
    resourceUrl: 'https://wayglass.example/mcp',
    verifyBearer: async () => ({ active: true, ownerAuthorized: true, subject: 'synthetic-owner', scopes: ['wayglass:constellation'] }),
    listRoutes: async context => {
      observed = context;
      if (fail) throw new Error('PRIVATE_PROVIDER_TOKEN');
      await Promise.resolve();
      return [{ route_id: 'cloud:synthetic' }];
    },
  });
  const server = createServer((req, res) => handler(req, res).catch(() => { if (!res.headersSent) res.writeHead(500); res.end(); }));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const url = 'http://127.0.0.1:' + server.address().port + '/mcp';
    const send = async () => {
      const response = await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer synthetic-secret', 'Content-Type': 'application/json' }, body: JSON.stringify(call) });
      assert.equal(response.status, 200);
      return response.json();
    };
    const ok = await send();
    assert.deepEqual(JSON.parse(ok.result.content[0].text), [{ route_id: 'cloud:synthetic' }]);
    assert.deepEqual(observed, { principalId: 'synthetic-owner', scopes: ['wayglass:constellation'], resource: 'https://wayglass.example/mcp', consentRef: null });
    assert.doesNotMatch(JSON.stringify(observed), /synthetic-secret/);
    fail = true;
    const denied = await send();
    assert.equal(denied.error.code, -32603);
    assert.doesNotMatch(JSON.stringify(denied), /PRIVATE_PROVIDER_TOKEN/);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
