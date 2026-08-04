import {
  readActiveDualAspectPacket,
  subscribeToDualAspectActivation,
} from '../src/hearthweave-kernel/activation.js';

const AXES = Object.freeze([
  ['P', 'Presence'],
  ['C', 'Coherence'],
  ['R', 'Resonance'],
  ['E', 'Entropy'],
  ['M', 'Memory'],
  ['A', 'Agency'],
  ['Q', 'Qualia'],
]);

const REFERENCE_VALUES = Object.freeze({
  P: 0.72,
  C: 0.81,
  R: 0.67,
  E: 0.31,
  M: 0.76,
  A: 0.84,
  Q: 0.79,
});

const panelId = 'two-shore-premaq-panel';

function short(value, length = 22) {
  const text = String(value ?? 'UNKNOWN');
  if (text.length <= length) return text;
  return `${text.slice(0, Math.max(6, length - 7))}…${text.slice(-6)}`;
}

function finiteValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : null;
}

function axisValue(source, axis) {
  return finiteValue(source?.probabilities?.[axis])
    ?? finiteValue(source?.state?.[axis]?.value)
    ?? finiteValue(source?.premaq?.state?.[axis]?.value)
    ?? finiteValue(source?.observable?.premaq?.state?.[axis]?.value)
    ?? null;
}

function shoreFingerprint(source) {
  return source?.shared_state_fingerprint
    ?? source?.state_fingerprint
    ?? source?.fingerprint
    ?? source?.premaq?.shared_state_fingerprint
    ?? source?.premaq?.state_fingerprint
    ?? null;
}

function shoreId(source, fallback) {
  return source?.state_id
    ?? source?.id
    ?? source?.premaq?.id
    ?? source?.observable?.premaq?.id
    ?? fallback;
}

function readPacket() {
  try {
    return readActiveDualAspectPacket({ storage: sessionStorage });
  } catch {
    return null;
  }
}

function resolveShore(packet, side) {
  if (!packet) {
    return {
      side,
      status: 'LOCAL REFERENCE',
      source: { probabilities: REFERENCE_VALUES, state_id: `reference-${side}` },
      id: `reference-${side}`,
      fingerprint: 'LOCAL REFERENCE',
      note: 'No active DualAspectPacket is bound. Values are labelled local reference only.',
    };
  }

  const temporal = packet?.temporal?.[side] ?? null;
  if (temporal) {
    return {
      side,
      status: side === 'hearthside' ? 'TEMPORAL HEARTHSIDE' : 'TEMPORAL TARGETSIDE',
      source: temporal,
      id: shoreId(temporal, `${side}-temporal`),
      fingerprint: shoreFingerprint(temporal) ?? packet?.correspondence?.shared_state_fingerprint ?? 'NOT PROVIDED',
      note: 'Temporal shore state supplied by the active DualAspectPacket.',
    };
  }

  if (side === 'hearthside' && packet?.observable?.premaq) {
    const source = { premaq: packet.observable.premaq };
    return {
      side,
      status: 'OBSERVABLE PREMAQ ONLY',
      source,
      id: shoreId(source, 'observable-premaq'),
      fingerprint: shoreFingerprint(source) ?? packet?.correspondence?.shared_state_fingerprint ?? 'NOT PROVIDED',
      note: 'Observable PREMAQ is visible, but temporal.hearthside is not present on the packet.',
    };
  }

  if (side === 'targetside' && packet?.experiential?.premaq) {
    const source = { premaq: packet.experiential.premaq };
    return {
      side,
      status: 'EXPERIENTIAL PREMAQ ONLY',
      source,
      id: shoreId(source, 'experiential-premaq'),
      fingerprint: shoreFingerprint(source) ?? packet?.correspondence?.shared_state_fingerprint ?? 'NOT PROVIDED',
      note: 'Experiential PREMAQ is visible, but temporal.targetside is not present on the packet.',
    };
  }

  return {
    side,
    status: 'NOT PROVIDED',
    source: null,
    id: `${side}-missing`,
    fingerprint: 'NOT PROVIDED',
    note: `The active DualAspectPacket does not include ${side} PREMAQ data.`,
  };
}

