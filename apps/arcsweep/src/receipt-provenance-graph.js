import { sha256Hex } from '../../starwell/src/world-tone-fold-approval.js';

export const ARCSWEEP_PROVENANCE_GRAPH_SCHEMA = 'arcsweep.receipt-provenance-graph/v1';
export const ARCSWEEP_PROVENANCE_BUNDLE_SCHEMA = 'arcsweep.receipt-provenance-bundle/v1';

const STAGE = Object.freeze({
  ask: 0,
  circuit: 1,
  cusp: 1,
  bai: 1,
  response: 1,
  feedback: 2,
  feedback_review: 2,
  deep_time: 3,
  domain_sweep: 3,
  theory_candidate: 4,
  theory_review: 4,
  domain_mapping: 4,
  advisor: 5,
  runa: 6,
});

function clone(value) { return value == null ? value : structuredClone(value); }
function nonEmpty(value) { return typeof value === 'string' && value.trim().length > 0; }
function worldMatches(worldId, candidate) { return !worldId || !candidate || candidate === worldId; }

function node(id, kind, label, receipt, extra = {}) {
  if (!nonEmpty(id)) return null;
  return Object.freeze({
    id,
    kind,
    label: nonEmpty(label) ? label : id,
    stage: STAGE[kind] ?? 99,
    receipt: clone(receipt),
    ...extra,
  });
}

function edge(from, to, relation, extra = {}) {
  if (!nonEmpty(from) || !nonEmpty(to)) return null;
  return Object.freeze({ from, to, relation, ...extra });
}

function addNode(nodes, value, collisions) {
  if (!value) return;
  const existing = nodes.get(value.id);
  if (!existing) {
    nodes.set(value.id, value);
    return;
  }
  const sameKind = existing.kind === value.kind;
  const sameReceipt = JSON.stringify(existing.receipt) === JSON.stringify(value.receipt);
  if (!sameKind || !sameReceipt) {
    collisions.push(Object.freeze({
      id: value.id,
      existing_kind: existing.kind,
      incoming_kind: value.kind,
      same_receipt: sameReceipt,
    }));
  }
}

function addEdge(edges, value) {
  if (!value || value.from === value.to) return;
  const key = `${value.from}\u241f${value.to}\u241f${value.relation}`;
  if (!edges.has(key)) edges.set(key, value);
}

function transformationRecords(input, worldId) {
  if (!input || typeof input !== 'object') return [];
  if (input.byWorld && typeof input.byWorld === 'object') {
    if (worldId && input.byWorld[worldId]) return [[worldId, input.byWorld[worldId]]];
    return Object.entries(input.byWorld);
  }
  return worldId ? [[worldId, input]] : [['unknown', input]];
}

function requestLabel(request) {
  return request?.request?.description || request?.description || 'Requested Transformation';
}

function circuitWorld(circuit) { return circuit?.world?.id || null; }

