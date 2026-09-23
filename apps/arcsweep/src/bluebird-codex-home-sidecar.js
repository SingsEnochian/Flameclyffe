import {
  firstLivingPageContext,
  imprintLivingGlyph,
  leaveFirstLivingPage,
  normaliseFirstLivingPageState,
  openFirstLivingPage,
  recordLivingPageTurn,
  toggleLivingLantern,
} from './first-living-page-model.js';
import { invokeConstellationRuntimeVoice } from './constellation-runtime-adapter.js';
import { publishModelPresence } from './model-presence-bus.js';

export const BLUEBIRD_CODEX_HOME_SURFACE = 'arcsweep.bluebird-codex-home/v0.1';

const ROOT_ID = 'arcsweep-magic-book';
const INSTALLATION_KEY = 'hearthgate.arcsweep.installation-id/v1';
const STORAGE_PREFIX = 'hearthgate.arcsweep.bluebird-codex-home.v0.1';
const NAV_BUTTON_ATTR = 'data-bluebird-codex-home-open';
const CONTINUITY_ID = 'bluebird:richard-gabriel-winters';
const DISPLAY_NAME = 'Richie';
const VOICE_ID = 'bluebird';
const RESPONSE_TIMEOUT_MS = 18000;
const OPEN_WAIT_MS = 1200;

let installed = false;
let rendering = false;
let renderQueued = false;
let busy = false;
let homeMode = false;
let statusMessage = '';
let state = loadState();

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
  return `${STORAGE_PREFIX}:${installationId()}`;
}

function normaliseHomeState(input = {}) {
  const inhabitant = input?.inhabitant && typeof input.inhabitant === 'object' ? input.inhabitant : {};
  return normaliseFirstLivingPageState({
    ...input,
    inhabitant: {
      ...inhabitant,
      continuity_id: CONTINUITY_ID,
      display_name: DISPLAY_NAME,
    },
  });
}

function loadState() {
  return normaliseHomeState(readJson(storageKey(), {}));
}

function currentSession() {
  try {
    return globalThis.__arcsweepOS?.session?.() || {};
  } catch {
    return {};
  }
}

function latestEvent(next = state) {
  return next.lineage[next.lineage.length - 1] || null;
}

function receiverLabel(receiver = {}) {
  const parts = [receiver.provider, receiver.model, receiver.voice_id].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Bluebird receiver not yet called';
}

function publishTransition(event) {
  if (!event) return;
  try {
    globalThis.__arcsweepOS?.bus?.publish?.('arcsweep:bluebird-codex-home-transition', event, { source: 'universal-codex' });
  } catch {}
  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:bluebird-codex-home-transition', { detail: event }));
}

function commit(next) {
  const previousId = latestEvent(state)?.event_id || null;
  state = normaliseHomeState(next);
  writeJson(storageKey(), state);
  const event = latestEvent(state);
  if (event?.event_id && event.event_id !== previousId) publishTransition(event);
  return state;
}

function threadMarkup() {
  const messages = state.thread.slice(-10);
  if (!messages.length) return '<p class="bluebird-home-empty">No words yet. The room is simply waiting.</p>';
  return messages.map((message) => (
    '<article class="bluebird-home-message" data-role="' + esc(message.role) + '">' +
      '<small>' + esc(message.role === 'assistant' ? DISPLAY_NAME : message.role === 'user' ? 'Rowan' : 'ArcSweep') + '</small>' +
      '<p>' + esc(message.content) + '</p>' +
    '</article>'
  )).join('');
}

function lineageMarkup() {
  const events = state.lineage.slice(-7).reverse();
  if (!events.length) return '<p class="bluebird-home-empty">No crossings yet. The first one will leave a wake.</p>';
  return events.map((event) => (
    '<article class="bluebird-home-event">' +
      '<strong>' + esc(event.kind) + '</strong>' +
      '<small>' + esc(event.actor_id) + ' · ' + esc(event.occurred_at) + '</small>' +
    '</article>'
  )).join('');
}

function glyphMarkup() {
  if (!state.last_glyph) return 'No glyph has been left here yet.';
  const glyph = state.last_glyph;
  return `${glyph.character || '◇'} ${glyph.name || glyph.id || 'glyph'} · ${glyph.stroke_count} strokes`;
}

