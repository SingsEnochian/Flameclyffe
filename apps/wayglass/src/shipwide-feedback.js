import { digestWce1 } from './wyrdrune-proof.js';

let latest = null;

export function latestShipwideFeedback() {
  return latest;
}

export async function verifyShipwideFeedback(value, checkpoint, feedbackDigest, cryptoImpl) {
  if (value?.schema !== 'wayglass.shipwide-feedback/v0.1' ||
      typeof checkpoint !== 'string' || typeof feedbackDigest !== 'string' ||
      value.plan?.provenance?.checkpoint !== checkpoint ||
      value.plan.provenance.feedback !== feedbackDigest ||
      typeof value.plan.video !== 'string' || value.plan.video.length > 500 ||
      typeof value.plan.engineering !== 'string' || typeof value.plan.agents !== 'string' ||
      value.wtl?.outputDigest !== await digestWce1(value.plan, cryptoImpl)) {
    throw new TypeError('Shipwide feedback does not match its Observer evidence');
  }
  const { audio } = value.plan;
  for (const [key, lo, hi] of [
    ['rootHz', 70, 650], ['counterpartHz', 70, 900],
    ['foregroundGain', 0, 0.06], ['atmosphereGain', 0, 0.04],
  ]) {
    if (!Number.isFinite(audio?.[key]) || audio[key] < lo || audio[key] > hi) {
      throw new TypeError('Shipwide feedback audio exceeds engine bounds');
    }
  }
  return Object.freeze({
    ...value.plan, audio: Object.freeze({ ...audio }),
    provenance: Object.freeze({ ...value.plan.provenance }), sourceHash: value.wtl.sourceHash,
  });
}

export function publishShipwideFeedback(plan) {
  latest = plan;
}
