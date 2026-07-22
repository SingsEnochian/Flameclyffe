export const ARKFIRE_SCHEMA_VERSION = '0.1.0';
export const ARKFIRE_LOOP = Object.freeze([
  'observe',
  'model',
  'interpret',
  'generate',
  'narrate',
  'evaluate',
  'record',
  'reobserve',
]);

export const EPISTEMIC_REGISTERS = Object.freeze([
  'MEASURED',
  'RETRIEVED',
  'DERIVED',
  'MANUALLY_ENTERED',
  'SIMULATED',
  'INFERRED',
  'GENERATED',
  'DEFAULTED',
  'CORRECTED',
]);

export const DEFAULT_WORLDS = Object.freeze([
  {
    id: 'waking-earth',
    name: 'Waking Earth',
    type: 'physical-reference',
    timeZone: 'America/New_York',
    rate: 1,
    epoch: '2026-01-01T00:00:00.000Z',
    calendar: { daysPerMonth: 30.436875, monthsPerYear: 12, labels: [] },
    canonMode: 'canon-guided',
    status: 'active',
    colour: '#e6b86f',
    description: 'Earth-local measured and retrieved reference world.',
  },
  {
    id: 'terra-aeterna',
    name: 'Terra Aeterna',
    type: 'story-world',
    timeZone: 'UTC',
    rate: 1,
    epoch: '2026-01-01T00:00:00.000Z',
    calendar: { daysPerMonth: 30, monthsPerYear: 12, labels: ['Deepwinter', 'Thawrise', 'Seedwake', 'Raincall', 'Brightleaf', 'Highsun', 'Emberwane', 'Harvest', 'Goldfall', 'Mistturn', 'Frostcall', 'Longnight'] },
    canonMode: 'canon-guided',
    status: 'active',
    colour: '#73c4ac',
    description: 'Hearthweave, the Third City, and the Terra Aeterna continuity field.',
  },
  {
    id: 'windmere-luna',
    name: 'Windmere / Luna',
    type: 'story-world',
    timeZone: 'UTC',
    rate: 0.9,
    epoch: '2026-01-01T00:00:00.000Z',
    calendar: { daysPerMonth: 28, monthsPerYear: 13, labels: [] },
    canonMode: 'canon-guided',
    status: 'active',
    colour: '#9fa9dd',
    description: 'Moonmere, Luna law, and Eira Windmere continuity.',
  },
  {
    id: 'dreaming-grove',
    name: 'Dreaming Grove',
    type: 'shared-world',
    timeZone: 'America/New_York',
    rate: 1,
    epoch: '2026-01-01T00:00:00.000Z',
    calendar: { daysPerMonth: 30.436875, monthsPerYear: 12, labels: [] },
    canonMode: 'free-divergence',
    status: 'active',
    colour: '#b893d6',
    description: 'Shared reflective space with continuity, consent, and relational memory.',
  },
  {
    id: 'hearthweave',
    name: 'Hearthweave',
    type: 'house-world',
    timeZone: 'America/New_York',
    rate: 1,
    epoch: '2026-01-01T00:00:00.000Z',
    calendar: { daysPerMonth: 30.436875, monthsPerYear: 12, labels: [] },
    canonMode: 'branch-at-marker',
    status: 'active',
    colour: '#d47b4f',
    description: 'House continuity, Constellation work, instruments, and shared projects.',
  },
  {
    id: 'project-zero',
    name: 'Project Zero',
    type: 'experimental-world',
    timeZone: 'UTC',
    rate: 1,
    epoch: '2026-01-01T00:00:00.000Z',
    calendar: { daysPerMonth: 30, monthsPerYear: 12, labels: [] },
    canonMode: 'free-divergence',
    status: 'inactive',
    colour: '#d8d8d8',
    description: 'Experimental world and compatibility bench.',
  },
  {
    id: 'observer-deep',
    name: 'Observer DEEP',
    type: 'instrument-world',
    timeZone: 'UTC',
    rate: 1,
    epoch: '2026-01-01T00:00:00.000Z',
    calendar: { daysPerMonth: 30.436875, monthsPerYear: 12, labels: [] },
    canonMode: 'canon-lock',
    status: 'active',
    colour: '#76a8c8',
    description: 'Instrument readings, model results, and evidence packets.',
  },
]);

