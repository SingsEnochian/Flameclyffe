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
      ? { active: true, ownerAuthorized: true, subject: 'synthetic-owner', scopes: ['wayglass:constellation'] } : null,
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

test('explicitly revoked owner grant is denied even if stale verifier says authorized', async () => {
  let routeCalls = 0;
  const handler = makeMcpHttpHandler({
    resourceUrl: 'https://wayglass.example/mcp',
    verifyBearer: async () => ({
      active: true, ownerAuthorized: true, subject: 'synthetic-owner', revoked: true,
      scopes: ['wayglass:constellation'],
    }),
    listRoutes: () => { routeCalls++; return [{ route_id: 'private' }]; },
  });
  const server = createServer((req, res) => {
    handler(req, res).catch(() => { if (!res.headersSent) res.writeHead(500); res.end(); });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const response = await fetch('http://127.0.0.1:' + server.address().port + '/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer stale', 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'wayglass_routes' } }),
    });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(routeCalls, 0);
    assert.doesNotMatch(await response.text(), /private/);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('bounds request body bytes and rejects oversized JSON without invoking routes', async () => {
  let routeCalls = 0;
  const handler = makeMcpHttpHandler({
    resourceUrl: 'https://wayglass.example/mcp',
    verifyBearer: async () => ({
      active: true, ownerAuthorized: true, subject: 'synthetic-owner', scopes: ['wayglass:constellation'],
    }),
    listRoutes: () => { routeCalls++; return []; },
  });
  const server = createServer((req, res) => {
    handler(req, res).catch(() => { if (!res.headersSent) res.writeHead(500); res.end(); });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const url = 'http://127.0.0.1:' + server.address().port + '/mcp';
    const oversized = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', padding: 'x'.repeat(1024 * 1024) });
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: 'Bearer good', 'Content-Type': 'application/json' },
      body: oversized,
    });
    assert.equal(response.status, 413);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(routeCalls, 0);
    const valid = await fetch(url, {
      method: 'POST',
      headers: { Authorization: 'Bearer good', 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }),
    });
    assert.equal(valid.status, 200);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('rejects oversized declared Content-Length before reading a request body', async () => {
  const { request } = require('node:http');
  let routeCalls = 0;
  const handler = makeMcpHttpHandler({
    resourceUrl: 'https://wayglass.example/mcp',
    verifyBearer: async () => ({
      active: true, ownerAuthorized: true, subject: 'synthetic-owner', scopes: ['wayglass:constellation'],
    }),
    listRoutes: () => { routeCalls++; return []; },
  });
  const server = createServer((req, res) => {
    handler(req, res).catch(() => { if (!res.headersSent) res.writeHead(500); res.end(); });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const status = await new Promise((resolve, reject) => {
      const req = request({
        host: '127.0.0.1', port: server.address().port, path: '/mcp',
        method: 'POST', headers: {
          Authorization: 'Bearer good', 'Content-Type': 'application/json',
          'Content-Length': String(1024 * 1024 + 1),
        },
      }, res => {
        res.resume();
        res.on('end', () => resolve(res.statusCode));
      });
      req.on('error', reject);
      req.end();
    });
    assert.equal(status, 413);
    assert.equal(routeCalls, 0);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('resource URL cannot contain userinfo, query or fragment', () => {
  const options = { verifyBearer: async () => ({ active: true, ownerAuthorized: true, subject: 'synthetic-owner', scopes: ['wayglass:constellation'] }) };
  for (const resourceUrl of [
    'https://owner:secret@wayglass.example/mcp',
    'https://wayglass.example/mcp?token=secret',
    'https://wayglass.example/mcp#fragment',
  ]) {
    assert.throws(() => makeMcpHttpHandler({ ...options, resourceUrl }), /resource URL/);
  }
});

test('route provider exceptions fail closed without leaking secrets or crashing subsequent requests', async () => {
  let calls = 0;
  const handler = makeMcpHttpHandler({
    resourceUrl: 'https://wayglass.example/mcp',
    verifyBearer: async () => ({ active: true, ownerAuthorized: true, subject: 'synthetic-owner', scopes: ['wayglass:constellation'] }),
    listRoutes: () => {
      calls++;
      if (calls === 1) throw new Error('PRIVATE_PROVIDER_SECRET_DO_NOT_EXPOSE');
      return [{ route_id: 'recovered' }];
    },
  });
  const server = createServer((req, res) => {
    handler(req, res).catch(() => { if (!res.headersSent) res.writeHead(500); res.end(); });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const url = 'http://127.0.0.1:' + server.address().port + '/mcp';
    const send = () => fetch(url, {
      method: 'POST',
      headers: { Authorization: 'Bearer good', 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'wayglass_routes' } }),
    });
    const failed = await send();
    // The MCP core catches provider exceptions and returns a JSON-RPC error in HTTP 200.
    assert.equal(failed.status, 200);
    assert.equal(failed.headers.get('cache-control'), 'no-store');
    const failedBody = await failed.text();
    assert.doesNotMatch(failedBody, /PRIVATE_PROVIDER_SECRET_DO_NOT_EXPOSE/);
    assert.ok(JSON.parse(failedBody).error, 'MCP core must return a protocol error');
    const recovered = await send();
    assert.equal(recovered.status, 200);
    const result = await recovered.json();
    assert.deepEqual(JSON.parse(result.result.content[0].text), [{ route_id: 'recovered' }]);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('native route catalogue receives attributed owner context without bearer credentials', async () => {
  let observed;
  const handler = makeMcpHttpHandler({
    resourceUrl: 'https://wayglass.example/mcp',
    verifyBearer: async () => ({
      active: true, ownerAuthorized: true, subject: 'owner-synthetic-001',
      scopes: ['wayglass:constellation', 'wayglass:bluebird'],
    }),
    listRoutes: context => { observed = context; return []; },
  });
  const server = createServer((req, res) => {
    handler(req, res).catch(() => { if (!res.headersSent) res.writeHead(500); res.end(); });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const response = await fetch('http://127.0.0.1:' + server.address().port + '/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer synthetic-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'wayglass_routes' } }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(observed, {
      principalId: 'owner-synthetic-001',
      scopes: ['wayglass:constellation', 'wayglass:bluebird'],
      resource: 'https://wayglass.example/mcp',
    });
    assert.doesNotMatch(JSON.stringify(observed), /synthetic-secret/);
  } finally { await new Promise(resolve => server.close(resolve)); }
});


test('owner grant without attributable subject is rejected before native route access', async () => {
  let calls = 0;
  const handler = makeMcpHttpHandler({
    resourceUrl: 'https://wayglass.example/mcp',
    verifyBearer: async token => ({ active: true, ownerAuthorized: true,
      subject: token === 'blank' ? '   ' : undefined,
      scopes: ['wayglass:constellation'] }),
    listRoutes: () => { calls++; return [{ route_id: 'private' }]; },
  });
  const server = createServer((req, res) => handler(req, res));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    for (const token of ['missing', 'blank']) {
      const response = await fetch('http://127.0.0.1:' + server.address().port + '/mcp', {
        method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'wayglass_routes' } }),
      });
      assert.equal(response.status, 403);
      assert.doesNotMatch(await response.text(), /private/);
    }
    assert.equal(calls, 0);
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('rejects query variants before invoking the bearer verifier or native routes', async () => {
  let verifications = 0;
  let routes = 0;
  const handler = makeMcpHttpHandler({
    resourceUrl: 'https://wayglass.example/mcp',
    verifyBearer: async () => { verifications++; return { active: true, ownerAuthorized: true, subject: 'synthetic-owner', scopes: ['wayglass:constellation'] }; },
    listRoutes: () => { routes++; return []; },
  });
  const server = createServer((req, res) => handler(req, res));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const base = 'http://127.0.0.1:' + server.address().port;
    for (const suffix of ['/mcp?access_token=synthetic-secret', '/mcp?']) {
      const response = await fetch(base + suffix, {
        method: 'POST',
        headers: { Authorization: 'Bearer synthetic-secret', 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      });
      assert.equal(response.status, 400);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.doesNotMatch(await response.text(), /synthetic-secret/);
    }
    assert.equal(verifications, 0);
    assert.equal(routes, 0);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
