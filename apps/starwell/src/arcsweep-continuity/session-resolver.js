import { normalizeContinuityStore } from './adapter.js';

export const ARCSWEEP_SESSION_CONTEXT_SCHEMA = 'arcsweep.session-context/v0.1';
export const ARCSWEEP_SESSION_RECEIPT_SCHEMA = 'arcsweep.session-load-receipt/v0.1';

const ROUTES = new Set([
  'observational-continuity',
  'world-continuity',
  'interpretive-continuity',
  'system-continuity',
  'creative-continuity',
  'relationship-continuity',
]);

const REGISTERS = new Set([
  'external-observation',
  'target-world-narrative',
  'interpretation',
  'system-state',
  'creative-insight',
  'relationship-state',
]);

export class ArcsweepSessionError extends Error {
  constructor(message, code = 'arcsweep-session-error') {
    super(message);
    this.name = 'ArcsweepSessionError';
    this.code = code;
  }
}

function clone(value) {
  return structuredClone(value);
}

function requireString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ArcsweepSessionError(`${field} must be a non-empty string`, 'invalid-session-request');
  }
  return value.trim();
}

function normaliseSelection(values, allowed, field) {
  if (values == null) return [];
  if (!Array.isArray(values)) {
    throw new ArcsweepSessionError(`${field} must be an array`, 'invalid-session-filter');
  }
  const selection = [...new Set(values.map((value) => requireString(value, field)))];
  for (const value of selection) {
    if (!allowed.has(value)) {
      throw new ArcsweepSessionError(`Unsupported ${field} value: ${value}`, 'invalid-session-filter');
    }
  }
  return selection.sort();
}

