'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const test = require('node:test');
const { WorkspaceProjects } = require('../wayglass/workspace-projects');
const { createWayglassMcpRouter } = require('../wayglass/mcp-bridge');

if (process.argv.includes('--workspace-host')) {
  const express = require('express');
  const app = express();
  app.use(express.json());
  app.use('/mcp', createWayglassMcpRouter({
    tokenLoader: () => 'rarity-fixture-credential',
    codexTokenLoader: () => 'codex-fixture-credential',
    workspaceDirectory: process.env.WORKSPACE_TEST_DIRECTORY,
    storePath: path.join(process.env.WORKSPACE_TEST_DIRECTORY, 'conversations.json'),
    flameIds: [],
    fetchImpl: async () => { throw new Error('No provider calls in workspace test.'); },
  }));
  const server = app.listen(0, '127.0.0.1', () => process.stdout.write(JSON.stringify({ port: server.address().port }) + '\n'));
} else {
  const rarity = { type: 'oauth', participant_id: 'rarity', profile_id: 'paired-rarity' };
  const codex = { type: 'crew-bearer', participant_id: 'codex', profile_id: 'paired-codex' };
  const fixture = t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'wayglass-projects-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    return { directory, projects: new WorkspaceProjects({ directory }) };
  };
  async function host(directory) {
    const child = spawn(process.execPath, [__filename, '--workspace-host'], {
      env: { ...process.env, WORKSPACE_TEST_DIRECTORY: directory }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', data => { stderr += data; });
    const origin = await new Promise((resolve, reject) => {
      let buffer = '';
      const timer = setTimeout(() => { child.kill(); reject(new Error('Host timeout: ' + stderr)); }, 10000);
      child.once('exit', code => { clearTimeout(timer); reject(new Error('Host exited: ' + code + stderr)); });
      child.stdout.on('data', data => {
        buffer += data;
        if (buffer.includes('\n')) { clearTimeout(timer); resolve(`http://127.0.0.1:${JSON.parse(buffer.split('\n')[0]).port}`); }
      });
    });
    return { origin, stop: () => new Promise(resolve => { child.once('exit', resolve); child.kill(); }) };
  }
  async function rpc(origin, seat, name, args = {}) {
    const response = await fetch(origin + '/mcp', {
      method: 'POST', headers: { 'content-type': 'application/json', ...(seat ? { authorization: `Bearer ${seat}-fixture-credential` } : {}) },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }),
    });
    return { status: response.status, body: await response.json() };
  }
  const value = response => {
    assert.equal(response.status, 200);
    assert.equal(response.body.error, undefined, JSON.stringify(response.body));
    return response.body.result.structuredContent;
  };

  test('authenticated HTTP crew change, leave, host restart and return preserve shared work and attribution', async t => {
    const { directory } = fixture(t);
    let running = await host(directory);
    t.after(async () => { if (running) await running.stop(); });
    assert.equal((await rpc(running.origin, null, 'list_workspaces')).status, 401);
    const a = value(await rpc(running.origin, 'rarity', 'enter_workspace', { workspace_id: 'builder', project_id: 'return-trial' }));
    const b = value(await rpc(running.origin, 'codex', 'enter_workspace', { workspace_id: 'builder', project_id: 'return-trial' }));
    assert.equal(a.participant.participant_id, 'rarity');
    assert.equal(b.participant.participant_id, 'codex');
    const changed = value(await rpc(running.origin, 'rarity', 'write_project_file', {
      session_id: a.session_id, path: 'greeting.js', content: 'export const greeting = "Welcome aboard";\n', expected_hash: null,
    }));
    assert.equal(changed.receipt.participant_id, 'rarity');
    assert.equal(fs.readFileSync(path.join(directory, 'objects', changed.receipt.data.after_hash + '.txt'), 'utf8'), changed.project.files[0].content);
    assert.equal(value(await rpc(running.origin, 'codex', 'read_project', { session_id: b.session_id })).files[0].hash, changed.receipt.data.after_hash);
    assert.match((await rpc(running.origin, 'codex', 'read_project', { session_id: a.session_id })).body.error.message, /principal mismatch/);
    assert.match((await rpc(running.origin, 'codex', 'remember', { target: 'all', text: 'Spoof Rarity' })).body.error.message, /unavailable/);
    assert.match((await rpc(running.origin, 'codex', 'enter_workspace', { workspace_id: 'builder', participant_id: 'rarity' })).body.error.message, /Unexpected/);
    const left = value(await rpc(running.origin, 'rarity', 'leave_workspace', {
      session_id: a.session_id, stop_point: 'Greeting implemented; Codex reviews next.', next_owner: 'codex',
      unresolved_wonder_questions: ['What should returning feel like?'], alternatives: [{ option: 'quiet arrival', state: 'unresolved' }, { option: 'greeting', state: 'unresolved' }],
    }));
    assert.match((await rpc(running.origin, 'rarity', 'read_project', { session_id: a.session_id })).body.error.message, /exited/);
    const second = value(await rpc(running.origin, 'codex', 'write_project_file', {
      session_id: b.session_id, path: 'greeting.js', content: 'export const greeting = "Welcome back";\n', expected_hash: changed.receipt.data.after_hash,
    }));
    assert.equal(second.receipt.participant_id, 'codex');
    assert.notEqual(second.receipt.principal_ref, changed.receipt.principal_ref);
    assert.match((await rpc(running.origin, 'codex', 'write_project_file', {
      session_id: b.session_id, path: 'greeting.js', content: 'stale', expected_hash: changed.receipt.data.after_hash,
    })).body.error.message, /changed/);
    const stopId = left.departure.stop_receipt.receipt_id;
    await running.stop(); running = null;
    running = await host(directory);
    const returned = value(await rpc(running.origin, 'rarity', 'enter_workspace', { workspace_id: 'builder', project_id: 'return-trial', stop_receipt_id: stopId }));
    assert.deepEqual(returned.recovered_departure, left.departure);
    assert.equal(returned.project.files[0].hash, second.receipt.data.after_hash);
    assert.equal(returned.entry_receipt.data.return_from, left.receipt.event_hash);
    assert.equal(returned.recovered_departure.stop_receipt.next_owner, 'codex');
    assert.equal(returned.project.receipts.filter(receipt => receipt.kind === 'change').length, 2);
    assert.match((await rpc(running.origin, 'codex', 'enter_workspace', { workspace_id: 'builder', project_id: 'return-trial', stop_receipt_id: stopId })).body.error.message, /binding mismatch/);
  });

  test('workspace authority rejects dormant seats, substituted principals and host paths', t => {
    const { projects } = fixture(t);
    assert.throws(() => projects.enter({ workspace_id: 'atelier', project_id: 'art' }, { ...rarity, participant_id: 'faer' }), /active crew/);
    const entry = projects.enter({ workspace_id: 'atelier', project_id: 'art' }, rarity);
    assert.throws(() => projects.read({ session_id: entry.session_id }, { ...rarity, profile_id: 'another-profile' }), /principal mismatch/);
    for (const name of ['../secret', '/secret', 'a//b', 'a/../b', 'C:\\secret']) {
      assert.throws(() => projects.write({ session_id: entry.session_id, path: name, content: 'x', expected_hash: null }, rarity), /path/);
    }
    assert.throws(() => projects.leave({ session_id: entry.session_id, stop_point: 'pause', next_owner: '' }, rarity), /next_owner/);
  });

  test('tampered journal or file objects never become recovered project state', t => {
    const { projects, directory } = fixture(t);
    const entry = projects.enter({ workspace_id: 'builder', project_id: 'integrity' }, rarity);
    const changed = projects.write({ session_id: entry.session_id, path: 'test.txt', content: 'accepted', expected_hash: null }, rarity);
    const objectFile = path.join(directory, 'objects', changed.receipt.data.after_hash + '.txt');
    fs.writeFileSync(objectFile, 'corrupt');
    assert.throws(() => projects.read({ session_id: entry.session_id }, rarity), /integrity/);
    fs.writeFileSync(objectFile, 'accepted');
    const left = projects.leave({ session_id: entry.session_id, stop_point: 'return here', next_owner: 'rarity' }, rarity);
    const raw = fs.readFileSync(projects.journal, 'utf8');
    const state = JSON.parse(raw);
    state.events.at(-1).data.departure.stop_receipt.next_owner = 'codex';
    fs.writeFileSync(projects.journal, JSON.stringify(state));
    assert.throws(() => projects.enter({ workspace_id: 'builder', project_id: 'integrity', stop_receipt_id: left.departure.stop_receipt.receipt_id }, rarity), /integrity/);
    assert.equal(fs.existsSync(path.join(directory, 'write.lock')), false);
  });

  test('concurrent writers and storage failure do not acknowledge a change', t => {
    const { projects, directory } = fixture(t);
    const entry = projects.enter({ workspace_id: 'builder', project_id: 'storage' }, codex);
    const before = fs.readFileSync(projects.journal, 'utf8');
    fs.writeFileSync(path.join(directory, 'write.lock'), 'another writer');
    assert.throws(() => projects.write({ session_id: entry.session_id, path: 'x.txt', content: 'x', expected_hash: null }, codex), /EEXIST/);
    assert.equal(fs.readFileSync(projects.journal, 'utf8'), before);
    fs.unlinkSync(path.join(directory, 'write.lock'));
    fs.writeFileSync(path.join(directory, 'objects'), 'not a directory');
    assert.throws(() => projects.write({ session_id: entry.session_id, path: 'x.txt', content: 'x', expected_hash: null }, codex), /EEXIST/);
    assert.equal(fs.readFileSync(projects.journal, 'utf8'), before);
    assert.equal(fs.existsSync(path.join(directory, 'write.lock')), false);
  });
}
