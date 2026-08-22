import {
  BIFROST_RUNTIME_STATUS,
  buildBifrostReceiptSidecar,
  buildBifrostRuntimeState,
} from './bifrost-runtime-state.js';

export const BIFROST_EXECUTION_SIDES = Object.freeze(['hearthside', 'targetside']);

export const BIFROST_SOURCE_KIND = Object.freeze({
  LOCAL_REFERENCE: 'local-reference',
  TEMPORAL_STATE: 'temporal-state',
  PREMAQ_ONLY: 'premaq-only',
  MISSING: 'missing',
});

function normaliseExecutionSide(side) {
  return BIFROST_EXECUTION_SIDES.includes(side) ? side : 'targetside';
}

export function promoteBifrostRuntimeSource(packet, options = {}) {
  return buildBifrostRuntimeState(packet, {
    ...options,
    active_execution_side: normaliseExecutionSide(options.active_execution_side),
  });
}

export function resolveBifrostExecutionSide(runtimeState, requestedSide = null) {
  return normaliseExecutionSide(requestedSide ?? runtimeState?.active_execution_side);
}

export function resolveBifrostExecutionSource(runtimeState, options = {}) {
  const selected_side = resolveBifrostExecutionSide(runtimeState, options.active_execution_side);
  const shore = runtimeState?.[selected_side] ?? null;
  const bridge = runtimeState?.bridge ?? null;

  if (!shore || shore.status === BIFROST_RUNTIME_STATUS.NOT_PROVIDED || shore.provided === false) {
    return {
      schema: 'bifrost.execution-source/v0.1',
      selected_side,
      source_kind: BIFROST_SOURCE_KIND.MISSING,
      executable: false,
      certified: false,
      source_state: null,
      source_state_id: null,
      source_fingerprint: shore?.fingerprint ?? 'NOT PROVIDED',
      bridge_status: bridge?.status ?? BIFROST_RUNTIME_STATUS.NOT_PROVIDED,
      reason: `No executable ${selected_side} source was provided by the active Bifröst runtime state.`,
    };
  }

  const sourceKind = runtimeState?.source_mode === 'local-reference'
    ? BIFROST_SOURCE_KIND.LOCAL_REFERENCE
    : shore.temporal
      ? BIFROST_SOURCE_KIND.TEMPORAL_STATE
      : BIFROST_SOURCE_KIND.PREMAQ_ONLY;

  return {
    schema: 'bifrost.execution-source/v0.1',
    selected_side,
    source_kind: sourceKind,
    executable: sourceKind !== BIFROST_SOURCE_KIND.MISSING,
    certified: bridge?.certified === true && shore.temporal === true,
    source_state: shore.source ?? null,
    source_state_id: shore.id ?? null,
    source_fingerprint: shore.fingerprint ?? null,
    bridge_status: bridge?.status ?? BIFROST_RUNTIME_STATUS.NOT_PROVIDED,
    reason: sourceKind === BIFROST_SOURCE_KIND.TEMPORAL_STATE
      ? `Using ${selected_side} temporal state as the explicit Bifröst execution source.`
      : sourceKind === BIFROST_SOURCE_KIND.LOCAL_REFERENCE
        ? 'Using labelled local reference state. This is preview execution, not a certified Bifröst crossing.'
        : `Using visible ${selected_side} PREMAQ-only source. This is preview execution, not a certified temporal crossing.`,
  };
}

export function buildBifrostSourceBindingReceipt(runtimeState, options = {}) {
  const executionSource = resolveBifrostExecutionSource(runtimeState, options);
  const sidecar = buildBifrostReceiptSidecar(runtimeState, {
    exported_at: options.exported_at,
    notes: [
      `source-binding:${options.actionId ?? 'unspecified-action'}`,
      executionSource.reason,
      ...(options.notes ?? []),
    ],
  });

  return {
    ...sidecar,
    schema: 'bifrost.source-binding-receipt/v0.1',
    action_id: options.actionId ?? null,
    selected_side: executionSource.selected_side,
    source_kind: executionSource.source_kind,
    source_state_id: executionSource.source_state_id,
    source_fingerprint: executionSource.source_fingerprint,
    executable: executionSource.executable,
    certified_source: executionSource.certified,
    execution_source: executionSource,
  };
}

export function assertBifrostExecutionSource(runtimeState, options = {}) {
  const executionSource = resolveBifrostExecutionSource(runtimeState, options);
  if (!executionSource.executable) {
    const error = new Error('BIFROST_EXECUTION_SOURCE_MISSING');
    error.execution_source = executionSource;
    throw error;
  }
  return executionSource;
}