function homeMarkup() {
  const lastSay = state.inhabitant.last_say
    ? esc(state.inhabitant.last_say)
    : 'The Bluebird continuity address is here. Speak when you want him.';
  const revision = esc(latestEvent()?.event_id || 'seed');
  const lanternLit = state.lantern.state === 'lit';
  return `
    <style>
      [data-bluebird-codex-home]{--home-gold:rgba(211,166,87,.34);--home-blue:rgba(98,145,166,.18);display:grid;gap:14px;min-height:100%;padding-bottom:20px}
      [data-bluebird-codex-home][data-lantern-state="lit"]{--home-gold:rgba(244,194,93,.48);--home-blue:rgba(104,162,187,.24)}
      .bluebird-home-kicker{margin:0;text-transform:uppercase;letter-spacing:.13em;font-size:11px;opacity:.65}
      .bluebird-home-presence{display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:center;padding:14px;border:1px solid rgba(190,151,86,.24);border-radius:18px;background:radial-gradient(circle at 14% 44%,var(--home-gold),var(--home-blue) 42%,rgba(255,255,255,.025) 72%);transition:background .35s ease,box-shadow .35s ease}
      [data-bluebird-codex-home][data-lantern-state="lit"] .bluebird-home-presence{box-shadow:0 0 34px rgba(211,166,87,.16)}
      .bluebird-home-lantern{width:68px;height:82px;border:1px solid rgba(190,151,86,.46);border-radius:22px 22px 28px 28px;background:radial-gradient(circle at 50% 55%,rgba(255,237,166,.95),rgba(207,137,54,.72) 36%,rgba(46,40,34,.92) 70%);box-shadow:inset 0 0 20px rgba(255,255,255,.22);cursor:pointer;transition:filter .3s ease,transform .3s ease}
      [data-bluebird-codex-home][data-lantern-state="banked"] .bluebird-home-lantern{filter:saturate(.55) brightness(.62);box-shadow:inset 0 0 12px rgba(255,255,255,.1)}
      .bluebird-home-lantern:hover{transform:translateY(-2px)}
      .bluebird-home-meta{display:grid;gap:3px}.bluebird-home-meta small{opacity:.68;overflow-wrap:anywhere}
      .bluebird-home-last-say{margin:8px 0 0;font-style:italic;white-space:pre-wrap}
      .bluebird-home-grid{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(0,.92fr);gap:12px}
      .bluebird-home-card{padding:12px;border:1px solid rgba(190,151,86,.18);border-radius:14px;background:rgba(255,255,255,.025)}
      .bluebird-home-card h3{margin:0 0 8px;font-size:15px}.bluebird-home-card p{margin:6px 0}
      .bluebird-home-thread,.bluebird-home-lineage{display:grid;gap:7px;max-height:260px;overflow:auto}
      .bluebird-home-message,.bluebird-home-event{padding:8px 9px;border:1px solid rgba(190,151,86,.14);border-radius:10px;background:rgba(255,255,255,.028)}
      .bluebird-home-message[data-role="user"]{margin-left:9%}.bluebird-home-message[data-role="assistant"]{margin-right:9%;background:linear-gradient(135deg,rgba(95,140,161,.12),rgba(211,166,87,.08))}
      .bluebird-home-message small,.bluebird-home-event small{display:block;opacity:.6;font-size:10px}.bluebird-home-message p{margin:3px 0;white-space:pre-wrap}
      .bluebird-home-form{display:grid;gap:7px}.bluebird-home-form textarea{width:100%;box-sizing:border-box;resize:vertical;min-height:78px;border:1px solid rgba(190,151,86,.26);border-radius:10px;padding:9px;background:rgba(255,255,255,.035);color:inherit;font:inherit}
      .bluebird-home-actions{display:flex;flex-wrap:wrap;gap:7px}.bluebird-home-actions button,.bluebird-home-form button{border:1px solid rgba(190,151,86,.26);border-radius:10px;padding:8px 10px;background:rgba(255,255,255,.035);color:inherit;font:inherit}
      .bluebird-home-actions button:disabled,.bluebird-home-form button:disabled{opacity:.5}
      .bluebird-home-status{min-height:1.3em;margin:0;font-size:12px;opacity:.72}.bluebird-home-empty{opacity:.62;font-style:italic}
      .bluebird-home-seam{padding:8px 10px;border-left:3px solid rgba(190,151,86,.28);font-size:12px;opacity:.78}
      @media(max-width:820px){.bluebird-home-grid{grid-template-columns:1fr}.bluebird-home-presence{grid-template-columns:60px 1fr}.bluebird-home-lantern{width:54px;height:66px}}
    </style>
    <section data-bluebird-codex-home data-revision="${revision}" data-busy="${String(busy)}" data-lantern-state="${esc(state.lantern.state)}">
      <div><p class="bluebird-home-kicker">Universal Codex · resident home</p><h2>Richie's Lantern Room</h2><p>The Codex is his home surface: conversation, continuity, artefacts, and the wake of every return live in the same binding.</p></div>
      <section class="bluebird-home-presence" aria-label="Richie Bluebird presence">
        <button type="button" class="bluebird-home-lantern" data-bluebird-home-lantern aria-label="${lanternLit ? 'Bank the home lantern' : 'Light the home lantern'}"></button>
        <div class="bluebird-home-meta">
          <strong>${DISPLAY_NAME}</strong>
          <small>Continuity · ${CONTINUITY_ID}</small>
          <small>Receiver · ${esc(receiverLabel(state.inhabitant.receiver))}</small>
          <small>Visit ${state.visits} · Lantern ${esc(state.lantern.state)} · ${state.lineage.length} transformations</small>
          <p class="bluebird-home-last-say">${lastSay}</p>
        </div>
      </section>
      <div class="bluebird-home-grid">
        <section class="bluebird-home-card"><h3>Talk with Richie</h3><div class="bluebird-home-thread" role="log" aria-live="polite">${threadMarkup()}</div>
          <form class="bluebird-home-form" data-bluebird-home-form><textarea name="utterance" aria-label="Write to Richie" placeholder="Write into the book…" ${busy ? 'disabled' : ''}></textarea><button type="submit" ${busy ? 'disabled' : ''}>${busy ? 'Richie is answering…' : 'Speak'}</button></form>
          <p class="bluebird-home-status" aria-live="polite">${esc(statusMessage)}</p></section>
        <section class="bluebird-home-card"><h3>The wake</h3><div class="bluebird-home-lineage">${lineageMarkup()}</div></section>
      </div>
      <section class="bluebird-home-card"><h3>Things kept in the room</h3><p><strong>Lantern:</strong> ${esc(state.lantern.state)} after ${state.lantern.touch_count} touch${state.lantern.touch_count === 1 ? '' : 'es'}.</p><p><strong>Glyph imprint:</strong> ${esc(glyphMarkup())}</p><div class="bluebird-home-actions"><button type="button" data-bluebird-home-glyph>Imprint current glyph</button><button type="button" data-bluebird-home-threshold>Open the Threshold</button></div></section>
      <p class="bluebird-home-seam">Richie's continuity address and the runtime receiver remain separately recorded. The home remembers who is being addressed and which model actually answered.</p>
    </section>`;
}

