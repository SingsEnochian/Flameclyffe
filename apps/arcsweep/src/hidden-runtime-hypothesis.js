export const HIDDEN_RUNTIME_SCHEMA = 'arcsweep.hidden-runtime/v1';
export const HIDDEN_RUNTIME_PACKET_SCHEMA = 'arcsweep.hidden-runtime.packet/v1';

function freezeModel(model) {
  return Object.freeze({
    ...model,
    predicted_signatures: Object.freeze([...(model.predicted_signatures || [])]),
    falsifiers: Object.freeze([...(model.falsifiers || [])]),
  });
}

export const HIDDEN_RUNTIME_MODELS = Object.freeze([
  freezeModel({
    id: 'particle-dark-matter',
    label: 'Particle dark matter',
    family: 'particle',
    description: 'One or more massive particles contribute the unseen gravitating component and may rarely scatter from ordinary matter.',
    predicted_signatures: [
      'repeatable nuclear or electronic recoil spectrum',
      'target-dependent interaction rates',
      'astrophysical abundance consistent with structure formation',
    ],
    falsifiers: [
      'sufficiently sensitive direct, indirect, and collider searches exclude the required interaction space',
      'cosmological structure cannot be reproduced by the candidate population',
    ],
  }),
  freezeModel({
    id: 'field-dark-matter',
    label: 'Field dark matter',
    family: 'field',
    description: 'Dark matter is dominated by a coherent or wave-like field rather than isolated heavy particles.',
    predicted_signatures: [
      'frequency-coherent or phase-coherent signal',
      'wave or interference effects at model-dependent scales',
      'time-varying couplings or oscillatory observables',
    ],
    falsifiers: [
      'required coherence signatures are absent across the allowed parameter range',
      'structure formation excludes the field mass and coupling regime',
    ],
  }),
  freezeModel({
    id: 'hidden-sector',
    label: 'Hidden sector',
    family: 'hidden-sector',
    description: 'A richer dark sector contains multiple states, mediators, transitions, or interactions connected only weakly to visible matter.',
    predicted_signatures: [
      'multiple recoil populations or transition energies',
      'inelastic thresholds or excited-state splittings',
      'self-interaction or mediator-dependent astrophysical effects',
    ],
    falsifiers: [
      'all observed dark-matter phenomena reduce to one state with no need for internal structure',
      'predicted transitions or mediator signatures fail independent replication',
    ],
  }),
  freezeModel({
    id: 'modified-gravity',
    label: 'Modified gravity',
    family: 'gravity',
    description: 'At least part of the missing-mass signal reflects incomplete gravitational dynamics rather than additional matter.',
    predicted_signatures: [
      'systematic relation between baryonic distribution and apparent gravitational excess',
      'scale-dependent departures from general-relativistic expectations',
      'consistent lensing and dynamics from the same modified law',
    ],
    falsifiers: [
      'independent non-gravitational detection of the full dark-matter abundance',
      'no single modified-gravity law fits galaxies, clusters, lensing, and cosmology together',
    ],
  }),
  freezeModel({
    id: 'emergent-spacetime',
    label: 'Emergent spacetime',
    family: 'emergent',
    description: 'Dark-matter-like effects arise partly from deeper relational or information-theoretic structure from which spacetime and gravity emerge.',
    predicted_signatures: [
      'cross-scale correlations not natural in local particle models',
      'effective gravitational behavior linked to information or entanglement structure',
      'new consistency relations between geometry, entropy, and matter distribution',
    ],
    falsifiers: [
      'the proposed emergent relations fail precision gravitational tests',
      'the model adds no predictive power beyond ordinary gravity plus matter',
    ],
  }),
  freezeModel({
    id: 'computational-substrate',
    label: 'Computational substrate',
    family: 'computational',
    description: 'Reality is modeled as having a deeper rule-governed substrate whose hidden state can project into observable physics through a narrow set of interactions.',
    predicted_signatures: [
      'stable latent-state structure improves prediction across independent observations',
      'compact rule sets explain residuals that otherwise appear unrelated',
      'discrete or constrained state transitions recur before interpretation is applied',
    ],
    falsifiers: [
      'the model cannot make preregistered predictions that differ from competing physical models',
      'apparent compression disappears when tested on held-out observations',
    ],
  }),
]);

