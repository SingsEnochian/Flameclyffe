import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createEmptyContinuityStore,
  importContinuityPacket,
  rollbackContinuityImport,
  continuityStoreSummary,
  validateContinuityPacket,
} from '../src/arcsweep-continuity/adapter.js';

function packet(overrides = {}) {
  return {
    schema: 'hearthweave.continuity-packet/v0.1',
    continuity_packet_id: 'continuity-7917012d',
    exported_at: '2026-07-31T05:12:00.000Z',
    exported_by: 'Rowan',
    world_slug: 'terra-aeterna',
    session_id: 'b1371885',
    lamination_id: '3daeb975',
    review_id: '230d12d9',
    reviewer: 'Rowan',
    reviewed_at: '2026-07-31T04:48:00.000Z',
    authority: { state: 'human-reviewed', scope: 'continuity-only', canon_commit: false },
    anchors: { canon_authority: 'notion://terra-aeterna', reality_anchor: 'current-reality://hearthside' },
    accepted_items: [
      {
        continuity_item_id: 'continuity-item-1',
        source_item_id: 'laminate-item-1',
        world_slug: 'terra-aeterna',
        layer: 'changed',
        text: 'Targetside completed its crossing and returned without replacing the Hearthside anchor.',
        epistemic_register: 'system-state',
        route: 'system-continuity',
        status: 'accepted',
        source_packet_ids: ['0001', '0002'],
        authority_scope: 'reviewed-continuity',
        canon_commit: false,
      },
      {
        continuity_item_id: 'continuity-item-2',
        source_item_id: 'laminate-item-2',
        world_slug: 'terra-aeterna',
        layer: 'remained_true',
        text: 'Canon authority and current-reality provenance stayed separate throughout.',
        epistemic_register: 'system-state',
        route: 'system-continuity',
        status: 'accepted',
        source_packet_ids: ['0001', '0002'],
        authority_scope: 'reviewed-continuity',
        canon_commit: false,
      },
    ],
    summary: {
      accepted_count: 2,
      candidate_count: 0,
      held_count: 0,
      rejected_count: 0,
      route_counts: { 'system-continuity': 2 },
    },
    notes: null,
    source_fingerprint: 'a'.repeat(64),
    transport: { state: 'portable-local', adapters_applied: [] },
    provenance: {
      module_id: 'arkfire.continuity-exporter',
      source_schema: 'hearthweave.bridge-lamination-reviewed/v0.1',
      source_review_id: '230d12d9',
      source_lamination_id: '3daeb975',
      source_reviewed_path: 'bridge-lamination.reviewed.latest.json',
    },
    ...overrides,
  };
}

const clock = () => new Date('2026-07-31T05:20:00.000Z');

test('validates and imports accepted continuity without committing canon', () => {
  const input = packet();
  assert.equal(validateContinuityPacket(input).continuity_packet_id, input.continuity_packet_id);

  const result = importContinuityPacket(input, createEmptyContinuityStore(), { importedBy: 'Rowan', clock });
  assert.equal(result.imported, true);
  assert.equal(result.idempotent, false);
  assert.equal(result.receipt.item_count, 2);
  assert.equal(result.receipt.authority.canon_commit, false);
  assert.equal(result.store.items['continuity-item-1'].canon_state, 'not-promoted');
  assert.equal(result.store.items['continuity-item-1'].arcsweep_state, 'active-continuity');

  assert.deepEqual(continuityStoreSummary(result.store), {
    packet_count: 1,
    item_count: 2,
    world_count: 1,
    receipt_count: 1,
    route_counts: { 'system-continuity': 2 },
    canon_commit_count: 0,
  });
});

test('re-importing the same packet is idempotent', () => {
  const first = importContinuityPacket(packet(), createEmptyContinuityStore(), { clock });
  const second = importContinuityPacket(packet(), first.store, { clock });
  assert.equal(second.imported, false);
  assert.equal(second.idempotent, true);
  assert.equal(second.store.receipts.length, 1);
  assert.equal(second.store.items['continuity-item-2'].text.includes('provenance'), true);
});

test('rejects packet id collisions and automatic canon authority', () => {
  const first = importContinuityPacket(packet(), createEmptyContinuityStore(), { clock });
  assert.throws(
    () => importContinuityPacket(packet({ source_fingerprint: 'b'.repeat(64) }), first.store, { clock }),
    (error) => error.code === 'continuity-packet-collision',
  );

  assert.throws(
    () => validateContinuityPacket(packet({
      authority: { state: 'human-reviewed', scope: 'continuity-only', canon_commit: true },
    })),
    (error) => error.code === 'invalid-continuity-authority',
  );
});

test('rollback removes imported items and leaves a reversible receipt trail', () => {
  const imported = importContinuityPacket(packet(), createEmptyContinuityStore(), { clock });
  const rolled = rollbackContinuityImport(imported.store, imported.receipt.receipt_id, {
    rolledBackBy: 'Rowan',
    clock: () => new Date('2026-07-31T05:25:00.000Z'),
  });

  assert.equal(rolled.rolledBack, true);
  assert.equal(rolled.store.packets['continuity-7917012d'].state, 'rolled-back');
  assert.equal(rolled.store.items['continuity-item-1'], undefined);
  assert.equal(rolled.receipt.rolled_back_by, 'Rowan');
  assert.equal(continuityStoreSummary(rolled.store).item_count, 0);
});

test('rejects malformed accepted items and mismatched summaries', () => {
  const malformed = packet();
  malformed.accepted_items[0].status = 'candidate';
  assert.throws(
    () => validateContinuityPacket(malformed),
    (error) => error.code === 'invalid-continuity-item-authority',
  );

  const mismatched = packet();
  mismatched.summary.accepted_count = 99;
  assert.throws(
    () => validateContinuityPacket(mismatched),
    (error) => error.code === 'continuity-summary-mismatch',
  );
});
