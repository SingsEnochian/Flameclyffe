import {
  buildBifrostReceiptSidecar,
  buildBifrostRuntimeState,
} from './bifrost-runtime-state.js';
import {
  buildBifrostRuntimeExecutionPolicy,
  buildBlockedActionReceipt,
} from './bifrost-runtime-engine-bridge.js';

function dispatch(name, detail) {
  if (!globalThis.window) return;
  globalThis.window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function resolveNativeRuntimeState(packetReader) {
  const existing = globalThis.window?.__BIFROST_RUNTIME_STATE__ ?? null;
  if (existing?.schema === 'bifrost.runtime-state/v0.1') return existing;
  const packet = packetReader?.() ?? null;
  return buildBifrostRuntimeState(packet, { active_execution_side: 'targetside' });
}

export function buildNativeActionReceipt(runtimeState, actionId, options = {}) {
  const policy = options.policy ?? buildBifrostRuntimeExecutionPolicy(runtimeState);
  const sidecar = buildBifrostReceiptSidecar(runtimeState, {
    notes: [
      `native-action:${actionId}`,
      policy.action_boundary,
      ...(options.notes ?? []),
    ],
  });
  return {
    ...sidecar,
    schema: 'bifrost.native-action-receipt/v0.1',
    action_id: actionId,
    execution_allowed: !policy.blocked_actions.includes(actionId),
    execution_policy: policy,
  };
}

export function enforceBifrostNativeAction({
  actionId,
  packetReader,
  setStatus,
  statusKind = 'error',
  notes = [],
} = {}) {
  if (!actionId) throw new Error('BIFROST_NATIVE_ACTION_ID_REQUIRED');
  const runtimeState = resolveNativeRuntimeState(packetReader);
  const policy = buildBifrostRuntimeExecutionPolicy(runtimeState);
  const blocked = policy.blocked_actions.includes(actionId);
  const receipt = blocked
    ? buildBlockedActionReceipt(runtimeState, actionId)
    : buildNativeActionReceipt(runtimeState, actionId, { policy, notes });

  if (globalThis.window) {
    globalThis.window.__BIFROST_RUNTIME_STATE__ = runtimeState;
    globalThis.window.__BIFROST_RUNTIME_EXECUTION_POLICY__ = policy;
    if (blocked) globalThis.window.__BIFROST_LAST_BLOCKED_ACTION_RECEIPT__ = receipt;
    else globalThis.window.__BIFROST_LAST_NATIVE_ACTION_RECEIPT__ = receipt;
  }

  dispatch(blocked ? 'bifrost:native-action-blocked' : 'bifrost:native-action-allowed', receipt);

  if (blocked) {
    setStatus?.(
      `BLOCKED · ${policy.bridge_status} · ${actionId} did not execute because the native Bifröst runtime guard failed closed.`,
      statusKind,
    );
    return { allowed: false, blocked: true, runtimeState, policy, receipt };
  }

  return { allowed: true, blocked: false, runtimeState, policy, receipt };
}
