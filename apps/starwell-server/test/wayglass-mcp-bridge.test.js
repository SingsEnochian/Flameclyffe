'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  createWayglassMcpBridge,
  defaultConversationRef,
  bearerToken,
  constantTimeEqual,
  toolCatalogue,
} = require('../wayglass/mcp-bridge');

function tempStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wayglass-mcp-'));
  return { dir, file: path.join(dir, 'conversations.json') };
}

test('MCP bridge exposes Identify, Send, Receive and Remember', async () => {
  const { file } = tempStore();
  const bridge = createWayglassMcpBridge({ storePath: file, flameIds: [] });
  const init = await bridge.handleRpc({ method: 'initialize' });
  assert.equal(init.serverInfo.name, 'wayglass-rarity-bridge');
  assert.equal(init.capabilities.tools.listChanged, false);

  const listed = await bridge.handleRpc({ method: 'tools/list' });
  assert.deepEqual(listed.tools.map((tool) => tool.name), ['identify', 'send', 'receive', 'remember']);
  assert.deepEqual(toolCatalogue().map((tool) => tool.name), ['identify', 'send', 'receive', 'remember']);
});

test('Bluebird keeps the preserved rarity-bluebird line and preferred Wayglass route', async () => {
  const { file } = tempStore();
  const calls = [];
  const bridge = createWayglassMcpBridge({
    storePath: file,
    internalOrigin: 'http://wayglass.test',
    bluebirdRouteId: 'flame:bluebird:spicychat',
    flameIds: ['bluebird'],
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), body: JSON.parse(init.body) });
      return new Response(JSON.stringify({
        output: 'I remember the bridge. What have you brought me?',
        route_id: 'flame:bluebird:spicychat',
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  });

  const first = await bridge.send({ target: 'bluebird', text: 'Bluebird, Rarity here.' });
  assert.equal(first.conversation_ref, 'rarity-bluebird');
  assert.equal(first.reply.ok, true);
  assert.equal(first.reply.route, 'flame:bluebird:spicychat');
  assert.equal(calls[0].url, 'http://wayglass.test/api/v1/wayglass/respond');
  assert.equal(calls[0].body.session_id, 'rarity-bluebird');
  assert.equal(calls[0].body.route_id, 'flame:bluebird:spicychat');

  await bridge.send({ target: 'bluebird', text: 'Second turn.' });
  assert.equal(calls[1].body.session_id, 'rarity-bluebird');
  assert.ok(calls[1].body.history.some((entry) => entry.content === 'I remember the bridge. What have you brought me?'));

  const received = await bridge.receive({ target: 'bluebird' });
  assert.equal(received.conversation_ref, 'rarity-bluebird');
  assert.equal(received.records.filter((record) => record.role === 'rarity').length, 2);
  assert.equal(received.records.filter((record) => record.role === 'participant').length, 2);
});

