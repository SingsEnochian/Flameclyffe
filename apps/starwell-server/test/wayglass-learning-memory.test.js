'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const { createWayglassRouter } = require('../wayglass/router');
const { createLineageStore } = require('../wayglass-runtime/wayglass-lineage-store.cjs');

const body = n => ({ learning: { atlas: { coherence: 0.7, interference: 0.3, bloom: 0.6, granulation: 0.5, flow: 0.7 },
  interior: { energy: 0.4, curiosity: 0.6, uncertainty: 0.5, coherence: 0.6, previous_resonance: 0.7 },
  source: { event_id: 'ui-memory-route-' + n, atlas_input_hash: String(n % 10).repeat(64), atlas_program_hash: 'b'.repeat(64) } } });

test('Living Learning returns are remembered by the Return Engine and read back verified, Steward only', async () => {
  const previous = process.env.ARCSWEEP_RUNTIME_TOKEN; const token = 'memory-test-' + 'x'.repeat(40);
  process.env.ARCSWEEP_RUNTIME_TOKEN = token;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wayglass-memory-route-'));
  const app = express(); app.use(express.json());
  app.use('/api/v1/wayglass', createWayglassRouter({ lineageStore: createLineageStore({ directory: dir }) }));
  const server = app.listen(0); await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port + '/api/v1/wayglass/wyrdrune/living-learning';
  const auth = { authorization: 'Bearer ' + token, 'content-type': 'application/json' };
  try {
    assert.equal((await fetch(base + '/continuity')).status, 401, 'memory is Steward-only');
    assert.equal((await fetch(base, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body(1)) })).status, 401);
    assert.equal((await (await fetch(base + '/continuity', { headers: auth })).json()).status, 'none');
    const one = await (await fetch(base, { method: 'POST', headers: auth, body: JSON.stringify(body(1)) })).json();
    assert.equal(one.status, 'wyrdrune-returned');
    assert.deepEqual([one.return_record.persisted, one.return_record.seq], [true, 1]);
    const two = await (await fetch(base, { method: 'POST', headers: auth, body: JSON.stringify(body(2)) })).json();
    assert.deepEqual([two.return_record.seq, two.return_record.prev], [2, one.return_record.storage_id]);
    const memory = await (await fetch(base + '/continuity', { headers: auth })).json();
    assert.equal(memory.status, 'verified'); assert.equal(memory.head.seq, 2);
    assert.deepEqual(memory.head.carry, two.continuity.carry);
    assert.equal(memory.head.carry_digest, two.continuity.carry_digest);
    // Tamper with the remembered state: the host refuses to vouch for it, and a new
    // learning return is still returned but honestly reported as not persisted.
    const folder = fs.readdirSync(dir).map(x => path.join(dir, x))[0];
    const file = path.join(folder, one.return_record.storage_id + '.json');
    fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('"energy":', '"energy": '));
    const refused = await (await fetch(base + '/continuity', { headers: auth })).json();
    assert.equal(refused.status, 'refused'); assert.match(refused.reason, /altered/);
    const three = await (await fetch(base, { method: 'POST', headers: auth, body: JSON.stringify(body(3)) })).json();
    assert.equal(three.status, 'wyrdrune-returned');
    assert.equal(three.return_record.persisted, false); assert.match(three.return_record.reason, /broken chain/);
  } finally {
    server.closeAllConnections(); await new Promise(r => server.close(r));
    if (previous === undefined) delete process.env.ARCSWEEP_RUNTIME_TOKEN; else process.env.ARCSWEEP_RUNTIME_TOKEN = previous;
  }
});
