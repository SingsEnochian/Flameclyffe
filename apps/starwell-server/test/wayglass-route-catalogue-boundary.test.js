'use strict';

// Characterization of the actual native router, NOT an owner-auth acceptance
// test. A 200 here records an unguarded application boundary. Outer ingress
// policy is outside this isolated loopback harness.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');
const router = require('../wayglass/router');

test('native catalogue currently admits anonymous and invalid credentials at the application boundary', async () => {
  const app = express();
  app.use('/api/v1/wayglass', router);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}/api/v1/wayglass/routes`;
  try {
    let baseline;
    const cases = [
      ['anonymous', {}],
      ['invalid bearer', { authorization: 'Bearer synthetic-invalid' }],
      ['invalid House session', { cookie: 'house_session=synthetic-invalid' }],
      ['unverified Access assertion', { 'cf-access-jwt-assertion': 'synthetic-invalid' }],
      ['caller-declared owner/project', { 'x-owner-authorized': 'true', 'x-project-id': 'synthetic-project' }],
    ];
    for (const [name, headers] of cases) {
      const response = await fetch(url, { headers });
      assert.equal(response.status, 200, `${name}: characterize current exposure; do not call this auth protection`);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const body = await response.json();
      assert.equal(body.schema, 'wayglass.route-catalogue/v0.1');
      assert.ok(Array.isArray(body.routes) && body.routes.length > 0);
      if (!baseline) baseline = body;
      else assert.deepEqual(body, baseline, `${name}: supplied claims do not change catalogue behavior`);
      assert.doesNotMatch(JSON.stringify(body), /synthetic-invalid|synthetic-project/);
    }
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
