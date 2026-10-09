export const COGNITIVE_FIELD_SCHEMA = 'hearthweave.cognitive-field/v0.1';
export const COGNITIVE_FIELD_RECEIPT_SCHEMA = 'hearthweave.cognitive-field-receipt/v0.1';
export const COGNITIVE_FIELD_SUMMARY_SCHEMA = 'hearthweave.cognitive-field-summary/v0.1';

const STOPWORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'into', 'your', 'you', 'are', 'was', 'were',
  'have', 'has', 'had', 'not', 'but', 'can', 'could', 'would', 'should', 'will', 'just', 'than', 'then',
  'they', 'them', 'their', 'there', 'here', 'what', 'when', 'where', 'which', 'while', 'about', 'through',
]);

export const DEFAULT_FIELD_CONFIG = Object.freeze({
  dimensions: 8,
  decay: 0.82,
  noveltyDecay: 0.72,
  persistenceCarry: 0.84,
  propagationRate: 0.28,
  inhibitionRate: 0.22,
  edgeLearningRate: 0.18,
  edgeDecay: 0.985,
  maxConceptsPerSignal: 8,
  maxNodes: 72,
  maxTrajectory: 12,
  dominantCount: 3,
  secondaryCount: 3,
  precision: 6,
});

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : 0));
}

function q(value, precision = DEFAULT_FIELD_CONFIG.precision) {
  const scale = 10 ** precision;
  return Math.round((Number.isFinite(value) ? value : 0) * scale) / scale;
}

function stableObject(value) {
  if (Array.isArray(value)) return value.map(stableObject);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, stableObject(value[key])]),
  );
}

export function stableSerialise(value) {
  return JSON.stringify(stableObject(value));
}

// FNV-1a is used only as a deterministic replay fingerprint, not as a security primitive.
export function fieldFingerprint(value) {
  const text = typeof value === 'string' ? value : stableSerialise(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function tokenise(value, limit = DEFAULT_FIELD_CONFIG.maxConceptsPerSignal) {
  const text = String(value || '').toLowerCase();
  const matches = text.match(/[\p{L}\p{N}][\p{L}\p{N}_-]{2,}/gu) || [];
  const seen = new Set();
  const output = [];
  for (const token of matches) {
    if (STOPWORDS.has(token) || seen.has(token)) continue;
    seen.add(token);
    output.push(token);
    if (output.length >= limit) break;
  }
  return output;
}

function coordinateFor(concept, dimensions, precision) {
  const vector = [];
  for (let index = 0; index < dimensions; index += 1) {
    const raw = Number.parseInt(fieldFingerprint(`${index}:${concept}`), 16) / 0xffffffff;
    vector.push((raw * 2) - 1);
  }
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + (value * value), 0)) || 1;
  return Object.freeze(vector.map((value) => q(value / magnitude, precision)));
}

function cosine(left = [], right = []) {
  const length = Math.min(left.length, right.length);
  let dot = 0;
  let lm = 0;
  let rm = 0;
  for (let index = 0; index < length; index += 1) {
    dot += left[index] * right[index];
    lm += left[index] * left[index];
    rm += right[index] * right[index];
  }
  if (!lm || !rm) return 0;
  return clamp(dot / Math.sqrt(lm * rm), -1, 1);
}

function canonicalSignal({ source, weight = 1, concepts = [] } = {}, config = DEFAULT_FIELD_CONFIG) {
  const unique = [...new Set((concepts || []).map((entry) => String(entry).toLowerCase()).filter(Boolean))]
    .sort()
    .slice(0, config.maxConceptsPerSignal);
  if (!unique.length) return null;
  return Object.freeze({ source: String(source || 'unknown'), weight: q(clamp(weight), config.precision), concepts: Object.freeze(unique) });
}

function valueText(entry) {
  if (typeof entry === 'string') return entry;
  if (!entry || typeof entry !== 'object') return '';
  return [entry.ref, entry.title, entry.summary, entry.text, entry.content]
    .filter((value) => typeof value === 'string' && value)
    .join(' ');
}

