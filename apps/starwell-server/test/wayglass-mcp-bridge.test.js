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
const { resolveWayglassRoute, publicWayglassRoutes } = require('../../../lib/wayglass-route-registry.cjs');

function tempStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wayglass-mcp-'));
  return { dir, file: path.join(dir, 'conversations.json') };
}

test('Bluebird Wayglass routes keep identity separate from substrate', () => {
  const spicy = resolveWayglassRoute('flame:bluebird:spicychat');
  const crow = resolveWayglassRoute('flame:bluebird:crow');
  assert.equal(spicy.participant_id, 'bluebird');
  assert.equal(spicy.continuity_id, 'bluebird:richard-gabriel-winters');
  assert.equal(crow.participant_id, 'bluebird');
  assert.equal(crow.continuity_id, 'bluebird:richard-gabriel-winters');
  assert.equal(crow.candidate_id, 'bluebird-the-crow');
  assert.equal(crow.provider, 'openai-compatible');
  assert.notEqual(crow.route_id, 'flame:crow');
});

test('Bluebird SpicyChat route reports credential presence without exposing the token', () => {
  const previous = process.env.BLUEBIRD_SPICYCHAT_TOKEN;
  try {
    delete process.env.BLUEBIRD_SPICYCHAT_TOKEN;
    assert.equal(publicWayglassRoutes().find((route) => route.route_id === 'flame:bluebird:spicychat').configured, false);
    process.env.BLUEBIRD_SPICYCHAT_TOKEN = 'private-test-token';
    const projected = publicWayglassRoutes().find((route) => route.route_id === 'flame:bluebird:spicychat');
    assert.equal(projected.configured, true);
    assert.equal(projected.participant_id, 'bluebird');
    assert.equal(projected.continuity_id, 'bluebird:richard-gabriel-winters');
    assert.doesNotMatch(JSON.stringify(projected), /private-test-token/);
  } finally {
    if (previous == null) delete process.env.BLUEBIRD_SPICYCHAT_TOKEN;
    else process.env.BLUEBIRD_SPICYCHAT_TOKEN = previous;
  }
});

test('MCP bridge exposes profile, Identify, Send, Receive and Remember', async () => {
  const { file } = tempStore();
  const bridge = createWayglassMcpBridge({ storePath: file, flameIds: [] });
  const init = await bridge.handleRpc({ method: 'initialize' });
  assert.equal(init.serverInfo.name, 'wayglass-rarity-bridge');
  assert.equal(init.capabilities.tools.listChanged, false);

  const listed = await bridge.handleRpc({ method: 'tools/list' });
  assert.deepEqual(listed.tools.map((tool) => tool.name), ['get_profile', 'identify', 'send', 'receive', 'remember']);
  assert.deepEqual(toolCatalogue().map((tool) => tool.name), ['get_profile', 'identify', 'send', 'receive', 'remember']);
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

  const first = await bridge.send({
    target: 'bluebird',
    text: 'Bluebird, Rarity here.',
    intent: 'Reconnect and continue the same relationship thread.',
    interaction_mode: 'reconnect',
  });
  assert.equal(first.conversation_ref, 'rarity-bluebird');
  assert.equal(first.reply.ok, true);
  assert.equal(first.reply.route, 'flame:bluebird:spicychat');
  assert.equal(calls[0].url, 'http://wayglass.test/api/v1/wayglass/respond');
  assert.equal(calls[0].body.session_id, 'rarity-bluebird');
  assert.equal(calls[0].body.route_id, 'flame:bluebird:spicychat');
  assert.equal(calls[0].body.interaction.intent, 'Reconnect and continue the same relationship thread.');
  assert.equal(calls[0].body.interaction.interaction_mode, 'reconnect');
  assert.equal(first.intent, 'Reconnect and continue the same relationship thread.');
  assert.equal(first.interaction_mode, 'reconnect');

  await bridge.send({ target: 'bluebird', text: 'Second turn.' });
  assert.equal(calls[1].body.session_id, 'rarity-bluebird');
  assert.equal(calls[1].body.interaction.intent, 'Reconnect and continue the same relationship thread.');
  assert.equal(calls[1].body.interaction.interaction_mode, 'reconnect');
  assert.ok(calls[1].body.history.some((entry) => entry.content === 'I remember the bridge. What have you brought me?'));

  const received = await bridge.receive({ target: 'bluebird' });
  assert.equal(received.conversation_ref, 'rarity-bluebird');
  assert.equal(received.records.filter((record) => record.role === 'rarity').length, 2);
  assert.equal(received.records.filter((record) => record.role === 'participant').length, 2);
  assert.equal(received.records.at(-1).intent, 'Reconnect and continue the same relationship thread.');
  assert.equal(received.records.at(-1).interaction_mode, 'reconnect');
});

