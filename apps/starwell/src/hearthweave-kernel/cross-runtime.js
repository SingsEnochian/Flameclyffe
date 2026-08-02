import { fingerprint } from './dual-aspect.js';
import { validateDualAspectPacket } from './validation.js';

export const CROSS_RUNTIME_CORRESPONDENCE_SCHEMA = 'hearthgate.cross-runtime-correspondence/v1';
export const CROSS_RUNTIME_ERROR_CODE = 'HEARTHGATE_RIVAL_ACTIVE_STATE';

const AXES = Object.freeze(['P', 'C', 'R', 'E', 'M', 'A']);
const HOUSE_BINDINGS = Object.freeze({
  'terra-aeterna': 'terra-aeterna',
  'taaveren-vaen': 'ta-veren-vaen',
});
const VERIFIED = 'VERIFIED';
const FAILED = 'FAILED';

export class CrossRuntimeCorrespondenceError extends Error {
  constructor(message, code = CROSS_RUNTIME_ERROR_CODE) {
    super(message);
    this.name = 'CrossRuntimeCorrespondenceError';
    this.code = code;
  }
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CrossRuntimeCorrespondenceError(`${label} must be an object`, 'INVALID_CROSS_RUNTIME_PACKET');
  }
  return value;
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new CrossRuntimeCorrespondenceError(`${label} must be a non-empty string`, 'INVALID_CROSS_RUNTIME_PACKET');
  }
  return value.trim();
}

function requireDate(value, label) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new CrossRuntimeCorrespondenceError(`${label} must be a valid date-time`, 'INVALID_CROSS_RUNTIME_PACKET');
  }
  return timestamp;
}

function requireAxis(value, label) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new CrossRuntimeCorrespondenceError(`${label} must be between 0 and 1`, 'INVALID_CROSS_RUNTIME_PACKET');
  }
  return Number(value);
}

function validateKernelPacket(packetInput) {
  const packet = clone(requireObject(packetInput, 'Python kernel packet'));
  if (packet.schema !== 'hearthgate.dual-aspect-packet.v1') {
    throw new CrossRuntimeCorrespondenceError('Unsupported Python kernel packet schema', 'UNSUPPORTED_CROSS_RUNTIME_PACKET');
  }
  requireString(packet.identity, 'kernel.identity');
  requireString(packet.house_id, 'kernel.house_id');
  requireDate(packet.temporal?.observed_at, 'kernel.temporal.observed_at');
  const basisHash = requireString(packet.correspondence?.basis_hash, 'kernel.correspondence.basis_hash');
  if (packet.sensory?.source_state_hash !== basisHash) {
    throw new CrossRuntimeCorrespondenceError(
      'Python sensory state diverges from its declared basis',
      'PYTHON_HIDDEN_STATE_DIVERGENCE',
    );
  }
  for (const axis of AXES) requireAxis(packet.premaq?.[axis], `kernel.premaq.${axis}`);
  const receipt = Array.isArray(packet.receipts) ? packet.receipts.at(-1) : null;
  if (!receipt || receipt.status !== VERIFIED) {
    throw new CrossRuntimeCorrespondenceError('Python kernel packet lacks a VERIFIED receipt', 'PYTHON_RECEIPT_UNVERIFIED');
  }
  if (!Object.values(receipt.claims ?? {}).every((claim) => claim === VERIFIED)) {
    throw new CrossRuntimeCorrespondenceError('Python kernel receipt contains a failed claim', 'PYTHON_RECEIPT_UNVERIFIED');
  }
  requireString(receipt.packet_hash, 'kernel.receipt.packet_hash');
  return deepFreeze(packet);
}

function mappedHearthweaveHouse(kernelHouseId) {
  const mapped = HOUSE_BINDINGS[kernelHouseId];
  if (!mapped) {
    throw new CrossRuntimeCorrespondenceError(
      `Python House ${kernelHouseId} has no registered Hearthweave correspondence`,
      'HOUSE_CORRESPONDENCE_NOT_REGISTERED',
    );
  }
  return mapped;
}

function extractKernelAxes(packet) {
  return Object.fromEntries(AXES.map((axis) => [axis, requireAxis(packet.premaq[axis], `kernel.premaq.${axis}`)]));
}

