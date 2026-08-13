import {
  compileReactionRegistry,
  normaliseReactionRegistryStore,
} from './react-ion-registry.js';
import {
  analyseClosedProjectionLoop,
  replayProjectionRoute,
} from './react-ion-replay.js';

const HELM_STORE_KEY = 'hearthgate.arcsweep.react-ion-helm.v1';
const REGISTRY_STORE_KEY = 'hearthgate.arcsweep.react-ion-registry.v1';
let mounting = false;

function esc(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function readJson(key) {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readStore() {
  const value = readJson(HELM_STORE_KEY);
  return value?.version === 1 && Array.isArray(value.receipts) ? value : { version: 1, receipts: [] };
}

function writeStore(store) {
  try { globalThis.localStorage?.setItem(HELM_STORE_KEY, JSON.stringify(store)); } catch {}
}

function currentRuntime() {
  return compileReactionRegistry(normaliseReactionRegistryStore(readJson(REGISTRY_STORE_KEY)));
}

function graphForReceipt(receipt) {
  const runtime = currentRuntime();
  const graph = Object.fromEntries(Object.entries(runtime.graph).map(([key, edges]) => [key, [...edges]]));
  const direct = receipt?.direct_edge;
  if (direct?.from && direct?.to && !direct.blocked) {
    graph[direct.from] ||= [];
    if (!graph[direct.from].some((edge) => edge.to === direct.to && edge.corridor_id === direct.corridor_id)) {
      graph[direct.from].push(direct);
    }
  }
  return graph;
}

function parseVector(value) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const vector = text.split(',').map((part) => Number(part.trim()));
  if (!vector.length || vector.some((part) => !Number.isFinite(part))) throw new Error('Orientation vectors must be comma-separated finite numbers.');
  return vector;
}

function findRecentClosedChain(receipts) {
  const routed = receipts.filter((receipt) => receipt?.route);
  if (routed.length < 2) return null;
  const endIndex = routed.length - 1;
  for (let startIndex = endIndex - 1; startIndex >= 0; startIndex -= 1) {
    const slice = routed.slice(startIndex, endIndex + 1);
    let continuous = true;
    for (let index = 1; index < slice.length; index += 1) {
      if (slice[index - 1].route.target !== slice[index].route.source) {
        continuous = false;
        break;
      }
    }
    if (!continuous) continue;
    if (slice[0].route.source === slice.at(-1).route.target) return slice;
  }
  return null;
}

function renderReplayHistory(receipt) {
  const replays = receipt?.route_replays || [];
  const holonomy = receipt?.holonomy_receipts || [];
  const replayMarkup = replays.length ? `<div class="reaction-replay-list">${[...replays].reverse().slice(0, 5).map((item) => `<p><b>${item.matched ? 'MATCH' : 'DRIFT'}</b> · ${esc(item.replay_id)} · path ${item.checks.path ? '✓' : '×'} · cost ${item.checks.cost ? '✓' : '×'} · fingerprint ${item.checks.fingerprint ? '✓' : '×'}</p>`).join('')}</div>` : '<p class="muted">No route replay has been run for this receipt.</p>';
  const holonomyMarkup = holonomy.length ? `<div class="reaction-replay-list">${[...holonomy].reverse().slice(0, 3).map((item) => `<p><b>${item.holonomy_detected ? 'RETURN WITH DIFFERENCE' : 'CLOSED LOOP'}</b> · ${esc(item.holonomy_id)} · ${item.hop_count} hops${item.orientation ? ` · Δorientation ${Number(item.orientation.delta_norm).toFixed(6)}` : ' · no orientation comparison supplied'}</p>`).join('')}</div>` : '<p class="muted">No recent closed-loop analysis is attached to this receipt.</p>';
  return `${replayMarkup}${holonomyMarkup}`;
}

function render(receipt, message = '') {
  if (!receipt?.route || !receipt?.navigation) return '';
  return `<section class="reaction-replay-console" data-reaction-replay-console>
    <div class="section-heading compact-heading"><div><p class="eyebrow">Replay · return-with-difference</p><h3>Flight Analysis</h3><p class="muted">Replay recomputes the software route against the current registered graph. A mismatch is drift, not a failure to be hidden. Closed-loop analysis can compare an optional declared model orientation before and after return.</p></div></div>
    ${message ? `<p class="callout">${esc(message)}</p>` : ''}
    <div class="button-row"><button type="button" data-reaction-replay-action="replay">Replay current route</button></div>
    <form data-reaction-holonomy-form class="stack compact-stack">
      <div class="grid two compact-grid"><label>Orientation before (optional)<input name="before" placeholder="1,0,0" /></label><label>Orientation after (optional)<input name="after" placeholder="0,1,0" /></label></div>
      <button type="submit">Analyse most recent closed route loop</button>
    </form>
    ${renderReplayHistory(receipt)}
  </section>`;
}

function injectStyle() {
  if (document.querySelector('#reaction-replay-console-style')) return;
  const style = document.createElement('style');
  style.id = 'reaction-replay-console-style';
  style.textContent = `.reaction-replay-console{margin-top:1rem;padding-top:1rem;border-top:1px solid color-mix(in srgb,var(--gold) 20%,transparent)}.reaction-replay-list{padding:.65rem;border:1px solid color-mix(in srgb,var(--green) 24%,transparent);border-radius:10px;margin-top:.6rem}.reaction-replay-list p{margin:.3rem 0}`;
  document.head.appendChild(style);
}

function mount() {
  if (mounting) return;
  const panel = document.querySelector('[data-reaction-helm]');
  if (!panel || panel.querySelector('[data-reaction-replay-console]')) return;
  const receipt = readStore().receipts.at(-1);
  if (!receipt?.route || !receipt?.navigation) return;
  mounting = true;
  try {
    injectStyle();
    const box = panel.querySelector('.reaction-helm-receipt');
    if (box) box.insertAdjacentHTML('beforeend', render(receipt));
  } finally {
    mounting = false;
  }
}

function rerender(consolePanel, receipt, message) {
  consolePanel.outerHTML = render(receipt, message);
}

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-reaction-replay-action="replay"]');
  if (!button) return;
  const consolePanel = button.closest('[data-reaction-replay-console]');
  try {
    const store = readStore();
    const receipt = store.receipts.at(-1);
    if (!receipt?.route || !receipt?.navigation) throw new Error('A routed Helm receipt is required.');
    const replay = await replayProjectionRoute({
      request: receipt.navigation,
      route: receipt.route,
      graph: graphForReceipt(receipt),
    });
    receipt.route_replays ||= [];
    receipt.route_replays.push(replay);
    writeStore(store);
    rerender(consolePanel, receipt, replay.matched
      ? `Replay matched ${receipt.route.route_id} exactly.`
      : `Replay drift detected. Path ${replay.checks.path ? 'matched' : 'changed'}, cost ${replay.checks.cost ? 'matched' : 'changed'}, fingerprint ${replay.checks.fingerprint ? 'matched' : 'changed'}.`);
  } catch (error) {
    rerender(consolePanel, readStore().receipts.at(-1), `Replay stopped: ${error.message}`);
  }
});

