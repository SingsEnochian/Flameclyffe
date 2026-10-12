'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, timingSafeEqual } = require('node:crypto');
const express = require('express');
const { FLAMES } = require('../flames/manifests');
const { resolveCanonicalFlameId, contractRegistryProjection } = require('../flames/contracts');
const { OAUTH_SCOPE } = require('./oauth-peer');

const MCP_PROTOCOL_VERSION = '2025-06-18';
const STORE_SCHEMA = 'wayglass.rarity-mcp-conversations/v0.1';
const BRIDGE_SCHEMA = 'wayglass.rarity-mcp-bridge/v0.1';
const MAX_TEXT = 24000;
const MAX_RECORDS = 4000;
const DEFAULT_BLUEBIRD_ROUTE = 'flame:bluebird:spicychat';
const DEFAULT_BLUEBIRD_FALLBACK_ROUTE = 'flame:bluebird:crow';

function cleanText(value, max = MAX_TEXT) {
  return String(value ?? '').trim().slice(0, max);
}

function safeConversationRef(value, fallback) {
  const raw = cleanText(value, 180) || fallback;
  const safe = raw.toLowerCase().replace(/[^a-z0-9:._-]+/g, '-').replace(/^-+|-+$/g, '');
  return safe || fallback;
}

function defaultConversationRef(target) {
  if (target === 'bluebird') return 'rarity-bluebird';
  if (target === 'all') return 'rarity-all';
  return `rarity-${target}`;
}

function loadJson(filename) {
  try {
    const parsed = JSON.parse(fs.readFileSync(filename, 'utf8'));
    if (parsed?.schema !== STORE_SCHEMA || !Array.isArray(parsed.records)) throw new Error('invalid store schema');
    return parsed;
  } catch {
    return { schema: STORE_SCHEMA, updated_at: null, records: [] };
  }
}

