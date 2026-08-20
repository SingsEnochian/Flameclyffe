import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import { normaliseContinuityEvidenceLedger } from './continuity-evidence-state.js';

export const CONTINUITY_EVIDENCE_REPLAY_SCHEMA = 'arcsweep.continuity-evidence-replay/v1';

function orderedEntries(ledger, { worldId = null, subjectId = null } = {}) {
  return normaliseContinuityEvidenceLedger(ledger).entries
    .filter((entry) => !worldId || entry.world_id === worldId)
    .filter((entry) => !subjectId || entry.subject_id === subjectId)
    .sort((left, right) => {
      const time = String(left.recorded_at || '').localeCompare(String(right.recorded_at || ''));
      return time || left.evidence_id.localeCompare(right.evidence_id);
    });
}

export async function createContinuityEvidenceReplay({
  ledger,
  worldId = null,
  subjectId = null,
  generatedAt = new Date().toISOString(),
} = {}) {
  const entries = orderedEntries(ledger, { worldId, subjectId });
  const source = {
    ledger_schema: normaliseContinuityEvidenceLedger(ledger).schema,
    world_id: worldId,
    subject_id: subjectId,
    evidence: entries.map((entry) => ({
      evidence_id: entry.evidence_id,
      kind: entry.kind,
      fingerprint: entry.receipt.fingerprint,
      recorded_at: entry.recorded_at,
      world_id: entry.world_id,
      subject_id: entry.subject_id,
    })),
  };
  const evidenceFingerprint = await sha256Hex(source);
  return Object.freeze({
    schema: CONTINUITY_EVIDENCE_REPLAY_SCHEMA,
    schema_version: 1,
    generated_at: new Date(generatedAt).toISOString(),
    world_id: worldId,
    subject_id: subjectId,
    evidence_count: entries.length,
    evidence_fingerprint: evidenceFingerprint,
    source_receipt_fingerprints: Object.freeze(entries.map((entry) => entry.receipt.fingerprint)),
    source_evidence_ids: Object.freeze(entries.map((entry) => entry.evidence_id)),
    summary: Object.freeze({
      recognition_count: entries.filter((entry) => entry.kind === 'recognition').length,
      residual_count: entries.filter((entry) => entry.kind === 'admissibility-residual').length,
    }),
    authority: Object.freeze({
      deterministic_slice_fingerprint: true,
      replay_is_derived_view: true,
      source_receipts_mutable: false,
      replay_reclassifies_evidence: false,
      replay_proves_identity: false,
      replay_proves_fulfilment: false,
      canon_commit: false,
    }),
  });
}

export async function verifyContinuityEvidenceReplay(replay, ledger) {
  if (replay?.schema !== CONTINUITY_EVIDENCE_REPLAY_SCHEMA) {
    return Object.freeze({ matched: false, reason: 'replay-schema-mismatch' });
  }
  const regenerated = await createContinuityEvidenceReplay({
    ledger,
    worldId: replay.world_id,
    subjectId: replay.subject_id,
    generatedAt: replay.generated_at,
  });
  return Object.freeze({
    matched: regenerated.evidence_fingerprint === replay.evidence_fingerprint,
    expected: replay.evidence_fingerprint,
    actual: regenerated.evidence_fingerprint,
    evidence_count: regenerated.evidence_count,
  });
}
