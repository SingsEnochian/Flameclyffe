import { validateDeepTimeWindow } from '../../../starwell/deep-observer/deep-time-validator.js';
import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';

export const DEEP_TIME_REPLAY_RECEIPT_SCHEMA = 'arcsweep.deep-time-replay-receipt/v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`ARCSWEEP_DEEP_TIME_REPLAY: ${message}`);
}

export async function replayDeepTimeWindow(records, { generatedAt } = {}) {
  invariant(Array.isArray(records) && records.length > 0, 'at least one DEEPTime record is required');
  const sorted = [...records].sort((a, b) => Number(a.lambda) - Number(b.lambda));
  const validation = validateDeepTimeWindow(sorted);
  invariant(validation.valid, `DEEPTime window failed validation: ${validation.errors.map((item) => `${item.path} ${item.message}`).join('; ')}`);

  const checks = [];
  for (const record of sorted) {
    const stateHash = await sha256Hex(record.premaqc);
    checks.push(Object.freeze({
      record_id: record.id,
      lambda: record.lambda,
      expected_state_hash: record.provenance.accepted_state_hash,
      replay_state_hash: stateHash,
      matched: stateHash === record.provenance.accepted_state_hash,
      source_run_id: record.provenance.observation_run_id,
    }));
  }
  const matched = checks.every((check) => check.matched);
  const core = {
    schema: DEEP_TIME_REPLAY_RECEIPT_SCHEMA,
    schema_version: 1,
    generated_at: generatedAt ?? new Date().toISOString(),
    sequence_id: sorted[0].sequence_id,
    sequence_revision: sorted[0].sequence_revision,
    lambda_start: sorted[0].lambda,
    lambda_end: sorted.at(-1).lambda,
    record_count: sorted.length,
    matched,
    checks,
    authority: {
      verification_only: true,
      source_records_mutable: false,
      accepted_state_recomputed: true,
      temporal_order_rewritten: false,
      canon_commit: false,
      physical_claim: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    receipt_id: `arcsweep-deep-time-replay-${fingerprint.slice(0, 24)}`,
    receipt_fingerprint: fingerprint,
  });
}