export function compileFieldSignals({
  symbolicState = null,
  continuitySlice = [],
  recentEvents = [],
  config = DEFAULT_FIELD_CONFIG,
} = {}) {
  const raw = [];
  const add = (source, weight, concepts) => {
    const signal = canonicalSignal({ source, weight, concepts }, config);
    if (signal) raw.push(signal);
  };

  for (const glyph of symbolicState?.activeGlyphs || []) add(`glyph:${glyph}`, 0.9, [glyph]);
  for (const tag of symbolicState?.attentionTags || []) add(`attention:${tag}`, 0.86, tokenise(tag, config.maxConceptsPerSignal));
  for (const tag of symbolicState?.retrievalTags || []) add(`retrieval:${tag}`, 0.68, tokenise(tag, config.maxConceptsPerSignal));
  for (const hint of symbolicState?.routeHints || []) add(`route:${hint}`, 0.62, tokenise(hint, config.maxConceptsPerSignal));

  for (const entry of continuitySlice || []) {
    const text = valueText(entry);
    add(`continuity:${entry?.ref || fieldFingerprint(text)}`, 0.55, tokenise(text, config.maxConceptsPerSignal));
  }
  for (let index = 0; index < (recentEvents || []).length; index += 1) {
    add(`event:${index}`, 1, tokenise(valueText(recentEvents[index]), config.maxConceptsPerSignal));
  }

  return Object.freeze(raw.sort((a, b) => a.source.localeCompare(b.source)));
}

function freezeNode(node) {
  return Object.freeze({
    id: node.id,
    coordinates: Object.freeze([...(node.coordinates || [])]),
    activation: node.activation,
    salience: node.salience,
    novelty: node.novelty,
    persistence: node.persistence,
    tension: node.tension,
    stability: node.stability,
  });
}

function freezeEdge(edge) {
  return Object.freeze({ ...edge });
}

export function createCognitiveFieldState({ fieldId = 'anonymous-field', tick = 0, nodes = [], edges = [], trajectory = [] } = {}) {
  return Object.freeze({
    schema: COGNITIVE_FIELD_SCHEMA,
    fieldId,
    tick,
    nodes: Object.freeze([...nodes].map(freezeNode).sort((a, b) => a.id.localeCompare(b.id))),
    edges: Object.freeze([...edges].map(freezeEdge).sort((a, b) => a.id.localeCompare(b.id))),
    trajectory: Object.freeze([...trajectory]),
    grantsAuthority: false,
  });
}

function edgeId(left, right) {
  return left < right ? `${left}::${right}` : `${right}::${left}`;
}

function rankNodes(nodes) {
  return [...nodes].sort((a, b) =>
    (b.attractorScore - a.attractorScore) ||
    (b.salience - a.salience) ||
    a.id.localeCompare(b.id));
}

function publicPattern(node, precision) {
  return Object.freeze({
    concept: node.id,
    score: q(node.attractorScore, precision),
    activation: q(node.activation, precision),
    salience: q(node.salience, precision),
    persistence: q(node.persistence, precision),
  });
}

function summarise({ state, scoredNodes, edges, config }) {
  const ranked = rankNodes(scoredNodes);
  const dominant = ranked.slice(0, config.dominantCount);
  const secondary = ranked.slice(config.dominantCount, config.dominantCount + config.secondaryCount);
  const tensions = [...scoredNodes]
    .filter((node) => node.tension > 0.05)
    .sort((a, b) => (b.tension - a.tension) || a.id.localeCompare(b.id))
    .slice(0, 3)
    .map((node) => Object.freeze({ concept: node.id, tension: q(node.tension, config.precision) }));
  const novelAssociations = [...edges]
    .filter((edge) => edge.touched && edge.weight >= 0.15)
    .sort((a, b) => (b.weight - a.weight) || a.id.localeCompare(b.id))
    .slice(0, 4)
    .map((edge) => Object.freeze({ concepts: Object.freeze([edge.a, edge.b]), affinity: q(edge.affinity, config.precision), weight: q(edge.weight, config.precision) }));
  const top = dominant.length ? dominant : ranked.slice(0, 1);
  const salience = top.length ? top.reduce((sum, node) => sum + node.salience, 0) / top.length : 0;
  const stability = top.length ? top.reduce((sum, node) => sum + node.stability, 0) / top.length : 1;

  return Object.freeze({
    schema: COGNITIVE_FIELD_SUMMARY_SCHEMA,
    fieldId: state.fieldId,
    tick: state.tick,
    dominantPatterns: Object.freeze(dominant.map((node) => publicPattern(node, config.precision))),
    secondaryPatterns: Object.freeze(secondary.map((node) => publicPattern(node, config.precision))),
    tensions: Object.freeze(tensions),
    novelAssociations: Object.freeze(novelAssociations),
    salience: q(salience, config.precision),
    stability: q(stability, config.precision),
    trajectory: Object.freeze([...state.trajectory]),
    grantsAuthority: false,
  });
}

