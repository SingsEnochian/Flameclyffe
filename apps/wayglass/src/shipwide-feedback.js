import { digestWce1 } from './wyrdrune-proof.js';

export const SHIPWIDE_RETURN_KEY = 'wayglass.shipwide-feedback.return/v1';

function tabStorage() {
  try { return globalThis.sessionStorage; }
  catch { return null; }
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

export function createShipwideFeedbackStore({ storage = tabStorage, cryptoImpl } = {}) {
  let latest = null;
  let generation = 0;
  let settled = false;
  let pending = 0;

  async function restore() {
    if (settled || pending) return latest;
    const start = generation;
    let plan = null;
    try {
      const raw = storage()?.getItem(SHIPWIDE_RETURN_KEY);
      if (raw && raw.length <= 16000) {
        const { value, checkpoint, feedbackDigest } = JSON.parse(raw);
        plan = await verifyShipwideFeedback(value, checkpoint, feedbackDigest, cryptoImpl);
      }
    } catch { /* A missing or unreadable Return leaves the plan empty. */ }
    if (generation === start) {
      latest = plan;
      settled = true;
    }
    return latest;
  }

  async function admit(value, checkpoint, feedbackDigest, { stopped = () => false } = {}) {
    const start = ++generation;
    pending++;
    let plan;
    try { plan = await verifyShipwideFeedback(value, checkpoint, feedbackDigest, cryptoImpl); }
    finally { pending--; }
    if (stopped() || generation !== start) return null;
    latest = plan;
    settled = true;
    try { storage()?.setItem(SHIPWIDE_RETURN_KEY, JSON.stringify({ value, checkpoint, feedbackDigest })); }
    catch { /* The admitted plan remains usable until this page closes. */ }
    return plan;
  }

  function clear() {
    generation++;
    latest = null;
    settled = true;
    try { storage()?.removeItem(SHIPWIDE_RETURN_KEY); }
    catch { /* Storage may be disabled. */ }
  }
  return Object.freeze({ restore, admit, clear });
}

export const shipwideFeedback = createShipwideFeedbackStore();