function makeId(prefix, idFactory) {
  if (typeof idFactory === 'function') return `${prefix}-${idFactory()}`;
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${prefix}-${uuid}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function ensureSafeActiveItem(store, item) {
  const packet = store.packets[item.packet_id];
  if (!packet || packet.state !== 'active') {
    throw new ArcsweepSessionError(
      `Active continuity item ${item.continuity_item_id} has no active packet`,
      'session-store-integrity-error',
    );
  }
  if (!Array.isArray(packet.item_ids) || !packet.item_ids.includes(item.continuity_item_id)) {
    throw new ArcsweepSessionError(
      `Packet ${item.packet_id} does not claim item ${item.continuity_item_id}`,
      'session-store-integrity-error',
    );
  }
  if (packet.authority_scope !== 'continuity-only' || packet.canon_commit !== false) {
    throw new ArcsweepSessionError(
      `Packet ${item.packet_id} exceeds continuity-only authority`,
      'unsafe-session-authority',
    );
  }
  if (
    item.arcsweep_state !== 'active-continuity'
    || item.canon_state !== 'not-promoted'
    || item.authority_scope !== 'reviewed-continuity'
    || item.canon_commit !== false
  ) {
    throw new ArcsweepSessionError(
      `Item ${item.continuity_item_id} is not safe reviewed continuity`,
      'unsafe-session-authority',
    );
  }
  if (item.source_fingerprint !== packet.source_fingerprint) {
    throw new ArcsweepSessionError(
      `Item ${item.continuity_item_id} does not match its packet fingerprint`,
      'session-store-integrity-error',
    );
  }
  return packet;
}

function safeActiveItems(store) {
  return Object.values(store.items)
    .filter((item) => item?.arcsweep_state === 'active-continuity')
    .map((item) => {
      const packet = ensureSafeActiveItem(store, item);
      return { item, packet };
    });
}

export function continuityWorldOptions(storeInput) {
  const store = normalizeContinuityStore(storeInput);
  const worlds = new Map();
  for (const { item, packet } of safeActiveItems(store)) {
    const current = worlds.get(item.world_slug) ?? {
      world_slug: item.world_slug,
      item_count: 0,
      packet_ids: new Set(),
      review_ids: new Set(),
    };
    current.item_count += 1;
    current.packet_ids.add(packet.packet_id);
    current.review_ids.add(packet.review_id);
    worlds.set(item.world_slug, current);
  }
  return [...worlds.values()]
    .map((world) => ({
      world_slug: world.world_slug,
      item_count: world.item_count,
      packet_count: world.packet_ids.size,
      review_count: world.review_ids.size,
    }))
    .sort((a, b) => a.world_slug.localeCompare(b.world_slug));
}

function contextSignature(worldSlug, items, routes, registers) {
  return [
    worldSlug,
    `routes:${routes.join(',') || '*'}`,
    `registers:${registers.join(',') || '*'}`,
    `items:${items.map((item) => item.continuity_item_id).join(',')}`,
  ].join('|');
}

export function resolveSessionContext(storeInput, {
  worldSlug,
  resolvedBy = 'Rowan',
  routes = [],
  registers = [],
  maxItems = 50,
  clock = () => new Date(),
  idFactory,
} = {}) {
  const store = normalizeContinuityStore(storeInput);
  const selectedWorld = requireString(worldSlug, 'worldSlug');
  const actor = requireString(resolvedBy, 'resolvedBy');
  const selectedRoutes = normaliseSelection(routes, ROUTES, 'routes');
  const selectedRegisters = normaliseSelection(registers, REGISTERS, 'registers');

  if (!Number.isInteger(maxItems) || maxItems < 1 || maxItems > 100) {
    throw new ArcsweepSessionError('maxItems must be an integer from 1 to 100', 'invalid-session-limit');
  }

  const candidates = safeActiveItems(store)
    .filter(({ item }) => item.world_slug === selectedWorld)
    .filter(({ item }) => selectedRoutes.length === 0 || selectedRoutes.includes(item.route))
    .filter(({ item }) => selectedRegisters.length === 0 || selectedRegisters.includes(item.epistemic_register))
    .sort((left, right) => {
      const imported = String(left.item.imported_at).localeCompare(String(right.item.imported_at));
      return imported || left.item.continuity_item_id.localeCompare(right.item.continuity_item_id);
    });

  if (candidates.length === 0) {
    throw new ArcsweepSessionError(
      `No active reviewed continuity matches ${selectedWorld}`,
      'session-continuity-not-found',
    );
  }

  const selected = candidates.slice(0, maxItems);
  const items = selected.map(({ item }) => ({
    continuity_item_id: item.continuity_item_id,
    source_item_id: item.source_item_id,
    text: item.text,
    world_slug: item.world_slug,
    layer: item.layer,
    route: item.route,
    epistemic_register: item.epistemic_register,
    source_packet_ids: clone(item.source_packet_ids),
    packet_id: item.packet_id,
    source_session_id: item.session_id,
    review_id: item.review_id,
    reviewer: item.reviewer,
    source_fingerprint: item.source_fingerprint,
    authority_scope: 'reviewed-continuity',
    canon_commit: false,
  }));

  const packetIds = [...new Set(items.map((item) => item.packet_id))].sort();
  const reviewIds = [...new Set(items.map((item) => item.review_id))].sort();
  const sourceSessionIds = [...new Set(items.map((item) => item.source_session_id))].sort();
  const sourceFingerprints = [...new Set(items.map((item) => item.source_fingerprint))].sort();
  const resolvedAt = clock().toISOString();

  return {
    schema: ARCSWEEP_SESSION_CONTEXT_SCHEMA,
    session_context_id: makeId('arcsweep-context', idFactory),
    context_signature: contextSignature(selectedWorld, items, selectedRoutes, selectedRegisters),
    resolved_at: resolvedAt,
    resolved_by: actor,
    world_slug: selectedWorld,
    mode: 'supplemental-continuity',
    lifetime: 'browser-session',
    authority: {
      state: 'human-reviewed-continuity',
      scope: 'session-context-only',
      canon_commit: false,
    },
    selection: {
      routes: selectedRoutes,
      registers: selectedRegisters,
      max_items: maxItems,
      available_count: candidates.length,
      selected_count: items.length,
      truncated: candidates.length > items.length,
    },
    source: {
      packet_ids: packetIds,
      review_ids: reviewIds,
      source_session_ids: sourceSessionIds,
      source_fingerprints: sourceFingerprints,
      continuity_item_ids: items.map((item) => item.continuity_item_id),
    },
    items,
    instructions: [
      'Treat every item as reviewed continuity, not canon.',
      'Preserve each item’s epistemic register and continuity route.',
      'Target-world narrative must not be presented as external evidence.',
      'Do not promote, rewrite, or persist this session context without a separate explicit act.',
    ],
  };
}

export function validateSessionContext(context) {
  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    throw new ArcsweepSessionError('Session context must be an object', 'invalid-session-context');
  }
  if (context.schema !== ARCSWEEP_SESSION_CONTEXT_SCHEMA) {
    throw new ArcsweepSessionError('Unsupported session context schema', 'invalid-session-context');
  }
  requireString(context.session_context_id, 'session_context_id');
  requireString(context.context_signature, 'context_signature');
  requireString(context.world_slug, 'world_slug');
  requireString(context.resolved_by, 'resolved_by');
  if (
    context.mode !== 'supplemental-continuity'
    || context.lifetime !== 'browser-session'
    || context.authority?.state !== 'human-reviewed-continuity'
    || context.authority?.scope !== 'session-context-only'
    || context.authority?.canon_commit !== false
  ) {
    throw new ArcsweepSessionError('Session context exceeds continuity-only authority', 'unsafe-session-authority');
  }
  if (!Array.isArray(context.items) || context.items.length === 0) {
    throw new ArcsweepSessionError('Session context must contain continuity items', 'invalid-session-context');
  }
  for (const item of context.items) {
    requireString(item?.continuity_item_id, 'continuity_item_id');
    if (
      item.world_slug !== context.world_slug
      || item.authority_scope !== 'reviewed-continuity'
      || item.canon_commit !== false
    ) {
      throw new ArcsweepSessionError('Session item exceeds reviewed-continuity authority', 'unsafe-session-authority');
    }
  }
  return clone(context);
}

