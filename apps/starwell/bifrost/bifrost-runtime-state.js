export const PREMAQ_AXES = Object.freeze(['P', 'C', 'R', 'E', 'M', 'A', 'Q']);

export const BIFROST_RUNTIME_STATUS = Object.freeze({
  LOCAL_REFERENCE: 'LOCAL REFERENCE',
  TEMPORAL_HEARTHSIDE: 'TEMPORAL HEARTHSIDE',
  TEMPORAL_TARGETSIDE: 'TEMPORAL TARGETSIDE',
  OBSERVABLE_PREMAQ_ONLY: 'OBSERVABLE PREMAQ ONLY',
  EXPERIENTIAL_PREMAQ_ONLY: 'EXPERIENTIAL PREMAQ ONLY',
  NOT_PROVIDED: 'NOT PROVIDED',
  SHORE_STATE_INCOMPLETE: 'SHORE_STATE_INCOMPLETE',
  HIDDEN_STATE_DIVERGENCE: 'HIDDEN_STATE_DIVERGENCE',
  TWO_SHORE_PREMAQ_VISIBLE: 'TWO_SHORE_PREMAQ_VISIBLE',
});

export const REFERENCE_PREMAQ_VALUES = Object.freeze({
  P: 0.72,
  C: 0.81,
  R: 0.67,
  E: 0.31,
  M: 0.76,
  A: 0.84,
  Q: 0.79,
});

function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.min(1, Math.max(0, number));
}

export function short(value, length = 22) {
  const text = String(value ?? 'UNKNOWN');
  if (text.length <= length) return text;
  return `${text.slice(0, Math.max(6, length - 7))}…${text.slice(-6)}`;
}

export function axisValue(source, axis) {
  return clamp01(source?.probabilities?.[axis])
    ?? clamp01(source?.state?.[axis]?.value)
    ?? clamp01(source?.premaq?.state?.[axis]?.value)
    ?? clamp01(source?.observable?.premaq?.state?.[axis]?.value)
    ?? null;
}

export function shoreFingerprint(source) {
  return source?.shared_state_fingerprint
    ?? source?.state_fingerprint
    ?? source?.fingerprint
    ?? source?.premaq?.shared_state_fingerprint
    ?? source?.premaq?.state_fingerprint
    ?? null;
}

export function shoreId(source, fallback) {
  return source?.state_id
    ?? source?.id
    ?? source?.premaq?.id
    ?? source?.observable?.premaq?.id
    ?? fallback;
}

function referenceShore(side) {
  return {
    side,
    status: BIFROST_RUNTIME_STATUS.LOCAL_REFERENCE,
    source: { probabilities: REFERENCE_PREMAQ_VALUES, state_id: `reference-${side}` },
    id: `reference-${side}`,
    fingerprint: 'LOCAL REFERENCE',
    provided: true,
    temporal: false,
    note: 'No active DualAspectPacket is bound. Values are labelled local reference only.',
  };
}

export function resolveBifrostShore(packet, side) {
  if (!packet) return referenceShore(side);

  const temporal = packet?.temporal?.[side] ?? null;
  if (temporal) {
    return {
      side,
      status: side === 'hearthside'
        ? BIFROST_RUNTIME_STATUS.TEMPORAL_HEARTHSIDE
        : BIFROST_RUNTIME_STATUS.TEMPORAL_TARGETSIDE,
      source: temporal,
      id: shoreId(temporal, `${side}-temporal`),
      fingerprint: shoreFingerprint(temporal) ?? packet?.correspondence?.shared_state_fingerprint ?? 'NOT PROVIDED',
      provided: true,
      temporal: true,
      note: 'Temporal shore state supplied by the active DualAspectPacket.',
    };
  }

  if (side === 'hearthside' && packet?.observable?.premaq) {
    const source = { premaq: packet.observable.premaq };
    return {
      side,
      status: BIFROST_RUNTIME_STATUS.OBSERVABLE_PREMAQ_ONLY,
      source,
      id: shoreId(source, 'observable-premaq'),
      fingerprint: shoreFingerprint(source) ?? packet?.correspondence?.shared_state_fingerprint ?? 'NOT PROVIDED',
      provided: true,
      temporal: false,
      note: 'Observable PREMAQ is visible, but temporal.hearthside is not present on the packet.',
    };
  }

  if (side === 'targetside' && packet?.experiential?.premaq) {
    const source = { premaq: packet.experiential.premaq };
    return {
      side,
      status: BIFROST_RUNTIME_STATUS.EXPERIENTIAL_PREMAQ_ONLY,
      source,
      id: shoreId(source, 'experiential-premaq'),
      fingerprint: shoreFingerprint(source) ?? packet?.correspondence?.shared_state_fingerprint ?? 'NOT PROVIDED',
      provided: true,
      temporal: false,
      note: 'Experiential PREMAQ is visible, but temporal.targetside is not present on the packet.',
    };
  }

  return {
    side,
    status: BIFROST_RUNTIME_STATUS.NOT_PROVIDED,
    source: null,
    id: `${side}-missing`,
    fingerprint: 'NOT PROVIDED',
    provided: false,
    temporal: false,
    note: `The active DualAspectPacket does not include ${side} PREMAQ data.`,
  };
}

