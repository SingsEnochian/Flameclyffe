'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const express = require('express');

const { createWayglassMcpRouter } = require('../wayglass/mcp-bridge');
const {
  OAUTH_SCOPE,
  createWayglassPeerOAuth,
  pkceS256,
} = require('../wayglass/oauth-peer');

function fixturePaths() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wayglass-peer-oauth-'));
  return {
    dir,
    paths: {
      configFile: path.join(dir, 'wayglass-peer-oauth.local.json'),
      tokenFile: path.join(dir, 'wayglass-peer-oauth-tokens.local.json'),
      pairingFile: path.join(dir, 'wayglass-peer-oauth-pairing.local.txt'),
    },
    conversationStore: path.join(dir, 'wayglass-rarity-mcp-conversations.json'),
  };
}

function chatGptClientMetadata(clientId, redirectUri) {
  return {
    client_id: clientId,
    client_uri: 'https://chatgpt.com/',
    redirect_uris: [redirectUri],
    token_endpoint_auth_method: 'private_key_jwt',
    token_endpoint_auth_methods_supported: ['none', 'private_key_jwt'],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    client_name: 'ChatGPT',
    jwks_uri: 'https://chatgpt.com/oauth/jwks.json',
  };
}

async function startFixture(t) {
  const { paths, conversationStore } = fixturePaths();
  const clientId = 'https://chatgpt.com/oauth/client.json';
  const redirectUri = 'https://chatgpt.com/connector_platform_oauth_redirect';
  const fetchImpl = async (url) => {
    if (String(url) === clientId) {
      return new Response(JSON.stringify(chatGptClientMetadata(clientId, redirectUri)), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    throw new Error('Unexpected upstream fetch: ' + url);
  };

  const oauth = createWayglassPeerOAuth({ paths, fetchImpl });
  const app = express();
  app.use(express.json());
  oauth.mount(app);
  app.use('/mcp', createWayglassMcpRouter({
    oauth,
    tokenLoader: () => '',
    flameIds: [],
    storePath: conversationStore,
    fetchImpl,
  }));

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();
  const origin = `http://127.0.0.1:${address.port}`;
  return {
    origin,
    clientId,
    redirectUri,
    paths,
    oauth,
    pairingCode: fs.readFileSync(paths.pairingFile, 'utf8').trim(),
  };
}

function authParams({ origin, clientId, redirectUri, challenge, state = 'state-1' }) {
  return new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: OAUTH_SCOPE,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    resource: origin + '/mcp',
  });
}

test('Wayglass publishes protected-resource and OAuth discovery metadata for ChatGPT', async (t) => {
  const fx = await startFixture(t);
  const resource = await fetch(fx.origin + '/.well-known/oauth-protected-resource/mcp').then((r) => r.json());
  assert.equal(resource.resource, fx.origin + '/mcp');
  assert.deepEqual(resource.authorization_servers, [fx.origin]);
  assert.deepEqual(resource.scopes_supported, [OAUTH_SCOPE]);

  const auth = await fetch(fx.origin + '/.well-known/oauth-authorization-server').then((r) => r.json());
  assert.equal(auth.issuer, fx.origin);
  assert.equal(auth.authorization_endpoint, fx.origin + '/oauth/authorize');
  assert.equal(auth.token_endpoint, fx.origin + '/oauth/token');
  assert.ok(auth.code_challenge_methods_supported.includes('S256'));
  assert.ok(auth.token_endpoint_auth_methods_supported.includes('none'));
  assert.equal(auth.client_id_metadata_document_supported, true);
  assert.equal(auth.authorization_response_iss_parameter_supported, true);
});

test('MCP rejects an unauthenticated request with a protected-resource challenge', async (t) => {
  const fx = await startFixture(t);
  const response = await fetch(fx.origin + '/mcp');
  assert.equal(response.status, 401);
  const challenge = response.headers.get('www-authenticate') || '';
  assert.match(challenge, /oauth-protected-resource\/mcp/);
  assert.match(challenge, /wayglass:constellation/);
});

test('authorization requires ChatGPT CIMD, PKCE S256, exact resource and local pairing approval', async (t) => {
  const fx = await startFixture(t);
  const verifier = 'verifier-' + 'x'.repeat(64);
  const params = authParams({
    origin: fx.origin,
    clientId: fx.clientId,
    redirectUri: fx.redirectUri,
    challenge: pkceS256(verifier),
  });

  const form = await fetch(fx.origin + '/oauth/authorize?' + params);
  assert.equal(form.status, 200);
  assert.match(await form.text(), /Open the Wayglass bridge/);

  const wrongPair = await fetch(fx.origin + '/oauth/authorize', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...Object.fromEntries(params), pairing_code: 'wrong-code' }),
    redirect: 'manual',
  });
  assert.equal(wrongPair.status, 302);
  const denied = new URL(wrongPair.headers.get('location'));
  assert.equal(denied.searchParams.get('error'), 'access_denied');
  assert.equal(denied.searchParams.get('iss'), fx.origin);

  const wrongResource = new URLSearchParams(params);
  wrongResource.set('resource', fx.origin + '/not-mcp');
  const resourceResponse = await fetch(fx.origin + '/oauth/authorize?' + wrongResource);
  assert.equal(resourceResponse.status, 400);
  assert.equal((await resourceResponse.json()).error, 'invalid_request');

  const wrongMethod = new URLSearchParams(params);
  wrongMethod.set('code_challenge_method', 'plain');
  const pkceResponse = await fetch(fx.origin + '/oauth/authorize?' + wrongMethod);
  assert.equal(pkceResponse.status, 400);
  assert.equal((await pkceResponse.json()).error, 'invalid_request');
});

