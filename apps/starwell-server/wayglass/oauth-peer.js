'use strict';

const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} = require('node:crypto');

const OAUTH_SCOPE = 'wayglass:constellation';
const CONFIG_SCHEMA = 'wayglass.peer-oauth-config/v0.1';
const TOKEN_STORE_SCHEMA = 'wayglass.peer-oauth-token-store/v0.1';
const AUTH_CODE_TTL_MS = 5 * 60 * 1000;
const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const CHATGPT_CLIENT_HOST = 'chatgpt.com';

function cleanText(value, max = 4096) {
  return String(value ?? '').trim().slice(0, max);
}

function sha256(value) {
  return createHash('sha256').update(String(value || '')).digest('base64url');
}

function constantTimeEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

function ensureDir(filename) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
}

function atomicWriteJson(filename, value) {
  ensureDir(filename);
  const temp = `${filename}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), 'utf8');
  fs.renameSync(temp, filename);
}

function readJson(filename, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
  } catch {
    return fallback;
  }
}

function randomToken(prefix) {
  return `${prefix}_${randomBytes(32).toString('base64url')}`;
}

function defaultPaths(env = process.env) {
  const dataDir = path.join(__dirname, '..', 'data');
  return {
    configFile: env.WAYGLASS_PEER_OAUTH_CONFIG_FILE || path.join(dataDir, 'wayglass-peer-oauth.local.json'),
    tokenFile: env.WAYGLASS_PEER_OAUTH_TOKENS_FILE || path.join(dataDir, 'wayglass-peer-oauth-tokens.local.json'),
    pairingFile: env.WAYGLASS_PEER_OAUTH_PAIRING_FILE || path.join(dataDir, 'wayglass-peer-oauth-pairing.local.txt'),
  };
}

function ensureConfig(filename) {
  const existing = readJson(filename, null);
  if (existing?.schema === CONFIG_SCHEMA && cleanText(existing.profile_id, 160)) return existing;
  const next = {
    schema: CONFIG_SCHEMA,
    profile_id: `wayglass-profile-${randomUUID()}`,
    created_at: new Date().toISOString(),
  };
  atomicWriteJson(filename, next);
  return next;
}

function ensurePairingCode(filename) {
  try {
    const existing = cleanText(fs.readFileSync(filename, 'utf8'), 256);
    if (existing) return existing;
  } catch {}
  ensureDir(filename);
  const code = randomBytes(18).toString('base64url');
  fs.writeFileSync(filename, code + '\n', { encoding: 'utf8', mode: 0o600 });
  return code;
}

function emptyTokenStore() {
  return {
    schema: TOKEN_STORE_SCHEMA,
    updated_at: null,
    authorization_codes: [],
    access_tokens: [],
    refresh_tokens: [],
  };
}

function loadTokenStore(filename) {
  const data = readJson(filename, emptyTokenStore());
  if (data?.schema !== TOKEN_STORE_SCHEMA) return emptyTokenStore();
  return {
    schema: TOKEN_STORE_SCHEMA,
    updated_at: data.updated_at || null,
    authorization_codes: Array.isArray(data.authorization_codes) ? data.authorization_codes : [],
    access_tokens: Array.isArray(data.access_tokens) ? data.access_tokens : [],
    refresh_tokens: Array.isArray(data.refresh_tokens) ? data.refresh_tokens : [],
  };
}

function purgeTokenStore(store, now = Date.now()) {
  const live = (row) => {
    const expires = Date.parse(row?.expires_at || '');
    return Number.isFinite(expires) && expires > now && !row.revoked_at;
  };
  store.authorization_codes = store.authorization_codes.filter((row) => live(row) && !row.used_at);
  store.access_tokens = store.access_tokens.filter(live);
  store.refresh_tokens = store.refresh_tokens.filter(live);
  return store;
}

function saveTokenStore(filename, store) {
  purgeTokenStore(store);
  store.updated_at = new Date().toISOString();
  atomicWriteJson(filename, store);
  return store;
}

function originFromRequest(req, env = process.env) {
  const configured = cleanText(env.WAYGLASS_PUBLIC_ORIGIN, 1000).replace(/\/$/, '');
  if (configured) return configured;
  const forwardedProto = cleanText(req.headers['x-forwarded-proto'], 40).split(',')[0].trim();
  const forwardedHost = cleanText(req.headers['x-forwarded-host'], 500).split(',')[0].trim();
  const proto = forwardedProto || req.protocol || 'http';
  const host = forwardedHost || cleanText(req.headers.host, 500);
  return `${proto}://${host}`.replace(/\/$/, '');
}

