import { INITIAL_ASPECTS } from './aspects/aspect-contract.js';
import { ASPECT_MESH_EVENTS, readAspectMeshRuntime } from './aspects/aspect-mesh-runtime.js';

export const CODEX_ASPECT_PROJECTION_SCHEMA = 'arcsweep.codex-aspect-projection/v0.1';
export const CODEX_ASPECT_PROJECTION_MARKER = 'codex-aspect-projection/v0.1';

const ROOT_ID = 'arcsweep-magic-book';
const MARGIN_KINDS = new Set(['observation', 'question', 'challenge', 'reply', 'verification', 'result', 'refusal', 'pause']);
const BRANCH_DOMAINS = new Set(['narrative', 'roleplay', 'counterfactual']);
const aspectNames = new Map(INITIAL_ASPECTS.map((aspect) => [aspect.id, aspect.name]));

let installed = false;
let meshUnsubscribe = null;
let wakePromise = null;
let selectedTraceId = null;
let coalitionState = null;

const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

function bodyText(body) {
  if (typeof body === 'string') return body.trim();
  if (body == null) return '';
  try { return JSON.stringify(body); } catch { return String(body); }
}

function bodyObject(body) {
  return body && typeof body === 'object' && !Array.isArray(body) ? body : {};
}

function knownAspect(envelope) {
  return aspectNames.has(String(envelope?.sender?.aspectId || '').trim());
}

export function classifyCodexAspectEntry(envelope = {}) {
  if (!knownAspect(envelope)) return 'hidden';
  const kind = String(envelope.kind || 'thought');
  const body = bodyObject(envelope.body);
  if (kind === 'proposal' && (body.mode === 'exploration' || BRANCH_DOMAINS.has(String(body.domain || '')))) return 'branch';
  if (kind === 'proposal') return 'proposal';
  if (MARGIN_KINDS.has(kind)) return 'marginalia';
  return 'marginalia';
}

function proposalSiblingCounts(messages) {
  const counts = new Map();
  for (const message of messages) {
    if (!knownAspect(message) || message.kind !== 'proposal' || !message.parentId) continue;
    counts.set(message.parentId, (counts.get(message.parentId) || 0) + 1);
  }
  return counts;
}

function traceBookmarks(messages) {
  const traces = new Map();
  for (const message of messages) {
    if (!knownAspect(message) || !message.traceId) continue;
    const current = traces.get(message.traceId) || { traceId: message.traceId, count: 0, aspects: new Set(), lastAt: '', lastKind: '' };
    current.count += 1;
    current.aspects.add(message.sender.aspectId);
    if (!current.lastAt || String(message.createdAt || '') >= current.lastAt) {
      current.lastAt = String(message.createdAt || '');
      current.lastKind = String(message.kind || 'thought');
    }
    traces.set(message.traceId, current);
  }
  return [...traces.values()]
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
    .slice(0, 6)
    .map((item) => Object.freeze({ ...item, aspects: Object.freeze([...item.aspects]) }));
}

export function projectCodexAspectMessages(envelopes = [], { selectedTrace = null } = {}) {
  const messages = (Array.isArray(envelopes) ? envelopes : []).filter(knownAspect).slice(-60);
  const siblingCounts = proposalSiblingCounts(messages);
  const marginalia = [];
  const proposals = [];
  const branches = [];

  for (const message of messages) {
    let role = classifyCodexAspectEntry(message);
    if (message.kind === 'proposal' && message.parentId && (siblingCounts.get(message.parentId) || 0) > 1) role = 'branch';
    const item = Object.freeze({
      id: message.id,
      traceId: message.traceId,
      parentId: message.parentId || null,
      aspectId: message.sender.aspectId,
      aspectName: aspectNames.get(message.sender.aspectId) || message.sender.aspectId,
      kind: message.kind || 'thought',
      text: bodyText(message.body),
      createdAt: message.createdAt || '',
      role,
    });
    if (role === 'proposal') proposals.push(item);
    else if (role === 'branch') branches.push(item);
    else if (role === 'marginalia') marginalia.push(item);
  }

  const traceId = selectedTrace || null;
  const trace = traceId ? messages.filter((message) => message.traceId === traceId).map((message) => Object.freeze({
    id: message.id,
    aspectId: message.sender.aspectId,
    aspectName: aspectNames.get(message.sender.aspectId) || message.sender.aspectId,
    kind: message.kind || 'thought',
    text: bodyText(message.body),
    createdAt: message.createdAt || '',
  })) : [];

  return Object.freeze({
    schema: CODEX_ASPECT_PROJECTION_SCHEMA,
    marginalia: Object.freeze(marginalia.slice(-5).reverse()),
    proposals: Object.freeze(proposals.slice(-3).reverse()),
    branches: Object.freeze(branches.slice(-4).reverse()),
    bookmarks: Object.freeze(traceBookmarks(messages)),
    selectedTraceId: traceId,
    trace: Object.freeze(trace),
  });
}

