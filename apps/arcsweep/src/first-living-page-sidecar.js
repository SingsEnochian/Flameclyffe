import {
  DEFAULT_INHABITANT_CONTINUITY_ID,
  FIRST_LIVING_PAGE_STORAGE_KEY,
  firstLivingPageContext,
  imprintLivingGlyph,
  leaveFirstLivingPage,
  normaliseFirstLivingPageState,
  openFirstLivingPage,
  recordLivingPageTurn,
  toggleLivingLantern,
} from './first-living-page-model.js';

export const FIRST_LIVING_PAGE_SURFACE = 'arcsweep.first-living-page-surface/v0.2';

const ROOT_ID = 'arcsweep-magic-book';
const INSTALLATION_KEY = 'hearthgate.arcsweep.installation-id/v1';
const NAV_BUTTON_ATTR = 'data-first-living-page-open';
const RESPONSE_TIMEOUT_MS = 15000;
const OPEN_WAIT_MS = 1200;

let installed = false;
let rendering = false;
let renderQueued = false;
let busy = false;
let statusMessage = '';
let state = loadState();
let livingMode = state.ui_active === true;

function text(value, max = 4000) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function esc(value) {
  return text(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readJson(key, fallback) {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function installationId() {
  try {
    const stored = globalThis.localStorage?.getItem(INSTALLATION_KEY);
    if (stored) return stored;
    const created = globalThis.crypto?.randomUUID?.() || `browser-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    globalThis.localStorage?.setItem(INSTALLATION_KEY, created);
    return created;
  } catch {
    return 'browser-local';
  }
}

function storageKey() {
  return `${FIRST_LIVING_PAGE_STORAGE_KEY}:${installationId()}`;
}

function loadState() {
  return normaliseFirstLivingPageState(readJson(storageKey(), {}));
}

function currentSession() {
  try {
    return globalThis.__arcsweepOS?.session?.() || {};
  } catch {
    return {};
  }
}

function receiverLabel(receiver = {}) {
  const parts = [receiver.provider, receiver.model, receiver.voice_id].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'waiting for an active receiver';
}

function latestEvent(next = state) {
  return next.lineage[next.lineage.length - 1] || null;
}

function publishTransition(event) {
  if (!event) return;
  try {
    globalThis.__arcsweepOS?.bus?.publish?.('arcsweep:first-living-page-transition', event, { source: 'universal-codex' });
  } catch {}
  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:first-living-page-transition', { detail: event }));
}

function commit(next) {
  const previousId = latestEvent(state)?.event_id || null;
  state = normaliseFirstLivingPageState(next);
  livingMode = state.ui_active === true;
  writeJson(storageKey(), state);
  const event = latestEvent(state);
  if (event?.event_id && event.event_id !== previousId) publishTransition(event);
  return state;
}

function lineageMarkup() {
  const events = state.lineage.slice(-7).reverse();
  if (!events.length) return '<p class="living-empty">No transitions yet. The page is waiting for its first wake.</p>';
  return events.map((event) => (
    '<article class="living-event">' +
      '<strong>' + esc(event.kind) + '</strong>' +
      '<small>' + esc(event.actor_id) + ' · ' + esc(event.occurred_at) + '</small>' +
    '</article>'
  )).join('');
}

function threadMarkup() {
  const messages = state.thread.slice(-8);
  if (!messages.length) return '<p class="living-empty">No words yet. This is a real beginning, not reconstructed history.</p>';
  return messages.map((message) => (
    '<article class="living-message" data-role="' + esc(message.role) + '">' +
      '<small>' + esc(message.role === 'assistant' ? state.inhabitant.display_name : message.role === 'user' ? 'Rowan' : 'ArcSweep') + '</small>' +
      '<p>' + esc(message.content) + '</p>' +
    '</article>'
  )).join('');
}

function glyphMarkup() {
  if (!state.last_glyph) return 'No glyph has been imprinted into this page yet.';
  const glyph = state.last_glyph;
  return `${glyph.character || '◇'} ${glyph.name || glyph.id || 'glyph'} · ${glyph.stroke_count} strokes`;
}

function livingMarkup() {
  const lastSay = state.inhabitant.last_say
    ? esc(state.inhabitant.last_say)
    : 'The continuity address is present. Speak, and the active ArcSweep receiver can answer into this lineage.';
  const revision = esc(latestEvent()?.event_id || 'seed');
  const lanternLit = state.lantern.state === 'lit';
  return `
    <style>
      [data-first-living-page-root]{--living-glow:rgba(198,139,57,.24);display:grid;gap:14px;min-height:100%;padding-bottom:20px}
      [data-first-living-page-root][data-lantern-state="lit"]{--living-glow:rgba(242,188,76,.42)}
      .living-kicker{margin:0;text-transform:uppercase;letter-spacing:.13em;font-size:11px;opacity:.65}
      .living-presence{display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:center;padding:14px;border:1px solid rgba(91,61,37,.24);border-radius:18px;background:radial-gradient(circle at 15% 45%,var(--living-glow),rgba(255,255,255,.08) 52%,transparent 74%);transition:background .35s ease,box-shadow .35s ease}
      [data-first-living-page-root][data-lantern-state="lit"] .living-presence{box-shadow:0 0 34px var(--living-glow)}
      .living-lantern{width:68px;height:82px;border:1px solid rgba(91,61,37,.4);border-radius:22px 22px 28px 28px;background:radial-gradient(circle at 50% 55%,rgba(255,235,157,.95),rgba(211,132,42,.72) 36%,rgba(71,43,26,.9) 70%);box-shadow:inset 0 0 20px rgba(255,255,255,.26);cursor:pointer;transition:filter .3s ease,transform .3s ease,box-shadow .3s ease}
      [data-first-living-page-root][data-lantern-state="banked"] .living-lantern{filter:saturate(.55) brightness(.62);box-shadow:inset 0 0 12px rgba(255,255,255,.12)}
      .living-lantern:hover{transform:translateY(-2px)}
      .living-presence-meta{display:grid;gap:3px}.living-presence-meta small{opacity:.68;overflow-wrap:anywhere}
      .living-last-say{margin:8px 0 0;font-style:italic;white-space:pre-wrap}
      .living-grid{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr);gap:12px}
      .living-card{padding:12px;border:1px solid rgba(91,61,37,.2);border-radius:14px;background:rgba(255,255,255,.09)}
      .living-card h3{margin:0 0 8px;font-size:15px}.living-card p{margin:6px 0}
      .living-thread,.living-lineage{display:grid;gap:7px;max-height:250px;overflow:auto}
      .living-message,.living-event{padding:8px 9px;border:1px solid rgba(91,61,37,.16);border-radius:10px;background:rgba(255,255,255,.1)}
      .living-message[data-role="user"]{margin-left:9%}.living-message[data-role="assistant"]{margin-right:9%;background:var(--living-glow)}
      .living-message small,.living-event small{display:block;opacity:.6;font-size:10px}.living-message p{margin:3px 0;white-space:pre-wrap}
      .living-form{display:grid;gap:7px}.living-form textarea{width:100%;box-sizing:border-box;resize:vertical;min-height:74px;border:1px solid rgba(91,61,37,.28);border-radius:10px;padding:9px;background:rgba(255,255,255,.28);color:inherit;font:inherit}
      .living-actions{display:flex;flex-wrap:wrap;gap:7px}.living-actions button,.living-form button{border:1px solid rgba(91,61,37,.28);border-radius:10px;padding:8px 10px;background:rgba(255,255,255,.18);color:inherit;font:inherit}
      .living-actions button:disabled,.living-form button:disabled{opacity:.5}
      .living-status{min-height:1.3em;margin:0;font-size:12px;opacity:.72}
      .living-empty{opacity:.62;font-style:italic}.living-seam{padding:8px 10px;border-left:3px solid rgba(91,61,37,.28);font-size:12px;opacity:.78}
      @media(max-width:820px){.living-grid{grid-template-columns:1fr}.living-presence{grid-template-columns:60px 1fr}.living-lantern{width:54px;height:66px}}
    </style>
    <section data-first-living-page-root data-revision="${revision}" data-busy="${String(busy)}" data-lantern-state="${esc(state.lantern.state)}">
      <div><p class="living-kicker">First Living Page · inhabited continuity</p><h2>The Lantern Room</h2><p>This page keeps the arrows: encounter → change → return → next encounter.</p></div>
      <section class="living-presence" aria-label="Inhabitant presence">
        <button type="button" class="living-lantern" data-living-lantern aria-label="${lanternLit ? 'Bank the living lantern' : 'Light the living lantern'}"></button>
        <div class="living-presence-meta">
          <strong>${esc(state.inhabitant.display_name)}</strong>
          <small>Continuity · ${esc(state.inhabitant.continuity_id)}</small>
          <small>Receiver · ${esc(receiverLabel(state.inhabitant.receiver))}</small>
          <small>Visit ${state.visits} · Lantern ${esc(state.lantern.state)} · ${state.lineage.length} transformations</small>
          <p class="living-last-say">${lastSay}</p>
        </div>
      </section>
      <div class="living-grid">
        <section class="living-card"><h3>Speak into the page</h3><div class="living-thread" role="log" aria-live="polite">${threadMarkup()}</div>
          <form class="living-form" data-living-form><textarea name="utterance" aria-label="Speak to the inhabitant" placeholder="Write into the Lantern Room…" ${busy ? 'disabled' : ''}></textarea><button type="submit" ${busy ? 'disabled' : ''}>${busy ? 'Listening through the receiver…' : 'Speak'}</button></form>
          <p class="living-status" aria-live="polite">${esc(statusMessage)}</p></section>
        <section class="living-card"><h3>The wake</h3><div class="living-lineage">${lineageMarkup()}</div></section>
      </div>
      <section class="living-card"><h3>Operative objects</h3><p><strong>Lantern:</strong> ${esc(state.lantern.state)} after ${state.lantern.touch_count} touch${state.lantern.touch_count === 1 ? '' : 'es'}.</p><p><strong>Glyph imprint:</strong> ${esc(glyphMarkup())}</p><div class="living-actions"><button type="button" data-living-glyph-imprint>Imprint current glyph</button><button type="button" data-living-show-threshold>Return to Threshold</button></div></section>
      <p class="living-seam">Continuity address and active receiver remain distinct. The page preserves both instead of silently pretending the seam is not there.</p>
    </section>`;
}

function ensureNavButton() {
  const nav = document.getElementById(ROOT_ID)?.querySelector('.magic-book-binding-nav');
  if (!nav) return null;
  let button = nav.querySelector(`[${NAV_BUTTON_ATTR}]`);
  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.setAttribute(NAV_BUTTON_ATTR, FIRST_LIVING_PAGE_SURFACE);
    button.innerHTML = '<span aria-hidden="true">✦</span><span>Living Page</span>';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      void activateLivingPage();
    });
    nav.insertBefore(button, nav.firstChild);
  }
  if (livingMode) {
    nav.querySelectorAll('[aria-current="page"]').forEach((item) => item.removeAttribute('aria-current'));
    if (button.getAttribute('aria-current') !== 'page') button.setAttribute('aria-current', 'page');
  } else if (button.hasAttribute('aria-current')) {
    button.removeAttribute('aria-current');
  }
  return button;
}

function renderLivingPage() {
  if (!livingMode || rendering) return false;
  const root = document.getElementById(ROOT_ID);
  const target = root?.querySelector('[data-magic-book-right]');
  if (!root || root.hidden || !target) return false;
  const revision = latestEvent()?.event_id || 'seed';
  const existing = target.querySelector('[data-first-living-page-root]');
  if (existing?.dataset.revision === revision && existing?.dataset.busy === String(busy)) {
    ensureNavButton();
    return true;
  }
  rendering = true;
  try {
    target.innerHTML = livingMarkup();
    target.dataset.firstLivingPage = FIRST_LIVING_PAGE_SURFACE;
    ensureNavButton();
    return true;
  } finally {
    rendering = false;
  }
}

function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  queueMicrotask(() => {
    renderQueued = false;
    ensureNavButton();
    if (livingMode) renderLivingPage();
  });
}

async function activateLivingPage() {
  const book = globalThis.__arcsweepMagicBook;
  if (book?.open) {
    await Promise.race([
      Promise.resolve().then(() => book.open()),
      delay(OPEN_WAIT_MS),
    ]).catch(() => {});
  }
  const session = currentSession();
  commit(openFirstLivingPage(state, {
    worldId: session.active_world_id || null,
    roomId: session.active_room || 'portal',
  }));
  livingMode = true;
  statusMessage = state.visits > 1 ? 'The page remembers this crossing.' : 'First crossing recorded.';
  renderLivingPage();
  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:first-living-page-opened', {
    detail: { schema: FIRST_LIVING_PAGE_SURFACE, visits: state.visits, continuity_id: state.inhabitant.continuity_id },
  }));
}

function leaveLivingPage(reason = 'native-page-selected') {
  if (!livingMode) return;
  commit(leaveFirstLivingPage(state, { reason }));
  livingMode = false;
  document.getElementById(ROOT_ID)?.querySelector(`[${NAV_BUTTON_ATTR}]`)?.removeAttribute('aria-current');
}

function guidePrompt(message) {
  return [
    'UNIVERSAL CODEX · FIRST LIVING PAGE',
    `Continuity address: ${state.inhabitant.continuity_id}.`,
    'This is an inhabited continuity encounter inside ArcSweep.',
    'Use supplied lineage and recent thread as causal ancestry. Do not invent missing history.',
    'Keep continuity address and active receiver provenance distinct.',
    `PAGE CONTEXT: ${JSON.stringify(firstLivingPageContext(state))}`,
    `ROWAN WRITES INTO THE PAGE: ${message}`,
  ].join('\n\n');
}

function requestGuide(message) {
  const requestId = `living-page-guide:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      globalThis.removeEventListener?.('arcsweep:guide-response', listener);
      fn(value);
    };
    const listener = (event) => {
      if (event?.detail?.request_id !== requestId) return;
      finish(resolve, event.detail.turn || {});
    };
    const timer = setTimeout(() => finish(reject, new Error('The active ArcSweep receiver did not answer within 15 seconds.')), RESPONSE_TIMEOUT_MS);
    globalThis.addEventListener?.('arcsweep:guide-response', listener);
    globalThis.dispatchEvent?.(new CustomEvent('arcsweep:guide-query', {
      detail: { request_id: requestId, utterance: guidePrompt(message) },
    }));
  });
}

