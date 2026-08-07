import {
  readActiveDualAspectPacket,
  subscribeToDualAspectActivation,
} from '../src/hearthweave-kernel/activation.js';
import {
  PREMAQ_AXES,
  axisValue,
  buildBifrostReceiptSidecar,
  buildBifrostRuntimeState,
  bridgeBlocksCertifiedExecution,
  short,
} from './bifrost-runtime-state.js';
import {
  PREMAQ_NAMES,
  BRAIDED_SPINE_SCHEMA,
} from '../src/hearthweave-kernel/braided-spine.js';

const AXIS_NAMES = PREMAQ_NAMES;

const panelId = 'two-shore-premaq-panel';
const runtimeStatusId = 'two-shore-runtime-status';
const guardedButtonIds = Object.freeze([
  'run-window',
  'sound-pair',
  'play-premaq-song',
]);

let currentRuntimeState = null;

function readPacket() {
  try {
    return readActiveDualAspectPacket({ storage: sessionStorage });
  } catch {
    return null;
  }
}

function createBars(source) {
  const container = document.createElement('div');
  container.className = 'two-shore-bars';
  for (const axis of PREMAQ_AXES) {
    const value = axisValue(source, axis);
    const row = document.createElement('div');
    row.className = 'axis-row';

    const label = document.createElement('span');
    label.className = 'axis-label';
    label.textContent = axis;
    label.title = AXIS_NAMES[axis];

    const track = document.createElement('span');
    track.className = 'axis-track';
    const fill = document.createElement('span');
    fill.className = 'axis-fill';
    fill.style.width = value == null ? '0%' : `${(value * 100).toFixed(3)}%`;
    track.append(fill);

    const readout = document.createElement('span');
    readout.className = 'axis-value';
    readout.textContent = value == null ? 'OPEN' : value.toFixed(4);

    row.append(label, track, readout);
    container.append(row);
  }
  return container;
}

function createPanel() {
  const panel = document.createElement('article');
  panel.id = panelId;
  panel.className = 'panel two-shore-premaq-panel';
  panel.innerHTML = `
    <header class="panel-header">
      <div>
        <p class="eyebrow">TWO-SHORE PREMAQ · BRAIDED SPINE</p>
        <h2>Hearthside and Targetside</h2>
      </div>
      <div class="two-shore-actions">
        <button id="refresh-two-shore-premaq" type="button" class="quiet">Refresh shores</button>
        <button id="export-two-shore-receipt" type="button" class="quiet">Export bridge receipt</button>
      </div>
    </header>
    <div class="two-shore-grid">
      <section class="shore-card" data-shore="hearthside" aria-label="Hearthside PREMAQ indicator"></section>
      <section class="shore-card" data-shore="bridge" aria-label="Bifröst bridge PREMAQ status"></section>
      <section class="shore-card" data-shore="targetside" aria-label="Targetside PREMAQ indicator"></section>
    </div>
    <p id="${runtimeStatusId}" class="engine-message" role="status">TWO-SHORE CHECK · waiting for active packet.</p>
    <p class="boundary-note">Both shores remain lit. This chamber reads their shared relation from the same Braid Packet and carries their lineage into the bridge receipt.</p>
  `;
  panel.querySelector('#refresh-two-shore-premaq')?.addEventListener('click', renderTwoShorePanel);
  panel.querySelector('#export-two-shore-receipt')?.addEventListener('click', () => exportTwoShoreReceipt('manual-two-shore-export'));
  return panel;
}

function renderShore(container, title, shore) {
  container.replaceChildren();
  const header = document.createElement('div');
  header.className = 'shore-heading';
  header.innerHTML = `
    <small>${title}</small>
    <strong>${shore.status}</strong>
    <code>${short(shore.id, 32)}</code>
  `;

  const meta = document.createElement('dl');
  meta.className = 'shore-meta';
  meta.innerHTML = `
    <div><dt>Fingerprint</dt><dd>${short(shore.fingerprint, 34)}</dd></div>
    <div><dt>Temporal state</dt><dd>${shore.temporal ? 'YES' : 'OPEN'}</dd></div>
    <div><dt>Relation</dt><dd>${shore.note}</dd></div>
  `;

  container.append(header, createBars(shore.source), meta);
}

