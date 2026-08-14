import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import { auditProvenanceGraph, ARCSWEEP_PROVENANCE_BUNDLE_SCHEMA } from './receipt-provenance-graph.js';

export const ARCSWEEP_RECEIPT_INTEGRITY_SCHEMA = 'arcsweep.receipt-integrity-report/v1';

function cloneWithout(value, keys = []) {
  const copy = structuredClone(value);
  for (const key of keys) delete copy[key];
  return copy;
}

function result(node, status, expected = null, actual = null, reason = '') {
  return Object.freeze({
    id: node.id,
    kind: node.kind,
    status,
    expected_fingerprint: expected,
    actual_fingerprint: actual,
    reason,
  });
}

async function verifyHash(node, expected, hashInput, reason = 'Fingerprint recomputed from the receipted payload.') {
  if (typeof expected !== 'string' || expected.length !== 64) {
    return result(node, 'UNVERIFIABLE', expected ?? null, null, 'Receipt does not expose a 64-character fingerprint for this verifier.');
  }
  const actual = await sha256Hex(hashInput);
  return result(node, actual === expected ? 'VERIFIED' : 'MISMATCH', expected, actual, reason);
}

async function verifyAsk(node) {
  const receipt = node.receipt;
  return verifyHash(node, receipt?.request_fingerprint, cloneWithout(receipt, ['request_id', 'request_fingerprint']));
}

async function verifyResponse(node) {
  const receipt = node.receipt;
  return verifyHash(node, receipt?.response_fingerprint, cloneWithout(receipt, ['response_id', 'response_fingerprint']));
}

async function verifyCircuit(node) {
  const receipt = node.receipt;
  return verifyHash(node, receipt?.circuit_fingerprint, cloneWithout(receipt, ['circuit_id', 'circuit_fingerprint', 'created_at']));
}

async function verifyFeedback(node) {
  const cycle = node.receipt;
  if (!cycle?.cycle_fingerprint || !cycle?.math_spine_packet?.packet_fingerprint) {
    return result(node, 'UNVERIFIABLE', cycle?.cycle_fingerprint ?? null, null, 'Feedback cycle lacks the source fields required to reconstruct its fingerprint input.');
  }
  const input = {
    packet_fingerprint: cycle.math_spine_packet.packet_fingerprint,
    feedback: structuredClone(cycle.turn),
    voice_ids: (cycle.voices || []).map((voice) => voice.id),
    canon_refs: structuredClone(cycle.canon_refs || []),
    voice_invocations: structuredClone(cycle.voice_invocations || []),
    sound_events: structuredClone(cycle.sound_events || []),
    evidence: structuredClone(cycle.evidence || []),
  };
  return verifyHash(node, cycle.cycle_fingerprint, input, 'Feedback fingerprint replayed from Math Spine packet, turn, voices, canon refs, sound events and evidence.');
}

async function verifyBai(node) {
  const receipt = node.receipt;
  const expected = receipt?.receipt_fingerprint;
  if (!node.world_id || !receipt?.state || !receipt?.model || !receipt?.topology || !receipt?.authority) {
    return result(node, 'UNVERIFIABLE', expected ?? null, null, 'Embedded BAI reference lacks the fields required to reconstruct its original core packet.');
  }
  const core = {
    schema: 'arcsweep.bone-ash-intention-topology/v1',
    schema_version: 1,
    world_id: node.world_id,
    bai: structuredClone(receipt.state),
    model: structuredClone(receipt.model),
    topology: structuredClone(receipt.topology),
    authority: structuredClone(receipt.authority),
  };
  return verifyHash(node, expected, core, 'BAI fingerprint replayed from the embedded circuit copy plus its world id.');
}

async function verifyDeepTime(node) {
  const receipt = node.receipt;
  return verifyHash(node, receipt?.record_fingerprint, cloneWithout(receipt, ['id', 'record_fingerprint']));
}

