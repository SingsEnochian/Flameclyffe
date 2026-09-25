import {
  AIOS_KERNEL_BRIDGE_SCHEMA,
  createAIOSKernelBridge,
  loadAIOSKernelConfig,
  saveAIOSKernelConfig,
} from './aios/aios-kernel-bridge.js';

export const AIOS_CODEX_SIDECAR_SCHEMA = 'hearthweave.aios-codex-sidecar/v0.1';
export const AIOS_CODEX_EVENT = 'arcsweep:aios-kernel-changed';

const BOOK_ID = 'arcsweep-magic-book';
const PANEL_SELECTOR = '[data-aios-codex-kernel]';

let installed = false;
let rootObserver = null;
let pollTimer = 0;
let refreshing = false;
let latest = null;
let bridge = null;
let config = null;

function bookRoot() {
  return globalThis.document?.getElementById?.(BOOK_ID) || null;
}

function countProcesses(snapshot, state) {
  return (snapshot?.processes || []).filter((process) => String(process?.status || '').toLowerCase() === state).length;
}

function summary(snapshot) {
  const components = snapshot?.components || {};
  const componentValues = Object.values(components);
  const active = componentValues.filter((value) => value === 'active').length;
  const running = countProcesses(snapshot, 'running');
  const completed = countProcesses(snapshot, 'completed');
  return Object.freeze({
    activeComponents: active,
    componentCount: componentValues.length,
    llmCount: snapshot?.llms?.length || 0,
    running,
    completed,
  });
}

