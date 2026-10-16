// Foldwatch -> Wayglass boundary. Pure, side-effect-free adapter.
// This module does not write Wayglass memory, canon, or identity state.
export const FOLDWATCH_WAYGLASS_SCHEMA = 'wayglass.foldwatch-handoff/v1';
const STATES = new Set(['CLEAR','APPROACH','FOLD','CROSSING','RELEASE','HYSTERESIS']);
function requireText(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(name + ' is required');
  return value.trim();
}
function safeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
function boundedText(value, max = 2000) { return String(value ?? '').slice(0,max); }
function evidenceRef(item) {
  if (!item || typeof item !== 'object') throw new TypeError('evidence ref must be an object');
  return Object.freeze({
    source_id: requireText(item.source_id, 'source_id'),
    observation_id: requireText(item.observation_id, 'observation_id'),
    provenance: boundedText(item.provenance || 'source observation', 300)
  });
}
export function createWayglassFoldHandoff({
  telemetry, sourceRefs, specialistReports = [], stopReceiptId,
  nextOwner, wonderQuestions = [], alternatives = [], continuationEvidence = []
} = {}) {
  if (!telemetry || typeof telemetry !== 'object' || !STATES.has(telemetry.state))
    throw new TypeError('valid Foldwatch telemetry required');
  if (!Array.isArray(sourceRefs) || !sourceRefs.length)
    throw new TypeError('at least one source observation reference required');
  if (!Array.isArray(specialistReports) || !Array.isArray(wonderQuestions) ||
      !Array.isArray(alternatives) || !Array.isArray(continuationEvidence))
    throw new TypeError('reports, questions, alternatives and continuation evidence must be arrays');
  const reports = specialistReports.map(report => {
    const role = requireText(report.role, 'report.role');
    return Object.freeze({
      role, author_id: requireText(report.author_id, 'report.author_id'),
      text: boundedText(report.text, 8000),
      status: 'interpretation'
    });
  });
  const state = telemetry.state;
  const hasContinuation = continuationEvidence.length > 0;
  // The upstream state remains observable but cannot itself prove a Crossing.
  const crossingStatus = state === 'CROSSING'
    ? (hasContinuation ? 'candidate_requires_review' : 'unsupported')
    : 'not_claimed';
  return Object.freeze({
    schema: FOLDWATCH_WAYGLASS_SCHEMA,
    authority: 'observation_and_derived_telemetry_only',
    source_refs: Object.freeze(sourceRefs.map(evidenceRef)),
    measurement: Object.freeze({
      schema: boundedText(telemetry.schema, 120),
      state,
      sigma_min: safeNumber(telemetry.sigma_min),
      sigma_max: safeNumber(telemetry.sigma_max),
      rank_loss_score: safeNumber(telemetry.rank_loss_score),
      soft_persistence: safeNumber(telemetry.soft_persistence),
      curvature: safeNumber(telemetry.curvature),
      relational_participation: safeNumber(telemetry.relational_participation),
      relational_participation_status: telemetry.relational_participation_status === 'measured' ? 'measured' : 'unavailable',
      branch_id: telemetry.branch_id ?? null
    }),
    crossing: Object.freeze({
      status: crossingStatus,
      continuation_evidence: Object.freeze(continuationEvidence.map(v => boundedText(v, 500)))
    }),
    interpretations: Object.freeze(reports),
    unresolved_alternatives: Object.freeze(alternatives.map(v => boundedText(v, 2000))),
    wonder_questions: Object.freeze(wonderQuestions.map(v => boundedText(v, 1000))),
    return_marker: Object.freeze({
      stop_receipt_id: requireText(stopReceiptId, 'stopReceiptId'),
      next_owner: requireText(nextOwner, 'nextOwner')
    }),
    permissions: Object.freeze({
      read_only: true, canon_write: false, identity_write: false,
      memory_write: false, auto_approve: false
    })
  });
}
export function inspectWayglassFoldHandoff(packet) {
  if (!packet || packet.schema !== FOLDWATCH_WAYGLASS_SCHEMA) throw new TypeError('unsupported handoff');
  if (!packet.source_refs?.length || !packet.return_marker?.stop_receipt_id ||
      !packet.return_marker?.next_owner) throw new TypeError('incomplete continuity handoff');
  if (packet.permissions?.read_only !== true || packet.permissions?.auto_approve !== false)
    throw new TypeError('handoff authority escalation');
  return Object.freeze({
    measurement: packet.measurement,
    crossing: packet.crossing,
    interpretations: packet.interpretations,
    unresolved_alternatives: packet.unresolved_alternatives,
    wonder_questions: packet.wonder_questions,
    return_marker: packet.return_marker,
    source_refs: packet.source_refs
  });
}