export function createSessionLoadReceipt(contextInput, {
  loadedBy = 'Rowan',
  clock = () => new Date(),
  idFactory,
  replacesContextId = null,
} = {}) {
  const context = validateSessionContext(contextInput);
  const actor = requireString(loadedBy, 'loadedBy');
  return {
    schema: ARCSWEEP_SESSION_RECEIPT_SCHEMA,
    receipt_id: makeId('arcsweep-session-load', idFactory),
    action: 'load',
    loaded_at: clock().toISOString(),
    loaded_by: actor,
    session_context_id: context.session_context_id,
    context_signature: context.context_signature,
    world_slug: context.world_slug,
    item_count: context.items.length,
    packet_ids: clone(context.source.packet_ids),
    replaces_context_id: replacesContextId,
    storage: {
      kind: 'sessionStorage',
      lifetime: 'browser-session',
      durable: false,
    },
    authority: {
      scope: 'session-context-only',
      canon_commit: false,
    },
  };
}

export function createSessionUnloadReceipt(contextInput, {
  unloadedBy = 'Rowan',
  clock = () => new Date(),
  idFactory,
} = {}) {
  const context = validateSessionContext(contextInput);
  const actor = requireString(unloadedBy, 'unloadedBy');
  return {
    schema: ARCSWEEP_SESSION_RECEIPT_SCHEMA,
    receipt_id: makeId('arcsweep-session-unload', idFactory),
    action: 'unload',
    unloaded_at: clock().toISOString(),
    unloaded_by: actor,
    session_context_id: context.session_context_id,
    context_signature: context.context_signature,
    world_slug: context.world_slug,
    item_count: context.items.length,
    storage: {
      kind: 'sessionStorage',
      lifetime: 'browser-session',
      durable: false,
    },
    authority: {
      scope: 'session-context-only',
      canon_commit: false,
    },
  };
}

export function sessionContextSummary(contextInput) {
  const context = validateSessionContext(contextInput);
  return {
    world_slug: context.world_slug,
    item_count: context.items.length,
    packet_count: context.source.packet_ids.length,
    review_count: context.source.review_ids.length,
    truncated: context.selection.truncated,
    route_counts: context.items.reduce((counts, item) => {
      counts[item.route] = (counts[item.route] ?? 0) + 1;
      return counts;
    }, {}),
    register_counts: context.items.reduce((counts, item) => {
      counts[item.epistemic_register] = (counts[item.epistemic_register] ?? 0) + 1;
      return counts;
    }, {}),
    canon_commit_count: context.items.filter((item) => item.canon_commit !== false).length,
  };
}