function renderBridge(container, runtime) {
  const { bridge, hearthside, targetside } = runtime;
  container.replaceChildren();
  container.innerHTML = `
    <div class="shore-heading bridge-heading">
      <small>BRIDGE / BIFRÖST</small>
      <strong data-bridge-status="${bridge.status}">${bridge.status}</strong>
      <code>${short(runtime.packet_id, 34)}</code>
    </div>
    <dl class="shore-meta bridge-meta">
      <div><dt>Braided Spine</dt><dd>${BRAIDED_SPINE_SCHEMA}</dd></div>
      <div><dt>Shared state</dt><dd>${short(runtime.shared_state_fingerprint, 34)}</dd></div>
      <div><dt>Hearthside</dt><dd>${short(hearthside.fingerprint, 30)}</dd></div>
      <div><dt>Targetside</dt><dd>${short(targetside.fingerprint, 30)}</dd></div>
      <div><dt>Crossing ready</dt><dd>${bridge.crossing_ready ? 'YES' : 'OPEN'}</dd></div>
      <div><dt>Gate</dt><dd>${bridge.detail}</dd></div>
    </dl>
  `;
}

function ensurePanel() {
  let panel = document.getElementById(panelId);
  if (panel) return panel;
  panel = createPanel();
  const anchor = document.querySelector('.premaq-panel');
  if (anchor) anchor.insertAdjacentElement('afterend', panel);
  else document.querySelector('.dashboard-grid')?.append(panel);
  return panel;
}

function setRuntimeStatus(runtime) {
  const status = document.getElementById(runtimeStatusId);
  if (!status) return;
  status.className = `engine-message${bridgeBlocksCertifiedExecution(runtime) ? ' error' : ''}`;
  status.textContent = bridgeBlocksCertifiedExecution(runtime)
    ? `BLOCKED · ${runtime.bridge.status} · the packet relation must be restored before this crossing continues.`
    : `${runtime.bridge.status} · ${runtime.bridge.detail}`;
}

function setControlGuard(runtime) {
  const blocked = bridgeBlocksCertifiedExecution(runtime);
  for (const id of guardedButtonIds) {
    const button = document.getElementById(id);
    if (!button) continue;
    button.disabled = blocked;
    button.setAttribute('aria-disabled', String(blocked));
    button.title = blocked
      ? `${runtime.bridge.status}: restore the two-shore packet relation before execution.`
      : '';
  }
}

function renderTwoShorePanel() {
  const panel = ensurePanel();
  if (!panel) return;
  const packet = readPacket();
  currentRuntimeState = buildBifrostRuntimeState(packet);
  renderShore(panel.querySelector('[data-shore="hearthside"]'), 'HEARTHSIDE', currentRuntimeState.hearthside);
  renderBridge(panel.querySelector('[data-shore="bridge"]'), currentRuntimeState);
  renderShore(panel.querySelector('[data-shore="targetside"]'), 'TARGETSIDE', currentRuntimeState.targetside);
  setRuntimeStatus(currentRuntimeState);
  setControlGuard(currentRuntimeState);
  window.dispatchEvent(new CustomEvent('bifrost:runtime-state', { detail: currentRuntimeState }));
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

function exportTwoShoreReceipt(reason) {
  const runtime = currentRuntimeState ?? buildBifrostRuntimeState(readPacket());
  const sidecar = buildBifrostReceiptSidecar(runtime, {
    notes: [
      reason,
      `Braided Spine: ${BRAIDED_SPINE_SCHEMA}`,
      'Sidecar carries both shores, bridge state, shared fingerprint and lineage.',
    ],
  });
  exportJson(sidecar, `bifrost-two-shore-${runtime.bridge.status.toLowerCase().replaceAll('_', '-')}.json`);
}

function installExportSidecarHook() {
  const exportButton = document.getElementById('export-receipts');
  if (!exportButton || exportButton.dataset.twoShoreSidecar === 'installed') return;
  exportButton.dataset.twoShoreSidecar = 'installed';
  exportButton.addEventListener('click', () => {
    window.setTimeout(() => exportTwoShoreReceipt('automatic-sidecar-for-cycle-receipt-export'), 0);
  });
}

function installExecutionCaptureGuard() {
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('button') : null;
    if (!target || !guardedButtonIds.includes(target.id)) return;
    const runtime = currentRuntimeState ?? buildBifrostRuntimeState(readPacket());
    if (!bridgeBlocksCertifiedExecution(runtime)) return;
    event.preventDefault();
    event.stopPropagation();
    setRuntimeStatus(runtime);
  }, true);
}