document.addEventListener('submit', async (event) => {
  const form = event.target.closest('[data-reaction-holonomy-form]');
  if (!form) return;
  event.preventDefault();
  const consolePanel = form.closest('[data-reaction-replay-console]');
  try {
    const store = readStore();
    const receipt = store.receipts.at(-1);
    const chain = findRecentClosedChain(store.receipts);
    if (!chain) throw new Error('No contiguous recent route chain returns to its starting address.');
    const data = new FormData(form);
    const before = parseVector(data.get('before'));
    const after = parseVector(data.get('after'));
    if ((before == null) !== (after == null)) throw new Error('Supply both orientation vectors or neither.');
    const holonomy = await analyseClosedProjectionLoop({
      routes: chain.map((item) => item.route),
      orientationBefore: before,
      orientationAfter: after,
    });
    receipt.holonomy_receipts ||= [];
    receipt.holonomy_receipts.push(holonomy);
    writeStore(store);
    rerender(consolePanel, receipt, holonomy.holonomy_detected
      ? `Closed return found with declared orientation change Δ=${holonomy.orientation.delta_norm}.`
      : `Closed return found across ${holonomy.hop_count} hops.${holonomy.orientation ? ' Declared orientation remained within tolerance.' : ' No orientation comparison was supplied.'}`);
  } catch (error) {
    rerender(consolePanel, readStore().receipts.at(-1), `Closed-loop analysis stopped: ${error.message}`);
  }
});

const observer = new MutationObserver(() => mount());
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
else mount();
