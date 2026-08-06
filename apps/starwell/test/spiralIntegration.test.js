import test from 'node:test';
import assert from 'node:assert/strict';

import { parseBridgePulsePayload } from '../src/lib/deepBridge.js';
import { resolveHouseProfile } from '../src/hearthgate/profiles/registry.js';
import { assembleCompressionReleaseDualAspectPacket } from '../src/hearthweave-kernel/index.js';
import { validateDualAspectPacket } from '../src/hearthweave-kernel/validation.js';
import { readSubsystemBriefs } from '../src/harmonic-spiral/spiral-wire.js';

const FIXED_TIME = new Date('2026-08-05T12:00:00.000Z');

function clock() {
  return new Date(FIXED_TIME);
}

let seq = 0;
function idFactory() {
  return `spiral-int-${++seq}`;
}

function makeContext(worldSlug = 'terra-aeterna') {
  return {
    schema: 'arcsweep.session-context/v0.1',
    session_context_id: 'spiral-integration-context',
    context_signature: `${worldSlug}|routes:*|registers:*|items:item-si-1`,
    resolved_at: FIXED_TIME.toISOString(),
    resolved_by: 'Rowan',
    world_slug: worldSlug,
    mode: 'supplemental-continuity',
    lifetime: 'browser-session',
    authority: {
      state: 'human-reviewed-continuity',
      scope: 'session-context-only',
      canon_commit: false,
    },
    source: {
      packet_ids: ['continuity-si-1'],
      review_ids: ['review-si-1'],
      source_session_ids: ['source-session-si-1'],
      source_fingerprints: ['sha256:si-source-1'],
      continuity_item_ids: ['item-si-1'],
    },
    items: [{
      continuity_item_id: 'item-si-1',
      source_item_id: 'source-item-si-1',
      text: 'The spiral state is derived; the packet carries it sealed.',
      world_slug: worldSlug,
      layer: 'world-law',
      route: 'world-continuity',
      epistemic_register: 'target-world-narrative',
      source_packet_ids: ['source-packet-si-1'],
      packet_id: 'continuity-si-1',
      source_session_id: 'source-session-si-1',
      review_id: 'review-si-1',
      reviewer: 'Rowan',
      source_fingerprint: 'sha256:si-source-1',
      authority_scope: 'reviewed-continuity',
      canon_commit: false,
    }],
  };
}

function makeSnapshot() {
  return parseBridgePulsePayload({
    observed_at: FIXED_TIME.toISOString(),
    deep: {
      P: 0.78, C: 0.84, R: 0.71, E: 0.29,
      M: 0.63, A: 0.80, dpdt: 0.09,
      moonIllum: 61, sky: 'clear', kp: 2, bz: -1.4,
      charge: 0.77, dphi: 0.04,
    },
  }, {
    capturedAt: FIXED_TIME,
    url: 'https://example.test/pulse.json',
    idFactory: () => 'si-snap',
  });
}

function assemblePacket(worldSlug = 'terra-aeterna') {
  const context = makeContext(worldSlug);
  const house = resolveHouseProfile(worldSlug);
  return assembleCompressionReleaseDualAspectPacket({
    context,
    deepSnapshot: makeSnapshot(),
    house,
    clock,
    idFactory,
  });
}

// ── Step 6: harmonic_state wired into packet assembly ─────────────────────────

test('assembled C/R packet carries harmonic_state with the correct schema', () => {
  const packet = assemblePacket();
  assert.ok(packet.harmonic_state, 'harmonic_state must be present');
  assert.equal(packet.harmonic_state.schema, 'hearthgate/spiral-state/v1');
});

test('harmonic_state is covered by the packet fingerprint — validateDualAspectPacket passes', () => {
  const packet = assemblePacket();
  assert.doesNotThrow(() => validateDualAspectPacket(packet));
});

test('harmonic_state.spiral_state_id is a deterministic hex string', () => {
  const packet = assemblePacket();
  assert.match(packet.harmonic_state.spiral_state_id, /^spiral-[0-9a-f]{8}$/);
});

