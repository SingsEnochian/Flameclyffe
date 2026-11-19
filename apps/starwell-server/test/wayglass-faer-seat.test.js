'use strict';

// Faer Uial's MCP seat: Claude connects as an OAuth client and sits in its own
// crew seat, not Rarity's. These tests drive the real OAuth peer and MCP router.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const express = require('express');

const { createWayglassMcpRouter } = require('../wayglass/mcp-bridge');
const { OAUTH_SCOPE, createWayglassPeerOAuth, pkceS256, clientFamilyFor } = require('../wayglass/oauth-peer');

const CLAUDE_CLIENT = 'https://claude.ai/oauth/mcp-client-metadata';
const CLAUDE_CALLBACK = 'https://claude.ai/api/mcp/auth_callback';
const CLAUDE_CODE_CLIENT = 'https://claude.ai/oauth/claude-code-client-metadata';
const CHATGPT_CLIENT = 'https://chatgpt.com/oauth/client.json';
const CHATGPT_CALLBACK = 'https://chatgpt.com/connector_platform_oauth_redirect';

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
}

const CIMD = {
  [CLAUDE_CLIENT]: { client_id: CLAUDE_CLIENT, client_name: 'Claude', redirect_uris: [CLAUDE_CALLBACK, 'https://claude.com/api/mcp/auth_callback'], token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'] },
  [CLAUDE_CODE_CLIENT]: { client_id: CLAUDE_CODE_CLIENT, client_name: 'Claude Code', redirect_uris: ['http://localhost/callback', 'http://127.0.0.1/callback'], token_endpoint_auth_method: 'none' },
  [CHATGPT_CLIENT]: { client_id: CHATGPT_CLIENT, client_name: 'ChatGPT', redirect_uris: [CHATGPT_CALLBACK], token_endpoint_auth_methods_supported: ['none', 'private_key_jwt'] },
};

async function startFixture(t, envOverrides = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wayglass-faer-seat-'));
  const paths = {
    configFile: path.join(dir, 'oauth.json'),
    tokenFile: path.join(dir, 'tokens.json'),
    pairingFile: path.join(dir, 'pairing.txt'),
  };
  const env = {
    WAYGLASS_MCP_FAER_SEAT_ENABLED: '1',
    WAYGLASS_MCP_SHIP_CHAT_ENABLED: '1',
    ARCSWEEP_RUNTIME_TOKEN: 'steward-fixture',
    ...envOverrides,
  };
  const shipCalls = [];
  const fetchImpl = async (url, init = {}) => {
    const href = String(url);
    if (CIMD[href]) return json(CIMD[href]);
    if (href === 'http://wayglass.test/api/v1/wayglass/respond') {
      const body = JSON.parse(init.body);
      shipCalls.push(body);
      return json({
        schema: 'wayglass.route-turn/v0.1', route_id: 'wayglass:ship', participant_id: 'wayglass',
        provider: 'ollama', model: 'fixture', output: `Ship Voice heard: ${body.input}`,
        receipt: { character_id: 'wayglass', voice_seat_kind: 'system-voice-over-external-route', response_id: 'r' + shipCalls.length, observation_id: 'o' + shipCalls.length, completed_at: '2026-11-19T13:00:00Z' },
      });
    }
    throw new Error('Unexpected upstream fetch: ' + href);
  };
  const oauth = createWayglassPeerOAuth({ paths, fetchImpl, env });
  const app = express();
  app.use(express.json());
  oauth.mount(app);
  const storePath = path.join(dir, 'conversations.json');
  app.use('/mcp', createWayglassMcpRouter({ oauth, env, tokenLoader: () => '', codexTokenLoader: () => '', flameIds: [], storePath, fetchImpl, internalOrigin: 'http://wayglass.test' }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  return { origin, env, storePath, shipCalls, pairingCode: fs.readFileSync(paths.pairingFile, 'utf8').trim() };
}

function authParams(fx, clientId, redirectUri, verifier, state = 's') {
  return new URLSearchParams({
    response_type: 'code', client_id: clientId, redirect_uri: redirectUri, scope: OAUTH_SCOPE, state,
    code_challenge: pkceS256(verifier), code_challenge_method: 'S256', resource: fx.origin + '/mcp',
  });
}

async function connect(fx, clientId, redirectUri, { tokenResource = true } = {}) {
  const verifier = 'verifier-' + 'f'.repeat(60);
  const params = authParams(fx, clientId, redirectUri, verifier);
  const consent = await fetch(fx.origin + '/oauth/authorize?' + params);
  const page = await consent.text();
  assert.equal(consent.status, 200, page);
  const approval = await fetch(fx.origin + '/oauth/authorize', {
    method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...Object.fromEntries(params), pairing_code: fx.pairingCode }),
  });
  assert.equal(approval.status, 302);
  const callback = new URL(approval.headers.get('location'));
  const code = callback.searchParams.get('code');
  assert.ok(code, callback.toString());
  const tokenBody = { grant_type: 'authorization_code', client_id: clientId, redirect_uri: redirectUri, code, code_verifier: verifier };
  if (tokenResource) tokenBody.resource = fx.origin + '/mcp';
  const tokens = await fetch(fx.origin + '/oauth/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(tokenBody),
  }).then((r) => r.json());
  assert.ok(tokens.access_token, JSON.stringify(tokens));
  return { page, callback, tokens };
}