function installStyles() {
  if (document.getElementById('two-shore-premaq-style')) return;
  const style = document.createElement('style');
  style.id = 'two-shore-premaq-style';
  style.textContent = `
    .two-shore-premaq-panel { grid-column: 1 / -1; }
    .two-shore-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 0.5rem; }
    .two-shore-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(16rem, 0.8fr) minmax(0, 1fr); gap: 0.85rem; }
    .shore-card { min-width: 0; padding: 0.9rem; border: 1px solid var(--line); border-radius: 0.95rem; background: rgba(255, 255, 255, 0.018); }
    .shore-card[data-shore="bridge"] { border-color: rgba(243, 204, 117, 0.24); background: linear-gradient(145deg, rgba(243, 204, 117, 0.045), rgba(131, 239, 217, 0.025)); }
    .shore-heading { display: grid; gap: 0.34rem; margin-bottom: 0.85rem; }
    .shore-heading small { color: var(--muted); font-size: 0.66rem; font-weight: 760; letter-spacing: 0.11em; text-transform: uppercase; }
    .shore-heading strong { color: var(--ink); font-size: 0.85rem; letter-spacing: 0.04em; }
    .shore-heading [data-bridge-status="HIDDEN_STATE_DIVERGENCE"], .shore-heading [data-bridge-status="SHORE_STATE_INCOMPLETE"] { color: var(--red); }
    .shore-heading code { overflow-wrap: anywhere; color: var(--gold); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.72rem; }
    .two-shore-bars { display: grid; gap: 0.55rem; }
    .shore-meta { display: grid; gap: 0.45rem; margin: 0.85rem 0 0; }
    .shore-meta div { display: grid; grid-template-columns: 7rem minmax(0, 1fr); gap: 0.7rem; padding-top: 0.45rem; border-top: 1px solid var(--line); }
    .shore-meta dt { color: var(--muted); font-size: 0.68rem; }
    .shore-meta dd { min-width: 0; margin: 0; overflow-wrap: anywhere; color: var(--muted); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.68rem; text-align: right; }
    button[disabled], button[aria-disabled="true"] { cursor: not-allowed; opacity: 0.52; transform: none !important; }
    @media (max-width: 980px) { .two-shore-grid { grid-template-columns: 1fr; } .shore-meta div { grid-template-columns: 1fr; gap: 0.25rem; } .shore-meta dd { text-align: left; } .two-shore-actions { justify-content: flex-start; } }
  `;
  document.head.append(style);
}

function boot() {
  installStyles();
  installExecutionCaptureGuard();
  installExportSidecarHook();
  renderTwoShorePanel();
  subscribeToDualAspectActivation(() => renderTwoShorePanel(), {
    storage: sessionStorage,
    eventTarget: window,
    emitCurrent: true,
  });
  window.addEventListener('storage', renderTwoShorePanel);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
