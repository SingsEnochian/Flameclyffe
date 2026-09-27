export const CODEX_ORRERY_STATE_SCHEMA = 'hearthweave.codex-orrery-state/v0.1';
export const CODEX_ORRERY_METHOD = 'astronomia-vsop87-heliocentric/v0.1';

const RAD_TO_DEG = 180 / Math.PI;
const MAX_DISPLAY_AU = 31;

const PLANETS = Object.freeze([
  Object.freeze({ id: 'mercury', label: 'Mercury', data: 'vsop87Dmercury' }),
  Object.freeze({ id: 'venus', label: 'Venus', data: 'vsop87Dvenus' }),
  Object.freeze({ id: 'earth', label: 'Earth', data: 'vsop87Dearth' }),
  Object.freeze({ id: 'mars', label: 'Mars', data: 'vsop87Dmars' }),
  Object.freeze({ id: 'jupiter', label: 'Jupiter', data: 'vsop87Djupiter' }),
  Object.freeze({ id: 'saturn', label: 'Saturn', data: 'vsop87Dsaturn' }),
  Object.freeze({ id: 'uranus', label: 'Uranus', data: 'vsop87Duranus' }),
  Object.freeze({ id: 'neptune', label: 'Neptune', data: 'vsop87Dneptune' }),
]);

const DATA_IMPORTS = Object.freeze({
  mercury: () => import('astronomia/data/vsop87Dmercury'),
  venus: () => import('astronomia/data/vsop87Dvenus'),
  earth: () => import('astronomia/data/vsop87Dearth'),
  mars: () => import('astronomia/data/vsop87Dmars'),
  jupiter: () => import('astronomia/data/vsop87Djupiter'),
  saturn: () => import('astronomia/data/vsop87Dsaturn'),
  uranus: () => import('astronomia/data/vsop87Duranus'),
  neptune: () => import('astronomia/data/vsop87Dneptune'),
});

const normaliseDegrees = (value) => {
  const angle = Number(value) % 360;
  return angle < 0 ? angle + 360 : angle;
};

const round = (value, places = 6) => {
  const factor = 10 ** places;
  const result = Math.round(Number(value) * factor) / factor;
  return Object.is(result, -0) ? 0 : result;
};

const unwrapDefault = (module) => module?.default || module;

export function heliocentricRectangular({ lon, lat, range } = {}) {
  const longitude = Number(lon);
  const latitude = Number(lat);
  const radius = Number(range);
  if (![longitude, latitude, radius].every(Number.isFinite) || radius < 0) {
    throw new TypeError('CODEX_ORRERY: finite heliocentric spherical coordinates are required');
  }
  const cosLat = Math.cos(latitude);
  return Object.freeze({
    xAU: radius * cosLat * Math.cos(longitude),
    yAU: radius * cosLat * Math.sin(longitude),
    zAU: radius * Math.sin(latitude),
  });
}

export function compressedOrreryRadius(rangeAU) {
  const radius = Math.max(0, Number(rangeAU));
  if (!Number.isFinite(radius)) throw new TypeError('CODEX_ORRERY: finite orbital radius is required');
  if (radius === 0) return 0;
  return Math.min(1, Math.sqrt(radius / MAX_DISPLAY_AU));
}

export async function createCodexOrreryState({ at = Date.now() } = {}) {
  const instant = at instanceof Date ? at : new Date(at);
  if (!Number.isFinite(instant.getTime())) throw new TypeError('CODEX_ORRERY: invalid selected time');

  const [{ CalendarGregorian }, planetposition, ...datasets] = await Promise.all([
    import('astronomia/julian'),
    import('astronomia/planetposition'),
    ...PLANETS.map((planet) => DATA_IMPORTS[planet.id]()),
  ]);

  const jde = new CalendarGregorian(instant).toJDE();
  const bodies = PLANETS.map((planet, index) => {
    const engine = new planetposition.Planet(unwrapDefault(datasets[index]));
    const spherical = engine.position(jde);
    const rectangular = heliocentricRectangular(spherical);
    const rangeAU = Number(spherical.range);
    const displayRadius = compressedOrreryRadius(rangeAU);
    const planarAngle = Math.atan2(rectangular.yAU, rectangular.xAU);

    return Object.freeze({
      id: planet.id,
      label: planet.label,
      longitudeDegrees: round(normaliseDegrees(Number(spherical.lon) * RAD_TO_DEG)),
      latitudeDegrees: round(Number(spherical.lat) * RAD_TO_DEG),
      rangeAU: round(rangeAU),
      xAU: round(rectangular.xAU),
      yAU: round(rectangular.yAU),
      zAU: round(rectangular.zAU),
      display: Object.freeze({
        radius: round(displayRadius),
        x: round(Math.cos(planarAngle) * displayRadius),
        y: round(Math.sin(planarAngle) * displayRadius),
        scale: 'sqrt-heliocentric-range',
      }),
    });
  });

  return Object.freeze({
    schema: CODEX_ORRERY_STATE_SCHEMA,
    method: CODEX_ORRERY_METHOD,
    selectedAt: instant.toISOString(),
    jde: round(jde, 8),
    centre: Object.freeze({ id: 'sun', label: 'Sun', xAU: 0, yAU: 0, zAU: 0 }),
    bodies: Object.freeze(bodies),
    displayScale: Object.freeze({
      kind: 'compressed',
      formula: 'sqrt(rangeAU / 31)',
      maximumReferenceAU: MAX_DISPLAY_AU,
      note: 'Display radius is compressed for a single Codex plate. Numeric AU values remain physical heliocentric ranges.',
    }),
    source: Object.freeze({
      provider: 'astronomia@^4.2.0',
      theory: 'VSOP87D heliocentric planetary position',
      networkRequired: false,
    }),
    authority: 'calculated astronomical state for an interactive orrery; display geometry is intentionally compressed and is not a to-scale solar-system model',
  });
}

export function codexOrreryBody(state, bodyId) {
  const id = String(bodyId || '').trim().toLowerCase();
  if (id === 'sun') return state?.centre || null;
  return state?.bodies?.find?.((body) => body.id === id) || null;
}