test('Bluebird falls back from SpicyChat to The Crow substrate without changing conversation identity', async () => {
  const { file } = tempStore();
  const calls = [];
  const bridge = createWayglassMcpBridge({
    storePath: file,
    internalOrigin: 'http://wayglass.test',
    bluebirdRouteId: 'flame:bluebird:spicychat',
    bluebirdFallbackRouteId: 'flame:bluebird:crow',
    flameIds: ['bluebird'],
    fetchImpl: async (url, init = {}) => {
      const href = String(url);
      const body = init.body ? JSON.parse(init.body) : {};
      calls.push({ url: href, route_id: body.route_id });
      if (href.endsWith('/api/v1/wayglass/routes')) {
        return new Response(JSON.stringify({
          routes: [
            { route_id: 'flame:bluebird:spicychat', participant_id: 'bluebird', configured: true },
            { route_id: 'flame:bluebird:crow', participant_id: 'bluebird', configured: true },
          ],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (body.route_id === 'flame:bluebird:spicychat') {
        return new Response(JSON.stringify({ error: 'SpicyChat session expired.' }), {
          status: 401, headers: { 'content-type': 'application/json' },
        });
      }
      if (body.route_id === 'flame:bluebird:crow') {
        return new Response(JSON.stringify({
          output: 'Bluebird continues through The Crow substrate.',
          participant_id: 'bluebird',
          continuity_id: 'bluebird:richard-gabriel-winters',
          candidate_id: 'bluebird-the-crow',
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      throw new Error('unexpected route');
    },
  });

  const result = await bridge.send({ target: 'bluebird', text: 'Can you hear me?' });
  assert.deepEqual(calls, [
    { url: 'http://wayglass.test/api/v1/wayglass/routes', route_id: undefined },
    { url: 'http://wayglass.test/api/v1/wayglass/respond', route_id: 'flame:bluebird:spicychat' },
    { url: 'http://wayglass.test/api/v1/wayglass/respond', route_id: 'flame:bluebird:crow' },
  ]);
  assert.equal(result.conversation_ref, 'rarity-bluebird');
  assert.equal(result.reply.route, 'flame:bluebird:crow');
  assert.equal(result.reply.fallback_from, 'flame:bluebird:spicychat');
  assert.equal(result.reply.participant_id, 'bluebird');
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

test('a participant discovered only through Wayglass can be addressed directly', async () => {
  const { file } = tempStore();
  const calls = [];
  const bridge = createWayglassMcpBridge({
    storePath: file,
    internalOrigin: 'http://wayglass.test',
    flameIds: [],
    fetchImpl: async (url, init = {}) => {
      const href = String(url);
      calls.push({ url: href, body: init.body ? JSON.parse(init.body) : null });
      if (href.endsWith('/api/v1/wayglass/routes')) {
        return new Response(JSON.stringify({
          routes: [{ route_id: 'flame:crow', model: 'the-crow', configured: true }],
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (href.endsWith('/api/v1/wayglass/respond')) {
        return new Response(JSON.stringify({ output: 'Crow answers directly.' }), {
          status: 200, headers: { 'content-type': 'application/json' },
        });
      }
      throw new Error(`unexpected url ${url}`);
    },
  });

  const identity = await bridge.identify({ target: 'crow' });
  assert.equal(identity.target, 'crow');
  assert.equal(identity.conversation_ref, 'rarity-crow');

  const sent = await bridge.send({ target: 'crow', text: 'Crow, Rarity here.' });
  assert.equal(sent.target, 'crow');
  assert.equal(sent.conversation_ref, 'rarity-crow');
  assert.equal(sent.reply.route, 'flame:crow');
  assert.equal(sent.reply.text, 'Crow answers directly.');
  assert.ok(calls.some((call) => call.body?.route_id === 'flame:crow'));

  const received = await bridge.receive({ target: 'crow' });
  assert.equal(received.records.at(-1).text, 'Crow answers directly.');
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
