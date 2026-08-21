import { normaliseContinuityEvidenceLedger } from './continuity-evidence-state.js';

export const CONTINUITY_EVIDENCE_PROVENANCE_SCHEMA = 'arcsweep.continuity-evidence-provenance/v1';

function clone(value) {
  return structuredClone(value);
}

function sourceId(source) {
  return source?.source_id || (source?.source_hash ? `sha256:${source.source_hash}` : null);
}

function sourceNodes(receipt) {
  const donor = receipt?.provenance?.implementation_donor;
  const donors = receipt?.provenance?.implementation_donors;
  const list = donor ? [donor] : Array.isArray(donors) ? donors : [];
  return list.map((source) => ({
    id: sourceId(source),
    kind: 'external-research-source',
    title: source.title || sourceId(source),
    corpus_id: source.corpus_id || receipt?.provenance?.corpus_id || 'bseng-rse',
    source_hash: source.source_hash || null,
    relation: source.relation || 'implementation-donor',
  })).filter((item) => item.id);
}

function explicitSourceReceiptIds(receipt) {
  const ids = new Set();
  for (const anchor of receipt?.anchors || []) {
    for (const id of anchor?.source_receipt_ids || []) if (id) ids.add(String(id));
  }
  for (const item of receipt?.adjacency || []) {
    for (const id of item?.source_receipt_ids || []) if (id) ids.add(String(id));
  }
  const source = receipt?.source || {};
  for (const key of ['request_id', 'response_id', 'response_receipt_id']) {
    if (source[key]) ids.add(String(source[key]));
  }
  return [...ids];
}

export function buildContinuityEvidenceProvenance(ledgerInput, { worldId = null } = {}) {
  const ledger = normaliseContinuityEvidenceLedger(ledgerInput);
  const entries = ledger.entries.filter((entry) => !worldId || entry.world_id === worldId);
  const nodes = new Map();
  const edges = new Map();
  const unresolved = new Map();

  const putNode = (value) => {
    if (value?.id && !nodes.has(value.id)) nodes.set(value.id, Object.freeze(clone(value)));
  };
  const putEdge = (from, to, relation, extra = {}) => {
    if (!from || !to || from === to) return;
    const value = Object.freeze({ from, to, relation, ...extra });
    const key = `${from}\u241f${to}\u241f${relation}`;
    if (!edges.has(key)) edges.set(key, value);
  };

  for (const entry of entries) {
    const receipt = entry.receipt;
    putNode({
      id: entry.evidence_id,
      kind: entry.kind,
      world_id: entry.world_id,
      subject_id: entry.subject_id,
      label: entry.kind === 'recognition'
        ? `Recognition · ${receipt.classification}`
        : `Residual · ${receipt.classification}`,
      fingerprint: receipt.fingerprint,
      recorded_at: entry.recorded_at,
      origin: entry.origin,
    });

    for (const source of sourceNodes(receipt)) {
      putNode(source);
      putEdge(source.id, entry.evidence_id, source.relation || 'implementation-donor', {
        source_hash: source.source_hash,
      });
    }

    for (const sourceReceiptId of explicitSourceReceiptIds(receipt)) {
      const key = `${sourceReceiptId}\u241f${entry.evidence_id}`;
      unresolved.set(key, Object.freeze({
        from: sourceReceiptId,
        to: entry.evidence_id,
        relation: 'explicit-source-receipt',
        reason: 'source receipt lives in another Hearthfire ledger',
      }));
    }
  }

  return Object.freeze({
    schema: CONTINUITY_EVIDENCE_PROVENANCE_SCHEMA,
    schema_version: 1,
    world_id: worldId,
    nodes: Object.freeze([...nodes.values()]),
    edges: Object.freeze([...edges.values()]),
    unresolved_external_receipt_edges: Object.freeze([...unresolved.values()]),
    authority: Object.freeze({
      derived_view_only: true,
      implementation_donor_is_not_project_canon: true,
      source_hash_is_provenance_not_validation: true,
      unresolved_cross_ledger_links_are_not_invented: true,
      recognition_is_identity_proof: false,
      residual_is_fulfilment: false,
      canon_commit: false,
    }),
  });
}
