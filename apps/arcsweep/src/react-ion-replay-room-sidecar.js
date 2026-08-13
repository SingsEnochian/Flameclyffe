const HELM_STORE_KEY = 'hearthgate.arcsweep.react-ion-helm.v1';
let replayOpen = false;
let query = '';

function esc(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function attr(value = '') { return esc(value); }

function readStore() {
  try {
    const value = JSON.parse(globalThis.localStorage?.getItem(HELM_STORE_KEY) || 'null');
    if (value?.version === 1 && Array.isArray(value.receipts)) return value;
  } catch {}
  return { version: 1, receipts: [] };
}

function textIndex(receipt) {
  return [
    receipt.world_id,
    receipt.source?.name,
    receipt.source?.address,
    receipt.target?.name,
    receipt.target?.address,
    receipt.ask?.intention,
    receipt.ask?.transformation,
    receipt.route?.route_id,
    receipt.deep_time?.receipt_id,
    ...(receipt.protocol_responses || []).flatMap((item) => [item.response?.code, item.response?.responder, item.response?.message]),
  ].filter(Boolean).join(' ').toLowerCase();
}

function statusLine(receipt) {
  const parts = [];
  if (receipt.route) parts.push(`${receipt.route.hop_count} hop${receipt.route.hop_count === 1 ? '' : 's'}`, `cost ${Number(receipt.route.total_cost).toFixed(3)}`);
  else parts.push(receipt.route_error || 'no route');
  if (receipt.transport) parts.push(`transport ${receipt.transport.final_code}`);
  if (receipt.deep_time) parts.push('DEEPTime');
  if (receipt.graph_snapshot) parts.push('graph captured');
  if ((receipt.protocol_responses || []).length) parts.push(`${receipt.protocol_responses.length} response${receipt.protocol_responses.length === 1 ? '' : 's'}`);
  if ((receipt.route_replays || []).length) parts.push(`${receipt.route_replays.length} replay${receipt.route_replays.length === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

function responseBadges(receipt) {
  const exchanges = receipt.protocol_responses || [];
  if (!exchanges.length) return '';
  return `<div class="replay-badges">${exchanges.map((exchange) => `<span title="${attr(exchange.response?.message || '')}">${esc(exchange.response?.code || 'UNKNOWN')} · return ${esc(exchange.return_receipt?.transport_code || 'unrecorded')}</span>`).join('')}</div>`;
}

function receiptCard(receipt, index) {
  const created = receipt.created_at ? new Date(receipt.created_at).toLocaleString() : 'undated';
  const path = receipt.route?.path?.join(' → ') || 'No admitted route';
  const replayState = (receipt.route_replays || []).at(-1);
  return `<article class="panel replay-room-card">
    <div class="replay-room-card-head"><div><p class="eyebrow">${esc(created)} · ${esc(receipt.world_id || 'unknown world')}</p><h2>${esc(receipt.source?.name || 'source')} → ${esc(receipt.target?.name || 'target')}</h2></div><span class="replay-sequence">#${index + 1}</span></div>
    <p>${esc(receipt.ask?.intention || 'No Ask text')}</p>
    <p class="muted">${esc(statusLine(receipt))}</p>
    ${responseBadges(receipt)}
    <dl class="facts">
      <div><dt>Projection</dt><dd>${esc(receipt.projection_state?.state || 'unclassified')}</dd></div>
      <div><dt>Address</dt><dd>${esc(receipt.source?.address || '—')} → ${esc(receipt.target?.address || '—')}</dd></div>
      <div><dt>Path</dt><dd>${esc(path)}</dd></div>
      <div><dt>Graph snapshot</dt><dd>${esc(receipt.graph_snapshot?.snapshot_id || 'not captured')}</dd></div>
      <div><dt>DEEPTime</dt><dd>${esc(receipt.deep_time?.receipt_id || 'not emitted')}</dd></div>
      <div><dt>Last replay</dt><dd>${replayState ? (replayState.matched ? 'MATCH' : 'DRIFT') : 'not run'}</dd></div>
    </dl>
    <details><summary>Full flight receipt</summary><pre>${esc(JSON.stringify(receipt, null, 2))}</pre></details>
  </article>`;
}

function renderReplayRoom() {
  const store = readStore();
  const needle = query.trim().toLowerCase();
  const receipts = [...store.receipts].reverse().filter((receipt) => !needle || textIndex(receipt).includes(needle));
  return `<section class="section-heading"><div><p class="eyebrow">React-ion Engine · route history</p><h1>Replay</h1><p class="lede">The ship's wake. Helm Asks, routes, traceroutes, DEEPTime extensions, semantic replies, graph snapshots, and replay drift remain inspectable without rewriting what originally happened.</p></div><button class="quiet" data-room="feedback">Open Helm</button></section>
    <section class="panel replay-room-toolbar"><label>Search flight receipts<input type="search" data-reaction-replay-search value="${attr(query)}" placeholder="world, address, Ask, route, response code…" /></label><p class="muted">${receipts.length} matching receipt${receipts.length === 1 ? '' : 's'} · ${store.receipts.length} total</p></section>
    <section class="replay-room-list">${receipts.length ? receipts.map(receiptCard).join('') : '<article class="panel"><p class="muted">No matching React-ion flight receipts yet. Compile a route at the Helm and its wake will appear here.</p></article>'}</section>`;
}

function injectStyle() {
  if (document.querySelector('#reaction-replay-room-style')) return;
  const style = document.createElement('style');
  style.id = 'reaction-replay-room-style';
  style.textContent = `.replay-room-list{display:grid;gap:1rem}.replay-room-toolbar{margin-bottom:1rem}.replay-room-card-head{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start}.replay-room-card-head h2{margin-top:.15rem}.replay-sequence{font-variant-numeric:tabular-nums;opacity:.6}.replay-badges{display:flex;gap:.45rem;flex-wrap:wrap;margin:.65rem 0}.replay-badges span{padding:.25rem .5rem;border:1px solid color-mix(in srgb,var(--gold) 28%,transparent);border-radius:999px;font-size:.8rem}.replay-room-card pre{max-height:34rem;overflow:auto;white-space:pre-wrap;word-break:break-word}`;
  document.head.appendChild(style);
}

function ensureNav() {
  const nav = document.querySelector('.sidebar nav');
  if (!nav || nav.querySelector('[data-reaction-replay-room-open]')) return;
  const button = document.createElement('button');
  button.className = `nav-button ${replayOpen ? 'active' : ''}`;
  button.dataset.reactionReplayRoomOpen = '';
  button.innerHTML = '<span aria-hidden="true">↻</span><span>Replay</span>';
  const settings = nav.querySelector('[data-room="settings"]');
  if (settings) nav.insertBefore(button, settings);
  else nav.appendChild(button);
}

function paintRoom() {
  if (!replayOpen) return;
  const content = document.querySelector('main.content');
  if (!content || content.querySelector('[data-reaction-replay-room]')) return;
  injectStyle();
  content.innerHTML = `<div data-reaction-replay-room>${renderReplayRoom()}</div>`;
  for (const button of document.querySelectorAll('.sidebar .nav-button')) button.classList.remove('active');
  document.querySelector('[data-reaction-replay-room-open]')?.classList.add('active');
}

function refresh() {
  ensureNav();
  paintRoom();
}

document.addEventListener('click', (event) => {
  const replay = event.target.closest('[data-reaction-replay-room-open]');
  if (replay) {
    replayOpen = true;
    query = '';
    const content = document.querySelector('main.content');
    if (content) content.innerHTML = '';
    refresh();
    return;
  }
  if (event.target.closest('[data-room]')) replayOpen = false;
});

document.addEventListener('input', (event) => {
  if (!event.target.matches('[data-reaction-replay-search]')) return;
  query = event.target.value;
  const room = document.querySelector('[data-reaction-replay-room]');
  if (!room) return;
  room.innerHTML = renderReplayRoom();
  const input = room.querySelector('[data-reaction-replay-search]');
  if (input) {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
});

const observer = new MutationObserver(() => refresh());
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh, { once: true });
else refresh();
