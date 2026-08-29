export const SIDECAR_HEALTH_PANEL_VERSION = 'arcsweep.sidecar-health/v1';

const CRITICAL = Object.freeze([
  './soundfont-runtime-repair.js',
  './active-input-continuity.js',
  './house-chat-authoritative-surface.js',
  './house-commons-chat-v5.js',
  './house-chat-runtime-roster-ui.js',
  './world-registry-persistence-sidecar.js',
]);

function diagnostics() {
  return globalThis.__arcsweepSidecarDiagnostics || { schema: 'arcsweep.sidecar-scheduler/v1', loaded: [], failures: [], packs: [] };
}

export function summarizeSidecarHealth(input = diagnostics()) {
  const loaded = new Set((input.loaded || []).map((item) => item.specifier));
  const failures = input.failures || [];
  const criticalMissing = CRITICAL.filter((specifier) => !loaded.has(specifier) && !failures.some((item) => item.specifier === specifier));
  const criticalFailed = failures.filter((item) => CRITICAL.includes(item.specifier));
  const state = criticalFailed.length ? 'critical-failure' : failures.length ? 'degraded' : criticalMissing.length ? 'awaiting-lazy-organs' : 'healthy';
  return Object.freeze({
    schema: SIDECAR_HEALTH_PANEL_VERSION,
    state,
    loaded_count: loaded.size,
    failure_count: failures.length,
    critical_failed: Object.freeze(criticalFailed.map((item) => item.specifier)),
    critical_not_yet_loaded: Object.freeze(criticalMissing),
    packs: Object.freeze([...(input.packs || [])]),
  });
}

function ensureStyles() {
  if (document.querySelector('[data-sidecar-health-style]')) return;
  const style = document.createElement('style');
  style.dataset.sidecarHealthStyle = SIDECAR_HEALTH_PANEL_VERSION;
  style.textContent = `
    .sidecar-health-launch{display:grid;grid-template-columns:1.6rem 1fr auto;gap:.45rem;align-items:center;width:100%;padding:.55rem .65rem;border:0;border-radius:.65rem;background:transparent;color:inherit;text-align:left;font:inherit;font-size:.86rem;cursor:pointer}
    .sidecar-health-launch:hover,.sidecar-health-launch:focus-visible{background:color-mix(in srgb,var(--accent,#c89b62) 12%,transparent);outline:none}
    .sidecar-health-dot{width:.55rem;height:.55rem;border-radius:50%;background:#c2a15e}.sidecar-health-dot[data-state="healthy"]{background:#75b58a}.sidecar-health-dot[data-state="degraded"]{background:#d3a459}.sidecar-health-dot[data-state="critical-failure"]{background:#d26767}
    .sidecar-health-dialog{width:min(820px,94vw);max-height:86vh;border:1px solid #ffffff20;border-radius:1rem;padding:0;background:var(--panel,#171512);color:inherit;box-shadow:0 1.5rem 5rem #0008}.sidecar-health-dialog::backdrop{background:#070606b8;backdrop-filter:blur(5px)}
    .sidecar-health-shell{display:grid;grid-template-rows:auto 1fr;max-height:86vh}.sidecar-health-head{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:1rem;border-bottom:1px solid #ffffff18}.sidecar-health-head h2{margin:0;font-size:1.05rem}.sidecar-health-body{overflow:auto;padding:1rem;display:grid;gap:.75rem}.sidecar-health-card{border:1px solid #ffffff18;border-radius:.8rem;padding:.75rem;background:#ffffff05}.sidecar-health-card h3{margin:0 0 .45rem;font-size:.88rem}.sidecar-health-list{display:grid;gap:.25rem;font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace}.sidecar-health-good{color:#89c69c}.sidecar-health-bad{color:#df8585}.sidecar-health-muted{opacity:.68}
  `;
  document.head.append(style);
}

