import { BARBAULT_BODIES, normalizeLongitude } from './barbault.js';
import { signDegreeFromLongitude } from './aspects.js';

export const EPHEMERIS_PROVIDERS = {
  manual: 'manual_longitudes',
  future: 'future_calculated_ephemeris',
};

export function createManualEphemerisState({ longitudes = {}, target_timestamp, timezone, source_note } = {}) {
  const positions = BARBAULT_BODIES.reduce((next, body) => {
    if (!(body in longitudes)) {
      throw new Error(`Manual ephemeris missing longitude for ${body}`);
    }

    const longitude = Number(normalizeLongitude(longitudes[body]).toFixed(3));
    next[body] = {
      body,
      longitude,
      ...signDegreeFromLongitude(longitude),
      retrograde: null,
      speed: null,
      latitude: null,
      source: EPHEMERIS_PROVIDERS.manual,
    };
    return next;
  }, {});

  return {
    provider: EPHEMERIS_PROVIDERS.manual,
    calculation_status: 'manual_input_only',
    target_timestamp,
    timezone,
    source_note: source_note || 'Manual longitude inputs. No live ephemeris calculation is performed in SCFE v0.2 seed.',
    bodies: BARBAULT_BODIES,
    positions,
    warnings: [
      'Manual values must be independently verified before research or ritual interpretation.',
      'Future ephemeris providers should write to this shape without changing downstream consumers.',
    ],
  };
}

export function getLongitudesFromEphemeris(ephemeris) {
  return Object.fromEntries(
    BARBAULT_BODIES.map((body) => [body, ephemeris.positions[body].longitude])
  );
}
