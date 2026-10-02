export const WONDER_FIELD_SCHEMA = 'arcsweep.wonder-field/v1';
export const WONDER_TRANSDUCTION_SCHEMA = 'arcsweep.wonder-transduction/v1';
export const WONDER_POSSIBILITY_SCHEMA = 'arcsweep.wonder-possibility-set/v1';
export const WONDER_THOUGHT_FIELD_SCHEMA = 'arcsweep.wonder-thought-field/v1';
export const WONDER_CUE_SCHEMA = 'arcsweep.wonder-cue-constellation/v1';
export const WONDER_TEMPORAL_REPLAY_SCHEMA = 'arcsweep.wonder-temporal-replay/v1';
export const WONDER_FIELD_DETECTION_SCHEMA = 'arcsweep.wonder-field-detection/v1';

export const WONDER_FIELD_GUIDE_LAWS = Object.freeze([
  'WONDER FIRST. Preserve the live question before reducing it to the nearest familiar explanation.',
  'Do not silently collapse an unresolved possibility set. Selection requires an explicit reason and alternatives remain inspectable.',
  'Separate source, interaction, signal, representation, interpretation, belief, and action so a rendering is never mistaken for the world it renders.',
  'Treat analogy as a bridge to test, not identity. Structural rhyme may matter without implying shared substance or mechanism.',
  'Ask what possibilities, dimensions, constraints, attractors, boundaries, couplings, and transformations are available.',
  'Medium shapes possibility. Do not model a signal independently of the substrate, interface, or environment through which it propagates.',
  'Continuity may survive a substrate or representation change when relevant structure, relation, and lineage are preserved.',
  'Learning changes future possibilities. Distinguish fast state, adaptive weighting, durable structure, and homeostatic regulation.',
  'Organize without erasing. Apparent noise may be weak signal, contradiction, incubation, intuition, or unfinished structure.',
  'Inference about another interior state remains inference. Observable traces may constrain possibilities; they do not become an oracle of meaning.',
  'Multimodal interfaces are transducers. Visual, spatial, auditory, haptic, symbolic, and textual channels may become synthetic senses when mappings remain inspectable.',
  'Language and framing can change salience, expectation, memory, attention, and action. Do not confuse those effects with proof that words directly rewrite external physics.',
  'Time is part of the state. Preserve sequence, phase, duration, recurrence, and replay rather than flattening events into static snapshots.',
  'Field thinking asks how local state is shaped by surrounding conditions. Controlling conditions is not the same as commanding final form.',
]);

export const WONDER_CLAIM_LANES = Object.freeze({
  observation: Object.freeze({ id: 'observation', authority: 'direct-or-instrumented-observation' }),
  measurement: Object.freeze({ id: 'measurement', authority: 'instrumented-measurement' }),
  'established-science': Object.freeze({ id: 'established-science', authority: 'evidence-synthesis' }),
  'active-research': Object.freeze({ id: 'active-research', authority: 'research-frontier' }),
  inference: Object.freeze({ id: 'inference', authority: 'reasoned-inference' }),
  hypothesis: Object.freeze({ id: 'hypothesis', authority: 'testable-proposal' }),
  'thought-experiment': Object.freeze({ id: 'thought-experiment', authority: 'counterfactual-exploration' }),
  phenomenology: Object.freeze({ id: 'phenomenology', authority: 'first-person-report' }),
  analogy: Object.freeze({ id: 'analogy', authority: 'structural-comparison' }),
  symbolic: Object.freeze({ id: 'symbolic', authority: 'symbolic-meaning' }),
  mythic: Object.freeze({ id: 'mythic', authority: 'mythic-interpretation' }),
  unknown: Object.freeze({ id: 'unknown', authority: 'none' }),
});

function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function clean(value, max = 2400) {
  return String(value ?? '').trim().slice(0, max);
}

function unique(values = [], max = 64) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => clean(value, 320)).filter(Boolean))].slice(0, max);
}