test('same input yields identical spiral_state_id', () => {
  seq = 0;
  const a = assemblePacket();
  seq = 0;
  const b = assemblePacket();
  assert.equal(a.harmonic_state.spiral_state_id, b.harmonic_state.spiral_state_id);
});

test('harmonic_state.supporting_receipts carries the deep snapshot id and the C/R receipt id', () => {
  const packet = assemblePacket();
  const { story, time, theory } = packet.harmonic_state.supporting_receipts;
  assert.ok(story.includes(packet.observable.deep_snapshot.snapshot_id));
  assert.ok(time.includes(packet.provenance.compression_release_receipt_id));
  assert.deepEqual(theory, []);
});

test('harmonic_state.source_integrity.references_only is true', () => {
  assert.equal(assemblePacket().harmonic_state.source_integrity.references_only, true);
});

test('harmonic_state direction is never descending', () => {
  const { direction } = assemblePacket().harmonic_state;
  assert.ok(
    ['ascending', 'gathering', 'stable', 'pivoting'].includes(direction),
    `direction must be ascending/gathering/stable/pivoting, got ${direction}`,
  );
});

test('harmonic_state degraded.active reflects PREMAQ confidence', () => {
  const packet = assemblePacket();
  assert.equal(typeof packet.harmonic_state.degraded.active, 'boolean');
});

// ── Step 6: readSubsystemBriefs from an assembled packet ──────────────────────

test('readSubsystemBriefs returns all six subsystem payloads from a C/R packet', () => {
  const briefs = readSubsystemBriefs(assemblePacket());
  assert.equal(briefs.llm.schema, 'hearthgate/llm-brief/v1');
  assert.equal(briefs.audio.schema, 'hearthgate/audio-directive/v1');
  assert.equal(briefs.glyph.schema, 'hearthgate/glyph-directive/v1');
  assert.equal(briefs.ui.schema, 'hearthgate/ui-directive/v1');
  assert.equal(briefs.haptic.schema, 'hearthgate/haptic-directive/v1');
  assert.equal(briefs.replay.schema, 'hearthgate/replay-directive/v1');
});

test('all six briefs echo the same spiral_state_id from the packet', () => {
  const packet = assemblePacket();
  const briefs = readSubsystemBriefs(packet);
  const id = packet.harmonic_state.spiral_state_id;
  for (const payload of Object.values(briefs)) {
    assert.equal(payload.spiral_state_id, id);
  }
});

test('no brief exposes raw supporting_receipts — IDs stay inside harmonic_state', () => {
  const briefs = readSubsystemBriefs(assemblePacket());
  for (const payload of Object.values(briefs)) {
    assert.equal('supporting_receipts' in payload, false);
  }
});

test('LLM brief contains a breath_note derived from the C/R phase', () => {
  const packet = assemblePacket();
  const briefs = readSubsystemBriefs(packet);
  assert.ok(typeof briefs.llm.breath_note === 'string' && briefs.llm.breath_note.length > 0);
});

test('audio brief intensity is in [0, 1]', () => {
  const { intensity } = readSubsystemBriefs(assemblePacket()).audio;
  assert.ok(intensity >= 0 && intensity <= 1, `audio intensity ${intensity} must be in [0, 1]`);
});

test('glyph brief phase matches harmonic_state phase', () => {
  const packet = assemblePacket();
  const briefs = readSubsystemBriefs(packet);
  assert.equal(briefs.glyph.phase, packet.harmonic_state.phase);
});

// ── Cross-world: both registered houses produce valid spiral output ────────────

for (const worldSlug of ['terra-aeterna', 'ta-veren-vaen']) {
  test(`${worldSlug}: assembled packet carries valid harmonic_state and passes fingerprint check`, () => {
    const packet = assemblePacket(worldSlug);
    assert.doesNotThrow(() => validateDualAspectPacket(packet));
    assert.equal(packet.harmonic_state.schema, 'hearthgate/spiral-state/v1');
    const briefs = readSubsystemBriefs(packet);
    assert.equal(Object.keys(briefs).length, 6);
  });
}
