import { BARBAULT_BODIES, angularDistance, normalizeLongitude } from './barbault.js';

export function compareEphemerisLongitudes({
  sourceLongitudes = {},
  referenceLongitudes = {},
  tolerance_degrees = 0.25,
  reference_source = 'manual_fixture',
} = {}) {
  const bodyDeltas = {};
  let worstDelta = 0;
  let missingCount = 0;
  let needsReviewCount = 0;

  for (const body of BARBAULT_BODIES) {
    if (!(body in sourceLongitudes) || !(body in referenceLongitudes)) {
      missingCount += 1;
      bodyDeltas[body] = {
        source_longitude: sourceLongitudes[body] ?? null,
        reference_longitude: referenceLongitudes[body] ?? null,
        delta_degrees: null,
        status: 'missing_reference',
      };
      continue;
    }

    const source = Number(normalizeLongitude(sourceLongitudes[body]).toFixed(3));
    const reference = Number(normalizeLongitude(referenceLongitudes[body]).toFixed(3));
    const delta = Number(angularDistance(source, reference).toFixed(3));
    worstDelta = Math.max(worstDelta, delta);
    const status = delta <= tolerance_degrees ? 'within_tolerance' : 'needs_review';
    if (status === 'needs_review') needsReviewCount += 1;

    bodyDeltas[body] = {
      source_longitude: source,
      reference_longitude: reference,
      delta_degrees: delta,
      status,
    };
  }

  return {
    reference_source,
    tolerance_degrees,
    worst_delta_degrees: Number(worstDelta.toFixed(3)),
    body_deltas: bodyDeltas,
    status: missingCount > 0
      ? 'missing_reference'
      : needsReviewCount > 0
        ? 'needs_review'
        : 'within_tolerance',
    note: missingCount > 0
      ? 'Comparison could not run for all bodies because at least one source or reference longitude was missing.'
      : needsReviewCount > 0
        ? 'At least one provider longitude differs from the reference beyond the allowed tolerance.'
        : 'All compared provider longitudes are within tolerance.',
  };
}

export function findEphemerisFixture(fixtures = [], { target_timestamp, provider } = {}) {
  return fixtures.find((fixture) => (
    fixture.target_timestamp === target_timestamp && (!provider || fixture.provider === provider)
  )) || null;
}
