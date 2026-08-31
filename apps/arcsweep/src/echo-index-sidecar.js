import { loadState } from './storage.js';
import { resolveEchoIndex } from './echo-index.js';

export const ECHO_INDEX_SIDECAR = 'arcsweep.echo-index-surface/v1';

function externalEntries() {
  const provider = globalThis.__arcsweepEchoIndexSources;
  if (typeof provider !== 'function') return Promise.resolve([]);
  return Promise.resolve(provider()).then((value) => Array.isArray(value) ? value : []).catch(() => []);
}

function ensureDialog() {
  let dialog = document.querySelector('[data-echo-index-dialog]');
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.dataset.echoIndexDialog = 'true';
  dialog.className = 'panel';
  dialog.innerHTML = `
    <form method="dialog" style="display:flex;justify-content:space-between;gap:1rem;align-items:center">
      <div><strong>Echo Index</strong><div class="muted">Resolver across existing ArcSweep stores. No duplicate canon or source database.</div></div>
      <button value="cancel" aria-label="Close Echo Index">Close</button>
    </form>
    <label style="display:grid;gap:.35rem;margin-top:1rem">Resolve
      <input data-echo-index-query type="search" placeholder="world, character, place, record, source, receipt…" autocomplete="off">
    </label>
    <p class="muted" data-echo-index-status>Loading persisted stores…</p>
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
  const refresh = () => {
    const rows = resolveEchoIndex(state,input.value,{ externalEntries:external });
    status.textContent = `${rows.length} resolved echo${rows.length === 1 ? '' : 'es'} · source store and authority remain visible`;
    renderResults(results,rows);
  };
  input.oninput = refresh;
  refresh();
  if (!dialog.open) dialog.showModal();
  queueMicrotask(() => input.focus());
}

document.addEventListener('click',(event) => {
  const trigger = event.target?.closest?.('#app [data-room="echo-index"]');
  if (!trigger) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  void openEchoIndex();
},true);

globalThis.dispatchEvent?.(new CustomEvent('arcsweep:echo-index-ready',{ detail:{ schema:ECHO_INDEX_SIDECAR } }));
