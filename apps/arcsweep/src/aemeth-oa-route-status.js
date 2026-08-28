import { readHouseRuntimeToken } from './house-runtime.js';
import { readOxAlphaPortableStatus } from './aemeth-oxalpha-transport.js';

export const AEMETH_OA_ROUTE_STATUS_VERSION = 'aemeth-oa-route-status/v2';

export function formatOxAlphaRouteStatus(status = {}) {
  const houseState = status.house?.state || 'unknown';
  const relayState = status.relay?.state || 'unknown';
  const inferenceState = status.inference?.state || 'unknown';

  const house = houseState === 'session-present' ? 'session present'
    : houseState === 'absent' ? 'no session'
      : houseState;
  const relay = relayState === 'reachable' ? 'reachable'
    : relayState === 'unreachable' ? 'unreachable'
      : relayState;
  const inference = inferenceState === 'ready' ? 'ready'
    : inferenceState === 'credential-missing' ? 'credential missing'
      : inferenceState;
  const provider = String(status.provider || 'configured provider');

  const summary = status.overall === 'inference-ready'
    ? `Supabase relay and OA inference via ${provider} are armed.`
    : status.overall === 'house-session-present'
      ? 'House session is present; House model health remains invocation-proven. The host-neutral OA relay is not armed.'
      : status.overall === 'relay-unarmed'
        ? 'Supabase relay is reachable; OA inference credential is missing.'
        : 'No House session is present and the host-neutral relay is not currently usable.';

  return Object.freeze({
    house,
    relay,
    inference,
    summary,
    states: Object.freeze({ house: houseState, relay: relayState, inference: inferenceState }),
  });
}

function setRouteNode(panel, selector, text, state) {
  const node = panel.querySelector(selector);
  if (!node) return;
  node.textContent = text;
  node.dataset.state = state;
}

export function paintOxAlphaRouteStatus(panel, status) {
  const formatted = formatOxAlphaRouteStatus(status);
  setRouteNode(panel, '[data-aemeth-route-house]', formatted.house, formatted.states.house);
  setRouteNode(panel, '[data-aemeth-route-relay]', formatted.relay, formatted.states.relay);
  setRouteNode(panel, '[data-aemeth-route-inference]', formatted.inference, formatted.states.inference);
  const summary = panel.querySelector('[data-aemeth-route-summary]');
  if (summary) summary.textContent = formatted.summary;
  panel.dataset.aemethRouteOverall = status.overall || 'unknown';
  return formatted;
}

export async function refreshOxAlphaRouteInstrument(panel, { fetchImpl = fetch, houseToken = readHouseRuntimeToken() } = {}) {
  if (!panel) return null;
  const summary = panel.querySelector('[data-aemeth-route-summary]');
  if (summary) summary.textContent = 'Checking route truth…';
  const status = await readOxAlphaPortableStatus({ houseToken, fetchImpl });
  paintOxAlphaRouteStatus(panel, status);
  return status;
}

function routeInstrumentMarkup() {
  return `
    <section class="aemeth-route-instrument" data-aemeth-route-instrument="${AEMETH_OA_ROUTE_STATUS_VERSION}">
      <div class="aemeth-panel-heading">
        <div><p class="eyebrow">Transport truth · independent read-only instrument</p><h4>OA route state</h4></div>
        <button type="button" class="quiet" data-aemeth-route-refresh>Refresh routes</button>
      </div>
      <div class="aemeth-readout aemeth-route-grid" aria-label="Ox Alpha route readiness">
        <div><small>House route</small><strong data-aemeth-route-house data-state="checking">checking…</strong></div>
        <div><small>Supabase relay</small><strong data-aemeth-route-relay data-state="checking">checking…</strong></div>
        <div><small>OA inference</small><strong data-aemeth-route-inference data-state="checking">checking…</strong></div>
      </div>
      <p class="muted" data-aemeth-route-summary>Checking host-neutral route truth…</p>
    </section>`;
}

function renderProbeFailure(panel, error) {
  const message = String(error?.message || error || 'unknown status error').replace(/\s+/g, ' ').trim();
  const summary = panel.querySelector('[data-aemeth-route-summary]');
  if (summary) summary.textContent = `Route status probe stopped: ${message}`;
  setRouteNode(panel, '[data-aemeth-route-relay]', /identity mismatch/i.test(message) ? 'identity mismatch' : 'probe failed', /identity mismatch/i.test(message) ? 'identity-mismatch' : 'unreachable');
  setRouteNode(panel, '[data-aemeth-route-inference]', 'blocked', 'blocked');
}

function ensureOxAlphaRouteInstrument(panel) {
  if (!panel || panel.querySelector('[data-aemeth-route-instrument]')) return false;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = routeInstrumentMarkup().trim();
  const instrument = wrapper.firstElementChild;
  const inviteRow = panel.querySelector('.button-row');
  if (inviteRow) inviteRow.before(instrument); else panel.append(instrument);

  instrument.querySelector('[data-aemeth-route-refresh]')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try { await refreshOxAlphaRouteInstrument(panel); }
    catch (error) { renderProbeFailure(panel, error); }
    finally { button.disabled = false; }
  });

  refreshOxAlphaRouteInstrument(panel).catch((error) => renderProbeFailure(panel, error));
  return true;
}

export function installAemethOxAlphaRouteStatus(root = document) {
  const decorate = () => {
    const panel = root.querySelector?.('[data-aemeth-oa-panel]');
    if (panel) ensureOxAlphaRouteInstrument(panel);
  };
  decorate();
  const target = root.querySelector?.('#app') || root.body || root.documentElement;
  if (!target || typeof MutationObserver === 'undefined') return null;
  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      decorate();
    });
  });
  observer.observe(target, { childList: true, subtree: true });
  return observer;
}

if (typeof document !== 'undefined') installAemethOxAlphaRouteStatus(document);