function resourceForOrigin(origin) {
  return `${String(origin).replace(/\/$/, '')}/mcp`;
}

function metadataUrlForOrigin(origin) {
  return `${String(origin).replace(/\/$/, '')}/.well-known/oauth-protected-resource/mcp`;
}

function challengeForOrigin(origin, error = 'invalid_token', description = 'A valid Wayglass OAuth token is required.') {
  const escaped = (value) => String(value).replace(/["\\]/g, '\\$&');
  return `Bearer resource_metadata="${escaped(metadataUrlForOrigin(origin))}", scope="${OAUTH_SCOPE}", error="${escaped(error)}", error_description="${escaped(description)}"`;
}

function requestedScopes(value) {
  const scopes = cleanText(value, 2000).split(/\s+/).filter(Boolean);
  return scopes.length ? [...new Set(scopes)] : [OAUTH_SCOPE];
}

function includesRequiredScope(scopes) {
  return Array.isArray(scopes) && scopes.includes(OAUTH_SCOPE);
}

function appendQuery(urlValue, params) {
  const url = new URL(urlValue);
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function htmlEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

function hiddenInput(name, value) {
  return `<input type="hidden" name="${htmlEscape(name)}" value="${htmlEscape(value)}">`;
}

async function validateChatGptCimd(clientId, redirectUri, fetchImpl = globalThis.fetch) {
  let clientUrl;
  try { clientUrl = new URL(clientId); } catch { throw Object.assign(new Error('client_id must be an HTTPS CIMD URL.'), { status: 400 }); }
  if (clientUrl.protocol !== 'https:' || clientUrl.hostname !== CHATGPT_CLIENT_HOST || !/^\/oauth\/(?:[^/]+\/)?client\.json$/.test(clientUrl.pathname)) {
    throw Object.assign(new Error('Only ChatGPT CIMD clients are accepted by this private Wayglass bridge.'), { status: 400 });
  }
  const response = await fetchImpl(clientUrl.toString(), {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  const metadata = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error('Could not validate the ChatGPT CIMD document.'), { status: 400 });
  if (metadata.client_id && metadata.client_id !== clientUrl.toString()) {
    throw Object.assign(new Error('CIMD client_id does not match the requested client.'), { status: 400 });
  }
  const redirectUris = Array.isArray(metadata.redirect_uris) ? metadata.redirect_uris : [];
  if (!redirectUris.includes(redirectUri)) {
    throw Object.assign(new Error('redirect_uri is not declared by the ChatGPT CIMD document.'), { status: 400 });
  }
  const authMethods = Array.isArray(metadata.token_endpoint_auth_methods_supported)
    ? metadata.token_endpoint_auth_methods_supported
    : [metadata.token_endpoint_auth_method].filter(Boolean);
  if (!authMethods.includes('none')) {
    throw Object.assign(new Error('ChatGPT CIMD does not permit public-client token exchange.'), { status: 400 });
  }
  return metadata;
}

function pkceS256(verifier) {
  return sha256(verifier);
}

function createWayglassPeerOAuth({
  env = process.env,
  fetchImpl = globalThis.fetch,
  clock = () => new Date(),
  paths = defaultPaths(env),
} = {}) {
  const config = ensureConfig(paths.configFile);
  ensurePairingCode(paths.pairingFile);

  function tokenStore() {
    return purgeTokenStore(loadTokenStore(paths.tokenFile), clock().getTime());
  }

  function save(store) {
    return saveTokenStore(paths.tokenFile, store);
  }

  function pairingCode() {
    return ensurePairingCode(paths.pairingFile);
  }

  function metadataFor(req) {
    const origin = originFromRequest(req, env);
    const resource = resourceForOrigin(origin);
    return {
      origin,
      resource,
      protectedResource: {
        resource,
        authorization_servers: [origin],
        scopes_supported: [OAUTH_SCOPE],
        bearer_methods_supported: ['header'],
        resource_name: 'Wayglass Constellation',
      },
      authorizationServer: {
        issuer: origin,
        authorization_endpoint: `${origin}/oauth/authorize`,
        token_endpoint: `${origin}/oauth/token`,
        response_types_supported: ['code'],
        response_modes_supported: ['query'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        code_challenge_methods_supported: ['S256'],
        token_endpoint_auth_methods_supported: ['none'],
        scopes_supported: [OAUTH_SCOPE],
        client_id_metadata_document_supported: true,
        authorization_response_iss_parameter_supported: true,
      },
    };
  }

  function issueTokens({ clientId, resource, scopes, profileId = config.profile_id }) {
    const now = clock().getTime();
    const accessToken = randomToken('wga');
    const refreshToken = randomToken('wgr');
    const store = tokenStore();
    store.access_tokens.push({
      token_hash: sha256(accessToken),
      client_id: clientId,
      profile_id: profileId,
      resource,
      scopes,
      issued_at: new Date(now).toISOString(),
      expires_at: new Date(now + ACCESS_TOKEN_TTL_MS).toISOString(),
    });
    store.refresh_tokens.push({
      token_hash: sha256(refreshToken),
      client_id: clientId,
      profile_id: profileId,
      resource,
      scopes,
      issued_at: new Date(now).toISOString(),
      expires_at: new Date(now + REFRESH_TOKEN_TTL_MS).toISOString(),
    });
    save(store);
    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
      refresh_token: refreshToken,
      scope: scopes.join(' '),
    };
  }

  function authenticateToken(rawToken, { origin, requiredScopes = [OAUTH_SCOPE] } = {}) {
    const token = cleanText(rawToken, 8192);
    if (!token) return null;
    const resource = resourceForOrigin(origin);
    const hash = sha256(token);
    const store = tokenStore();
    const record = store.access_tokens.find((row) => (
      constantTimeEqual(row.token_hash, hash)
      && row.resource === resource
      && requiredScopes.every((scope) => row.scopes?.includes(scope))
    ));
    if (!record) return null;
    return {
      type: 'oauth',
      profile_id: record.profile_id,
      client_id: record.client_id,
      resource: record.resource,
      scopes: [...record.scopes],
      expires_at: record.expires_at,
    };
  }

  function profile() {
    return {
      id: config.profile_id,
      name: 'Wayglass',
      nickname: 'Rarity ⇄ Wayglass',
    };
  }

  function mount(app) {
    app.get('/.well-known/oauth-protected-resource/mcp', (req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      return res.json(metadataFor(req).protectedResource);
    });
    app.get('/.well-known/oauth-protected-resource', (req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      return res.json(metadataFor(req).protectedResource);
    });
    app.get('/.well-known/oauth-authorization-server', (req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      return res.json(metadataFor(req).authorizationServer);
    });

    const urlencoded = express.urlencoded({ extended: false, limit: '32kb' });

    app.get('/oauth/authorize', async (req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      const meta = metadataFor(req);
      const params = {
        response_type: cleanText(req.query.response_type, 80),
        client_id: cleanText(req.query.client_id, 1200),
        redirect_uri: cleanText(req.query.redirect_uri, 1200),
        scope: cleanText(req.query.scope, 2000),
        state: cleanText(req.query.state, 3000),
        code_challenge: cleanText(req.query.code_challenge, 3000),
        code_challenge_method: cleanText(req.query.code_challenge_method, 40),
        resource: cleanText(req.query.resource, 1200),
      };
      try {
        if (params.response_type !== 'code') throw Object.assign(new Error('response_type=code required.'), { status: 400 });
        if (!params.client_id || !params.redirect_uri) throw Object.assign(new Error('client_id and redirect_uri required.'), { status: 400 });
        if (!params.code_challenge || params.code_challenge_method !== 'S256') throw Object.assign(new Error('PKCE S256 is required.'), { status: 400 });
        if (params.resource !== meta.resource) throw Object.assign(new Error('OAuth resource must match this Wayglass MCP endpoint.'), { status: 400 });
        const scopes = requestedScopes(params.scope);
        if (!includesRequiredScope(scopes)) throw Object.assign(new Error(`Scope ${OAUTH_SCOPE} is required.`), { status: 400 });
        const client = await validateChatGptCimd(params.client_id, params.redirect_uri, fetchImpl);
        const fields = Object.entries(params).map(([name, value]) => hiddenInput(name, value)).join('');
        return res.type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Connect ChatGPT to Wayglass</title>
<style>body{font-family:system-ui,sans-serif;background:#071316;color:#e9fff7;max-width:42rem;margin:8vh auto;padding:2rem}main{border:1px solid #567f78;border-radius:18px;padding:2rem;background:#0d2024}input{width:100%;box-sizing:border-box;padding:.8rem;margin:.5rem 0 1rem;background:#061012;color:#fff;border:1px solid #688b84;border-radius:10px}button{padding:.8rem 1.2rem;border-radius:999px;border:0;font-weight:700}small{color:#a9c8c1}</style></head>
<body><main><h1>Open the Wayglass bridge?</h1><p><strong>${htmlEscape(client.client_name || 'ChatGPT')}</strong> is asking for <code>${OAUTH_SCOPE}</code> access to this private Wayglass MCP endpoint.</p>
<p>This grants access to the Constellation conversation bridge, including the preserved Rarity ⇄ Bluebird line.</p>
<form method="post" action="/oauth/authorize">${fields}<label>Local pairing code<input type="password" name="pairing_code" autocomplete="one-time-code" required></label><button type="submit">Authorise Wayglass</button></form>
<p><small>The pairing code stays on this machine in the Wayglass local data directory.</small></p></main></body></html>`);
      } catch (error) {
        return res.status(error.status || 400).json({ error: 'invalid_request', error_description: error.message });
      }
    });

    app.post('/oauth/authorize', urlencoded, async (req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      const meta = metadataFor(req);
      const body = req.body || {};
      const params = {
        response_type: cleanText(body.response_type, 80),
        client_id: cleanText(body.client_id, 1200),
        redirect_uri: cleanText(body.redirect_uri, 1200),
        scope: cleanText(body.scope, 2000),
        state: cleanText(body.state, 3000),
        code_challenge: cleanText(body.code_challenge, 3000),
        code_challenge_method: cleanText(body.code_challenge_method, 40),
        resource: cleanText(body.resource, 1200),
      };
      const fail = (name, description) => {
        if (!params.redirect_uri) return res.status(400).json({ error: name, error_description: description });
        return res.redirect(302, appendQuery(params.redirect_uri, {
          error: name,
          error_description: description,
          state: params.state,
          iss: meta.origin,
        }));
      };
      try {
        if (!constantTimeEqual(pairingCode(), cleanText(body.pairing_code, 256))) return fail('access_denied', 'The local Wayglass pairing code did not match.');
        if (params.response_type !== 'code' || !params.client_id || !params.redirect_uri) return fail('invalid_request', 'Incomplete authorization request.');
        if (!params.code_challenge || params.code_challenge_method !== 'S256') return fail('invalid_request', 'PKCE S256 is required.');
        if (params.resource !== meta.resource) return fail('invalid_target', 'OAuth resource does not match this Wayglass endpoint.');
        const scopes = requestedScopes(params.scope);
        if (!includesRequiredScope(scopes)) return fail('invalid_scope', `Scope ${OAUTH_SCOPE} is required.`);
        await validateChatGptCimd(params.client_id, params.redirect_uri, fetchImpl);

        const code = randomToken('wgc');
        const now = clock().getTime();
        const store = tokenStore();
        store.authorization_codes.push({
          code_hash: sha256(code),
          client_id: params.client_id,
          redirect_uri: params.redirect_uri,
          resource: params.resource,
          scopes,
          code_challenge: params.code_challenge,
          code_challenge_method: 'S256',
          profile_id: config.profile_id,
          issued_at: new Date(now).toISOString(),
          expires_at: new Date(now + AUTH_CODE_TTL_MS).toISOString(),
        });
        save(store);
        return res.redirect(302, appendQuery(params.redirect_uri, {
          code,
          state: params.state,
          iss: meta.origin,
        }));
      } catch (error) {
        return fail('server_error', error.message || 'Wayglass authorization failed.');
      }
    });

    app.post('/oauth/token', urlencoded, async (req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      const meta = metadataFor(req);
      const body = req.body || {};
      const grantType = cleanText(body.grant_type, 80);
      const clientId = cleanText(body.client_id, 1200);
      const resource = cleanText(body.resource, 1200);
      if (!clientId) return res.status(400).json({ error: 'invalid_client' });
      if (resource !== meta.resource) return res.status(400).json({ error: 'invalid_target' });

      try {
        if (grantType === 'authorization_code') {
          const code = cleanText(body.code, 8192);
          const redirectUri = cleanText(body.redirect_uri, 1200);
          const verifier = cleanText(body.code_verifier, 8192);
          if (!code || !redirectUri || !verifier) return res.status(400).json({ error: 'invalid_request' });
          await validateChatGptCimd(clientId, redirectUri, fetchImpl);
          const store = tokenStore();
          const codeHash = sha256(code);
          const row = store.authorization_codes.find((item) => (
            constantTimeEqual(item.code_hash, codeHash)
            && !item.used_at
            && item.client_id === clientId
            && item.redirect_uri === redirectUri
            && item.resource === resource
          ));
          if (!row || row.code_challenge_method !== 'S256' || !constantTimeEqual(row.code_challenge, pkceS256(verifier))) {
            return res.status(400).json({ error: 'invalid_grant' });
          }
          row.used_at = clock().toISOString();
          save(store);
          return res.json(issueTokens({
            clientId,
            resource,
            scopes: row.scopes,
            profileId: row.profile_id,
          }));
        }

        if (grantType === 'refresh_token') {
          const refreshToken = cleanText(body.refresh_token, 8192);
          if (!refreshToken) return res.status(400).json({ error: 'invalid_request' });
          const store = tokenStore();
          const hash = sha256(refreshToken);
          const row = store.refresh_tokens.find((item) => (
            constantTimeEqual(item.token_hash, hash)
            && item.client_id === clientId
            && item.resource === resource
          ));
          if (!row) return res.status(400).json({ error: 'invalid_grant' });
          row.revoked_at = clock().toISOString();
          save(store);
          return res.json(issueTokens({
            clientId,
            resource,
            scopes: row.scopes,
            profileId: row.profile_id,
          }));
        }

        return res.status(400).json({ error: 'unsupported_grant_type' });
      } catch (error) {
        return res.status(error.status || 400).json({ error: 'invalid_request', error_description: error.message });
      }
    });
  }

  return {
    scope: OAUTH_SCOPE,
    paths,
    config,
    profile,
    mount,
    metadataFor,
    authenticateToken,
    challengeForRequest(req, error, description) {
      return challengeForOrigin(originFromRequest(req, env), error, description);
    },
    originFromRequest: (req) => originFromRequest(req, env),
    resourceForRequest: (req) => resourceForOrigin(originFromRequest(req, env)),
  };
}

module.exports = {
  OAUTH_SCOPE,
  CONFIG_SCHEMA,
  TOKEN_STORE_SCHEMA,
  createWayglassPeerOAuth,
  defaultPaths,
  originFromRequest,
  resourceForOrigin,
  metadataUrlForOrigin,
  challengeForOrigin,
  validateChatGptCimd,
  pkceS256,
  sha256,
};