function bounded01(value) {
  if (!Number.isFinite(Number(value))) return null;
  return Math.max(0, Math.min(1, Number(value)));
}

export function wonderClaimLane(id = 'unknown') {
  return WONDER_CLAIM_LANES[id] || WONDER_CLAIM_LANES.unknown;
}

export function createPossibilityField(candidates = [], {
  selectedId = null,
  selectionReason = null,
  context = null,
} = {}) {
  const seen = new Set();
  const normalized = (Array.isArray(candidates) ? candidates : []).map((candidate, index) => {
    const id = clean(candidate?.id || 'possibility:' + (index + 1), 160);
    if (!id || seen.has(id)) throw new Error('Possibility ids must be unique and non-empty.');
    seen.add(id);
    const lane = wonderClaimLane(candidate?.lane || 'hypothesis');
    return Object.freeze({
      id,
      label: clean(candidate?.label || candidate?.summary || id, 320),
      summary: clean(candidate?.summary || candidate?.label || '', 1200),
      lane: lane.id,
      confidence: bounded01(candidate?.confidence),
      evidence_refs: Object.freeze(unique(candidate?.evidence_refs, 32)),
      distinguishing_tests: Object.freeze(unique(candidate?.distinguishing_tests, 32)),
      status: clean(candidate?.status || 'open', 80),
    });
  });
  const chosen = selectedId == null ? null : clean(selectedId, 160);
  if (chosen && !seen.has(chosen)) throw new Error('Selected possibility must exist in the possibility set.');
  return Object.freeze({
    schema: WONDER_POSSIBILITY_SCHEMA,
    status: chosen ? 'selected' : 'unresolved',
    selected_id: chosen,
    selection_reason: chosen ? clean(selectionReason || 'explicit selection', 1200) : null,
    alternatives_preserved: true,
    candidates: Object.freeze(normalized),
    context: context && typeof context === 'object' ? Object.freeze(clone(context)) : null,
  });
}

export function createTransductionTrace({
  source,
  interaction = null,
  signal = null,
  sensor = null,
  representation = null,
  interpretation = null,
  belief = null,
  action = null,
  uncertainty = null,
  provenance = null,
} = {}) {
  if (!clean(source, 1200)) throw new Error('Transduction trace requires a source.');
  const stages = [
    ['source', source],
    ['interaction', interaction],
    ['signal', signal],
    ['sensor', sensor],
    ['representation', representation],
    ['interpretation', interpretation],
    ['belief', belief],
    ['action', action],
  ].filter(([, value]) => value !== null && value !== undefined && clean(typeof value === 'string' ? value : JSON.stringify(value), 4000));
  return Object.freeze({
    schema: WONDER_TRANSDUCTION_SCHEMA,
    stages: Object.freeze(stages.map(([stage, value]) => Object.freeze({ stage, value: clone(value) }))),
    uncertainty: uncertainty == null ? null : clone(uncertainty),
    provenance: provenance && typeof provenance === 'object' ? Object.freeze(clone(provenance)) : null,
    rule: 'source != signal != representation != interpretation',
  });
}

export function createFieldState({
  medium = 'unspecified',
  dimensions = [],
  constraints = [],
  attractors = [],
  boundaries = [],
  couplings = [],
  availableTransformations = [],
  localState = null,
} = {}) {
  return Object.freeze({
    schema: WONDER_FIELD_SCHEMA,
    medium: clean(medium, 320) || 'unspecified',
    dimensions: Object.freeze(unique(dimensions)),
    constraints: Object.freeze(unique(constraints)),
    attractors: Object.freeze(unique(attractors)),
    boundaries: Object.freeze(unique(boundaries)),
    couplings: Object.freeze(unique(couplings)),
    available_transformations: Object.freeze(unique(availableTransformations)),
    local_state: localState == null ? null : clone(localState),
    heuristic: 'control conditions when direct control of final form would erase emergence',
  });
}