function stateCopy(state) {
  if (state === 'ready') return 'awake';
  if (state === 'degraded') return 'partial';
  if (state === 'blocked') return 'sealed';
  return 'quiet';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function panelMarkup() {
  return [
    `<aside class="codex-aios-kernel" data-aios-codex-kernel data-state="offline" data-schema="${AIOS_CODEX_SIDECAR_SCHEMA}">`,
      '<button type="button" class="codex-aios-kernel-seal" data-aios-kernel-toggle aria-expanded="false">',
        '<span class="codex-aios-kernel-sigil" aria-hidden="true">⌬</span>',
        '<span class="codex-aios-kernel-name">Kernel</span>',
        '<span class="codex-aios-kernel-state" data-aios-kernel-state>quiet</span>',
      '</button>',
      '<section class="codex-aios-kernel-fold" data-aios-kernel-fold hidden>',
        '<header><strong>AIOS Kernel Seam</strong><small>runtime substrate · not identity authority</small></header>',
        '<div class="codex-aios-kernel-vitals" data-aios-kernel-vitals>',
          '<span>Kernel not yet read.</span>',
        '</div>',
        '<div class="codex-aios-kernel-processes" data-aios-kernel-processes></div>',
        '<label class="codex-aios-kernel-endpoint">',
          '<span>Kernel endpoint</span>',
          '<input type="url" spellcheck="false" autocomplete="off" data-aios-kernel-endpoint>',
        '</label>',
        '<div class="codex-aios-kernel-actions">',
          '<button type="button" data-aios-kernel-save>Use endpoint</button>',
          '<button type="button" data-aios-kernel-refresh>Refresh</button>',
        '</div>',
        '<p class="codex-aios-kernel-message" data-aios-kernel-message></p>',
      '</section>',
    '</aside>',
  ].join('');
}

function installStyles() {
  const doc = globalThis.document;
  if (!doc?.head || doc.getElementById('aios-codex-kernel-styles')) return;
  const style = doc.createElement('style');
  style.id = 'aios-codex-kernel-styles';
  style.textContent = `
#${BOOK_ID} .codex-aios-kernel{
  position:absolute;
  top:clamp(.55rem,1.1vw,.9rem);
  left:clamp(.55rem,1.1vw,.9rem);
  z-index:13;
  width:min(21rem,calc(100% - 1.1rem));
  color:var(--codex-foam-100,#B8DDE0);
  font:600 .72rem/1.35 system-ui,sans-serif;
  pointer-events:none;
}
#${BOOK_ID} .codex-aios-kernel-seal,
#${BOOK_ID} .codex-aios-kernel-fold{pointer-events:auto}
#${BOOK_ID} .codex-aios-kernel-seal{
  display:inline-flex;
  align-items:center;
  gap:.42rem;
  min-height:34px;
  padding:.36rem .62rem;
  border:1px solid color-mix(in srgb,var(--codex-stone-600,#3B5D73) 62%,transparent);
  border-radius:999px;
  background:linear-gradient(145deg,color-mix(in srgb,var(--codex-glass-smoke,#3C4046) 76%,transparent),color-mix(in srgb,var(--codex-abyss-1000,#071A24) 88%,transparent));
  box-shadow:0 9px 24px rgba(0,0,0,.24),inset 0 0 0 1px rgba(255,255,255,.018);
  color:inherit;
  backdrop-filter:blur(12px) saturate(108%);
  cursor:pointer;
}
#${BOOK_ID} .codex-aios-kernel-sigil{font:700 1rem/1 Georgia,serif;color:var(--codex-stone-600,#3B5D73)}
#${BOOK_ID} .codex-aios-kernel-state{font-size:.64rem;letter-spacing:.08em;text-transform:uppercase;color:var(--codex-stone-600,#3B5D73)}
#${BOOK_ID} .codex-aios-kernel[data-state="ready"] .codex-aios-kernel-seal{border-color:color-mix(in srgb,var(--codex-teal-500,#2BA59A) 42%,transparent)}
#${BOOK_ID} .codex-aios-kernel[data-state="ready"] .codex-aios-kernel-sigil,
#${BOOK_ID} .codex-aios-kernel[data-state="ready"] .codex-aios-kernel-state{color:var(--codex-seafoam-300,#67C6C1)}
#${BOOK_ID} .codex-aios-kernel[data-state="degraded"] .codex-aios-kernel-seal{border-color:color-mix(in srgb,var(--codex-old-gold,#C7A963) 42%,transparent)}
#${BOOK_ID} .codex-aios-kernel[data-state="degraded"] .codex-aios-kernel-sigil,
#${BOOK_ID} .codex-aios-kernel[data-state="degraded"] .codex-aios-kernel-state{color:var(--codex-champagne,#D6C7B3)}
#${BOOK_ID} .codex-aios-kernel-fold{
  margin-top:.42rem;
  padding:.75rem;
  border:1px solid color-mix(in srgb,var(--codex-champagne,#D6C7B3) 18%,transparent);
  border-radius:14px;
  background:linear-gradient(145deg,color-mix(in srgb,var(--codex-glass-smoke,#3C4046) 91%,transparent),color-mix(in srgb,var(--codex-glass-teal,#0D3B43) 36%,transparent));
  box-shadow:0 18px 48px rgba(0,0,0,.34),inset 0 0 28px rgba(103,198,193,.02);
  backdrop-filter:blur(18px) saturate(108%);
}
#${BOOK_ID} .codex-aios-kernel-fold header{display:flex;justify-content:space-between;align-items:baseline;gap:.6rem;margin-bottom:.62rem}
#${BOOK_ID} .codex-aios-kernel-fold header strong{font-family:Georgia,"Times New Roman",serif;font-size:.92rem;color:var(--codex-champagne,#D6C7B3)}
#${BOOK_ID} .codex-aios-kernel-fold header small{color:var(--codex-stone-600,#3B5D73);font-size:.58rem;letter-spacing:.05em;text-align:right}
#${BOOK_ID} .codex-aios-kernel-vitals{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.36rem;margin-bottom:.58rem}
#${BOOK_ID} .codex-aios-kernel-vitals span{padding:.42rem;border:1px solid color-mix(in srgb,var(--codex-stone-600,#3B5D73) 34%,transparent);border-radius:9px;background:rgba(7,26,36,.34);font-size:.64rem;font-variant-numeric:tabular-nums}
#${BOOK_ID} .codex-aios-kernel-processes{display:grid;gap:.24rem;max-height:8.5rem;overflow:auto;margin-bottom:.58rem;scrollbar-width:thin}
#${BOOK_ID} .codex-aios-process{display:flex;gap:.5rem;justify-content:space-between;padding:.34rem .42rem;border-inline-start:1px solid color-mix(in srgb,var(--codex-teal-500,#2BA59A) 32%,transparent);background:linear-gradient(90deg,rgba(20,102,109,.08),transparent)}
#${BOOK_ID} .codex-aios-process small{color:var(--codex-stone-600,#3B5D73)}
#${BOOK_ID} .codex-aios-kernel-endpoint{display:grid;gap:.22rem;margin:.54rem 0}
#${BOOK_ID} .codex-aios-kernel-endpoint span{font-size:.58rem;text-transform:uppercase;letter-spacing:.08em;color:var(--codex-stone-600,#3B5D73)}
#${BOOK_ID} .codex-aios-kernel-endpoint input{width:100%;box-sizing:border-box;padding:.42rem .5rem;border:1px solid color-mix(in srgb,var(--codex-stone-600,#3B5D73) 45%,transparent);border-radius:8px;background:rgba(7,26,36,.52);color:var(--codex-foam-100,#B8DDE0);font:500 .66rem/1.2 ui-monospace,SFMono-Regular,Consolas,monospace}
#${BOOK_ID} .codex-aios-kernel-actions{display:flex;gap:.38rem;justify-content:flex-end}
#${BOOK_ID} .codex-aios-kernel-actions button{padding:.36rem .55rem;border:1px solid color-mix(in srgb,var(--codex-champagne,#D6C7B3) 18%,transparent);border-radius:999px;background:rgba(13,59,67,.28);color:inherit;font:700 .62rem/1 system-ui,sans-serif;cursor:pointer}
#${BOOK_ID} .codex-aios-kernel-message{min-height:1em;margin:.48rem 0 0;color:color-mix(in srgb,var(--codex-lilac-300,#9AA3C4) 72%,var(--codex-foam-100,#B8DDE0));font-size:.62rem;font-weight:500}
@media(max-width:760px){#${BOOK_ID} .codex-aios-kernel{position:relative;top:auto;left:auto;width:auto;margin:.45rem .55rem 0}#${BOOK_ID} .codex-aios-kernel-vitals{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){#${BOOK_ID} .codex-aios-kernel *{transition:none!important;animation:none!important}}
`;
  doc.head.append(style);
}

function ensurePanel() {
  const root = bookRoot();
  const stage = root?.querySelector?.('.magic-book-stage');
  if (!root || !stage) return null;
  let panel = root.querySelector(PANEL_SELECTOR);
  if (!panel) {
    stage.insertAdjacentHTML('afterbegin', panelMarkup());
    panel = root.querySelector(PANEL_SELECTOR);
    const input = panel?.querySelector?.('[data-aios-kernel-endpoint]');
    if (input) input.value = config?.baseUrl || '';
  }
  return panel;
}

function render(snapshot = latest) {
  const panel = ensurePanel();
  if (!panel) return;
  const state = snapshot?.state || 'offline';
  panel.dataset.state = state;
  const stateNode = panel.querySelector('[data-aios-kernel-state]');
  if (stateNode) stateNode.textContent = stateCopy(state);
  const input = panel.querySelector('[data-aios-kernel-endpoint]');
  if (input && document.activeElement !== input) input.value = config?.baseUrl || '';

  const vitals = panel.querySelector('[data-aios-kernel-vitals]');
  const stats = summary(snapshot);
  if (vitals) {
    vitals.innerHTML = [
      `<span><strong>${stats.activeComponents}/${stats.componentCount || 0}</strong><br>organs awake</span>`,
      `<span><strong>${stats.llmCount}</strong><br>model routes</span>`,
      `<span><strong>${stats.running}</strong><br>work in motion</span>`,
    ].join('');
  }

  const processes = panel.querySelector('[data-aios-kernel-processes]');
  if (processes) {
    const rows = (snapshot?.processes || []).slice(-6).reverse();
    processes.innerHTML = rows.length
      ? rows.map((process) => {
        const task = process?.task || process?.config?.task || 'Unnamed work';
        const status = process?.status || 'unknown';
        return `<div class="codex-aios-process"><span>${escapeHtml(task)}</span><small>${escapeHtml(status)}</small></div>`;
      }).join('')
      : '<div class="codex-aios-process"><span>No queued agent work.</span><small>quiet</small></div>';
  }

  const message = panel.querySelector('[data-aios-kernel-message]');
  if (message) {
    if (snapshot?.state === 'blocked') message.textContent = snapshot.message || 'Kernel endpoint is sealed by transport rules.';
    else if (snapshot?.state === 'offline') message.textContent = 'No AIOS kernel answered. The Codex remains fully usable without it.';
    else if (snapshot?.errors?.length) message.textContent = snapshot.errors[0];
    else message.textContent = snapshot?.message || 'AIOS is available as a runtime substrate.';
  }
}

function meaningfulTransition(previous, next) {
  if (!previous || !next) return null;
  const before = summary(previous);
  const after = summary(next);
  if (previous.state !== 'ready' && next.state === 'ready') {
    return { kind: 'revelation', revelation: true, strength: .48, pageSide: 'both', source: 'aios-kernel' };
  }
  if (after.running > before.running) {
    return { kind: 'continuity', family: 'memory', strength: .42, pageSide: 'both', source: 'aios-kernel' };
  }
  if (after.completed > before.completed) {
    return { kind: 'completion', family: 'control', strength: .34, pageSide: 'both', source: 'aios-kernel' };
  }
  return null;
}

function publish(snapshot, previous = latest) {
  const transition = meaningfulTransition(previous, snapshot);
  globalThis.dispatchEvent?.(new CustomEvent(AIOS_CODEX_EVENT, { detail: snapshot }));
  if (transition) globalThis.dispatchEvent?.(new CustomEvent('arcsweep:codex-motion', { detail: transition }));
}

function rebuildBridge() {
  config = loadAIOSKernelConfig();
  bridge = createAIOSKernelBridge({ baseUrl: config.baseUrl });
  return bridge;
}

function clearPoll() {
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = 0;
}

function schedulePoll() {
  clearPoll();
  if (!config?.enabled || !latest?.reachable || document.hidden) return;
  pollTimer = setTimeout(() => void refresh('poll'), config.pollMs);
}

export async function refreshAIOSCodexKernel(reason = 'manual') {
  if (refreshing || !config?.enabled) return latest;
  refreshing = true;
  const previous = latest;
  try {
    const snapshot = await bridge.snapshot();
    latest = Object.freeze({ ...snapshot, reason });
    render(latest);
    publish(latest, previous);
    return latest;
  } catch (error) {
    latest = Object.freeze({
      schema: 'hearthweave.aios-kernel-snapshot/v0.1',
      state: 'offline',
      reachable: false,
      access: bridge?.access || null,
      components: {},
      llms: [],
      processes: [],
      fetchedAt: new Date().toISOString(),
      message: error?.message || 'AIOS kernel could not be read.',
      errors: [String(error?.message || error)],
      reason,
    });
    render(latest);
    publish(latest, previous);
    return latest;
  } finally {
    refreshing = false;
    schedulePoll();
  }
}

function installEvents(panel) {
  if (!panel || panel.dataset.aiosEvents === 'true') return;
  panel.dataset.aiosEvents = 'true';
  panel.addEventListener('click', (event) => {
    const toggle = event.target.closest?.('[data-aios-kernel-toggle]');
    if (toggle) {
      const fold = panel.querySelector('[data-aios-kernel-fold]');
      const open = fold?.hidden !== false;
      if (fold) fold.hidden = !open;
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) void refreshAIOSCodexKernel('open');
      return;
    }
    if (event.target.closest?.('[data-aios-kernel-refresh]')) {
      void refreshAIOSCodexKernel('manual');
      return;
    }
    if (event.target.closest?.('[data-aios-kernel-save]')) {
      const input = panel.querySelector('[data-aios-kernel-endpoint]');
      try {
        config = saveAIOSKernelConfig({ baseUrl: input?.value || config.baseUrl });
        rebuildBridge();
        void refreshAIOSCodexKernel('endpoint-change');
      } catch (error) {
        const message = panel.querySelector('[data-aios-kernel-message]');
        if (message) message.textContent = error?.message || 'That kernel endpoint could not be used.';
      }
    }
  });
}

