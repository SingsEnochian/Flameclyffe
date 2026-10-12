'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { setTimeout: delay } = require('node:timers/promises');

async function freePort() {
  const socket = net.createServer();
  await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  return port;
}

test('secure host serves Wayglass, authenticates MCP seats and preserves local browser boundaries', { timeout: 25000 }, async t => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'wayglass-host-runtime-'));
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const token = randomBytes(32).toString('hex');
  const codexToken = randomBytes(32).toString('hex');
  const options = {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      PORT: String(port),
      HEARTHGATE_DATA_DIR: data,
      WAYGLASS_DATA_DIR: path.join(data, 'departures'),
      WAYGLASS_PUBLIC_ORIGIN: origin,
      WAYGLASS_RARITY_ACCESS_TOKEN: token,
      WAYGLASS_CODEX_ACCESS_TOKEN: codexToken,
      WAYGLASS_WORKSPACE_DATA_DIR: path.join(data, 'workspaces'),
      WAYGLASS_RARITY_MCP_STORE: path.join(data, 'conversations.json'),
      WAYGLASS_PEER_OAUTH_CONFIG_FILE: path.join(data, 'oauth-config.json'),
      WAYGLASS_PEER_OAUTH_TOKENS_FILE: path.join(data, 'oauth-tokens.json'),
      WAYGLASS_PEER_OAUTH_PAIRING_FILE: path.join(data, 'pairing.txt'),
    },
    stdio: 'ignore',
  };
  let host = spawn(process.execPath, ['server-secure.js'], options);
  t.after(async () => {
    if (host.exitCode === null && host.signalCode === null) {
      const stopped = new Promise(resolve => host.once('exit', resolve));
      host.kill();
      await stopped;
    }
    fs.rmSync(data, { recursive: true, force: true });
  });
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    assert.equal(host.exitCode, null, 'Hearthgate must remain running during startup');
    try {
      const response = await fetch(`${origin}/.well-known/oauth-authorization-server`, { signal: AbortSignal.timeout(500) });
      if (response.ok) { ready = true; break; }
    } catch { /* wait for loopback listener */ }
    await delay(100);
  }
  assert.ok(ready, 'Hearthgate must publish OAuth metadata');
  const metadata = await fetch(`${origin}/.well-known/oauth-protected-resource/mcp`).then(r => r.json());
  assert.equal(metadata.resource, `${origin}/mcp`);

  const unauthenticated = await fetch(`${origin}/mcp`);
  assert.equal(unauthenticated.status, 401);
  assert.match(unauthenticated.headers.get('www-authenticate'), /resource_metadata/);

  async function rpc(method, params = {}) {
    const response = await fetch(`${origin}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    assert.equal(response.status, 200);
    const message = await response.json();
    assert.equal(message.error, undefined);
    return message.result;
  }
  const catalogue = await rpc('tools/list');
  assert.ok(catalogue.tools.some(tool => tool.name === 'enter_workspace'));
  const registry = (await rpc('tools/call', { name: 'list_workspaces' })).structuredContent;
  assert.deepEqual(registry.workspaces.map(room => room.workspace_id).sort(), ['atelier', 'builder']);
  assert.equal(registry.crew.find(seat => seat.participant_id === 'faer').activation.provider_calls_allowed, false);
  const entry = (await rpc('tools/call', {
    name: 'enter_workspace', arguments: { workspace_id: 'builder', participant_id: 'codex' },
  })).structuredContent;
  assert.equal(entry.participant.participant_id, 'rarity', 'MCP arguments cannot impersonate Codex');
  assert.equal(entry.resident.participant_id, 'wayglass');

  const browserRoutes = await fetch(`${origin}/api/v1/wayglass/routes`, {
    headers: { origin: 'http://127.0.0.1:5186' },
  });
  assert.equal(browserRoutes.status, 200);
  assert.equal(browserRoutes.headers.get('access-control-allow-origin'), 'http://127.0.0.1:5186');
  assert.ok(Array.isArray((await browserRoutes.json()).routes));
  const foreignBrowser = await fetch(`${origin}/api/v1/wayglass/routes`, {
    headers: { origin: 'https://example.com' },
  });
  assert.ok(foreignBrowser.status >= 400);
  assert.equal(foreignBrowser.headers.get('access-control-allow-origin'), null);
  const page = await fetch(`${origin}/wayglass/`);
  assert.equal(page.status, 200, 'stage the Wayglass build before running host tests');
  assert.match(await page.text(), /Wayglass/i);

  const project = { workspace_id: 'builder', project_id: 'restart-trial' };
  const first = (await rpc('tools/call', { name: 'write_workspace_artifact', arguments: {
    ...project, expected_head: null, artifact_id: 'fixture', media_type: 'text/plain', content: 'Synthetic host trial artifact.',
  } })).structuredContent;
  assert.equal(first.event.author, 'rarity');
  const endpoint = `${origin}/api/v1/wayglass/workspaces/builder/restart-trial`;
  assert.equal((await fetch(endpoint)).status, 401);
  assert.equal((await fetch(endpoint, { headers: { authorization: `Bearer ${token}` } })).status, 401, 'Rarity token cannot claim the Codex entrance');
  const headers = { authorization: `Bearer ${codexToken}`, 'content-type': 'application/json' };
  const codexEntry = await fetch(`${origin}/api/v1/wayglass/workspaces/builder/enter`, { method: 'POST', headers }).then(r => r.json());
  assert.equal(codexEntry.participant.participant_id, 'codex');
  const revisionResponse = await fetch(`${endpoint}/artifacts`, { method: 'POST', headers, body: JSON.stringify({
    expected_head: first.event_id, artifact_id: 'fixture', media_type: 'text/plain', content: 'Synthetic Codex revision.', author: 'rarity',
  }) });
  assert.equal(revisionResponse.status, 200);
  const revision = await revisionResponse.json();
  assert.equal(revision.event.author, 'codex');
  const conflict = await fetch(`${endpoint}/artifacts`, { method: 'POST', headers, body: JSON.stringify({
    expected_head: first.event_id, artifact_id: 'fixture', media_type: 'text/plain', content: 'Stale revision.',
  }) });
  assert.equal(conflict.status, 409);
  const handoffResponse = await fetch(`${endpoint}/handoff`, { method: 'POST', headers, body: JSON.stringify({
    expected_head: revision.event_id, stop_point: 'Synthetic restart trial ready.', next_owner: 'rarity', open_questions: ['Live OAuth connection pending.'],
  }) });
  assert.equal(handoffResponse.status, 200);
  const handoff = await handoffResponse.json();

  const stopped = new Promise(resolve => host.once('exit', resolve));
  host.kill();
  await stopped;
  host = spawn(process.execPath, ['server-secure.js'], options);
  let returned;
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const response = await fetch(endpoint, { headers, signal: AbortSignal.timeout(500) });
      if (response.ok) { returned = await response.json(); break; }
    } catch { /* wait for the fresh process */ }
    await delay(100);
  }
  assert.ok(returned, 'Project must recover after terminating and restarting Hearthgate');
  assert.equal(returned.head_event_id, handoff.event_id);
  assert.equal(returned.artifacts[0].content, 'Synthetic Codex revision.');
  assert.equal(returned.handoff.next_owner, 'rarity');
  assert.deepEqual(returned.receipts.map(receipt => receipt.author), ['rarity', 'codex', 'codex']);
  const rarityReturn = (await rpc('tools/call', { name: 'inspect_workspace_project', arguments: project })).structuredContent;
  assert.equal(rarityReturn.head_event_id, returned.head_event_id);
});
