import { buildBifrostCycleReceiptEnvelopes, assertBifrostCycleEnvelopeLineage } from './bifrost-cycle-receipt-envelope.js';
import { enforceBifrostNativeAction } from './bifrost-native-action-guard.js';
import { readActiveDualAspectPacket } from '../src/hearthweave-kernel/activation.js';

export const BIFROST_MAIN_EXPORT_V05_SCHEMA = 'bifrost.current-interface-export/v0.5';
export const BIFROST_MAIN_EXPORT_V05_EVENT = 'bifrost:main-export-v05';
const SESSION_KEY = 'bifrost:current-interface-session:v0.4';
const ACTIVE_EXECUTION_SIDE = 'targetside';

function readPacket() {
  try {
    return readActiveDualAspectPacket({ storage: globalThis.sessionStorage });
  } catch {
    return null;
  }
}

function readSession() {
  try {
    return JSON.parse(globalThis.sessionStorage?.getItem?.(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

function cycleNumberFrom(session) {
  const cycle = Number(session?.state?.spiral?.cycle ?? 0);
  return Number.isFinite(cycle) ? cycle : 0;
}

function downloadJson(payload, filename) {
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function setEngineMessage(message, kind = 'ready') {
  const engineMessage = document.getElementById('engine-message');
  if (!engineMessage) return;
  engineMessage.textContent = message;
  engineMessage.className = `engine-message${kind === 'error' ? ' error' : ''}`;
}

export function buildBifrostMainExportV05({ session, gate, exportedAt = new Date().toISOString() } = {}) {
  if (!session) throw new Error('BIFROST_MAIN_EXPORT_SESSION_REQUIRED');
  if (!gate?.allowed) throw new Error('BIFROST_MAIN_EXPORT_GATE_REQUIRED');

  const runtimeState = gate.runtimeState ?? session?.bifrost_runtime?.runtime_state ?? null;
  const executionPolicy = gate.policy ?? null;
  const nativeActionReceipt = gate.receipt ?? null;
  const sourceBindingReceipt = nativeActionReceipt?.source_binding_receipt
    ?? session?.bifrost_runtime?.source_binding_receipt
    ?? null;
  const cycleReceipts = Array.isArray(session.receipts) ? session.receipts : [];
  const cycleReceiptEnvelopes = buildBifrostCycleReceiptEnvelopes({
    cycleReceipts,
    runtimeState,
    executionPolicy,
    nativeActionReceipt,
    sourceBindingReceipt,
    actionId: 'export-receipts',
    exportedAt,
    notes: ['main-export-v0.5-inline-cycle-passports'],
  });

  for (const envelope of cycleReceiptEnvelopes) assertBifrostCycleEnvelopeLineage(envelope);

  return Object.freeze({
    schema: BIFROST_MAIN_EXPORT_V05_SCHEMA,
    exported_at: exportedAt,
    source: {
      mode: session.source_mode ?? 'reference',
      packet_fingerprint: session.packet_fingerprint ?? null,
      source_state_id: session.source_state?.state_id ?? null,
      selected_execution_side: nativeActionReceipt?.selected_execution_side
        ?? sourceBindingReceipt?.selected_side
        ?? ACTIVE_EXECUTION_SIDE,
      execution_source: nativeActionReceipt?.execution_source
        ?? session?.bifrost_runtime?.execution_source
        ?? null,
      source_binding_receipt: sourceBindingReceipt,
    },
    bifrost_runtime: {
      runtime_state: runtimeState,
      execution_source: session?.bifrost_runtime?.execution_source ?? nativeActionReceipt?.execution_source ?? null,
      source_binding_receipt: sourceBindingReceipt,
      execution_policy: executionPolicy,
      native_action_receipt: nativeActionReceipt,
    },
    current_state: session.state ?? null,
    source_state: session.source_state ?? null,
    cycle_receipts: cycleReceipts,
    cycle_receipt_envelopes: cycleReceiptEnvelopes,
    cycle_envelope_count: cycleReceiptEnvelopes.length,
    authority: {
      canon_write_performed: false,
      tone_approval_performed: false,
      physical_device_test_performed: false,
    },
    compatibility: {
      replaces_legacy_export_schema: 'bifrost.current-interface-export/v0.4',
      legacy_export_click_prevented: true,
      sidecar_export_still_available: true,
    },
  });
}

export function exportBifrostMainV05(options = {}) {
  const session = options.session ?? readSession();
  const gate = options.gate ?? enforceBifrostNativeAction({
    actionId: 'export-receipts',
    packetReader: readPacket,
    active_execution_side: ACTIVE_EXECUTION_SIDE,
    setStatus: (message) => setEngineMessage(message, 'error'),
    notes: ['main export v0.5 cut-over'],
  });
  if (!gate.allowed) return null;

  const payload = buildBifrostMainExportV05({ session, gate });
  downloadJson(payload, `bifrost-current-interface-v0.5-cycle-${cycleNumberFrom(session)}.json`);

  if (globalThis.window) {
    globalThis.window.__BIFROST_LAST_MAIN_EXPORT_V05__ = payload;
    globalThis.window.dispatchEvent(new CustomEvent(BIFROST_MAIN_EXPORT_V05_EVENT, { detail: payload }));
  }
  setEngineMessage(`EXPORTED · v0.5 · ${payload.cycle_envelope_count} cycle envelope${payload.cycle_envelope_count === 1 ? '' : 's'}.`);
  return payload;
}

export function installBifrostMainExportV05(options = {}) {
  const root = options.document ?? globalThis.document;
  if (!root || root.__bifrostMainExportV05Installed) return;
  root.__bifrostMainExportV05Installed = true;

  root.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('button') : null;
    if (button?.id !== 'export-receipts') return;

    event.preventDefault();
    event.stopPropagation();
    exportBifrostMainV05({ session: options.readSession?.() ?? undefined });
  }, true);
}