function mount() {
  const panel = ensurePanel();
  if (!panel) return false;
  installEvents(panel);
  render(latest);
  if (!latest) void refreshAIOSCodexKernel('mount');
  return true;
}

export function installAIOSCodexKernel() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  installStyles();
  rebuildBridge();
  if (!mount() && typeof MutationObserver !== 'undefined') {
    rootObserver = new MutationObserver(() => {
      if (mount()) rootObserver?.disconnect?.();
    });
    rootObserver.observe(document.body, { childList: true, subtree: true });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearPoll();
    else if (latest?.reachable) void refreshAIOSCodexKernel('visibility');
  });
  globalThis.addEventListener?.('arcsweep:magic-book-ready', () => mount());

  globalThis.__aiosCodexKernel = Object.freeze({
    schema: AIOS_CODEX_SIDECAR_SCHEMA,
    bridgeSchema: AIOS_KERNEL_BRIDGE_SCHEMA,
    snapshot: () => latest,
    refresh: refreshAIOSCodexKernel,
    config: () => config,
    setEndpoint(baseUrl) {
      config = saveAIOSKernelConfig({ baseUrl });
      rebuildBridge();
      void refreshAIOSCodexKernel('endpoint-change');
      return config;
    },
    submitAgent: (...args) => bridge.submitAgent(...args),
    agentStatus: (...args) => bridge.agentStatus(...args),
    query: (...args) => bridge.query(...args),
  });
}

if (typeof document !== 'undefined') installAIOSCodexKernel();

globalThis.addEventListener?.('pagehide', () => {
  clearPoll();
  rootObserver?.disconnect?.();
}, { once: true });