function root() {
  return document.getElementById(ROOT_ID);
}

function projectionNode() {
  return root()?.querySelector(`[data-codex-aspect-projection="${CODEX_ASPECT_PROJECTION_MARKER}"]`) || null;
}

function ensureProjectionNode() {
  const book = root();
  const stage = book?.querySelector('.magic-book-stage');
  if (!stage) return null;
  let node = projectionNode();
  if (node) return node;
  node = document.createElement('div');
  node.className = 'codex-aspect-projection';
  node.dataset.codexAspectProjection = CODEX_ASPECT_PROJECTION_MARKER;
  stage.append(node);
  node.addEventListener('click', (event) => {
    const bookmark = event.target?.closest?.('[data-codex-trace]');
    if (bookmark) {
      selectedTraceId = bookmark.dataset.codexTrace || null;
      render();
      return;
    }
    if (event.target?.closest?.('[data-codex-trace-close]')) {
      selectedTraceId = null;
      render();
    }
  });
  return node;
}

function marginMarkup(item, index) {
  const side = index % 2 ? 'right' : 'left';
  return `<article class="codex-margin-note" data-side="${side}" data-kind="${esc(item.kind)}"><span>${esc(item.aspectName)}</span><p>${esc(item.text.slice(0, 220) || `[${item.kind}]`)}</p></article>`;
}

function proposalMarkup(item) {
  return `<details class="codex-proposal-fold"><summary><span>⌁</span><strong>${esc(item.aspectName)}</strong><small>${esc(item.kind)}</small></summary><p>${esc(item.text.slice(0, 700))}</p></details>`;
}

function branchMarkup(item) {
  return `<button type="button" class="codex-branch-leaf" data-codex-trace="${esc(item.traceId || '')}" title="Open trace ${esc(item.traceId || '')}"><span>◒</span><strong>${esc(item.aspectName)}</strong><small>${esc(item.text.slice(0, 90) || 'alternate leaf')}</small></button>`;
}

function bookmarkMarkup(item) {
  const names = item.aspects.map((id) => aspectNames.get(id) || id).join(' + ');
  return `<button type="button" class="codex-trace-bookmark" data-codex-trace="${esc(item.traceId)}" aria-pressed="${item.traceId === selectedTraceId ? 'true' : 'false'}"><span>${esc(String(item.count))}</span><strong>${esc(names || 'trace')}</strong></button>`;
}

function traceDrawerMarkup(projection) {
  if (!projection.selectedTraceId) return '';
  const body = projection.trace.length ? projection.trace.map((item) => `<article><header><strong>${esc(item.aspectName)}</strong><small>${esc(item.kind)}</small></header><p>${esc(item.text.slice(0, 900))}</p></article>`).join('') : '<p>No live entries for this trace.</p>';
  return `<section class="codex-trace-drawer"><header><span><b>Trace bookmark</b><small>${esc(projection.selectedTraceId)}</small></span><button type="button" data-codex-trace-close aria-label="Close trace">×</button></header><div>${body}</div></section>`;
}

function render() {
  const node = ensureProjectionNode();
  if (!node) return;
  const runtime = readAspectMeshRuntime();
  const messages = runtime?.bus?.all?.() || [];
  const projection = projectCodexAspectMessages(messages, { selectedTrace: selectedTraceId });
  const quiet = !projection.marginalia.length && !projection.proposals.length && !projection.branches.length;
  const coalition = coalitionState?.state === 'working' ? `<div class="codex-coalition-whisper"><span>⌁</span><strong>${esc((coalitionState.members || []).map((id) => aspectNames.get(id) || id).join(' + '))}</strong><small>${esc(coalitionState.purpose || 'working')}</small></div>` : '';

  node.innerHTML = `<div class="codex-trace-ribbons">${projection.bookmarks.map(bookmarkMarkup).join('')}</div><aside class="codex-marginalia" aria-label="Aspect marginalia">${projection.marginalia.map(marginMarkup).join('')}${quiet ? '<p class="codex-wonder-listening">Wonder margin · listening</p>' : ''}</aside><aside class="codex-proposal-shelf" aria-label="Aspect proposals">${coalition}${projection.proposals.map(proposalMarkup).join('')}</aside><aside class="codex-branch-stack" aria-label="Alternate leaves">${projection.branches.map(branchMarkup).join('')}</aside>${traceDrawerMarkup(projection)}`;
}

