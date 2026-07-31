import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createEmptyContinuityStore,
  importContinuityPacket,
  rollbackContinuityImport,
} from '../src/arcsweep-continuity/adapter.js';
import {
  ARCSWEEP_SESSION_CONTEXT_SCHEMA,
  ARCSWEEP_SESSION_RECEIPT_SCHEMA,
  continuityWorldOptions,
  createSessionLoadReceipt,
  createSessionUnloadReceipt,
  resolveSessionContext,
  sessionContextSummary,
  validateSessionContext,
} from '../src/arcsweep-continuity/session-resolver.js';

function item(id, {
  world = 'terra-aeterna',
  route = 'system-continuity',
  register = 'system-state',
  layer = 'changed',
  text = `Continuity item ${id}`,
} = {}) {
  return {
    continuity_item_id: id,
    source_item_id: `source-${id}`,
    world_slug: world,
    layer,
    text,
    epistemic_register: register,
    route,
    status: 'accepted',
    source_packet_ids: ['0001', '0002'],
    authority_scope: 'reviewed-continuity',
    canon_commit: false,
  };
}

function packet({
  packetId = 'continuity-7917012d',
  world = 'terra-aeterna',
  sessionId = 'b1371885',
  reviewId = '230d12d9',
  fingerprint = 'a'.repeat(64),
  items = [item('continuity-item-1'), item('continuity-item-2', { layer: 'remained_true' })],
} = {}) {
  return {
    schema: 'hearthweave.continuity-packet/v0.1',
    continuity_packet_id: packetId,
    exported_at: '2026-07-31T05:12:00.000Z',
    exported_by: 'Rowan',
    world_slug: world,
    session_id: sessionId,
    lamination_id: `lamination-${packetId}`,
    review_id: reviewId,
    reviewer: 'Rowan',
    reviewed_at: '2026-07-31T04:48:00.000Z',
    authority: { state: 'human-reviewed', scope: 'continuity-only', canon_commit: false },
    anchors: { canon_authority: `notion://${world}`, reality_anchor: 'current-reality://hearthside' },
    accepted_items: items,
    summary: {
      accepted_count: items.length,
      candidate_count: 0,
      held_count: 0,
      rejected_count: 0,
      route_counts: items.reduce((counts, entry) => {
        counts[entry.route] = (counts[entry.route] ?? 0) + 1;
        return counts;
      }, {}),
    },
    notes: null,
    source_fingerprint: fingerprint,
    transport: { state: 'portable-local', adapters_applied: [] },
    provenance: {
      module_id: 'arkfire.continuity-exporter',
      source_schema: 'hearthweave.bridge-lamination-reviewed/v0.1',
      source_review_id: reviewId,
      source_lamination_id: `lamination-${packetId}`,
      source_reviewed_path: 'bridge-lamination.reviewed.latest.json',
    },
  };
}

const importClock = () => new Date('2026-07-31T05:20:00.000Z');
const resolveClock = () => new Date('2026-07-31T05:31:00.000Z');

function importedStore(input = packet()) {
  return importContinuityPacket(input, createEmptyContinuityStore(), {
    importedBy: 'Rowan',
    clock: importClock,
  });
}

test('resolves active continuity into a bounded browser-session context', () => {
  const imported = importedStore();
  const context = resolveSessionContext(imported.store, {
    worldSlug: 'terra-aeterna',
    resolvedBy: 'Rowan',
    clock: resolveClock,
    idFactory: () => 'fixed-context',
  });

  assert.equal(context.schema, ARCSWEEP_SESSION_CONTEXT_SCHEMA);
  assert.equal(context.session_context_id, 'arcsweep-context-fixed-context');
  assert.equal(context.world_slug, 'terra-aeterna');
  assert.equal(context.mode, 'supplemental-continuity');
  assert.equal(context.lifetime, 'browser-session');
  assert.equal(context.authority.canon_commit, false);
  assert.equal(context.items.length, 2);
  assert.equal(context.source.packet_ids[0], 'continuity-7917012d');
  assert.equal(context.selection.truncated, false);
  assert.equal(validateSessionContext(context).context_signature, context.context_signature);

  assert.deepEqual(sessionContextSummary(context), {
    world_slug: 'terra-aeterna',
    item_count: 2,
    packet_count: 1,
    review_count: 1,
    truncated: false,
    route_counts: { 'system-continuity': 2 },
    register_counts: { 'system-state': 2 },
    canon_commit_count: 0,
  });
});

