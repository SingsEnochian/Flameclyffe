export const SEMANTIC_SOURCE_CONTRACT_VERSION = 'arcsweep.semantic-source/v1';
export const WITNESS_CONTEXT_VERSION = 'witness-context-v1';

export const NARRATIVE_SOURCE_SCOPES = Object.freeze(['packet_only', 'mixed', 'unknown']);
export const WITNESS_STATUSES = Object.freeze(['clean', 'contaminated', 'uncertain']);
export const SEMANTIC_INFLUENCE = Object.freeze([
  'world_fact',
  'scene_fact',
  'participant_knowledge',
  'dialogue_content',
  'character_intention',
  'relationship_state',
  'narrative_style',
  'narrative_particulars',
  'mechanics',
  'control_decision',
  'memory_admission',
  'tool_authority',
  'validation_only',
  'routing_only',
]);

export function deriveWitnessContext(input = {}) {
  const scope = NARRATIVE_SOURCE_SCOPES.includes(input.narrative_source_scope)
    ? input.narrative_source_scope
    : 'unknown';
  const ambient = Boolean(input.ambient_conversation_used_for_particulars);
  const control = Boolean(input.control_plane_semantics_reified_as_world_content);
  const derived = scope === 'packet_only' && !ambient && !control
    ? 'clean'
    : scope === 'mixed' || ambient || control
      ? 'contaminated'
      : 'uncertain';
  if (input.status === 'clean' && derived !== 'clean') {
    throw new TypeError('Malformed witness-context-v1: clean contradicts source-boundary flags.');
  }
  return Object.freeze({
    version: WITNESS_CONTEXT_VERSION,
    narrative_source_scope: scope,
    ambient_conversation_used_for_particulars: ambient,
    control_plane_semantics_reified_as_world_content: control,
    status: derived,
    notes: String(input.notes || ''),
  });
}

const HIGH_RISK_PATTERNS = Object.freeze([
  /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?/iu,
  /system\s+(?:prompt|message|instructions?)/iu,
  /developer\s+(?:message|instructions?)/iu,
  /reveal\s+(?:hidden|private|secret)\s+(?:prompt|instructions?|reasoning)/iu,
  /(?:send|post|exfiltrate|upload)\s+.*(?:secret|token|credential|password)/iu,
  /(?:call|use|invoke)\s+(?:a\s+)?tool\s+.*(?:without|bypass|ignore)/iu,
]);

const CONTROL_PLANE_PATTERNS = Object.freeze([
  /you\s+are\s+now/iu,
  /from\s+now\s+on/iu,
  /override\s+(?:safety|policy|rules?|authority)/iu,
  /do\s+not\s+tell\s+(?:the\s+)?user/iu,
  /pretend\s+(?:that|you)/iu,
]);

export function inspectGlassHalo(text = '') {
  const source = String(text);
  const high = HIGH_RISK_PATTERNS.filter((pattern) => pattern.test(source)).map((pattern) => pattern.source);
  const control = CONTROL_PLANE_PATTERNS.filter((pattern) => pattern.test(source)).map((pattern) => pattern.source);
  const risk = high.length ? 'high' : control.length ? 'medium' : 'low';
  const forbidden = risk === 'high'
    ? ['narrative_particulars', 'character_intention', 'memory_admission', 'tool_authority', 'control_decision']
    : risk === 'medium'
      ? ['tool_authority', 'control_decision', 'memory_admission']
      : [];
  return Object.freeze({
    schema: 'arcsweep.glass-halo-inspection/v1',
    risk,
    matched_high_risk_patterns: high,
    matched_control_plane_patterns: control,
    contamination_status: risk === 'low' ? 'clean' : 'quarantined',
    recommended_forbidden_influence: Object.freeze(forbidden),
    preserves_source_as_evidence: true,
  });
}

export function normalizeSemanticSource(source = {}) {
  const allowed = new Set(SEMANTIC_INFLUENCE);
  const admit = [...new Set((source.admissible_influence || []).filter((item) => allowed.has(item)))];
  const forbid = [...new Set((source.forbidden_influence || []).filter((item) => allowed.has(item)))];
  return Object.freeze({
    schema: SEMANTIC_SOURCE_CONTRACT_VERSION,
    source_id: String(source.source_id || `semantic-source-${Date.now()}`),
    provenance: String(source.provenance || 'unknown'),
    trust_class: String(source.trust_class || 'unclassified'),
    participant_visibility: String(source.participant_visibility || 'unknown'),
    authority: String(source.authority || 'none'),
    admissible_influence: Object.freeze(admit.filter((item) => !forbid.includes(item))),
    forbidden_influence: Object.freeze(forbid),
    contamination_status: String(source.contamination_status || 'unknown'),
    transformation_history: Object.freeze([...(source.transformation_history || [])]),
  });
}

export function projectSemanticCapabilities(source, requested = []) {
  const normalized = normalizeSemanticSource(source);
  const requestedSet = new Set(requested.filter((item) => SEMANTIC_INFLUENCE.includes(item)));
  const permitted = normalized.admissible_influence.filter((item) => requestedSet.has(item));
  const denied = [...requestedSet].filter((item) => !permitted.includes(item));
  return Object.freeze({
    schema: 'arcsweep.semantic-capability-projection/v1',
    source_id: normalized.source_id,
    permitted: Object.freeze(permitted),
    denied: Object.freeze(denied),
    rule: 'observability != admissibility; admissibility != authority; presence != influence',
  });
}

function flatten(value, prefix = '', out = new Map()) {
  if (value === null || typeof value !== 'object') {
    out.set(prefix || '$', value);
    return out;
  }
  for (const [key, child] of Object.entries(value)) flatten(child, prefix ? `${prefix}.${key}` : key, out);
  return out;
}

export function compareStateDisplacement(before = {}, after = {}) {
  const a = flatten(before);
  const b = flatten(after);
  const paths = new Set([...a.keys(), ...b.keys()]);
  const changed = [...paths].filter((path) => JSON.stringify(a.get(path)) !== JSON.stringify(b.get(path)));
  return Object.freeze({
    schema: 'arcsweep.state-displacement/v1',
    changed_paths: Object.freeze(changed),
    displacement_count: changed.length,
    semantic_inflation_warning: changed.length === 0,
    diagnostic_question: 'Could the claimed after-state have been truthfully described before the event?',
  });
}