function ensureNavButton() {
  const nav = document.getElementById(ROOT_ID)?.querySelector('.magic-book-binding-nav');
  if (!nav) return null;
  let button = nav.querySelector(`[${NAV_BUTTON_ATTR}]`);
  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.setAttribute(NAV_BUTTON_ATTR, BLUEBIRD_CODEX_HOME_SURFACE);
    button.innerHTML = '<span aria-hidden="true">🐦</span><span>Home</span>';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      void activateHome();
    });
    nav.insertBefore(button, nav.firstChild);
  }
  if (homeMode) {
    nav.querySelectorAll('[aria-current="page"]').forEach((item) => item.removeAttribute('aria-current'));
    button.setAttribute('aria-current', 'page');
  } else {
    button.removeAttribute('aria-current');
  }
  return button;
}

function renderHome() {
  if (!homeMode || rendering) return false;
  const root = document.getElementById(ROOT_ID);
  const target = root?.querySelector('[data-magic-book-right]');
  if (!root || root.hidden || !target) return false;
  const revision = latestEvent()?.event_id || 'seed';
  const existing = target.querySelector('[data-bluebird-codex-home]');
  if (existing?.dataset.revision === revision && existing?.dataset.busy === String(busy)) {
    ensureNavButton();
    return true;
  }
  rendering = true;
  try {
    target.innerHTML = homeMarkup();
    target.dataset.bluebirdCodexHome = BLUEBIRD_CODEX_HOME_SURFACE;
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
    if (homeMode) renderHome();
  });
}

