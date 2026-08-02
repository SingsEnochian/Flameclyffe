import { fingerprint } from './dual-aspect.js';
import { validateDualAspectPacket } from './validation.js';

export const CROSS_RUNTIME_CORRESPONDENCE_SCHEMA = 'hearthgate.cross-runtime-correspondence/v1';
export const KERNEL_AUTHORITY_PROOF_SCHEMA = 'hearthgate.kernel-authority-proof/v1';
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

function requirePolicy({ tolerance, maxTemporalSkewMs }) {
  if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance > 0.1) {
    throw new CrossRuntimeCorrespondenceError(
      'tolerance must be between 0 and 0.1',
      'INVALID_CORRESPONDENCE_POLICY',
    );
  }
  if (!Number.isFinite(maxTemporalSkewMs) || maxTemporalSkewMs < 0 || maxTemporalSkewMs > 300_000) {
    throw new CrossRuntimeCorrespondenceError(
      'maxTemporalSkewMs must be between 0 and 300000',
      'INVALID_CORRESPONDENCE_POLICY',
    );
  }
  return { tolerance, maxTemporalSkewMs };
}

function validateKernelPacketShape(packetInput) {
  const packet = clone(requireObject(packetInput, 'Python kernel packet'));
  if (packet.schema !== 'hearthgate.dual-aspect-packet.v1') {
    throw new CrossRuntimeCorrespondenceError(
      'Unsupported Python kernel packet schema',
      'UNSUPPORTED_CROSS_RUNTIME_PACKET',
    );
  }
  requireString(packet.identity, 'kernel.identity');
  requireString(packet.house_id, 'kernel.house_id');
  const basisHash = requireString(packet.correspondence?.basis_hash, 'kernel.correspondence.basis_hash');
  if (packet.sensory?.source_state_hash !== basisHash) {
    throw new CrossRuntimeCorrespondenceError(
      'Python sensory state diverges from its declared basis',
      'PYTHON_HIDDEN_STATE_DIVERGENCE',
    );
  }
  const receipt = Array.isArray(packet.receipts) ? packet.receipts.at(-1) : null;
  if (!receipt || receipt.status !== VERIFIED) {
    throw new CrossRuntimeCorrespondenceError(
      'Python kernel packet lacks a VERIFIED receipt',
      'PYTHON_RECEIPT_UNVERIFIED',
    );
  }
  if (!Object.values(receipt.claims ?? {}).every((claim) => claim === VERIFIED)) {
    throw new CrossRuntimeCorrespondenceError(
      'Python kernel receipt contains a failed claim',
      'PYTHON_RECEIPT_UNVERIFIED',
    );
  }
  requireString(receipt.packet_hash, 'kernel.receipt.packet_hash');
  return deepFreeze(packet);
}

function authorityProofBase(packet, audit, replay, authority) {
  return {
    schema: KERNEL_AUTHORITY_PROOF_SCHEMA,
    authority,
    identity: packet.identity,
    house_id: packet.house_id,
    basis_hash: packet.correspondence.basis_hash,
    packet_hash: packet.receipts.at(-1).packet_hash,
    audit: {
      schema: audit.schema,
      status: audit.status,
      claims: audit.claims,
    },
    replay: {
      schema: replay.schema,
      verified: replay.verified,
      packet_hash: replay.packet_hash,
    },
  };
}

