export const CODEX_ASTROLABE_READING_SCHEMA = 'hearthweave.codex-astrolabe-reading/v0.1';
export const CODEX_ASTROLABE_METHOD = 'independent-solar-observing-plate/v0.1';

const DAY_MS = 86_400_000;
const J2000 = 2_451_545.0;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const rad = (degrees) => degrees * Math.PI / 180;
const deg = (radians) => radians * 180 / Math.PI;

export function normaliseDegrees(value) {
  const angle = Number(value) % 360;
  return angle < 0 ? angle + 360 : angle;
}

export function julianDate(value = Date.now()) {
  const ms = value instanceof Date ? value.getTime() : Number(value);
  if (!Number.isFinite(ms)) throw new TypeError('CODEX_ASTROLABE: a finite instant is required');
  return ms / DAY_MS + 2_440_587.5;
}

export function greenwichMeanSiderealDegrees(value = Date.now()) {
  const jd = julianDate(value);
  const d = jd - J2000;
  const t = d / 36_525;
  return normaliseDegrees(
    280.46061837
      + 360.98564736629 * d
      + 0.000387933 * t * t
      - (t * t * t) / 38_710_000,
  );
}

export function localSiderealDegrees(value, longitudeDegrees = 0) {
  const longitude = Number(longitudeDegrees);
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new RangeError('CODEX_ASTROLABE: longitude must be between -180 and 180 degrees');
  }
  return normaliseDegrees(greenwichMeanSiderealDegrees(value) + longitude);
}

export function approximateSunEquatorial(value = Date.now()) {
  const jd = julianDate(value);
  const n = jd - J2000;
  const meanLongitude = normaliseDegrees(280.460 + 0.9856474 * n);
  const meanAnomaly = normaliseDegrees(357.528 + 0.9856003 * n);
  const g = rad(meanAnomaly);
  const eclipticLongitude = normaliseDegrees(meanLongitude + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g));
  const lambda = rad(eclipticLongitude);
  const obliquity = rad(23.439 - 0.0000004 * n);
  const rightAscensionDegrees = normaliseDegrees(deg(Math.atan2(Math.cos(obliquity) * Math.sin(lambda), Math.cos(lambda))));
  const declinationDegrees = deg(Math.asin(Math.sin(obliquity) * Math.sin(lambda)));

  return Object.freeze({
    rightAscensionDegrees,
    declinationDegrees,
    eclipticLongitudeDegrees: eclipticLongitude,
  });
}

export function equatorialToHorizontal({
  rightAscensionDegrees,
  declinationDegrees,
  latitudeDegrees,
  localSiderealDegrees: siderealDegrees,
} = {}) {
  const latitude = Number(latitudeDegrees);
  const rightAscension = Number(rightAscensionDegrees);
  const declination = Number(declinationDegrees);
  const sidereal = Number(siderealDegrees);

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new RangeError('CODEX_ASTROLABE: latitude must be between -90 and 90 degrees');
  }
  if (![rightAscension, declination, sidereal].every(Number.isFinite)) {
    throw new TypeError('CODEX_ASTROLABE: equatorial coordinates and sidereal angle are required');
  }

  const phi = rad(latitude);
  const delta = rad(declination);
  const hourAngleDegrees = normaliseDegrees(sidereal - rightAscension);
  const hourAngleSigned = hourAngleDegrees > 180 ? hourAngleDegrees - 360 : hourAngleDegrees;
  const h = rad(hourAngleSigned);
  const sinAltitude = clamp(
    Math.sin(delta) * Math.sin(phi) + Math.cos(delta) * Math.cos(phi) * Math.cos(h),
    -1,
    1,
  );
  const altitudeDegrees = deg(Math.asin(sinAltitude));
  const azimuthDegrees = normaliseDegrees(
    deg(Math.atan2(
      Math.sin(h),
      Math.cos(h) * Math.sin(phi) - Math.tan(delta) * Math.cos(phi),
    )) + 180,
  );

  return Object.freeze({
    hourAngleDegrees: hourAngleSigned,
    altitudeDegrees,
    azimuthDegrees,
  });
}

function rounded(value, places = 6) {
  const factor = 10 ** places;
  return Math.round(Number(value) * factor) / factor;
}

export function buildCodexAstrolabeReading({
  at = Date.now(),
  latitudeDegrees,
  longitudeDegrees,
} = {}) {
  const instant = at instanceof Date ? at : new Date(at);
  if (!Number.isFinite(instant.getTime())) throw new TypeError('CODEX_ASTROLABE: invalid observation time');

  const latitude = Number(latitudeDegrees);
  const longitude = Number(longitudeDegrees);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new RangeError('CODEX_ASTROLABE: latitude must be between -90 and 90 degrees');
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new RangeError('CODEX_ASTROLABE: longitude must be between -180 and 180 degrees');
  }

  const jd = julianDate(instant);
  const gmst = greenwichMeanSiderealDegrees(instant);
  const lst = localSiderealDegrees(instant, longitude);
  const sun = approximateSunEquatorial(instant);
  const horizontal = equatorialToHorizontal({
    rightAscensionDegrees: sun.rightAscensionDegrees,
    declinationDegrees: sun.declinationDegrees,
    latitudeDegrees: latitude,
    localSiderealDegrees: lst,
  });

  return Object.freeze({
    schema: CODEX_ASTROLABE_READING_SCHEMA,
    method: CODEX_ASTROLABE_METHOD,
    observedAt: instant.toISOString(),
    observer: Object.freeze({
      latitudeDegrees: rounded(latitude),
      longitudeDegrees: rounded(longitude),
    }),
    time: Object.freeze({
      julianDate: rounded(jd, 8),
      greenwichMeanSiderealDegrees: rounded(gmst),
      localSiderealDegrees: rounded(lst),
    }),
    sun: Object.freeze({
      rightAscensionDegrees: rounded(sun.rightAscensionDegrees),
      declinationDegrees: rounded(sun.declinationDegrees),
      eclipticLongitudeDegrees: rounded(sun.eclipticLongitudeDegrees),
      hourAngleDegrees: rounded(horizontal.hourAngleDegrees),
      altitudeDegrees: rounded(horizontal.altitudeDegrees),
      azimuthDegrees: rounded(horizontal.azimuthDegrees),
      aboveHorizon: horizontal.altitudeDegrees > 0,
    }),
    authority: 'approximate astronomical computation; not a historical-instrument reconstruction or navigation-grade ephemeris',
  });
}
