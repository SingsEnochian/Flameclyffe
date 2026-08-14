import { buildArcsweepProvenanceGraph } from './receipt-provenance-graph.js';

const EXTENDED_STAGE = Object.freeze({
  runa_renderer_candidate: 7,
  runa_renderer_review: 8,
  runa_preview_plan: 9,
  runa_preview_render: 10,
  runa_preview_evidence_arm: 11,
  runa_preview_observation_link: 12,
  provenance_export: 13,
  integrity_report: 13,
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
    stage: EXTENDED_STAGE[kind] ?? 99,
    receipt: clone(receipt),
    ...extra,
  });
}

function edge(from, to, relation) {
  if (!nonEmpty(from) || !nonEmpty(to) || from === to) return null;
  return Object.freeze({ from, to, relation });
}

function addNode(nodes, incoming, collisions) {
  if (!incoming) return;
  const existing = nodes.get(incoming.id);
  if (!existing) {
    nodes.set(incoming.id, incoming);
    return;
  }
  const sameKind = existing.kind === incoming.kind;
  const sameReceipt = JSON.stringify(existing.receipt) === JSON.stringify(incoming.receipt);
  if (!sameKind || !sameReceipt) {
    collisions.push(Object.freeze({
      id: incoming.id,
      existing_kind: existing.kind,
      incoming_kind: incoming.kind,
      same_receipt: sameReceipt,
    }));
  }
}

function byKind(nodes) {
  return Object.freeze([...nodes.values()].reduce((acc, item) => {
    acc[item.kind] = (acc[item.kind] || 0) + 1;
    return acc;
  }, {}));
}

/**
 * Extends the core receipt graph with receipts downstream of Runa and with
 * audit/export receipts about the chain itself. The feedback loop is allowed to
 * curve back toward Feedback after a preview render; the graph is provenance,
 * not a promise that every edge is a left-to-right DAG.
 */
