import test from 'node:test';
import assert from 'node:assert/strict';

import {
  WIRE_VERSION,
  SpiralWireError,
  enrichAndBrief,
  enrichPacketWithSpiralState,
  readSubsystemBriefs,
} from '../src/harmonic-spiral/spiral-wire.js';

const AXES = ['P', 'C', 'R', 'E', 'M', 'A', 'Q'];

function makeAxis(value = 0.7, derivative = 0.0, confidence = 0.85) {
  return { value, derivative, confidence };
}

function makePremaq(overrides = {}) {
  return {
    state: Object.fromEntries(AXES.map((a) => [a, makeAxis()])),
    ...overrides,
  };
}

function makePacket(overrides = {}) {
  return {
    packet_id: 'pkt-wire-test-001',
    observable: {
      premaq: makePremaq(),
      deep_snapshot: { snapshot_id: 'snap-001' },
    },
    provenance: {
      compression_release_receipt_id: 'cr-receipt-001',
      theory_receipt_ids: ['th-001'],
    },
    ...overrides,
  };
}

// ── WIRE_VERSION ──────────────────────────────────────────────────────────────

test('WIRE_VERSION is a semver string', () => {
  assert.match(WIRE_VERSION, /^\d+\.\d+\.\d+$/);
});

// ── enrichPacketWithSpiralState — happy path ──────────────────────────────────

test('returns a new packet with harmonic_state installed', () => {
  const original = makePacket();
  const enriched = enrichPacketWithSpiralState(original);
  assert.ok(enriched.harmonic_state, 'harmonic_state should be present');
  assert.equal(enriched.harmonic_state.schema, 'hearthgate/spiral-state/v1');
});

test('does not mutate the original packet', () => {
  const original = makePacket();
  const before = JSON.stringify(original);
  enrichPacketWithSpiralState(original);
  assert.equal(JSON.stringify(original), before);
});

test('preserves all original packet fields', () => {
  const enriched = enrichPacketWithSpiralState(makePacket());
  assert.equal(enriched.packet_id, 'pkt-wire-test-001');
  assert.ok(enriched.observable, 'observable preserved');
  assert.ok(enriched.provenance, 'provenance preserved');
});

test('snapshot_id lands in harmonic_state.supporting_receipts.story', () => {
  const enriched = enrichPacketWithSpiralState(makePacket());
  assert.ok(enriched.harmonic_state.supporting_receipts.story.includes('snap-001'));
});

test('compression_release_receipt_id lands in supporting_receipts.time', () => {
  const enriched = enrichPacketWithSpiralState(makePacket());
  assert.ok(enriched.harmonic_state.supporting_receipts.time.includes('cr-receipt-001'));
});

test('theory_receipt_ids land in supporting_receipts.theory', () => {
  const enriched = enrichPacketWithSpiralState(makePacket());
  assert.ok(enriched.harmonic_state.supporting_receipts.theory.includes('th-001'));
});

test('supporting_receipts.references_only is true — no raw records enter the engine', () => {
  const enriched = enrichPacketWithSpiralState(makePacket());
  assert.equal(enriched.harmonic_state.source_integrity.references_only, true);
});

test('harmonic_state.spiral_state_id is a deterministic fingerprint string', () => {
  const enriched = enrichPacketWithSpiralState(makePacket());
  assert.match(enriched.harmonic_state.spiral_state_id, /^spiral-[0-9a-f]{8}$/);
});

test('same input always produces the same spiral_state_id', () => {
  const a = enrichPacketWithSpiralState(makePacket());
  const b = enrichPacketWithSpiralState(makePacket());
  assert.equal(a.harmonic_state.spiral_state_id, b.harmonic_state.spiral_state_id);
});

test('absent deep_snapshot leaves story empty', () => {
  const packet = makePacket({ observable: { premaq: makePremaq() } });
  const enriched = enrichPacketWithSpiralState(packet);
  assert.deepEqual(enriched.harmonic_state.supporting_receipts.story, []);
});

test('absent compression_release_receipt_id leaves time empty', () => {
  const packet = makePacket({ provenance: {} });
  const enriched = enrichPacketWithSpiralState(packet);
  assert.deepEqual(enriched.harmonic_state.supporting_receipts.time, []);
});

test('multiple theory_receipt_ids are all forwarded', () => {
  const packet = makePacket({
    provenance: { theory_receipt_ids: ['th-a', 'th-b', 'th-c'] },
  });
  const enriched = enrichPacketWithSpiralState(packet);
  assert.deepEqual(
    [...enriched.harmonic_state.supporting_receipts.theory].sort(),
    ['th-a', 'th-b', 'th-c'],
  );
});

// ── enrichPacketWithSpiralState — guard rails ─────────────────────────────────

test('throws MISSING_PACKET when packet is null', () => {
  assert.throws(
    () => enrichPacketWithSpiralState(null),
    (err) => err instanceof SpiralWireError && err.code === 'MISSING_PACKET',
  );
});

