export const CODEX_CELESTIAL_SPHERE_SCHEMA = 'hearthweave.codex-celestial-sphere/v0.1';
export const CODEX_CELESTIAL_SPHERE_METHOD = 'astronomia-geocentric-equatorial/v0.1';

const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;

const PLANETS = Object.freeze([
  Object.freeze({ id: 'mercury', label: 'Mercury' }),
  Object.freeze({ id: 'venus', label: 'Venus' }),
  Object.freeze({ id: 'mars', label: 'Mars' }),
  Object.freeze({ id: 'jupiter', label: 'Jupiter' }),
  Object.freeze({ id: 'saturn', label: 'Saturn' }),
  Object.freeze({ id: 'uranus', label: 'Uranus' }),
  Object.freeze({ id: 'neptune', label: 'Neptune' }),
]);

const DATA_IMPORTS = Object.freeze({
  mercury: () => import('astronomia/data/vsop87Dmercury'),
  venus: () => import('astronomia/data/vsop87Dvenus'),
  mars: () => import('astronomia/data/vsop87Dmars'),
  jupiter: () => import('astronomia/data/vsop87Djupiter'),
  saturn: () => import('astronomia/data/vsop87Dsaturn'),
  uranus: () => import('astronomia/data/vsop87Duranus'),
  neptune: () => import('astronomia/data/vsop87Dneptune'),
});

const unwrapDefault = (module) => module?.default || module;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value, places = 6) => {
  const factor = 10 ** places;
  const result = Math.round(Number(value) * factor) / factor;
  return Object.is(result, -0) ? 0 : result;
};
const normaliseDegrees = (value) => {
  const angle = Number(value) % 360;
  return angle < 0 ? angle + 360 : angle;
};

export function equatorialUnitVector({ rightAscensionDegrees, declinationDegrees } = {}) {
  const ra = Number(rightAscensionDegrees) * DEG_TO_RAD;
  const dec = Number(declinationDegrees) * DEG_TO_RAD;
  if (![ra, dec].every(Number.isFinite)) throw new TypeError('CODEX_CELESTIAL_SPHERE: finite equatorial coordinates are required');
  const cosDec = Math.cos(dec);
  return Object.freeze({
    x: cosDec * Math.cos(ra),
    y: Math.sin(dec),
    z: cosDec * Math.sin(ra),
  });
}

export function projectCelestialVector(vector, { yawDegrees = 0, pitchDegrees = 0 } = {}) {
  const x = Number(vector?.x);
  const y = Number(vector?.y);
  const z = Number(vector?.z);
  if (![x, y, z].every(Number.isFinite)) throw new TypeError('CODEX_CELESTIAL_SPHERE: finite unit vector is required');

  const yaw = Number(yawDegrees) * DEG_TO_RAD;
  const pitch = clamp(Number(pitchDegrees), -89.9, 89.9) * DEG_TO_RAD;
  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const x1 = x * cosYaw + z * sinYaw;
  const z1 = -x * sinYaw + z * cosYaw;
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);
  const y2 = y * cosPitch - z1 * sinPitch;
  const z2 = y * sinPitch + z1 * cosPitch;

  return Object.freeze({ x: x1, y: y2, depth: z2, visible: z2 >= 0 });
}

export async function createCodexCelestialSphereState({ at = Date.now() } = {}) {
  const instant = at instanceof Date ? at : new Date(at);
  if (!Number.isFinite(instant.getTime())) throw new TypeError('CODEX_CELESTIAL_SPHERE: invalid selected time');

  const [{ CalendarGregorian }, planetposition, elliptic, solar, earthModule, ...planetModules] = await Promise.all([
    import('astronomia/julian'),
    import('astronomia/planetposition'),
    import('astronomia/elliptic'),
    import('astronomia/solar'),
    import('astronomia/data/vsop87Dearth'),
    ...PLANETS.map((planet) => DATA_IMPORTS[planet.id]()),
  ]);

  const jde = new CalendarGregorian(instant).toJDE();
  const earth = new planetposition.Planet(unwrapDefault(earthModule));
  const sunEq = solar.apparentEquatorialVSOP87(earth, jde);

  const sun = makeBody('sun', 'Sun', sunEq.ra, sunEq.dec);
  const planets = PLANETS.map((planet, index) => {
    const engine = new planetposition.Planet(unwrapDefault(planetModules[index]));
    const eq = elliptic.position(engine, earth, jde);
    return makeBody(planet.id, planet.label, eq.ra, eq.dec);
  });

  return Object.freeze({
    schema: CODEX_CELESTIAL_SPHERE_SCHEMA,
    method: CODEX_CELESTIAL_SPHERE_METHOD,
    selectedAt: instant.toISOString(),
    jde: round(jde, 8),
    observer: Object.freeze({ frame: 'geocentric-equatorial', origin: 'Earth centre' }),
    bodies: Object.freeze([sun, ...planets]),
    source: Object.freeze({
      provider: 'astronomia@^4.2.0',
      planetMethod: 'elliptic.position with VSOP87D planets and Earth',
      sunMethod: 'solar.apparentEquatorialVSOP87',
      networkRequired: false,
    }),
    catalogue: Object.freeze({
      starsIncluded: false,
      note: 'v0.1 deliberately excludes stars until a catalogue with explicit provenance and licence is selected.',
    }),
    authority: 'apparent geocentric equatorial solar-system positions for an interactive celestial sphere; not an observer-local horizon map',
  });
}

function makeBody(id, label, raRadians, decRadians) {
  const rightAscensionDegrees = normaliseDegrees(Number(raRadians) * RAD_TO_DEG);
  const declinationDegrees = Number(decRadians) * RAD_TO_DEG;
  const vector = equatorialUnitVector({ rightAscensionDegrees, declinationDegrees });
  return Object.freeze({
    id,
    label,
    rightAscensionDegrees: round(rightAscensionDegrees),
    declinationDegrees: round(declinationDegrees),
    vector: Object.freeze({ x: round(vector.x), y: round(vector.y), z: round(vector.z) }),
  });
}

export function codexCelestialBody(state, bodyId) {
  const id = String(bodyId || '').trim().toLowerCase();
  return state?.bodies?.find?.((body) => body.id === id) || null;
}