export function buildExtendedArcsweepProvenanceGraph(input = {}) {
  const base = buildArcsweepProvenanceGraph(input);
  const worldId = input.worldId ?? base.world_id ?? null;
  const obs = input.observatory && typeof input.observatory === 'object' ? input.observatory : {};
  const nodes = new Map(base.nodes.map((item) => [item.id, item]));
  const collisions = [...(base.collisions || [])];
  const rawEdges = [
    ...base.edges.map((item) => ({ from: item.from, to: item.to, relation: item.relation })),
    ...(base.unresolved_edges || []).map((item) => ({ from: item.from, to: item.to, relation: item.relation })),
  ];

  for (const candidate of obs.runa_renderer_candidates || []) {
    if (!worldMatches(worldId, candidate?.world_id)) continue;
    addNode(nodes, node(
      candidate.candidate_id,
      'runa_renderer_candidate',
      `Runa Renderer Candidate · ${candidate.status || 'candidate'}`,
      candidate,
      { world_id: candidate.world_id || null, timestamp: candidate.generated_at || null },
    ), collisions);
    const relation = edge(candidate.source?.suggestion_id, candidate.candidate_id, 'compiles-to-candidate');
    if (relation) rawEdges.push(relation);
  }

  for (const review of obs.runa_renderer_reviews || []) {
    if (!worldMatches(worldId, review?.source?.world_id)) continue;
    addNode(nodes, node(
      review.review_id,
      'runa_renderer_review',
      `Runa Renderer Review · ${review.decision || 'reviewed'}`,
      review,
      { world_id: review.source?.world_id || null, timestamp: review.reviewed_at || null },
    ), collisions);
    const relation = edge(review.source?.candidate_id, review.review_id, 'reviewed-renderer-as');
    if (relation) rawEdges.push(relation);
  }

  for (const plan of obs.runa_preview_plans || []) {
    if (!worldMatches(worldId, plan?.world?.id)) continue;
    addNode(nodes, node(
      plan.plan_id,
      'runa_preview_plan',
      'Runa Preview Plan · explicit launch required',
      plan,
      { world_id: plan.world?.id || null, timestamp: plan.generated_at || null },
    ), collisions);
    const relation = edge(plan.source?.renderer_review_id, plan.plan_id, 'compiles-preview-plan');
    if (relation) rawEdges.push(relation);
  }

  for (const render of obs.runa_preview_renders || []) {
    if (!worldMatches(worldId, render?.world_id)) continue;
    addNode(nodes, node(
      render.render_id,
      'runa_preview_render',
      'Runa Preview Render · explicit launch',
      render,
      { world_id: render.world_id || null, timestamp: render.launched_at || null },
    ), collisions);
    const relation = edge(render.source?.plan_id, render.render_id, 'launched-as-preview');
    if (relation) rawEdges.push(relation);
  }

  for (const arm of obs.runa_preview_evidence_arms || []) {
    if (!worldMatches(worldId, arm?.world_id)) continue;
    addNode(nodes, node(
      arm.arm_id,
      'runa_preview_evidence_arm',
      'Runa Preview Evidence Arm · next Feedback cycle',
      arm,
      { world_id: arm.world_id || null, timestamp: arm.armed_at || null },
    ), collisions);
    const relation = edge(arm.source?.render_id, arm.arm_id, 'armed-for-observation');
    if (relation) rawEdges.push(relation);
  }

  for (const link of obs.runa_preview_observation_links || []) {
    if (!worldMatches(worldId, link?.world_id)) continue;
    addNode(nodes, node(
      link.link_id,
      'runa_preview_observation_link',
      'Runa Preview → Feedback Observation',
      link,
      { world_id: link.world_id || null, timestamp: link.linked_at || null },
    ), collisions);
    const armRelation = edge(link.source?.arm_id, link.link_id, 'applies-to-next-observation');
    const cycleRelation = edge(link.source?.feedback_cycle_id, link.link_id, 'observed-after-preview');
    if (armRelation) rawEdges.push(armRelation);
    if (cycleRelation) rawEdges.push(cycleRelation);
  }

  for (const exportReceipt of obs.provenance_exports || []) {
    if (!worldMatches(worldId, exportReceipt?.world_id)) continue;
    addNode(nodes, node(
      exportReceipt.export_receipt_id,
      'provenance_export',
      `Provenance Export · ${exportReceipt.bundle?.audit_status || 'receipt'}`,
      exportReceipt,
      { world_id: exportReceipt.world_id || null, timestamp: exportReceipt.exported_at || null },
    ), collisions);
    const relation = edge(exportReceipt.focus_id, exportReceipt.export_receipt_id, 'exported-as');
    if (relation) rawEdges.push(relation);
  }

  for (const integrity of obs.integrity_reports || []) {
    if (!worldMatches(worldId, integrity?.world_id)) continue;
    addNode(nodes, node(
      integrity.report_id,
      'integrity_report',
      `Receipt Integrity · ${integrity.status || 'report'}`,
      integrity,
      { world_id: integrity.world_id || null, timestamp: integrity.generated_at || null },
    ), collisions);
    const relation = edge(integrity.focus_id, integrity.report_id, 'integrity-checked-by');
    if (relation) rawEdges.push(relation);
  }

  const edgeMap = new Map();
  for (const item of rawEdges) {
    if (!item) continue;
    edgeMap.set(`${item.from}\u241f${item.to}\u241f${item.relation}`, Object.freeze(item));
  }
  const edges = [];
  const unresolved = [];
  for (const item of edgeMap.values()) {
    const missing = [
      ...(nodes.has(item.from) ? [] : [item.from]),
      ...(nodes.has(item.to) ? [] : [item.to]),
    ];
    if (missing.length) unresolved.push(Object.freeze({ ...item, missing: Object.freeze(missing) }));
    else edges.push(item);
  }

  const orderedNodes = [...nodes.values()].sort((left, right) => {
    if (left.stage !== right.stage) return left.stage - right.stage;
    const time = String(left.timestamp || '').localeCompare(String(right.timestamp || ''));
    return time || left.id.localeCompare(right.id);
  });

  return Object.freeze({
    ...base,
    nodes: Object.freeze(orderedNodes),
    edges: Object.freeze(edges),
    unresolved_edges: Object.freeze(unresolved),
    collisions: Object.freeze(collisions),
    summary: Object.freeze({
      ...base.summary,
      node_count: orderedNodes.length,
      edge_count: edges.length,
      unresolved_edge_count: unresolved.length,
      collision_count: collisions.length,
      by_kind: byKind(nodes),
    }),
    authority: Object.freeze({
      ...base.authority,
      downstream_renderer_receipts_included: true,
      preview_intervention_receipts_included: true,
      feedback_loop_may_be_cyclic: true,
      observation_links_are_context_not_causation_claims: true,
      audit_and_export_receipts_included_without_source_mutation: true,
    }),
  });
}