async function verifyDomainSweep(node) {
  const receipt = node.receipt;
  return verifyHash(node, receipt?.sweep_fingerprint, cloneWithout(receipt, ['sweep_id', 'sweep_fingerprint', 'generated_at']));
}

async function verifyTheoryCandidate(node) {
  const receipt = node.receipt;
  if (!receipt?.record || typeof receipt.record_fingerprint !== 'string') {
    return result(node, 'UNVERIFIABLE', receipt?.record_fingerprint ?? null, null, 'DEEPTheory candidate lacks its record or record fingerprint.');
  }
  const actual = await sha256Hex(receipt.record);
  const idMatches = receipt.receipt_id === `arcsweep-theory-${actual.slice(0, 24)}`;
  const matches = actual === receipt.record_fingerprint && idMatches;
  return result(
    node,
    matches ? 'VERIFIED' : 'MISMATCH',
    receipt.record_fingerprint,
    actual,
    idMatches ? 'Candidate record fingerprint and derived receipt id replayed.' : 'Candidate record hash replayed, but the derived receipt id does not match.',
  );
}

async function verifyTheoryReview(node) {
  const receipt = node.receipt;
  return verifyHash(node, receipt?.receipt_fingerprint, cloneWithout(receipt, ['receipt_id', 'receipt_fingerprint']));
}

async function verifyDomainMapping(node) {
  const receipt = node.receipt;
  return verifyHash(node, receipt?.mapping_fingerprint, cloneWithout(receipt, ['mapping_id', 'mapping_fingerprint']));
}

async function verifyAdvisor(node) {
  const receipt = node.receipt;
  return verifyHash(node, receipt?.receipt_fingerprint, cloneWithout(receipt, ['receipt_id', 'receipt_fingerprint']));
}

async function verifyRuna(node) {
  const receipt = node.receipt;
  return verifyHash(node, receipt?.suggestion_fingerprint, cloneWithout(receipt, ['suggestion_id', 'suggestion_fingerprint']));
}

async function verifyRunaRendererCandidate(node) {
  const receipt = node.receipt;
  return verifyHash(node, receipt?.candidate_fingerprint, cloneWithout(receipt, ['candidate_id', 'candidate_fingerprint']));
}

async function verifyRunaRendererReview(node) {
  const receipt = node.receipt;
  return verifyHash(node, receipt?.review_fingerprint, cloneWithout(receipt, ['review_id', 'review_fingerprint']));
}

async function verifyRunaPreviewPlan(node) {
  const receipt = node.receipt;
  return verifyHash(node, receipt?.plan_fingerprint, cloneWithout(receipt, ['plan_id', 'plan_fingerprint']));
}

async function verifyRunaPreviewRender(node) {
  const receipt = node.receipt;
  return verifyHash(node, receipt?.render_fingerprint, cloneWithout(receipt, ['render_id', 'render_fingerprint']));
}

async function verifyRunaPreviewEvidenceArm(node) {
  const receipt = node.receipt;
  return verifyHash(node, receipt?.arm_fingerprint, cloneWithout(receipt, ['arm_id', 'arm_fingerprint']));
}

async function verifyRunaPreviewObservationLink(node) {
  const receipt = node.receipt;
  return verifyHash(node, receipt?.link_fingerprint, cloneWithout(receipt, ['link_id', 'link_fingerprint']));
}

async function verifyProvenanceExport(node) {
  const receipt = node.receipt;
  return verifyHash(node, receipt?.export_receipt_fingerprint, cloneWithout(receipt, ['export_receipt_id', 'export_receipt_fingerprint']));
}

async function verifyPriorIntegrityReport(node) {
  const receipt = node.receipt;
  return verifyHash(node, receipt?.report_fingerprint, cloneWithout(receipt, ['report_id', 'report_fingerprint']));
}

