import test from 'node:test';
import assert from 'node:assert/strict';
import { createMythframeTranslationCapsule, translationCapsuleForModel } from '../src/mythframe-federation.js';
import { reviewMythframeTranslationCapsule } from '../src/mythframe-federation-review.js';

const fixed = { clock: () => new Date('2026-08-28T20:30:00.000Z'), idFactory: () => 'review-fixture' };

async function sourceCapsule() {
  return createMythframeTranslationCapsule({
    sourceFramework: 'elara-codex',
    sourceObject: { id: 'elara:1179', type: 'symbol', name: 'Duet', meaning: 'Elara-native translation relation.' },
    sourceAuthority: 'elara-local',
    exportPolicy: 'summary_allowed',
    exportConsent: { granted: true, scope: 'summary' },
    requestedSemanticDepth: 'public_summary',
    translationTarget: 'templehouse-hearthweave',
    proposedTargetRelation: 'translates_toward',
    targetAdmissionState: 'unreviewed',
  }, { clock: fixed.clock, idFactory: () => 'source' });
}

test('target review creates a new fingerprint without mutating source export', async () => {
  const source = await sourceCapsule();
  const reviewed = await reviewMythframeTranslationCapsule(source, {
    targetAdmissionState: 'visible_only',
    reviewedBy: 'Rowan',
    reviewNote: 'May be seen for comparison; not locally adopted.',
  }, fixed);
  assert.equal(source.target_admission_state, 'unreviewed');
  assert.equal(reviewed.target_admission_state, 'visible_only');
  assert.equal(reviewed.parent_capsule_fingerprint, source.capsule_fingerprint);
  assert.notEqual(reviewed.capsule_fingerprint, source.capsule_fingerprint);
  assert.equal(reviewed.export_consent.receipt_ref, source.export_consent.receipt_ref);
  assert.equal(reviewed.authority.continuity_admission, false);
  assert.equal(translationCapsuleForModel(reviewed).capsule_fingerprint, reviewed.capsule_fingerprint);
});

test('target review cannot silently turn unreviewed into an implicit decision', async () => {
  const source = await sourceCapsule();
  await assert.rejects(() => reviewMythframeTranslationCapsule(source, { targetAdmissionState: 'unreviewed' }, fixed), /explicit admission decision/);
});
