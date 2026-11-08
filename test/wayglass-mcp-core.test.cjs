'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { handleMcpMessage } = require('../lib/wayglass-mcp-core.cjs');

test('rejects unauthenticated callers before advertising tools', () => {
  const r = handleMcpMessage({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
  assert.equal(r.error.code, -32001);
});
test('initializes an authenticated MCP session', () => {
  const r = handleMcpMessage({ jsonrpc: '2.0', id: 2, method: 'initialize' }, { authenticated: true });
  assert.equal(r.result.serverInfo.name, 'wayglass');
  assert.ok(r.result.capabilities.tools);
});
test('lists only explicitly implemented tools', () => {
  const r = handleMcpMessage({ jsonrpc: '2.0', id: 3, method: 'tools/list' }, { authenticated: true });
  assert.deepEqual(r.result.tools.map(t => t.name), ['wayglass_routes']);
});
test('returns routes only from the injected service', () => {
  const r = handleMcpMessage({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'wayglass_routes' } },
    { authenticated: true, listRoutes: () => [{ route_id: 'test:route' }] });
  assert.deepEqual(JSON.parse(r.result.content[0].text), [{ route_id: 'test:route' }]);
});
test('rejects unknown methods and malformed requests', () => {
  assert.equal(handleMcpMessage({ jsonrpc: '2.0', id: 5, method: 'missing' }, { authenticated: true }).error.code, -32601);
  assert.equal(handleMcpMessage({ id: 6, method: 'initialize' }, { authenticated: true }).error.code, -32600);
});

test('route provider exceptions fail closed without leaking secrets', () => {
  const r = handleMcpMessage({ jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'wayglass_routes' } },
    { authenticated: true, listRoutes: () => { throw new Error('secret-provider-token'); } });
  assert.equal(r.error.code, -32603);
  assert.doesNotMatch(JSON.stringify(r), /secret-provider-token/);
});