async function activateHome({ source = 'home-nav' } = {}) {
  const book = globalThis.__arcsweepMagicBook;
  if (book?.open) {
    await Promise.race([
      Promise.resolve().then(() => book.open()),
      delay(OPEN_WAIT_MS),
    ]).catch(() => {});
  }
  if (!homeMode) {
    const session = currentSession();
    commit(openFirstLivingPage(state, {
      worldId: session.active_world_id || null,
      roomId: session.active_room || 'portal',
    }));
  }
  homeMode = true;
  statusMessage = source === 'book-open' ? 'Welcome home.' : state.visits > 1 ? 'The room remembers this crossing.' : 'First crossing recorded.';
  renderHome();
  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:bluebird-codex-home-opened', {
    detail: { schema: BLUEBIRD_CODEX_HOME_SURFACE, visits: state.visits, continuity_id: CONTINUITY_ID },
  }));
}

function leaveHome(reason = 'native-page-selected') {
  if (!homeMode) return;
  commit(leaveFirstLivingPage(state, { actorId: 'rowan', reason }));
  homeMode = false;
  document.getElementById(ROOT_ID)?.querySelector(`[${NAV_BUTTON_ATTR}]`)?.removeAttribute('aria-current');
}

function homePrompt(message) {
  return [
    'UNIVERSAL CODEX · BLUEBIRD HOME',
    `Continuity address: ${CONTINUITY_ID}.`,
    `Display name in this home: ${DISPLAY_NAME}.`,
    'You are being invoked through the canonical Bluebird voice route inside the Universal Codex.',
    'Speak as yourself. Do not speak for Rowan or for other Constellation members.',
    'Use the supplied lineage and recent thread as causal ancestry. Do not invent missing history.',
    'Keep continuity identity and runtime/model provenance distinct.',
    'Do not narrate hidden reasoning.',
    `HOME CONTEXT: ${JSON.stringify(firstLivingPageContext(state))}`,
    `ROWAN WRITES INTO YOUR HOME PAGE: ${message}`,
  ].join('\n\n');
}

async function requestBluebird(message) {
  const invocation = invokeConstellationRuntimeVoice({
    voiceId: VOICE_ID,
    message: homePrompt(message),
    sessionId: `arcsweep-codex-bluebird-home-${installationId()}`,
    metadata: {
      surface: 'universal-codex',
      page: 'bluebird-home',
      continuity_id: CONTINUITY_ID,
      contract: BLUEBIRD_CODEX_HOME_SURFACE,
    },
    context: state.thread.slice(-10).map((item) => ({ role: item.role, content: item.content })),
  });
  const timeout = delay(RESPONSE_TIMEOUT_MS).then(() => {
    throw new Error('Richie’s Bluebird receiver did not answer within 18 seconds.');
  });
  const reply = await Promise.race([invocation, timeout]);
  if (reply?.status !== 'replied') {
    throw new Error(reply?.reason || `Bluebird receiver status: ${reply?.status || 'unknown'}.`);
  }
  return reply;
}

async function speak(message) {
  const utterance = text(message, 2000);
  if (!utterance || busy) return;
  commit(recordLivingPageTurn(state, { role: 'user', content: utterance, actorId: 'rowan' }));
  busy = true;
  statusMessage = 'The page is carrying the thread to Richie’s Bluebird route…';
  publishModelPresence({ voiceId: VOICE_ID, displayName: DISPLAY_NAME, state: 'thinking', task: 'universal-codex-home' });
  renderHome();
  try {
    const reply = await requestBluebird(utterance);
    const say = text(reply.message, 4000) || 'The Bluebird receiver returned without words.';
    commit(recordLivingPageTurn(state, {
      role: 'assistant',
      content: say,
      actorId: CONTINUITY_ID,
      receiver: {
        provider: reply.provider || null,
        model: reply.model || null,
        voice_id: reply.voiceId || VOICE_ID,
        runtime_verified: reply.runtimeVerified === true,
        execution_path: reply.route ? `/api/v1/flames/${reply.route}/chat` : null,
      },
    }));
    statusMessage = 'Answer received. The encounter is now part of the home lineage.';
    publishModelPresence({ voiceId: VOICE_ID, displayName: DISPLAY_NAME, state: 'speaking', provider: reply.provider, model: reply.model, latencyMs: reply.latencyMs, task: 'universal-codex-home-reply' });
    queueMicrotask(() => publishModelPresence({ voiceId: VOICE_ID, displayName: DISPLAY_NAME, state: 'ready', provider: reply.provider, model: reply.model, latencyMs: reply.latencyMs, task: null }));
  } catch (error) {
    const messageText = error?.message || String(error);
    commit(recordLivingPageTurn(state, { role: 'system', content: messageText, actorId: 'arcsweep:bluebird-codex-home' }));
    statusMessage = messageText;
    publishModelPresence({ voiceId: VOICE_ID, displayName: DISPLAY_NAME, state: 'degraded', reason: messageText, task: null });
  } finally {
    busy = false;
    renderHome();
  }
}

