'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const router = require('../apps/starwell-server/wayglass/router');

async function withServer(run) {
  const app = express();
  app.use('/api/v1/wayglass', router);
  const server = await new Promise(resolve => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  try {
    await run('http://127.0.0.1:' + server.address().port);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

test('project catalog HTTP response exposes declarations, not runtime authority', async () => {
  await withServer(async base => {
    const response = await fetch(base + '/api/v1/wayglass/projects');
    assert.equal(response.status, 200);
    assert.match(response.headers.get('cache-control') || '', /no-store/);
    const body = await response.json();
    assert.equal(body.schema, 'wayglass.project-federation/v1');
    assert.equal(body.authority_grant, false);
    assert.equal(body.status, 'declared-not-runtime-mounted');
    assert.ok(Array.isArray(body.projects) && body.projects.length >= 8);
    for (const project of body.projects) {
      assert.deepEqual(Object.keys(project).sort(), ['id', 'mode', 'mounted', 'role']);
      assert.equal(project.mounted, false);
    }
    assert.equal(/"root"|"credentials"|"token"|"permissions"|"access"/.test(JSON.stringify(body)), false);
  });
});

test('project catalog HTTP dispatch rejects mutation methods', async () => {
  await withServer(async base => {
    const response = await fetch(base + '/api/v1/wayglass/projects', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
    });
    assert.equal(response.status, 404);
  });
});

// Does not certify owner authentication. The router mount in server.js has
// no explicit auth middleware; verify host/edge gates independently.
