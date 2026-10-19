// One navigation contract for the ArcSweep and Wayglass sibling applications.
// A URL is a route hint only: never a continuation deed, auth grant, identity or canon.
export const ARCSWEEP_WAYGLASS_PASSAGE_SCHEMA = 'hearthgate.arcsweep-wayglass-passage/v1';
export const WAYGLASS_SOURCE_AS_OF = '2026-10-19';

export const WAYGLASS_SOURCE_NOTES = Object.freeze([
  Object.freeze({
    label: 'Maintained Wayglass source',
    status: 'Consolidated branch · release pending',
    url: 'https://github.com/SingsEnochian/Flameclyffe/blob/wayglass/current/WAYGLASS_CURRENT.md',
  }),
  Object.freeze({
    label: 'Harmonic Observatory and mathematics',
    status: 'PR #474 · proposed integration, device review pending',
    url: 'https://github.com/SingsEnochian/Flameclyffe/pull/474',
  }),
  Object.freeze({
    label: 'Continuity Ledger and verified-source audit',
    status: 'PR #475 · local/CI evidence, live endpoint unverified',
    url: 'https://github.com/SingsEnochian/Flameclyffe/pull/475',
  }),
  Object.freeze({
    label: 'Living Inquiry Loom',
    status: 'PR #478 · draft, independent crew return pending',
    url: 'https://github.com/SingsEnochian/Flameclyffe/pull/478',
  }),
  Object.freeze({
    label: 'Bluebird route authorisation repair',
    status: 'PR #479 · proposed, live provider reply unverified',
    url: 'https://github.com/SingsEnochian/Flameclyffe/pull/479',
  }),
]);

const WORLD_ID = /^[a-z0-9][a-z0-9:._-]{0,127}$/i;
const DEV_PORTS = Object.freeze({
  arcsweep: Object.freeze({ '5186': '5184', '4186': '4184' }),
  wayglass: Object.freeze({ '5184': '5186', '4184': '4186' }),
});

function siblingUrl(currentHref, target) {
  const current = new URL(currentHref);
  if (!['http:', 'https:', 'file:'].includes(current.protocol)) throw new TypeError('Unsupported passage origin');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(current.hostname);
  const mappedPort = local ? DEV_PORTS[target]?.[current.port] : null;
  if (mappedPort) {
    const next = new URL(current.href);
    next.port = mappedPort;
    next.pathname = '/';
    next.search = '';
    next.hash = '';
    return next;
  }
  // Packaged Hearthgate mounts both applications in sibling directories.
  return new URL(`../${target}/`, current);
}

export function validPassageWorldId(value) {
  return typeof value === 'string' && WORLD_ID.test(value);
}

export function buildWayglassPassageUrl(currentHref, worldId = '') {
  const url = siblingUrl(currentHref, 'wayglass');
  url.searchParams.set('room', 'writing');
  url.searchParams.set('from', 'arcsweep');
  if (validPassageWorldId(worldId)) url.searchParams.set('world', worldId);
  return url.href;
}

export function buildArcSweepReturnUrl(currentHref) {
  // Never consume a URL from query parameters as a return destination.
  return siblingUrl(currentHref, 'arcsweep').href;
}

export function readArcSweepArrival(search = '') {
  const params = new URLSearchParams(String(search).replace(/^\?/, ''));
  if (params.get('from') !== 'arcsweep') return null;
  const worldId = params.get('world');
  return Object.freeze({
    schema: ARCSWEEP_WAYGLASS_PASSAGE_SCHEMA,
    source: 'arcsweep',
    source_world_id: validPassageWorldId(worldId) ? worldId : null,
    authority: 'navigation-hint-only',
    imported_records: 0,
  });
}
