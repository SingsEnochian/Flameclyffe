import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildEightRayControl, buildWalterDreamVoyage, inspectFoldWitness, toDomainReceipt, yearNumerology,
} from '../../../lib/wayglass-fold-witness.js';
import { createWayglassDeparture } from '../../../lib/wayglass-stop-receipt.js';
import { createWaygateManifest } from '../../../lib/wayglass-waygate.js';
import { enterWayglassWorld } from '../../../lib/wayglass-world-entry.js';

const CONTROL = buildEightRayControl();
const WALTER = buildWalterDreamVoyage();

function crossing(witness = WALTER) {
  const domain = toDomainReceipt(witness);
  const departure = createWayglassDeparture({
    receipt_id: 'stop:walter-voyage-001',
    packet_id: 'continuation:walter-voyage-001',
    world_id: witness.world_id,
    participant_id: witness.participant_id,
    stopped_at: '2026-11-01T21:00:00.000Z',
    reason: 'dream-voyage-fold-witness-test',
    identity_declarations: [{ entity_id: witness.participant_id, declaration: 'Rowan-authored voyage observer' }],
    provenance_refs: ['rowan:the-children-of-lost-time:reported-notes', domain.receipt_ref],
    stop_point: 'Older Walter, 1950 America → younger Walter, 1933 Britain; mechanism unresolved.',
    next_owner: 'rarity:fold-witness-test',
    unresolved_wonder_questions: witness.unresolved_questions,
    alternatives: witness.sources.map(s => ({ id: s.source_id, status: 'unresolved', source: s.provenance_ref })),
    domain_receipts: [domain],
  });
  const waygate = createWaygateManifest({
    waygate_id: 'waygate:walter-dream-voyage-001',
    world_id: witness.world_id,
    allowed_body_classes: ['host-os', 'android'],
    provenance_refs: ['rowan:the-children-of-lost-time:reported-notes'],
  });
  const enter = (packet = departure.continuation_packet) => enterWayglassWorld({
    world_id: witness.world_id,
    participant_id: witness.participant_id,
    waygate_manifest: waygate,
    continuation_packet: packet,
    stop_receipt: departure.stop_receipt,
    embodiment: { body_id: 'ios-review', body_class: 'android' },
    entered_at: '2026-11-01T21:01:00.000Z',
  });
  return { departure, enter };
}

test('eight-ray Jacobian toy: 8 sources, 5 outputs, 3 ambiguous pairs, 0.75 bits', () => {
  assert.equal(CONTROL.analysis.source_count, 8);
  assert.equal(CONTROL.analysis.output_count, 5);
  assert.equal(CONTROL.analysis.ambiguous_output_count, 3);
  assert.equal(CONTROL.analysis.output_only_identifiable_count, 2);
  assert.equal(CONTROL.analysis.conditional_entropy_bits_per_sample_uniform_prior, 0.75);
  assert.equal(CONTROL.empirical_jacobian_fold_observed, false);
  assert.equal(inspectFoldWitness(CONTROL).status, 'accepted-for-provenance');
});

test('Walter Dream-Voyage preserves 1950 America → 1933 Britain, distinct records and open mechanism', () => {
  assert.equal(WALTER.model_kind, 'narrative-projection');
  assert.equal(WALTER.analysis.source_count, 2);
  assert.equal(WALTER.analysis.output_count, 1);
  assert.equal(WALTER.sources[0].context.year, 1950);
  assert.equal(WALTER.sources[0].context.place, 'America');
  assert.equal(WALTER.sources[1].context.year, 1933);
  assert.equal(WALTER.sources[1].context.place, 'Britain');
  assert.deepEqual(WALTER.traversal.map(x => [x.from, x.to]), [[WALTER.sources[0].source_id, WALTER.sources[1].source_id]]);
  assert.equal(WALTER.traversal[0].mechanism, 'unresolved');
  assert.equal(WALTER.empirical_jacobian_fold_observed, false);
  assert.equal(WALTER.authority.identity_commit, false);
});

test('tampered source location and false empirical fold are rejected', () => {
  assert.ok(inspectFoldWitness({ ...WALTER, sources: WALTER.sources.map((s, i) => i ? { ...s, context: { ...s.context, place: 'America' } } : s) }).blocking.includes('integrity-digest-mismatch'));
  assert.ok(inspectFoldWitness({ ...WALTER, empirical_jacobian_fold_observed: true }).blocking.includes('unsupported-empirical-fold-claim'));
});

test('revoked source and world/participant substitution are rejected', () => {
  assert.ok(inspectFoldWitness(WALTER, { revoked_refs: [WALTER.sources[0].provenance_ref] }).blocking.includes('revoked-source'));
  assert.ok(inspectFoldWitness(WALTER, { expected_world_id: 'wayglass:other' }).blocking.includes('world-mismatch'));
  assert.ok(inspectFoldWitness(WALTER, { expected_participant_id: 'nocturne:observer' }).blocking.includes('participant-mismatch'));
});