function extractHearthweaveAxes(packet) {
  return Object.fromEntries(AXES.map((axis) => [
    axis,
    requireAxis(packet.observable?.premaq?.state?.[axis]?.value, `hearthweave.premaq.${axis}`),
  ]));
}

function buildComparison(kernelPacket, hearthweavePacket, { tolerance, maxTemporalSkewMs }) {
  const expectedHearthweaveHouse = mappedHearthweaveHouse(kernelPacket.house_id);
  const actualHearthweaveHouse = hearthweavePacket.identity.house_id;
  const kernelAxes = extractKernelAxes(kernelPacket);
  const hearthweaveAxes = extractHearthweaveAxes(hearthweavePacket);
  const axes = Object.fromEntries(AXES.map((axis) => {
    const delta = Math.abs(kernelAxes[axis] - hearthweaveAxes[axis]);
    return [axis, {
      kernel: kernelAxes[axis],
      hearthweave: hearthweaveAxes[axis],
      delta: Number(delta.toFixed(9)),
      status: delta <= tolerance ? VERIFIED : FAILED,
    }];
  }));
  const kernelObservedAt = requireDate(kernelPacket.temporal.observed_at, 'kernel.temporal.observed_at');
  const hearthweaveObservedAt = requireDate(
    hearthweavePacket.observable.premaq.observed_at ?? hearthweavePacket.temporal.observed_at,
    'hearthweave.premaq.observed_at',
  );
  const temporalSkewMs = Math.abs(kernelObservedAt - hearthweaveObservedAt);
  const claims = {
    house_identity: expectedHearthweaveHouse === actualHearthweaveHouse ? VERIFIED : FAILED,
    premaq_axes: Object.values(axes).every((entry) => entry.status === VERIFIED) ? VERIFIED : FAILED,
    temporal_proximity: temporalSkewMs <= maxTemporalSkewMs ? VERIFIED : FAILED,
    kernel_receipt: VERIFIED,
    hearthweave_fingerprint: VERIFIED,
    canon_sovereignty: (
      kernelPacket.house_id === 'taaveren-vaen'
        ? hearthweavePacket.identity.canon_foundation_id !== hearthweavePacket.identity.canon_overlay_id
        : true
    ) ? VERIFIED : FAILED,
  };
  return {
    expected_hearthweave_house: expectedHearthweaveHouse,
    actual_hearthweave_house: actualHearthweaveHouse,
    axes,
    temporal_skew_ms: temporalSkewMs,
    claims,
    status: Object.values(claims).every((claim) => claim === VERIFIED) ? VERIFIED : FAILED,
  };
}

function receiptBase(kernelPacket, hearthweavePacket, comparison, policy, createdAt) {
  return {
    schema: CROSS_RUNTIME_CORRESPONDENCE_SCHEMA,
    version: '1.0.0',
    status: comparison.status,
    created_at: createdAt,
    policy,
    kernel: {
      schema: kernelPacket.schema,
      identity: kernelPacket.identity,
      house_id: kernelPacket.house_id,
      observed_at: kernelPacket.temporal.observed_at,
      basis_hash: kernelPacket.correspondence.basis_hash,
      packet_hash: kernelPacket.receipts.at(-1).packet_hash,
    },
    hearthweave: {
      schema: hearthweavePacket.schema,
      packet_id: hearthweavePacket.packet_id,
      house_id: hearthweavePacket.identity.house_id,
      observed_at: hearthweavePacket.observable.premaq.observed_at
        ?? hearthweavePacket.temporal.observed_at,
      shared_state_fingerprint: hearthweavePacket.correspondence.shared_state_fingerprint,
      packet_fingerprint: hearthweavePacket.packet_fingerprint,
    },
    comparison,
    claims: comparison.claims,
  };
}

