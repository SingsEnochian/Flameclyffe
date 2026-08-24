import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import { CONTINUITY_EXPERIMENT_ATLAS_SCHEMA } from './continuity-experiment-atlas.js';

export const CONTINUITY_EXPERIMENT_PACKET_SCHEMA = 'arcsweep.continuity-experiment-packet/v1';

export async function createContinuityExperimentPacket({ atlas, sourceHead = null, createdAt = new Date().toISOString() } = {}) {
  if (atlas?.schema !== CONTINUITY_EXPERIMENT_ATLAS_SCHEMA) throw new Error('CONTINUITY_EXPERIMENT_PACKET: atlas required');
  const core = {
    schema: CONTINUITY_EXPERIMENT_PACKET_SCHEMA,
    schema_version: 1,
    created_at: new Date(createdAt).toISOString(),
    source_head: sourceHead == null ? null : String(sourceHead),
    atlas: structuredClone(atlas),
    export_policy: {
      raw_visible_response_text_included: false,
      hidden_reasoning_included: false,
      runtime_attestation_receipts_referenced: true,
      operational_outcomes_only: true,
    },
    authority: {
      portable_replay_and_review_packet: true,
      packet_is_canon: false,
      packet_is_identity_proof: false,
      packet_is_external_world_claim: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({ ...core, packet_id: `continuity-packet-${fingerprint.slice(0, 24)}`, fingerprint });
}
