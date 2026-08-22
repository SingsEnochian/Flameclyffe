import {
  assertBifrostCycleEnvelopeLineage,
  buildBifrostCycleReceiptEnvelopes,
} from './bifrost-cycle-receipt-envelope.js';

const SESSION_KEY = 'bifrost:current-interface-session:v0.4';
const SIDECAR_SCHEMA = 'bifrost.cycle-envelope-export-sidecar/v0.1';
const SIDECAR_EVENT = 'bifrost:cycle-envelope-export-sidecar';

function readSession(storage = globalThis.sessionStorage) {
  try {
    return JSON.parse(storage?.getItem?.(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

function exportJson(payload, filename) {
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

export function buildBifrostCycleEnvelopeExportPayload({
  session = null,
  runtimeState = null,
  executionPolicy = null,
  nativeActionReceipt = null,
  exportedAt = new Date().toISOString(),
} = {}) {
  const receipts = Array.isArray(session?.receipts) ? session.receipts : [];
  const state = runtimeState ?? session?.bifrost_runtime?.runtime_state ?? nativeActionReceipt?.runtime_state ?? null;
  const policy = executionPolicy ?? nativeActionReceipt?.execution_policy ?? null;
  const sourceBindingReceipt = nativeActionReceipt?.source_binding_receipt
    ?? session?.bifrost_runtime?.source_binding_receipt
    ?? null;

  const envelopes = buildBifrostCycleReceiptEnvelopes({
    cycleReceipts: receipts,
    runtimeState: state,
    executionPolicy: policy,
    nativeActionReceipt,
    sourceBindingReceipt,
    actionId: 'export-receipts',
    exportedAt,
    notes: ['cycle-envelope-export-sidecar', 'Generated after the main Bifröst export action.'],
  });

  for (const envelope of envelopes) assertBifrostCycleEnvelopeLineage(envelope);

  return Object.freeze({
    schema: SIDECAR_SCHEMA,
    exported_at: exportedAt,
    cycle_envelope_count: envelopes.length,
    source_binding_receipt: sourceBindingReceipt,
    execution_policy: policy,
    runtime_state: state,
    cycle_receipt_envelopes: envelopes,
    authority: {
      canon_write_performed: false,
      tone_approval_performed: false,
      physical_device_test_performed: false,
    },
  });
}

export function installBifrostCycleEnvelopeExportSidecar(options = {}) {
  const root = options.document ?? globalThis.document;
  if (!root || root.__bifrostCycleEnvelopeExportSidecarInstalled) return;
  root.__bifrostCycleEnvelopeExportSidecarInstalled = true;

  root.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('button') : null;
    if (target?.id !== 'export-receipts') return;

    globalThis.window?.setTimeout?.(() => {
      const session = readSession(options.storage);
      const runtimeState = options.getRuntimeState?.()
        ?? globalThis.window?.__BIFROST_RUNTIME_STATE__
        ?? session?.bifrost_runtime?.runtime_state
        ?? null;
      const executionPolicy = options.getExecutionPolicy?.()
        ?? globalThis.window?.__BIFROST_RUNTIME_EXECUTION_POLICY__
        ?? null;
      const nativeActionReceipt = globalThis.window?.__BIFROST_LAST_NATIVE_ACTION_RECEIPT__ ?? null;

      if (!Array.isArray(session?.receipts) || session.receipts.length === 0) return;

      try {
        const payload = buildBifrostCycleEnvelopeExportPayload({
          session,
          runtimeState,
          executionPolicy,
          nativeActionReceipt,
        });
        globalThis.window.__BIFROST_LAST_CYCLE_ENVELOPE_EXPORT__ = payload;
        globalThis.window.dispatchEvent(new CustomEvent(SIDECAR_EVENT, { detail: payload }));
        exportJson(payload, `bifrost-cycle-receipt-envelopes-${session.state?.spiral?.cycle ?? payload.cycle_envelope_count}.json`);
      } catch (error) {
        globalThis.window.__BIFROST_LAST_CYCLE_ENVELOPE_EXPORT_ERROR__ = {
          schema: `${SIDECAR_SCHEMA}.error`,
          message: error.message,
          created_at: new Date().toISOString(),
        };
      }
    }, 0);
  });
}