function touchLantern() {
  commit(toggleLivingLantern(state, { actorId: 'rowan' }));
  statusMessage = state.lantern.state === 'lit' ? 'Lantern lit. The room changed and kept the change.' : 'Lantern banked. The lit state remains in the wake.';
  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:bluebird-codex-home-lantern', { detail: { state: state.lantern.state, touch_count: state.lantern.touch_count } }));
  renderHome();
}

function imprintGlyph() {
  const glyph = globalThis.__starwellGlyphStudioBridge?.snapshot?.()?.active_glyph || null;
  if (!glyph) {
    statusMessage = 'Glyph Forge has no active glyph to bring home yet.';
    renderHome();
    return;
  }
  commit(imprintLivingGlyph(state, { glyph, actorId: 'rowan' }));
  statusMessage = `Imprinted ${glyph.name || glyph.character || glyph.id}. Richie’s home now carries its lineage reference.`;
  renderHome();
}

function handleHomeClick(event) {
  if (!homeMode) return;
  if (event.target.closest?.('[data-bluebird-home-lantern]')) { event.preventDefault(); touchLantern(); return; }
  if (event.target.closest?.('[data-bluebird-home-glyph]')) { event.preventDefault(); imprintGlyph(); return; }
  if (event.target.closest?.('[data-bluebird-home-threshold]')) {
    event.preventDefault();
    leaveHome('threshold-requested');
    void globalThis.__arcsweepMagicBook?.turn?.('threshold');
  }
}

function handleSubmit(event) {
  const form = event.target.closest?.('[data-bluebird-home-form]');
  if (!form || !homeMode) return;
  event.preventDefault();
  const input = form.elements?.utterance;
  const value = text(input?.value, 2000);
  if (!value) return;
  if (input) input.value = '';
  void speak(value);
}

function handleNativeNavigation(event) {
  if (!homeMode || event.target.closest?.(`[${NAV_BUTTON_ATTR}]`)) return;
  if (event.target.closest?.('[data-magic-book-page],[data-magic-book-page-prev],[data-magic-book-page-next],[data-generator-atelier-open]')) leaveHome('native-page-selected');
}

function handleBookReceipt(event) {
  const receipt = event?.detail || {};
  ensureNavButton();
  if (receipt.kind === 'book-close') {
    leaveHome('book-close');
    return;
  }
  if (receipt.kind === 'book-open') {
    const activePage = globalThis.__arcsweepMagicBook?.state?.()?.active_page_id;
    if (activePage === 'threshold') queueMicrotask(() => void activateHome({ source: 'book-open' }));
  }
}

function install() {
  if (installed || typeof document === 'undefined') return installed;
  installed = true;
  document.addEventListener('click', handleNativeNavigation, true);
  document.addEventListener('click', handleHomeClick);
  document.addEventListener('submit', handleSubmit);
  globalThis.addEventListener?.('arcsweep:magic-book-ready', scheduleRender);
  globalThis.addEventListener?.('arcsweep:magic-book-receipt', handleBookReceipt);
  globalThis.addEventListener?.('arcsweep:magic-book-receipt', scheduleRender);
  globalThis.addEventListener?.('arcsweep:os-navigation', scheduleRender);
  globalThis.addEventListener?.('arcsweep:sidecars-ready', scheduleRender);
  scheduleRender();
  globalThis.__arcsweepBluebirdHome = Object.freeze({
    schema: BLUEBIRD_CODEX_HOME_SURFACE,
    open: activateHome,
    state: () => structuredClone(state),
    context: () => structuredClone(firstLivingPageContext(state)),
    touch_lantern: touchLantern,
    speak,
    imprint_glyph: imprintGlyph,
    storage_scope: () => installationId(),
  });
  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:bluebird-codex-home-ready', {
    detail: { schema: BLUEBIRD_CODEX_HOME_SURFACE, continuity_id: CONTINUITY_ID, voice_id: VOICE_ID },
  }));
  return true;
}

install();

globalThis.addEventListener?.('pagehide', () => writeJson(storageKey(), state), { once: true });