function normaliseConfig(config = {}) {
  const merged = { ...DEFAULT_FIELD_CONFIG, ...(config || {}) };
  return Object.freeze(merged);
}

export function stepCognitiveField({
  state = createCognitiveFieldState(),
  symbolicState = null,
  continuitySlice = [],
  recentEvents = [],
  replaySignals = null,
  config = DEFAULT_FIELD_CONFIG,
} = {}) {
  const cfg = normaliseConfig(config);
  if (state?.grantsAuthority === true) throw new Error('Cognitive field state may not grant authority.');
  if (symbolicState?.grantsAuthority === true) throw new Error('Symbolic state may not grant authority through the cognitive field.');

  const signals = replaySignals
    ? Object.freeze([...replaySignals].map((signal) => canonicalSignal(signal, cfg)).filter(Boolean).sort((a, b) => a.source.localeCompare(b.source)))
    : compileFieldSignals({ symbolicState, continuitySlice, recentEvents, config: cfg });

  const beforeFingerprint = fieldFingerprint(state);
  const nodes = new Map((state.nodes || []).map((node) => [node.id, { ...node, coordinates: [...node.coordinates] }]));
  const edges = new Map((state.edges || []).map((edge) => [edge.id, { ...edge, touched: false }]));
  const injections = new Map();
  const newlySeen = new Set();

  for (const signal of signals) {
    for (const concept of signal.concepts) {
      if (!nodes.has(concept)) {
        newlySeen.add(concept);
        nodes.set(concept, {
          id: concept,
          coordinates: coordinateFor(concept, cfg.dimensions, cfg.precision),
          activation: 0,
          salience: 0,
          novelty: 1,
          persistence: 0,
          tension: 0,
          stability: 1,
        });
      }
      injections.set(concept, q((injections.get(concept) || 0) + signal.weight, cfg.precision));
    }

    for (let left = 0; left < signal.concepts.length; left += 1) {
      for (let right = left + 1; right < signal.concepts.length; right += 1) {
        const a = signal.concepts[left];
        const b = signal.concepts[right];
        const id = edgeId(a, b);
        const existing = edges.get(id);
        const affinity = cosine(nodes.get(a).coordinates, nodes.get(b).coordinates);
        const learned = clamp((existing?.weight || 0) * cfg.edgeDecay + (signal.weight * cfg.edgeLearningRate));
        edges.set(id, { id, a: a < b ? a : b, b: a < b ? b : a, affinity: q(affinity, cfg.precision), weight: q(learned, cfg.precision), touched: true });
      }
    }
  }

  const previousActivation = new Map([...nodes].map(([id, node]) => [id, node.activation || 0]));
  const positive = new Map();
  const negative = new Map();
  for (const edge of edges.values()) {
    const aEnergy = previousActivation.get(edge.a) || 0;
    const bEnergy = previousActivation.get(edge.b) || 0;
    const influenceA = bEnergy * edge.weight * edge.affinity;
    const influenceB = aEnergy * edge.weight * edge.affinity;
    const addInfluence = (target, value) => {
      const map = value >= 0 ? positive : negative;
      map.set(target, (map.get(target) || 0) + Math.abs(value));
    };
    addInfluence(edge.a, influenceA);
    addInfluence(edge.b, influenceB);
  }

  const scored = [];
  for (const [id, node] of nodes) {
    const oldActivation = previousActivation.get(id) || 0;
    const injection = clamp(injections.get(id) || 0);
    const pos = positive.get(id) || 0;
    const neg = negative.get(id) || 0;
    const activation = clamp(
      (oldActivation * cfg.decay) +
      (injection * (1 - oldActivation)) +
      (pos * cfg.propagationRate) -
      (neg * cfg.inhibitionRate),
    );
    const novelty = newlySeen.has(id) ? 1 : clamp((node.novelty || 0) * cfg.noveltyDecay);
    const persistence = clamp(((node.persistence || 0) * cfg.persistenceCarry) + (activation * (1 - cfg.persistenceCarry)));
    const tension = clamp(neg + Math.max(0, injection - pos) * 0.08);
    const stability = clamp(1 - Math.abs(activation - oldActivation));
    const salience = clamp((activation * 0.45) + (novelty * 0.2) + (tension * 0.2) + (persistence * 0.15));
    const attractorScore = clamp(salience * ((persistence * 0.55) + (stability * 0.45)));
    scored.push({
      ...node,
      activation: q(activation, cfg.precision),
      novelty: q(novelty, cfg.precision),
      persistence: q(persistence, cfg.precision),
      tension: q(tension, cfg.precision),
      stability: q(stability, cfg.precision),
      salience: q(salience, cfg.precision),
      attractorScore: q(attractorScore, cfg.precision),
    });
  }

  const retained = rankNodes(scored).slice(0, cfg.maxNodes);
  const retainedIds = new Set(retained.map((node) => node.id));
  const retainedEdges = [...edges.values()]
    .filter((edge) => retainedIds.has(edge.a) && retainedIds.has(edge.b))
    .map((edge) => ({ ...edge, weight: q(edge.weight * (edge.touched ? 1 : cfg.edgeDecay), cfg.precision) }))
    .filter((edge) => edge.weight > 0.005)
    .sort((a, b) => a.id.localeCompare(b.id));

  const provisionalState = createCognitiveFieldState({
    fieldId: state.fieldId,
    tick: (state.tick || 0) + 1,
    nodes: retained.map(({ attractorScore: _score, ...node }) => node),
    edges: retainedEdges.map(({ touched: _touched, ...edge }) => edge),
    trajectory: state.trajectory || [],
  });

  const dominantIds = rankNodes(retained).slice(0, cfg.dominantCount).map((node) => node.id);
  const trajectoryEntry = Object.freeze({
    tick: provisionalState.tick,
    dominant: Object.freeze(dominantIds),
  });
  const nextState = createCognitiveFieldState({
    ...provisionalState,
    trajectory: [...(state.trajectory || []), trajectoryEntry].slice(-cfg.maxTrajectory),
  });
  const afterFingerprint = fieldFingerprint(nextState);
  const summary = summarise({ state: nextState, scoredNodes: retained, edges: retainedEdges, config: cfg });

  const receipt = Object.freeze({
    schema: COGNITIVE_FIELD_RECEIPT_SCHEMA,
    fieldId: nextState.fieldId,
    tickBefore: state.tick || 0,
    tickAfter: nextState.tick,
    stateBeforeFingerprint: beforeFingerprint,
    stateAfterFingerprint: afterFingerprint,
    signalFingerprint: fieldFingerprint(signals),
    replaySignals: signals,
    config: cfg,
    dominantPatterns: summary.dominantPatterns,
    grantsAuthority: false,
  });

  return Object.freeze({ state: nextState, summary, receipt });
}

export function replayCognitiveField({ initialState = createCognitiveFieldState(), receipts = [] } = {}) {
  let state = initialState;
  const replayed = [];
  for (const receipt of receipts) {
    if (receipt?.schema !== COGNITIVE_FIELD_RECEIPT_SCHEMA) throw new Error('Replay requires cognitive field receipts.');
    if (fieldFingerprint(state) !== receipt.stateBeforeFingerprint) {
      throw new Error(`Cognitive field replay diverged before tick ${receipt.tickAfter}.`);
    }
    const step = stepCognitiveField({ state, replaySignals: receipt.replaySignals, config: receipt.config });
    if (step.receipt.stateAfterFingerprint !== receipt.stateAfterFingerprint) {
      throw new Error(`Cognitive field replay diverged at tick ${receipt.tickAfter}.`);
    }
    replayed.push(step.receipt);
    state = step.state;
  }
  return Object.freeze({ state, receipts: Object.freeze(replayed), fingerprint: fieldFingerprint(state), grantsAuthority: false });
}
