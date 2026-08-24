import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CLAIM_STATES,
  DEEP_MODES,
  DualAspectError,
  assembleDualAspectPacket,
  createDegradedDeepSnapshot,
  replayDualAspectPacket,
  validateDeepSnapshot,
} from '../src/hearthweave-kernel/dual-aspect.js';
import { validateDualAspectPacket } from '../src/hearthweave-kernel/validation.js';
import {
  clearDualAspectActivation,
  publishDualAspectActivation,
  readActiveDualAspectPacket,
  readDualAspectReceiptForPacket,
  recordDualAspectRender,
  recordDualAspectReplay,
} from '../src/hearthweave-kernel/activation.js';
import {
  acknowledgeSensoryRender,
  buildSensoryActivation,
  getActiveSensoryActivation,
} from '../src/hearthweave-kernel/sensory-bus.js';
import { buildPacketGlyphRender } from '../src/hearthweave-kernel/packet-glyph-render.js';
import {
  parseBridgePulsePayload,
  readPacketBoundDeepSnapshot,
} from '../src/lib/deepBridge.js';
import {
  resolveHouseProfile,
} from '../src/hearthgate/profiles/registry.js';

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

function sequenceFactory(prefix = 'test') {
  let sequence = 0;
  return () => `${prefix}-${++sequence}`;
}

function fixedClock() {
  return new Date('2026-08-02T05:36:00.000Z');
}

function continuityContext(worldSlug = 'ta-veren-vaen') {
  return {
    schema: 'arcsweep.session-context/v0.1',
    session_context_id: 'arcsweep-context-test',
    context_signature: `${worldSlug}|routes:*|registers:*|items:item-1`,
    resolved_at: '2026-08-02T05:35:00.000Z',
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
      packet_ids: ['continuity-packet-1'],
      review_ids: ['review-1'],
      source_session_ids: ['source-session-1'],
      source_fingerprints: ['sha256:continuity-source-1'],
      continuity_item_ids: ['item-1'],
    },
    items: [{
      continuity_item_id: 'item-1',
      source_item_id: 'source-item-1',
      text: 'The House receives the crossing without surrendering its own law.',
      world_slug: worldSlug,
      layer: 'world-law',
      route: 'world-continuity',
      epistemic_register: 'target-world-narrative',
      source_packet_ids: ['source-packet-1'],
      packet_id: 'continuity-packet-1',
      source_session_id: 'source-session-1',
      review_id: 'review-1',
      reviewer: 'Rowan',
      source_fingerprint: 'sha256:continuity-source-1',
      authority_scope: 'reviewed-continuity',
      canon_commit: false,
    }],
  };
}

function liveDeepPayload() {
  return {
    observed_at: '2026-08-02T05:35:30.000Z',
    deep: {
      P: 0.89,
      C: 0.92,
      R: 0.88,
      E: 0.34,
      M: 0.76,
      A: 0.85,
      dpdt: 0.11,
      moonIllum: 73,
      sky: 'night',
      kp: 3,
      bz: -2.1,
      charge: 0.84,
      dphi: 0.06,
    },
  };
}

function makeSnapshot() {
  return parseBridgePulsePayload(liveDeepPayload(), {
    capturedAt: fixedClock(),
    url: 'https://example.test/pulse.json',
    idFactory: () => 'live',
  });
}

function makePacket(options = {}) {
  const context = continuityContext(options.worldSlug);
  const house = resolveHouseProfile(context.world_slug);
  return assembleDualAspectPacket({
    context,
    deepSnapshot: options.snapshot ?? makeSnapshot(),
    house,
    clock: fixedClock,
    idFactory: sequenceFactory('packet'),
  });
}

test('one packet binds every observable and experiential renderer to one shared state', () => {
  const packet = validateDualAspectPacket(makePacket());
  const shared = packet.correspondence.shared_state_fingerprint;

  assert.equal(packet.identity.house_id, 'ta-veren-vaen');
  assert.equal(packet.experiential.house.canon_foundation.id, 'wheel-of-time-canon');
  assert.equal(packet.experiential.house.canon_overlay.id, 'ta-veren-vaen-overlay');
  assert.notEqual(
    packet.experiential.house.canon_foundation.id,
    packet.experiential.house.canon_overlay.id,
  );
  assert.equal(packet.observable.deep_snapshot.mode, DEEP_MODES.LIVE);
  assert.equal(packet.observable.premaq.provenance_refs.includes('deep:deep-snapshot-live'), true);
  assert.equal(packet.correspondence.explicit, true);
  for (const binding of Object.values(packet.correspondence.bindings)) {
    assert.equal(binding, shared);
  }
  for (const renderer of ['glyph', 'tone', 'visual', 'haptic', 'narrative']) {
    assert.equal(packet.experiential[renderer].shared_state_fingerprint, shared);
    assert.equal(packet.experiential[renderer].deep_snapshot_id, packet.observable.deep_snapshot.snapshot_id);
    assert.equal(packet.experiential[renderer].premaq_id, packet.observable.premaq.id);
  }
});

