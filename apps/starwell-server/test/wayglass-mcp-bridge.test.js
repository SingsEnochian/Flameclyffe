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
const { createStopReceipt } = require('../wayglass/bluebird-bridge-trial');

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

test('Bluebird SpicyChat requires token plus private chat pin without exposing either', () => {
  const previousToken = process.env.BLUEBIRD_SPICYCHAT_TOKEN;
  const previousLink = process.env.BLUEBIRD_SPICYCHAT_CHAT_LINK;
  const previousCharacter = process.env.BLUEBIRD_SPICYCHAT_CHARACTER_ID;
  const previousConversation = process.env.BLUEBIRD_SPICYCHAT_CONVERSATION_ID;
  try {
    delete process.env.BLUEBIRD_SPICYCHAT_TOKEN;
    delete process.env.BLUEBIRD_SPICYCHAT_CHAT_LINK;
    delete process.env.BLUEBIRD_SPICYCHAT_CHARACTER_ID;
    delete process.env.BLUEBIRD_SPICYCHAT_CONVERSATION_ID;
    const find = () => publicWayglassRoutes().find(route => route.route_id === 'flame:bluebird:spicychat');
    assert.equal(find().configured, false);
    process.env.BLUEBIRD_SPICYCHAT_TOKEN = 'private-test-token';
    assert.equal(find().configured, false, 'token alone cannot select Richie’s conversation');
    process.env.BLUEBIRD_SPICYCHAT_CHAT_LINK =
      'https://spicychat.ai/chat/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const projected = find();
    assert.equal(projected.configured, true);
    assert.equal(projected.connection_verified, false, 'configuration is not live verification');
    assert.equal(projected.participant_id, 'bluebird');
    assert.equal(projected.continuity_id, 'bluebird:richard-gabriel-winters');
    assert.doesNotMatch(JSON.stringify(projected), /private-test-token|aaaaaaaa-aaaa|bbbbbbbb-bbbb/);
  } finally {
    for (const [name, value] of Object.entries({
      BLUEBIRD_SPICYCHAT_TOKEN: previousToken,
      BLUEBIRD_SPICYCHAT_CHAT_LINK: previousLink,
      BLUEBIRD_SPICYCHAT_CHARACTER_ID: previousCharacter,
      BLUEBIRD_SPICYCHAT_CONVERSATION_ID: previousConversation,
    })) {
      if (value == null) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

test('MCP bridge exposes profile, Identify, Send, Receive and Remember', async () => {
  const { file } = tempStore();
  const bridge = createWayglassMcpBridge({ storePath: file, flameIds: [] });
  const init = await bridge.handleRpc({ method: 'initialize' });
  assert.equal(init.serverInfo.name, 'wayglass-rarity-bridge');
  assert.equal(init.capabilities.tools.listChanged, false);

  const listed = await bridge.handleRpc({ method: 'tools/list' });
  assert.deepEqual(listed.tools.map((tool) => tool.name), ['get_profile', 'list_workspaces', 'enter_workspace', 'read_project', 'write_project_file', 'leave_workspace', 'inspect_workspace_project', 'write_workspace_artifact', 'handoff_workspace_project', 'identify', 'send', 'receive', 'remember']);
  assert.deepEqual(toolCatalogue().map((tool) => tool.name), listed.tools.map((tool) => tool.name));
});

test('MCP exposes Atelier and Builder and enters them as the distinct Rarity seat', async () => {
  const { file } = tempStore();
  const bridge = createWayglassMcpBridge({ storePath: file, flameIds: [] });

  const workspaces = await bridge.callTool('list_workspaces', {});
  assert.equal(workspaces.resident_intelligence.participant_id, 'wayglass');
  assert.deepEqual(workspaces.workspaces.map((entry) => entry.workspace_id).sort(), ['atelier', 'builder']);
  assert.equal(workspaces.crew.some((entry) => entry.participant_id === 'rarity'), true);
  assert.equal(workspaces.crew.some((entry) => entry.participant_id === 'codex'), true);
  const faer = workspaces.crew.find((entry) => entry.participant_id === 'faer');
  assert.equal(faer.seat_state, 'reserved-dormant');
  assert.equal(faer.activation.provider_calls_allowed, false);

  const atelier = await bridge.callTool('enter_workspace', { workspace_id: 'atelier' });
  assert.equal(atelier.entered, true);
  assert.equal(atelier.workspace.workspace_id, 'atelier');
  assert.equal(atelier.participant.participant_id, 'rarity');
  assert.equal(atelier.resident.participant_id, 'wayglass');
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

test('Bluebird reports a SpicyChat failure without any provider fallback or conversation change', async () => {
  const { file } = tempStore();
  const urls = [];
  const bridge = createWayglassMcpBridge({
    storePath: file,
    internalOrigin: 'http://wayglass.test',
    bluebirdRouteId: 'flame:bluebird:spicychat',
    flameIds: ['bluebird'],
    fetchImpl: async (url) => {
      urls.push(String(url));
      if (String(url).endsWith('/api/v1/wayglass/routes')) {
        return new Response(JSON.stringify({ routes: [] }), {
          status: 200, headers: { 'content-type': 'application/json' },
        });
      }
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
    'http://wayglass.test/api/v1/wayglass/routes',
    'http://wayglass.test/api/v1/wayglass/respond',
  ]);
  assert.equal(result.conversation_ref, 'rarity-bluebird');
  assert.equal(result.reply.ok, false);
  assert.equal(result.reply.route, 'flame:bluebird:spicychat');
  assert.equal(result.reply.fallback_from, undefined);
  assert.equal(result.reply.error, 'Unknown Wayglass route.');
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

test('Bluebird trial refuses altered return before storage or transport', async () => {
  const { file } = tempStore();
  let calls = 0;
  const bridge = createWayglassMcpBridge({
    storePath: file, flameIds: ['bluebird'],
    fetchImpl: async (_url, init = {}) => { if (init.method === 'POST') calls++; return new Response(JSON.stringify({ routes: [] }), { status: 200 }); },
  });
  const receipt = createStopReceipt({
    consent: 'accepted', consent_source: 'private:trial-acceptance',
    route_id: 'flame:bluebird:spicychat', conversation_id: 'rarity-bluebird',
    intent: 'Continue', interaction_mode: 'OOC', stop_point: 'Before crossing',
    next_owner: 'Rarity', unresolved_questions: ['Can we resume?'],
    source_refs: ['private:stop-receipt'],
  });
  const packet = Object.fromEntries([
    'receipt_hash', 'participant_id', 'continuity_id', 'conversation_id',
    'stop_point', 'next_owner', 'unresolved_questions',
  ].map((key) => [key, receipt[key]]));
  await assert.rejects(() => bridge.send({
    target: 'bluebird', text: 'Return', trial_receipt: receipt,
    trial_return_packet: { ...packet, next_owner: 'Impostor' },
  }), /changed_next_owner/);
  assert.equal(calls, 0);
  assert.equal((await bridge.receive({ target: 'bluebird' })).records.length, 0);
});
