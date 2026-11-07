'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');
const wayglassRouter = require('../wayglass/router');

test('First Contact healthz responds without requiring owner auth or exposing route metadata', async () => {
  const app = express();
  app.use('/api/v1/wayglass', wayglassRouter);
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}/api/v1/wayglass`;
    const health = await fetch(base + '/healthz');
    assert.equal(health.status, 200);
    assert.equal(health.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await health.json(), {
      schema: 'wayglass.host-health/v0.1',
      status: 'ready',
    });
    const routes = await fetch(base + '/routes');
    assert.equal(routes.status, 401, 'process health cannot grant catalogue access');
    const body = await routes.text();
    assert.doesNotMatch(body, /route_id|participant_id|provider_id|model_id/);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});