test('PREMAQ, temporal states, and bridge retain the exact frozen DEEP provenance', () => {
  const packet = makePacket();
  const snapshot = packet.observable.deep_snapshot;
  const premaq = packet.observable.premaq;

  assert.equal(premaq.state.P.value, snapshot.state.P);
  assert.equal(premaq.state.C.value, snapshot.state.C);
  assert.equal(premaq.state.R.value, snapshot.state.R);
  assert.equal(premaq.state.E.value, snapshot.state.E);
  assert.equal(premaq.state.M.value, snapshot.state.M);
  assert.equal(premaq.state.A.value, snapshot.state.A);
  assert.equal(packet.observable.hearthside.premaq.id, premaq.id);
  assert.equal(packet.observable.targetside.premaq.id, premaq.id);
  assert.equal(packet.observable.bridge.premaq_ref.id, premaq.id);
  assert.equal(packet.provenance.deep_snapshot_id, snapshot.snapshot_id);
});

test('degraded mode is explicit and cannot masquerade as a live observation', () => {
  const degraded = createDegradedDeepSnapshot({
    state: liveDeepPayload().deep,
    reason: 'TEST_SOURCE_UNAVAILABLE',
    clock: fixedClock,
    idFactory: () => 'degraded',
  });
  const packet = makePacket({ snapshot: degraded });

  assert.equal(degraded.mode, DEEP_MODES.DEGRADED);
  assert.equal(packet.degraded.active, true);
  assert.equal(packet.degraded.reasons.includes('DEEP_DEGRADED'), true);
  assert.equal(packet.observable.premaq.degraded, true);
  assert.equal(packet.uncertainty.degraded, true);

  assert.throws(
    () => validateDeepSnapshot({ ...degraded, substitutions: [] }),
    (error) => error instanceof DualAspectError && error.code === 'silent-degraded-state',
  );
});

test('bridge parser receipts missing and malformed fields instead of labeling substitutions live', () => {
  const partial = liveDeepPayload();
  delete partial.observed_at;
  partial.deep.P = 'bogus';
  delete partial.deep.A;
  delete partial.deep.dphi;
  const snapshot = parseBridgePulsePayload(partial, {
    capturedAt: fixedClock(),
    url: 'https://example.test/partial.json',
    idFactory: () => 'partial',
  });

  assert.equal(snapshot.mode, DEEP_MODES.DEGRADED);
  assert.equal(snapshot.substitutions.some((entry) => entry.field === 'observed_at'), true);
  assert.equal(snapshot.substitutions.some((entry) => entry.field === 'state.P' && entry.source_value === 'bogus'), true);
  assert.equal(snapshot.substitutions.some((entry) => entry.field === 'state.A'), true);
  assert.equal(snapshot.substitutions.some((entry) => entry.field === 'state.dphi'), true);
  assert.equal(snapshot.raw_state.P, 'bogus');
  assert.equal('A' in snapshot.raw_state, false);
});

test('Observatory preserves unsanded input and fingerprints it independently from the render projection', () => {
  const firstPayload = liveDeepPayload();
  firstPayload.deep.P = 1.25;
  firstPayload.deep.bz = -44;
  firstPayload.deep.sky = 'STORM';
  const secondPayload = structuredClone(firstPayload);
  secondPayload.deep.P = 7.5;

  const first = parseBridgePulsePayload(firstPayload, {
    capturedAt: fixedClock(),
    url: 'https://example.test/unsanded.json',
    idFactory: () => 'unsanded-first',
  });
  const second = parseBridgePulsePayload(secondPayload, {
    capturedAt: fixedClock(),
    url: 'https://example.test/unsanded.json',
    idFactory: () => 'unsanded-second',
  });

  assert.deepEqual(first.raw_state, firstPayload.deep);
  assert.equal(first.state.P, 1);
  assert.equal(first.state.bz, -20);
  assert.equal(first.transformations.some((entry) => entry.field === 'P' && entry.input === 1.25), true);
  assert.equal(first.transformations.some((entry) => entry.field === 'bz' && entry.input === -44), true);
  assert.equal(first.fingerprint === second.fingerprint, false);
});

test('tampered or incomplete renderer bindings are rejected', () => {
  const divergent = structuredClone(makePacket());
  divergent.correspondence.bindings.tone = 'fnv1a64:0000000000000000';
  assert.throws(
    () => validateDualAspectPacket(divergent, { verifyFingerprint: false }),
    (error) => error instanceof DualAspectError && error.code === 'hidden-state-divergence',
  );

  const incomplete = structuredClone(makePacket());
  delete incomplete.correspondence.bindings.haptic;
  assert.throws(
    () => validateDualAspectPacket(incomplete, { verifyFingerprint: false }),
    (error) => error instanceof DualAspectError && error.code === 'missing-correspondence-binding',
  );

  const expressionDivergence = structuredClone(makePacket());
  expressionDivergence.experiential.glyph.deep_snapshot_id = 'different-snapshot';
  assert.throws(
    () => validateDualAspectPacket(expressionDivergence, { verifyFingerprint: false }),
    (error) => error instanceof DualAspectError && error.code === 'hidden-deep-divergence',
  );
});