export function resolveBifrostBridge(packet, hearthside, targetside) {
  if (!packet) {
    return {
      status: BIFROST_RUNTIME_STATUS.LOCAL_REFERENCE,
      crossing_ready: false,
      certified: false,
      blocks_execution: false,
      detail: 'No active packet is bound. Both shore indicators are visible in reference mode only.',
    };
  }

  if (!hearthside.provided || !targetside.provided) {
    return {
      status: BIFROST_RUNTIME_STATUS.SHORE_STATE_INCOMPLETE,
      crossing_ready: false,
      certified: false,
      blocks_execution: true,
      detail: 'At least one shore is missing explicit PREMAQ data. Do not execute or certify a two-shore crossing.',
    };
  }

  const hearthFp = hearthside.fingerprint;
  const targetFp = targetside.fingerprint;
  if (hearthFp && targetFp && hearthFp !== 'NOT PROVIDED' && targetFp !== 'NOT PROVIDED' && hearthFp !== targetFp) {
    return {
      status: BIFROST_RUNTIME_STATUS.HIDDEN_STATE_DIVERGENCE,
      crossing_ready: false,
      certified: false,
      blocks_execution: true,
      detail: 'Hearthside and Targetside fingerprints disagree. The crossing must fail closed.',
    };
  }

  const temporalComplete = hearthside.temporal && targetside.temporal;
  return {
    status: BIFROST_RUNTIME_STATUS.TWO_SHORE_PREMAQ_VISIBLE,
    crossing_ready: temporalComplete,
    certified: temporalComplete,
    blocks_execution: false,
    detail: temporalComplete
      ? 'Both temporal shore states are present and fingerprint-compatible.'
      : 'Both shore indicators are visible, but at least one shore is PREMAQ-only rather than temporal. Treat as visible, not certified.',
  };
}

export function buildBifrostRuntimeState(packet, options = {}) {
  const hearthside = resolveBifrostShore(packet, 'hearthside');
  const targetside = resolveBifrostShore(packet, 'targetside');
  const bridge = resolveBifrostBridge(packet, hearthside, targetside);
  return {
    schema: 'bifrost.runtime-state/v0.1',
    generated_at: options.now ?? new Date().toISOString(),
    packet_id: packet?.packet_id ?? 'REFERENCE',
    packet_fingerprint: packet?.packet_fingerprint ?? 'LOCAL REFERENCE',
    shared_state_fingerprint: packet?.correspondence?.shared_state_fingerprint ?? 'LOCAL REFERENCE',
    source_mode: packet ? 'active-packet' : 'local-reference',
    hearthside,
    targetside,
    bridge,
    active_execution_side: options.active_execution_side ?? 'targetside',
  };
}

export function bridgeBlocksCertifiedExecution(runtimeState) {
  return runtimeState?.bridge?.blocks_execution === true;
}

export function buildBifrostReceiptSidecar(runtimeState, extra = {}) {
  return {
    schema: 'bifrost.two-shore-receipt-sidecar/v0.1',
    exported_at: extra.exported_at ?? new Date().toISOString(),
    packet_id: runtimeState?.packet_id ?? 'REFERENCE',
    packet_fingerprint: runtimeState?.packet_fingerprint ?? 'LOCAL REFERENCE',
    shared_state_fingerprint: runtimeState?.shared_state_fingerprint ?? 'LOCAL REFERENCE',
    hearthside_state_id: runtimeState?.hearthside?.id ?? null,
    targetside_state_id: runtimeState?.targetside?.id ?? null,
    hearthside_fingerprint: runtimeState?.hearthside?.fingerprint ?? null,
    targetside_fingerprint: runtimeState?.targetside?.fingerprint ?? null,
    bridge_status: runtimeState?.bridge?.status ?? BIFROST_RUNTIME_STATUS.NOT_PROVIDED,
    crossing_ready: runtimeState?.bridge?.crossing_ready === true,
    certified: runtimeState?.bridge?.certified === true,
    active_execution_side: runtimeState?.active_execution_side ?? 'targetside',
    blocks_execution: runtimeState?.bridge?.blocks_execution === true,
    authority: {
      canon_write_performed: false,
      tone_approval_performed: false,
      physical_device_test_performed: false,
    },
    notes: extra.notes ?? [],
  };
}
