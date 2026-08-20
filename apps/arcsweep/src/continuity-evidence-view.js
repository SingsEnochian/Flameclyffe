import { CONTINUITY_PROFILE_LAYERS } from './recognition-correspondence.js';
import { buildContinuityEvidenceProvenance } from './continuity-evidence-provenance.js';
import { evidenceForWorld, normaliseContinuityEvidenceLedger } from './continuity-evidence-state.js';

export const CONTINUITY_LAYER_LABELS = Object.freeze({
  implementation: 'Implementation',
  stored_state: 'Stored state',
  behaviour_voice: 'Behaviour / voice',
  relational_invariants: 'Relational invariants',
  recognition: 'Recognition',
  structural_closure_evidence: 'Structural / closure evidence',
});

function clone(value) {
  return structuredClone(value);
}

function latestBySubject(entries) {
  const map = new Map();
  for (const entry of entries) {
    const key = entry.subject_id || entry.receipt?.subject?.id || 'unscoped';
    const previous = map.get(key);
    const currentTime = Date.parse(entry.recorded_at || entry.receipt?.generated_at || 0) || 0;
    const previousTime = Date.parse(previous?.recorded_at || previous?.receipt?.generated_at || 0) || 0;
    if (!previous || currentTime >= previousTime) map.set(key, entry);
  }
  return [...map.values()];
}

function layerRows(receipt) {
  return CONTINUITY_PROFILE_LAYERS.map((key) => {
    const layer = receipt?.continuity_profile?.[key] || null;
    return Object.freeze({
      key,
      label: CONTINUITY_LAYER_LABELS[key],
      available: Boolean(layer),
      score: layer?.score ?? null,
      evidence_ids: Object.freeze([...(layer?.evidence_ids || [])]),
      evidence_class: layer?.evidence_class || null,
      representation_status: layer?.representation_status || null,
    });
  });
}

function residualComponents(receipt) {
  if (receipt?.mode === 'transformation-response') {
    return Object.freeze([
      { label: 'Target deficit', value: receipt.residual?.target_deficit_norm ?? null },
      { label: 'Direction violation', value: receipt.residual?.direction_violation_norm ?? null },
      { label: 'Collateral / normal', value: receipt.residual?.normal_residual_norm ?? null },
      { label: 'Total residual', value: receipt.residual?.total_residual_norm ?? null },
    ]);
  }
  return Object.freeze([
    { label: 'Cusp excess', value: receipt.residual?.vector?.cusp_excess ?? null },
    { label: 'Continuity deficit', value: receipt.residual?.vector?.continuity_deficit ?? null },
    { label: 'Harmonic excess', value: receipt.residual?.vector?.harmonic_excess ?? null },
    { label: 'Residual norm', value: receipt.residual?.residual_norm ?? null },
  ]);
}

export function buildContinuityEvidenceViewModel(ledgerInput, { worldId = null } = {}) {
  const ledger = normaliseContinuityEvidenceLedger(ledgerInput);
  const entries = evidenceForWorld(ledger, worldId);
  const recognitionEntries = entries.filter((entry) => entry.kind === 'recognition');
  const residualEntries = entries.filter((entry) => entry.kind === 'admissibility-residual');
  const provenance = buildContinuityEvidenceProvenance(ledger, { worldId });

  return Object.freeze({
    world_id: worldId,
    summary: Object.freeze({
      evidence_count: entries.length,
      recognition_count: recognitionEntries.length,
      residual_count: residualEntries.length,
      subject_count: new Set(recognitionEntries.map((entry) => entry.subject_id || entry.receipt?.subject?.id).filter(Boolean)).size,
    }),
    recognition: Object.freeze(latestBySubject(recognitionEntries).map((entry) => Object.freeze({
      evidence_id: entry.evidence_id,
      subject_id: entry.subject_id || entry.receipt?.subject?.id || null,
      subject_label: entry.receipt?.subject?.label || entry.subject_id || entry.receipt?.subject?.id || 'Unscoped subject',
      classification: entry.receipt?.classification || 'UNCLASSIFIED',
      recognition_score: entry.receipt?.metrics?.recognition_score ?? null,
      visibility_mass: entry.receipt?.metrics?.visibility_mass ?? null,
      indices: clone(entry.receipt?.indices || {}),
      layers: Object.freeze(layerRows(entry.receipt)),
      fingerprint: entry.receipt?.fingerprint || null,
      recorded_at: entry.recorded_at,
      authority: clone(entry.receipt?.authority || {}),
    }))),
    residuals: Object.freeze(residualEntries.slice(-12).reverse().map((entry) => Object.freeze({
      evidence_id: entry.evidence_id,
      mode: entry.receipt?.mode || 'unknown',
      classification: entry.receipt?.classification || 'UNCLASSIFIED',
      components: residualComponents(entry.receipt),
      origin: clone(entry.origin || {}),
      fingerprint: entry.receipt?.fingerprint || null,
      recorded_at: entry.recorded_at,
      authority: clone(entry.receipt?.authority || {}),
    }))),
    provenance: Object.freeze({
      donor_sources: Object.freeze(provenance.nodes
        .filter((node) => node.kind === 'external-research-source')
        .map((node) => Object.freeze({
          id: node.id,
          title: node.title,
          source_hash: node.source_hash,
          corpus_id: node.corpus_id,
        }))),
      unresolved_external_receipt_edges: provenance.unresolved_external_receipt_edges.length,
    }),
    authority: Object.freeze({
      layered_evidence_is_binary_identity_verdict: false,
      recognition_is_structural_closure: false,
      zero_residual_is_fulfilment: false,
      view_is_derived_only: true,
    }),
  });
}
