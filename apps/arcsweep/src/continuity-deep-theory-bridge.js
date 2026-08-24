import { assertValidDeepTheoryRecord } from '../../../starwell/deep-observer/deep-theory-validator.js';
import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import { ARCSWEEP_DEEP_THEORY_CANDIDATE_SCHEMA } from './deep-theory-bridge.js';
import { normaliseContinuityEvidenceLedger } from './continuity-evidence-state.js';

function sourceRef(entry, index) {
  return {
    ref: `continuity-evidence-${index + 1}`,
    dataset: 'Arcsweep Continuity Evidence',
    record_type: 'derived',
    checksum: entry.receipt.fingerprint,
    note: `${entry.kind} · ${entry.evidence_id}`,
  };
}

function finding(entry, index) {
  const source_refs = [`continuity-evidence-${index + 1}`];
  if (entry.kind === 'recognition') {
    return {
      id: `recognition-${index + 1}`,
      kind: 'comparison',
      text: `Recognition correspondence ${entry.receipt.classification} with score ${entry.receipt.metrics?.recognition_score ?? 'unavailable'} and visibility ${entry.receipt.metrics?.visibility_mass ?? 'unavailable'}. Structural closure remains an independent evidence layer.`,
      source_refs,
      confidence: null,
    };
  }
  return {
    id: `residual-${index + 1}`,
    kind: 'residual',
    text: `Admissibility residual ${entry.receipt.classification} in mode ${entry.receipt.mode}. Residual geometry is a derived representation and is not fulfilment.`,
    source_refs,
    confidence: null,
  };
}

export async function createDeepTheoryCandidateFromContinuityEvidence({
  ledger,
  worldId = null,
  subjectId = null,
  generatedAt = new Date().toISOString(),
} = {}) {
  const entries = normaliseContinuityEvidenceLedger(ledger).entries
    .filter((entry) => !worldId || entry.world_id === worldId)
    .filter((entry) => !subjectId || entry.subject_id === subjectId)
    .slice(-24);
  if (!entries.length) throw new Error('CONTINUITY_DEEP_THEORY: at least one continuity evidence receipt is required');

  const createdAt = new Date(generatedAt).toISOString();
  const source_refs = entries.map(sourceRef);
  const core = {
    schema_version: '0.1.0',
    dataset_kind: 'deep_theory',
    parallel_datasets: ['DEEPStory', 'DEEPTime'],
    created_at: createdAt,
    title: `Continuity Evidence Profile · ${subjectId || worldId || 'House'}`,
    summary: 'Reviewable comparison of separately receipted recognition and admissibility evidence. No scalar identity verdict is inferred.',
    domain: 'continuity-evidence',
    theory_kind: 'comparison',
    status: 'candidate',
    source_refs,
    models: [{
      id: 'layered-continuity-profile/v1',
      name: 'Layered continuity evidence profile',
      equation: 'C = {implementation, stored_state, behaviour_voice, relational_invariants, recognition, structural_closure_evidence}; layers remain non-collapsible',
      control_semantics: {
        a: { key: 'a', role: 'evidence-selection', label: 'Receipted evidence slice', source: 'continuity-evidence-ledger', intentional: false },
        b: { key: 'b', role: 'comparison-scope', label: 'World / subject scope', source: 'explicit-query-scope', intentional: true },
      },
      calibration_state: 'model-calibrated',
      calibration_note: 'Operational correspondence and residual geometry only.',
      physical_claim: false,
    }],
    findings: entries.map(finding),
    source_integrity: {
      raw_sources_immutable: true,
      analyses_append_only: true,
      silent_canonicalisation_forbidden: true,
    },
    review: {
      human_review_required: true,
      reviewed_by: null,
      reviewed_at: null,
      note: 'Continuity evidence entered DEEPTheory as a candidate only. Recognition is not identity proof; residual geometry is not fulfilment.',
    },
    authority: {
      physical_claim: false,
      canon_commit: false,
      domain_semantics_explicit: true,
      cross_domain_numeric_equivalence_assumed: false,
    },
    append_only_revisions: [],
  };
  const recordSeed = await sha256Hex(core);
  const record = { ...core, id: `deep-theory-${recordSeed.slice(0, 24)}` };
  assertValidDeepTheoryRecord(record);
  const recordFingerprint = await sha256Hex(record);
  return Object.freeze({
    schema: ARCSWEEP_DEEP_THEORY_CANDIDATE_SCHEMA,
    receipt_id: `arcsweep-theory-${recordFingerprint.slice(0, 24)}`,
    record_fingerprint: recordFingerprint,
    source_sweep_id: null,
    source_sweep_fingerprint: null,
    source_evidence_fingerprints: Object.freeze(entries.map((entry) => entry.receipt.fingerprint)),
    record: Object.freeze(record),
    authority: Object.freeze({
      candidate_only: true,
      human_review_required: true,
      source_evidence_mutable: false,
      canon_commit: false,
      physical_claim: false,
    }),
    created_at: createdAt,
  });
}
