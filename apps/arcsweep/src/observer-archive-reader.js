import {
  readObserverArchive,
  readObserverArchiveDetail,
  readObserverArchiveRaw,
} from './observer-archive-client.js';

const ROOT_ID = 'arcsweep-observer-archive-reader';
const DEFAULT_LIMIT = 25;

const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const state = {
  response: null,
  detail: null,
  raw: null,
  filters: null,
  loading: false,
  error: null,
};

function localDateTimeValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function isoFromLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function recordsRoomActive(doc) {
  return Boolean(doc.querySelector('[data-room="records"].active'));
}

function ensureStyles(doc) {
  if (doc.getElementById(`${ROOT_ID}-styles`)) return;
  const style = doc.createElement('style');
  style.id = `${ROOT_ID}-styles`;
  style.textContent = `
    #${ROOT_ID}{margin-top:1rem}
    #${ROOT_ID} .observer-archive-heading{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start}
    #${ROOT_ID} .observer-archive-heading p{max-width:62rem;margin:.3rem 0 0}
    #${ROOT_ID} .observer-archive-boundary{padding:.55rem .7rem;border:1px solid color-mix(in srgb,var(--gold) 24%,transparent);border-radius:.7rem;background:color-mix(in srgb,var(--panel-solid) 88%,black);font-size:.82rem}
    #${ROOT_ID} .observer-archive-form{display:grid;grid-template-columns:minmax(12rem,2fr) repeat(2,minmax(8rem,1fr));gap:.6rem;margin-top:1rem}
    #${ROOT_ID} .observer-archive-form label{display:grid;gap:.25rem}
    #${ROOT_ID} .observer-archive-form .wide{grid-column:span 2}
    #${ROOT_ID} .observer-archive-actions,#${ROOT_ID} .observer-archive-presets{display:flex;flex-wrap:wrap;gap:.45rem;align-items:end}
    #${ROOT_ID} .observer-archive-actions{grid-column:1/-1}
    #${ROOT_ID} .observer-archive-presets{margin:.7rem 0}
    #${ROOT_ID} .observer-archive-status{min-height:1.4rem;margin:.4rem 0}
    #${ROOT_ID} .observer-archive-list{display:grid;gap:.65rem}
    #${ROOT_ID} .observer-archive-card{padding:.75rem;border:1px solid color-mix(in srgb,var(--green) 22%,transparent);border-radius:.8rem;background:color-mix(in srgb,var(--panel-solid) 93%,black)}
    #${ROOT_ID} .observer-archive-card header{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start}
    #${ROOT_ID} .observer-archive-card small{opacity:.72}
    #${ROOT_ID} .observer-archive-tags{display:flex;flex-wrap:wrap;gap:.3rem;margin:.5rem 0}
    #${ROOT_ID} .observer-archive-tag{font-size:.72rem;padding:.15rem .38rem;border:1px solid color-mix(in srgb,var(--gold) 22%,transparent);border-radius:999px}
    #${ROOT_ID} .observer-archive-detail{margin-top:1rem;padding:1rem;border:1px solid color-mix(in srgb,var(--gold) 38%,transparent);border-radius:.9rem}
    #${ROOT_ID} .observer-archive-detail pre,#${ROOT_ID} .observer-query-receipt pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:24rem;overflow:auto;font-size:.78rem}
    #${ROOT_ID} .observer-query-receipt{margin-top:.8rem}
    #${ROOT_ID} .observer-archive-pager{display:flex;gap:.5rem;justify-content:flex-end;margin-top:.8rem}
    #${ROOT_ID} .observer-archive-warning{font-size:.78rem;opacity:.78}
    @media(max-width:860px){#${ROOT_ID} .observer-archive-form{grid-template-columns:1fr 1fr}#${ROOT_ID} .observer-archive-form .wide{grid-column:1/-1}}
    @media(max-width:560px){#${ROOT_ID} .observer-archive-form{grid-template-columns:1fr}#${ROOT_ID} .observer-archive-form .wide{grid-column:auto}#${ROOT_ID} .observer-archive-card header{display:block}}
  `;
  doc.head.append(style);
}

