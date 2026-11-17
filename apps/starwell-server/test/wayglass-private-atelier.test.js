'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const express = require('express');
const { createWayglassRouter } = require('../wayglass/router');

const choice = {
  choice: 'shape', title: 'Copper tide', note: 'I am keeping a little pigment for tomorrow.',
  light: '#81d8bc', current: 0.35,
  plumes: [{ colour: '#c46c4f', x: 0, y: 1.3, z: 0, radius: 0.55, density: 0.9, buoyancy: -0.3 }],
  stains: [{ colour: '#63867f', x: 0.5, z: 0.4, radius: 0.4 }],
};

test('private atelier changes only from a valid dedicated ship response and recovers after restart', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'wayglass-atelier-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const token = 'fixture-private-atelier-only';
  const before = { ...process.env };
  process.env.ARCSWEEP_RUNTIME_TOKEN = token;
  process.env.WAYGLASS_SHIP_MODEL = 'private-atelier-fixture';
  process.env.WAYGLASS_OLLAMA_URL = 'http://127.0.0.1:11434/api/chat';
  t.after(() => {
    for (const key of ['ARCSWEEP_RUNTIME_TOKEN', 'WAYGLASS_SHIP_MODEL', 'WAYGLASS_OLLAMA_URL']) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
  });
  const requests = [];
  let output = choice;
  async function start() {
    const app = express();
    app.use(express.json());
    app.use('/atelier', createWayglassRouter({ atelierDirectory: directory, async fetchImpl(url, options) {
      requests.push({ url, options });
      return { ok: true, json: async () => ({ message: { content: JSON.stringify(output) } }) };
    } }));
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => {
      server.closeAllConnections();
      return new Promise(resolve => server.close(resolve));
    });
    return (payload, auth = true) => fetch(`http://127.0.0.1:${server.address().port}/atelier/private-atelier${payload ? '/invite' : ''}`, {
      method: payload ? 'POST' : 'GET',
      headers: { ...(auth ? { authorization: 'Bearer ' + token } : {}), 'content-type': 'application/json' },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    });
  }
  const request = await start();
  assert.equal((await request(null, false)).status, 401);
  assert.equal((await request({ expected_head: null }, false)).status, 401);
  assert.equal((await request({ expected_head: null, ...choice })).status, 400);
  assert.equal((await (await request()).json()).head, null);
  assert.equal(requests.length, 0);
  const response = await request({ expected_head: null });
  const saved = await response.json();
  assert.equal(response.status, 200, JSON.stringify(saved));
  assert.deepEqual(saved.scene, choice);
  assert.equal(saved.receipt.participant_id, 'wayglass');
  assert.equal(saved.receipt.route_id, 'wayglass:ship');
  assert.equal(saved.receipt.model, 'private-atelier-fixture');
  assert.equal(requests[0].url, 'http://127.0.0.1:11434/api/chat');
  assert.equal(requests[0].options.redirect, 'error');
  assert.equal(JSON.parse(requests[0].options.body).format, 'json');
  assert.equal((await request({ expected_head: null })).status, 409);
  assert.equal(requests.length, 1);
  output = { choice: 'pass', note: 'I want to leave the water still.' };
  const passed = await (await request({ expected_head: saved.head })).json();
  assert.equal(passed.decision.choice, 'pass');
  assert.equal(passed.head, saved.head);
  output = { ...choice, plumes: [{ ...choice.plumes[0], density: 12 }] };
  assert.equal((await request({ expected_head: saved.head })).status, 422);
  process.env.WAYGLASS_OLLAMA_URL = 'http://example.invalid/api/chat';
  assert.equal((await request({ expected_head: saved.head })).status, 503);
  assert.equal(requests.length, 3);
  const restarted = await start();
  assert.deepEqual(await (await restarted()).json(), saved);
});