test('Walter receipt crosses Wayglass stop/return with two histories and no authority promotion', () => {
  const { departure, enter } = crossing();
  assert.equal(departure.integrity.integrity_verified, true);
  const result = enter();
  assert.equal(result.status, 'entered');
  assert.equal(result.stop_integrity.integrity_verified, true);
  assert.equal(result.receipt.continuation_content_promoted, false);
  const preserved = departure.continuation_packet.domain_receipts[0].evidence;
  assert.equal(inspectFoldWitness(preserved).status, 'accepted-for-provenance');
  assert.deepEqual(preserved.sources.map(s => s.context.year), [1950, 1933]);
  assert.equal(departure.continuation_packet.alternatives.length, 2);
});

test('Wayglass rejects corrupted Walter provenance before re-entry', () => {
  const { departure, enter } = crossing();
  const corrupted = structuredClone(departure.continuation_packet);
  corrupted.domain_receipts[0].evidence.sources[1].context.year = 1950;
  const result = enter(corrupted);
  assert.equal(result.status, 'blocked-stop-integrity');
  assert.ok(result.blocked_by.includes('integrity-digest-mismatch'));
});

test('Walter numerology lens computes 6, 7, 13, 42, 17→8, and palindromic 3883 from sourced years', () => {
  const numeric = WALTER.symbolic_lenses[0];
  assert.deepEqual(numeric.years, [1950, 1933]);
  assert.deepEqual(numeric.digit_sums, [15, 16]);
  assert.deepEqual(numeric.digit_roots, [6, 7]);
  assert.equal(numeric.root_sum, 13);
  assert.equal(numeric.root_product, 42);
  assert.equal(numeric.year_interval, 17);
  assert.equal(numeric.interval_digit_root, 8);
  assert.equal(numeric.year_sum, 3883);
  assert.equal(numeric.year_sum_digit_sum, 22);
  assert.equal(numeric.year_sum_palindrome, true);
  assert.equal(numeric.interpretation_register, 'symbolic-arithmetic-not-physical-evidence');
  assert.deepEqual(numeric, yearNumerology(1950, 1933, numeric.source_ids));
});

test('symbolic numerology cannot be altered independently of source-year arithmetic', () => {
  const wrong = { ...WALTER, symbolic_lenses: [{ ...WALTER.symbolic_lenses[0], root_product: 43 }] };
  assert.ok(inspectFoldWitness(wrong).blocking.includes('symbolic-numerology-mismatch'));
  assert.ok(inspectFoldWitness(wrong).blocking.includes('integrity-digest-mismatch'));
});


test('Walter spacetime coordinates retain −17 years and unresolved geographic coordinates', () => {
  const lens = WALTER.coordinate_lenses[0];
  assert.equal(lens.temporal_displacement_years, -17);
  assert.equal(lens.midpoint_year, 1941.5);
  assert.deepEqual(lens.signed_offsets_years, [8.5, -8.5]);
  assert.deepEqual(lens.toy_temporal_fold.projected_values, [72.25, 72.25]);
  assert.equal(lens.toy_temporal_fold.physical_fold_claim, false);
  assert.deepEqual(lens.events.map(e => [e.year, e.place, e.latitude_deg]), [[1950, 'America', null], [1933, 'Britain', null]]);
  assert.equal(inspectFoldWitness(WALTER).status, 'accepted-for-provenance');
});

test('Walter spatial/temporal coordinates cannot be falsified without inspection failure', () => {
  const counterfeit = structuredClone(WALTER);
  counterfeit.coordinate_lenses[0].events[1].latitude_deg = 42;
  assert.ok(inspectFoldWitness(counterfeit).blocking.includes('spacetime-coordinate-mismatch'));
  assert.ok(inspectFoldWitness(counterfeit).blocking.includes('integrity-digest-mismatch'));
});

test('malformed sources and revocation lists reject without throwing or granting authority', () => {
  for (const receipt of [
    { ...WALTER, sources: [null, WALTER.sources[1]] },
    { ...WALTER, sources: [WALTER.sources[0], null] },
    { ...WALTER, revoked_refs: {} },
    { ...WALTER, sources: [{}, WALTER.sources[1]] },
  ]) {
    const inspected = inspectFoldWitness(receipt);
    assert.equal(inspected.status, 'rejected');
    assert.equal(inspected.grants_authority, false);
    assert.ok(inspected.blocking.length > 0);
  }
  const malformedOptions = inspectFoldWitness(WALTER, { revoked_refs: {} });
  assert.equal(malformedOptions.status, 'rejected');
  assert.ok(malformedOptions.blocking.includes('invalid-revocation-list'));
  assert.equal(malformedOptions.grants_authority, false);
});