export function createKernelAuthorityProof(
  packetInput,
  auditInput,
  replayInput,
  { authority = 'injected-kernel-verifier' } = {},
) {
  const packet = validateKernelPacketShape(packetInput);
  const audit = clone(requireObject(auditInput, 'Kernel audit response'));
  const replay = clone(requireObject(replayInput, 'Kernel replay response'));
  if (audit.schema !== 'hearthgate.integrity-audit.v1') {
    throw new CrossRuntimeCorrespondenceError('Kernel audit schema is invalid', 'KERNEL_AUTHORITY_FAILED');
  }
  if (audit.identity !== packet.identity || audit.house_id !== packet.house_id) {
    throw new CrossRuntimeCorrespondenceError('Kernel audit identifies another packet', 'KERNEL_AUTHORITY_FAILED');
  }
  if (audit.status !== VERIFIED || !Object.values(audit.claims ?? {}).every((claim) => claim === VERIFIED)) {
    throw new CrossRuntimeCorrespondenceError('Kernel audit did not verify every claim', 'KERNEL_AUTHORITY_FAILED');
  }
  if (replay.schema !== 'hearthgate.replay-result.v1' || replay.verified !== true) {
    throw new CrossRuntimeCorrespondenceError('Kernel replay did not verify the packet', 'KERNEL_AUTHORITY_FAILED');
  }
  if (replay.packet_hash !== packet.receipts.at(-1).packet_hash) {
    throw new CrossRuntimeCorrespondenceError('Kernel replay hash differs from the receipt', 'KERNEL_AUTHORITY_FAILED');
  }
  const base = authorityProofBase(packet, audit, replay, authority);
  return deepFreeze({ ...base, proof_fingerprint: fingerprint(base) });
}

export function validateKernelAuthorityProof(proofInput, packetInput) {
  const packet = validateKernelPacketShape(packetInput);
  const proof = clone(requireObject(proofInput, 'Kernel authority proof'));
  if (proof.schema !== KERNEL_AUTHORITY_PROOF_SCHEMA) {
    throw new CrossRuntimeCorrespondenceError('Kernel authority proof schema is invalid', 'KERNEL_AUTHORITY_FAILED');
  }
  const submittedBase = clone(proof);
  delete submittedBase.proof_fingerprint;
  if (proof.proof_fingerprint !== fingerprint(submittedBase)) {
    throw new CrossRuntimeCorrespondenceError('Kernel authority proof fingerprint mismatch', 'KERNEL_AUTHORITY_FAILED');
  }
  if (
    proof.identity !== packet.identity
    || proof.house_id !== packet.house_id
    || proof.basis_hash !== packet.correspondence.basis_hash
    || proof.packet_hash !== packet.receipts.at(-1).packet_hash
  ) {
    throw new CrossRuntimeCorrespondenceError('Kernel authority proof is stale', 'KERNEL_AUTHORITY_FAILED');
  }
  if (
    proof.audit?.status !== VERIFIED
    || !Object.values(proof.audit?.claims ?? {}).every((claim) => claim === VERIFIED)
    || proof.replay?.verified !== true
    || proof.replay?.packet_hash !== proof.packet_hash
  ) {
    throw new CrossRuntimeCorrespondenceError('Kernel authority proof is not VERIFIED', 'KERNEL_AUTHORITY_FAILED');
  }
  return deepFreeze(proof);
}

async function postJson(fetchImpl, url, body) {
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new CrossRuntimeCorrespondenceError(
      `Kernel authority request failed: ${response.status} ${response.statusText}`,
      'KERNEL_AUTHORITY_FAILED',
    );
  }
  return response.json();
}

export async function requestKernelAuthorityProof(packetInput, {
  endpoint = 'http://127.0.0.1:8765',
  fetchImpl = globalThis.fetch?.bind(globalThis),
} = {}) {
  const packet = validateKernelPacketShape(packetInput);
  if (typeof fetchImpl !== 'function') {
    throw new CrossRuntimeCorrespondenceError('Kernel authority fetch is unavailable', 'KERNEL_AUTHORITY_FAILED');
  }
  const root = endpoint.replace(/\/$/, '');
  const [audit, replay] = await Promise.all([
    postJson(fetchImpl, `${root}/v1/hearthgate/audit`, packet),
    postJson(fetchImpl, `${root}/v1/hearthgate/replay`, packet),
  ]);
  return createKernelAuthorityProof(packet, audit, replay, { authority: root });
}

