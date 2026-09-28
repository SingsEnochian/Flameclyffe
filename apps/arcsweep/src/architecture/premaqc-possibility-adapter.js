import { clamp01 } from './signal-contract.js';
import { trajectoryActivationScore } from './trajectory-state.js';

export const PREMAQC_POSSIBILITY_SCHEMA = 'arcsweep.premaqc-possibility-field/v0.1';
export const PREMAQC_ACTIVATION_AXES = Object.freeze(['P', 'C', 'R', 'E', 'M', 'A']);

const DEFAULT_WEIGHTS = Object.freeze({
  P: 0.15,
  C: 0.20,
  R: 0.25,
  E: 0.10,
  M: 0.15,
  A: 0.15,
});

function axisValue(premaqc, axis) {
  const value = Number(premaqc?.state?.[axis]?.value);
  return Number.isFinite(value) ? clamp01(value) : null;
}

function normalisedWeights(weights = DEFAULT_WEIGHTS) {
  const entries = PREMAQC_ACTIVATION_AXES.map((axis) => [axis, Math.max(0, Number(weights?.[axis]) || 0)]);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  if (total <= 0) return DEFAULT_WEIGHTS;
  return Object.freeze(Object.fromEntries(entries.map(([axis, value]) => [axis, value / total])));
}

export function premaqcContextSupport(premaqc, { weights = DEFAULT_WEIGHTS } = {}) {
  if (!premaqc?.state) throw new Error('premaqc-state-required');
  const resolvedWeights = normalisedWeights(weights);
  let support = 0;
  let usedWeight = 0;
  const components = {};

  for (const axis of PREMAQC_ACTIVATION_AXES) {
    const value = axisValue(premaqc, axis);
    components[axis] = value;
    if (value == null) continue;
    support += value * resolvedWeights[axis];
    usedWeight += resolvedWeights[axis];
  }

  return Object.freeze({
    support: usedWeight > 0 ? clamp01(support / usedWeight) : 0,
    components: Object.freeze(components),
    weights: resolvedWeights,
    derivation: 'deterministic-policy-score',
    measurement: false,
    qualiaUsedForActivation: false,
  });
}

export function createPremaqcPossibilityEvaluator({
  premaqc,
  weights = DEFAULT_WEIGHTS,
  trajectoryWeight = 0.50,
  observationWeight = 0.25,
  contextWeight = 0.25,
} = {}) {
  if (!premaqc?.state) throw new Error('premaqc-state-required');
  const context = premaqcContextSupport(premaqc, { weights });
  const totalWeight = [trajectoryWeight, observationWeight, contextWeight]
    .map((value) => Math.max(0, Number(value) || 0))
    .reduce((sum, value) => sum + value, 0) || 1;

  return async function evaluatePremaqcPossibility(trajectory, observation = {}) {
    const trajectoryScore = trajectoryActivationScore(trajectory);
    const relevance = clamp01(observation.relevance ?? 0);
    const contradicted = observation.contradicted === true;
    const pressure = clamp01((
      trajectoryScore * Math.max(0, Number(trajectoryWeight) || 0)
      + relevance * Math.max(0, Number(observationWeight) || 0)
      + context.support * Math.max(0, Number(contextWeight) || 0)
    ) / totalWeight);

    return Object.freeze({
      schema: PREMAQC_POSSIBILITY_SCHEMA,
      pressure,
      relevance,
      contradiction: contradicted ? 1 : 0,
      activate: !contradicted && pressure >= trajectory.activationThreshold,
      trajectoryScore,
      contextSupport: context.support,
      premaqcRef: premaqc.id || premaqc.receipt_id || null,
      premaqcSequence: Number.isFinite(Number(premaqc.sequence)) ? Number(premaqc.sequence) : null,
      axisComponents: context.components,
      axisWeights: context.weights,
      qualia: Object.freeze({
        present: premaqc?.qualia?.present === true,
        authority: 'firsthand-only',
        usedForActivation: false,
      }),
      derivation: Object.freeze({
        kind: 'deterministic-policy-score',
        measurement: false,
        formula: 'weighted(trajectory activation, explicit observation relevance, PREMAQC P/C/R/E/M/A context)',
      }),
      sourceRefs: Object.freeze([
        premaqc.id ? `premaqc:${premaqc.id}` : null,
        observation.id ? `observation:${observation.id}` : null,
      ].filter(Boolean)),
    });
  };
}