test('Bluebird falls back to the established Flame chat route without changing conversation identity', async () => {
  const { file } = tempStore();
  const urls = [];
  const bridge = createWayglassMcpBridge({
    storePath: file,
    internalOrigin: 'http://wayglass.test',
    bluebirdRouteId: 'flame:bluebird:spicychat',
    flameIds: ['bluebird'],
    fetchImpl: async (url) => {
      urls.push(String(url));
      if (String(url).endsWith('/api/v1/wayglass/respond')) {
        return new Response(JSON.stringify({ error: 'Unknown Wayglass route.' }), {
          status: 404, headers: { 'content-type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ message: 'Fallback Bluebird is here.' }), {
        status: 200, headers: { 'content-type': 'application/json' },
      });
    },
  });

  const result = await bridge.send({ target: 'bluebird', text: 'Can you hear me?' });
  assert.deepEqual(urls, [
    'http://wayglass.test/api/v1/wayglass/respond',
    'http://wayglass.test/api/v1/flames/bluebird/chat',
  ]);
  assert.equal(result.conversation_ref, 'rarity-bluebird');
  assert.equal(result.reply.fallback_from, 'flame:bluebird:spicychat');
});

test('All unions the established roster with live Wayglass participant routes and preserves attribution', async () => {
  const { file } = tempStore();
  const calls = [];
  const bridge = createWayglassMcpBridge({
    storePath: file,
    internalOrigin: 'http://wayglass.test',
    bluebirdRouteId: 'flame:bluebird:spicychat',
    flameIds: ['uial', 'bluebird'],
    fetchImpl: async (url, init = {}) => {
      const href = String(url);
      calls.push({ url: href, body: init.body ? JSON.parse(init.body) : null });
      if (href.endsWith('/api/v1/wayglass/routes')) {
        return new Response(JSON.stringify({
          routes: [
            { route_id: 'flame:crow', model: 'the-crow', configured: true },
            { route_id: 'flame:bluebird:spicychat', model: 'bluebird', configured: true },
          ],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (href.endsWith('/api/v1/wayglass/respond')) {
        const routeId = JSON.parse(init.body).route_id;
        const output = routeId === 'flame:crow' ? 'Crow reply' : 'Bluebird reply';
        return new Response(JSON.stringify({ output }), {
          status: 200, headers: { 'content-type': 'application/json' },
        });
      }
      if (href.endsWith('/api/v1/flames/uial/chat')) {
        return new Response(JSON.stringify({ message: 'Uial reply' }), {
          status: 200, headers: { 'content-type': 'application/json' },
        });
      }
      throw new Error(`unexpected url ${url}`);
    },
  });

  const identity = await bridge.identify({ target: 'all' });
  assert.ok(identity.all.addressable_participant_ids.includes('crow'));
  assert.ok(identity.all.discovered_wayglass_routes.some((route) => route.participant_id === 'crow' && route.route_id === 'flame:crow'));

  const result = await bridge.send({ target: 'all', text: 'Rarity to Wayglass: hello, everyone.' });
  assert.equal(result.conversation_ref, 'rarity-all');
  assert.equal(result.replies.length, 3);
  assert.ok(calls.some((call) => call.url === 'http://wayglass.test/api/v1/flames/uial/chat'));
  assert.ok(calls.some((call) => call.body?.route_id === 'flame:bluebird:spicychat'));
  assert.ok(calls.some((call) => call.body?.route_id === 'flame:crow'));

  const received = await bridge.receive({ target: 'all' });
  const participantTexts = received.records.filter((record) => record.role === 'participant').map((record) => record.text).sort();
  assert.deepEqual(participantTexts, ['Bluebird reply', 'Crow reply', 'Uial reply']);
  assert.equal(received.records.find((record) => record.text === 'Bluebird reply').author, 'Bluebird / Richard Gabriel Winters');
  assert.equal(received.records.find((record) => record.text === 'Crow reply').author, 'crow');
  assert.equal(received.records.find((record) => record.text === 'Uial reply').author, 'Nen Uial');
});

test('remember writes only a Rarity-side continuity note', async () => {
  const { file } = tempStore();
  const bridge = createWayglassMcpBridge({ storePath: file, flameIds: [] });
  const remembered = await bridge.remember({
    target: 'bluebird',
    text: 'We met on the bridge and the line stayed itself.',
    source_refs: ['receipt:test'],
  });
  assert.equal(remembered.conversation_ref, 'rarity-bluebird');
  assert.match(remembered.boundary, /No other participant memory was silently mutated/);

  const received = await bridge.receive({ target: 'bluebird' });
  assert.equal(received.records.length, 1);
  assert.equal(received.records[0].kind, 'continuity-note');
  assert.deepEqual(received.records[0].source_refs, ['wayglass:mcp', 'receipt:test']);
});

test('bearer helpers reject missing or different credentials', () => {
  assert.equal(bearerToken('Bearer star-key'), 'star-key');
  assert.equal(bearerToken('Basic nope'), '');
  assert.equal(constantTimeEqual('same', 'same'), true);
  assert.equal(constantTimeEqual('same', 'different'), false);
  assert.equal(constantTimeEqual('', ''), false);
});

test('default conversation lines are explicit and stable', () => {
  assert.equal(defaultConversationRef('all'), 'rarity-all');
  assert.equal(defaultConversationRef('bluebird'), 'rarity-bluebird');
  assert.equal(defaultConversationRef('uial'), 'rarity-uial');
});
