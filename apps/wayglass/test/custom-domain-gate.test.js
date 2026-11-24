import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import { createTailnetGate } from '../../../scripts/wayglass-tailnet-gate.mjs';

const environment = {
  WAYGLASS_TAILNET_ORIGIN: 'https://laptop.example.ts.net',
  WAYGLASS_ACCESS_ISSUER: 'https://example.cloudflareaccess.com',
  WAYGLASS_ACCESS_AUDIENCE: 'test-audience',
  WAYGLASS_ACCESS_OWNER_EMAIL: 'owner@example.test',
  WAYGLASS_ACCESS_PUBLIC_ORIGIN: 'https://wayglass.world',
};

test('one gateway isolates Cloudflare Access from the existing Tailscale flow', async () => {
  const observed = [];
  const upstream = http.createServer((req, res) => {
    observed.push({ url: req.url, headers: req.headers });
    res.setHeader('cache-control', 'public, max-age=60');
    res.setHeader('set-cookie', 'test=present; Path=/');
    res.end('origin');
  });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const upstreamPort = upstream.address().port;
  // Reserve an available loopback port, then release it for the gateway.
  const reservation = http.createServer();
  await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const gate = createTailnetGate({
    port, hostPort: upstreamPort, environment,
    createVerifier: () => async token => {
      if (token === 'unavailable') throw new Error('Signing keys offline');
      return token === 'signed-owner' ? { expiresAt: 123 } : null;
    },
  });
  try {
    await gate.listen();
    const probe = (path, host = 'wayglass.world', assertion) => new Promise((resolve, reject) => {
      http.get({
        host: '127.0.0.1', port, path,
        headers: { Host: host, ...(assertion ? { 'cf-access-jwt-assertion': assertion } : {}) },
      }, response => {
        response.resume();
        response.once('end', () => resolve({ status: response.statusCode, headers: response.headers }));
        response.once('error', reject);
      }).once('error', reject);
    });
    for (const assertion of [undefined, 'forged', 'unavailable']) {
      const response = await probe('/wayglass/', 'wayglass.world', assertion);
      assert.equal(response.status, 401);
      assert.equal(response.headers['x-wayglass-access-gate'], 'enabled');
    }
    assert.equal((await probe('/')).status, 401);
    assert.equal((await probe('/mcp', 'wayglass.world', 'signed-owner')).status, 404);
    assert.equal((await probe('/wayglass/%252e%252e/mcp', 'wayglass.world', 'signed-owner')).status, 404);
    assert.equal(observed.length, 0);

    const owner = await probe('/api/v1/house/session/access', 'wayglass.world', 'signed-owner');
    assert.equal(owner.status, 200);
    assert.equal(owner.headers['cache-control'], 'private, no-store');
    assert.match(owner.headers['set-cookie'][0], /; Secure$/);
    assert.equal(observed[0].headers.host, 'wayglass.world');
    assert.equal(observed[0].headers['cf-access-jwt-assertion'], 'signed-owner');

    const tailnetHost = new URL(environment.WAYGLASS_TAILNET_ORIGIN).host;
    assert.equal((await probe('/wayglass/', tailnetHost, 'forged')).status, 200);
    assert.equal(observed[1].headers.host, tailnetHost);
    assert.equal(observed[1].headers['cf-access-jwt-assertion'], undefined);
  } finally {
    await gate.close();
    await new Promise(resolve => upstream.close(resolve));
  }
});
