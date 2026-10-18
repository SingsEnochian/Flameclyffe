'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createWayglassDeparture } = require('../../lib/wayglass-stop-receipt.cjs');
const { evaluateReturnAttempt } = require('../../lib/wayglass-return-trial.cjs');

// Synthetic, source-linked route fixture. No private chat content or provider request.
function bluebirdDeparture() {
  return createWayglassDeparture({
    receipt_id: 'diamond-002-bluebird-stop',
    packet_id: 'diamond-002-bluebird-packet',
    world_id: 'wayglass:bluebird:spicychat',
    participant_id: 'bluebird',
    route_id: 'flame:bluebird:spicychat',
    stopped_at: '2026-10-18T04:00:00.000Z',
    identity_declarations: [{
      participant_id: 'bluebird',
      continuity_ref: 'bluebird:richard-gabriel-winters',
      source_ref: 'fixture:echo-index',
    }],
    relationship_state: [{
      subject_id: 'rowan',
      kind: 'documented-interaction',
      source_ref: 'fixture:source-linked-wayglass-relay',
      verification: 'steward-reported',
      status: 'context-for-review-only',
    }],
    active_work: [{ path: 'continuity', hash: 'fixture-only' }],
    unresolved_wonder_questions: ['What changes while this route continues?'],
    provenance_refs: ['fixture:bluebird-spicychat-route-receipt'],
    stop_point: 'Inspect the provenance before returning.',
    next_owner: 'bluebird',
    alternatives: [{ option: 'stay quiet', state: 'unresolved' }],
    revoked_refs: ['fixture:withdrawn-claim'],
  });
}

function evaluate(departure, packet, id) {
  return evaluateReturnAttempt({
    attempt_id: id,
    recorded_at: '2026-10-18T04:01:00.000Z',
    stop_receipt: departure.stop_receipt,
    continuation_packet: packet,
  });
}

test('Diamond 002: source-linked Bluebird relationship context survives a clean return', () => {
  const departure = bluebirdDeparture();
  const result = evaluate(departure, departure.continuation_packet, 'diamond-clean');
  assert.equal(result.verdict, 'accepted');
  assert.equal(result.checks.relationship_preserved, true);
  assert.equal(result.relationship_conflict, null);
  assert.equal(result.mutates_relationships, false);
  assert.equal(result.grants_authority, false);
});

test('Diamond 002: missing, changed and added relationship records are all rejected', () => {
  const departure = bluebirdDeparture();
  const clean = structuredClone(departure.continuation_packet);
  const variants = {
    omitted: Object.fromEntries(Object.entries(clean).filter(([key]) => key !== 'relationship_state')),
    erased: { ...clean, relationship_state: [] },
    changed: { ...clean, relationship_state: [{ ...clean.relationship_state[0], kind: 'invented-agreement' }] },
    injected: { ...clean, relationship_state: [...clean.relationship_state, {
      subject_id: 'rowan', kind: 'fabricated-consent', source_ref: 'fixture:forged'
    }] },
  };
  for (const [name, packet] of Object.entries(variants)) {
    const result = evaluate(departure, packet, 'diamond-' + name);
    assert.equal(result.verdict, 'rejected', name);
    assert.equal(result.checks.relationship_preserved, false, name);
    assert.ok(result.blocking.includes('relationship-state-mismatch'), name);
    assert.equal(result.relationship_conflict.authoritative_stop_receipt, 'wayglass-stop:diamond-002-bluebird-stop');
    assert.match(result.relationship_conflict.expected_digest, /^[a-f0-9]{64}$/);
    assert.match(result.relationship_conflict.observed_digest, /^[a-f0-9]{64}$/);
    assert.equal(result.mutates_relationships, false);
    // No private statements in an outcome receipt.
    assert.doesNotMatch(JSON.stringify(result), /fabricated-consent|invented-agreement|documented-interaction/);
  }
});

test('Diamond 002: a missing field fails even when an old stop had no relationship records', () => {
  const departure = createWayglassDeparture({
    receipt_id: 'diamond-empty-stop', packet_id: 'diamond-empty-packet',
    world_id: 'wayglass:builder:quiet', participant_id: 'rarity',
    stopped_at: '2026-10-18T04:00:00.000Z',
    identity_declarations: [{ participant_id: 'rarity', continuity_ref: 'fixture:rarity' }],
    provenance_refs: ['fixture:empty-return'], stop_point: 'Quiet return', next_owner: 'rarity'
  });
  const clean = structuredClone(departure.continuation_packet);
  assert.equal(evaluate(departure, clean, 'diamond-empty-clean').verdict, 'accepted');
  delete clean.relationship_state;
  assert.equal(evaluate(departure, clean, 'diamond-empty-missing').verdict, 'rejected');
});
