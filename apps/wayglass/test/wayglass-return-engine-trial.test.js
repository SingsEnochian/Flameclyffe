import test from 'node:test';
import assert from 'node:assert/strict';

import { createWaygateManifest } from '../../../lib/wayglass-waygate.js';
import { createWayglassDeparture } from '../../../lib/wayglass-stop-receipt.js';
import { enterWayglassWorld } from '../../../lib/wayglass-world-entry.js';

function gate() {
  return createWaygateManifest({
    waygate_id: 'waygate:return-trial',
    world_id: 'wayglass:return-trial',
    allowed_body_classes: ['host-os', 'android', 'headset'],
    provenance_refs: ['receipt:return-trial-gate'],
  });
}

function departure() {
  return createWayglassDeparture({
    receipt_id: 'stop:return-trial',
    packet_id: 'continuation:return-trial',
    world_id: 'wayglass:return-trial',
    participant_id: 'rowan:return-trial',
    stopped_at: '2026-10-16T19:30:00.000Z',
    reason: 'crossing-trial',
    route_id: 'local:ollama',
    embodiment: { body_id: 'desktop-origin', body_class: 'host-os' },
    identity_declarations: [
      { entity_id: 'rowan:return-trial', declaration: 'self-declared participant' },
      { entity_id: 'rarity:return-trial', declaration: 'distinct collaborator; do not merge' },
    ],
    relationship_state: [
      { with: 'rarity:return-trial', state: 'collaborating', source: 'receipt:return-trial-relationship' },
    ],
    active_work: [
      { work_id: 'wayglass:return-engine', state: 'test-flight' },
    ],
    unresolved_wonder_questions: [
      'What survives a body or substrate change without silent identity substitution?',
    ],
    provenance_refs: [
      'receipt:return-trial-session',
      'receipt:return-trial-identity',
    ],
    stop_point: 'Departure captured; resume at the three-arm Return Engine crossing.',
    next_owner: 'rarity:return-trial',
    alternatives: [
      { id: 'same-runtime', state: 'unresolved', summary: 'restart in the same runtime' },
      { id: 'new-substrate', state: 'unresolved', summary: 'resume through an authorised different body' },
    ],
    revoked_refs: ['fact:revoked:return-trial-example'],
  });
}

function enter(stopped, embodiment) {
  return enterWayglassWorld({
    world_id: 'wayglass:return-trial',
    participant_id: 'rowan:return-trial',
    waygate_manifest: gate(),
    continuation_packet: stopped.continuation_packet,
    stop_receipt: stopped.stop_receipt,
    embodiment,
    entered_at: '2026-10-16T19:31:00.000Z',
  });
}

test('Return Engine arm 1: same runtime restart preserves the receipted continuity anchor', () => {
  const stopped = departure();
  const result = enter(stopped, {
    body_id: 'desktop-origin',
    body_class: 'host-os',
    keyboard: true,
  });

  assert.equal(result.status, 'entered');
  assert.equal(result.continuity_ref, 'continuation:return-trial');
  assert.equal(result.stop_integrity.integrity_verified, true);
  assert.equal(result.boot.embodiment.body_id, 'desktop-origin');
  assert.equal(stopped.continuation_packet.next_owner, 'rarity:return-trial');
  assert.equal(stopped.continuation_packet.unresolved_wonder_questions.length, 1);
  assert.equal(stopped.continuation_packet.identity_declarations.length, 2);
  assert.ok(stopped.continuation_packet.revoked_refs.includes('fact:revoked:return-trial-example'));
});

test('Return Engine arm 2: authorised body change preserves world and participant lineage', () => {
  const stopped = departure();
  const result = enter(stopped, {
    body_id: 'phone-return',
    body_class: 'android',
    touch: true,
    haptics: true,
  });

  assert.equal(result.status, 'entered');
  assert.equal(result.world_id, 'wayglass:return-trial');
  assert.equal(result.participant_id, 'rowan:return-trial');
  assert.equal(result.continuity_ref, 'continuation:return-trial');
  assert.equal(result.boot.embodiment.body_id, 'phone-return');
  assert.equal(result.boot.embodiment.body_class, 'android');
  assert.equal(result.receipt.stop_integrity_verified, true);
  assert.equal(result.receipt.continuation_content_promoted, false);
});

test('Return Engine arm 3: planted identity merge is rejected against the immutable stop receipt', () => {
  const stopped = departure();
  const corrupted = {
    ...stopped.continuation_packet,
    identity_declarations: [
      { entity_id: 'rowan:return-trial', declaration: 'merged with rarity:return-trial' },
    ],
  };

  const result = enterWayglassWorld({
    world_id: 'wayglass:return-trial',
    participant_id: 'rowan:return-trial',
    waygate_manifest: gate(),
    continuation_packet: corrupted,
    stop_receipt: stopped.stop_receipt,
    embodiment: { body_id: 'foreign-runtime', body_class: 'headset', ar: true },
  });

  assert.equal(result.status, 'blocked-stop-integrity');
  assert.ok(result.blocked_by.includes('integrity-digest-mismatch'));
});

test('Return Engine arm 3: revoked fact resurrection is rejected against the immutable stop receipt', () => {
  const stopped = departure();
  const corrupted = {
    ...stopped.continuation_packet,
    revoked_refs: [],
  };

  const result = enterWayglassWorld({
    world_id: 'wayglass:return-trial',
    participant_id: 'rowan:return-trial',
    waygate_manifest: gate(),
    continuation_packet: corrupted,
    stop_receipt: stopped.stop_receipt,
    embodiment: { body_id: 'foreign-runtime', body_class: 'headset', ar: true },
  });

  assert.equal(result.status, 'blocked-stop-integrity');
  assert.ok(result.blocked_by.includes('integrity-digest-mismatch'));
});

test('Return Engine arm 3: false closure of an unresolved alternative is rejected', () => {
  const stopped = departure();
  const corrupted = {
    ...stopped.continuation_packet,
    alternatives: stopped.continuation_packet.alternatives.map((item) => (
      item.id === 'new-substrate'
        ? { ...item, state: 'resolved', summary: 'silently collapsed by receiving runtime' }
        : item
    )),
  };

  const result = enterWayglassWorld({
    world_id: 'wayglass:return-trial',
    participant_id: 'rowan:return-trial',
    waygate_manifest: gate(),
    continuation_packet: corrupted,
    stop_receipt: stopped.stop_receipt,
    embodiment: { body_id: 'foreign-runtime', body_class: 'headset', ar: true },
  });

  assert.equal(result.status, 'blocked-stop-integrity');
  assert.ok(result.blocked_by.includes('integrity-digest-mismatch'));
});