test('replay reproduces the same derived glyph, tone, image, haptic, and narrative state', () => {
  const packet = makePacket();
  const first = replayDualAspectPacket(packet);
  const second = replayDualAspectPacket(packet);

  assert.deepEqual(second, first);
  assert.equal(first.glyph.seed, packet.experiential.glyph.seed);
  assert.equal(first.tone.shared_state_fingerprint, packet.correspondence.shared_state_fingerprint);
  assert.equal(first.replay_fingerprint, second.replay_fingerprint);
});

test('packet glyph renderer produces deterministic paths from the exact sealed expression', () => {
  const packet = makePacket();
  const first = buildPacketGlyphRender(packet);
  const second = buildPacketGlyphRender(packet);

  assert.deepEqual(first, second);
  assert.equal(first.packet_id, packet.packet_id);
  assert.equal(first.shared_state_fingerprint, packet.correspondence.shared_state_fingerprint);
  assert.equal(first.deep_snapshot_id, packet.observable.deep_snapshot.snapshot_id);
  assert.equal(first.premaq_id, packet.observable.premaq.id);
  assert.equal(first.seed, packet.experiential.glyph.seed);
  assert.equal(first.arrival.node_count, packet.experiential.glyph.arrival_stroke.node_count);
  assert.equal(first.reception.ring_count, packet.experiential.glyph.reception_stroke.ring_count);
  assert.match(first.arrival.path, /^M /);
});

test('activation creates one joined receipt and render updates remain packet-bound', () => {
  const storage = new MemoryStorage();
  const packet = makePacket();
  publishDualAspectActivation(packet, {
    storage,
    eventTarget: null,
    clock: fixedClock,
  });

  const restored = readActiveDualAspectPacket({ storage });
  assert.equal(restored.packet_id, packet.packet_id);
  assert.equal(readPacketBoundDeepSnapshot({ storage }).snapshot_id, packet.observable.deep_snapshot.snapshot_id);

  const renderedGlyph = buildPacketGlyphRender(packet);
  recordDualAspectRender(packet, {
    renderer: 'glyph',
    output: renderedGlyph,
    status: CLAIM_STATES.VERIFIED,
    storage,
    clock: fixedClock,
  });
  const replay = replayDualAspectPacket(packet);
  recordDualAspectReplay(packet, replay, { storage, clock: fixedClock });

  const receipt = readDualAspectReceiptForPacket(packet.packet_id, { storage });
  assert.equal(receipt.activation.status, CLAIM_STATES.VERIFIED);
  assert.equal(receipt.render_records.glyph.status, CLAIM_STATES.VERIFIED);
  assert.equal(receipt.render_records.tone.status, CLAIM_STATES.NOT_YET_TESTED);
  assert.equal(receipt.render_records.glyph.shared_state_fingerprint, packet.correspondence.shared_state_fingerprint);
  assert.equal(receipt.replay.status, CLAIM_STATES.VERIFIED);
});

test('sensory activation requires the current packet and cannot acknowledge after clearing', () => {
  const storage = new MemoryStorage();
  const packet = makePacket();
  publishDualAspectActivation(packet, { storage, eventTarget: null, clock: fixedClock });
  const activation = buildSensoryActivation(packet);
  storage.setItem('hearthweave:sensory-activation:active:v1', JSON.stringify(activation));

  assert.equal(activation.tone.shared_state_fingerprint, packet.correspondence.shared_state_fingerprint);
  assert.equal(activation.haptic.shared_state_fingerprint, packet.correspondence.shared_state_fingerprint);
  assert.equal(activation.narrative.shared_state_fingerprint, packet.correspondence.shared_state_fingerprint);
  assert.equal(activation.acknowledgements.tone, false);

  const receipt = acknowledgeSensoryRender(packet, {
    renderer: 'tone',
    output: activation.tone,
    storage,
  });
  assert.equal(receipt.render_records.tone.status, CLAIM_STATES.VERIFIED);

  clearDualAspectActivation({ storage, eventTarget: null, clock: fixedClock });
  assert.equal(readActiveDualAspectPacket({ storage }), null);
  assert.equal(getActiveSensoryActivation({ storage }), null);
  assert.throws(
    () => acknowledgeSensoryRender(packet, {
      renderer: 'haptic',
      output: activation.haptic,
      storage,
    }),
    /no longer active/,
  );
});

test('unknown worlds enter an explicit unregistered House instead of invented canon', () => {
  const known = resolveHouseProfile("Ta'veren Vaen");
  const unknown = resolveHouseProfile('a-world-not-yet-registered');

  assert.equal(known.id, 'ta-veren-vaen');
  assert.equal(known.canon.foundation.id, 'wheel-of-time-canon');
  assert.equal(unknown.id, 'unregistered-house');
  assert.equal(unknown.canon.foundation.source_class, 'unregistered');
  assert.equal(unknown.capabilities.degraded, true);
});