function render(dialog) {
  const data = diagnostics();
  const summary = summarizeSidecarHealth(data);
  const body = dialog.querySelector('[data-health-body]');
  body.replaceChildren();
  const overview = document.createElement('section'); overview.className = 'sidecar-health-card';
  overview.innerHTML = `<h3>Runtime body</h3><div class="sidecar-health-list"><div>state: <strong>${summary.state}</strong></div><div>loaded: ${summary.loaded_count}</div><div>failures: ${summary.failure_count}</div><div>scheduler: ${data.schema || 'unknown'}</div><div>location: ${location.pathname}</div></div>`;
  body.append(overview);

  const critical = document.createElement('section'); critical.className = 'sidecar-health-card'; critical.innerHTML = '<h3>Critical organs</h3>';
  const criticalList = document.createElement('div'); criticalList.className = 'sidecar-health-list';
  CRITICAL.forEach((specifier) => {
    const failed = (data.failures || []).find((item) => item.specifier === specifier);
    const loaded = (data.loaded || []).find((item) => item.specifier === specifier);
    const row = document.createElement('div');
    row.className = failed ? 'sidecar-health-bad' : loaded ? 'sidecar-health-good' : 'sidecar-health-muted';
    row.textContent = `${failed ? '✕' : loaded ? '✓' : '·'} ${specifier}${loaded?.elapsedMs != null ? ` · ${loaded.elapsedMs}ms` : ''}${failed ? ` · ${failed.message}` : ''}`;
    criticalList.append(row);
  }); critical.append(criticalList); body.append(critical);

  const all = document.createElement('section'); all.className = 'sidecar-health-card'; all.innerHTML = '<h3>Mounted sidecars</h3>';
  const allList = document.createElement('div'); allList.className = 'sidecar-health-list';
  (data.loaded || []).forEach((item) => { const row = document.createElement('div'); row.textContent = `✓ ${item.specifier} · ${item.pack} · ${item.elapsedMs}ms`; allList.append(row); });
  if (!(data.loaded || []).length) { const row = document.createElement('div'); row.textContent = 'No sidecar receipts yet.'; allList.append(row); }
  all.append(allList); body.append(all);

  if ((data.failures || []).length) {
    const failed = document.createElement('section'); failed.className = 'sidecar-health-card'; failed.innerHTML = '<h3>Failures</h3>';
    const list = document.createElement('div'); list.className = 'sidecar-health-list sidecar-health-bad';
    data.failures.forEach((item) => { const row = document.createElement('div'); row.textContent = `✕ ${item.specifier} · ${item.pack} · ${item.message}`; list.append(row); }); failed.append(list); body.append(failed);
  }

  document.querySelectorAll('[data-sidecar-health-state]').forEach((node) => { node.dataset.state = summary.state; node.title = `ArcSweep runtime: ${summary.state}`; });
}

function dialog() {
  let node = document.querySelector(`[data-sidecar-health-dialog="${SIDECAR_HEALTH_PANEL_VERSION}"]`);
  if (node) return node;
  node = document.createElement('dialog'); node.className = 'sidecar-health-dialog'; node.dataset.sidecarHealthDialog = SIDECAR_HEALTH_PANEL_VERSION;
  node.innerHTML = `<div class="sidecar-health-shell"><header class="sidecar-health-head"><div><h2>ArcSweep · production body</h2><small class="sidecar-health-muted">What actually mounted in this browser, not what source merely promised.</small></div><button type="button" data-close aria-label="Close">×</button></header><div class="sidecar-health-body" data-health-body></div></div>`;
  node.querySelector('[data-close]').addEventListener('click', () => node.close()); document.body.append(node); return node;
}

function mountLauncher() {
  const nav = document.querySelector('.sidebar nav[aria-label="Primary Arcsweep rooms"]');
  if (!nav || nav.querySelector('[data-sidecar-health-launch]')) return;
  const button = document.createElement('button'); button.type = 'button'; button.className = 'sidecar-health-launch'; button.dataset.sidecarHealthLaunch = SIDECAR_HEALTH_PANEL_VERSION;
  button.innerHTML = '<span aria-hidden="true">⌁</span><span>System Health</span><span class="sidecar-health-dot" data-sidecar-health-state></span>';
  button.addEventListener('click', () => { const node = dialog(); render(node); node.showModal(); });
  nav.append(button); render(dialog());
}

export function installSidecarHealthPanel() {
  ensureStyles(); mountLauncher();
  const refresh = () => { mountLauncher(); const node = document.querySelector('[data-sidecar-health-dialog]'); if (node) render(node); };
  globalThis.addEventListener('arcsweep:sidecar-loaded', refresh); globalThis.addEventListener('arcsweep:sidecar-pack-ready', refresh); globalThis.addEventListener('arcsweep:sidecars-ready', refresh);
  const observer = new MutationObserver(mountLauncher); observer.observe(document.body, { childList: true, subtree: true });
  globalThis.addEventListener('beforeunload', () => observer.disconnect(), { once: true });
}

if (typeof document !== 'undefined') installSidecarHealthPanel();