test('throws MISSING_PACKET when packet is an array', () => {
  assert.throws(
    () => enrichPacketWithSpiralState([]),
    (err) => err.code === 'MISSING_PACKET',
  );
});

test('throws MISSING_PREMAQ when observable.premaq.state is absent', () => {
  const packet = makePacket({ observable: { premaq: {} } });
  assert.throws(
    () => enrichPacketWithSpiralState(packet),
    (err) => err instanceof SpiralWireError && err.code === 'MISSING_PREMAQ',
  );
});

test('throws MISSING_PREMAQ when observable is absent entirely', () => {
  const packet = makePacket({ observable: undefined });
  assert.throws(
    () => enrichPacketWithSpiralState(packet),
    (err) => err.code === 'MISSING_PREMAQ',
  );
});

test('engine error is wrapped as SpiralWireError with ENGINE_ prefix', () => {
  const packet = makePacket({
    observable: {
      premaq: {
        state: {
          P: { value: 0.5 },
          // Missing C R E M A Q
        },
      },
    },
  });
  assert.throws(
    () => enrichPacketWithSpiralState(packet),
    (err) => err instanceof SpiralWireError && err.code.startsWith('ENGINE_'),
  );
});

// ── readSubsystemBriefs ───────────────────────────────────────────────────────

test('readSubsystemBriefs returns all six subsystem payloads', () => {
  const enriched = enrichPacketWithSpiralState(makePacket());
  const briefs = readSubsystemBriefs(enriched);
  assert.equal(briefs.llm.schema, 'hearthgate/llm-brief/v1');
  assert.equal(briefs.audio.schema, 'hearthgate/audio-directive/v1');
  assert.equal(briefs.glyph.schema, 'hearthgate/glyph-directive/v1');
  assert.equal(briefs.ui.schema, 'hearthgate/ui-directive/v1');
  assert.equal(briefs.haptic.schema, 'hearthgate/haptic-directive/v1');
  assert.equal(briefs.replay.schema, 'hearthgate/replay-directive/v1');
});

test('readSubsystemBriefs throws MISSING_HARMONIC_STATE on un-enriched packet', () => {
  assert.throws(
    () => readSubsystemBriefs(makePacket()),
    (err) => err instanceof SpiralWireError && err.code === 'MISSING_HARMONIC_STATE',
  );
});

test('readSubsystemBriefs throws MISSING_HARMONIC_STATE on wrong schema', () => {
  const packet = { ...makePacket(), harmonic_state: { schema: 'wrong/schema' } };
  assert.throws(
    () => readSubsystemBriefs(packet),
    (err) => err.code === 'MISSING_HARMONIC_STATE',
  );
});

test('all briefs echo the same spiral_state_id', () => {
  const enriched = enrichPacketWithSpiralState(makePacket());
  const briefs = readSubsystemBriefs(enriched);
  const id = enriched.harmonic_state.spiral_state_id;
  for (const payload of Object.values(briefs)) {
    assert.equal(payload.spiral_state_id, id);
  }
});

test('no brief contains supporting_receipts — IDs stay in harmonic_state', () => {
  const enriched = enrichPacketWithSpiralState(makePacket());
  const briefs = readSubsystemBriefs(enriched);
  for (const payload of Object.values(briefs)) {
    assert.equal('supporting_receipts' in payload, false);
  }
});

// ── enrichAndBrief ────────────────────────────────────────────────────────────

test('enrichAndBrief returns enriched packet and all six briefs together', () => {
  const { packet: enriched, briefs } = enrichAndBrief(makePacket());
  assert.ok(enriched.harmonic_state, 'packet has harmonic_state');
  assert.equal(Object.keys(briefs).length, 6);
  for (const schema of [
    'hearthgate/llm-brief/v1',
    'hearthgate/audio-directive/v1',
    'hearthgate/glyph-directive/v1',
    'hearthgate/ui-directive/v1',
    'hearthgate/haptic-directive/v1',
    'hearthgate/replay-directive/v1',
  ]) {
    assert.ok(Object.values(briefs).some((b) => b.schema === schema), `Missing: ${schema}`);
  }
});

test('enrichAndBrief result is frozen', () => {
  const result = enrichAndBrief(makePacket());
  assert.ok(Object.isFrozen(result));
});

test('enrichAndBrief is equivalent to enrichPacketWithSpiralState + readSubsystemBriefs', () => {
  const packet = makePacket();
  const enriched = enrichPacketWithSpiralState(packet);
  const briefs = readSubsystemBriefs(enriched);
  const combined = enrichAndBrief(packet);
  assert.equal(
    combined.packet.harmonic_state.spiral_state_id,
    enriched.harmonic_state.spiral_state_id,
  );
  assert.deepEqual(combined.briefs.llm, briefs.llm);
});