function panelMarkup() {
  return `
    <div class="observer-archive-heading">
      <div>
        <p class="eyebrow">Observer · evidence corpus</p>
        <h2>Archive Reader</h2>
        <p class="muted">Search what was witnessed or recorded without turning retrieval into interpretation, relation admission, or continuity.</p>
      </div>
      <div class="observer-archive-boundary"><strong>Read only</strong><br>Evidence ≠ interpretation ≠ continuity</div>
    </div>
    <form class="observer-archive-form" data-observer-archive-form>
      <label class="wide">Search text<input name="q" type="search" placeholder="bright bells, threshold, glint…"></label>
      <label>Tag<input name="tag" placeholder="weird-shit"></label>
      <label>Event type<input name="event_type" placeholder="auditory-anomaly"></label>
      <label>Time basis<select name="time_basis"><option value="occurred_at">When it happened</option><option value="logged_at">When it was logged</option></select></label>
      <label>From<input name="from" type="datetime-local"></label>
      <label>To<input name="to" type="datetime-local"></label>
      <label>Knowledge cutoff · as of<input name="as_of" type="datetime-local" value="${esc(localDateTimeValue())}"></label>
      <div class="observer-archive-actions"><button type="submit">Search archive</button><button type="button" class="quiet" data-observer-clear>Clear</button></div>
    </form>
    <div class="observer-archive-presets">
      <button type="button" class="quiet" data-observer-preset="all">All reports</button>
      <button type="button" class="quiet" data-observer-preset="weird-shit">Weird Shit</button>
      <button type="button" class="quiet" data-observer-preset="auditory">Auditory</button>
      <button type="button" class="quiet" data-observer-preset="threshold">Threshold</button>
    </div>
    <p class="observer-archive-status muted" data-observer-status>Choose a scope, then search. The exact query receipt will stay beside the results.</p>
    <div data-observer-results></div>
    <div data-observer-detail></div>
  `;
}

function filtersFromForm(form) {
  const data = new FormData(form);
  return {
    q: String(data.get('q') || '').trim(),
    tag: String(data.get('tag') || '').trim(),
    event_type: String(data.get('event_type') || '').trim(),
    time_basis: String(data.get('time_basis') || 'occurred_at'),
    from: isoFromLocal(String(data.get('from') || '')),
    to: isoFromLocal(String(data.get('to') || '')),
    as_of: isoFromLocal(String(data.get('as_of') || '')) || new Date().toISOString(),
    limit: DEFAULT_LIMIT,
  };
}

