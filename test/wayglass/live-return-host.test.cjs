'use strict';
// A real loopback HTTP/MCP host is stopped and restarted between witness phases.
// Only disposable fixture credentials are used. This is NOT production OAuth proof.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { once } = require('node:events');
const test = require('node:test');
const execute = promisify(execFile);
const repoRoot = path.resolve(__dirname, '../..');
const hostFile = path.join(repoRoot, 'apps/starwell-server/test/wayglass-workspace-projects.test.js');
const witnessFile = path.join(repoRoot, 'scripts/wayglass-live-return-witness.mjs');

async function launchHost(directory) {
  const child = spawn(process.execPath, [hostFile, '--workspace-host'], {
    cwd: repoRoot,
    env: { ...process.env, WORKSPACE_TEST_DIRECTORY: directory },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let errorOutput = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', chunk => { errorOutput += chunk; });
  const origin = await new Promise((resolve, reject) => {
    let buffer = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('Disposable Wayglass host failed to start: ' + errorOutput.slice(-500)));
    }, 15000);
    const finish = (fn, arg) => { clearTimeout(timer); child.removeListener('exit', onExit); fn(arg); };
    const onExit = code => finish(reject, new Error('Wayglass host exited before listening: ' + code));
    child.once('exit', onExit);
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      buffer += chunk;
      if (buffer.includes('\n')) {
        try {
          const port = JSON.parse(buffer.split('\n')[0]).port;
          if (!Number.isInteger(port) || port < 1) throw new Error('Invalid port');
          finish(resolve, 'http://127.0.0.1:' + port);
        } catch (error) {
          finish(reject, error);
        }
      }
    });
  });
  return {
    origin,
    async stop() {
      if (child.exitCode !== null) return;
      const died = once(child, 'exit');
      child.kill();
      await died;
    },
  };
}

async function witness(phase, env, ticketPath = null) {
  const args = [witnessFile, phase];
  if (ticketPath) args.push(ticketPath);
  const result = await execute(process.execPath, args, {
    cwd: repoRoot, env, timeout: 30000, maxBuffer: 250000,
  });
  return JSON.parse(result.stdout);
}

test('actual localhost authenticated MCP prepare/leave, process restart, and private-ticket return', async t => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wayglass-host-return-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const workspaceDirectory = path.join(tmp, 'durable-journal');
  const userHome = path.join(tmp, 'private-user-home');
  fs.mkdirSync(userHome, { mode: 0o700 });
  const hostOne = await launchHost(workspaceDirectory);
  let liveHost = hostOne;
  t.after(async () => { if (liveHost) await liveHost.stop(); });

  const env = {
    ...process.env, HOME: userHome,
    WAYGLASS_LIVE_RETURN_APPROVED: 'YES',
    WAYGLASS_MCP_URL: hostOne.origin + '/mcp',
    WAYGLASS_LIVE_ACCESS_TOKEN: 'rarity-fixture-credential',
  };
  const prepared = await witness('prepare', env);
  assert.equal(prepared.phase, 'prepared');
  assert.equal(prepared.host_restart_independently_verified, false);
  assert.ok(prepared.stop_receipt_id);
  assert.ok(prepared.ticket_path.startsWith(userHome));
  const ticket = JSON.parse(fs.readFileSync(prepared.ticket_path, 'utf8'));
  assert.equal(ticket.profile_id, 'wayglass-profile-local');
  assert.equal(ticket.credential_recorded, false);
  assert.ok(ticket.write_event_hash);
  assert.ok(ticket.leave_event_hash);
  const acceptedBefore = JSON.parse(fs.readFileSync(
    path.join(workspaceDirectory, 'journal.json'), 'utf8'));
  assert.equal(acceptedBefore.events.filter(e => e.kind === 'leave').length, 1);
  assert.equal(acceptedBefore.events.filter(e => e.kind === 'change').length, 1);

  await hostOne.stop();
  liveHost = null;
  const hostTwo = await launchHost(workspaceDirectory);
  liveHost = hostTwo;
  env.WAYGLASS_MCP_URL = hostTwo.origin + '/mcp';
  const returned = await witness('return', env, prepared.ticket_path);
  assert.equal(returned.phase, 'returned');
  assert.equal(returned.accepted, true);
  assert.equal(returned.host_restart_independently_verified, false);
  const witnessReceipt = JSON.parse(fs.readFileSync(returned.result_path, 'utf8'));
  assert.equal(witnessReceipt.authenticated_mcp_verified, true);
  assert.equal(witnessReceipt.result.write_event_hash, ticket.write_event_hash);
  assert.equal(witnessReceipt.result.leave_event_hash, ticket.leave_event_hash);
  assert.ok(witnessReceipt.result.return_event_hash);

  const acceptedAfter = JSON.parse(fs.readFileSync(
    path.join(workspaceDirectory, 'journal.json'), 'utf8'));
  assert.equal(acceptedAfter.events.filter(e => e.kind === 'leave').length, 1);
  assert.equal(acceptedAfter.events.filter(e => e.kind === 'change').length, 1);
  assert.equal(acceptedAfter.events.filter(e =>
    e.kind === 'enter' && e.data.return_from === ticket.leave_event_hash).length, 1);
  assert.notEqual(acceptedAfter.events.at(-1).session_id, ticket.first_session_id);
});