function attachMesh(runtime) {
  if (!runtime?.bus?.subscribe || meshUnsubscribe) return runtime;
  meshUnsubscribe = runtime.bus.subscribe(() => render());
  render();
  return runtime;
}

async function wakeMesh() {
  const existing = readAspectMeshRuntime();
  if (existing) return attachMesh(existing);
  if (!wakePromise) {
    wakePromise = import('./runtime-integration-bootstrap.js')
      .then(async () => {
        for (let attempt = 0; attempt < 30; attempt += 1) {
          const runtime = readAspectMeshRuntime();
          if (runtime) return attachMesh(runtime);
          await new Promise((resolve) => setTimeout(resolve, 40));
        }
        return null;
      })
      .finally(() => { wakePromise = null; });
  }
  return wakePromise;
}

function onBookReady() {
  render();
  if (root() && !root().hidden) void wakeMesh();
}

function onBookReceipt(event) {
  const receipt = event.detail || {};
  if (receipt.kind === 'book-open') void wakeMesh().then(() => render());
  else render();
}

function onCoalitionStarted(event) {
  const coalition = event.detail?.coalition || {};
  coalitionState = {
    state: 'working',
    traceId: event.detail?.traceId || coalition.id || null,
    purpose: coalition.purpose || 'Open exploration',
    members: [...(coalition.members || [])],
  };
  render();
}

function onCoalitionComplete(event) {
  if (!coalitionState || coalitionState.traceId === event.detail?.traceId) coalitionState = null;
  render();
}

