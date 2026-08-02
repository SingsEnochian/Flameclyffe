export const CANON_LIBRARY_MANIFEST_SCHEMA = 'hearthgate.canon-library-manifest/v1';
export const CANON_LIBRARY_RECEIPT_SCHEMA = 'hearthgate.canon-library-receipt/v1';

const REQUIRED_STREAMS = Object.freeze([
  'entities',
  'relationships',
  'timeline',
  'categories',
  'redirects',
  'verification',
]);

function requiredString(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
}

function nonNegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${label} must be a non-negative integer.`);
  return value;
}

export function validateCanonLibraryManifest(input) {
  const manifest = structuredClone(input);
  if (manifest?.schema !== CANON_LIBRARY_MANIFEST_SCHEMA) {
    throw new Error(`Unsupported canon library schema: ${manifest?.schema || 'missing'}.`);
  }
  const house = manifest.house || {};
  house.id = requiredString(house.id, 'house.id');
  house.foundation = requiredString(house.foundation, 'house.foundation');
  house.overlay = house.overlay == null ? null : requiredString(house.overlay, 'house.overlay');
  if (house.foundation === house.overlay) throw new Error('Canon foundation and overlay must remain distinct.');
  if (manifest.canon_law?.overwrite_source_canon !== false) {
    throw new Error('Canon library must explicitly forbid source-canon overwrite.');
  }
  if (manifest.canon_law?.provenance_required !== true) {
    throw new Error('Canon library must require provenance.');
  }
  const counts = manifest.counts || {};
  for (const key of ['source_pages', 'entities', 'relationships', 'timeline_claims']) {
    counts[key] = nonNegativeInteger(counts[key], `counts.${key}`);
  }
  const streams = manifest.streams || {};
  for (const key of REQUIRED_STREAMS) {
    const stream = streams[key];
    if (!stream || typeof stream !== 'object') throw new Error(`streams.${key} is required.`);
    stream.path = requiredString(stream.path, `streams.${key}.path`);
    stream.sha256 = requiredString(stream.sha256, `streams.${key}.sha256`);
  }
  manifest.package_id = requiredString(manifest.package_id, 'package_id');
  manifest.version = requiredString(manifest.version, 'version');
  manifest.house = house;
  manifest.counts = counts;
  manifest.streams = streams;
  return Object.freeze(manifest);
}

export function createCanonLibraryReceipt({ manifest, operation, direction, status, detail = {} }) {
  const validated = validateCanonLibraryManifest(manifest);
  return Object.freeze({
    schema: CANON_LIBRARY_RECEIPT_SCHEMA,
    receipt_id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    package_id: validated.package_id,
    package_version: validated.version,
    house: validated.house,
    operation: requiredString(operation, 'operation'),
    direction: requiredString(direction, 'direction'),
    status: requiredString(status, 'status'),
    counts: validated.counts,
    canon_law: validated.canon_law,
    detail: structuredClone(detail),
  });
}
