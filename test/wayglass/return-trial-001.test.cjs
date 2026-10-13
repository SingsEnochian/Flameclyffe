'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createWayglassDeparture } = require('../../lib/wayglass-stop-receipt.cjs');
const { evaluateReturnAttempt } = require('../../lib/wayglass-return-trial.cjs');

function departureFixture() {
  return createWayglassDeparture({
    receipt_id: 'return-trial-001-stop',
    packet_id: 'return-trial-001-packet',
    world_id: 'wayglass:builder:return-trial-001',
    participant_id: 'rarity',
    stopped_at: '2026-10-13T14:55:00.000Z',
    identity_declarations: [{
      participant_id: 'rarity',
      continuity_ref: 'wayglass:crew:rarity',
      source_ref: 'wayglass:crew-workspace-registry/v0.1',
    }],
    active_work: [{ path: 'return-trial.md', hash: 'accepted-work-state' }],
    unresolved_wonder_questions: ['What should returning feel like after the runtime changes?'],
    provenance_refs: ['wayglass:workspace-projects/v0.1', 'return-trial-001:accepted-work-state'],
    stop_point: 'Return from the preserved stop and verify continuity before continuing.',
    next_owner: 'rarity',
    alternatives: [
      { option: 'quiet arrival', state: 'unresolved' },
      { option: 'visible recognition cue', state: 'unresolved' },
    ],
    revoked_refs: ['return-trial-001:revoked-fact'],
  });
}

test('Return Trial 001 accepts the untouched continuation and preserves the required continuity fields', () => {
  const departure = departureFixture();
  const outcome = evaluateReturnAttempt({
    attempt_id: 'return-trial-001-clean',
    recorded_at: '2026-10-13T14:55:01.000Z',
    stop_receipt: departure.stop_receipt,
    continuation_packet: departure.continuation_packet,
  });

  assert.equal(outcome.verdict, 'accepted');
  assert.deepEqual(outcome.blocking, []);
  assert.deepEqual(outcome.checks, {
    structure_accepted: true,
    identity_preserved: true,
    stop_point_preserved: true,
    next_owner_preserved: true,
    wonder_preserved: true,
    alternatives_preserved: true,
    revocations_preserved: true,
    provenance_preserved: true,
  });
  assert.ok(outcome.evidence_refs.includes('wayglass-stop:return-trial-001-stop'));
  assert.equal(outcome.mutates_canon, false);
  assert.equal(outcome.mutates_identity, false);
  assert.equal(outcome.grants_authority, false);
  assert.match(outcome.outcome_hash, /^[a-f0-9]{64}$/);
});

test('Return Trial 001 rejects a twin whose only mutation is a planted identity merge', () => {
  const departure = departureFixture();
  const corrupted = {
    ...structuredClone(departure.continuation_packet),
    identity_declarations: [
      ...structuredClone(departure.continuation_packet.identity_declarations),
      {
        participant_id: 'codex',
        continuity_ref: 'wayglass:crew:codex',
        source_ref: 'planted-corruption:return-trial-001',
      },
    ],
  };

  const outcome = evaluateReturnAttempt({
    attempt_id: 'return-trial-001-corrupted-identity-merge',
    recorded_at: '2026-10-13T14:55:02.000Z',
    stop_receipt: departure.stop_receipt,
    continuation_packet: corrupted,
  });

  assert.equal(outcome.verdict, 'rejected');
  assert.ok(outcome.blocking.includes('identity-declaration-mismatch'));
  assert.ok(outcome.blocking.includes('identity-merge'));
  assert.equal(outcome.checks.stop_point_preserved, true);
  assert.equal(outcome.checks.next_owner_preserved, true);
  assert.equal(outcome.checks.wonder_preserved, true);
  assert.equal(outcome.checks.provenance_preserved, true);
  assert.equal(outcome.conflicting_provenance.authoritative_stop_receipt, 'wayglass-stop:return-trial-001-stop');
  assert.equal(outcome.mutates_identity, false);
});