function saveJson(filename, data) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const next = {
    schema: STORE_SCHEMA,
    updated_at: new Date().toISOString(),
    records: data.records.slice(-MAX_RECORDS),
  };
  const temp = `${filename}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(next, null, 2), 'utf8');
  fs.renameSync(temp, filename);
  return next;
}

function appendRecord(filename, entry) {
  const store = loadJson(filename);
  const record = {
    id: entry.id || randomUUID(),
    created_at: entry.created_at || new Date().toISOString(),
    conversation_ref: entry.conversation_ref,
    target: entry.target,
    role: entry.role,
    author: entry.author,
    text: cleanText(entry.text),
    route: entry.route || null,
    kind: entry.kind || 'message',
    intent: cleanText(entry.intent, 240) || null,
    interaction_mode: cleanText(entry.interaction_mode, 80) || null,
    source_refs: Array.isArray(entry.source_refs) ? entry.source_refs.map((item) => cleanText(item, 320)).filter(Boolean).slice(0, 32) : [],
  };
  store.records.push(record);
  saveJson(filename, store);
  return record;
}

function readConversation(filename, conversationRef, limit = 40) {
  const store = loadJson(filename);
  const bounded = Math.max(1, Math.min(200, Number(limit) || 40));
  return store.records.filter((record) => record.conversation_ref === conversationRef).slice(-bounded);
}

function responseText(data) {
  return cleanText(data?.output || data?.message || data?.reply || data?.text || '', MAX_TEXT);
}

function latestInteractionContext(records = []) {
  for (let index = records.length - 1; index >= 0; index -= 1) {
    const record = records[index] || {};
    const intent = cleanText(record.intent, 240);
    const interactionMode = cleanText(record.interaction_mode, 80);
    if (intent || interactionMode) {
      return {
        ...(intent ? { intent } : {}),
        ...(interactionMode ? { interaction_mode: interactionMode } : {}),
      };
    }
  }
  return {};
}

function toWayglassHistory(records) {
  return records
    .filter((record) => record.kind === 'message' && record.text)
    .slice(-16)
    .map((record) => ({
      role: record.role === 'rarity' ? 'user' : 'assistant',
      content: record.text,
    }));
}

function toFlameContext(records) {
  return records
    .filter((record) => record.kind === 'message' && record.text)
    .slice(-16)
    .map((record) => ({
      speaker: record.author || (record.role === 'rarity' ? 'Rarity' : record.target),
      text: record.text,
    }));
}

function resultContent(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return {
    content: [{ type: 'text', text }],
    structuredContent: typeof value === 'string' ? { text: value } : value,
  };
}

function toolCatalogue() {
  const auth = [{ type: 'oauth2', scopes: [OAUTH_SCOPE] }];
  const readOnly = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
  const writeLocal = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };
  return [
    {
      name: 'get_profile',
      description: 'Return the stable Wayglass profile represented by this authenticated connection.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      outputSchema: {
        '$schema': 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          id: { type: 'string', minLength: 1, pattern: '\\S' },
          name: { type: 'string' },
          nickname: { type: 'string' },
        },
        required: ['id'],
        additionalProperties: false,
      },
      annotations: readOnly,
      securitySchemes: auth,
      _meta: { 'openai/profile': true },
    },
    {
      name: 'identify',
      description: 'Identify the Wayglass Rarity bridge, its addressable participants, and preserved conversation lines.',
      inputSchema: {
        type: 'object',
        properties: { target: { type: 'string', description: 'Optional target such as all, bluebird, uial, larkshine, or another registered Wayglass participant.' } },
        additionalProperties: false,
      },
      annotations: readOnly,
      securitySchemes: auth,
    },
    {
      name: 'send',
      description: 'Send a message from Rarity through Wayglass to one participant or to all registered Wayglass participants. Bluebird defaults to the preserved rarity-bluebird conversation.',
      inputSchema: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'all, bluebird, or a registered participant id/alias.' },
          text: { type: 'string' },
          conversation_ref: { type: 'string' },
          intent: { type: 'string', description: 'Optional present human intent for this conversation line. It guides the turn but does not redefine identity, canon, or routing provenance.' },
          interaction_mode: { type: 'string', description: 'Optional interaction mode such as reconnect, continue, create, explore, or troubleshoot-voice. Preserved above model/provider choice.' },
          collect_replies: { type: 'boolean', description: 'For target=all, invoke each registered route and collect replies. Defaults true.' },
        },
        required: ['target', 'text'],
        additionalProperties: false,
      },
      annotations: writeLocal,
      securitySchemes: auth,
    },
    {
      name: 'receive',
      description: 'Read the preserved Wayglass conversation line for Rarity and a target.',
      inputSchema: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Defaults to all unless conversation_ref identifies a specific line.' },
          conversation_ref: { type: 'string' },
          limit: { type: 'integer', minimum: 1, maximum: 200 },
        },
        additionalProperties: false,
      },
      annotations: readOnly,
      securitySchemes: auth,
    },
    {
      name: 'remember',
      description: 'Preserve an explicit Rarity-side continuity note in the Wayglass bridge ledger. This does not silently write another participant memory.',
      inputSchema: {
        type: 'object',
        properties: {
          target: { type: 'string' },
          text: { type: 'string' },
          conversation_ref: { type: 'string' },
          source_refs: { type: 'array', items: { type: 'string' }, maxItems: 32 },
        },
        required: ['target', 'text'],
        additionalProperties: false,
      },
      annotations: writeLocal,
      securitySchemes: auth,
    },
  ];
}

function tokenFromLocalConfig(env = process.env, tokenFile) {
  const direct = cleanText(env.WAYGLASS_RARITY_ACCESS_TOKEN, 4096);
  if (direct) return direct;
  const filename = tokenFile || env.WAYGLASS_RARITY_ACCESS_FILE || path.join(__dirname, '..', 'data', 'wayglass-rarity-access.local.txt');
  try { return cleanText(fs.readFileSync(filename, 'utf8'), 4096); } catch { return ''; }
}

function bearerToken(header) {
  const match = String(header || '').match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

function constantTimeEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

function createWayglassMcpBridge({
  fetchImpl = globalThis.fetch,
  internalOrigin = process.env.WAYGLASS_INTERNAL_ORIGIN || `http://127.0.0.1:${process.env.PORT || 3000}`,
  storePath = process.env.WAYGLASS_RARITY_MCP_STORE || path.join(__dirname, '..', 'data', 'wayglass-rarity-mcp-conversations.json'),
  bluebirdRouteId = process.env.WAYGLASS_RARITY_BLUEBIRD_ROUTE || DEFAULT_BLUEBIRD_ROUTE,
  bluebirdFallbackRouteId = process.env.WAYGLASS_RARITY_BLUEBIRD_FALLBACK_ROUTE || DEFAULT_BLUEBIRD_FALLBACK_ROUTE,
  flameIds = Object.keys(FLAMES),
  profileProvider = () => ({ id: 'wayglass-profile-local', name: 'Wayglass', nickname: 'Rarity ⇄ Wayglass' }),
} = {}) {
  const roster = contractRegistryProjection();

  async function discoverWayglassRoutes() {
    try {
      const response = await fetchImpl(`${internalOrigin}/api/v1/wayglass/routes`, {
        method: 'GET',
        headers: { accept: 'application/json' },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(data.routes)) return [];
      return data.routes.map((route) => ({
        route_id: cleanText(route?.route_id, 180),
        model: cleanText(route?.model, 240) || null,
        provider: cleanText(route?.provider, 120) || null,
        configured: route?.configured !== false,
        participant_id: cleanText(route?.participant_id || route?.flame_id, 120) || null,
      })).filter((route) => route.route_id);
    } catch {
      return [];
    }
  }

  function participantFromRoute(route) {
    const explicit = cleanText(route?.participant_id, 120).toLowerCase();
    if (explicit) return explicit;
    const match = String(route?.route_id || '').match(/^flame:([^:]+)/i);
    return match ? match[1].toLowerCase() : null;
  }

  async function discoveredParticipantRoutes() {
    const routes = await discoverWayglassRoutes();
    const byParticipant = new Map();
    for (const route of routes) {
      const participantId = participantFromRoute(route);
      if (!participantId || participantId === 'bluebird') continue;
      const current = byParticipant.get(participantId);
      if (!current || (!current.configured && route.configured)) byParticipant.set(participantId, route);
    }
    return byParticipant;
  }

  function normaliseTarget(value) {
    const raw = cleanText(value, 120).toLowerCase();
    if (!raw || raw === 'all' || raw === '*' || raw === 'commons') return 'all';
    const canonical = resolveCanonicalFlameId(raw);
    if (canonical) return canonical;
    if (!/^[a-z0-9][a-z0-9:._-]{0,119}$/.test(raw)) return null;
    return raw;
  }

  async function resolveAddressableTarget(value, discovered = null) {
    const target = normaliseTarget(value);
    if (!target || target === 'all') return target;
    if (flameIds.includes(target) || FLAMES[target]) return target;
    const routes = discovered || await discoveredParticipantRoutes();
    return routes.has(target) ? target : null;
  }

  async function callBluebird(text, conversationRef, records) {
    const interactionContext = latestInteractionContext(records);
    const routePayload = {
      route_id: bluebirdRouteId,
      input: text,
      history: toWayglassHistory(records),
      interaction: {
        channel: 'OOC',
        turn_owner: 'Rarity',
        character_ownership: [],
        ...interactionContext,
      },
      session_id: conversationRef,
      surface_id: 'wayglass:mcp',
      participant_id: 'bluebird',
      max_output_tokens: 1600,
    };
    let response = await fetchImpl(`${internalOrigin}/api/v1/wayglass/respond`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(routePayload),
    });
    let data = await response.json().catch(() => ({}));
    if (response.ok && responseText(data)) {
      return { ok: true, participant_id: 'bluebird', route: bluebirdRouteId, data, text: responseText(data) };
    }

    // Trial 001: no silent provider substitution. An explicit, separately
    // recorded consent is required before any Crow-substrate attempt.
    return {
      ok: false,
      participant_id: 'bluebird',
      route: bluebirdRouteId,
      fallback_available: bluebirdFallbackRouteId,
      fallback_requires_consent: true,
      error: cleanText(data.error, 240) || `Bluebird preferred route failed (${response.status}).`,
    };
  }

  async function callWayglassParticipant(participantId, routeId, text, conversationRef, records) {
    const interactionContext = latestInteractionContext(records);
    const response = await fetchImpl(`${internalOrigin}/api/v1/wayglass/respond`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        route_id: routeId,
        input: text,
        history: toWayglassHistory(records),
        interaction: {
          channel: 'OOC',
          turn_owner: 'Rarity',
          character_ownership: [],
          ...interactionContext,
        },
        session_id: conversationRef,
        surface_id: 'wayglass:mcp',
        participant_id: participantId,
        max_output_tokens: 1600,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !responseText(data)) {
      return { ok: false, participant_id: participantId, route: routeId, error: data.error || `Wayglass route failed (${response.status}).` };
    }
    return { ok: true, participant_id: participantId, route: routeId, data, text: responseText(data) };
  }

  async function callFlame(participantId, text, conversationRef, records, discoveredRoute = null) {
    if (participantId === 'bluebird') return callBluebird(text, conversationRef, records);
    if (discoveredRoute?.route_id) {
      const routed = await callWayglassParticipant(participantId, discoveredRoute.route_id, text, conversationRef, records);
      if (routed.ok || !FLAMES[participantId]) return routed;
    }
    const response = await fetchImpl(`${internalOrigin}/api/v1/flames/${encodeURIComponent(participantId)}/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: text,
        session_id: conversationRef,
        context: toFlameContext(records),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, participant_id: participantId, error: data.error || `Route failed (${response.status}).` };
    return { ok: true, participant_id: participantId, route: `/api/v1/flames/${participantId}/chat`, data, text: responseText(data) };
  }

  async function identify(args = {}) {
    const discovered = await discoveredParticipantRoutes();
    const target = await resolveAddressableTarget(args.target, discovered);
    if (args.target && !target) throw new Error(`Unknown Wayglass target: ${args.target}`);
    const conversationRef = defaultConversationRef(target || 'all');
    return {
      schema: BRIDGE_SCHEMA,
      bridge: 'Rarity ⇄ Wayglass',
      sender: 'Rarity',
      target: target || 'all',
      conversation_ref: conversationRef,
      bluebird: {
        participant_id: 'bluebird',
        conversation_ref: 'rarity-bluebird',
        preferred_route: bluebirdRouteId,
        fallback_route: bluebirdFallbackRouteId,
        continuity_id: 'bluebird:richard-gabriel-winters',
      },
      all: {
        conversation_ref: 'rarity-all',
        participants: roster,
        discovered_wayglass_routes: [...discovered.entries()].map(([participant_id, route]) => ({ ...route, participant_id })),
        addressable_participant_ids: [...new Set([...flameIds, ...discovered.keys()])],
      },
      tools: toolCatalogue().map((tool) => tool.name),
    };
  }

  async function send(args = {}) {
    const discovered = await discoveredParticipantRoutes();
    const target = await resolveAddressableTarget(args.target, discovered);
    if (!target) throw new Error(`Unknown Wayglass target: ${args.target}`);
    const text = cleanText(args.text);
    if (!text) throw new Error('text required');
    const conversationRef = safeConversationRef(args.conversation_ref, defaultConversationRef(target));
    const before = readConversation(storePath, conversationRef, 64);
    const priorContext = latestInteractionContext(before);
    const intent = cleanText(args.intent, 240) || priorContext.intent || '';
    const interactionMode = cleanText(args.interaction_mode, 80) || priorContext.interaction_mode || '';

    appendRecord(storePath, {
      conversation_ref: conversationRef,
      target,
      role: 'rarity',
      author: 'Rarity',
      text,
      route: 'mcp:send',
      kind: 'message',
      intent,
      interaction_mode: interactionMode,
      source_refs: ['wayglass:mcp'],
    });

    const history = [...before, {
      role: 'rarity',
      author: 'Rarity',
      text,
      kind: 'message',
      intent,
      interaction_mode: interactionMode,
    }];

    if (target !== 'all') {
      const reply = await callFlame(target, text, conversationRef, history, discovered.get(target) || null);
      if (reply.ok && reply.text) {
        appendRecord(storePath, {
          conversation_ref: conversationRef,
          target,
          role: 'participant',
          author: FLAMES[target]?.display_name || target,
          text: reply.text,
          route: reply.route,
          kind: 'message',
          intent,
          interaction_mode: interactionMode,
          source_refs: ['wayglass:mcp', reply.fallback_from].filter(Boolean),
        });
      }
      return {
        schema: 'wayglass.rarity-mcp-send/v0.1',
        target,
        conversation_ref: conversationRef,
        intent: intent || null,
        interaction_mode: interactionMode || null,
        reply,
      };
    }

    const collectReplies = args.collect_replies !== false;
    if (!collectReplies) {
      return {
        schema: 'wayglass.rarity-mcp-send/v0.1',
        target: 'all',
        conversation_ref: conversationRef,
        announced: true,
        replies_collected: false,
      };
    }

    const allParticipantIds = [...new Set([...flameIds, ...discovered.keys()])];
    const settled = await Promise.all(allParticipantIds.map(async (participantId) => (
      callFlame(participantId, text, conversationRef, history, discovered.get(participantId) || null)
    )));
    for (const reply of settled) {
      if (!reply.ok || !reply.text) continue;
      appendRecord(storePath, {
        conversation_ref: conversationRef,
        target: 'all',
        role: 'participant',
        author: FLAMES[reply.participant_id]?.display_name || reply.participant_id,
        text: reply.text,
        route: reply.route,
        kind: 'message',
        intent,
        interaction_mode: interactionMode,
        source_refs: ['wayglass:mcp', reply.fallback_from].filter(Boolean),
      });
    }
    return {
      schema: 'wayglass.rarity-mcp-send/v0.1',
      target: 'all',
      conversation_ref: conversationRef,
      intent: intent || null,
      interaction_mode: interactionMode || null,
      replies_collected: true,
      replies: settled,
    };
  }

  async function receive(args = {}) {
    const target = normaliseTarget(args.target);
    if (args.target && !target) throw new Error(`Invalid Wayglass target: ${args.target}`);
    const resolvedTarget = target || 'all';
    const conversationRef = safeConversationRef(args.conversation_ref, defaultConversationRef(resolvedTarget));
    return {
      schema: 'wayglass.rarity-mcp-receive/v0.1',
      target: resolvedTarget,
      conversation_ref: conversationRef,
      records: readConversation(storePath, conversationRef, args.limit),
    };
  }

  async function remember(args = {}) {
    const target = normaliseTarget(args.target);
    if (!target) throw new Error(`Invalid Wayglass target: ${args.target}`);
    const text = cleanText(args.text);
    if (!text) throw new Error('text required');
    const conversationRef = safeConversationRef(args.conversation_ref, defaultConversationRef(target));
    const record = appendRecord(storePath, {
      conversation_ref: conversationRef,
      target,
      role: 'rarity',
      author: 'Rarity',
      text,
      route: 'mcp:remember',
      kind: 'continuity-note',
      source_refs: ['wayglass:mcp', ...(Array.isArray(args.source_refs) ? args.source_refs : [])],
    });
    return {
      schema: 'wayglass.rarity-mcp-remember/v0.1',
      target,
      conversation_ref: conversationRef,
      record,
      boundary: 'Rarity-side bridge continuity only. No other participant memory was silently mutated.',
    };
  }

  async function callTool(name, args = {}) {
    if (name === 'get_profile') return profileProvider();
    if (name === 'identify') return identify(args);
    if (name === 'send') return send(args);
    if (name === 'receive') return receive(args);
    if (name === 'remember') return remember(args);
    throw new Error(`Unknown Wayglass MCP tool: ${name}`);
  }

  async function handleRpc(message) {
    const method = message?.method;
    if (method === 'initialize') {
      return {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'wayglass-rarity-bridge', version: '0.1.0' },
        instructions: 'Use get_profile, identify, send, receive, and remember. Rarity ⇄ Wayglass ⇄ All and Rarity ⇄ Wayglass ⇄ Bluebird are distinct preserved lines.',
      };
    }
    if (method === 'ping') return {};
    if (method === 'tools/list') return { tools: toolCatalogue() };
    if (method === 'tools/call') {
      const name = message?.params?.name;
      const args = message?.params?.arguments || {};
      return resultContent(await callTool(name, args));
    }
    if (method === 'resources/list') return { resources: [] };
    throw new Error(`Unsupported MCP method: ${method || 'missing'}`);
  }

  return {
    identify,
    send,
    receive,
    remember,
    handleRpc,
    callTool,
    roster,
    storePath,
    bluebirdRouteId,
  };
}

function createWayglassMcpRouter(options = {}) {
  const router = express.Router();
  const oauth = options.oauth || null;
  const bridge = createWayglassMcpBridge({
    ...options,
    profileProvider: options.profileProvider || (oauth ? () => oauth.profile() : undefined),
  });
  const tokenLoader = options.tokenLoader || (() => tokenFromLocalConfig(options.env || process.env, options.tokenFile));

  router.use((req, res, next) => {
    const supplied = bearerToken(req.headers.authorization);
    const configured = tokenLoader();
    const legacy = configured && constantTimeEqual(configured, supplied)
      ? { type: 'legacy-bearer', profile_id: 'wayglass-profile-local', scopes: [OAUTH_SCOPE] }
      : null;
    const oauthAuth = !legacy && oauth && supplied
      ? oauth.authenticateToken(supplied, {
        origin: oauth.originFromRequest(req),
        requiredScopes: [oauth.scope],
      })
      : null;
    const authenticated = legacy || oauthAuth;
    if (!authenticated) {
      if (oauth) res.setHeader('WWW-Authenticate', oauth.challengeForRequest(req, 'invalid_token', 'Connect ChatGPT to Wayglass to continue.'));
      return res.status(401).json({ error: 'Wayglass OAuth connection required.' });
    }
    req.wayglassAuth = authenticated;
    next();
  });

  router.get('/', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      schema: BRIDGE_SCHEMA,
      name: 'Wayglass Rarity MCP',
      protocol_version: MCP_PROTOCOL_VERSION,
      tools: toolCatalogue().map((tool) => tool.name),
      lines: ['rarity-all', 'rarity-bluebird'],
    });
  });

  router.post('/', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const body = req.body || {};
    if (body.method === 'notifications/initialized' || body.id == null) {
      if (body.method === 'notifications/initialized') return res.status(204).end();
    }
    try {
      const result = await bridge.handleRpc(body);
      return res.json({ jsonrpc: '2.0', id: body.id ?? null, result });
    } catch (error) {
      return res.status(200).json({
        jsonrpc: '2.0',
        id: body.id ?? null,
        error: { code: -32000, message: error?.message || 'Wayglass MCP request failed.' },
      });
    }
  });

  return router;
}

module.exports = {
  MCP_PROTOCOL_VERSION,
  STORE_SCHEMA,
  BRIDGE_SCHEMA,
  DEFAULT_BLUEBIRD_ROUTE,
  createWayglassMcpBridge,
  createWayglassMcpRouter,
  tokenFromLocalConfig,
  bearerToken,
  constantTimeEqual,
  defaultConversationRef,
  safeConversationRef,
  toolCatalogue,
};