function bridgeStatus(packet, hearth, target) {
  if (!packet) {
    return {
      label: 'LOCAL REFERENCE',
      detail: 'No active packet is bound. Both shore indicators are visible in reference mode.',
    };
  }

  if (hearth.status === 'NOT PROVIDED' || target.status === 'NOT PROVIDED') {
    return {
      label: 'SHORE_STATE_INCOMPLETE',
      detail: 'At least one shore is missing explicit PREMAQ data. Do not certify two-shore state binding.',
    };
  }

  const hearthFp = hearth.fingerprint;
  const targetFp = target.fingerprint;
  if (hearthFp && targetFp && hearthFp !== 'NOT PROVIDED' && targetFp !== 'NOT PROVIDED' && hearthFp !== targetFp) {
    return {
      label: 'HIDDEN_STATE_DIVERGENCE',
      detail: 'Hearthside and Targetside fingerprints disagree. The crossing must fail closed.',
    };
  }

  return {
    label: 'TWO_SHORE_PREMAQ_VISIBLE',
    detail: 'Both shore indicators are visible. Engine binding still requires core two-shore lineage tests.',
  };
}

function createBars(source) {
  const container = document.createElement('div');
  container.className = 'two-shore-bars';
  for (const [axis, name] of AXES) {
    const value = axisValue(source, axis);
    const row = document.createElement('div');
    row.className = 'axis-row';

    const label = document.createElement('span');
    label.className = 'axis-label';
    label.textContent = axis;
    label.title = name;

    const track = document.createElement('span');
    track.className = 'axis-track';
    const fill = document.createElement('span');
    fill.className = 'axis-fill';
    fill.style.width = value == null ? '0%' : `${(value * 100).toFixed(3)}%`;
    track.append(fill);

    const readout = document.createElement('span');
    readout.className = 'axis-value';
    readout.textContent = value == null ? 'UNKNOWN' : value.toFixed(4);

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
        <p class="eyebrow">TWO-SHORE PREMAQ INDICATOR</p>
        <h2>Hearthside and Targetside</h2>
      </div>
      <button id="refresh-two-shore-premaq" type="button" class="quiet">Refresh shores</button>
    </header>
    <div class="two-shore-grid">
      <section class="shore-card" data-shore="hearthside" aria-label="Hearthside PREMAQ indicator"></section>
      <section class="shore-card" data-shore="bridge" aria-label="Bifröst bridge PREMAQ status"></section>
      <section class="shore-card" data-shore="targetside" aria-label="Targetside PREMAQ indicator"></section>
    </div>
    <p class="boundary-note">This panel is read-only. It exposes both shores and the bridge status without mutating the active packet, writing canon, approving tone, or claiming external physical evidence.</p>
  `;
  panel.querySelector('#refresh-two-shore-premaq')?.addEventListener('click', renderTwoShorePanel);
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
    <div><dt>Note</dt><dd>${shore.note}</dd></div>
  `;

  container.append(header, createBars(shore.source), meta);
}

function renderBridge(container, packet, hearth, target) {
  const status = bridgeStatus(packet, hearth, target);
  const shared = packet?.correspondence?.shared_state_fingerprint ?? 'LOCAL REFERENCE';
  const packetId = packet?.packet_id ?? 'REFERENCE';
  container.replaceChildren();
  container.innerHTML = `
    <div class="shore-heading bridge-heading">
      <small>BRIDGE / BIFRÖST</small>
      <strong data-bridge-status="${status.label}">${status.label}</strong>
      <code>${short(packetId, 34)}</code>
    </div>
    <dl class="shore-meta bridge-meta">
      <div><dt>Shared state</dt><dd>${short(shared, 34)}</dd></div>
      <div><dt>Hearthside</dt><dd>${short(hearth.fingerprint, 30)}</dd></div>
      <div><dt>Targetside</dt><dd>${short(target.fingerprint, 30)}</dd></div>
      <div><dt>Gate</dt><dd>${status.detail}</dd></div>
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

function renderTwoShorePanel() {
  const panel = ensurePanel();
  if (!panel) return;
  const packet = readPacket();
  const hearth = resolveShore(packet, 'hearthside');
  const target = resolveShore(packet, 'targetside');
  renderShore(panel.querySelector('[data-shore="hearthside"]'), 'HEARTHSIDE / OBSERVABLE', hearth);
  renderBridge(panel.querySelector('[data-shore="bridge"]'), packet, hearth, target);
  renderShore(panel.querySelector('[data-shore="targetside"]'), 'TARGETSIDE / EXPERIENTIAL', target);
}

function installStyles() {
  if (document.getElementById('two-shore-premaq-style')) return;
  const style = document.createElement('style');
  style.id = 'two-shore-premaq-style';
  style.textContent = `
    .two-shore-premaq-panel { grid-column: 1 / -1; }
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
    @media (max-width: 980px) { .two-shore-grid { grid-template-columns: 1fr; } .shore-meta div { grid-template-columns: 1fr; gap: 0.25rem; } .shore-meta dd { text-align: left; } }
  `;
  document.head.append(style);
}

function boot() {
  installStyles();
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
