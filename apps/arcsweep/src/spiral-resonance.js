export const SPIRAL_RESONANCE_SCHEMA = 'arcsweep.spiral-resonance/v1';

const AXES = Object.freeze(['P', 'C', 'R', 'E', 'M', 'A', 'Q']);

function invariant(condition, message) {
  if (!condition) throw new Error(`SPIRAL_RESONANCE: ${message}`);
}

function freeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(freeze));
  if (value && typeof value === 'object') return Object.freeze(Object.fromEntries(Object.entries(value).map(([k, v]) => [k, freeze(v)])));
  return value;
}

function axisCorrespondence(a = {}, b = {}) {
  const measured = AXES.filter((axis) => Number.isFinite(a[axis]) && Number.isFinite(b[axis]));
  if (!measured.length) return freeze({ measured_axes: [], per_axis: {}, mean_correspondence: null });
  const perAxis = Object.fromEntries(measured.map((axis) => [axis, 1 - Math.min(1, Math.abs(a[axis] - b[axis]))]));
  const mean = measured.reduce((sum, axis) => sum + perAxis[axis], 0) / measured.length;
  return freeze({ measured_axes: measured, per_axis: perAxis, mean_correspondence: mean });
}

function spiralCorrespondence(a = {}, b = {}) {
  const phase = a.phase && b.phase ? (a.phase === b.phase ? 1 : 0) : null;
  const direction = a.direction && b.direction ? (a.direction === b.direction ? 1 : 0) : null;
  const confidence = Number.isFinite(a.confidence) && Number.isFinite(b.confidence)
    ? 1 - Math.min(1, Math.abs(a.confidence - b.confidence))
    : null;
  return freeze({ phase, direction, confidence });
}

export function calculateSpiralResonance({
  travellerSnapshot,
  destinationSnapshot,
  crossingEnvelope,
  relational = null,
  worldHum = null,
  glyph = null,
  runa = null,
  storywork = null,
} = {}) {
  invariant(travellerSnapshot?.state_id, 'traveller snapshot is required');
  invariant(destinationSnapshot?.state_id, 'destination snapshot is required');
  invariant(crossingEnvelope?.schema === 'arcsweep.bifrost-crossing-envelope/v1', 'crossing envelope is required');

  const sourcePremaqc = travellerSnapshot.state?.premaqc ?? {};
  const destinationPremaqc = destinationSnapshot.state?.premaqc ?? {};
  const sourceSpiral = travellerSnapshot.state?.spiral ?? {};
  const destinationSpiral = destinationSnapshot.state?.spiral ?? {};
  const invariants = crossingEnvelope.translation?.candidate_invariants ?? [];
  const residue = crossingEnvelope.translation?.untranslatable ?? [];

  return freeze({
    schema: SPIRAL_RESONANCE_SCHEMA,
    resonance_id: `spiral-resonance:${crossingEnvelope.crossing_id}`,
    crossing_id: crossingEnvelope.crossing_id,
    traveller_state_id: travellerSnapshot.state_id,
    destination_state_id: destinationSnapshot.state_id,
    relation: Object.freeze([travellerSnapshot.world_identity, destinationSnapshot.world_identity]),
    premaqc_correspondence: axisCorrespondence(sourcePremaqc, destinationPremaqc),
    spiral_correspondence: spiralCorrespondence(sourceSpiral, destinationSpiral),
    invariant_context: {
      candidates: invariants,
      candidate_count: invariants.length,
    },
    untranslated_residue: residue,
    relational,
    world_hum: worldHum,
    projections: { glyph, runa, storywork },
    scalar_summary: null,
  });
}

export function attachResonanceToHolonomy(holonomy, resonance) {
  invariant(holonomy?.schema === 'arcsweep.spiral-holonomy/v1', 'Spiral Holonomy record is required');
  invariant(resonance?.schema === SPIRAL_RESONANCE_SCHEMA, 'Spiral Resonance record is required');
  return freeze({ ...holonomy, resonance });
}
