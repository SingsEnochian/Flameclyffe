import {
  mapWorldFoldFrequencies,
  updateFoldLatch,
  validateWorldToneCandidate,
} from './world-tone-fold-approval.js';

function invariant(condition, message) {
  if (!condition) throw new Error(`WORLD_FOLD_TIMELINE: ${message}`);
}

function normaliseFoldMatrix(input, expectedWorlds) {
  invariant(Array.isArray(input) && input.length === expectedWorlds, 'fold matrix must contain one row per world');
  const matrix = input.map((row) => {
    invariant(Array.isArray(row), 'fold matrix rows must be arrays');
    const values = row.map(Number);
    invariant(values.every((value) => Number.isFinite(value) && value >= 0 && value <= 1), 'fold indices must lie within 0..1');
    return values;
  });
  const numSteps = matrix[0]?.length ?? 0;
  invariant(numSteps > 0, 'fold matrix must contain at least one timeline step');
  invariant(matrix.every((row) => row.length === numSteps), 'fold matrix rows must share one timeline length');
  return { matrix, numSteps };
}

function normaliseExternalTriggers(input, expectedWorlds) {
  if (input == null) return null;
  invariant(Array.isArray(input) && input.length === expectedWorlds, 'external triggers must contain one collection per world');
  return input.map((triggers) => new Set(Array.from(triggers, Number)));
}

export function mapWorldFoldTimeline({
  worldCandidates,
  worldFoldIndices,
  externalTriggers = null,
} = {}) {
  invariant(Array.isArray(worldCandidates) && worldCandidates.length > 0, 'world candidates are required');
  const candidates = worldCandidates.map(validateWorldToneCandidate);
  const numWorlds = candidates.length;
  const { matrix, numSteps } = normaliseFoldMatrix(worldFoldIndices, numWorlds);
  const triggerSets = normaliseExternalTriggers(externalTriggers, numWorlds);
  const activeStates = Array(numWorlds).fill(false);
  const timeline = [];

  for (let step = 0; step < numSteps; step += 1) {
    const events = [];
    for (let worldIndex = 0; worldIndex < numWorlds; worldIndex += 1) {
      const candidate = candidates[worldIndex];
      const foldIndex = matrix[worldIndex][step];
      activeStates[worldIndex] = updateFoldLatch(foldIndex, activeStates[worldIndex], {
        enter: candidate.enter_threshold,
        release: candidate.release_threshold,
      });
      const externallyEnabled = triggerSets == null || triggerSets[worldIndex].has(step);
      if (!activeStates[worldIndex] || !externallyEnabled) continue;

      events.push(Object.freeze({
        schema: 'hearthgate.world-fold-tone-event.v1',
        step,
        world_index: worldIndex,
        world_id: candidate.world_id,
        world_name: candidate.world_name,
        profile_version: candidate.profile_version,
        tone_layer_id: candidate.tone_layer_id,
        fold_active: true,
        tone_pair: mapWorldFoldFrequencies(candidate.root_hz, foldIndex, {
          enterThreshold: candidate.enter_threshold,
          excursion: candidate.excursion,
        }),
      }));
    }
    timeline.push(Object.freeze(events));
  }

  return Object.freeze({
    schema: 'hearthgate.world-fold-tone-timeline.v1',
    world_count: numWorlds,
    num_steps: numSteps,
    timeline: Object.freeze(timeline),
  });
}