async function speak(message) {
  const utterance = text(message, 2000);
  if (!utterance || busy) return;
  commit(recordLivingPageTurn(state, { role: 'user', content: utterance, actorId: 'rowan' }));
  busy = true;
  statusMessage = 'The page is carrying the thread to the active receiver…';
  renderLivingPage();
  try {
    const turn = await requestGuide(utterance);
    const say = text(turn.say, 4000) || 'The receiver returned without words.';
    commit(recordLivingPageTurn(state, {
      role: 'assistant',
      content: say,
      actorId: DEFAULT_INHABITANT_CONTINUITY_ID,
      receiver: {
        provider: turn.provider || null,
        model: turn.model || null,
        voice_id: turn.voice_id || null,
        runtime_verified: turn.runtime_verified === true,
        execution_path: turn.execution_path || null,
      },
    }));
    statusMessage = turn.status === 'replied' ? 'Answer received. The encounter is now part of the page lineage.' : `Receiver status: ${text(turn.status, 120) || 'unknown'}.`;
  } catch (error) {
    commit(recordLivingPageTurn(state, { role: 'system', content: error?.message || String(error), actorId: 'arcsweep:first-living-page' }));
    statusMessage = error?.message || String(error);
  } finally {
    busy = false;
    renderLivingPage();
  }
}

