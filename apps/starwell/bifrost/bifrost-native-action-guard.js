import {
  buildBifrostReceiptSidecar,
} from './bifrost-runtime-state.js';
import {
  buildBifrostRuntimeExecutionPolicy,
  buildBlockedActionReceipt,
} from './bifrost-runtime-engine-bridge.js';
import {
  buildBifrostSourceBindingReceipt,
  promoteBifrostRuntimeSource,
  resolveBifrostExecutionSource,
} from './bifrost-runtime-source.js';

function dispatch(name, detail) {
  if (!globalThis.window) return;
  globalThis.window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function resolveNativeRuntimeState(packetReader, options = {}) {
  const existing = globalThis.window?.__BIFROST_RUNTIME_STATE__ ?? null;
  if (existing?.schema === 'bifrost.runtime-state/v0.1') return existing;
  const packet = packetReader?.() ?? null;
  return promoteBifrostRuntimeSource(packet, {
    active_execution_side: options.active_execution_side ?? 'targetside',
  });
}

export function buildNativeActionReceipt(runtimeState, actionId, options = {}) {
  const policy = options.policy ?? buildBifrostRuntimeExecutionPolicy(runtimeState);
  const executionSource = resolveBifrostExecutionSource(runtimeState, {
    actionId,
    active_execution_side: options.active_execution_side,
  });
  const sourceBindingReceipt = buildBifrostSourceBindingReceipt(runtimeState, {
    actionId,
    active_execution_side: executionSource.selected_side,
    notes: options.notes,
  });
  const sidecar = buildBifrostReceiptSidecar(runtimeState, {
    notes: [
      `native-action:${actionId}`,
      policy.action_boundary,
      executionSource.reason,
      ...(options.notes ?? []),
    ],
  });
  return {
    ...sidecar,
    schema: 'bifrost.native-action-receipt/v0.2',
    action_id: actionId,
    selected_execution_side: executionSource.selected_side,
    source_kind: executionSource.source_kind,
    source_state_id: executionSource.source_state_id,
    source_fingerprint: executionSource.source_fingerprint,
    execution_allowed: !policy.blocked_actions.includes(actionId) && executionSource.executable,
    execution_policy: policy,
    execution_source: executionSource,
    source_binding_receipt: sourceBindingReceipt,
  };
}

export function enforceBifrostNativeAction({
  actionId,
  packetReader,
  setStatus,
  statusKind = 'error',
  notes = [],
  active_execution_side = 'targetside',
} = {}) {
  if (!actionId) throw new Error('BIFROST_NATIVE_ACTION_ID_REQUIRED');
  const runtimeState = resolveNativeRuntimeState(packetReader, { active_execution_side });
  const policy = buildBifrostRuntimeExecutionPolicy(runtimeState);
  const receipt = buildNativeActionReceipt(runtimeState, actionId, {
    policy,
    notes,
    active_execution_side,
  });
  const blocked = policy.blocked_actions.includes(actionId) || !receipt.execution_source.executable;

  if (globalThis.window) {
    globalThis.window.__BIFROST_RUNTIME_STATE__ = runtimeState;
    globalThis.window.__BIFROST_RUNTIME_EXECUTION_POLICY__ = policy;
    globalThis.window.__BIFROST_LAST_SOURCE_BINDING_RECEIPT__ = receipt.source_binding_receipt;
    if (blocked) globalThis.window.__BIFROST_LAST_BLOCKED_ACTION_RECEIPT__ = receipt;
    else globalThis.window.__BIFROST_LAST_NATIVE_ACTION_RECEIPT__ = receipt;
  }

  dispatch(blocked ? 'bifrost:native-action-blocked' : 'bifrost:native-action-allowed', receipt);
  dispatch('bifrost:source-binding', receipt.source_binding_receipt);

  if (blocked) {
    const bridgeStatus = policy.bridge_status ?? receipt.execution_source.bridge_status;
    setStatus?.(
      `BLOCKED · ${bridgeStatus} · ${actionId} did not execute because the native Bifröst runtime guard failed closed.`,
      statusKind,
    );
    return { allowed: false, blocked: true, runtimeState, policy, receipt };
  }

  return { allowed: true, blocked: false, runtimeState, policy, receipt };
}
