import {
  CLAIM_STATES,
  DUAL_ASPECT_ACTIVATION_EVENT,
  DUAL_ASPECT_ACTIVE_PACKET_KEY,
  DUAL_ASPECT_DEACTIVATION_EVENT,
  DUAL_ASPECT_RECEIPT_LEDGER_KEY,
  DUAL_ASPECT_RECEIPT_SCHEMA,
  fingerprint,
  validateDualAspectPacket,
} from './dual-aspect.js';

const RENDERERS = Object.freeze(['glyph', 'tone', 'visual', 'haptic', 'narrative']);

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function resolveStorage(storage) {
  return storage ?? globalThis.sessionStorage ?? null;
}

function readJson(storage, key, fallback) {
  if (!storage?.getItem) return fallback;
  try {
    const value = JSON.parse(storage.getItem(key) || 'null');
    return value ?? fallback;
  } catch {
    storage.removeItem?.(key);
    return fallback;
  }
}

function writeJson(storage, key, value) {
  if (!storage?.setItem) return;
  storage.setItem(key, JSON.stringify(value));
}

function dispatch(target, name, detail) {
  if (!target?.dispatchEvent) return;
  const EventClass = target.CustomEvent ?? globalThis.CustomEvent;
  if (typeof EventClass !== 'function') return;
  target.dispatchEvent(new EventClass(name, { detail }));
}

function initialRenderRecords(packet) {
  return Object.fromEntries(RENDERERS.map((renderer) => [renderer, {
    renderer,
    status: CLAIM_STATES.NOT_YET_TESTED,
    packet_id: packet.packet_id,
    shared_state_fingerprint: packet.correspondence.shared_state_fingerprint,
    output_fingerprint: null,
    rendered_at: null,
    degraded: packet.degraded.active,
    notes: [],
  }]));
}

function createActivationReceipt(packet, clock = () => new Date()) {
  const receiptId = packet.receipts[0];
  const receipt = {
    schema: DUAL_ASPECT_RECEIPT_SCHEMA,
    receipt_id: receiptId,
    packet_id: packet.packet_id,
    packet_fingerprint: packet.packet_fingerprint,
    shared_state_fingerprint: packet.correspondence.shared_state_fingerprint,
    world_slug: packet.identity.world_slug,
    house_id: packet.identity.house_id,
    session_context_id: packet.identity.session_context_id,
    activated_at: clock().toISOString(),
    activation: {
      event: DUAL_ASPECT_ACTIVATION_EVENT,
      status: CLAIM_STATES.VERIFIED,
      observable_ref: packet.correspondence.bindings.observable,
      experiential_ref: packet.correspondence.bindings.experiential,
    },
    source: {
      deep_snapshot_id: packet.provenance.deep_snapshot_id,
      deep_mode: packet.observable.deep_snapshot.mode,
      premaq_id: packet.observable.premaq.id,
      premaq_receipt_id: packet.observable.premaq.receipt_id,
      bridge_packet_id: packet.observable.bridge.bridge_packet_id,
      continuity_packet_ids: clone(packet.provenance.continuity_packet_ids),
      continuity_fingerprints: clone(packet.provenance.continuity_fingerprints),
      transfer_function_version: packet.provenance.transfer_function_version,
    },
    render_records: initialRenderRecords(packet),
    degraded: clone(packet.degraded),
    replay: {
      status: CLAIM_STATES.NOT_YET_TESTED,
      verified_at: null,
      replay_fingerprint: null,
    },
    history: [{
      action: 'activate',
      at: clock().toISOString(),
      status: CLAIM_STATES.VERIFIED,
    }],
  };
  return { ...receipt, receipt_fingerprint: fingerprint(receipt) };
}

function readLedger(storage) {
  const value = readJson(storage, DUAL_ASPECT_RECEIPT_LEDGER_KEY, { schema: 'hearthweave.receipt-ledger/v1', receipts: {} });
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { schema: 'hearthweave.receipt-ledger/v1', receipts: {} };
  }
  return {
    schema: 'hearthweave.receipt-ledger/v1',
    receipts: value.receipts && typeof value.receipts === 'object' ? value.receipts : {},
  };
}

function writeReceipt(storage, receipt) {
  const ledger = readLedger(storage);
  ledger.receipts[receipt.receipt_id] = receipt;
  writeJson(storage, DUAL_ASPECT_RECEIPT_LEDGER_KEY, ledger);
  return clone(receipt);
}

export function readActiveDualAspectPacket({ storage } = {}) {
  const selectedStorage = resolveStorage(storage);
  const packet = readJson(selectedStorage, DUAL_ASPECT_ACTIVE_PACKET_KEY, null);
  if (!packet) return null;
  try {
    return validateDualAspectPacket(packet);
  } catch {
    selectedStorage?.removeItem?.(DUAL_ASPECT_ACTIVE_PACKET_KEY);
    return null;
  }
}

export function readDualAspectReceipt(receiptId, { storage } = {}) {
  if (!receiptId) return null;
  const ledger = readLedger(resolveStorage(storage));
  return clone(ledger.receipts[receiptId] ?? null);
}

export function readDualAspectReceiptForPacket(packetId, { storage } = {}) {
  if (!packetId) return null;
  const ledger = readLedger(resolveStorage(storage));
  return clone(Object.values(ledger.receipts).find((receipt) => receipt.packet_id === packetId) ?? null);
}

