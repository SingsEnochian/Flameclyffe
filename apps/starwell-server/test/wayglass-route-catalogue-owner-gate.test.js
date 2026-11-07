'use strict';

// Application boundary acceptance: auth must be verified by the House module,
// not inferred from socket address, proxy headers, origin or caller-declared role.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');
const router = require('../wayglass/router');

test('route catalogue refuses unauthenticated and forged callers, then accepts verified Steward', async () => {
  const previous = process.env.ARCSWEEP_RUNTIME_TOKEN;
  const previousSecret = process.env.HOUSE_SESSION_SECRET;
  const token = 'wayglass-boundary-test-only-' + 'a'.repeat(48);
  process.env.ARCSWEEP_RUNTIME_TOKEN = token;
  delete process.env.HOUSE_SESSION_SECRET;
  const app = express();
  app.use('/api/v1/wayglass', router);
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const url = `http://127.0.0.1:${server.address().port}/api/v1/wayglass/routes`;
    const refusals = [
      ['anonymous', {}],
      ['invalid bearer', { authorization: 'Bearer invalid' }],
      ['fake House cookie', { cookie: 'hearthgate_session=invalid' }],
      ['unverified Cloudflare assertion', { 'cf-access-jwt-assertion': 'fake' }],
      ['forged owner headers', { 'x-owner-authorized': 'true', 'x-project-id': 'forged' }],
      ['forged proxy headers', { 'x-forwarded-for': '127.0.0.1', 'x-forwarded-user': 'steward' }],
    ];
    for (const [name, headers] of refusals) {
      const response = await fetch(url, { headers });
      assert.equal(response.status, 401, name);
      assert.equal(response.headers.get('cache-control'), 'no-store', name);
      assert.doesNotMatch(await response.text(), /route_id|provider|participant_id|continuity_id/, name);
    }
    const { issueHouseSession } = await import('../wayglass-runtime/house-session.mjs');
    const env = { get: name => process.env[name] };
    const issued = issueHouseSession(env);
    for (const [name, headers] of [
      ['verified bearer', { authorization: 'Bearer ' + token }],
      ['signed House cookie', { cookie: 'hearthgate_session=' + issued.token }],
    ]) {
      const response = await fetch(url, { headers });
      assert.equal(response.status, 200, name);
      const body = await response.json();
      assert.equal(body.schema, 'wayglass.route-catalogue/v0.1');
      assert.ok(Array.isArray(body.routes) && body.routes.length > 0, name);
    }
    const tampered = issued.token.slice(0, -2) + 'xx';
    const refused = await fetch(url, { headers: { cookie: 'hearthgate_session=' + tampered } });
    assert.equal(refused.status, 401, 'altered signed cookie');
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    if (previous === undefined) delete process.env.ARCSWEEP_RUNTIME_TOKEN;
    else process.env.ARCSWEEP_RUNTIME_TOKEN = previous;
    if (previousSecret === undefined) delete process.env.HOUSE_SESSION_SECRET;
    else process.env.HOUSE_SESSION_SECRET = previousSecret;
  }
});
