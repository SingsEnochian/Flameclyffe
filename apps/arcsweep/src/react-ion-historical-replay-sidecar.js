import { projectionGraphFromSnapshot } from './react-ion-graph-snapshot.js';
import { replayProjectionRoute } from './react-ion-replay.js';

const STORE_KEY = 'hearthgate.arcsweep.react-ion-helm.v1';
let running = false;

function esc(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function readStore() {
  try {
    const value = JSON.parse(globalThis.localStorage?.getItem(STORE_KEY) || 'null');
    if (value?.version === 1 && Array.isArray(value.receipts)) return value;
  } catch {}
  return { version: 1, receipts: [] };
}

function writeStore(store) {
  try { globalThis.localStorage?.setItem(STORE_KEY, JSON.stringify(store)); } catch {}
}

function mount() {
  const workbench = document.querySelector('[data-reaction-replay-console]');
  if (!workbench || workbench.querySelector('[data-reaction-historical-replay]')) return;
  const receipt = readStore().receipts.at(-1);
  if (!receipt?.graph_snapshot || !receipt?.route || !receipt?.navigation) return;
  const controls = workbench.querySelector('.button-row');
  if (!controls) return;
  controls.insertAdjacentHTML('beforeend', `<button type="button" class="quiet" data-reaction-historical-replay>Replay captured graph</button><span class="muted" data-reaction-historical-status>Snapshot ${esc(receipt.graph_snapshot.snapshot_id)}</span>`);
}

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-reaction-historical-replay]');
  if (!button || running) return;
  const workbench = button.closest('[data-reaction-replay-console]');
  const status = workbench.querySelector('[data-reaction-historical-status]');
  running = true;
  button.disabled = true;
  try {
    const store = readStore();
    const receipt = store.receipts.at(-1);
    if (!receipt?.graph_snapshot || !receipt?.route || !receipt?.navigation) throw new Error('Captured graph snapshot is unavailable.');
    const replay = await replayProjectionRoute({
      request: receipt.navigation,
      route: receipt.route,
      graph: projectionGraphFromSnapshot(receipt.graph_snapshot),
      weights: receipt.route.weights || {},
    });
    const recorded = { ...replay, replay_mode: 'captured-graph', graph_snapshot_id: receipt.graph_snapshot.snapshot_id };
    receipt.route_replays ||= [];
    receipt.route_replays.push(recorded);
    writeStore(store);
    status.textContent = replay.matched
      ? `Captured graph replay MATCH · ${replay.replay_id}`
      : `Captured graph replay DRIFT · ${replay.replay_id}`;
  } catch (error) {
    status.textContent = `Historical replay stopped: ${error.message}`;
  } finally {
    button.disabled = false;
    running = false;
  }
});

const observer = new MutationObserver(() => mount());
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
