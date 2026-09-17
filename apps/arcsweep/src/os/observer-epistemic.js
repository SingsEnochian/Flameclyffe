import { PREMAQC_TERM, canonicalPremaqcSchema } from '../../../starwell/src/premaqc-contract.js';

function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function firstValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function finiteOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function uniqueStrings(values = []) {
  return [...new Set(values.flatMap((value) => Array.isArray(value) ? value : [value])
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => value.trim()))];
}

function snapshotRaw(snapshot) {
  return asObject(snapshot?.raw);
}

function schemaIdentity(...values) {
  const raw = firstValue(...values);
  return Object.freeze({
    canonical: raw ? canonicalPremaqcSchema(raw) : null,
    raw,
    legacy: Boolean(raw && canonicalPremaqcSchema(raw) !== raw),
  });
}

function normaliseNarrativeNode(item, index, type) {
  const source = typeof item === 'string' ? { text: item } : asObject(item);
  const id = String(firstValue(source.id, source.node_id, source[`${type}_id`], `${type}:${index + 1}`));
  return Object.freeze({
    id,
    type,
    text: firstValue(source.text, source.claim, source.summary, source.description, null),
    status: firstValue(source.status, null),
    epistemic_status: firstValue(source.epistemic_status, source.evidence_status, null),
    source_refs: uniqueStrings([source.source_refs, source.source_ref, source.sources]),
    evidence_refs: uniqueStrings([source.evidence_refs, source.evidence_ref, source.support_refs]),
    relation_refs: uniqueStrings([source.relation_refs, source.relation_ref]),
  });
}

function normaliseNarrativeList(value, type) {
  return asArray(value).map((item, index) => normaliseNarrativeNode(item, index, type));
}

const EDGE_STATUS = new Set(['observed', 'measured', 'calculated', 'inferred', 'hypothesised', 'visualised', 'declared', 'unknown']);

function normaliseEdge(item, index) {
  const source = asObject(item);
  const status = String(firstValue(source.epistemic_status, source.status, 'unknown')).toLowerCase();
  return Object.freeze({
    edge_id: String(firstValue(source.edge_id, source.id, `mechanism-edge:${index + 1}`)),
    from: firstValue(source.from, source.source, source.source_id, null),
    to: firstValue(source.to, source.target, source.target_id, null),
    relation: firstValue(source.relation, source.type, source.label, null),
    epistemic_status: EDGE_STATUS.has(status) ? status : 'unknown',
    evidence_refs: uniqueStrings([source.evidence_refs, source.evidence_ref, source.support_refs]),
    source_refs: uniqueStrings([source.source_refs, source.source_ref]),
  });
}