const VERIFIERS = Object.freeze({
  ask: verifyAsk,
  response: verifyResponse,
  circuit: verifyCircuit,
  feedback: verifyFeedback,
  bai: verifyBai,
  deep_time: verifyDeepTime,
  domain_sweep: verifyDomainSweep,
  theory_candidate: verifyTheoryCandidate,
  theory_review: verifyTheoryReview,
  domain_mapping: verifyDomainMapping,
  advisor: verifyAdvisor,
  runa: verifyRuna,
  runa_renderer_candidate: verifyRunaRendererCandidate,
  runa_renderer_review: verifyRunaRendererReview,
  runa_preview_plan: verifyRunaPreviewPlan,
  runa_preview_render: verifyRunaPreviewRender,
  runa_preview_evidence_arm: verifyRunaPreviewEvidenceArm,
  runa_preview_observation_link: verifyRunaPreviewObservationLink,
  provenance_export: verifyProvenanceExport,
  integrity_report: verifyPriorIntegrityReport,
});

export async function verifyProvenanceGraph(graph, { generatedAt } = {}) {
  const structural = auditProvenanceGraph(graph);
  const checks = [];
  for (const node of graph?.nodes || []) {
    const verifier = VERIFIERS[node.kind];
    if (!verifier) {
      checks.push(result(node, 'UNVERIFIABLE', null, null, 'No deterministic fingerprint verifier is registered for this receipt kind.'));
      continue;
    }
    checks.push(await verifier(node));
  }
  const counts = checks.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});
  const status = (counts.MISMATCH || structural.status === 'CONFLICT')
    ? 'FAIL'
    : structural.status === 'INCOMPLETE'
      ? 'INCOMPLETE'
      : 'PASS';
  const core = {
    schema: ARCSWEEP_RECEIPT_INTEGRITY_SCHEMA,
    schema_version: 1,
    generated_at: generatedAt ?? new Date().toISOString(),
    world_id: graph?.world_id ?? null,
    focus_id: graph?.focus_id ?? null,
    status,
    structural,
    source_receipt_ids: Object.freeze((graph?.nodes || []).map((node) => node.id)),
    counts: Object.freeze({
      verified: counts.VERIFIED || 0,
      unverifiable: counts.UNVERIFIABLE || 0,
      mismatch: counts.MISMATCH || 0,
    }),
    checks: Object.freeze(checks),
    authority: Object.freeze({
      deterministic_hash_check_only: true,
      verifies_external_truth: false,
      verifies_physical_claim: false,
      unverified_does_not_mean_false: true,
      mismatch_is_reported_not_repaired: true,
      source_receipts_mutable: false,
      canon_commit: false,
    }),
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    report_id: `arcsweep-integrity-${fingerprint.slice(0, 24)}`,
    report_fingerprint: fingerprint,
  });
}

export async function verifyIntegrityReport(report) {
  if (report?.schema !== ARCSWEEP_RECEIPT_INTEGRITY_SCHEMA) {
    return Object.freeze({ matched: false, reason: 'Unsupported integrity report schema.', expected: report?.report_fingerprint ?? null, actual: null });
  }
  const expected = report.report_fingerprint;
  const actual = await sha256Hex(cloneWithout(report, ['report_id', 'report_fingerprint']));
  return Object.freeze({
    matched: actual === expected,
    expected,
    actual,
    report_id: report.report_id,
    authority: Object.freeze({
      report_integrity_only: true,
      source_receipt_truth_verified: false,
      external_truth_verified: false,
    }),
  });
}

export async function verifyProvenanceBundle(bundle) {
  if (bundle?.schema !== ARCSWEEP_PROVENANCE_BUNDLE_SCHEMA) {
    return Object.freeze({ matched: false, reason: 'Unsupported provenance bundle schema.', expected: bundle?.bundle_fingerprint ?? null, actual: null });
  }
  const expected = bundle.bundle_fingerprint;
  const actual = await sha256Hex(cloneWithout(bundle, ['bundle_id', 'bundle_fingerprint']));
  return Object.freeze({
    matched: actual === expected,
    expected,
    actual,
    bundle_id: bundle.bundle_id,
    authority: Object.freeze({
      bundle_integrity_only: true,
      external_truth_verified: false,
      physical_claim_verified: false,
    }),
  });
}
