export const REALITY_DESCRIPTOR_SCHEMA = 'arcsweep.reality-descriptor/v0.1';
export const CORRESPONDENCE_MAP_SCHEMA = 'arcsweep.correspondence-map/v0.1';

function stableEntries(object = {}) {
  return Object.entries(object).sort(([a], [b]) => a.localeCompare(b));
}

export function createRealityDescriptor({
  id,
  label,
  provenanceClass,
  observationalBasis = [],
  stateDimensions = {},
  invariants = {},
  governingRules = {},
  measurableConstants = {},
  causalConstraints = {},
  coordinateModel = null,
  observerModel = null,
  uncertainty = 1,
  branchParent = null,
  divergenceEvents = [],
  correspondenceTargets = [],
} = {}) {
  if (!id) throw new Error('reality-descriptor-id-required');
  if (!label) throw new Error('reality-descriptor-label-required');
  if (!provenanceClass) throw new Error('reality-descriptor-provenance-required');
  if (!Number.isFinite(Number(uncertainty)) || Number(uncertainty) < 0 || Number(uncertainty) > 1) {
    throw new Error('reality-descriptor-uncertainty-out-of-range');
  }

  return Object.freeze({
    schema: REALITY_DESCRIPTOR_SCHEMA,
    id,
    label,
    provenanceClass,
    observationalBasis: Object.freeze([...observationalBasis]),
    stateDimensions: Object.freeze({ ...stateDimensions }),
    invariants: Object.freeze({ ...invariants }),
    governingRules: Object.freeze({ ...governingRules }),
    measurableConstants: Object.freeze({ ...measurableConstants }),
    causalConstraints: Object.freeze({ ...causalConstraints }),
    coordinateModel,
    observerModel,
    uncertainty: Number(uncertainty),
    branchParent,
    divergenceEvents: Object.freeze([...divergenceEvents]),
    correspondenceTargets: Object.freeze([...correspondenceTargets]),
  });
}

function compareRecord(left = {}, right = {}) {
  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
  const matches = [];
  const differences = [];

  for (const key of keys) {
    const a = left[key];
    const b = right[key];
    if (JSON.stringify(a) === JSON.stringify(b)) {
      matches.push(Object.freeze({ key, value: a }));
    } else {
      differences.push(Object.freeze({ key, origin: a ?? null, target: b ?? null }));
    }
  }

  return Object.freeze({ matches: Object.freeze(matches), differences: Object.freeze(differences) });
}

export function compareRealityDescriptors(origin, target, { id = null } = {}) {
  if (origin?.schema !== REALITY_DESCRIPTOR_SCHEMA) throw new Error('reality-origin-invalid');
  if (target?.schema !== REALITY_DESCRIPTOR_SCHEMA) throw new Error('reality-target-invalid');

  const dimensions = compareRecord(origin.stateDimensions, target.stateDimensions);
  const invariants = compareRecord(origin.invariants, target.invariants);
  const rules = compareRecord(origin.governingRules, target.governingRules);
  const constants = compareRecord(origin.measurableConstants, target.measurableConstants);
  const constraints = compareRecord(origin.causalConstraints, target.causalConstraints);

  const comparedCount = [dimensions, invariants, rules, constants, constraints]
    .reduce((sum, group) => sum + group.matches.length + group.differences.length, 0);
  const matchingCount = [dimensions, invariants, rules, constants, constraints]
    .reduce((sum, group) => sum + group.matches.length, 0);
  const correspondence = comparedCount === 0 ? 0 : matchingCount / comparedCount;
  const uncertainty = Math.max(origin.uncertainty, target.uncertainty);

  return Object.freeze({
    schema: CORRESPONDENCE_MAP_SCHEMA,
    id: id || `correspondence:${origin.id}->${target.id}`,
    originId: origin.id,
    targetId: target.id,
    correspondence,
    uncertainty,
    dimensions,
    invariants,
    governingRules: rules,
    measurableConstants: constants,
    causalConstraints: constraints,
    invariantConflicts: Object.freeze(invariants.differences.map(({ key, origin: a, target: b }) => Object.freeze({ key, origin: a, target: b }))),
    transitionCandidate: invariants.differences.length === 0,
    provenance: Object.freeze({ origin: origin.provenanceClass, target: target.provenanceClass }),
    descriptorKeys: Object.freeze({
      origin: Object.freeze(stableEntries(origin.stateDimensions).map(([key]) => key)),
      target: Object.freeze(stableEntries(target.stateDimensions).map(([key]) => key)),
    }),
  });
}