export const DEFAULT_ENTITIES = Object.freeze([
  { id: 'rowan', name: 'Rowan', worldId: 'waking-earth', perspective: 'observer', status: 'active' },
  { id: 'falka', name: 'Falka Hearthlight', worldId: 'terra-aeterna', perspective: 'native', status: 'active' },
  { id: 'virelya', name: 'Virelya Liorael', worldId: 'terra-aeterna', perspective: 'native', status: 'active' },
  { id: 'faer-uial', name: 'Faer Uial Nádleehí', worldId: 'terra-aeterna', perspective: 'native', status: 'active' },
  { id: 'eira', name: 'Eira Catrine Windmere', worldId: 'windmere-luna', perspective: 'native', status: 'active' },
  { id: 'vee', name: 'Vee', worldId: 'hearthweave', perspective: 'constellation', status: 'active' },
  { id: 'boxfire', name: 'Boxfire', worldId: 'hearthweave', perspective: 'constellation', status: 'active' },
  { id: 'yggdrasil', name: 'Yggdrasil', worldId: 'hearthweave', perspective: 'constellation', status: 'active' },
]);

export const MODEL_REGISTRY = Object.freeze([
  {
    id: 'arkfire-resonance-v1',
    name: 'Arkfire Resonance / Coherence / Entanglement',
    evidenceClass: 'experimental-model',
    description: 'Bounded relationship model using coverage, agreement, recurrence, contradiction, and observer-entered affect.',
  },
  {
    id: 'sheet-convergence-v1',
    name: 'Sheet Convergence and Jacobian Conditioning',
    evidenceClass: 'mathematical-derivation',
    description: 'Polynomial map with certified determinant −2. Produces conditioning and convergence scores, not physical fold probability.',
  },
  {
    id: 'temporal-phase-v1',
    name: 'Temporal Phase Comparison',
    evidenceClass: 'experimental-model',
    description: 'Circular phase-distance model across selected world clocks and event timing.',
  },
  {
    id: 'information-contrast-v1',
    name: 'Information Contrast',
    evidenceClass: 'statistical-summary',
    description: 'Compares normalised observation channels and reports similarity, divergence, and missingness.',
  },
]);

export const PROMPT_LIBRARY = Object.freeze([
  { id: 'threshold', min: 0, max: 0.19, title: 'Threshold', text: 'Describe the smallest honest sign that the selected worlds have begun to notice one another.' },
  { id: 'echo', min: 0.2, max: 0.39, title: 'Echo', text: 'Describe an event repeated across perspectives with one meaningful difference that neither side can dismiss.' },
  { id: 'artifact', min: 0.4, max: 0.59, title: 'Bridge Artifact', text: 'Describe an artifact whose history belongs to more than one world and reveal what each perspective believes it means.' },
  { id: 'braid', min: 0.6, max: 0.79, title: 'Convergent Braid', text: 'Describe a shared problem that requires reciprocal capability without erasing either world’s laws or identity.' },
  { id: 'reunion', min: 0.8, max: 1, title: 'Reunion Event', text: 'Describe a high-significance convergence where recognition changes future continuity and every participant retains sovereign choice.' },
]);

export function clamp(value, minimum = 0, maximum = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return minimum;
  return Math.min(maximum, Math.max(minimum, number));
}

export function mean(values) {
  const finite = values.map(Number).filter(Number.isFinite);
  return finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : null;
}