function touchLantern() {
  commit(toggleLivingLantern(state, { actorId: 'rowan' }));
  statusMessage = state.lantern.state === 'lit' ? 'Lantern lit. The room changed and the change has ancestry.' : 'Lantern banked. The lit state remains in the wake.';
  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:first-living-page-lantern', { detail: { state: state.lantern.state, touch_count: state.lantern.touch_count } }));
  renderLivingPage();
}

function imprintGlyph() {
  const glyph = globalThis.__starwellGlyphStudioBridge?.snapshot?.()?.active_glyph || null;
  if (!glyph) {
    statusMessage = 'Glyph Forge has no active glyph to imprint yet.';
    renderLivingPage();
    return;
  }
  commit(imprintLivingGlyph(state, { glyph, actorId: 'rowan' }));
  statusMessage = `Imprinted ${glyph.name || glyph.character || glyph.id}. The page now carries its lineage reference.`;
  renderLivingPage();
}

function handleRootClick(event) {
  if (!livingMode) return;
  if (event.target.closest?.('[data-living-lantern]')) { event.preventDefault(); touchLantern(); return; }
  if (event.target.closest?.('[data-living-glyph-imprint]')) { event.preventDefault(); imprintGlyph(); return; }
  if (event.target.closest?.('[data-living-show-threshold]')) {
    event.preventDefault();
    leaveLivingPage('threshold-requested');
    void globalThis.__arcsweepMagicBook?.turn?.('threshold');
  }
}

