import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import { normaliseFlameContinuityLedger } from './flame-continuity-state.js';

export const FLAME_CONTINUITY_REPLAY_SCHEMA = 'arcsweep.flame-continuity-replay/v1';

function selectObservations(ledgerInput, { voiceId = null, worldId = null } = {}) {
  return normaliseFlameContinuityLedger(ledgerInput).observations
    .filter((item) => !voiceId || item.flame.voice_id === voiceId)
    .filter((item) => !worldId || item.context.world_id === worldId)
    .sort((a, b) => a.observed_at.localeCompare(b.observed_at) || a.fingerprint.localeCompare(b.fingerprint));
}

async function evidenceFingerprint(observations) {
  return sha256Hex(observations.map((item) => ({
    observation_id: item.observation_id,
    fingerprint: item.fingerprint,
    voice_id: item.flame.voice_id,
    route: item.flame.route,
    provider: item.runtime.provider,
    model: item.runtime.model,
    profile_id: item.runtime.profile_id,
    world_id: item.context.world_id,
    observed_at: item.observed_at,
  })));
}

export async function createFlameContinuityReplay({
  ledger,
  voiceId = null,
  worldId = null,
  generatedAt = new Date().toISOString(),
} = {}) {
  const observations = selectObservations(ledger, { voiceId, worldId });
  const fingerprint = await evidenceFingerprint(observations);
  return Object.freeze({
    schema: FLAME_CONTINUITY_REPLAY_SCHEMA,
    version: 1,
    generated_at: new Date(generatedAt).toISOString(),
    scope: Object.freeze({ voice_id: voiceId, world_id: worldId }),
    observation_count: observations.length,
    observation_ids: Object.freeze(observations.map((item) => item.observation_id)),
    observation_fingerprints: Object.freeze(observations.map((item) => item.fingerprint)),
    evidence_fingerprint: fingerprint,
    authority: Object.freeze({
      replay_proves_identity: false,
      replay_rewrites_history: false,
      exact_match_means_same_receipted_runtime_slice: true,
      canon_commit: false,
    }),
  });
}

export async function verifyFlameContinuityReplay(replay, ledger) {
  if (replay?.schema !== FLAME_CONTINUITY_REPLAY_SCHEMA) throw new Error('FLAME_CONTINUITY_REPLAY: valid replay receipt required');
  const observations = selectObservations(ledger, replay.scope || {});
  const actual = await evidenceFingerprint(observations);
  return Object.freeze({
    matched: actual === replay.evidence_fingerprint,
    expected_fingerprint: replay.evidence_fingerprint,
    actual_fingerprint: actual,
    observation_count: observations.length,
    authority: Object.freeze({ mismatch_rewrites_history: false, match_proves_identity: false }),
  });
}