export function buildObserverSemanticStatus({
  snapshot = null,
  bridgePresent = true,
  schema = null,
  storageKey = null,
  transport = 'same-origin observer bridge',
} = {}) {
  const raw = snapshotRaw(snapshot);
  const hasSnapshot = Boolean(snapshot && typeof snapshot === 'object');
  const sourceSchema = schemaIdentity(snapshot?.schema, raw.schema, schema, null);
  const generatedAt = firstValue(snapshot?.generated_at, snapshot?.generatedAt, raw.generated_at, raw.generatedAt, null);
  const heartbeat = asObject(firstValue(snapshot?.heartbeat, raw.heartbeat, {}));
  const latestNarrative = asObject(firstValue(snapshot?.narrative, snapshot?.narrative_state, raw.narrative, raw.narrative_state, {}));
  const heartbeatId = firstValue(snapshot?.heartbeat_id, raw.heartbeat_id, heartbeat.id, heartbeat.heartbeat_id, null);
  const heartbeatCount = finiteOrNull(firstValue(snapshot?.saved_heartbeat_count, raw.saved_heartbeat_count, raw.heartbeat_count, null));
  const narrativePhase = firstValue(snapshot?.narrative_phase, raw.narrative_phase, latestNarrative.phase, null);
  const npsConnection = firstValue(snapshot?.nps_connection_state, raw.nps_connection_state, latestNarrative.nps_connection_state, null);

  let dataState = 'missing';
  if (hasSnapshot) dataState = sourceSchema.canonical ? 'healthy' : 'degraded';
  const integrationState = !bridgePresent ? 'unavailable' : hasSnapshot ? 'healthy' : 'degraded';

  return Object.freeze({
    schema: 'arcsweep.observer-semantic-status/v1',
    available: Boolean(bridgePresent),
    connected: hasSnapshot,
    source_schema: sourceSchema.canonical,
    storage_key: storageKey || null,
    availability: Object.freeze({
      state: bridgePresent ? 'available' : 'unavailable',
      basis: 'bridge-presence',
    }),
    integration_health: Object.freeze({
      state: integrationState,
      basis: hasSnapshot ? 'readable-observer-snapshot' : bridgePresent ? 'bridge-present-snapshot-missing' : 'bridge-missing',
    }),
    runtime_state: Object.freeze({
      state: 'unknown',
      reason: 'bridge-data-does-not-prove-observer-process-liveness',
    }),
    data_health: Object.freeze({
      state: dataState,
      snapshot_present: hasSnapshot,
      source_schema_present: Boolean(sourceSchema.canonical),
      generated_at: generatedAt,
    }),
    activity: Object.freeze({
      last_observation_at: generatedAt,
      last_heartbeat_id: heartbeatId,
      saved_heartbeat_count: heartbeatCount,
      latest_narrative_phase: narrativePhase,
    }),
    domain_status: Object.freeze({
      premaqc_present: Boolean(snapshot?.field || raw.field || raw.deep || raw.DEEP || raw.state || raw.observer),
      attention_capture: firstValue(snapshot?.attention_capture_state, raw.attention_capture_state, 'unknown'),
      mathematics_inspector: firstValue(snapshot?.mathematics_inspector_state, raw.mathematics_inspector_state, 'unknown'),
      nps_connection: npsConnection || 'unknown',
    }),
    provenance: Object.freeze({
      source: 'observer-bridge',
      transport,
      source_schema: sourceSchema.canonical,
      raw_source_schema: sourceSchema.raw,
      vocabulary: PREMAQC_TERM,
      legacy_schema_accepted: sourceSchema.legacy,
      runtime_inference: false,
      unknowns_preserved: true,
    }),
  });
}

export function buildObserverNarrativeState(snapshot = null) {
  const raw = snapshotRaw(snapshot);
  const narrative = asObject(firstValue(snapshot?.narrative_state, snapshot?.narrative, raw.narrative_state, raw.narrative, {}));
  const claims = normaliseNarrativeList(narrative.claims, 'claim');
  const evidence = normaliseNarrativeList(narrative.evidence, 'evidence');
  const objections = normaliseNarrativeList(narrative.objections, 'objection');
  const risks = normaliseNarrativeList(narrative.risks, 'risk');
  const researchGaps = normaliseNarrativeList(firstValue(narrative.research_gaps, narrative.gaps, []), 'research-gap');
  const mechanismEdges = asArray(firstValue(narrative.mechanism_edges, narrative.mechanisms, [])).map(normaliseEdge);
  const phase = firstValue(snapshot?.narrative_phase, raw.narrative_phase, narrative.phase, null);
  const present = Boolean(phase || claims.length || evidence.length || objections.length || risks.length || researchGaps.length || mechanismEdges.length);
  const sourceSchema = schemaIdentity(snapshot?.schema, raw.schema, null);

  return Object.freeze({
    schema: 'arcsweep.observer-narrative-state/v1',
    status: present ? 'present' : 'absent',
    phase,
    focus: Object.freeze({
      audience: firstValue(narrative.audience, null),
      decision: firstValue(narrative.decision, null),
      thesis: firstValue(narrative.thesis, null),
    }),
    claims,
    evidence,
    objections,
    risks,
    research_gaps: researchGaps,
    mechanism_edges: mechanismEdges,
    provenance: Object.freeze({
      source: 'observer-snapshot',
      source_schema: sourceSchema.canonical,
      raw_source_schema: sourceSchema.raw,
      vocabulary: PREMAQC_TERM,
      legacy_schema_accepted: sourceSchema.legacy,
      interpretation_class: 'narrative-derived',
      canon_promotion: false,
      evidence_promotion: 'explicit-only',
    }),
    boundaries: Object.freeze({
      narrative_is_evidence: false,
      claim_is_fact: false,
      visualisation_is_evidence: false,
      mechanism_edges_require_explicit_status: true,
    }),
  });
}

function entry({ id, kind, epistemicStatus = 'unknown', sourceRef = null, sourceSchema = null, details = null }) {
  return Object.freeze({
    entry_id: id,
    kind,
    epistemic_status: EDGE_STATUS.has(epistemicStatus) ? epistemicStatus : 'unknown',
    source_ref: sourceRef,
    source_schema: sourceSchema,
    details: details ? clone(details) : null,
  });
}

