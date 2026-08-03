export const IPAD_SOMATIC_LINEAGE_SCHEMA = 'hearthgate.ipad-somatic-lineage/v1';
export const IPAD_SOMATIC_LINEAGE_STORAGE_KEY = 'hearthgate.ipad-somatic-lineage.active.v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`IPAD_SOMATIC_LINEAGE: ${message}`);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function copy(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function requireString(value, field) {
  invariant(typeof value === 'string' && value.trim() !== '', `${field} is required`);
  return value.trim();
}

function requireDateTime(value, field) {
  const date = new Date(value);
  invariant(!Number.isNaN(date.getTime()), `${field} must be a valid date-time`);
  return date.toISOString();
}

export function buildIPadSomaticLineage(packetInput) {
  invariant(packetInput && typeof packetInput === 'object' && !Array.isArray(packetInput), 'DualAspectPacket is required');
  const packet = copy(packetInput);
  const compressionReceipt = packet.observable?.compression_release?.receipt;
  const packetWorld = requireString(packet.identity?.world_slug, 'identity.world_slug');
  const houseId = requireString(packet.identity?.house_id, 'identity.house_id');
  const packetId = requireString(packet.packet_id, 'packet_id');
  const packetFingerprint = requireString(packet.packet_fingerprint, 'packet_fingerprint');
  const sharedStateFingerprint = requireString(
    packet.correspondence?.shared_state_fingerprint,
    'correspondence.shared_state_fingerprint',
  );
  const compressionReceiptId = requireString(
    packet.provenance?.compression_release_receipt_id,
    'provenance.compression_release_receipt_id',
  );
  invariant(
    compressionReceipt?.receipt_id === compressionReceiptId,
    'compression receipt and provenance receipt do not match',
  );
  invariant(
    packet.temporal?.compression_release?.law === 'compression-release-compression-of-release-infinite-recursion',
    'packet does not carry the compression-release recurrence law',
  );
  invariant(packet.claims?.compression_release === 'Verified', 'compression-release claim is not Verified');

  return deepFreeze({
    schema: IPAD_SOMATIC_LINEAGE_SCHEMA,
    status: 'active',
    world_id: packetWorld,
    house_id: houseId,
    session_context_id: requireString(packet.identity?.session_context_id, 'identity.session_context_id'),
    dual_aspect_packet_id: packetId,
    dual_aspect_packet_fingerprint: packetFingerprint,
    shared_state_fingerprint: sharedStateFingerprint,
    compression_release_receipt_id: compressionReceiptId,
    compression_cycle: packet.temporal.compression_release.cycle,
    next_operation: requireString(packet.temporal.compression_release.next_operation, 'temporal.compression_release.next_operation'),
    premaq_id: requireString(packet.observable?.premaq?.id, 'observable.premaq.id'),
    premaq_receipt_id: requireString(packet.observable?.premaq?.receipt_id, 'observable.premaq.receipt_id'),
    bridge_packet_id: requireString(packet.observable?.bridge?.bridge_packet_id, 'observable.bridge.bridge_packet_id'),
    activated_at: requireDateTime(packet.temporal?.activated_at, 'temporal.activated_at'),
    law: 'compression-release-compression-of-release-infinite-recursion',
    authority: 'derived-from-active-hearthweave-packet',
  });
}

export function validateIPadSomaticLineage(lineageInput, { worldId = null } = {}) {
  invariant(lineageInput && typeof lineageInput === 'object' && !Array.isArray(lineageInput), 'lineage object is required');
  const lineage = copy(lineageInput);
  invariant(lineage.schema === IPAD_SOMATIC_LINEAGE_SCHEMA, 'lineage schema is unsupported');
  invariant(lineage.status === 'active', 'lineage is not active');
  invariant(lineage.law === 'compression-release-compression-of-release-infinite-recursion', 'lineage law is invalid');
  invariant(lineage.authority === 'derived-from-active-hearthweave-packet', 'lineage authority is invalid');
  const required = [
    'world_id',
    'house_id',
    'session_context_id',
    'dual_aspect_packet_id',
    'dual_aspect_packet_fingerprint',
    'shared_state_fingerprint',
    'compression_release_receipt_id',
    'next_operation',
    'premaq_id',
    'premaq_receipt_id',
    'bridge_packet_id',
  ];
  for (const field of required) requireString(lineage[field], field);
  requireDateTime(lineage.activated_at, 'activated_at');
  invariant(Number.isInteger(lineage.compression_cycle) && lineage.compression_cycle >= 1, 'compression_cycle must be a positive integer');
  invariant(lineage.next_operation === 'compression-of-release', 'next operation must be compression-of-release');
  if (worldId != null) {
    invariant(lineage.world_id === worldId, `active Bifröst world ${lineage.world_id} does not match selected world ${worldId}`);
  }
  return deepFreeze(lineage);
}

export function publishIPadSomaticLineage(packet, {
  storage = globalThis.localStorage,
} = {}) {
  invariant(storage?.setItem, 'local storage is unavailable');
  const lineage = buildIPadSomaticLineage(packet);
  storage.setItem(IPAD_SOMATIC_LINEAGE_STORAGE_KEY, JSON.stringify(lineage));
  return lineage;
}

export function readIPadSomaticLineage({
  storage = globalThis.localStorage,
  worldId = null,
} = {}) {
  invariant(storage?.getItem, 'local storage is unavailable');
  const raw = storage.getItem(IPAD_SOMATIC_LINEAGE_STORAGE_KEY);
  invariant(raw, 'no active Bifröst somatic lineage is available; load the world through Arcsweep first');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    storage.removeItem?.(IPAD_SOMATIC_LINEAGE_STORAGE_KEY);
    throw new Error('IPAD_SOMATIC_LINEAGE: stored lineage is malformed');
  }
  return validateIPadSomaticLineage(parsed, { worldId });
}

export function clearIPadSomaticLineage({
  storage = globalThis.localStorage,
} = {}) {
  storage?.removeItem?.(IPAD_SOMATIC_LINEAGE_STORAGE_KEY);
}