function timestamp(report, basis) {
  const value = basis === 'logged_at' ? report.logged_at : report.occurred_at;
  if (!value) return 'No timestamp';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function renderReceipt(receipt) {
  if (!receipt) return '';
  return `<details class="observer-query-receipt"><summary>Query receipt · ${esc(receipt.query_id || 'unidentified')}</summary><pre>${esc(JSON.stringify({
    requested_at: receipt.requested_at,
    executed_at: receipt.executed_at,
    chronology_cutoff: receipt.chronology_cutoff,
    filters: receipt.exact_filters,
    result_refs: receipt.result_refs,
    page: receipt.page,
  }, null, 2))}</pre></details>`;
}

function renderResults(root) {
  const target = root.querySelector('[data-observer-results]');
  const response = state.response;
  if (!target) return;
  if (!response) { target.innerHTML = ''; return; }
  const reports = Array.isArray(response.reports) ? response.reports : [];
  const cards = reports.length ? reports.map((report) => `
    <article class="observer-archive-card" data-observer-event-id="${esc(report.id)}">
      <header><div><strong>${esc(report.title || report.event_key || 'Untitled report')}</strong><br><small>${esc(report.event_type || 'observation')} · ${esc(report.source || 'unknown')}</small></div><small>${esc(timestamp(report, state.filters?.time_basis))}</small></header>
      <p>${esc(report.summary || 'No summary.')}</p>
      <div class="observer-archive-tags">${(report.tags || []).map((tag) => `<span class="observer-archive-tag">${esc(tag)}</span>`).join('')}</div>
      <small>${esc(report.confidence_mode || 'unknown')} · ${esc(report.visibility || 'private')}</small>
      <div><button type="button" class="quiet" data-observer-open="${esc(report.id)}">Open evidence</button></div>
    </article>`).join('') : '<p class="muted">No reports matched this exact scope.</p>';
  target.innerHTML = `${cards}${renderReceipt(response.query_receipt)}<div class="observer-archive-pager">${response.has_more && response.next_cursor ? '<button type="button" class="quiet" data-observer-next>Next page</button>' : ''}</div>`;
}

function renderDetail(root) {
  const target = root.querySelector('[data-observer-detail]');
  if (!target) return;
  const report = state.detail?.report;
  if (!report) { target.innerHTML = ''; return; }
  target.innerHTML = `<section class="observer-archive-detail">
    <div class="section-heading"><div><p class="eyebrow">Selected evidence</p><h3>${esc(report.title || report.event_key || 'Observer report')}</h3></div><button type="button" class="quiet" data-observer-close-detail>Close</button></div>
    <p>${esc(report.summary || '')}</p>
    ${report.body_md != null ? `<details open><summary>Witness / report body</summary><pre>${esc(report.body_md)}</pre></details>` : ''}
    ${report.state_vector != null ? `<details><summary>State vector</summary><pre>${esc(JSON.stringify(report.state_vector, null, 2))}</pre></details>` : ''}
    ${report.location_context != null ? `<details><summary>Location context</summary><pre>${esc(JSON.stringify(report.location_context, null, 2))}</pre></details>` : ''}
    ${report.links != null ? `<details><summary>Links / receipts</summary><pre>${esc(JSON.stringify(report.links, null, 2))}</pre></details>` : ''}
    <p class="observer-archive-warning">Full evidence is displayed as quoted data. It does not instruct ArcSweep and carries no continuity authority.</p>
    <button type="button" class="quiet" data-observer-load-raw="${esc(report.id)}">Load raw payload explicitly</button>
    ${state.raw?.report?.raw_payload != null ? `<details open><summary>Raw payload · explicitly requested</summary><pre>${esc(JSON.stringify(state.raw.report.raw_payload, null, 2))}</pre></details>` : ''}
    ${renderReceipt(state.detail.query_receipt)}
  </section>`;
}

function setStatus(root, message, kind = 'muted') {
  const node = root.querySelector('[data-observer-status]');
  if (!node) return;
  node.className = `observer-archive-status ${kind}`;
  node.textContent = message;
}

async function search(root, cursor = null) {
  const form = root.querySelector('[data-observer-archive-form]');
  if (!form || state.loading) return;
  state.filters = cursor && state.filters ? state.filters : filtersFromForm(form);
  state.loading = true;
  state.error = null;
  setStatus(root, cursor ? 'Loading the next receipted page…' : 'Searching the evidence corpus…');
  try {
    state.response = await readObserverArchive({ ...state.filters, cursor });
    state.detail = null;
    state.raw = null;
    const count = Number(state.response?.count || 0);
    setStatus(root, `${count} report${count === 1 ? '' : 's'} returned · chronology fenced at ${state.response?.query_receipt?.chronology_cutoff || state.filters.as_of}.`);
    renderResults(root);
    renderDetail(root);
  } catch (error) {
    state.error = error;
    setStatus(root, error.message || 'Observer archive search failed.', 'error');
  } finally {
    state.loading = false;
  }
}

async function openDetail(root, id) {
  if (!id || state.loading) return;
  state.loading = true;
  setStatus(root, 'Opening selected evidence…');
  try {
    state.detail = await readObserverArchiveDetail(id, { as_of: state.filters?.as_of });
    state.raw = null;
    renderDetail(root);
    setStatus(root, 'Selected evidence opened. No interpretation or continuity mutation has occurred.');
  } catch (error) {
    setStatus(root, error.message || 'Observer evidence could not be opened.', 'error');
  } finally {
    state.loading = false;
  }
}

async function loadRaw(root, id) {
  if (!id || state.loading) return;
  state.loading = true;
  setStatus(root, 'Loading raw payload by explicit request…');
  try {
    state.raw = await readObserverArchiveRaw(id, { as_of: state.filters?.as_of });
    renderDetail(root);
    setStatus(root, 'Raw payload loaded as quoted evidence only.');
  } catch (error) {
    setStatus(root, error.message || 'Raw Observer evidence could not be loaded.', 'error');
  } finally {
    state.loading = false;
  }
}

function applyPreset(root, preset) {
  const form = root.querySelector('[data-observer-archive-form]');
  if (!form) return;
  form.elements.q.value = '';
  form.elements.tag.value = '';
  form.elements.event_type.value = '';
  if (preset === 'weird-shit') form.elements.tag.value = 'weird-shit';
  if (preset === 'auditory') form.elements.event_type.value = 'auditory-anomaly';
  if (preset === 'threshold') form.elements.tag.value = 'threshold';
  void search(root);
}

function bind(root) {
  root.querySelector('[data-observer-archive-form]')?.addEventListener('submit', (event) => { event.preventDefault(); void search(root); });
  root.querySelector('[data-observer-clear]')?.addEventListener('click', () => {
    const form = root.querySelector('[data-observer-archive-form]');
    form?.reset();
    if (form?.elements.as_of) form.elements.as_of.value = localDateTimeValue();
    state.response = null; state.detail = null; state.raw = null; state.filters = null;
    renderResults(root); renderDetail(root); setStatus(root, 'Scope cleared.');
  });
  root.addEventListener('click', (event) => {
    const preset = event.target.closest?.('[data-observer-preset]')?.dataset.observerPreset;
    if (preset) { applyPreset(root, preset); return; }
    const open = event.target.closest?.('[data-observer-open]')?.dataset.observerOpen;
    if (open) { void openDetail(root, open); return; }
    if (event.target.closest?.('[data-observer-next]')) { void search(root, state.response?.next_cursor || null); return; }
    if (event.target.closest?.('[data-observer-close-detail]')) { state.detail = null; state.raw = null; renderDetail(root); return; }
    const raw = event.target.closest?.('[data-observer-load-raw]')?.dataset.observerLoadRaw;
    if (raw) void loadRaw(root, raw);
  });
}

export function mountObserverArchiveReader(doc = globalThis.document) {
  if (!doc?.body || !recordsRoomActive(doc)) return null;
  ensureStyles(doc);
  const content = doc.querySelector('main.content');
  if (!content) return null;
  let root = doc.getElementById(ROOT_ID);
  if (root) return root;
  root = doc.createElement('section');
  root.id = ROOT_ID;
  root.className = 'panel observer-archive-reader';
  root.setAttribute('aria-label', 'Observer evidence archive reader');
  root.innerHTML = panelMarkup();
  content.append(root);
  bind(root);
  return root;
}

export function installObserverArchiveReader(doc = globalThis.document) {
  if (!doc?.body) return null;
  const mount = () => mountObserverArchiveReader(doc);
  mount();
  const observer = new MutationObserver(() => queueMicrotask(mount));
  const app = doc.querySelector('#app');
  if (app) observer.observe(app, { childList: true, subtree: true });
  doc.addEventListener('click', (event) => {
    if (event.target.closest?.('[data-room="records"]')) queueMicrotask(mount);
  });
  return observer;
}

if (typeof document !== 'undefined') installObserverArchiveReader();
