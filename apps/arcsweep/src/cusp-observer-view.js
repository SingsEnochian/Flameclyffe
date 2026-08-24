import { ARCSWEEP_CUSP_FEEDBACK_ENVELOPE_SCHEMA } from './cusp-feedback-observer.js';

export const ARCSWEEP_CUSP_BENCH_SCHEMA = 'arcsweep.cusp-observer-bench/v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`ARCSWEEP_CUSP_BENCH: ${message}`);
}

function finite(value, field) {
  const number = Number(value);
  invariant(Number.isFinite(number), `${field} must be finite`);
  return number;
}

function sampleRange(minimum, maximum, count, mapper) {
  invariant(Number.isInteger(count) && count >= 2, 'sample count must be at least 2');
  const span = maximum - minimum;
  return Array.from({ length: count }, (_, index) => {
    const value = minimum + span * (index / (count - 1));
    return mapper(value, index);
  });
}

function controlA(observation) {
  return finite(observation.controls?.a ?? observation.controls?.structure, 'control a');
}

function controlB(observation) {
  return finite(observation.controls?.b ?? observation.controls?.intention, 'control b');
}

export function cuspPotential(x, aInput, bInput) {
  const state = finite(x, 'x');
  const a = finite(aInput, 'control a');
  const b = finite(bInput, 'control b');
  return state ** 4 / 4 + a * state ** 2 / 2 + b * state;
}

export function sampleCuspPotential({
  controlA: aInput = null,
  controlB: bInput = null,
  structure = null,
  intention = null,
  minimum = -2,
  maximum = 2,
  samples = 97,
} = {}) {
  const a = finite(aInput ?? structure, 'control a');
  const b = finite(bInput ?? intention, 'control b');
  const min = finite(minimum, 'minimum');
  const max = finite(maximum, 'maximum');
  invariant(max > min, 'maximum must exceed minimum');
  return Object.freeze(sampleRange(min, max, samples, (x) => Object.freeze({
    x,
    potential: cuspPotential(x, a, b),
  })));
}

/**
 * Samples the canonical cusp fold locus 4a^3 + 27b^2 = 0.
 * The locus only exists for control a <= 0.
 */
export function sampleCuspFoldLocus({
  minimumControlA = null,
  maximumControlA = null,
  minimumStructure = -2,
  maximumStructure = 0,
  samples = 81,
} = {}) {
  const min = finite(minimumControlA ?? minimumStructure, 'minimumControlA');
  const max = finite(maximumControlA ?? maximumStructure, 'maximumControlA');
  invariant(min <= max && max <= 0, 'fold-locus control-a range must satisfy minimum <= maximum <= 0');
  const upper = [];
  const lower = [];
  for (const point of sampleRange(min, max, samples, (a) => {
    const magnitude = Math.sqrt(Math.max(0, -(4 * a ** 3) / 27));
    return { a, magnitude };
  })) {
    upper.push(Object.freeze({
      a: point.a,
      b: point.magnitude,
      structure: point.a,
      intention: point.magnitude,
    }));
    lower.push(Object.freeze({
      a: point.a,
      b: -point.magnitude,
      structure: point.a,
      intention: -point.magnitude,
    }));
  }
  return Object.freeze({ upper: Object.freeze(upper), lower: Object.freeze(lower) });
}

function equilibriumMarkers(observation) {
  const a = controlA(observation);
  const b = controlB(observation);
  return Object.freeze((observation.equilibria || []).map((equilibrium) => Object.freeze({
    x: equilibrium.value,
    potential: cuspPotential(equilibrium.value, a, b),
    branch: equilibrium.branch,
    stability: equilibrium.stability,
    selected: equilibrium.branch === observation.selected_equilibrium?.branch,
  })));
}

export function buildCuspObserverBench(envelope, {
  potentialMinimum = -2,
  potentialMaximum = 2,
  potentialSamples = 97,
  foldMinimumStructure = -2,
  foldSamples = 81,
} = {}) {
  invariant(envelope?.schema === ARCSWEEP_CUSP_FEEDBACK_ENVELOPE_SCHEMA, 'a cusp-observed feedback envelope is required');
  const packet = envelope.cusp_observation_packet;
  invariant(packet?.observation, 'cusp observation packet is required');
  const observation = packet.observation;
  const trace = envelope.cusp_trace_receipt?.trace || null;
  const candidate = envelope.observer_event_candidates?.find((item) => item.candidate_type === 'branch-snap') || null;
  const a = controlA(observation);
  const b = controlB(observation);
  const semantics = structuredClone(observation.control_semantics || {
    a: { role: 'structure', label: 'Structure', intentional: false },
    b: { role: 'intention', label: 'Intention', intentional: true },
  });
  const potential = sampleCuspPotential({
    controlA: a,
    controlB: b,
    minimum: potentialMinimum,
    maximum: potentialMaximum,
    samples: potentialSamples,
  });
  const foldLocus = sampleCuspFoldLocus({
    minimumControlA: foldMinimumStructure,
    maximumControlA: 0,
    samples: foldSamples,
  });

  return Object.freeze({
    schema: ARCSWEEP_CUSP_BENCH_SCHEMA,
    world: structuredClone(envelope.world),
    envelope_id: envelope.envelope_id,
    controls: structuredClone(observation.controls),
    control_semantics: semantics,
    regime: observation.regime,
    fold_polynomial: observation.fold_polynomial,
    cubic_discriminant: observation.cubic_discriminant,
    selected_equilibrium: structuredClone(observation.selected_equilibrium),
    equilibria: equilibriumMarkers(observation),
    history: structuredClone(observation.history),
    hysteresis: Object.freeze({
      detected: Boolean(trace?.hysteresis_detected),
      witnesses: structuredClone(trace?.witnesses || []),
      requires_opposite_control_b_sweeps: true,
    }),
    event_candidate: candidate ? structuredClone(candidate) : null,
    potential_landscape: Object.freeze({
      equation: 'V(x)=x^4/4 + a*x^2/2 + b*x',
      minimum_x: potentialMinimum,
      maximum_x: potentialMaximum,
      points: potential,
    }),
    control_plane: Object.freeze({
      equation: '4*a^3 + 27*b^2 = 0',
      labels: Object.freeze({
        a: semantics.a?.label || 'Control a',
        b: semantics.b?.label || 'Control b',
      }),
      current: Object.freeze({
        a,
        b,
        structure: a,
        intention: b,
        regime: observation.regime,
      }),
      fold_locus: foldLocus,
    }),
    authority: Object.freeze({
      observational_only: true,
      controls_explicit_not_inferred: true,
      controls_are_domain_semantic: true,
      control_b_is_intention: Boolean(observation.epistemic?.control_b_is_intention),
      intention_is_premaqc_agency: false,
      candidate_is_asserted_event: false,
      canon_commit: false,
    }),
  });
}
