import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';
import { ARCSWEEP_PROVENANCE_BUNDLE_SCHEMA } from './receipt-provenance-graph.js';

export const ARCSWEEP_PROVENANCE_EXPORT_RECEIPT_SCHEMA = 'arcsweep.receipt-provenance-export/v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`ARCSWEEP_PROVENANCE_EXPORT: ${message}`);
}

export async function createProvenanceExportReceipt({
  bundle,
  exportedBy = 'Rowan',
  exportFormat = 'json',
  exportedAt,
} = {}) {
  invariant(bundle?.schema === ARCSWEEP_PROVENANCE_BUNDLE_SCHEMA, 'a provenance bundle is required');
  invariant(typeof bundle.bundle_id === 'string' && bundle.bundle_id, 'bundle id is required');
  invariant(typeof bundle.bundle_fingerprint === 'string' && bundle.bundle_fingerprint.length === 64, 'bundle fingerprint is required');
  const actor = String(exportedBy || '').trim();
  invariant(actor, 'exportedBy is required');
  invariant(exportFormat === 'json', 'only the JSON provenance bundle format is currently receipted');
  const timestamp = exportedAt ?? new Date().toISOString();
  const core = {
    schema: ARCSWEEP_PROVENANCE_EXPORT_RECEIPT_SCHEMA,
    schema_version: 1,
    exported_at: timestamp,
    exported_by: actor,
    export_format: exportFormat,
    world_id: bundle.world_id ?? null,
    focus_id: bundle.focus_id ?? null,
    bundle: {
      bundle_id: bundle.bundle_id,
      bundle_fingerprint: bundle.bundle_fingerprint,
      source_receipt_ids: structuredClone(bundle.source_receipt_ids || []),
      node_count: bundle.graph?.nodes?.length || 0,
      edge_count: bundle.graph?.edges?.length || 0,
      audit_status: bundle.audit?.status || null,
      unresolved_edge_count: bundle.audit?.unresolved_edge_count || 0,
      collision_count: bundle.audit?.collision_count || 0,
    },
    authority: {
      metadata_receipt_only: true,
      full_bundle_is_external_export: true,
      source_receipts_mutable: false,
      export_does_not_accept_theory: true,
      export_does_not_commit_canon: true,
      external_truth_verified: false,
      physical_claim: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    export_receipt_id: `arcsweep-provenance-export-${fingerprint.slice(0, 24)}`,
    export_receipt_fingerprint: fingerprint,
  });
}

export async function verifyProvenanceExportReceipt(receipt) {
  invariant(receipt?.schema === ARCSWEEP_PROVENANCE_EXPORT_RECEIPT_SCHEMA, 'a provenance export receipt is required');
  const core = structuredClone(receipt);
  delete core.export_receipt_id;
  delete core.export_receipt_fingerprint;
  const actual = await sha256Hex(core);
  return Object.freeze({
    matched: actual === receipt.export_receipt_fingerprint,
    expected: receipt.export_receipt_fingerprint,
    actual,
    export_receipt_id: receipt.export_receipt_id,
    authority: {
      export_metadata_integrity_only: true,
      external_truth_verified: false,
      physical_claim_verified: false,
    },
  });
}
