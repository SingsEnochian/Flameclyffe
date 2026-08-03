import assert from 'node:assert/strict';
import test from 'node:test';

import { BoundIPadSomaticHapticSession } from '../src/ipad-somatic-bound-session.js';
import {
  IPAD_SOMATIC_LINEAGE_STORAGE_KEY,
  buildIPadSomaticLineage,
  canonicalSomaticWorldId,
  clearIPadSomaticLineage,
  publishIPadSomaticLineage,
  readIPadSomaticLineage,
} from '../src/ipad-somatic-lineage.js';

if (typeof globalThis.CustomEvent !== 'function') {
  globalThis.CustomEvent = class CustomEvent extends Event {
    constructor(type, options = {}) {
      super(type);
      this.detail = options.detail;
    }
  };
}

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

class FakeParam {
  setValueAtTime() {}
  linearRampToValueAtTime() {}
}

class FakeNode {
  constructor() {
    this.frequency = new FakeParam();
    this.gain = new FakeParam();
  }
  connect(target) { return target; }
  disconnect() {}
  start() {}
  stop() {}
}

class FakeAudioContext {
  constructor() {
    this.currentTime = 1;
    this.destination = new FakeNode();
    this.closed = false;
  }
  createGain() { return new FakeNode(); }
  createOscillator() { return new FakeNode(); }
  async resume() {}
  async close() { this.closed = true; }
}

const candidate = {
  world_id: 'terra-aeterna',
  world_name: 'Terra Aeterna / Hearthweave',
  profile_version: '0.2',
  tone_layer_id: 'hearthlight-root',
  root_hz: 220,
  enter_threshold: 0.82,
  release_threshold: 0.68,
  excursion: 5,
  source_ref: 'test-profile',
  approval_state: 'pending',
};

function packet({
  world = 'terra-aeterna',
  packetFingerprint = 'fnv1a64:packet-one',
  sharedStateFingerprint = 'fnv1a64:shared-one',
  compressionReceiptId = 'compression-receipt-one',
} = {}) {
  return {
    packet_id: 'dual-aspect-one',
    packet_fingerprint: packetFingerprint,
    identity: {
      world_slug: world,
      house_id: world,
      session_context_id: 'session-one',
    },
    correspondence: {
      shared_state_fingerprint: sharedStateFingerprint,
    },
    temporal: {
      activated_at: '2026-08-03T19:29:00.000Z',
      compression_release: {
        law: 'compression-release-compression-of-release-infinite-recursion',
        cycle: 1,
        next_operation: 'compression-of-release',
      },
    },
    observable: {
      compression_release: {
        receipt: {
          receipt_id: compressionReceiptId,
        },
      },
      premaq: {
        id: 'premaq-one',
        receipt_id: 'premaq-receipt-one',
      },
      bridge: {
        bridge_packet_id: 'bridge-one',
      },
    },
    provenance: {
      compression_release_receipt_id: compressionReceiptId,
    },
    claims: {
      compression_release: 'Verified',
    },
  };
}

test('world aliases resolve to the same somatic identity', () => {
  assert.equal(canonicalSomaticWorldId('Ta’veren Vaen'), 'taveren-vaen');
  assert.equal(canonicalSomaticWorldId('ta-veren-vaen'), 'taveren-vaen');
  assert.equal(canonicalSomaticWorldId('ta-veren-unbound'), 'taveren-vaen');
});

test('active DualAspectPacket produces a complete iPad somatic lineage', () => {
  const lineage = buildIPadSomaticLineage(packet());
  assert.equal(lineage.status, 'active');
  assert.equal(lineage.shared_state_fingerprint, 'fnv1a64:shared-one');
  assert.equal(lineage.compression_release_receipt_id, 'compression-receipt-one');
  assert.equal(lineage.compression_cycle, 1);
  assert.equal(lineage.next_operation, 'compression-of-release');
});

test('lineage publishes across the PWA local-storage boundary and clears with Bifröst', () => {
  const storage = new MemoryStorage();
  publishIPadSomaticLineage(packet({ world: 'ta-veren-vaen' }), { storage });
  const lineage = readIPadSomaticLineage({ storage, worldId: 'taveren-vaen' });
  assert.equal(lineage.world_id, 'taveren-vaen');
  assert.ok(storage.getItem(IPAD_SOMATIC_LINEAGE_STORAGE_KEY));

  assert.throws(
    () => readIPadSomaticLineage({ storage, worldId: 'terra-aeterna' }),
    /does not match selected world/,
  );

  clearIPadSomaticLineage({ storage });
  assert.equal(storage.getItem(IPAD_SOMATIC_LINEAGE_STORAGE_KEY), null);
  assert.throws(
    () => readIPadSomaticLineage({ storage }),
    /no active Bifröst somatic lineage/,
  );
});

test('packet and provenance compression receipts must match', () => {
  const invalid = packet();
  invalid.observable.compression_release.receipt.receipt_id = 'different-receipt';
  assert.throws(
    () => buildIPadSomaticLineage(invalid),
    /do not match/,
  );
});

test('bound somatic session records active Bifröst lineage and rejects changed state at decision', async () => {
  let now = new Date('2026-08-03T19:29:00.000Z');
  let activeLineage = buildIPadSomaticLineage(packet());
  const context = new FakeAudioContext();
  const session = new BoundIPadSomaticHapticSession({
    audioContextFactory: () => context,
    storage: new MemoryStorage(),
    lineageStorage: new MemoryStorage(),
    lineageReader: ({ worldId }) => {
      assert.equal(worldId, 'terra-aeterna');
      return activeLineage;
    },
    now: () => now,
  });

  await session.loadCandidate(candidate);
  const audition = await session.audition({
    foldIndex: 1,
    deviceProfileId: 'body-transducer',
    cycles: 1,
    baseGain: 0.02,
    outputConfirmed: true,
    placement: 'sternum',
    placementClearanceConfirmed: true,
    startLowConfirmed: true,
  });

  assert.equal(audition.source_state_fingerprint, 'fnv1a64:shared-one');
  assert.equal(audition.compression_release_receipt_id, 'compression-receipt-one');
  assert.equal(audition.source_lineage.dual_aspect_packet_id, 'dual-aspect-one');

  now = new Date(new Date(audition.completes_at).getTime() + 1);
  await session.markAuditionComplete();

  activeLineage = buildIPadSomaticLineage(packet({
    packetFingerprint: 'fnv1a64:packet-two',
    sharedStateFingerprint: 'fnv1a64:shared-two',
    compressionReceiptId: 'compression-receipt-two',
  }));
  await assert.rejects(
    () => session.decide({
      decision: 'approved',
      outputConfirmed: true,
      feltAndIdentified: true,
      comfortable: true,
    }),
    /changed after the somatic audition/,
  );

  activeLineage = audition.source_lineage;
  const decision = await session.decide({
    decision: 'approved',
    outputConfirmed: true,
    feltAndIdentified: true,
    comfortable: true,
  });
  assert.equal(
    decision.somatic_audition_receipt.source_state_fingerprint,
    'fnv1a64:shared-one',
  );
});
