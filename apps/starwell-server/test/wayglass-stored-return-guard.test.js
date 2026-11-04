'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const { createWayglassRouter, verifyStoredReturn } = require('../wayglass/router.js');
const { createWayglassDeparture } = require('../../../lib/wayglass-stop-receipt.cjs');
const { createDepartureStore } = require('../../../lib/wayglass-departure-store.cjs');

function departureFixture() {
  return createWayglassDeparture({
    receipt_id: 'nikola-host-resume-stop',
    packet_id: 'nikola-host-resume-packet',
    world_id: 'wayglass:nikola-research',
    participant_id: 'nikola',
    stopped_at: '2026-11-04T05:00:00.000Z',
    identity_declarations: [{
      participant_id: 'nikola',
      continuity_ref: 'wayglass:nikola-research',
      source_ref: 'profiles/crow-trainer/NIKOLA_DRIVER.md',
    }],
    active_work: [{ path: 'docs/wayglass/current.json', hash: 'verified-roadmap', next_action: 'inspect-existing-pr' }],
    unresolved_wonder_questions: ['What is the next reproducible experiment?'],
    provenance_refs: ['docs/wayglass/current.json', 'profiles/crow-trainer/NIKOLA_DRIVER.md'],
    stop_point: 'Read verified roadmap and act on the next active work item.',
    next_owner: 'nikola',
    revoked_refs: ['nikola:discarded-observation'],
  });
}

function tempStore(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nikola-wayglass-return-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return createDepartureStore({ directory });
}

async function serve(t, store, onProvider) {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/wayglass', createWayglassRouter({
    departureStore: store,
    fetchImpl: async (url, options) => {
      onProvider(url, options);
      return new Response(JSON.stringify({ message: { content: 'The recorded work is still open.' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  }));
  const server = await new Promise((resolve, reject) => {
    const socket = app.listen(0, '127.0.0.1', () => resolve(socket));
    socket.once('error', reject);
  });
  t.after(() => new Promise(resolve => server.close(resolve)));
  return 'http://127.0.0.1:' + server.address().port;
}

test('Nikola: host only delivers a verified stored return to the model and exposes receipt', async t => {
  const store = tempStore(t);
  const departure = departureFixture();
  const id = store.save(departure).storage_id;
  const observed = [];
  const origin = await serve(t, store, (...args) => observed.push(args));
  const response = await fetch(origin + '/api/v1/wayglass/respond', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      route_id: 'local:ollama', input: 'Resume the recorded work.',
      checkpoint_storage_id: id,
      checkpoint_world_id: departure.world_id,
      checkpoint_participant_id: departure.participant_id,
    }),
  });
  const result = await response.json();
  assert.equal(response.status, 200, JSON.stringify(result));
  assert.equal(observed.length, 1);
  assert.equal(result.receipt.checkpoint_storage_id, id);
  assert.equal(result.receipt.checkpoint_return_verified, true);
  assert.match(result.receipt.checkpoint_return_outcome_hash, /^[a-f0-9]{64}$/);
  const sent = JSON.parse(observed[0][1].body);
  assert.ok(sent.messages.some(m => String(m.content).includes('inspect-existing-pr')));
});

test('Nikola: content-addressed but semantically corrupted work is blocked before provider call', async t => {
  const store = tempStore(t);
  const source = departureFixture();
  const tampered = structuredClone(source);
  tampered.continuation_packet.active_work = [];
  const id = store.save(tampered).storage_id;
  const calls = [];
  const origin = await serve(t, store, (...args) => calls.push(args));
  const response = await fetch(origin + '/api/v1/wayglass/respond', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      route_id: 'local:ollama', input: 'Continue without checking.',
      checkpoint_storage_id: id,
      checkpoint_world_id: source.world_id,
      checkpoint_participant_id: source.participant_id,
    }),
  });
  const result = await response.json();
  assert.equal(response.status, 409, JSON.stringify(result));
  assert.equal(result.code, 'WAYGLASS_RETURN_CONTEXT_MISMATCH');
  assert.ok(result.blocking.includes('active-work-mismatch'));
  assert.equal(calls.length, 0);
  assert.throws(() => verifyStoredReturn(tampered), {
    status: 409, code: 'WAYGLASS_RETURN_CONTEXT_MISMATCH',
  });
});

test('Nikola: wrong participant binding is rejected before provider call', async t => {
  const store = tempStore(t);
  const id = store.save(departureFixture()).storage_id;
  const calls = [];
  const origin = await serve(t, store, (...args) => calls.push(args));
  const response = await fetch(origin + '/api/v1/wayglass/respond', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      route_id: 'local:ollama', input: 'Continue.',
      checkpoint_storage_id: id,
      checkpoint_world_id: 'wayglass:nikola-research',
      checkpoint_participant_id: 'rarity',
    }),
  });
  assert.notEqual(response.status, 200);
  assert.equal(calls.length, 0);
});
