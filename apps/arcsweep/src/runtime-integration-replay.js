import { ARCSWEEP_RUNTIME_ENVELOPE_SCHEMA } from './runtime-integration-envelope.js';

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function buildRuntimeReplayReceipt(envelope, { replayId, reason = 'manual-replay', createdAt = new Date().toISOString() } = {}) {
  if (envelope?.schema !== ARCSWEEP_RUNTIME_ENVELOPE_SCHEMA) {
    throw new Error('Runtime replay receipt requires a valid envelope.');
  }
  const id = String(replayId || `runtime-replay-${envelope.session_id}-${createdAt}`).trim();
  return {
    schema: 'arcsweep.runtime-integration-replay/v1',
    replay_id: id,
    session_id: envelope.session_id,
    world_id: envelope.world?.identity_anchor?.world_id || envelope.world?.world_id || null,
    active_flame: envelope.active_flame || null,
    reason,
    created_at: createdAt,
    snapshot: clone(envelope),
  };
}

export function restoreEnvelopeFromReplay(receipt) {
  if (receipt?.schema !== 'arcsweep.runtime-integration-replay/v1') {
    throw new Error('Unknown runtime integration replay receipt.');
  }
  if (receipt.snapshot?.schema !== ARCSWEEP_RUNTIME_ENVELOPE_SCHEMA) {
    throw new Error('Runtime integration replay snapshot is invalid.');
  }
  return clone(receipt.snapshot);
}

export function runtimeReplayEquivalent(left, right) {
  const normalise = (envelope) => ({
    schema: envelope?.schema,
    session_id: envelope?.session_id,
    world: envelope?.world || null,
    canon: envelope?.canon || null,
    premaq: envelope?.premaq || null,
    spiral: envelope?.spiral || null,
    ask: envelope?.ask || null,
    active_flame: envelope?.active_flame || null,
    presence: envelope?.presence || {},
    provenance: envelope?.provenance || [],
    feedback: envelope?.feedback || [],
    context: envelope?.context || [],
  });
  return JSON.stringify(normalise(left)) === JSON.stringify(normalise(right));
}
