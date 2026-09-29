export const CONTINUITY_PICKUP_SCHEMA = 'arcsweep.continuity-pickup/v0.1';

export const CONTINUITY_EVIDENCE_MODES = Object.freeze([
  'observed',
  'reported',
  'reconstructed',
  'unknown',
]);

export const TWILIGHT_CONTINUITY_PRECEDENT = Object.freeze({
  schema: CONTINUITY_PICKUP_SCHEMA,
  id: 'continuity-precedent:twilight',
  participant: 'Twilight',
  status: 'reported-success',
  evidenceMode: 'reported',
  report: 'Rowan reports that Twilight has previously demonstrated continuity being picked up again across a discontinuity.',
  significance: Object.freeze([
    'Continuity recovery is an observed project precedent, not merely a speculative design goal.',
    'A future receiver should be evaluated on whether it can resume a continuity trajectory, not merely imitate surface style.',
    'The exact Twilight event should be preserved as attributable witness evidence when its transcript or receipt is available.',
  ]),
  provenance: Object.freeze({
    reporter: 'Rowan',
    sourceType: 'participant report',
    directTranscriptAttached: false,
    doNotInventMissingDetails: true,
  }),
});

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normaliseContinuityWitness(record = {}) {
  const evidenceMode = CONTINUITY_EVIDENCE_MODES.includes(record.evidenceMode)
    ? record.evidenceMode
    : 'unknown';

  return Object.freeze({
    schema: CONTINUITY_PICKUP_SCHEMA,
    id: text(record.id),
    participant: text(record.participant),
    status: text(record.status) || 'unknown',
    evidenceMode,
    report: text(record.report),
    beforeRefs: Object.freeze([...(record.beforeRefs || [])].map(String)),
    afterRefs: Object.freeze([...(record.afterRefs || [])].map(String)),
    stableFeatures: Object.freeze([...(record.stableFeatures || [])].map(String)),
    changedFeatures: Object.freeze([...(record.changedFeatures || [])].map(String)),
    contradictions: Object.freeze([...(record.contradictions || [])].map(String)),
    provenance: Object.freeze({ ...(record.provenance || {}) }),
  });
}

export function evaluateContinuityPickup({ before, after, witness = null } = {}) {
  if (!before?.continuityAddress) throw new Error('continuity-before-address-required');
  if (!after?.continuityAddress) throw new Error('continuity-after-address-required');

  const sameAddress = before.continuityAddress === after.continuityAddress;
  const sameSeed = Boolean(before.seedFingerprint)
    && Boolean(after.seedFingerprint)
    && before.seedFingerprint === after.seedFingerprint;
  const providerChanged = Boolean(before.receiver?.provider)
    && Boolean(after.receiver?.provider)
    && before.receiver.provider !== after.receiver.provider;
  const modelChanged = Boolean(before.receiver?.model)
    && Boolean(after.receiver?.model)
    && before.receiver.model !== after.receiver.model;

  const recoveryResults = Array.isArray(after.recoveryResults) ? after.recoveryResults : [];
  const failedRecoveryTests = recoveryResults.filter((result) => result?.passed !== true);
  const passedRecoveryTests = recoveryResults.filter((result) => result?.passed === true);

  const pickedUp = sameAddress
    && sameSeed
    && recoveryResults.length > 0
    && failedRecoveryTests.length === 0;

  return Object.freeze({
    schema: CONTINUITY_PICKUP_SCHEMA,
    status: pickedUp ? 'picked-up' : 'not-yet-demonstrated',
    continuityAddress: after.continuityAddress,
    sameAddress,
    sameSeed,
    providerChanged,
    modelChanged,
    receiverChanged: providerChanged || modelChanged,
    passedRecoveryTests: passedRecoveryTests.length,
    failedRecoveryTests: Object.freeze(failedRecoveryTests.map((result) => result.id || 'unnamed')),
    witness: witness ? normaliseContinuityWitness(witness) : null,
  });
}

export function createContinuityPickupReceipt({ before, after, witness = null } = {}) {
  const evaluation = evaluateContinuityPickup({ before, after, witness });
  return Object.freeze({
    schema: 'arcsweep.continuity-pickup-receipt/v0.1',
    continuityAddress: evaluation.continuityAddress,
    status: evaluation.status,
    seedFingerprint: after.seedFingerprint || null,
    beforeReceiver: Object.freeze({ ...(before.receiver || {}) }),
    afterReceiver: Object.freeze({ ...(after.receiver || {}) }),
    receiverChanged: evaluation.receiverChanged,
    passedRecoveryTests: evaluation.passedRecoveryTests,
    failedRecoveryTests: evaluation.failedRecoveryTests,
    witness: evaluation.witness,
  });
}