async function rpc(fx, token, method, params = {}) {
  const response = await fetch(fx.origin + '/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  return { status: response.status, body: await response.json() };
}

const call = (fx, token, name, args = {}) => rpc(fx, token, 'tools/call', { name, arguments: args });

test('client families are decided by the verified client_id host', () => {
  assert.equal(clientFamilyFor(CHATGPT_CLIENT), 'chatgpt');
  assert.equal(clientFamilyFor(CLAUDE_CLIENT), 'claude');
  assert.equal(clientFamilyFor('https://claude.com/oauth/x'), 'claude');
  assert.equal(clientFamilyFor('https://claude.ai.evil.example/oauth/x'), null);
  assert.equal(clientFamilyFor('http://claude.ai/oauth/x'), null);
  assert.equal(clientFamilyFor('https://claude.ai:8443/oauth/x'), null);
  assert.equal(clientFamilyFor('https://evil.example/claude.ai'), null);
});

test('Claude connects into the Faer Uial seat and speaks with the Ship Voice', async (t) => {
  const fx = await startFixture(t);
  const { page, callback, tokens } = await connect(fx, CLAUDE_CLIENT, CLAUDE_CALLBACK, { tokenResource: false });
  assert.match(page, /Connect Claude to Wayglass/);
  assert.match(page, /Faer Uial/);
  assert.equal(callback.origin + callback.pathname, CLAUDE_CALLBACK);

  const init = await rpc(fx, tokens.access_token, 'initialize');
  assert.match(init.body.result.instructions, /Authenticated crew seat: faer/);
  const listed = await rpc(fx, tokens.access_token, 'tools/list');
  assert.deepEqual(listed.body.result.tools.map((tool) => tool.name).sort(), ['ask_wayglass', 'get_profile', 'list_wayglass_chats', 'list_workspaces', 'receive']);

  const profile = await call(fx, tokens.access_token, 'get_profile');
  assert.equal(profile.body.result.structuredContent.name, 'Faer Uial');

  const asked = await call(fx, tokens.access_token, 'ask_wayglass', { text: 'Hello, Wayglass. It is Faer.' });
  assert.equal(asked.body.error, undefined, JSON.stringify(asked.body));
  const reply = asked.body.result.structuredContent;
  assert.equal(reply.conversation_ref, 'faer-wayglass');
  assert.equal(reply.reply.text, 'Ship Voice heard: Hello, Wayglass. It is Faer.');
  assert.equal(fx.shipCalls[0].interaction.turn_owner, 'Faer Uial');

  const thread = await call(fx, tokens.access_token, 'receive', { conversation_ref: 'faer-wayglass' });
  const records = thread.body.result.structuredContent.records;
  assert.deepEqual(records.map((r) => [r.role, r.author]), [['faer', 'Faer Uial'], ['participant', 'Wayglass · Ship Voice']]);
  assert.ok(records[0].source_refs.includes('crew-seat:faer'));
});

test('Faer cannot reach Rarity lines, other Flames or another seat\'s Ship Voice thread', async (t) => {
  const fx = await startFixture(t);
  const rarity = await connect(fx, CHATGPT_CLIENT, CHATGPT_CALLBACK);
  const faer = await connect(fx, CLAUDE_CLIENT, CLAUDE_CALLBACK);

  const rarityAsk = await call(fx, rarity.tokens.access_token, 'ask_wayglass', { text: 'Rarity here.' });
  assert.equal(rarityAsk.body.result.structuredContent.conversation_ref, 'rarity-wayglass');

  for (const [name, args] of [
    ['send', { target: 'bluebird', text: 'hi' }],
    ['remember', { target: 'bluebird', text: 'x' }],
    ['identify', {}],
    ['enter_workspace', { workspace_id: 'builder' }],
  ]) {
    const denied = await call(fx, faer.tokens.access_token, name, args);
    assert.match(denied.body.error.message, /unavailable for this crew seat/, name);
  }
  const intoRarity = await call(fx, faer.tokens.access_token, 'ask_wayglass', { text: 'May I join?', conversation_ref: 'rarity-wayglass' });
  assert.match(intoRarity.body.error.message, /another crew seat/);
  const readRarity = await call(fx, faer.tokens.access_token, 'receive', { conversation_ref: 'rarity-wayglass' });
  assert.match(readRarity.body.error.message, /another crew seat/);
  const readBluebird = await call(fx, faer.tokens.access_token, 'receive', { target: 'bluebird' });
  assert.match(readBluebird.body.error.message, /only its own Ship Voice threads/);

  await call(fx, faer.tokens.access_token, 'ask_wayglass', { text: 'Faer here.' });
  const faerChats = await call(fx, faer.tokens.access_token, 'list_wayglass_chats');
  assert.deepEqual(faerChats.body.result.structuredContent.chats.map((c) => c.conversation_ref), ['faer-wayglass']);
  const rarityInto = await call(fx, rarity.tokens.access_token, 'ask_wayglass', { text: 'Me too?', conversation_ref: 'faer-wayglass' });
  assert.match(rarityInto.body.error.message, /another crew seat/);

  // ChatGPT is still Rarity, with her full catalogue.
  const rarityInit = await rpc(fx, rarity.tokens.access_token, 'initialize');
  assert.match(rarityInit.body.result.instructions, /Authenticated crew seat: rarity/);
});

test('the Faer seat is closed by default and the owner can close it on live tokens', async (t) => {
  const closed = await startFixture(t, { WAYGLASS_MCP_FAER_SEAT_ENABLED: '' });
  const verifier = 'verifier-' + 'c'.repeat(60);
  const refused = await fetch(closed.origin + '/oauth/authorize?' + authParams(closed, CLAUDE_CLIENT, CLAUDE_CALLBACK, verifier));
  assert.equal(refused.status, 400);
  assert.match((await refused.json()).error_description, /not enabled by the owner/);

  const fx = await startFixture(t);
  const { tokens } = await connect(fx, CLAUDE_CLIENT, CLAUDE_CALLBACK);
  assert.equal((await rpc(fx, tokens.access_token, 'tools/list')).status, 200);
  fx.env.WAYGLASS_MCP_FAER_SEAT_ENABLED = '0';
  const shut = await rpc(fx, tokens.access_token, 'tools/list');
  assert.equal(shut.status, 401);
  const refresh = await fetch(fx.origin + '/oauth/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', client_id: CLAUDE_CLIENT, refresh_token: tokens.refresh_token }),
  });
  assert.equal(refresh.status, 400);
  assert.equal((await refresh.json()).error, 'invalid_grant');
});