test('filters by route and register, and reports deterministic truncation', () => {
  const input = packet({
    items: [
      item('continuity-item-1'),
      item('continuity-item-2', {
        route: 'relationship-continuity',
        register: 'relationship-state',
      }),
      item('continuity-item-3', {
        route: 'world-continuity',
        register: 'target-world-narrative',
      }),
    ],
  });
  const imported = importedStore(input);

  const relationship = resolveSessionContext(imported.store, {
    worldSlug: 'terra-aeterna',
    routes: ['relationship-continuity'],
    registers: ['relationship-state'],
    clock: resolveClock,
    idFactory: () => 'relationship',
  });
  assert.deepEqual(relationship.items.map((entry) => entry.continuity_item_id), ['continuity-item-2']);

  const bounded = resolveSessionContext(imported.store, {
    worldSlug: 'terra-aeterna',
    maxItems: 2,
    clock: resolveClock,
    idFactory: () => 'bounded',
  });
  assert.equal(bounded.items.length, 2);
  assert.equal(bounded.selection.available_count, 3);
  assert.equal(bounded.selection.truncated, true);
  assert.deepEqual(
    bounded.items.map((entry) => entry.continuity_item_id),
    ['continuity-item-1', 'continuity-item-2'],
  );
});

test('keeps worlds separate and ignores rolled-back packets', () => {
  const terra = importedStore();
  const otherPacket = packet({
    packetId: 'continuity-other-world',
    world: 'starsong',
    sessionId: 'starsong-session',
    reviewId: 'starsong-review',
    fingerprint: 'b'.repeat(64),
    items: [item('starsong-item-1', { world: 'starsong', route: 'world-continuity', register: 'target-world-narrative' })],
  });
  const both = importContinuityPacket(otherPacket, terra.store, { importedBy: 'Rowan', clock: importClock });

  assert.deepEqual(continuityWorldOptions(both.store), [
    { world_slug: 'starsong', item_count: 1, packet_count: 1, review_count: 1 },
    { world_slug: 'terra-aeterna', item_count: 2, packet_count: 1, review_count: 1 },
  ]);

  const terraContext = resolveSessionContext(both.store, {
    worldSlug: 'terra-aeterna',
    clock: resolveClock,
    idFactory: () => 'terra',
  });
  assert.equal(terraContext.items.every((entry) => entry.world_slug === 'terra-aeterna'), true);

  const rolled = rollbackContinuityImport(both.store, terra.receipt.receipt_id, {
    rolledBackBy: 'Rowan',
    clock: () => new Date('2026-07-31T05:32:00.000Z'),
  });
  assert.throws(
    () => resolveSessionContext(rolled.store, { worldSlug: 'terra-aeterna' }),
    (error) => error.code === 'session-continuity-not-found',
  );
});

test('rejects promoted or internally inconsistent continuity', () => {
  const imported = importedStore();
  imported.store.items['continuity-item-1'].canon_state = 'promoted';
  assert.throws(
    () => resolveSessionContext(imported.store, { worldSlug: 'terra-aeterna' }),
    (error) => error.code === 'unsafe-session-authority',
  );

  const inconsistent = importedStore();
  inconsistent.store.items['continuity-item-1'].source_fingerprint = 'f'.repeat(64);
  assert.throws(
    () => resolveSessionContext(inconsistent.store, { worldSlug: 'terra-aeterna' }),
    (error) => error.code === 'session-store-integrity-error',
  );
});

test('creates explicit session-only load and unload receipts', () => {
  const imported = importedStore();
  const context = resolveSessionContext(imported.store, {
    worldSlug: 'terra-aeterna',
    clock: resolveClock,
    idFactory: () => 'receipt-context',
  });
  const load = createSessionLoadReceipt(context, {
    loadedBy: 'Rowan',
    clock: () => new Date('2026-07-31T05:33:00.000Z'),
    idFactory: () => 'load',
  });
  assert.equal(load.schema, ARCSWEEP_SESSION_RECEIPT_SCHEMA);
  assert.equal(load.action, 'load');
  assert.equal(load.storage.kind, 'sessionStorage');
  assert.equal(load.storage.durable, false);
  assert.equal(load.authority.canon_commit, false);
  assert.equal(load.receipt_id, 'arcsweep-session-load-load');

  const unload = createSessionUnloadReceipt(context, {
    unloadedBy: 'Rowan',
    clock: () => new Date('2026-07-31T05:34:00.000Z'),
    idFactory: () => 'unload',
  });
  assert.equal(unload.action, 'unload');
  assert.equal(unload.receipt_id, 'arcsweep-session-unload-unload');
  assert.equal(unload.session_context_id, context.session_context_id);
});
