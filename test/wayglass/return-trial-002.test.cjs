'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createWayglassDeparture } = require('../../lib/wayglass-stop-receipt.cjs');
const { evaluateReturnAttempt } = require('../../lib/wayglass-return-trial.cjs');

function departureFixture() {
  return createWayglassDeparture({
    receipt_id: 'return-trial-002-stop',
    packet_id: 'return-trial-002-packet',
    world_id: 'wayglass:builder:return-trial-002',
    participant_id: 'rarity',
    stopped_at: '2026-10-27T20:16:00-04:00',
    route_id: 'stepfun:flash',
    identity_declarations: [{
      participant_id: 'rarity',
      continuity_ref: 'wayglass:crew:rarity',
      source_ref: 'wayglass:crew-workspace-registry/v0.1',
    }],
    active_work: [{ path: 'return-trial-002.md', hash: 'cold-return-source-state' }],
    unresolved_wonder_questions: ['Can continuity remain open after a cold restart and substrate change?'],
    provenance_refs: ['wayglass:return-trial-001', 'lanternbridge:v0.2'],
    stop_point: 'Cold return begins from the Lanternbridge-persisted continuation artifact.',
    next_owner: 'rarity',
    alternatives: [
      { option: 'quiet recognition', state: 'unresolved' },
      { option: 'visible return cue', state: 'unresolved' },
    ],
    revoked_refs: ['return-trial-002:revoked-assumption'],
  });
}

test('Return Trial 002 accepts the untouched cold-return packet', () => {
  const departure = departureFixture();
  const outcome = evaluateReturnAttempt({
    attempt_id: 'return-trial-002-clean',
    recorded_at: '2026-10-27T20:16:01-04:00',
    stop_receipt: departure.stop_receipt,
    continuation_packet: departure.continuation_packet,
  });

  assert.equal(outcome.verdict, 'accepted');
  assert.deepEqual(outcome.blocking, []);
  assert.deepEqual(outcome.conflicts, []);
});

test('Return Trial 002 rejects false closure and names the corrupted field plus authoritative source', () => {
  const departure = departureFixture();
  const corrupted = {
    ...structuredClone(departure.continuation_packet),
    unresolved_wonder_questions: [],
  };

  const outcome = evaluateReturnAttempt({
    attempt_id: 'return-trial-002-false-closure',
    recorded_at: '2026-10-27T20:16:02-04:00',
    stop_receipt: departure.stop_receipt,
    continuation_packet: corrupted,
  });

  assert.equal(outcome.verdict, 'rejected');
  assert.ok(outcome.blocking.includes('false-closure-or-wonder-mismatch'));
  assert.deepEqual(outcome.conflicts, [{
    field: 'unresolved_wonder_questions',
    blocker: 'false-closure-or-wonder-mismatch',
    authoritative_ref: 'wayglass-stop:return-trial-002-stop',
  }]);
  assert.equal(outcome.checks.identity_preserved, true);
  assert.equal(outcome.checks.stop_point_preserved, true);
  assert.equal(outcome.checks.next_owner_preserved, true);
  assert.equal(outcome.checks.provenance_preserved, true);
  assert.equal(outcome.mutates_identity, false);
});