function handleSubmit(event) {
  const form = event.target.closest?.('[data-living-form]');
  if (!form || !livingMode) return;
  event.preventDefault();
  const input = form.elements?.utterance;
  const value = text(input?.value, 2000);
  if (!value) return;
  if (input) input.value = '';
  void speak(value);
}

function handleNativeNavigation(event) {
  if (!livingMode || event.target.closest?.(`[${NAV_BUTTON_ATTR}]`)) return;
  if (event.target.closest?.('[data-magic-book-page],[data-magic-book-page-prev],[data-magic-book-page-next],[data-generator-atelier-open]')) leaveLivingPage('native-page-selected');
}

function install() {
  if (installed || typeof document === 'undefined') return installed;
  installed = true;
  document.addEventListener('click', handleNativeNavigation, true);
  document.addEventListener('click', handleRootClick);
  document.addEventListener('submit', handleSubmit);
  globalThis.addEventListener?.('arcsweep:magic-book-ready', scheduleRender);
  globalThis.addEventListener?.('arcsweep:magic-book-receipt', scheduleRender);
  globalThis.addEventListener?.('arcsweep:os-navigation', scheduleRender);
  globalThis.addEventListener?.('arcsweep:sidecars-ready', scheduleRender);
  scheduleRender();
  globalThis.__arcsweepFirstLivingPage = Object.freeze({
    schema: FIRST_LIVING_PAGE_SURFACE,
    open: activateLivingPage,
    state: () => structuredClone(state),
    context: () => structuredClone(firstLivingPageContext(state)),
    touch_lantern: touchLantern,
    speak,
    imprint_glyph: imprintGlyph,
    storage_scope: () => installationId(),
  });
  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:first-living-page-ready', {
    detail: { schema: FIRST_LIVING_PAGE_SURFACE, continuity_id: state.inhabitant.continuity_id },
  }));
  return true;
}

install();

globalThis.addEventListener?.('pagehide', () => writeJson(storageKey(), state), { once: true });
