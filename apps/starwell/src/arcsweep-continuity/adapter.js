export const CONTINUITY_PACKET_SCHEMA = 'hearthweave.continuity-packet/v0.1';
export const ARCSWEEP_STORE_SCHEMA = 'arcsweep.continuity-store/v0.1';
export const ARCSWEEP_RECEIPT_SCHEMA = 'arcsweep.continuity-import-receipt/v0.1';

const LAYERS = new Set(['changed', 'remained_true', 'became_clearer', 'gained']);
const REGISTERS = new Set([
  'external-observation',
  'target-world-narrative',
  'interpretation',
  'system-state',
  'creative-insight',
  'relationship-state',
]);
const ROUTES = new Set([
  'observational-continuity',
  'world-continuity',
  'interpretive-continuity',
  'system-continuity',
  'creative-continuity',
  'relationship-continuity',
]);

export class ArcsweepContinuityError extends Error {
  constructor(message, code = 'arcsweep-continuity-error') {
    super(message);
    this.name = 'ArcsweepContinuityError';
    this.code = code;
  }
}

function clone(value) {
  return structuredClone(value);
}

function requireString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ArcsweepContinuityError(`${field} must be a non-empty string`, 'invalid-continuity-packet');
  }
}

function makeId(prefix = 'receipt') {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${prefix}-${uuid}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createEmptyContinuityStore() {
  return {
    schema: ARCSWEEP_STORE_SCHEMA,
    version: 1,
    packets: {},
    items: {},
    receipts: [],
    updated_at: null,
  };
}

export function normalizeContinuityStore(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return createEmptyContinuityStore();
  if (value.schema !== ARCSWEEP_STORE_SCHEMA) return createEmptyContinuityStore();
  return {
    schema: ARCSWEEP_STORE_SCHEMA,
    version: 1,
    packets: value.packets && typeof value.packets === 'object' ? clone(value.packets) : {},
    items: value.items && typeof value.items === 'object' ? clone(value.items) : {},
    receipts: Array.isArray(value.receipts) ? clone(value.receipts) : [],
    updated_at: typeof value.updated_at === 'string' ? value.updated_at : null,
  };
}

export function validateContinuityPacket(packet) {
  if (!packet || typeof packet !== 'object' || Array.isArray(packet)) {
    throw new ArcsweepContinuityError('Continuity packet must be an object', 'invalid-continuity-packet');
  }
  if (packet.schema !== CONTINUITY_PACKET_SCHEMA) {
    throw new ArcsweepContinuityError(`Unsupported continuity schema: ${packet.schema ?? 'missing'}`, 'unsupported-continuity-schema');
  }

  for (const [field, value] of Object.entries({
    continuity_packet_id: packet.continuity_packet_id,
    source_fingerprint: packet.source_fingerprint,
    world_slug: packet.world_slug,
    session_id: packet.session_id,
    lamination_id: packet.lamination_id,
    review_id: packet.review_id,
    exported_by: packet.exported_by,
  })) requireString(value, field);

  if (!/^[a-f0-9]{64}$/.test(packet.source_fingerprint)) {
    throw new ArcsweepContinuityError('source_fingerprint must be a 64-character lowercase SHA-256 hex string', 'invalid-source-fingerprint');
  }
  if (packet.authority?.state !== 'human-reviewed'
      || packet.authority?.scope !== 'continuity-only'
      || packet.authority?.canon_commit !== false) {
    throw new ArcsweepContinuityError('Packet authority must be human-reviewed, continuity-only, and canon_commit false', 'invalid-continuity-authority');
  }
  if (packet.transport?.state !== 'portable-local') {
    throw new ArcsweepContinuityError('Only portable-local continuity packets are accepted', 'invalid-continuity-transport');
  }
  if (!Array.isArray(packet.accepted_items) || packet.accepted_items.length === 0) {
    throw new ArcsweepContinuityError('Packet must contain at least one accepted item', 'empty-continuity-packet');
  }

  const itemIds = new Set();
  for (const item of packet.accepted_items) {
    for (const [field, value] of Object.entries({
      continuity_item_id: item?.continuity_item_id,
      source_item_id: item?.source_item_id,
      text: item?.text,
      world_slug: item?.world_slug,
    })) requireString(value, `accepted_item.${field}`);

    if (itemIds.has(item.continuity_item_id)) {
      throw new ArcsweepContinuityError(`Duplicate continuity item: ${item.continuity_item_id}`, 'duplicate-continuity-item');
    }
    itemIds.add(item.continuity_item_id);

    if (item.world_slug !== packet.world_slug) {
      throw new ArcsweepContinuityError('Continuity item world does not match packet world', 'continuity-world-mismatch');
    }
    if (!LAYERS.has(item.layer)) {
      throw new ArcsweepContinuityError(`Unsupported continuity layer: ${item.layer}`, 'invalid-continuity-layer');
    }
    if (!REGISTERS.has(item.epistemic_register)) {
      throw new ArcsweepContinuityError(`Unsupported epistemic register: ${item.epistemic_register}`, 'invalid-epistemic-register');
    }
    if (!ROUTES.has(item.route)) {
      throw new ArcsweepContinuityError(`Unsupported continuity route: ${item.route}`, 'invalid-continuity-route');
    }
    if (item.status !== 'accepted' || item.authority_scope !== 'reviewed-continuity' || item.canon_commit !== false) {
      throw new ArcsweepContinuityError('Every imported item must be accepted reviewed continuity with canon_commit false', 'invalid-continuity-item-authority');
    }
    if (!Array.isArray(item.source_packet_ids)) {
      throw new ArcsweepContinuityError('source_packet_ids must be an array', 'invalid-source-packet-ids');
    }
  }

  if (packet.summary?.accepted_count !== packet.accepted_items.length) {
    throw new ArcsweepContinuityError('Packet summary accepted_count does not match accepted_items', 'continuity-summary-mismatch');
  }

  return clone(packet);
}

function packetIdentity(packet) {
  return `${packet.continuity_packet_id}:${packet.source_fingerprint}`;
}

export function importContinuityPacket(packetInput, storeInput, {
  importedBy = 'Rowan',
  clock = () => new Date(),
} = {}) {
  requireString(importedBy, 'importedBy');
  const packet = validateContinuityPacket(packetInput);
  const store = normalizeContinuityStore(storeInput);
  const existingPacket = store.packets[packet.continuity_packet_id];

  if (existingPacket) {
    if (existingPacket.source_fingerprint !== packet.source_fingerprint) {
      throw new ArcsweepContinuityError(
        `Packet ID ${packet.continuity_packet_id} already exists with a different fingerprint`,
        'continuity-packet-collision',
      );
    }
    if (existingPacket.state === 'active') {
      const priorReceipt = store.receipts.find((receipt) => receipt.receipt_id === existingPacket.import_receipt_id) ?? null;
      return { store, receipt: clone(priorReceipt), imported: false, idempotent: true };
    }
  }

  for (const item of packet.accepted_items) {
    const existingItem = store.items[item.continuity_item_id];
    if (existingItem && existingItem.source_fingerprint !== packet.source_fingerprint) {
      throw new ArcsweepContinuityError(
        `Continuity item ID ${item.continuity_item_id} already belongs to another source`,
        'continuity-item-collision',
      );
    }
  }

  const importedAt = clock().toISOString();
  const receiptId = makeId('arcsweep-import');
  const previousPacketState = existingPacket ? clone(existingPacket) : null;
  const itemIds = [];

  for (const item of packet.accepted_items) {
    itemIds.push(item.continuity_item_id);
    store.items[item.continuity_item_id] = {
      ...clone(item),
      packet_id: packet.continuity_packet_id,
      session_id: packet.session_id,
      review_id: packet.review_id,
      reviewer: packet.reviewer,
      imported_at: importedAt,
      imported_by: importedBy.trim(),
      source_fingerprint: packet.source_fingerprint,
      arcsweep_state: 'active-continuity',
      canon_state: 'not-promoted',
    };
  }

  store.packets[packet.continuity_packet_id] = {
    packet_id: packet.continuity_packet_id,
    packet_identity: packetIdentity(packet),
    source_fingerprint: packet.source_fingerprint,
    world_slug: packet.world_slug,
    session_id: packet.session_id,
    review_id: packet.review_id,
    item_ids: itemIds,
    imported_at: importedAt,
    imported_by: importedBy.trim(),
    import_receipt_id: receiptId,
    state: 'active',
    authority_scope: 'continuity-only',
    canon_commit: false,
  };

  const receipt = {
    schema: ARCSWEEP_RECEIPT_SCHEMA,
    receipt_id: receiptId,
    action: 'import',
    packet_id: packet.continuity_packet_id,
    source_fingerprint: packet.source_fingerprint,
    world_slug: packet.world_slug,
    session_id: packet.session_id,
    review_id: packet.review_id,
    imported_at: importedAt,
    imported_by: importedBy.trim(),
    item_ids: itemIds,
    item_count: itemIds.length,
    rollback: {
      available: true,
      previous_packet_state: previousPacketState,
    },
    authority: {
      scope: 'continuity-only',
      canon_commit: false,
    },
  };

  store.receipts.push(receipt);
  store.updated_at = importedAt;
  return { store, receipt: clone(receipt), imported: true, idempotent: false };
}

export function rollbackContinuityImport(storeInput, receiptId, {
  rolledBackBy = 'Rowan',
  clock = () => new Date(),
} = {}) {
  requireString(receiptId, 'receiptId');
  requireString(rolledBackBy, 'rolledBackBy');
  const store = normalizeContinuityStore(storeInput);
  const receipt = store.receipts.find((entry) => entry.receipt_id === receiptId && entry.action === 'import');
  if (!receipt) throw new ArcsweepContinuityError('Import receipt not found', 'continuity-import-receipt-not-found');
  if (receipt.rolled_back_at) return { store, receipt: clone(receipt), rolledBack: false, idempotent: true };

  const packet = store.packets[receipt.packet_id];
  if (!packet || packet.import_receipt_id !== receiptId || packet.state !== 'active') {
    throw new ArcsweepContinuityError('Import is no longer the active packet state', 'continuity-rollback-not-active');
  }

  for (const itemId of receipt.item_ids) {
    const item = store.items[itemId];
    if (item?.packet_id === receipt.packet_id) delete store.items[itemId];
  }

  if (receipt.rollback.previous_packet_state) {
    store.packets[receipt.packet_id] = clone(receipt.rollback.previous_packet_state);
  } else {
    store.packets[receipt.packet_id] = {
      ...packet,
      state: 'rolled-back',
      item_ids: [],
    };
  }

  const rolledBackAt = clock().toISOString();
  receipt.rolled_back_at = rolledBackAt;
  receipt.rolled_back_by = rolledBackBy.trim();
  receipt.rollback.available = false;
  store.updated_at = rolledBackAt;

  return { store, receipt: clone(receipt), rolledBack: true, idempotent: false };
}

export function continuityStoreSummary(storeInput) {
  const store = normalizeContinuityStore(storeInput);
  const activePackets = Object.values(store.packets).filter((packet) => packet.state === 'active');
  const activeItems = Object.values(store.items).filter((item) => item.arcsweep_state === 'active-continuity');
  return {
    packet_count: activePackets.length,
    item_count: activeItems.length,
    world_count: new Set(activeItems.map((item) => item.world_slug)).size,
    receipt_count: store.receipts.length,
    route_counts: activeItems.reduce((counts, item) => {
      counts[item.route] = (counts[item.route] ?? 0) + 1;
      return counts;
    }, {}),
    canon_commit_count: activeItems.filter((item) => item.canon_state !== 'not-promoted').length,
  };
}
