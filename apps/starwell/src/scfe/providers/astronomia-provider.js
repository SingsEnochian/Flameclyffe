import { signDegreeFromLongitude } from '../aspects.js';
import { BARBAULT_BODIES, normalizeLongitude } from '../barbault.js';
import { EPHEMERIS_PROVIDERS } from '../ephemeris.js';

const RAD_TO_DEG = 180 / Math.PI;
const FULL_CIRCLE = 360;

const PLANET_DATA_IMPORTS = {
  jupiter: () => import('astronomia/data/vsop87Djupiter'),
  saturn: () => import('astronomia/data/vsop87Dsaturn'),
  uranus: () => import('astronomia/data/vsop87Duranus'),
  neptune: () => import('astronomia/data/vsop87Dneptune'),
};

export async function createAstronomiaEphemerisState({ target_timestamp, timezone = 'UTC' } = {}) {
  const targetDate = new Date(target_timestamp);
  if (Number.isNaN(targetDate.getTime())) {
    throw new Error(`Invalid target timestamp for astronomia provider: ${target_timestamp}`);
  }

  const [{ CalendarGregorian }, planetposition, earthModule, pluto] = await Promise.all([
    import('astronomia/julian'),
    import('astronomia/planetposition'),
    import('astronomia/data/vsop87Dearth'),
    import('astronomia/pluto'),
  ]);

  const earth = new planetposition.Planet(unwrapDefault(earthModule));
  const jde = new CalendarGregorian(targetDate).toJDE();
  const positions = {};

  for (const body of BARBAULT_BODIES) {
    const ecliptic = body === 'pluto'
      ? getGeocentricEcliptic(pluto.heliocentric(jde), earth.position(jde))
      : getGeocentricEcliptic(
        new planetposition.Planet(unwrapDefault(await PLANET_DATA_IMPORTS[body]())).position(jde),
        earth.position(jde)
      );

    const longitude = normalizeDegrees(ecliptic.longitude);
    positions[body] = {
      body,
      longitude: Number(longitude.toFixed(3)),
      ...signDegreeFromLongitude(longitude),
      latitude: Number(ecliptic.latitude.toFixed(6)),
      retrograde: null,
      speed: null,
      source: EPHEMERIS_PROVIDERS.astronomia,
    };
  }

  return {
    provider: EPHEMERIS_PROVIDERS.astronomia,
    calculation_status: 'calculated',
    target_timestamp,
    timezone,
    provider_version: 'astronomia@^4.2.0',
    algorithm_note: 'Meeus/VSOP87-derived calculation via astronomia. Pluto uses the package Pluto module. Treat as provider output requiring fixture validation before interpretive use.',
    source_note: 'Calculated locally with astronomia; no network request is made by this provider.',
    bodies: BARBAULT_BODIES,
    positions,
    warnings: [
      'Provider output must be compared against reference fixtures before replacing manual research inputs.',
      'Retrograde and speed are not calculated in this scaffold.',
    ],
  };
}

export function normalizeDegrees(degrees) {
  const normalized = degrees % FULL_CIRCLE;
  return normalizeLongitude(normalized < 0 ? normalized + FULL_CIRCLE : normalized);
}

export function radiansToDegrees(radians) {
  return radians * RAD_TO_DEG;
}

export function getGeocentricEcliptic(planetPosition, earthPosition) {
  const planetVector = toRectangular(planetPosition);
  const earthVector = toRectangular(earthPosition);
  const x = planetVector.x - earthVector.x;
  const y = planetVector.y - earthVector.y;
  const z = planetVector.z - earthVector.z;
  const longitude = radiansToDegrees(Math.atan2(y, x));
  const latitude = radiansToDegrees(Math.atan2(z, Math.hypot(x, y)));

  return { longitude, latitude };
}

function toRectangular(position) {
  const cosLat = Math.cos(position.lat);
  return {
    x: position.range * cosLat * Math.cos(position.lon),
    y: position.range * cosLat * Math.sin(position.lon),
    z: position.range * Math.sin(position.lat),
  };
}

function unwrapDefault(module) {
  return module.default || module;
}
