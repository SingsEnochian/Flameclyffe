'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { verify } = require('node:crypto');
const express = require('express');
const { createWayglassRouter } = require('../wayglass/router');
const { createRuntimeSandbox } = require('../wayglass/runtime-sandbox.cjs');
const { encode } = require('../../../lib/wyrdrune/canonical.cjs');

const source = value => `mobius scoped {
 perceive {} compress {} release {} verify {}
 integrate {} choose {} return { emit ${value}; } transcend {}
}`;
const create = { op: 'create', project_id: 'lantern', title: 'Lantern', description: 'First programme', source: source(1) };

test('House invitation binds Ship Voice to one signed project action and the activated WTL survives restart', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'wayglass-ship-sandbox-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const token = 'wayglass-sandbox-private-test-' + 'f'.repeat(40);
  const old = process.env.ARCSWEEP_RUNTIME_TOKEN;
  process.env.ARCSWEEP_RUNTIME_TOKEN = token;
  t.after(() => { if (old === undefined) delete process.env.ARCSWEEP_RUNTIME_TOKEN; else process.env.ARCSWEEP_RUNTIME_TOKEN = old; });
  let action = create;
  let modelCalls = 0;
  const app = express();
  app.use(express.json());
  app.use('/api/v1/wayglass', createWayglassRouter({
    runtimeSandbox: createRuntimeSandbox({ directory }),
    fetchImpl: async (_url, init) => {
      modelCalls++;
      const req = JSON.parse(init.body);
      assert.equal(req.format, 'json');
      assert.match(req.messages[0].content, /Wayglass Ship Voice/);
      return Response.json({ model: req.model, message: { content: JSON.stringify(action) } });
    },
  }));
  const server = app.listen(0, '127.0.0.1');
  t.after(() => { server.closeAllConnections(); server.close(); });
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}/api/v1/wayglass/sandbox`;
  const turn = body => fetch(url + '/turn', {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
    body: JSON.stringify(body),
  });
  assert.equal((await fetch(url)).status, 401);
  assert.equal((await turn({ input: 'Design a project', feather: true })).status, 409);
  assert.equal(modelCalls, 0);
  const first = await turn({ input: 'Design a project' });
  assert.equal(first.status, 200);
  const { receipt } = await first.json();
  assert.equal(receipt.participant_id, 'wayglass');
  assert.equal(receipt.data.provenance.route, 'wayglass:ship');
  const restarted = () => createRuntimeSandbox({ directory });
  const { publicKey } = restarted().inspect();
  const { event_hash, data: { signature, ...data }, ...event } = receipt;
  assert.ok(verify(null, Buffer.from(encode({ ...event, data })), publicKey, Buffer.from(signature, 'base64')));
  action = { op: 'revise', project_id: 'lantern', expected_head: event_hash, source: source(2), expected_output: [2] };
  const second = await turn({ input: 'Revise the project', project_id: 'lantern' });
  assert.equal(second.status, 200);
  assert.deepEqual((await restarted().run('lantern')).preview.values, [2]);
  assert.equal((await turn({ input: 'Retry a stale revision', project_id: 'lantern' })).status, 409);
  const state = restarted().inspect('lantern');
  assert.equal(state.project.history.length, 2);
  assert.equal(state.publicKey, publicKey);
  action = { ...action, source: source('bridge("host","write")'), expected_head: state.project.head };
  assert.equal((await turn({ input: 'Attempt an unavailable effect', project_id: 'lantern' })).status, 409);
  assert.equal(restarted().inspect('lantern').project.history.length, 2);
});

test('named programmes maintain separate signed revision chains across a project restart', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'wayglass-ship-programmes-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const open = () => createRuntimeSandbox({ directory });
  const apply = (action, turnId) => open().apply({ project_id: 'lantern', ...action }, { turnId, route: 'wayglass:ship' });
  const main = await apply(create, 'create-main');
  const add = { op: 'add', program: 'second', source: source(11), expected_head: main.receipt.event_hash };
  const added = await apply(add, 'add-second');
  assert.equal((await apply(add, 'add-second')).status, 'already-applied');
  await assert.rejects(apply({ ...add, program: 'third' }, 'stale-add'), /head changed/);
  const changed = await apply({
    op: 'revise', program: 'second', source: source(12), expected_output: [12],
    expected_head: added.receipt.event_hash,
  }, 'revise-second');
  const mainChange = await apply({
    op: 'revise', source: source(2), expected_output: [2], expected_head: changed.receipt.event_hash,
  }, 'revise-main');
  const final = await apply({
    op: 'revise', program: 'second', source: source(13), expected_output: [13],
    expected_head: mainChange.receipt.event_hash,
  }, 'revise-second-again');
  assert.equal(final.receipt.data.checkpoint.carry.generation, 2);
  assert.deepEqual(open().inspect('lantern').project.programs.map(p => p.name), ['main', 'second']);
  assert.deepEqual((await open().run('lantern')).preview.values, [2]);
  assert.deepEqual((await open().run('lantern', { program: 'second' })).preview.values, [13]);
});
