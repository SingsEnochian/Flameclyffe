'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, timingSafeEqual } = require('node:crypto');
const express = require('express');
const { FLAMES } = require('../flames/manifests');
const { resolveCanonicalFlameId, contractRegistryProjection } = require('../flames/contracts');
const { OAUTH_SCOPE } = require('./oauth-peer');
const { registrySnapshot } = require('./crew-workspaces');
const { WorkspaceProjects } = require('./workspace-projects');
const { createWorkspaceArtifacts } = require('./workspace-artifacts');
const { verifyReturn } = require('./bluebird-bridge-trial');

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

function toolCatalogue(participantId = 'rarity') {
  const auth = [{ type: 'oauth2', scopes: [OAUTH_SCOPE] }];
  const readOnly = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
  const writeLocal = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };
  const projectFields = {
    workspace_id: { type: 'string', enum: ['atelier', 'builder'] },
    project_id: { type: 'string', pattern: '^[a-z0-9][a-z0-9_-]{0,79}$' },
  };
  const writeFields = {
    ...projectFields,
    expected_head: { type: ['string', 'null'], description: 'Current project head from inspect_workspace_project; null for a new project.' },
    source_refs: { type: 'array', items: { type: 'string' }, maxItems: 32 },
    tool_refs: { type: 'array', items: { type: 'string' }, maxItems: 32 },
  };
  const catalogue = [
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
      name: 'list_workspaces',
      description: 'List Wayglass shared workspaces, resident intelligence, and crew seat states without activating dormant provider seats.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: readOnly,
      securitySchemes: auth,
    },
    {
      name: 'enter_workspace',
      description: 'Enter as the authenticated crew seat. Supply project_id to open a durable project session, and a stored stop_receipt_id to return.',
      inputSchema: {
        type: 'object',
        properties: {
          workspace_id: { type: 'string', enum: ['atelier', 'builder'] },
          project_id: { type: 'string', pattern: '^[a-z0-9][a-z0-9_-]{0,79}$' },
          stop_receipt_id: { type: 'string' },
        },
        required: ['workspace_id'],
        additionalProperties: false,
      },
      annotations: writeLocal,
      securitySchemes: auth,
    },
    {
      name: 'inspect_workspace_project',
      description: 'Inspect private shared project artifacts, attributable receipts and the latest handoff as the authenticated Rarity seat.',
      inputSchema: { type: 'object', properties: projectFields, required: ['workspace_id', 'project_id'], additionalProperties: false },
      annotations: readOnly, securitySchemes: auth,
    },
    {
      name: 'write_workspace_artifact',
      description: 'Persist a text artifact revision as Rarity with source/tool references and an optimistic project-head check. Preserves earlier revisions; does not execute code, render SVG or alter source originals.',
      inputSchema: {
        type: 'object', properties: { ...writeFields,
          artifact_id: { type: 'string', pattern: '^[a-z0-9][a-z0-9_-]{0,79}$' },
          media_type: { type: 'string', enum: ['text/plain', 'text/markdown', 'application/json', 'image/svg+xml'] },
          content: { type: 'string', minLength: 1, maxLength: 100000 },
        }, required: ['workspace_id', 'project_id', 'expected_head', 'artifact_id', 'media_type', 'content'], additionalProperties: false,
      },
      annotations: writeLocal, securitySchemes: auth,
    },
    {
      name: 'handoff_workspace_project',
      description: 'Persist Rarity-authored stop point, open questions and a named available Rarity/Codex next owner. Does not invoke or speak for the next owner.',
      inputSchema: {
        type: 'object', properties: { ...writeFields,
          stop_point: { type: 'string', minLength: 1, maxLength: 8000 },
          next_owner: { type: 'string', enum: ['rarity', 'codex'] },
          open_questions: { type: 'array', items: { type: 'string' }, maxItems: 32 },
        }, required: ['workspace_id', 'project_id', 'expected_head', 'stop_point', 'next_owner'], additionalProperties: false,
      },
      annotations: writeLocal, securitySchemes: auth,
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
  const workspaceTools = [
    {
      name: 'read_project', description: 'Read shared project files and attributable receipts through your active session.',
      inputSchema: { type: 'object', properties: { session_id: { type: 'string' } }, required: ['session_id'], additionalProperties: false },
      annotations: readOnly, securitySchemes: auth,
    },
    {
      name: 'write_project_file', description: 'Write one bounded project text file with optimistic hash checking and an authenticated author receipt. No host paths or shell access.',
      inputSchema: { type: 'object', properties: { session_id: { type: 'string' }, path: { type: 'string' }, content: { type: 'string', maxLength: 64000 }, expected_hash: { type: ['string', 'null'] } }, required: ['session_id', 'path', 'content', 'expected_hash'], additionalProperties: false },
      annotations: writeLocal, securitySchemes: auth,
    },
    {
      name: 'leave_workspace', description: 'Exit your session with a durable stop receipt, named next owner and unresolved Wonder context.',
      inputSchema: { type: 'object', properties: { session_id: { type: 'string' }, stop_point: { type: 'string', maxLength: 1000 }, next_owner: { type: 'string', enum: ['rowan', 'rarity', 'codex'] }, unresolved_wonder_questions: { type: 'array', maxItems: 32, items: { type: 'string', maxLength: 1000 } }, alternatives: { type: 'array', maxItems: 32, items: { type: 'object' } } }, required: ['session_id', 'stop_point', 'next_owner'], additionalProperties: false },
      annotations: writeLocal, securitySchemes: auth,
    },
  ];
  const result = [...catalogue.slice(0, 3), ...workspaceTools, ...catalogue.slice(3)];
  return participantId === 'codex' ? result.filter(tool => !['identify', 'send', 'receive', 'remember'].includes(tool.name)) : result;
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
  workspaceArtifacts = createWorkspaceArtifacts(),
  workspaceDirectory = process.env.WAYGLASS_WORKSPACE_DIR || path.join(path.dirname(storePath), 'wayglass-workspace-projects'),
} = {}) {
  const roster = contractRegistryProjection();
  const projects = new WorkspaceProjects({ directory: workspaceDirectory });

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

    return {
      ok: false,
      participant_id: 'bluebird',
      route: bluebirdRouteId,
      error: data.error || `Bluebird’s SpicyChat route failed (${response.status}). No provider fallback was used.`,
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
    // Trial 001 is opt-in; verify against the immutable stop receipt BEFORE
    // recording or transmitting a trial return. Ordinary messaging is unchanged.
    if (args.trial_receipt || args.trial_return_packet) {
      if (target !== 'bluebird' || !args.trial_receipt || !args.trial_return_packet) {
        throw new Error('Bluebird trial requires both stop receipt and return packet');
      }
      if (args.trial_return_packet.conversation_id !== conversationRef) {
        throw new Error('Bluebird trial conversation mismatch');
      }
      const verified = verifyReturn(args.trial_receipt, args.trial_return_packet);
      if (!verified.ok) throw new Error(`Bluebird trial return rejected: ${verified.reason}`);
    }
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

  async function callTool(name, args = {}, auth = { type: 'internal', profile_id: 'local', participant_id: 'rarity' }) {
    const allowed = toolCatalogue(auth.participant_id).find(tool => tool.name === name);
    if (!allowed) throw new Error('Tool unavailable for this crew seat.');
    if (!args || typeof args !== 'object' || Array.isArray(args) || Object.keys(args).some(key => !Object.hasOwn(allowed.inputSchema.properties, key))) throw new Error('Unexpected tool arguments.');
    if (allowed.inputSchema.required?.some(key => !Object.hasOwn(args, key))) throw new Error('Missing required tool arguments.');
    if (name === 'get_profile') return auth.participant_id === 'codex'
      ? { id: auth.profile_id, name: 'Codex', nickname: 'Codex ⇄ Wayglass' } : profileProvider();
    if (name === 'inspect_workspace_project') return workspaceArtifacts.inspect(args, auth.participant_id);
    if (name === 'write_workspace_artifact') return workspaceArtifacts.writeArtifact(args, auth.participant_id);
    if (name === 'handoff_workspace_project') return workspaceArtifacts.handoff(args, auth.participant_id);
    if (name === 'list_workspaces') return registrySnapshot();
    if (name === 'enter_workspace') return projects.enter(args, auth);
    if (name === 'read_project') return projects.read(args, auth);
    if (name === 'write_project_file') return projects.write(args, auth);
    if (name === 'leave_workspace') return projects.leave(args, auth);
    if (name === 'identify') return identify(args);
    if (name === 'send') return send(args);
    if (name === 'receive') return receive(args);
    if (name === 'remember') return remember(args);
    throw new Error(`Unknown Wayglass MCP tool: ${name}`);
  }

  async function handleRpc(message, auth = { type: 'internal', profile_id: 'local', participant_id: 'rarity' }) {
    const method = message?.method;
    if (method === 'initialize') {
      return {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'wayglass-rarity-bridge', version: '0.1.0' },
        instructions: `Available tools: ${toolCatalogue(auth.participant_id).map(tool => tool.name).join(', ')}. Authenticated crew seat: ${auth.participant_id}. Use project_id with enter_workspace for durable work; read_project, write_project_file and leave_workspace use your session_id. Return with the stored stop_receipt_id. Wayglass resident runtime binding remains pending. The authenticated crew seat owns its project changes; preserve stop receipts and named next owners.`,
      };
    }
    if (method === 'ping') return {};
    if (method === 'tools/list') return { tools: toolCatalogue(auth.participant_id) };
    if (method === 'tools/call') {
      const name = message?.params?.name;
      const args = message?.params?.arguments || {};
      return resultContent(await callTool(name, args, auth));
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

  const codexTokenLoader = options.codexTokenLoader || (() => cleanText((options.env || process.env).WAYGLASS_CODEX_ACCESS_TOKEN, 4096));

  router.use((req, res, next) => {
    const supplied = bearerToken(req.headers.authorization);
    const configured = tokenLoader();
    const codexConfigured = codexTokenLoader();
    if (configured && codexConfigured && constantTimeEqual(configured, codexConfigured)) {
      return res.status(503).json({ error: 'Crew credentials must be distinct.' });
    }
    const codex = codexConfigured && constantTimeEqual(codexConfigured, supplied)
      ? { type: 'crew-bearer', profile_id: 'wayglass-codex-local', participant_id: 'codex', scopes: [OAUTH_SCOPE] } : null;
    const legacy = configured && constantTimeEqual(configured, supplied)
      ? { type: 'legacy-bearer', profile_id: 'wayglass-profile-local', participant_id: 'rarity', scopes: [OAUTH_SCOPE] }
      : null;
    const oauthAuth = !legacy && !codex && oauth && supplied
      ? oauth.authenticateToken(supplied, {
        origin: oauth.originFromRequest(req),
        requiredScopes: [oauth.scope],
      })
      : null;
    const authenticated = codex || legacy || (oauthAuth ? { ...oauthAuth, participant_id: 'rarity' } : null);
    if (!authenticated) {
      if (oauth) res.setHeader('WWW-Authenticate', oauth.challengeForRequest(req, 'invalid_token', 'Connect ChatGPT to Wayglass to continue.'));
      return res.status(401).json({ error: 'Wayglass OAuth connection required.' });
    }
    req.wayglassAuth = authenticated;
    next();
  });

  router.get('/', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      schema: BRIDGE_SCHEMA,
      name: 'Wayglass Rarity MCP',
      protocol_version: MCP_PROTOCOL_VERSION,
      tools: toolCatalogue(req.wayglassAuth.participant_id).map((tool) => tool.name),
      lines: req.wayglassAuth.participant_id === 'rarity' ? ['rarity-all', 'rarity-bluebird'] : [],
    });
  });

  router.post('/', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const body = req.body || {};
    if (body.method === 'notifications/initialized' || body.id == null) {
      if (body.method === 'notifications/initialized') return res.status(204).end();
    }
    try {
      const result = await bridge.handleRpc(body, req.wayglassAuth);
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