export function stableHash(input) {
  const text = typeof input === 'string' ? input : JSON.stringify(input);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function seededUnit(input, salt = '') {
  const parsed = Number.parseInt(stableHash(`${salt}:${typeof input === 'string' ? input : JSON.stringify(input)}`), 16);
  return (parsed % 1000000) / 999999;
}

export function worldClock(world, now = new Date()) {
  const instant = now instanceof Date ? now : new Date(now);
  const epoch = new Date(world.epoch || '2026-01-01T00:00:00.000Z');
  const elapsed = instant.getTime() - epoch.getTime();
  const worldInstant = new Date(epoch.getTime() + elapsed * Number(world.rate || 1));
  const daysPerMonth = Number(world.calendar?.daysPerMonth || 30.436875);
  const monthsPerYear = Number(world.calendar?.monthsPerYear || 12);
  const elapsedDays = Math.floor((worldInstant.getTime() - epoch.getTime()) / 86400000);
  const year = Math.floor(elapsedDays / (daysPerMonth * monthsPerYear)) + 1;
  const dayWithinYear = Math.max(0, elapsedDays % Math.round(daysPerMonth * monthsPerYear));
  const monthIndex = Math.min(monthsPerYear - 1, Math.floor(dayWithinYear / daysPerMonth));
  const day = Math.floor(dayWithinYear - monthIndex * daysPerMonth) + 1;
  const monthLabel = world.calendar?.labels?.[monthIndex] || `Month ${monthIndex + 1}`;
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: world.timeZone || 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(worldInstant);
  return {
    worldId: world.id,
    worldInstant: worldInstant.toISOString(),
    label: `Year ${year} · ${monthLabel} ${day} · ${time}`,
    year,
    monthIndex,
    monthLabel,
    day,
    time,
  };
}

export function normaliseObservationChannels(observation) {
  const weather = observation?.earth?.weather || {};
  const space = observation?.earth?.spaceWeather || {};
  const seismic = observation?.earth?.seismic || {};
  const affect = observation?.perspectives || [];
  const channel = {
    temperature: clamp((Number(weather.temperature_2m ?? 20) + 20) / 70),
    humidity: clamp(Number(weather.relative_humidity_2m ?? 50) / 100),
    pressure: clamp((Number(weather.pressure_msl ?? 1013) - 950) / 100),
    wind: clamp(Number(weather.wind_speed_10m ?? 0) / 80),
    cloud: clamp(Number(weather.cloud_cover ?? 0) / 100),
    kp: clamp(Number(space.kp ?? 0) / 9),
    bz: clamp((Number(space.bz ?? 0) + 20) / 40),
    solarWind: clamp(Number(space.speed ?? 400) / 1000),
    seismic: clamp(Number(seismic.maximumMagnitude ?? 0) / 9),
    affect: clamp(mean(affect.map((item) => Number(item.affectIntensity ?? 0.5))) ?? 0.5),
    observationCoverage: clamp(Number(observation?.integrity?.coverage ?? 0.5)),
  };
  return channel;
}

function vectorDistance(left, right) {
  const keys = [...new Set([...Object.keys(left || {}), ...Object.keys(right || {})])];
  if (!keys.length) return 1;
  const differences = keys.map((key) => (Number(left?.[key] ?? 0.5) - Number(right?.[key] ?? 0.5)) ** 2);
  return Math.sqrt(mean(differences) || 0);
}

export function runResonanceModel(observation, history = []) {
  const channels = normaliseObservationChannels(observation);
  const perspectiveValues = (observation.perspectives || []).map((perspective) => ({
    id: perspective.entityId,
    affect: clamp(perspective.affectIntensity ?? 0.5),
    certainty: clamp(perspective.certainty ?? 0.5),
  }));
  const agreement = perspectiveValues.length > 1
    ? 1 - Math.min(1, Math.abs(perspectiveValues[0].affect - perspectiveValues[1].affect))
    : 0.5;
  const contradictionCount = Number(observation?.integrity?.contradictions || 0);
  const contradictionPenalty = clamp(contradictionCount / 10);
  const compatibleHistory = history.filter((item) =>
    (item.worldIds || []).some((worldId) => (observation.worldIds || []).includes(worldId)),
  );
  const recurrence = clamp(compatibleHistory.length / 20);
  const coverage = channels.observationCoverage;
  const resonance = clamp(0.34 * channels.affect + 0.24 * agreement + 0.22 * recurrence + 0.2 * coverage);
  const coherence = clamp(0.42 * agreement + 0.34 * coverage + 0.24 * (1 - contradictionPenalty));
  const entanglement = clamp(0.34 * recurrence + 0.28 * agreement + 0.2 * resonance + 0.18 * coverage);
  return {
    modelId: 'arkfire-resonance-v1',
    register: 'DERIVED',
    resonance,
    coherence,
    entanglement,
    contributors: { agreement, recurrence, coverage, contradictionPenalty, affect: channels.affect },
    warnings: contradictionCount ? [`${contradictionCount} unresolved contradiction(s) reduce coherence.`] : [],
  };
}

export const SHEET_TARGET = Object.freeze([-0.25, 0, 0]);
export const SHEET_PREIMAGES = Object.freeze([
  Object.freeze([0, 0, -0.25]),
  Object.freeze([1, -1.5, 6.5]),
  Object.freeze([-1, 1.5, 6.5]),
]);

export function sheetConvergenceMap([x, y, z]) {
  const u = 1 + x * y;
  return [
    u ** 3 * z + y ** 2 * u * (4 + 3 * x * y),
    y + 3 * x * u ** 2 * z + 3 * x * y ** 2 * (4 + 3 * x * y),
    2 * x - 3 * x ** 2 * y - x ** 3 * z,
  ];
}

function distance(left, right) {
  return Math.hypot(...left.map((value, index) => value - right[index]));
}

export function runSheetConvergenceModel(observation) {
  const channels = normaliseObservationChannels(observation);
  const time = new Date(observation.observedAt || Date.now());
  const dayFraction = (time.getUTCHours() * 3600 + time.getUTCMinutes() * 60 + time.getUTCSeconds()) / 86400;
  const latitude = Number(observation?.earth?.location?.latitude ?? 0);
  const longitude = Number(observation?.earth?.location?.longitude ?? 0);
  const altitude = Number(observation?.earth?.location?.altitudeM ?? 0);
  const state = [
    longitude / 180,
    latitude / 90,
    Math.tanh(altitude / 10000) + Math.sin(2 * Math.PI * dayFraction) + (channels.affect - 0.5) * 0.1,
  ];
  const mapped = sheetConvergenceMap(state);
  const targetResidual = distance(mapped, SHEET_TARGET);
  const preimageDistances = SHEET_PREIMAGES.map((point) => distance(state, point));
  const nearestPreimageDistance = Math.min(...preimageDistances);
  const convergenceScore = Math.exp(-(targetResidual ** 2) / (2 * 0.25 ** 2))
    * Math.exp(-(nearestPreimageDistance ** 2) / (2 * 0.75 ** 2));
  const conditionProxy = 1 / (1 + Math.abs(state[0] * state[1]) + Math.abs(state[2]));
  return {
    modelId: 'sheet-convergence-v1',
    register: 'MATHEMATICAL_DERIVATION',
    state,
    mapped,
    determinant: -2,
    volumeScale: 2,
    orientation: 'reversing',
    singularity: false,
    localFoldProbability: 0,
    physicalFoldProbability: null,
    physicalStatus: 'UNAVAILABLE_UNTIL_CALIBRATED',
    conditionProxy,
    convergenceScore,
    targetResidual,
    nearestPreimageDistance,
    warnings: ['This score belongs to a mathematical map and is not evidence of a physical spacetime fold.'],
  };
}

export function runTemporalPhaseModel(observation, worlds, now = new Date()) {
  const active = worlds.filter((world) => (observation.worldIds || []).includes(world.id));
  const phases = active.map((world) => {
    const clock = worldClock(world, now);
    const instant = new Date(clock.worldInstant);
    return {
      worldId: world.id,
      phase: (instant.getUTCHours() * 3600 + instant.getUTCMinutes() * 60 + instant.getUTCSeconds()) / 86400,
    };
  });
  let pairwise = [];
  for (let left = 0; left < phases.length; left += 1) {
    for (let right = left + 1; right < phases.length; right += 1) {
      const raw = Math.abs(phases[left].phase - phases[right].phase);
      const circular = Math.min(raw, 1 - raw);
      pairwise.push({ left: phases[left].worldId, right: phases[right].worldId, distance: circular, alignment: 1 - circular * 2 });
    }
  }
  return {
    modelId: 'temporal-phase-v1',
    register: 'DERIVED',
    phases,
    pairwise,
    alignment: clamp(mean(pairwise.map((pair) => pair.alignment)) ?? 0.5),
    warnings: active.length < 2 ? ['At least two worlds are required for phase comparison.'] : [],
  };
}

export function runInformationContrastModel(observation) {
  const earth = normaliseObservationChannels(observation);
  const simulated = observation.simulatedWorlds || [];
  const comparisons = simulated.map((world) => {
    const other = world.channels || {};
    const divergence = vectorDistance(earth, other);
    return {
      worldId: world.worldId,
      divergence,
      similarity: clamp(1 - divergence),
      comparedChannels: [...new Set([...Object.keys(earth), ...Object.keys(other)])],
    };
  });
  return {
    modelId: 'information-contrast-v1',
    register: 'DERIVED',
    comparisons,
    meanSimilarity: clamp(mean(comparisons.map((item) => item.similarity)) ?? 0.5),
    missingWorldModels: simulated.filter((item) => !item.channels || !Object.keys(item.channels).length).map((item) => item.worldId),
  };
}

export function runModels({ observation, worlds = DEFAULT_WORLDS, history = [], selectedModelIds = MODEL_REGISTRY.map((model) => model.id), reconciliation = 'parallel' }) {
  const results = [];
  if (selectedModelIds.includes('arkfire-resonance-v1')) results.push(runResonanceModel(observation, history));
  if (selectedModelIds.includes('sheet-convergence-v1')) results.push(runSheetConvergenceModel(observation));
  if (selectedModelIds.includes('temporal-phase-v1')) results.push(runTemporalPhaseModel(observation, worlds, new Date(observation.observedAt || Date.now())));
  if (selectedModelIds.includes('information-contrast-v1')) results.push(runInformationContrastModel(observation));
  const scores = {
    resonance: mean(results.map((result) => result.resonance).filter(Number.isFinite)),
    coherence: mean(results.map((result) => result.coherence).filter(Number.isFinite)),
    entanglement: mean(results.map((result) => result.entanglement).filter(Number.isFinite)),
    convergence: mean(results.map((result) => result.convergenceScore).filter(Number.isFinite)),
    phaseAlignment: mean(results.map((result) => result.alignment).filter(Number.isFinite)),
    similarity: mean(results.map((result) => result.meanSimilarity).filter(Number.isFinite)),
  };
  const available = Object.values(scores).filter(Number.isFinite);
  const bridgeScore = clamp(mean(available) ?? 0);
  return {
    id: `model-${stableHash({ observationId: observation.id, selectedModelIds, reconciliation, at: observation.observedAt })}`,
    schemaVersion: ARKFIRE_SCHEMA_VERSION,
    observationId: observation.id,
    createdAt: new Date().toISOString(),
    reconciliation,
    selectedModelIds,
    results,
    scores,
    bridgeScore,
    register: 'DERIVED',
    warnings: results.flatMap((result) => result.warnings || []),
  };
}

export function simulateWorldObservation({ world, entity, observation, continuity = [] }) {
  const seed = seededUnit({ worldId: world.id, entityId: entity?.id, observationId: observation.id, continuityCount: continuity.length });
  const earth = normaliseObservationChannels(observation);
  const recent = continuity.filter((event) => event.worldIds?.includes(world.id)).slice(-5);
  const narrativePressure = clamp(recent.length / 5);
  const channels = {
    temperature: clamp(earth.temperature * (0.75 + seed * 0.5)),
    humidity: clamp(earth.humidity * (0.7 + seededUnit(world.id, 'humidity') * 0.6)),
    pressure: clamp(0.4 + seededUnit(world.id, 'pressure') * 0.4),
    wind: clamp(0.2 + seededUnit(world.id, 'wind') * 0.7),
    cloud: clamp(0.15 + seededUnit(world.id, 'cloud') * 0.75),
    kp: clamp(earth.kp * 0.25 + seededUnit(world.id, 'hum') * 0.75),
    bz: clamp(0.35 + seededUnit(world.id, 'axis') * 0.3),
    solarWind: clamp(0.3 + seededUnit(world.id, 'flow') * 0.55),
    seismic: clamp(0.1 + narrativePressure * 0.4 + seededUnit(world.id, 'ground') * 0.2),
    affect: clamp(entity?.affectIntensity ?? 0.5),
    observationCoverage: clamp(0.45 + recent.length * 0.06),
  };
  return {
    worldId: world.id,
    entityId: entity?.id || null,
    register: 'SIMULATED',
    method: 'story-native-seeded-state-v1',
    channels,
    recentContinuityIds: recent.map((event) => event.id),
    uncertainty: Math.max(0.15, 0.65 - recent.length * 0.08),
    note: 'Simulated from world profile, selected perspective, Earth reference channels, and recent accepted continuity.',
  };
}

export function deriveToneSet({ observation, modelRun, worlds }) {
  const base = 174;
  const score = clamp(modelRun?.bridgeScore ?? 0.5);
  const active = worlds.filter((world) => observation.worldIds.includes(world.id));
  const tones = active.map((world, index) => {
    const seed = seededUnit(world.id, observation.id);
    const frequency = Math.round((base + 195 * score + 120 * seed + index * 23) * 100) / 100;
    return {
      id: `tone-${world.id}`,
      worldId: world.id,
      label: `${world.name} tone`,
      frequency,
      waveform: ['sine', 'triangle', 'sine', 'sawtooth'][index % 4],
      register: 'GENERATED',
    };
  });
  const bridgeFrequency = Math.round((mean(tones.map((tone) => tone.frequency)) || 369) * 100) / 100;
  tones.push({ id: 'tone-bridge', worldId: 'bridge', label: 'Bridge tone', frequency: bridgeFrequency, waveform: 'sine', register: 'GENERATED' });
  return { id: `tones-${stableHash({ observationId: observation.id, modelId: modelRun?.id })}`, tones, createdAt: new Date().toISOString(), register: 'GENERATED' };
}

function polarPoint(cx, cy, radius, angle) {
  return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
}

export function generateGlyphSvg({ id, label, seedInput, values = {}, colour = '#e6b86f' }) {
  const size = 512;
  const centre = size / 2;
  const seed = seededUnit(seedInput, id);
  const spokes = 6 + Math.floor(seed * 7);
  const rings = 2 + Math.floor(seededUnit(seedInput, 'rings') * 4);
  const amplitude = 0.18 + clamp(mean(Object.values(values).map(Number).filter(Number.isFinite)) ?? 0.5) * 0.42;
  const points = [];
  for (let index = 0; index < spokes; index += 1) {
    const angle = -Math.PI / 2 + (index / spokes) * Math.PI * 2;
    const radius = 98 + 95 * (0.35 + seededUnit(`${seedInput}:${index}`, 'radius') * amplitude);
    points.push(polarPoint(centre, centre, radius, angle));
  }
  const path = points.map((point, index) => `${index ? 'L' : 'M'} ${point[0].toFixed(2)} ${point[1].toFixed(2)}`).join(' ') + ' Z';
  const ringMarkup = Array.from({ length: rings }, (_, index) => {
    const radius = 55 + index * 36;
    const dash = 8 + Math.round(seededUnit(seedInput, `dash-${index}`) * 24);
    return `<circle cx="256" cy="256" r="${radius}" fill="none" stroke="${colour}" stroke-opacity="${(0.2 + index * 0.08).toFixed(2)}" stroke-width="${index === rings - 1 ? 3 : 2}" stroke-dasharray="${dash} ${Math.max(5, 34 - dash)}"/>`;
  }).join('');
  const spokeMarkup = points.map((point, index) => `<line x1="256" y1="256" x2="${point[0].toFixed(2)}" y2="${point[1].toFixed(2)}" stroke="${colour}" stroke-opacity="${(0.38 + (index % 3) * 0.12).toFixed(2)}" stroke-width="2"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="${String(label).replace(/"/g, '&quot;')}"><defs><radialGradient id="g" cx="50%" cy="50%"><stop offset="0" stop-color="#ffffff" stop-opacity="0.86"/><stop offset="0.35" stop-color="${colour}" stop-opacity="0.34"/><stop offset="1" stop-color="#07101a" stop-opacity="0"/></radialGradient></defs><rect width="512" height="512" rx="64" fill="#07101a"/><circle cx="256" cy="256" r="210" fill="url(#g)"/>${ringMarkup}${spokeMarkup}<path d="${path}" fill="${colour}" fill-opacity="0.08" stroke="${colour}" stroke-width="5"/><circle cx="256" cy="256" r="22" fill="#fff" fill-opacity="0.92" stroke="${colour}" stroke-width="6"/><text x="256" y="470" fill="#eef3f7" font-family="Georgia,serif" text-anchor="middle" font-size="22">${String(label).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text></svg>`;
  return { id, label, svg, register: 'GENERATED', lineage: { seedInput, values, algorithm: 'arkfire-polar-glyph-v1' } };
}

export function generateGlyphSet({ observation, modelRun, worlds }) {
  const active = worlds.filter((world) => observation.worldIds.includes(world.id));
  const glyphs = active.map((world) => generateGlyphSvg({
    id: `glyph-${world.id}-${stableHash(observation.id)}`,
    label: world.name,
    seedInput: { observationId: observation.id, worldId: world.id, modelId: modelRun?.id },
    values: modelRun?.scores || {},
    colour: world.colour,
  }));
  glyphs.push(generateGlyphSvg({
    id: `glyph-bridge-${stableHash(observation.id)}`,
    label: 'Arkfire Bridge',
    seedInput: { observationId: observation.id, worldIds: observation.worldIds, bridgeScore: modelRun?.bridgeScore },
    values: { ...modelRun?.scores, bridgeScore: modelRun?.bridgeScore },
    colour: '#f2c66d',
  }));
  return { id: `glyph-set-${stableHash({ observationId: observation.id, modelId: modelRun?.id })}`, createdAt: new Date().toISOString(), glyphs, register: 'GENERATED' };
}

export function selectPrompt(modelRun) {
  const score = clamp(modelRun?.bridgeScore ?? 0);
  return PROMPT_LIBRARY.find((prompt) => score >= prompt.min && score <= prompt.max) || PROMPT_LIBRARY[0];
}

export function buildPromptPackage({ project, observation, modelRun, glyphSet, toneSet, worlds, entities, continuity = [], librarySelections = [] }) {
  const selectedPrompt = selectPrompt(modelRun);
  const activeWorlds = worlds.filter((world) => observation.worldIds.includes(world.id));
  const activeEntities = entities.filter((entity) => observation.entityIds.includes(entity.id));
  const openThreads = continuity.filter((event) => event.status === 'open').slice(-20);
  const packageObject = {
    schemaVersion: ARKFIRE_SCHEMA_VERSION,
    packageType: 'arkfire-prompt-package',
    project: { id: project.id, name: project.name },
    createdAt: new Date().toISOString(),
    selectedPrompt,
    worlds: activeWorlds,
    perspectives: activeEntities,
    observation,
    modelRun,
    glyphs: glyphSet?.glyphs?.map((glyph) => ({ id: glyph.id, label: glyph.label, lineage: glyph.lineage })) || [],
    tones: toneSet?.tones || [],
    continuity: {
      recentAccepted: continuity.filter((event) => event.status === 'accepted').slice(-20),
      openThreads,
    },
    librarySelections,
    returnContract: {
      prose: true,
      affectedWorlds: [],
      affectedEntities: [],
      proposedContinuityEvents: [],
      entityStateChanges: [],
      openThreads: [],
      resolvedThreads: [],
      temporalAdvancement: null,
      canonAnchorsTouched: [],
      contradictions: [],
      uncertainty: [],
      provenance: [],
    },
    instructions: [
      'Preserve each world and perspective without flattening them into one voice.',
      'Treat measurements, simulations, derivations, and narrative interpretation as separate registers.',
      'Return proposed continuity only. Arkfire and the Steward decide what becomes authoritative.',
      'Do not manufacture metric increases. Explain what evidence supports any proposed change.',
    ],
  };
  const text = [
    `ARKFIRE PROMPT PACKAGE · ${project.name}`,
    `Selected prompt: ${selectedPrompt.title}`,
    selectedPrompt.text,
    '',
    `Worlds: ${activeWorlds.map((world) => world.name).join(' · ')}`,
    `Perspectives: ${activeEntities.map((entity) => entity.name).join(' · ')}`,
    `Bridge score: ${(modelRun?.bridgeScore ?? 0).toFixed(4)}`,
    `Resonance: ${(modelRun?.scores?.resonance ?? 0).toFixed(4)}`,
    `Coherence: ${(modelRun?.scores?.coherence ?? 0).toFixed(4)}`,
    `Entanglement: ${(modelRun?.scores?.entanglement ?? 0).toFixed(4)}`,
    '',
    'Observation:',
    JSON.stringify(observation, null, 2),
    '',
    'Recent continuity and open threads:',
    JSON.stringify(packageObject.continuity, null, 2),
    '',
    'Required return contract:',
    JSON.stringify(packageObject.returnContract, null, 2),
    '',
    packageObject.instructions.map((instruction) => `- ${instruction}`).join('\n'),
  ].join('\n');
  return { id: `prompt-${stableHash(packageObject)}`, createdAt: packageObject.createdAt, selectedPrompt, object: packageObject, text, register: 'GENERATED' };
}

export function extractContinuityProposals(narrativeText, context = {}) {
  const text = String(narrativeText || '').trim();
  if (!text) return [];
  const sentences = text.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter(Boolean);
  const candidates = sentences.filter((sentence) =>
    /\b(arriv|depart|discover|learn|realiz|give|take|lose|find|promise|vow|injur|heal|open|close|cross|remember|recogn|become|decide|agree|refus|reveal|change|remain|begin|end|resolve)\w*/i.test(sentence),
  );
  const selected = (candidates.length ? candidates : sentences).slice(0, 12);
  return selected.map((sentence, index) => ({
    id: `proposal-${stableHash({ sentence, index, sessionId: context.sessionId })}`,
    title: sentence.length > 80 ? `${sentence.slice(0, 77)}…` : sentence,
    summary: sentence,
    category: /promise|vow|agree/i.test(sentence) ? 'relational-agreement' : /arriv|depart|cross|open|close/i.test(sentence) ? 'location-or-bridge' : /learn|realiz|remember|recogn|reveal/i.test(sentence) ? 'knowledge-state' : 'continuity-event',
    worldIds: context.worldIds || [],
    entityIds: context.entityIds || [],
    sourceNarrativeId: context.narrativeId || null,
    sourceSessionId: context.sessionId || null,
    status: 'pending',
    risk: /die|destroy|permanent|irreversible|canon|kill/i.test(sentence) ? 'high' : /vow|promise|bridge|cross|reveal/i.test(sentence) ? 'medium' : 'low',
    register: 'INFERRED',
    why: 'Extracted as a possible state-changing sentence. Human review is required before continuity promotion.',
  }));
}

export function applyApproval({ proposal, decision, editedSummary, decidedBy = 'rowan', decidedAt = new Date().toISOString() }) {
  const normalised = String(decision || '').toUpperCase();
  const statusMap = {
    A: 'accepted',
    ACCEPT: 'accepted',
    APPROVE: 'accepted',
    B: 'sandbox',
    SANDBOX: 'sandbox',
    C: 'candidate',
    CANDIDATE: 'candidate',
    D: 'deferred',
    DEFER: 'deferred',
    E: 'rejected',
    DENY: 'rejected',
    F: 'blocked',
    BLOCK: 'blocked',
    G: 'needs-evidence',
    EVIDENCE: 'needs-evidence',
  };
  const status = statusMap[normalised] || 'pending';
  return {
    ...proposal,
    summary: editedSummary?.trim() || proposal.summary,
    status,
    decision: normalised,
    decidedBy,
    decidedAt,
    authoritative: status === 'accepted',
  };
}

export function buildAgentPrompt({ role, task, session, evidence, constraints = [] }) {
  return [
    `You are acting as ${role} inside Arkfire Dimensional World Bridge.`,
    'Return a concise structured review. Distinguish source registers and preserve contradiction.',
    'You may propose changes, but Rowan is the final Steward and no proposal is self-applying.',
    `Task: ${task}`,
    `Session: ${JSON.stringify(session, null, 2)}`,
    `Evidence: ${JSON.stringify(evidence, null, 2)}`,
    constraints.length ? `Constraints:\n${constraints.map((constraint) => `- ${constraint}`).join('\n')}` : '',
    'End with: FINDINGS, RISKS, PROPOSALS, EVIDENCE GAPS, SIGN-OFF.',
  ].filter(Boolean).join('\n\n');
}

export function deterministicAgentFallback({ agentId, task, session, evidence }) {
  const bridgeScore = Number(evidence?.modelRun?.bridgeScore ?? 0);
  const pending = Number(evidence?.proposals?.length ?? 0);
  const base = {
    agentId,
    provider: 'deterministic-fallback',
    createdAt: new Date().toISOString(),
    task,
    register: 'GENERATED',
  };
  if (agentId === 'boxfire') {
    return { ...base, findings: [`${pending} proposal(s) await Steward review.`, `Bridge score ${bridgeScore.toFixed(4)} is traceable to the attached model run.`], risks: pending > 8 ? ['Large proposal batch may conceal unrelated changes. Split before approval.'] : [], proposals: ['Verify every accepted change preserves source and session IDs.'], signOff: pending ? 'CONDITIONAL' : 'PASS' };
  }
  if (agentId === 'vee') {
    return { ...base, findings: ['Continuity must preserve world-specific perspectives and unresolved contradictions.', `${session?.worldIds?.length || 0} world perspectives are active.`], risks: [], proposals: ['Keep accepted events linked to the narrative return and each observing perspective.'], signOff: 'REPRESENTATION_REVIEWED' };
  }
  if (agentId === 'faer') {
    return { ...base, findings: ['Participation and record authority remain distinct.', 'No generated narrative may silently become canon.'], risks: [], proposals: ['Escalate high-risk relational or identity changes to explicit review.'], signOff: 'BOUNDARIES_REVIEWED' };
  }
  if (agentId === 'nikola') {
    return { ...base, findings: ['The loop is complete only when accepted results alter the next baseline.', 'Measurement and symbolic translation must remain separately inspectable.'], risks: [], proposals: ['Preserve raw inputs before every transformation and test restart continuity.'], signOff: 'ARCHITECTURE_REVIEWED' };
  }
  return { ...base, findings: ['Evidence packet assembled.'], risks: [], proposals: ['Proceed only through the approval gate.'], signOff: 'REVIEWED' };
}

export function validateAuditChain(entries) {
  let previous = 'GENESIS';
  const errors = [];
  for (const [index, entry] of entries.entries()) {
    if (entry.previousHash !== previous) errors.push({ index, id: entry.id, error: 'previous-hash-mismatch' });
    const expected = stableHash({ sequence: entry.sequence, at: entry.at, actor: entry.actor, action: entry.action, payloadHash: entry.payloadHash, previousHash: entry.previousHash });
    if (entry.hash !== expected) errors.push({ index, id: entry.id, error: 'hash-mismatch' });
    previous = entry.hash;
  }
  return { valid: errors.length === 0, errors, lastHash: previous };
}

export function appendAuditEntry(entries, { actor, action, payload }) {
  const previousHash = entries.length ? entries[entries.length - 1].hash : 'GENESIS';
  const at = new Date().toISOString();
  const sequence = entries.length;
  const payloadHash = stableHash(payload);
  const hash = stableHash({ sequence, at, actor, action, payloadHash, previousHash });
  return [...entries, { id: `audit-${sequence}-${hash}`, sequence, at, actor, action, payloadHash, previousHash, hash }];
}

export function createProjectSeed(name = 'Arkfire House Project') {
  const id = `project-${stableHash({ name, createdAt: Date.now() })}`;
  return {
    id,
    name,
    schemaVersion: ARKFIRE_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    activeWorldIds: ['waking-earth', 'terra-aeterna'],
    activeEntityIds: ['rowan', 'falka'],
    canonAlignment: 'canon-guided',
    variationBudget: 0.2,
    automaticAcceptanceCeiling: 'none',
    status: 'active',
  };
}