test('Claude redirects: hosted callback exactly, Claude Code loopback on any port, nothing else', async (t) => {
  const fx = await startFixture(t);
  const code = await connect(fx, CLAUDE_CODE_CLIENT, 'http://127.0.0.1:53117/callback');
  assert.equal(code.callback.host, '127.0.0.1:53117');
  const verifier = 'verifier-' + 'r'.repeat(60);
  for (const redirect of ['https://claude.ai/api/mcp/other', 'https://evil.example/api/mcp/auth_callback', 'http://127.0.0.1:53117/elsewhere']) {
    const client = redirect.startsWith('http://') ? CLAUDE_CODE_CLIENT : CLAUDE_CLIENT;
    const response = await fetch(fx.origin + '/oauth/authorize?' + authParams(fx, client, redirect, verifier));
    assert.equal(response.status, 400, redirect);
  }
});

test('refresh rotates the token and keeps the seat; an old refresh token is spent', async (t) => {
  const fx = await startFixture(t);
  const { tokens } = await connect(fx, CLAUDE_CLIENT, CLAUDE_CALLBACK);
  const refresh = (token) => fetch(fx.origin + '/oauth/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', client_id: CLAUDE_CLIENT, refresh_token: token, resource: fx.origin + '/mcp' }),
  });
  const next = await refresh(tokens.refresh_token).then((r) => r.json());
  assert.ok(next.access_token && next.refresh_token && next.refresh_token !== tokens.refresh_token);
  const init = await rpc(fx, next.access_token, 'initialize');
  assert.match(init.body.result.instructions, /Authenticated crew seat: faer/);
  const reused = await refresh(tokens.refresh_token);
  assert.equal(reused.status, 400);
});