export function modelById(modelId) {
  return HIDDEN_RUNTIME_MODELS.find((model) => model.id === modelId) || null;
}

function finite(value, fallback = null) {
  if (value === '' || value === null || value === undefined) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function createResidualRecord({
  label = 'Untitled residual',
  observed,
  predicted,
  uncertainty = null,
  unit = '',
  context = '',
  observed_at = null,
} = {}) {
  const observedValue = finite(observed);
  const predictedValue = finite(predicted);
  if (observedValue === null || predictedValue === null) {
    throw new TypeError('Observed and predicted values must be finite numbers.');
  }
  const sigma = finite(uncertainty, null);
  const residual = observedValue - predictedValue;
  const standardised = sigma && sigma > 0 ? residual / sigma : null;
  return Object.freeze({
    schema: 'arcsweep.hidden-runtime.residual/v1',
    residual_id: `hr-residual-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`,
    label: String(label || 'Untitled residual'),
    observed: observedValue,
    predicted: predictedValue,
    residual,
    uncertainty: sigma,
    standardised_residual: standardised,
    unit: String(unit || ''),
    context: String(context || ''),
    observed_at: observed_at || new Date().toISOString(),
  });
}

export function normaliseEvidence(item = {}) {
  const model = modelById(item.model_id);
  if (!model) throw new TypeError(`Unknown Hidden Runtime model: ${item.model_id}`);
  const direction = ['supports', 'contradicts', 'neutral'].includes(item.direction) ? item.direction : 'neutral';
  const quality = Math.max(0, Math.min(1, finite(item.quality, 0.5)));
  return Object.freeze({
    schema: 'arcsweep.hidden-runtime.evidence/v1',
    evidence_id: item.evidence_id || `hr-evidence-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`,
    model_id: model.id,
    direction,
    quality,
    note: String(item.note || ''),
    source: String(item.source || ''),
    observed_at: item.observed_at || new Date().toISOString(),
  });
}

export function scoreHypothesis(modelId, evidence = []) {
  if (!modelById(modelId)) throw new TypeError(`Unknown Hidden Runtime model: ${modelId}`);
  const relevant = evidence.filter((item) => item?.model_id === modelId).map(normaliseEvidence);
  if (!relevant.length) return Object.freeze({ model_id: modelId, score: 0, evidence_count: 0, support: 0, contradiction: 0 });
  let support = 0;
  let contradiction = 0;
  let totalWeight = 0;
  for (const item of relevant) {
    const weight = item.quality;
    totalWeight += weight;
    if (item.direction === 'supports') support += weight;
    if (item.direction === 'contradicts') contradiction += weight;
  }
  const score = totalWeight > 0 ? (support - contradiction) / totalWeight : 0;
  return Object.freeze({
    model_id: modelId,
    score: Math.max(-1, Math.min(1, score)),
    evidence_count: relevant.length,
    support,
    contradiction,
  });
}

export function compareHypotheses(evidence = []) {
  return HIDDEN_RUNTIME_MODELS
    .map((model) => ({ model, ...scoreHypothesis(model.id, evidence) }))
    .sort((left, right) => right.score - left.score || right.evidence_count - left.evidence_count || left.model.label.localeCompare(right.model.label));
}

export function createHiddenRuntimePacket({ evidence = [], residuals = [], source = 'ArcSweep DEEP/Observer', note = '' } = {}) {
  const normalisedEvidence = evidence.map(normaliseEvidence);
  const rankings = compareHypotheses(normalisedEvidence).map(({ model, ...result }) => ({
    model_id: model.id,
    label: model.label,
    family: model.family,
    ...result,
  }));
  return Object.freeze({
    schema: HIDDEN_RUNTIME_PACKET_SCHEMA,
    generated_at: new Date().toISOString(),
    source,
    note: String(note || ''),
    models: HIDDEN_RUNTIME_MODELS,
    evidence: normalisedEvidence,
    residuals: residuals.map((item) => ({ ...item })),
    rankings,
    interpretation_rule: 'Scores compare currently entered evidence only. No score is a truth verdict; competing models remain visible.',
  });
}
