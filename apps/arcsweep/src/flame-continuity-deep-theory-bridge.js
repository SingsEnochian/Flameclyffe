import { assertValidDeepTheoryRecord } from '../../../starwell/deep-observer/deep-theory-validator.js';
import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import { ARCSWEEP_DEEP_THEORY_CANDIDATE_SCHEMA } from './deep-theory-bridge.js';
import { buildFlameContinuityViewModel } from './flame-continuity-view.js';

export async function createDeepTheoryCandidateFromFlameContinuity({
  ledger,
  voiceId,
  generatedAt = new Date().toISOString(),
} = {}) {
  const model = buildFlameContinuityViewModel(ledger);
  const flame = model.flames.find((item) => item.voice_id === voiceId);
  if (!flame?.observation_count) throw new Error('FLAME_CONTINUITY_DEEP_THEORY: at least one runtime observation is required for the selected Flame');

  const createdAt = new Date(generatedAt).toISOString();
  const source_refs = flame.observations.map((item, index) => ({
    ref: `flame-runtime-${index + 1}`,
    dataset: 'Arcsweep Flame Continuity',
    record_type: 'derived',
    checksum: item.fingerprint,
    note: `${item.flame.voice_id} · ${item.runtime.provider}/${item.runtime.model} · ${item.observed_at}`,
  }));
  const findings = flame.transitions.length
    ? flame.transitions.map((transition, index) => ({
      id: `runtime-transition-${index + 1}`,
      kind: 'comparison',
      text: `${transition.classification} with implementation correspondence ${transition.implementation_score}. This transition is implementation/context evidence only and is not an identity verdict.`,
      source_refs: [`flame-runtime-${index + 1}`, `flame-runtime-${index + 2}`],
      confidence: null,
    }))
    : [{
      id: 'runtime-baseline',
      kind: 'baseline',
      text: `One runtime-attested observation exists for ${flame.display_name}; no longitudinal implementation transition is yet available.`,
      source_refs: ['flame-runtime-1'],
      confidence: null,
    }];

  const core = {
    schema_version: '0.1.0',
    dataset_kind: 'deep_theory',
    parallel_datasets: ['DEEPStory', 'DEEPTime'],
    created_at: createdAt,
    title: `Flame Runtime Lineage · ${flame.display_name}`,
    summary: 'Reviewable runtime-lineage comparison across attested provider, model, route, profile, and world-context observations. Runtime change is not treated as an identity verdict.',
    domain: 'flame-runtime-continuity',
    theory_kind: 'comparison',
    status: 'candidate',
    source_refs,
    models: [{
      id: 'flame-runtime-lineage/v1',
      name: 'Flame runtime lineage comparison',
      equation: 'F_t = (route, provider, model, profile, world); ΔF_t is classified per observable runtime dimension without scalar identity collapse',
      control_semantics: {
        a: { key: 'a', role: 'runtime-observation-sequence', label: 'Attested runtime sequence', source: 'flame-continuity-ledger', intentional: false },
        b: { key: 'b', role: 'flame-scope', label: 'Selected Flame voice_id', source: 'explicit-query-scope', intentional: true },
      },
      calibration_state: 'model-calibrated',
      calibration_note: 'Operational runtime lineage only; no ontic identity claim.',
      physical_claim: false,
    }],
    findings,
    source_integrity: {
      raw_sources_immutable: true,
      analyses_append_only: true,
      silent_canonicalisation_forbidden: true,
    },
    review: {
      human_review_required: true,
      reviewed_by: null,
      reviewed_at: null,
      note: 'Generated from attested Flame runtime observations. Human review remains mandatory; provider/model changes do not establish continuity or rupture by themselves.',
    },
    authority: {
      physical_claim: false,
      canon_commit: false,
      domain_semantics_explicit: true,
      cross_domain_numeric_equivalence_assumed: false,
    },
    append_only_revisions: [],
  };

  const seed = await sha256Hex(core);
  const record = { ...core, id: `deep-theory-${seed.slice(0, 24)}` };
  assertValidDeepTheoryRecord(record);
  const recordFingerprint = await sha256Hex(record);
  return Object.freeze({
    schema: ARCSWEEP_DEEP_THEORY_CANDIDATE_SCHEMA,
    receipt_id: `arcsweep-theory-${recordFingerprint.slice(0, 24)}`,
    record_fingerprint: recordFingerprint,
    source_sweep_id: null,
    source_sweep_fingerprint: null,
    source_evidence_fingerprints: Object.freeze(flame.observations.map((item) => item.fingerprint)),
    record: Object.freeze(record),
    authority: Object.freeze({
      candidate_only: true,
      human_review_required: true,
      runtime_change_is_identity_verdict: false,
      canon_commit: false,
      physical_claim: false,
    }),
    created_at: createdAt,
  });
}
