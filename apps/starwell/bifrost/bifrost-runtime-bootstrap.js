import {
  readActiveDualAspectPacket,
  subscribeToDualAspectActivation,
} from '../src/hearthweave-kernel/activation.js';
import {
  buildBifrostReceiptSidecar,
  buildBifrostRuntimeState,
} from './bifrost-runtime-state.js';
import {
  applyBifrostRuntimeExecutionPolicy,
  installBifrostRuntimeExecutionBridge,
} from './bifrost-runtime-engine-bridge.js';
import { installBifrostCycleEnvelopeExportSidecar } from './bifrost-cycle-envelope-export-sidecar.js';
import { installBifrostMainExportV05 } from './bifrost-main-export-v05.js';

const BOOTSTRAP_SCHEMA = 'bifrost.runtime-bootstrap/v0.1';
const BOOTSTRAP_EVENT = 'bifrost:runtime-bootstrap';
const LAST_BLOCKED_KEY = '__BIFROST_LAST_BLOCKED_ACTION_RECEIPT__';
const RUNTIME_KEY = '__BIFROST_RUNTIME_STATE__';
const POLICY_KEY = '__BIFROST_RUNTIME_EXECUTION_POLICY__';

let currentRuntimeState = null;
let currentExecutionPolicy = null;
let currentBootstrapReceipt = null;

export function readBootstrapPacket(storage = globalThis.sessionStorage) {
  try {
    return readActiveDualAspectPacket({ storage });
  } catch {
    return null;
  }
}

function writeGlobals(runtimeState, policy, bootstrapReceipt) {
  if (!globalThis.window) return;
  globalThis.window[RUNTIME_KEY] = runtimeState;
  globalThis.window[POLICY_KEY] = policy;
  globalThis.window.__BIFROST_RUNTIME_BOOTSTRAP_RECEIPT__ = bootstrapReceipt;
  globalThis.window.dispatchEvent(new CustomEvent(BOOTSTRAP_EVENT, {
    detail: bootstrapReceipt,
  }));
}

function updateVisibleStatus(policy) {
  const sourceStatus = globalThis.document?.getElementById?.('source-status');
  if (!sourceStatus) return;
  sourceStatus.textContent = policy.blocks_execution
    ? `BLOCKED · ${policy.bridge_status}`
    : policy.local_reference
      ? 'LOCAL REFERENCE · runtime guarded'
      : `RUNTIME GUARDED · ${policy.bridge_status}`;
}

export function buildBootstrapReceipt(runtimeState, policy, notes = []) {
  return {
    ...buildBifrostReceiptSidecar(runtimeState, { notes }),
    schema: BOOTSTRAP_SCHEMA,
    execution_policy: policy,
    bootstrap: {
      loaded_before_main: true,
      guard_installed_before_legacy_handlers: true,
      cycle_envelope_export_sidecar_installed: true,
      main_export_v05_cutover_installed: true,
      event_name: BOOTSTRAP_EVENT,
      guarded_actions: policy.blocked_actions.length
        ? policy.blocked_actions
        : policy.allowed_actions,
    },
  };
}

export function refreshBifrostRuntimeBootstrap(options = {}) {
  const packet = options.packet ?? readBootstrapPacket(options.storage);
  currentRuntimeState = buildBifrostRuntimeState(packet, {
    active_execution_side: options.active_execution_side ?? 'targetside',
  });
  currentExecutionPolicy = applyBifrostRuntimeExecutionPolicy(currentRuntimeState, {
    document: options.document ?? globalThis.document,
  });
  currentBootstrapReceipt = buildBootstrapReceipt(currentRuntimeState, currentExecutionPolicy, [
    options.reason ?? 'bootstrap-refresh',
    'Runtime bootstrap installs the two-shore execution policy before the legacy Bifröst page handlers run.',
  ]);
  writeGlobals(currentRuntimeState, currentExecutionPolicy, currentBootstrapReceipt);
  updateVisibleStatus(currentExecutionPolicy);
  return {
    runtimeState: currentRuntimeState,
    executionPolicy: currentExecutionPolicy,
    bootstrapReceipt: currentBootstrapReceipt,
  };
}

export function getBifrostRuntimeBootstrapState() {
  return {
    runtimeState: currentRuntimeState,
    executionPolicy: currentExecutionPolicy,
    bootstrapReceipt: currentBootstrapReceipt,
  };
}

export function bootBifrostRuntimeBootstrap(options = {}) {
  const root = options.document ?? globalThis.document;
  if (!root || root.__bifrostRuntimeBootstrapInstalled) return getBifrostRuntimeBootstrapState();
  root.__bifrostRuntimeBootstrapInstalled = true;

  installBifrostRuntimeExecutionBridge({
    document: root,
    getRuntimeState: () => currentRuntimeState ?? refreshBifrostRuntimeBootstrap({
      document: root,
      reason: 'guard-requested-runtime-before-render',
    }).runtimeState,
    setStatusMessage: (message) => {
      const engineMessage = root.getElementById?.('engine-message');
      if (engineMessage) {
        engineMessage.className = 'engine-message error';
        engineMessage.textContent = message;
      }
    },
    onBlockedAction: (receipt) => {
      if (globalThis.window) {
        globalThis.window[LAST_BLOCKED_KEY] = receipt;
      }
    },
  });

  installBifrostCycleEnvelopeExportSidecar({
    document: root,
    getRuntimeState: () => currentRuntimeState,
    getExecutionPolicy: () => currentExecutionPolicy,
  });

  installBifrostMainExportV05({ document: root });

  const first = refreshBifrostRuntimeBootstrap({
    document: root,
    reason: 'initial-bootstrap-before-main',
  });

  subscribeToDualAspectActivation(() => refreshBifrostRuntimeBootstrap({
    document: root,
    reason: 'dual-aspect-activation',
  }), {
    storage: globalThis.sessionStorage,
    eventTarget: globalThis.window,
    emitCurrent: true,
  });

  globalThis.window?.addEventListener?.('storage', () => refreshBifrostRuntimeBootstrap({
    document: root,
    reason: 'storage-refresh',
  }));

  return first;
}

if (globalThis.document?.readyState === 'loading') {
  globalThis.document.addEventListener('DOMContentLoaded', () => bootBifrostRuntimeBootstrap(), { once: true });
} else if (globalThis.document) {
  bootBifrostRuntimeBootstrap();
}