async function resolveKernelAuthorityProof(packet, {
  kernelVerifier = requestKernelAuthorityProof,
  kernelEndpoint,
  fetchImpl,
} = {}) {
  if (typeof kernelVerifier !== 'function') {
    throw new CrossRuntimeCorrespondenceError('Kernel verifier is unavailable', 'KERNEL_AUTHORITY_FAILED');
  }
  const proof = await kernelVerifier(packet, { endpoint: kernelEndpoint, fetchImpl });
  return validateKernelAuthorityProof(proof, packet);
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
  return Object.fromEntries(
    AXES.map((axis) => [axis, requireAxis(packet.premaq?.[axis], `kernel.premaq.${axis}`)]),
  );
}

function extractHearthweaveAxes(packet) {
  return Object.fromEntries(AXES.map((axis) => [
    axis,
    requireAxis(packet.observable?.premaq?.state?.[axis]?.value, `hearthweave.premaq.${axis}`),
  ]));
}

function canonSovereignty(packet) {
  const foundation = packet.experiential?.house?.canon_foundation?.id;
  const overlay = packet.experiential?.house?.canon_overlay?.id;
  return Boolean(foundation && overlay && foundation !== overlay);
}

function buildComparison(kernelPacket, hearthweavePacket, policy) {
  const { tolerance, maxTemporalSkewMs } = requirePolicy(policy);
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
  const kernelObservedAt = requireDate(kernelPacket.temporal?.observed_at, 'kernel.temporal.observed_at');
  const hearthweaveObservedAt = requireDate(
    hearthweavePacket.observable.premaq.observed_at ?? hearthweavePacket.temporal.observed_at,
    'hearthweave.premaq.observed_at',
  );
  const temporalSkewMs = Math.abs(kernelObservedAt - hearthweaveObservedAt);
  const claims = {
    house_identity: expectedHearthweaveHouse === actualHearthweaveHouse ? VERIFIED : FAILED,
    premaq_axes: Object.values(axes).every((entry) => entry.status === VERIFIED) ? VERIFIED : FAILED,
    temporal_proximity: temporalSkewMs <= maxTemporalSkewMs ? VERIFIED : FAILED,
    kernel_authority: VERIFIED,
    hearthweave_fingerprint: VERIFIED,
    canon_sovereignty: canonSovereignty(hearthweavePacket) ? VERIFIED : FAILED,
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

function receiptBase(kernelPacket, kernelAuthority, hearthweavePacket, comparison, policy, createdAt) {
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
      authority: kernelAuthority.authority,
      authority_proof_fingerprint: kernelAuthority.proof_fingerprint,
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

export async function createCrossRuntimeCorrespondenceReceipt(kernelPacketInput, hearthweavePacketInput, {
  tolerance = 0.000001,
  maxTemporalSkewMs = 5_000,
  clock = () => new Date(),
  kernelVerifier = requestKernelAuthorityProof,
  kernelEndpoint,
  fetchImpl,
} = {}) {
  requirePolicy({ tolerance, maxTemporalSkewMs });
  const kernelPacket = validateKernelPacketShape(kernelPacketInput);
  const kernelAuthority = await resolveKernelAuthorityProof(kernelPacket, {
    kernelVerifier,
    kernelEndpoint,
    fetchImpl,
  });
  const hearthweavePacket = validateDualAspectPacket(hearthweavePacketInput);
  const policy = {
    axes: AXES,
    tolerance,
    max_temporal_skew_ms: maxTemporalSkewMs,
    unmatched_house_policy: 'fail-closed',
  };
  const comparison = buildComparison(kernelPacket, hearthweavePacket, { tolerance, maxTemporalSkewMs });
  const base = receiptBase(
    kernelPacket,
    kernelAuthority,
    hearthweavePacket,
    comparison,
    policy,
    clock().toISOString(),
  );
  return deepFreeze({ ...base, bind_fingerprint: fingerprint(base) });
}

export async function validateCrossRuntimeCorrespondenceReceipt(
  receiptInput,
  kernelPacketInput,
  hearthweavePacketInput,
  {
    kernelVerifier = requestKernelAuthorityProof,
    kernelEndpoint,
    fetchImpl,
  } = {},
) {
  const receipt = clone(requireObject(receiptInput, 'Cross-runtime receipt'));
  if (receipt.schema !== CROSS_RUNTIME_CORRESPONDENCE_SCHEMA) {
    throw new CrossRuntimeCorrespondenceError(
      'Unsupported cross-runtime receipt schema',
      'UNSUPPORTED_CORRESPONDENCE_RECEIPT',
    );
  }
  requireDate(receipt.created_at, 'receipt.created_at');
  const submittedBase = clone(receipt);
  delete submittedBase.bind_fingerprint;
  if (receipt.bind_fingerprint !== fingerprint(submittedBase)) {
    throw new CrossRuntimeCorrespondenceError(
      'Submitted cross-runtime receipt fingerprint mismatch',
      'CORRESPONDENCE_RECEIPT_MISMATCH',
    );
  }

  const kernelPacket = validateKernelPacketShape(kernelPacketInput);
  const kernelAuthority = await resolveKernelAuthorityProof(kernelPacket, {
    kernelVerifier,
    kernelEndpoint,
    fetchImpl,
  });
  const hearthweavePacket = validateDualAspectPacket(hearthweavePacketInput);
  const tolerance = Number(receipt.policy?.tolerance);
  const maxTemporalSkewMs = Number(receipt.policy?.max_temporal_skew_ms);
  requirePolicy({ tolerance, maxTemporalSkewMs });
  if (JSON.stringify(receipt.policy?.axes) !== JSON.stringify(AXES)) {
    throw new CrossRuntimeCorrespondenceError(
      'Cross-runtime receipt axis policy is invalid',
      'INVALID_CORRESPONDENCE_POLICY',
    );
  }
  const comparison = buildComparison(kernelPacket, hearthweavePacket, {
    tolerance,
    maxTemporalSkewMs,
  });
  const expectedBase = receiptBase(
    kernelPacket,
    kernelAuthority,
    hearthweavePacket,
    comparison,
    receipt.policy,
    receipt.created_at,
  );
  if (fingerprint(submittedBase) !== fingerprint(expectedBase)) {
    throw new CrossRuntimeCorrespondenceError(
      'Cross-runtime receipt body is stale or belongs to another state',
      'CORRESPONDENCE_RECEIPT_MISMATCH',
    );
  }
  return deepFreeze(receipt);
}

export async function assertCrossRuntimeActivation({
  kernelPacket: kernelPacketInput,
  hearthweavePacket: hearthweavePacketInput = null,
  correspondenceReceipt = null,
  kernelVerifier = requestKernelAuthorityProof,
  kernelEndpoint,
  fetchImpl,
} = {}) {
  const kernelPacket = validateKernelPacketShape(kernelPacketInput);
  const kernelAuthority = await resolveKernelAuthorityProof(kernelPacket, {
    kernelVerifier,
    kernelEndpoint,
    fetchImpl,
  });
  if (!hearthweavePacketInput) {
    return deepFreeze({
      schema: 'hearthgate.cross-runtime-activation/v1',
      mode: 'kernel-only',
      status: VERIFIED,
      kernel_basis_hash: kernelPacket.correspondence.basis_hash,
      kernel_authority_proof_fingerprint: kernelAuthority.proof_fingerprint,
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
  const receipt = await validateCrossRuntimeCorrespondenceReceipt(
    correspondenceReceipt,
    kernelPacket,
    hearthweavePacketInput,
    { kernelVerifier: async () => kernelAuthority },
  );
  if (
    receipt.status !== VERIFIED
    || !Object.values(receipt.claims).every((claim) => claim === VERIFIED)
  ) {
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
    kernel_authority_proof_fingerprint: kernelAuthority.proof_fingerprint,
    hearthweave_packet_id: receipt.hearthweave.packet_id,
    bind_fingerprint: receipt.bind_fingerprint,
  });
}

export function registeredCrossRuntimeHouses() {
  return deepFreeze(clone(HOUSE_BINDINGS));
}