export function publishDualAspectActivation(packetInput, {
  storage,
  eventTarget = globalThis,
  clock = () => new Date(),
} = {}) {
  const packet = validateDualAspectPacket(packetInput);
  const selectedStorage = resolveStorage(storage);
  writeJson(selectedStorage, DUAL_ASPECT_ACTIVE_PACKET_KEY, packet);
  const receipt = createActivationReceipt(packet, clock);
  writeReceipt(selectedStorage, receipt);
  dispatch(eventTarget, DUAL_ASPECT_ACTIVATION_EVENT, {
    packet_id: packet.packet_id,
    packet_fingerprint: packet.packet_fingerprint,
    shared_state_fingerprint: packet.correspondence.shared_state_fingerprint,
    receipt_id: receipt.receipt_id,
    packet: clone(packet),
  });
  return { packet: clone(packet), receipt };
}

export function recordDualAspectRender(packetInput, {
  renderer,
  output,
  status = CLAIM_STATES.VERIFIED,
  notes = [],
  storage,
  clock = () => new Date(),
} = {}) {
  const packet = validateDualAspectPacket(packetInput);
  if (!RENDERERS.includes(renderer)) {
    throw new Error(`Unsupported dual-aspect renderer: ${renderer}`);
  }
  if (!Object.values(CLAIM_STATES).includes(status)) {
    throw new Error(`Unsupported claim status: ${status}`);
  }
  const selectedStorage = resolveStorage(storage);
  const receipt = readDualAspectReceiptForPacket(packet.packet_id, { storage: selectedStorage })
    ?? createActivationReceipt(packet, clock);
  const renderedAt = clock().toISOString();
  const outputFingerprint = output == null ? null : fingerprint(output);
  receipt.render_records[renderer] = {
    renderer,
    status,
    packet_id: packet.packet_id,
    shared_state_fingerprint: packet.correspondence.shared_state_fingerprint,
    output_fingerprint: outputFingerprint,
    rendered_at: renderedAt,
    degraded: packet.degraded.active,
    notes: Array.isArray(notes) ? notes.map(String) : [String(notes)],
  };
  receipt.history.push({
    action: `render:${renderer}`,
    at: renderedAt,
    status,
    output_fingerprint: outputFingerprint,
  });
  const { receipt_fingerprint: ignored, ...base } = receipt;
  receipt.receipt_fingerprint = fingerprint(base);
  return writeReceipt(selectedStorage, receipt);
}

export function recordDualAspectReplay(packetInput, replayOutput, {
  storage,
  clock = () => new Date(),
} = {}) {
  const packet = validateDualAspectPacket(packetInput);
  const selectedStorage = resolveStorage(storage);
  const receipt = readDualAspectReceiptForPacket(packet.packet_id, { storage: selectedStorage })
    ?? createActivationReceipt(packet, clock);
  const replayFingerprint = fingerprint(replayOutput);
  receipt.replay = {
    status: CLAIM_STATES.VERIFIED,
    verified_at: clock().toISOString(),
    replay_fingerprint: replayFingerprint,
  };
  receipt.history.push({
    action: 'replay',
    at: receipt.replay.verified_at,
    status: CLAIM_STATES.VERIFIED,
    replay_fingerprint: replayFingerprint,
  });
  const { receipt_fingerprint: ignored, ...base } = receipt;
  receipt.receipt_fingerprint = fingerprint(base);
  return writeReceipt(selectedStorage, receipt);
}

export function clearDualAspectActivation({
  storage,
  eventTarget = globalThis,
  reason = 'explicit-clear',
  clock = () => new Date(),
} = {}) {
  const selectedStorage = resolveStorage(storage);
  const packet = readActiveDualAspectPacket({ storage: selectedStorage });
  selectedStorage?.removeItem?.(DUAL_ASPECT_ACTIVE_PACKET_KEY);
  if (packet) {
    const receipt = readDualAspectReceiptForPacket(packet.packet_id, { storage: selectedStorage });
    if (receipt) {
      receipt.history.push({
        action: 'deactivate',
        at: clock().toISOString(),
        status: CLAIM_STATES.VERIFIED,
        reason,
      });
      const { receipt_fingerprint: ignored, ...base } = receipt;
      receipt.receipt_fingerprint = fingerprint(base);
      writeReceipt(selectedStorage, receipt);
    }
    dispatch(eventTarget, DUAL_ASPECT_DEACTIVATION_EVENT, {
      packet_id: packet.packet_id,
      packet_fingerprint: packet.packet_fingerprint,
      reason,
    });
  }
  return packet;
}

export function subscribeToDualAspectActivation(listener, {
  eventTarget = globalThis,
  storage,
  emitCurrent = true,
} = {}) {
  if (typeof listener !== 'function') throw new Error('Activation listener must be a function');
  const handler = (event) => listener(event.detail?.packet ?? readActiveDualAspectPacket({ storage }), event.detail ?? null);
  eventTarget?.addEventListener?.(DUAL_ASPECT_ACTIVATION_EVENT, handler);
  if (emitCurrent) {
    const current = readActiveDualAspectPacket({ storage });
    if (current) listener(current, { restored: true, packet_id: current.packet_id });
  }
  return () => eventTarget?.removeEventListener?.(DUAL_ASPECT_ACTIVATION_EVENT, handler);
}
