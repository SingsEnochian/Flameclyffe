import assert from 'node:assert/strict';
import test from 'node:test';

import { createResidentLayaMcpSession } from '../src/laya-mcp-session.js';

const FAKE_SERVER = String.raw`
import readline from 'node:readline';
let loaded = false;
const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
function send(payload) { process.stdout.write(JSON.stringify(payload) + '\n'); }
rl.on('line', (line) => {
  const msg = JSON.parse(line);
  if (msg.method === 'initialize') {
    send({ jsonrpc: '2.0', id: msg.id, result: { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'laya', version: 'test' } } });
    return;
  }
  if (msg.method === 'tools/list') {
    send({ jsonrpc: '2.0', id: msg.id, result: { tools: [{ name: 'laya_predict' }, { name: 'laya_status' }] } });
    return;
  }
  if (msg.method === 'tools/call') {
    const name = msg.params?.name;
    if (name === 'laya_status') {
      const payload = { loaded: loaded ? ['typed-decisions'] : [], device: 'cpu', router_ready: true };
      send({ jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text: JSON.stringify(payload) }] } });
      return;
    }
    if (name === 'laya_predict') {
      loaded = true;
      const payload = { answers: { readiness: { choice: 'ready', confidence: 0.99 } }, routing: { model: 'typed-decisions' }, latency_ms: 1.2, device: 'cpu' };
      send({ jsonrpc: '2.0', id: msg.id, result: { content: [{ type: 'text', text: JSON.stringify(payload) }] } });
      return;
    }
  }
});
`;

const SILENT_SERVER = String.raw`
import readline from 'node:readline';
createReadStream();
function createReadStream() {
  readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
}
`;

test('resident session performs MCP handshake and warms typed-decisions', async () => {
  const session = createResidentLayaMcpSession({
    command: process.execPath,
    args: ['--input-type=module', '-e', FAKE_SERVER],
    startupTimeoutMs: 5_000,
    requestTimeoutMs: 5_000,
  });

  await session.start();
  assert.equal(session.started, true);
  const status = await session.status();
  assert.deepEqual(status.loaded, ['typed-decisions']);
  assert.equal(status.device, 'cpu');
  await session.close();
  assert.equal(session.started, false);
});

test('failed startup tears down the resident child process', async () => {
  const session = createResidentLayaMcpSession({
    command: process.execPath,
    args: ['--input-type=module', '-e', SILENT_SERVER],
    startupTimeoutMs: 75,
    requestTimeoutMs: 75,
  });

  await assert.rejects(session.start(), /timed out/);
  assert.equal(session.started, false);

  // close() must be idempotent after startup failure cleanup.
  await session.close();
  assert.equal(session.started, false);
});