export function buildArcsweepProvenanceGraph({
  worldId = null,
  transformations = null,
  feedbackCycles = [],
  feedbackQueue = null,
  observatory = null,
} = {}) {
  const nodes = new Map();
  const edges = new Map();
  const collisions = [];
  const obs = observatory && typeof observatory === 'object' ? observatory : {};
  const putNode = (value) => addNode(nodes, value, collisions);

  for (const [recordWorldId, record] of transformationRecords(transformations, worldId)) {
    for (const request of record?.requests || []) {
      if (!worldMatches(worldId, request?.world?.id || recordWorldId)) continue;
      putNode(node(request.request_id, 'ask', requestLabel(request), request, {
        world_id: request?.world?.id || recordWorldId,
        timestamp: request.requested_at || null,
      }));
    }

    for (const response of record?.responses || []) {
      if (!worldMatches(worldId, response?.world?.id || recordWorldId)) continue;
      putNode(node(response.response_id, 'response', `Measured Response · ${response.classification?.status || 'observed'}`, response, {
        world_id: response?.world?.id || recordWorldId,
        timestamp: response.observed_at || null,
      }));
      addEdge(edges, edge(response.request_id, response.response_id, 'measured-response'));
    }

    for (const circuit of record?.circuits || []) {
      if (!worldMatches(worldId, circuitWorld(circuit) || recordWorldId)) continue;
      putNode(node(circuit.circuit_id, 'circuit', 'Requested Transformation Circuit', circuit, {
        world_id: circuitWorld(circuit) || recordWorldId,
        timestamp: circuit.created_at || null,
      }));
      addEdge(edges, edge(circuit.request?.request_id, circuit.circuit_id, 'closes-through'));
      addEdge(edges, edge(circuit.circuit_id, circuit.feedback?.cycle_id, 'observed-in'));

      const cuspId = circuit.cusp?.envelope_id || circuit.cusp?.observation_packet?.packet_id || null;
      if (cuspId) {
        putNode(node(cuspId, 'cusp', 'Cusp Observation', circuit.cusp, {
          world_id: circuitWorld(circuit) || recordWorldId,
          timestamp: circuit.created_at || null,
        }));
        addEdge(edges, edge(circuit.circuit_id, cuspId, 'contains-cusp'));
      }

      const baiId = circuit.bai?.receipt_id || null;
      if (baiId) {
        const topology = circuit.bai?.topology?.state || circuit.bai?.topology?.topology_state || 'BAI Topology';
        putNode(node(baiId, 'bai', `BAI · ${topology}`, circuit.bai, {
          world_id: circuitWorld(circuit) || recordWorldId,
          timestamp: circuit.created_at || null,
        }));
        addEdge(edges, edge(circuit.circuit_id, baiId, 'contains-bai'));
        if (cuspId) addEdge(edges, edge(cuspId, baiId, 'resolved-by'));
      }

      const responseId = circuit.measured_response?.response_id || null;
      if (responseId) {
        putNode(node(responseId, 'response', `Measured Response · ${circuit.measured_response?.classification?.status || 'observed'}`, circuit.measured_response, {
          world_id: circuitWorld(circuit) || recordWorldId,
          timestamp: circuit.measured_response?.observed_at || circuit.created_at || null,
        }));
        addEdge(edges, edge(circuit.circuit_id, responseId, 'measures'));
      }
    }
  }

  for (const cycle of feedbackCycles || []) {
    if (!worldMatches(worldId, cycle?.world?.id)) continue;
    putNode(node(cycle.cycle_id, 'feedback', `Feedback · ${cycle.turn?.mode || 'cycle'}`, cycle, {
      world_id: cycle?.world?.id || null,
      timestamp: cycle.created_at || cycle.premaqc_after?.observed_at || null,
    }));
  }

  for (const entry of Object.values(feedbackQueue?.entries || {})) {
    if (!worldMatches(worldId, entry?.world?.id)) continue;
    const reviewId = entry.review_receipt_id || entry.entry_id;
    if (!reviewId) continue;
    putNode(node(reviewId, 'feedback_review', `Feedback Review · ${entry.status || 'pending'}`, entry, {
      world_id: entry?.world?.id || null,
      timestamp: entry.reviewed_at || entry.enqueued_at || null,
    }));
    addEdge(edges, edge(entry.cycle_id, reviewId, 'reviewed-as'));
  }

  for (const record of obs.deep_time_records || []) {
    if (!worldMatches(worldId, record?.world_id)) continue;
    putNode(node(record.id, 'deep_time', `DEEPTime · λ ${record.lambda}`, record, {
      world_id: record.world_id || null,
      timestamp: record.time?.utc || null,
    }));
    addEdge(edges, edge(record.provenance?.observation_run_id, record.id, 'accepted-into-time'));
    addEdge(edges, edge(record.provenance?.feedback_review_receipt_id, record.id, 'authorises'));
    addEdge(edges, edge(record.interval?.previous_record_id, record.id, 'precedes'));
  }

  for (const sweep of obs.sweeps || []) {
    putNode(node(sweep.sweep_id, 'domain_sweep', `Domain Sweep · ${sweep.profile?.name || sweep.profile?.domain || 'normal form'}`, sweep, {
      world_id: null,
      timestamp: sweep.generated_at || null,
    }));
  }

  for (const candidate of obs.theory_candidates || []) {
    const id = candidate.receipt_id || candidate.record?.id;
    putNode(node(id, 'theory_candidate', `DEEPTheory Candidate · ${candidate.record?.title || 'topology model'}`, candidate, {
      world_id: null,
      timestamp: candidate.created_at || candidate.record?.created_at || null,
    }));
    addEdge(edges, edge(candidate.source_sweep_id, id, 'proposes'));
  }

  for (const review of obs.theory_reviews || []) {
    putNode(node(review.receipt_id, 'theory_review', `DEEPTheory Review · ${review.decision || review.reviewed_record?.status || 'reviewed'}`, review, {
      world_id: null,
      timestamp: review.reviewed_at || null,
    }));
    addEdge(edges, edge(review.source_candidate_receipt_id, review.receipt_id, 'reviewed-as'));
  }

  for (const mapping of obs.domain_mappings || []) {
    putNode(node(mapping.mapping_id, 'domain_mapping', `Domain Mapping · ${mapping.from_domain} → ${mapping.to_domain}`, mapping, {
      world_id: null,
      timestamp: mapping.declared_at || null,
    }));
  }

  for (const advisor of obs.advisor_receipts || []) {
    putNode(node(advisor.receipt_id, 'advisor', `Advisor · ${advisor.recommendation?.status || 'receipt'}`, advisor, {
      world_id: null,
      timestamp: advisor.generated_at || null,
    }));
    addEdge(edges, edge(advisor.theory_source?.review_receipt_id, advisor.receipt_id, 'grounds'));
    addEdge(edges, edge(advisor.domain_resolution?.mapping_id, advisor.receipt_id, 'bridges-domain'));
    for (const recordId of advisor.deep_time_window?.record_ids || []) {
      addEdge(edges, edge(recordId, advisor.receipt_id, 'grounds-in-time'));
    }
  }

  for (const suggestion of obs.runa_suggestions || []) {
    putNode(node(suggestion.suggestion_id, 'runa', 'Runa Trajectory Suggestion', suggestion, {
      world_id: suggestion.world_id || null,
      timestamp: suggestion.generated_at || null,
    }));
    addEdge(edges, edge(suggestion.source?.advisor_receipt_id, suggestion.suggestion_id, 'suggests'));
    for (const recordId of suggestion.source?.deep_time_record_ids || []) {
      addEdge(edges, edge(recordId, suggestion.suggestion_id, 'carries-trajectory'));
    }
  }

  const allEdges = [...edges.values()];
  const usableEdges = allEdges.filter((item) => nodes.has(item.from) && nodes.has(item.to));
  const unresolvedEdges = allEdges.filter((item) => !nodes.has(item.from) || !nodes.has(item.to)).map((item) => Object.freeze({
    ...item,
    missing: Object.freeze([
      ...(nodes.has(item.from) ? [] : [item.from]),
      ...(nodes.has(item.to) ? [] : [item.to]),
    ]),
  }));
  const orderedNodes = [...nodes.values()].sort((left, right) => {
    if (left.stage !== right.stage) return left.stage - right.stage;
    const time = String(left.timestamp || '').localeCompare(String(right.timestamp || ''));
    return time || left.id.localeCompare(right.id);
  });

  return Object.freeze({
    schema: ARCSWEEP_PROVENANCE_GRAPH_SCHEMA,
    world_id: worldId,
    nodes: Object.freeze(orderedNodes),
    edges: Object.freeze(usableEdges),
    unresolved_edges: Object.freeze(unresolvedEdges),
    collisions: Object.freeze(collisions),
    summary: Object.freeze({
      node_count: orderedNodes.length,
      edge_count: usableEdges.length,
      unresolved_edge_count: unresolvedEdges.length,
      collision_count: collisions.length,
      by_kind: Object.freeze(orderedNodes.reduce((acc, item) => {
        acc[item.kind] = (acc[item.kind] || 0) + 1;
        return acc;
      }, {})),
    }),
    authority: Object.freeze({
      derived_view_only: true,
      source_receipts_mutable: false,
      missing_links_are_not_invented: true,
      collisions_are_reported_not_silently_resolved: true,
      cross_domain_numeric_equivalence_assumed: false,
      canon_commit: false,
      physical_claim: false,
    }),
  });
}

