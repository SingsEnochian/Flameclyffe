import { readActiveRuntimeWorldContext } from './runtime-world-context.js';

export const RUNTIME_WORLD_EVENTS = Object.freeze({
  context: 'arcsweep:runtime-world-context',
});

const ROOT_ID = 'arcsweep-runtime-world-presence';
let currentContext = null;
let refreshTimer = null;
let refreshing = false;

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function stamp(value) {
  if (!value) return 'none recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function contextMarkup(context) {
  const waking = context.waking_world;
  const latest = waking?.live_state?.latest_observed_at || null;
  return `<section id="${ROOT_ID}" class="constellation-runtime-world" data-runtime-world-id="${esc(context.identity_anchor.world_id)}">
    <div><span class="eyebrow">Runtime World</span><strong>${esc(context.world.name)}</strong><small>${esc(context.world.kind || 'World')} · ${esc(context.identity_anchor.world_id)}</small></div>
    <div><span class="eyebrow">Context</span><code title="${esc(context.context_fingerprint)}">${esc(context.context_fingerprint.slice(0, 16))}…</code><small>${waking ? `Waking live · ${esc(stamp(latest))}` : 'World context receipted'}</small></div>
  </section>`;
}

function ensureStyle() {
  if (document.getElementById(`${ROOT_ID}-style`)) return;
  const style = document.createElement('style');
  style.id = `${ROOT_ID}-style`;
  style.textContent = `.constellation-runtime-world{display:grid;grid-template-columns:1fr 1fr;gap:.5rem;margin:.55rem 0 .7rem;padding:.55rem;border:1px solid color-mix(in srgb,var(--green) 24%,transparent);border-radius:.65rem;background:color-mix(in srgb,var(--panel-solid) 88%,transparent)}.constellation-runtime-world>div{display:grid;gap:.12rem;min-width:0}.constellation-runtime-world .eyebrow{font-size:.62rem;letter-spacing:.08em;text-transform:uppercase;opacity:.6}.constellation-runtime-world strong,.constellation-runtime-world code{overflow-wrap:anywhere}.constellation-runtime-world small{font-size:.65rem;opacity:.62}@media(max-width:520px){.constellation-runtime-world{grid-template-columns:1fr}}`;
  document.head.append(style);
}

function publish(context) {
  currentContext = context;
  document.body.dataset.runtimeWorldId = context.identity_anchor.world_id;
  document.body.dataset.runtimeWorldContextId = context.context_id;
  document.dispatchEvent(new CustomEvent(RUNTIME_WORLD_EVENTS.context, {
    detail: {
      schema: context.schema,
      worldId: context.identity_anchor.world_id,
      worldName: context.world.name,
      worldKind: context.world.kind,
      contextId: context.context_id,
      contextFingerprint: context.context_fingerprint,
      wakingLatestObservedAt: context.waking_world?.live_state?.latest_observed_at || null,
    },
  }));
}

function mount(context = currentContext) {
  if (!context) return;
  ensureStyle();
  const panel = document.querySelector('#arcsweep-constellation-presence .constellation-presence-panel');
  const head = panel?.querySelector('.constellation-presence-head');
  if (!panel || !head) return;
  const markup = contextMarkup(context);
  const existing = panel.querySelector(`#${ROOT_ID}`);
  if (existing?.outerHTML === markup) return;
  if (existing) existing.outerHTML = markup;
  else head.insertAdjacentHTML('afterend', markup);
}

export async function refreshRuntimeWorldPresence() {
  if (refreshing) return currentContext;
  refreshing = true;
  try {
    const context = await readActiveRuntimeWorldContext();
    publish(context);
    mount(context);
    return context;
  } finally {
    refreshing = false;
  }
}

function queueRefresh(delay = 30) {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    void refreshRuntimeWorldPresence();
  }, delay);
}

export function installRuntimeWorldPresence() {
  if (typeof document === 'undefined') return;
  const observer = new MutationObserver(() => {
    mount();
    queueRefresh(80);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) queueRefresh(0);
  });
  setInterval(() => { if (!document.hidden) void refreshRuntimeWorldPresence(); }, 15_000);
  void refreshRuntimeWorldPresence();
}

if (typeof document !== 'undefined') installRuntimeWorldPresence();