export function createCrossRuntimeCorrespondenceReceipt(kernelPacketInput, hearthweavePacketInput, {
  tolerance = 0.000001,
  maxTemporalSkewMs = 5_000,
  clock = () => new Date(),
} = {}) {
  if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance > 0.1) {
    throw new CrossRuntimeCorrespondenceError('tolerance must be between 0 and 0.1', 'INVALID_CORRESPONDENCE_POLICY');
  }
  if (!Number.isFinite(maxTemporalSkewMs) || maxTemporalSkewMs < 0 || maxTemporalSkewMs > 300_000) {
    throw new CrossRuntimeCorrespondenceError(
      'maxTemporalSkewMs must be between 0 and 300000',
      'INVALID_CORRESPONDENCE_POLICY',
    );
  }
  const kernelPacket = validateKernelPacket(kernelPacketInput);
  const hearthweavePacket = validateDualAspectPacket(hearthweavePacketInput);
  const policy = {
    axes: AXES,
    tolerance,
    max_temporal_skew_ms: maxTemporalSkewMs,
    unmatched_house_policy: 'fail-closed',
  };
  const comparison = buildComparison(kernelPacket, hearthweavePacket, { tolerance, maxTemporalSkewMs });
  const base = receiptBase(kernelPacket, hearthweavePacket, comparison, policy, clock().toISOString());
  return deepFreeze({ ...base, bind_fingerprint: fingerprint(base) });
}

export function validateCrossRuntimeCorrespondenceReceipt(receiptInput, kernelPacketInput, hearthweavePacketInput) {
  const receipt = clone(requireObject(receiptInput, 'Cross-runtime receipt'));
  if (receipt.schema !== CROSS_RUNTIME_CORRESPONDENCE_SCHEMA) {
    throw new CrossRuntimeCorrespondenceError('Unsupported cross-runtime receipt schema', 'UNSUPPORTED_CORRESPONDENCE_RECEIPT');
  }
  requireDate(receipt.created_at, 'receipt.created_at');
  const kernelPacket = validateKernelPacket(kernelPacketInput);
  const hearthweavePacket = validateDualAspectPacket(hearthweavePacketInput);
  const policy = receipt.policy ?? {};
  const comparison = buildComparison(kernelPacket, hearthweavePacket, {
    tolerance: Number(policy.tolerance),
    maxTemporalSkewMs: Number(policy.max_temporal_skew_ms),
  });
  const expectedBase = receiptBase(kernelPacket, hearthweavePacket, comparison, policy, receipt.created_at);
  const expectedFingerprint = fingerprint(expectedBase);
  if (receipt.bind_fingerprint !== expectedFingerprint) {
    throw new CrossRuntimeCorrespondenceError('Cross-runtime receipt fingerprint mismatch', 'CORRESPONDENCE_RECEIPT_MISMATCH');
  }
  if (receipt.status !== comparison.status || JSON.stringify(receipt.claims) !== JSON.stringify(comparison.claims)) {
    throw new CrossRuntimeCorrespondenceError('Cross-runtime receipt claims are stale', 'CORRESPONDENCE_RECEIPT_MISMATCH');
  }
  return deepFreeze(receipt);
}

export function assertCrossRuntimeActivation({
  kernelPacket: kernelPacketInput,
  hearthweavePacket: hearthweavePacketInput = null,
  correspondenceReceipt = null,
} = {}) {
  const kernelPacket = validateKernelPacket(kernelPacketInput);
  if (!hearthweavePacketInput) {
    return deepFreeze({
      schema: 'hearthgate.cross-runtime-activation/v1',
      mode: 'kernel-only',
      status: VERIFIED,
      kernel_basis_hash: kernelPacket.correspondence.basis_hash,
      hearthweave_packet_id: null,
      bind_fingerprint: null,
    });
  }
  if (!correspondenceReceipt) {
    throw new CrossRuntimeCorrespondenceError(
      'A Hearthweave packet is already active without a correspondence receipt',
      CROSS_RUNTIME_ERROR_CODE,
    );
  }
  const receipt = validateCrossRuntimeCorrespondenceReceipt(
    correspondenceReceipt,
    kernelPacket,
    hearthweavePacketInput,
  );
  if (receipt.status !== VERIFIED || !Object.values(receipt.claims).every((claim) => claim === VERIFIED)) {
    throw new CrossRuntimeCorrespondenceError(
      'The active Hearthweave packet does not correspond to the Python kernel packet',
      CROSS_RUNTIME_ERROR_CODE,
    );
  }
  return deepFreeze({
    schema: 'hearthgate.cross-runtime-activation/v1',
    mode: 'corresponded-dual-runtime',
    status: VERIFIED,
    kernel_basis_hash: kernelPacket.correspondence.basis_hash,
    hearthweave_packet_id: receipt.hearthweave.packet_id,
    bind_fingerprint: receipt.bind_fingerprint,
  });
}

export function registeredCrossRuntimeHouses() {
  return deepFreeze(clone(HOUSE_BINDINGS));
}