export function auditProvenanceGraph(graph) {
  const unresolved = graph?.unresolved_edges?.length || 0;
  const collisions = graph?.collisions?.length || 0;
  const status = collisions ? 'CONFLICT' : unresolved ? 'INCOMPLETE' : 'CLEAN';
  return Object.freeze({
    status,
    unresolved_edge_count: unresolved,
    collision_count: collisions,
    complete: unresolved === 0 && collisions === 0,
    authority: Object.freeze({
      audit_is_structural_only: true,
      absence_of_conflict_is_not_external_verification: true,
      physical_claim: false,
      canon_commit: false,
    }),
  });
}

export function connectedProvenanceComponent(graph, rootId) {
  if (!graph?.nodes || !nonEmpty(rootId)) return graph;
  const nodeIds = new Set(graph.nodes.map((item) => item.id));
  if (!nodeIds.has(rootId)) return Object.freeze({ ...graph, nodes: Object.freeze([]), edges: Object.freeze([]), unresolved_edges: Object.freeze([]), focus_id: rootId });
  const adjacency = new Map();
  for (const id of nodeIds) adjacency.set(id, new Set());
  for (const item of graph.edges) {
    adjacency.get(item.from)?.add(item.to);
    adjacency.get(item.to)?.add(item.from);
  }
  const keep = new Set([rootId]);
  const queue = [rootId];
  while (queue.length) {
    const current = queue.shift();
    for (const next of adjacency.get(current) || []) {
      if (keep.has(next)) continue;
      keep.add(next);
      queue.push(next);
    }
  }
  return Object.freeze({
    ...graph,
    focus_id: rootId,
    nodes: Object.freeze(graph.nodes.filter((item) => keep.has(item.id))),
    edges: Object.freeze(graph.edges.filter((item) => keep.has(item.from) && keep.has(item.to))),
    unresolved_edges: Object.freeze((graph.unresolved_edges || []).filter((item) => keep.has(item.from) || keep.has(item.to))),
  });
}

export async function createProvenanceBundle({ graph, focusId = null, generatedAt } = {}) {
  const resolved = focusId ? connectedProvenanceComponent(graph, focusId) : graph;
  const core = {
    schema: ARCSWEEP_PROVENANCE_BUNDLE_SCHEMA,
    schema_version: 1,
    generated_at: generatedAt ?? new Date().toISOString(),
    world_id: resolved.world_id ?? null,
    focus_id: focusId,
    graph: clone(resolved),
    audit: auditProvenanceGraph(resolved),
    source_receipt_ids: resolved.nodes.map((item) => item.id),
    authority: {
      export_is_derived_copy: true,
      source_receipts_mutable: false,
      missing_links_are_not_invented: true,
      structural_audit_is_not_external_verification: true,
      canon_commit: false,
      physical_claim: false,
    },
  };
  const fingerprint = await sha256Hex(core);
  return Object.freeze({
    ...core,
    bundle_id: `arcsweep-provenance-${fingerprint.slice(0, 24)}`,
    bundle_fingerprint: fingerprint,
  });
}
