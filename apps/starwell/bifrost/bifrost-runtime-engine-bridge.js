import {
  buildBifrostReceiptSidecar,
  bridgeBlocksCertifiedExecution,
} from './bifrost-runtime-state.js';

export const BIFROST_GUARDED_ACTION_IDS = Object.freeze([
  'run-window',
  'sound-pair',
  'play-premaq-song',
  'export-receipts',
]);

export function buildBifrostRuntimeExecutionPolicy(runtimeState) {
  const blocksExecution = bridgeBlocksCertifiedExecution(runtimeState);
  const bridgeStatus = runtimeState?.bridge?.status ?? 'NOT PROVIDED';
  const crossingReady = runtimeState?.bridge?.crossing_ready === true;
  const certified = runtimeState?.bridge?.certified === true;
  const localReference = runtimeState?.source_mode === 'local-reference';

  return {
    schema: 'bifrost.runtime-execution-policy/v0.1',
    generated_at: new Date().toISOString(),
    packet_id: runtimeState?.packet_id ?? 'REFERENCE',
    shared_state_fingerprint: runtimeState?.shared_state_fingerprint ?? 'LOCAL REFERENCE',
    bridge_status: bridgeStatus,
    crossing_ready: crossingReady,
    certified,
    local_reference: localReference,
    blocks_execution: blocksExecution,
    allowed_actions: blocksExecution ? [] : [...BIFROST_GUARDED_ACTION_IDS],
    blocked_actions: blocksExecution ? [...BIFROST_GUARDED_ACTION_IDS] : [],
    action_boundary: blocksExecution
      ? `${bridgeStatus}: engine execution and old single-state export are blocked until the two-shore packet is corrected.`
      : localReference
        ? 'Local reference execution remains labelled preview mode and is not a certified Bifröst crossing.'
        : certified
          ? 'Two temporal shores are present and fingerprint-compatible. Certified crossing execution may proceed pending platform QA.'
          : 'Two shores are visible but not fully temporal-certified. Execution may proceed as visible preview only.',
    authority: {
      canon_write_performed: false,
      tone_approval_performed: false,
      physical_device_test_performed: false,
    },
  };
}

export function buildBlockedActionReceipt(runtimeState, actionId) {
  const sidecar = buildBifrostReceiptSidecar(runtimeState, {
    notes: [
      `blocked-action:${actionId}`,
      'Runtime execution policy blocked this action before the legacy single-state Bifröst control could run.',
    ],
  });
  return {
    ...sidecar,
    schema: 'bifrost.blocked-action-receipt/v0.1',
    attempted_action: actionId,
    execution_policy: buildBifrostRuntimeExecutionPolicy(runtimeState),
  };
}

export function applyBifrostRuntimeExecutionPolicy(runtimeState, options = {}) {
  const root = options.document ?? globalThis.document;
  const policy = buildBifrostRuntimeExecutionPolicy(runtimeState);

  if (globalThis.window) {
    globalThis.window.__BIFROST_RUNTIME_STATE__ = runtimeState;
    globalThis.window.__BIFROST_RUNTIME_EXECUTION_POLICY__ = policy;
    globalThis.window.dispatchEvent(new CustomEvent('bifrost:execution-policy', { detail: policy }));
  }

  if (!root) return policy;

  for (const id of BIFROST_GUARDED_ACTION_IDS) {
    const button = root.getElementById?.(id);
    if (!button) continue;
    const blocked = policy.blocked_actions.includes(id);
    button.disabled = blocked;
    button.setAttribute('aria-disabled', String(blocked));
    button.dataset.bifrostRuntimeGuard = blocked ? policy.bridge_status : 'allowed';
    button.title = blocked ? policy.action_boundary : '';
  }

  return policy;
}

export function installBifrostRuntimeExecutionBridge(options = {}) {
  const root = options.document ?? globalThis.document;
  if (!root || root.__bifrostRuntimeExecutionBridgeInstalled) return;
  root.__bifrostRuntimeExecutionBridgeInstalled = true;

  root.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('button') : null;
    if (!target || !BIFROST_GUARDED_ACTION_IDS.includes(target.id)) return;

    const runtimeState = options.getRuntimeState?.();
    const policy = applyBifrostRuntimeExecutionPolicy(runtimeState, { document: root });
    if (!policy.blocked_actions.includes(target.id)) return;

    event.preventDefault();
    event.stopPropagation();
    options.onBlockedAction?.(buildBlockedActionReceipt(runtimeState, target.id));
    options.setStatusMessage?.(
      `BLOCKED · ${policy.bridge_status} · ${target.id} did not execute because the two-shore runtime policy failed closed.`,
    );
  }, true);
}