test('authorization code is single-use, access token opens MCP, profile is stable, refresh rotates', async (t) => {
  const fx = await startFixture(t);
  const verifier = 'v-' + '0123456789abcdef'.repeat(5);
  const params = authParams({
    origin: fx.origin,
    clientId: fx.clientId,
    redirectUri: fx.redirectUri,
    challenge: pkceS256(verifier),
    state: 'state-live',
  });

  const approval = await fetch(fx.origin + '/oauth/authorize', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...Object.fromEntries(params), pairing_code: fx.pairingCode }),
    redirect: 'manual',
  });
  assert.equal(approval.status, 302);
  const callback = new URL(approval.headers.get('location'));
  assert.equal(callback.origin, 'https://chatgpt.com');
  assert.equal(callback.searchParams.get('state'), 'state-live');
  assert.equal(callback.searchParams.get('iss'), fx.origin);
  const code = callback.searchParams.get('code');
  assert.ok(code);

  const badVerifier = await fetch(fx.origin + '/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: fx.clientId,
      redirect_uri: fx.redirectUri,
      code,
      code_verifier: 'wrong-verifier',
      resource: fx.origin + '/mcp',
    }),
  });
  assert.equal(badVerifier.status, 400);
  assert.equal((await badVerifier.json()).error, 'invalid_grant');

  const tokenResponse = await fetch(fx.origin + '/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: fx.clientId,
      redirect_uri: fx.redirectUri,
      code,
      code_verifier: verifier,
      resource: fx.origin + '/mcp',
    }),
  });
  assert.equal(tokenResponse.status, 200);
  const token = await tokenResponse.json();
  assert.equal(token.token_type, 'Bearer');
  assert.equal(token.scope, OAUTH_SCOPE);
  assert.ok(token.access_token);
  assert.ok(token.refresh_token);

  const replay = await fetch(fx.origin + '/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: fx.clientId,
      redirect_uri: fx.redirectUri,
      code,
      code_verifier: verifier,
      resource: fx.origin + '/mcp',
    }),
  });
  assert.equal(replay.status, 400);
  assert.equal((await replay.json()).error, 'invalid_grant');

  const listResponse = await fetch(fx.origin + '/mcp', {
    method: 'POST',
    headers: {
      authorization: 'Bearer ' + token.access_token,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
  });
  assert.equal(listResponse.status, 200);
  const listed = await listResponse.json();
  const names = listed.result.tools.map((tool) => tool.name);
  assert.deepEqual(names, ['get_profile', 'list_workspaces', 'enter_workspace', 'read_project', 'write_project_file', 'leave_workspace', 'list_inquiries', 'open_inquiry', 'read_inquiry', 'invite_to_inquiry', 'join_inquiry', 'contribute_to_inquiry', 'pause_inquiry', 'inspect_workspace_project', 'write_workspace_artifact', 'handoff_workspace_project', 'identify', 'send', 'receive', 'remember']);
  for (const tool of listed.result.tools) {
    assert.deepEqual(tool.securitySchemes, [{ type: 'oauth2', scopes: [OAUTH_SCOPE] }]);
  }

  const profileCall = async (accessToken, id) => fetch(fx.origin + '/mcp', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + accessToken, 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'get_profile', arguments: {} } }),
  }).then((r) => r.json());

  const profileA = await profileCall(token.access_token, 2);
  assert.equal(profileA.result.structuredContent.name, 'Wayglass');
  assert.match(profileA.result.structuredContent.id, /^wayglass-profile-/);

  const workspaceCall = async (accessToken, name, args) => {
    const response = await fetch(fx.origin + '/mcp', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + accessToken, 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name, arguments: args } }),
    });
    const result = await response.json();
    assert.equal(result.error, undefined, JSON.stringify(result));
    return result.result.structuredContent;
  };
  const entered = await workspaceCall(token.access_token, 'enter_workspace', { workspace_id: 'builder', project_id: 'oauth-trial' });
  assert.equal(entered.participant.participant_id, 'rarity');
  const changed = await workspaceCall(token.access_token, 'write_project_file', { session_id: entered.session_id, path: 'hello.txt', content: 'OAuth-authored work', expected_hash: null });
  assert.equal(changed.receipt.participant_id, 'rarity');

  const refreshResponse = await fetch(fx.origin + '/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: fx.clientId,
      refresh_token: token.refresh_token,
      resource: fx.origin + '/mcp',
    }),
  });
  assert.equal(refreshResponse.status, 200);
  const refreshed = await refreshResponse.json();
  assert.notEqual(refreshed.access_token, token.access_token);
  assert.notEqual(refreshed.refresh_token, token.refresh_token);

  const profileB = await profileCall(refreshed.access_token, 3);
  assert.equal(profileB.result.structuredContent.id, profileA.result.structuredContent.id);

  const restored = await workspaceCall(refreshed.access_token, 'read_project', { session_id: entered.session_id });
  assert.equal(restored.files[0].content, 'OAuth-authored work');
  const left = await workspaceCall(refreshed.access_token, 'leave_workspace', { session_id: entered.session_id, stop_point: 'OAuth turn complete', next_owner: 'codex' });
  const returned = await workspaceCall(refreshed.access_token, 'enter_workspace', { workspace_id: 'builder', project_id: 'oauth-trial', stop_receipt_id: left.departure.stop_receipt.receipt_id });
  assert.equal(returned.recovered_departure.stop_receipt.next_owner, 'codex');

  const reusedRefresh = await fetch(fx.origin + '/oauth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: fx.clientId,
      refresh_token: token.refresh_token,
      resource: fx.origin + '/mcp',
    }),
  });
  assert.equal(reusedRefresh.status, 400);
  assert.equal((await reusedRefresh.json()).error, 'invalid_grant');
});