function transformationStatus(operation) {
  if (operation === 'derived-render-channel') return 'calculated';
  if (operation === 'bounded-render-projection') return 'calculated';
  if (operation === 'numeric-coercion') return 'calculated';
  if (operation === 'legacy-charge-to-qualia-render-adapter') return 'calculated';
  if (operation === 'explicit-substitution') return 'declared';
  return 'unknown';
}

export function buildObserverEpistemicLedger({ snapshot = null, deepPayload = null, narrativeState = null } = {}) {
  const narrative = narrativeState || buildObserverNarrativeState(snapshot);
  const entries = [];
  const sourceSchema = schemaIdentity(snapshot?.schema, deepPayload?.provenance?.schema, null);

  if (snapshot && typeof snapshot === 'object') {
    entries.push(entry({
      id: 'observer-source-snapshot',
      kind: 'observation',
      epistemicStatus: 'observed',
      sourceRef: 'observer.snapshot',
      sourceSchema: sourceSchema.canonical,
      details: {
        generated_at: firstValue(snapshot.generated_at, snapshot.generatedAt, null),
        field_present: Boolean(snapshot.field || snapshot.raw?.field || snapshot.raw?.deep || snapshot.raw?.DEEP),
        raw_source_schema: sourceSchema.raw,
        legacy_schema_accepted: sourceSchema.legacy,
        vocabulary: PREMAQC_TERM,
      },
    }));
  }

  if (deepPayload && typeof deepPayload === 'object') {
    entries.push(entry({
      id: 'observer-deep-projection',
      kind: 'measurement',
      epistemicStatus: 'measured',
      sourceRef: 'observer.deep-current',
      sourceSchema: deepPayload.schema || null,
      details: {
        generated_at: deepPayload.generated_at || null,
        transformation_count: asArray(deepPayload.transformation_receipts).length,
      },
    }));
    asArray(deepPayload.transformation_receipts).forEach((receipt, index) => {
      const operation = firstValue(receipt?.operation, 'unknown');
      entries.push(entry({
        id: `observer-transformation:${index + 1}`,
        kind: 'transformation',
        epistemicStatus: transformationStatus(operation),
        sourceRef: 'observer.deep-current',
        sourceSchema: deepPayload.schema || null,
        details: {
          field: firstValue(receipt?.field, null),
          operation,
          reason: firstValue(receipt?.reason, null),
          lossless_source: receipt?.lossless_source === true,
        },
      }));
    });
  }

  for (const evidence of narrative.evidence || []) {
    const status = String(firstValue(evidence.epistemic_status, 'declared')).toLowerCase();
    entries.push(entry({
      id: `narrative-evidence:${evidence.id}`,
      kind: 'evidence',
      epistemicStatus: EDGE_STATUS.has(status) ? status : 'declared',
      sourceRef: evidence.source_refs?.[0] || 'observer.narrative-state',
      sourceSchema: narrative.schema,
      details: { node_id: evidence.id, source_refs: evidence.source_refs, relation_refs: evidence.relation_refs },
    }));
  }

  for (const claim of narrative.claims || []) {
    const status = String(firstValue(claim.epistemic_status, 'declared')).toLowerCase();
    entries.push(entry({
      id: `narrative-claim:${claim.id}`,
      kind: 'claim',
      epistemicStatus: EDGE_STATUS.has(status) ? status : 'declared',
      sourceRef: claim.source_refs?.[0] || 'observer.narrative-state',
      sourceSchema: narrative.schema,
      details: { node_id: claim.id, evidence_refs: claim.evidence_refs, relation_refs: claim.relation_refs },
    }));
  }

  return Object.freeze({
    schema: 'arcsweep.epistemic-ledger/v1',
    vocabulary: PREMAQC_TERM,
    entries,
    mechanism_edges: (narrative.mechanism_edges || []).map((edge) => clone(edge)),
    counts: Object.freeze({
      entries: entries.length,
      mechanism_edges: narrative.mechanism_edges?.length || 0,
      claims: narrative.claims?.length || 0,
      evidence: narrative.evidence?.length || 0,
      transformations: asArray(deepPayload?.transformation_receipts).length,
    }),
    boundaries: Object.freeze({
      narrative_not_automatic_evidence: true,
      claim_not_automatic_fact: true,
      mechanism_edges_must_be_explicit: true,
      visualisation_not_evidence: true,
      transport_ack_not_semantic_acceptance: true,
      unknown_stays_unknown: true,
    }),
  });
}
