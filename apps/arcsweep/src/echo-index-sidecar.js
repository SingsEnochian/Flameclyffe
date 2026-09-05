import { loadState } from './storage.js';
import { resolveEchoIndex } from './echo-index.js';
import { installEchoLiveAdapters } from './echo-live-adapters.js';

export const ECHO_INDEX_SIDECAR = 'arcsweep.echo-index-surface/v2';
let navObserver = null;

installEchoLiveAdapters();

function externalEntries() {
  const provider = globalThis.__arcsweepEchoIndexSources;
  if (typeof provider !== 'function') return Promise.resolve([]);
  return Promise.resolve(provider()).then((value) => Array.isArray(value) ? value : []).catch(() => []);
}

function ensureLauncher() {
  if (document.querySelector('#app [data-room="echo-index"]')) return;
  const worlds = document.querySelector('#app [data-room="worlds"]');
  if (!worlds?.parentElement) return;
  const launcher = document.createElement(worlds.tagName.toLowerCase());
  if (launcher.tagName === 'BUTTON') launcher.type = 'button';
  launcher.className = worlds.className;
  launcher.dataset.room = 'echo-index';
  launcher.dataset.echoIndexLauncher = 'true';
  launcher.setAttribute('aria-label', 'Open Echo Index resolver');
  launcher.innerHTML = '<span aria-hidden="true">⌕</span><span>Echo Index</span>';
  worlds.insertAdjacentElement('afterend', launcher);
}

function ensureDialog() {
  let dialog = document.querySelector('[data-echo-index-dialog]');
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.dataset.echoIndexDialog = 'true';
  dialog.className = 'panel';
  dialog.innerHTML = `
    <form method="dialog" style="display:flex;justify-content:space-between;gap:1rem;align-items:center">
      <div><strong>Echo Index</strong><div class="muted">Resolver across live ArcSweep stores. Source, authority and store remain visible; no duplicate canon database.</div></div>
      <button value="cancel" aria-label="Close Echo Index">Close</button>
    </form>
    <label style="display:grid;gap:.35rem;margin-top:1rem">Resolve
      <input data-echo-index-query type="search" placeholder="world, character, place, record, source, receipt…" autocomplete="off">
    </label>
    <p class="muted" data-echo-index-status>Loading persisted and live stores…</p>
    <div data-echo-index-results style="display:grid;gap:.65rem;max-height:55vh;overflow:auto"></div>`;
  document.body.appendChild(dialog);
  return dialog;
}

function renderResults(host, rows) {
  host.replaceChildren();
  if (!rows.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'No echoes resolve from the currently available stores.';
    host.appendChild(empty);
    return;
  }
  for (const row of rows) {
    const card = document.createElement('article');
    card.className = 'callout';
    const head = document.createElement('strong');
    head.textContent = row.label;
    const meta = document.createElement('div');
    meta.className = 'muted';
    meta.textContent = `${row.kind} · ${row.store} · ${row.id} · authority: ${row.authority_class}`;
    card.append(head,meta);
    if (row.world_id) {
      const world = document.createElement('div');
      world.className = 'muted';
      world.textContent = `world: ${row.world_id}`;
      card.appendChild(world);
    }
    if (row.path) {
      const path = document.createElement('div');
      path.className = 'muted';
      path.textContent = `path: ${row.path.join(' › ')}`;
      card.appendChild(path);
    }
    host.appendChild(card);
  }
}

async function openEchoIndex() {
  const dialog = ensureDialog();
  const input = dialog.querySelector('[data-echo-index-query]');
  const status = dialog.querySelector('[data-echo-index-status]');
  const results = dialog.querySelector('[data-echo-index-results]');
  const [state,external] = await Promise.all([loadState(),externalEntries()]);
  const stores = [...new Set(external.map((item) => item.store).filter(Boolean))];
  const refresh = () => {
    const rows = resolveEchoIndex(state,input.value,{ externalEntries:external });
    status.textContent = `${rows.length} resolved echo${rows.length === 1 ? '' : 'es'} · ${stores.length} live adapter store${stores.length === 1 ? '' : 's'} · authority remains visible`;
    renderResults(results,rows);
  };
  input.oninput = refresh;
  refresh();
  if (!dialog.open) dialog.showModal();
  queueMicrotask(() => input.focus());
}

if (typeof document !== 'undefined') {
  document.addEventListener('click',(event) => {
    const trigger = event.target?.closest?.('#app [data-room="echo-index"]');
    if (!trigger) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void openEchoIndex();
  },true);
  ensureLauncher();
  navObserver = new MutationObserver(ensureLauncher);
  navObserver.observe(document.body,{ childList:true, subtree:true });
  globalThis.addEventListener?.('beforeunload',() => navObserver?.disconnect(),{ once:true });
  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:echo-index-ready',{ detail:{ schema:ECHO_INDEX_SIDECAR } }));
}