function installStyles() {
  if (document.getElementById('magic-book-aspect-mesh-styles')) return;
  const style = document.createElement('style');
  style.id = 'magic-book-aspect-mesh-styles';
  style.textContent = `.magic-book-stage{position:relative}.codex-aspect-projection{position:absolute;inset:0;z-index:8;pointer-events:none;font-family:Georgia,'Times New Roman',serif}.codex-aspect-projection button,.codex-aspect-projection details{pointer-events:auto}.codex-trace-ribbons{position:absolute;top:.35rem;left:50%;display:flex;gap:.18rem;transform:translateX(-50%);max-width:62%;overflow:auto;scrollbar-width:none}.codex-trace-bookmark{display:grid;grid-template-columns:auto auto;align-items:center;gap:.28rem;min-width:max-content;padding:.22rem .38rem;border:0;border-radius:0 0 .35rem .35rem;background:color-mix(in srgb,var(--gold,#c7a963) 14%,#241c13);color:inherit;box-shadow:0 2px 7px rgba(0,0,0,.22);font:inherit}.codex-trace-bookmark>span{font-size:.52rem;opacity:.72}.codex-trace-bookmark>strong{font-size:.56rem;font-weight:650}.codex-trace-bookmark[aria-pressed="true"]{box-shadow:inset 0 -2px 0 var(--gold,#c7a963),0 2px 7px rgba(0,0,0,.22)}.codex-marginalia{position:absolute;inset:9% 0 10%;pointer-events:none}.codex-margin-note{position:absolute;width:min(12rem,19vw);padding:.28rem .4rem;border-left:1px solid color-mix(in srgb,var(--gold,#c7a963) 40%,transparent);color:color-mix(in srgb,currentColor 78%,transparent);font-style:italic;transform:rotate(-1.1deg)}.codex-margin-note:nth-child(1){top:5%}.codex-margin-note:nth-child(2){top:27%}.codex-margin-note:nth-child(3){top:49%}.codex-margin-note:nth-child(4){top:67%}.codex-margin-note:nth-child(5){top:82%}.codex-margin-note[data-side="left"]{left:.55rem}.codex-margin-note[data-side="right"]{right:.55rem;transform:rotate(.9deg)}.codex-margin-note>span{display:block;font-size:.55rem;font-style:normal;font-weight:700;letter-spacing:.04em}.codex-margin-note>p{margin:.12rem 0 0;font-size:.64rem;line-height:1.25}.codex-wonder-listening{position:absolute;left:1rem;bottom:1rem;margin:0;font-size:.58rem;font-style:italic;opacity:.48}.codex-proposal-shelf{position:absolute;right:1rem;bottom:1rem;display:grid;gap:.32rem;width:min(16rem,28vw);pointer-events:none}.codex-proposal-fold{border:1px solid color-mix(in srgb,var(--gold,#c7a963) 28%,transparent);border-radius:.28rem;background:color-mix(in srgb,#241c13 88%,transparent);box-shadow:0 4px 12px rgba(0,0,0,.2);padding:.3rem .4rem}.codex-proposal-fold summary{display:grid;grid-template-columns:auto 1fr auto;gap:.3rem;align-items:center;cursor:pointer;font-size:.62rem}.codex-proposal-fold summary::-webkit-details-marker{display:none}.codex-proposal-fold summary>span{color:var(--gold,#c7a963)}.codex-proposal-fold summary>small{opacity:.55;font-size:.5rem}.codex-proposal-fold>p{margin:.35rem 0 .1rem;font-size:.62rem;line-height:1.35}.codex-coalition-whisper{display:grid;grid-template-columns:auto 1fr;gap:.28rem;padding:.3rem .4rem;border-left:2px solid var(--gold,#c7a963);background:color-mix(in srgb,#241c13 80%,transparent)}.codex-coalition-whisper>span{grid-row:1 / span 2;color:var(--gold,#c7a963)}.codex-coalition-whisper>strong{font-size:.58rem}.codex-coalition-whisper>small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.5rem;opacity:.6}.codex-branch-stack{position:absolute;right:-.15rem;top:25%;display:grid;gap:.24rem;width:min(11rem,20vw);pointer-events:none}.codex-branch-leaf{display:grid;grid-template-columns:auto 1fr;gap:.3rem;padding:.34rem .42rem;border:1px solid color-mix(in srgb,var(--green,#7da88b) 25%,transparent);border-radius:.18rem 0 0 .18rem;background:color-mix(in srgb,#1f271f 86%,transparent);color:inherit;text-align:left;box-shadow:-3px 3px 8px rgba(0,0,0,.15);transform:translateX(64%);transition:transform .16s ease}.codex-branch-leaf:hover,.codex-branch-leaf:focus-visible{transform:translateX(0)}.codex-branch-leaf>span{grid-row:1 / span 2;color:var(--green,#7da88b)}.codex-branch-leaf>strong{font-size:.58rem}.codex-branch-leaf>small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.49rem;opacity:.62}.codex-trace-drawer{position:absolute;left:50%;bottom:.65rem;width:min(38rem,72%);max-height:46%;overflow:auto;transform:translateX(-50%);border:1px solid color-mix(in srgb,var(--gold,#c7a963) 32%,transparent);border-radius:.42rem;background:color-mix(in srgb,#18130f 96%,transparent);box-shadow:0 10px 30px rgba(0,0,0,.36);pointer-events:auto}.codex-trace-drawer>header{position:sticky;top:0;display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.45rem .55rem;background:#18130f;border-bottom:1px solid rgba(255,255,255,.08)}.codex-trace-drawer>header>span{display:grid}.codex-trace-drawer>header b{font-size:.65rem}.codex-trace-drawer>header small{max-width:28rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.5rem;opacity:.6}.codex-trace-drawer>header button{border:0;background:transparent;color:inherit;font-size:1.05rem}.codex-trace-drawer>div{display:grid;gap:.28rem;padding:.45rem .55rem}.codex-trace-drawer article{padding:.3rem .4rem;border-left:1px solid color-mix(in srgb,var(--gold,#c7a963) 24%,transparent)}.codex-trace-drawer article header{display:flex;justify-content:space-between;gap:.4rem}.codex-trace-drawer article strong{font-size:.6rem}.codex-trace-drawer article small{font-size:.5rem;opacity:.58}.codex-trace-drawer article p{margin:.18rem 0 0;font-size:.62rem;line-height:1.4}@media(max-width:760px){.codex-margin-note{width:9.2rem}.codex-proposal-shelf{width:13rem}.codex-branch-stack{width:9rem}.codex-trace-drawer{width:88%}}@media(prefers-reduced-motion:reduce){.codex-branch-leaf{transition:none}}`;
  document.head.append(style);
}

export function installMagicBookAspectMeshProjection() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  installStyles();
  document.addEventListener('arcsweep:magic-book-ready', onBookReady);
  document.addEventListener('arcsweep:magic-book-receipt', onBookReceipt);
  document.addEventListener(ASPECT_MESH_EVENTS.ready, () => attachMesh(readAspectMeshRuntime()));
  document.addEventListener(ASPECT_MESH_EVENTS.coalitionStarted, onCoalitionStarted);
  document.addEventListener(ASPECT_MESH_EVENTS.coalitionComplete, onCoalitionComplete);
  ensureProjectionNode();
  render();
  if (root() && !root().hidden) void wakeMesh();
  globalThis.addEventListener?.('beforeunload', () => meshUnsubscribe?.(), { once: true });
}

if (typeof document !== 'undefined') installMagicBookAspectMeshProjection();