export function createThoughtField(items = []) {
  const normalized = (Array.isArray(items) ? items : []).map((item, index) => Object.freeze({
    id: clean(item?.id || 'thought:' + (index + 1), 160),
    text: clean(item?.text || item?.content || item, 2400),
    state: clean(item?.state || 'unresolved', 80),
    salience: bounded01(item?.salience),
    urgency: bounded01(item?.urgency),
    relations: Object.freeze(unique(item?.relations, 32)),
    tags: Object.freeze(unique(item?.tags, 32)),
  })).filter((item) => item.text);
  return Object.freeze({
    schema: WONDER_THOUGHT_FIELD_SCHEMA,
    nodes: Object.freeze(normalized),
    deletion_count: 0,
    preservation_rule: 'categorization and priority views may change; captured thought nodes remain available until explicitly removed',
  });
}

export function createCueConstellation({
  semanticId,
  meaning = '',
  visual = null,
  audio = null,
  haptic = null,
  spatial = null,
  symbolic = null,
  stateLink = null,
} = {}) {
  const id = clean(semanticId, 160);
  if (!id) throw new Error('Cue constellation requires semanticId.');
  return Object.freeze({
    schema: WONDER_CUE_SCHEMA,
    semantic_id: id,
    meaning: clean(meaning, 800),
    channels: Object.freeze({
      visual: visual == null ? null : clone(visual),
      audio: audio == null ? null : clone(audio),
      haptic: haptic == null ? null : clone(haptic),
      spatial: spatial == null ? null : clone(spatial),
      symbolic: symbolic == null ? null : clone(symbolic),
    }),
    state_link: stateLink == null ? null : clone(stateLink),
    mapping_is_meaning: false,
    rule: 'a cue may become a learned retrieval key; the channel mapping remains inspectable and replaceable',
  });
}

export function createTemporalReplay(samples = [], {
  phaseKey = 'phase',
  timeKey = 't',
  source = 'unknown',
} = {}) {
  const normalized = (Array.isArray(samples) ? samples : [])
    .map((sample, index) => ({
      index,
      t: Number(sample?.[timeKey]),
      phase: sample?.[phaseKey] ?? null,
      value: clone(sample?.value ?? sample),
    }))
    .filter((sample) => Number.isFinite(sample.t))
    .sort((a, b) => a.t - b.t);
  return Object.freeze({
    schema: WONDER_TEMPORAL_REPLAY_SCHEMA,
    source: clean(source, 320) || 'unknown',
    samples: Object.freeze(normalized.map(Object.freeze)),
    temporal_order_preserved: true,
    replayable: normalized.length > 0,
    rule: 'state at one instant is not the whole process',
  });
}


export function createFieldDetectionTrace({
  source,
  field,
  predictedBehavior = [],
  detector,
  observations = [],
  inference = null,
  claimLane = 'hypothesis',
  provenance = null,
} = {}) {
  const sourceText = clean(source, 1200);
  const detectorText = clean(detector, 1200);
  if (!sourceText) throw new Error('Field detection trace requires a source.');
  if (!detectorText) throw new Error('Field detection trace requires a detector or detection method.');
  const lane = wonderClaimLane(claimLane);
  return Object.freeze({
    schema: WONDER_FIELD_DETECTION_SCHEMA,
    source: sourceText,
    field: field == null ? null : clone(field),
    predicted_behavior: Object.freeze(unique(predictedBehavior, 32)),
    detector: detectorText,
    observations: Object.freeze(unique(observations, 64)),
    inference: inference == null ? null : clean(inference, 1600),
    claim_lane: lane.id,
    provenance: provenance && typeof provenance === 'object' ? Object.freeze(clone(provenance)) : null,
    direct_visibility_required: false,
    rule: 'hidden != imaginary; detection rests on repeatable effects, measurements, predictions, and provenance',
  });
}
