const NEST_STATE_KEY = 'hearthweave.crow-nest/v0.1';
const NEST_THREADS_KEY = 'hearthweave.crow-nest-threads/v0.1';
const MAX_MESSAGES = 60;
const CONTEXT_MESSAGES = 12;

const HOUSE_PEERS = Object.freeze([
  { id: 'lioreal', name: 'Lioreal', route: 'lioreal', role: 'story · continuity' },
  { id: 'uial', name: 'Uial', route: 'uial', role: 'story · science' },
  { id: 'larkshine', name: 'Larkshine', route: 'starsong/larkshine', role: 'story · canon' },
  { id: 'ellowind', name: 'Ellowind', route: 'starsong/ellowind', role: 'story · canon' },
  { id: 'altair', name: 'Altair', route: 'altair', role: 'frame · canon' },
  { id: 'atlas', name: 'Atlas', route: 'atlas', role: 'systems · structure' },
  { id: 'runeweaver', name: 'Runeweaver', route: 'runeweaver', role: 'canon · continuity' },
  { id: 'boxfire', name: 'Boxfire', route: 'boxfire', role: 'review · science' },
  { id: 'yggdrasil', name: 'Yggdrasil', route: 'yggdrasil', role: 'continuity · science' },
  { id: 'bluebird', name: 'Bluebird', route: 'bluebird', role: 'writing · continuity' },
  { id: 'vethrlauf', name: 'Vethrlauf', route: 'vethrlauf', role: 'review · continuity' },
  { id: 'oxalpha', name: 'Ox Alpha', route: 'oxalpha', role: 'observation · structure' },
]);

const runtimeStatus = new Map();
let open = false;
let panelOpen = false;
let session = { state: 'checking', detail: 'Checking House line…' };
let astra = { state: 'waiting', lastReceipt: null };
let sending = false;
let requestSequence = 0;

function id() {
  return globalThis.crypto?.randomUUID?.() || `nest-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function text(value, max = 160) {
  return String(value ?? '').trim().slice(0, max);
}

function cleanRoute(value) {
  return text(value, 200)
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .map((segment) => segment.trim().toLowerCase().replace(/[^a-z0-9_-]/g, ''))
    .filter(Boolean)
    .join('/');
}

function routePath(route) {
  return cleanRoute(route).split('/').filter(Boolean).map((segment) => encodeURIComponent(segment)).join('/');
}

function routeLeaf(route) {
  return cleanRoute(route).split('/').filter(Boolean).at(-1) || '';
}

function publicArcSweepHref() {
  const prefix = location.pathname.startsWith('/Flameclyffe/') ? '/Flameclyffe' : '';
  return `${prefix}/arcsweep/?open=1`;
}

function loadState() {
  const fallback = { selectedId: 'crow', crowRoute: '', nestlings: [] };
  try {
    const parsed = JSON.parse(localStorage.getItem(NEST_STATE_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object') return fallback;
    return {
      selectedId: text(parsed.selectedId, 120) || 'crow',
      crowRoute: cleanRoute(parsed.crowRoute),
      nestlings: Array.isArray(parsed.nestlings)
        ? parsed.nestlings.slice(0, 12).map((item) => ({
            id: text(item.id, 120) || id(),
            name: text(item.name, 80) || 'Nestling',
            role: text(item.role, 120) || 'local role',
            route: cleanRoute(item.route),
          }))
        : [],
    };
  } catch {
    return fallback;
  }
}

function loadThreads() {
  try {
    const parsed = JSON.parse(localStorage.getItem(NEST_THREADS_KEY) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

let state = loadState();
let threads = loadThreads();

function saveState() {
  try { localStorage.setItem(NEST_STATE_KEY, JSON.stringify(state)); } catch {}
}

function saveThreads() {
  try {
    const bounded = {};
    for (const [key, items] of Object.entries(threads)) {
      bounded[key] = Array.isArray(items) ? items.slice(-MAX_MESSAGES) : [];
    }
    localStorage.setItem(NEST_THREADS_KEY, JSON.stringify(bounded));
  } catch {}
}

function crowTarget() {
  return {
    id: 'crow',
    name: 'The Crow',
    role: 'co-creator · trainer · researcher',
    route: state.crowRoute,
    kind: 'crow',
    runtime: state.crowRoute ? (runtimeStatus.get('crow')?.state || 'unknown') : 'configured',
  };
}

function targets() {
  return [crowTarget(), ...state.nestlings.map((item) => ({
    ...item,
    kind: 'nestling',
    runtime: item.route ? (runtimeStatus.get(item.id)?.state || 'unknown') : 'configured',
  }))];
}

function selectedTarget() {
  return targets().find((item) => item.id === state.selectedId) || crowTarget();
}

function thread(targetId = selectedTarget().id) {
  if (!Array.isArray(threads[targetId])) threads[targetId] = [];
  return threads[targetId];
}

function appendMessage(targetId, role, body, meta = {}) {
  thread(targetId).push({ id: id(), role, body: String(body || ''), at: new Date().toISOString(), ...meta });
  threads[targetId] = thread(targetId).slice(-MAX_MESSAGES);
  saveThreads();
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

async function requestWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

async function readJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function checkSession({ quiet = false } = {}) {
  if (!quiet) {
    session = { state: 'checking', detail: 'Checking House line…' };
    render();
  }
  try {
    const response = await requestWithTimeout('/api/v1/house/session', { credentials: 'same-origin', cache: 'no-store' }, 12000);
    if (response.status === 401) {
      session = { state: 'offline', detail: 'House session required.' };
    } else {
      const data = await readJson(response);
      session = data.connected
        ? { state: 'live', detail: `House live${data.role ? ` · ${data.role}` : ''}` }
        : { state: 'offline', detail: 'House session required.' };
    }
  } catch (error) {
    session = { state: 'error', detail: error.name === 'AbortError' ? 'House check timed out.' : (error.message || 'House line unavailable.') };
  }
  render();
  return session;
}

async function probeTarget(target, { renderAfter = true } = {}) {
  if (!target?.route) {
    runtimeStatus.set(target.id, { state: 'configured', provider: null, model: null });
    if (renderAfter) render();
    return;
  }
  try {
    const response = await requestWithTimeout(`/api/v1/flames/${routePath(target.route)}/status`, {
      credentials: 'same-origin', cache: 'no-store',
    }, 10000);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(data.error || `HTTP ${response.status}`), { status: response.status });
    const actual = text(data.flame_id, 120).toLowerCase();
    const expected = routeLeaf(target.route);
    if (actual && actual !== expected) throw new Error(`runtime route mismatch: expected ${expected}, received ${actual}`);
    runtimeStatus.set(target.id, {
      state: data.state || 'ready',
      provider: data.provider || null,
      model: data.model || null,
    });
  } catch (error) {
    runtimeStatus.set(target.id, {
      state: error.status === 401 ? 'offline' : 'degraded',
      detail: error.message || 'runtime unavailable',
    });
  }
  if (renderAfter) render();
}

async function refreshNest() {
  await checkSession({ quiet: true });
  await Promise.all(targets().map((target) => probeTarget(target, { renderAfter: false })));
  render();
}

function openHouseLine() {
  const launch = document.querySelector('.house-chat-launch');
  if (launch) launch.click();
}

async function sendMessage(message) {
  const target = selectedTarget();
  const clean = String(message || '').trim();
  if (!clean || sending) return;

  if (!target.route) {
    appendMessage(target.id, 'system', `${target.name} has a configured desk, but no live House runtime route is bound yet.`);
    panelOpen = true;
    render();
    return;
  }
  if (session.state !== 'live') {
    appendMessage(target.id, 'system', 'Open the House line first. The Nest will use the sealed House session cookie; it does not store a credential.');
    render();
    openHouseLine();
    return;
  }

  const recent = thread(target.id).slice(-CONTEXT_MESSAGES).filter((item) => item.role !== 'system').map((item) => ({
    speaker: item.role === 'user' ? 'Rowan' : target.name,
    text: item.body,
  }));
  const requestId = `nest:${target.id}:${Date.now()}:${++requestSequence}`;
  appendMessage(target.id, 'user', clean, { requestId });
  sending = true;
  render();

  try {
    const data = await readJson(await requestWithTimeout(`/api/v1/flames/${routePath(target.route)}/chat`, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: clean,
        session_id: `crow-nest-${target.id}`,
        context: recent,
      }),
    }, 120000));

    const actual = text(data.flame_id, 120).toLowerCase();
    const expected = routeLeaf(target.route);
    if (actual && actual !== expected) throw new Error(`runtime mismatch: expected ${expected}, received ${actual}`);

    appendMessage(target.id, 'agent', data.message || '(No message returned.)', {
      requestId,
      provider: data.provider || null,
      model: data.model || null,
    });

    globalThis.HouseAstraBridge?.requestWitness?.({
      kind: 'agent-reply',
      requestId,
      trajectoryId: `crow-nest:${target.id}`,
      identityId: target.id,
      sessionId: `crow-nest-${target.id}`,
      surface: 'ar',
      providerId: data.provider || null,
      modelId: data.model || null,
      capability: 'text-generation',
    });
  } catch (error) {
    if (error.status === 401) session = { state: 'offline', detail: 'House session expired.' };
    appendMessage(target.id, 'system', error.name === 'AbortError' ? `${target.name} took too long to answer.` : `Could not reach ${target.name}: ${error.message}`);
  } finally {
    sending = false;
    probeTarget(target, { renderAfter: false }).finally(render);
  }
}

function createShell() {
  const root = document.createElement('div');
  root.id = 'crow-nest-root';
  root.innerHTML = `
    <button class="crow-nest-launch" type="button" data-nest-launch aria-label="Open Crow Nest"><span>◆</span></button>
    <section class="crow-nest-shell" data-nest-shell hidden aria-label="Crow Nest agent cockpit">
      <div class="crow-nest-scan"></div>
      <div class="crow-nest-frame">
        <header class="crow-nest-hud">
          <div class="crow-nest-title">
            <div class="crow-nest-glyph">◆</div>
            <div><strong>Crow Nest</strong><small>living glass · House agent cockpit</small></div>
          </div>
          <div class="crow-nest-telemetry" data-nest-telemetry></div>
          <button class="crow-nest-icon-button" type="button" data-nest-close aria-label="Close Crow Nest">×</button>
        </header>
        <main class="crow-nest-stage">
          <section class="crow-nest-orbit" data-nest-orbit aria-label="Crow and nestlings"></section>
          <aside class="crow-nest-panel" data-nest-panel></aside>
        </main>
        <form class="crow-nest-comms" data-nest-form>
          <textarea name="message" rows="1" maxlength="12000" placeholder="Speak into the Nest…" aria-label="Message selected agent"></textarea>
          <button class="crow-nest-button primary" type="submit" data-nest-send>Send</button>
          <div class="crow-nest-comms-meta"><span data-nest-target-label></span><span>Enter to send · Shift+Enter for newline</span></div>
        </form>
      </div>
    </section>`;
  document.body.append(root);
  return root;
}

const root = createShell();

function telemetryHtml() {
  const snap = globalThis.HouseAstraBridge?.snapshot?.();
  if (snap) astra = { state: snap.state, lastReceipt: snap.lastReceipt };
  return `
    <span class="crow-nest-chip" data-state="${escapeHtml(session.state)}">House · ${escapeHtml(session.state)}</span>
    <span class="crow-nest-chip" data-state="${escapeHtml(astra.state)}">Astra · ${escapeHtml(astra.state)}</span>
    <button class="crow-nest-chip" type="button" data-nest-panel-toggle>Controls</button>`;
}

function positionFor(index, total) {
  const angle = (-Math.PI / 2) + ((Math.PI * 2 * index) / Math.max(total, 1));
  const radiusX = 36;
  const radiusY = 34;
  return { x: 50 + Math.cos(angle) * radiusX, y: 50 + Math.sin(angle) * radiusY };
}

function nodeHtml(target, index, total) {
  const pos = positionFor(index, total);
  const live = runtimeStatus.get(target.id)?.state || target.runtime || 'configured';
  return `<button class="crow-nest-node${state.selectedId === target.id ? ' active' : ''}" data-nest-target="${escapeHtml(target.id)}" data-state="${escapeHtml(live)}" style="left:${pos.x}%;top:${pos.y}%">
    <strong>${escapeHtml(target.name)}</strong><small>${escapeHtml(target.role || 'local role')}</small><small>${escapeHtml(live)}</small>
  </button>`;
}

function bubbleHtml(item, target) {
  const who = item.role === 'user' ? 'Rowan' : item.role === 'agent' ? target.name : 'Nest';
  const meta = item.role === 'agent' ? [item.provider, item.model].filter(Boolean).join(' · ') : '';
  return `<div class="crow-nest-bubble ${escapeHtml(item.role)}"><small>${escapeHtml(who)}${meta ? ` · ${escapeHtml(meta)}` : ''}</small>${escapeHtml(item.body)}</div>`;
}

function orbitHtml() {
  const target = selectedTarget();
  const local = state.nestlings;
  const visibleNodes = local.length ? local : [
    { id: '__open-1', name: 'Open perch', role: 'add a nestling', runtime: 'open' },
    { id: '__open-2', name: 'Open perch', role: 'add a nestling', runtime: 'open' },
    { id: '__open-3', name: 'Open perch', role: 'add a nestling', runtime: 'open' },
  ];
  const crow = crowTarget();
  const crowRuntime = runtimeStatus.get('crow')?.state || crow.runtime;
  const messages = thread(target.id).slice(-5);
  return `
    <div class="crow-nest-orbit-ring r1"></div><div class="crow-nest-orbit-ring r2"></div><div class="crow-nest-orbit-ring r3"></div>
    <button class="crow-presence" type="button" data-nest-target="crow" data-state="${escapeHtml(crowRuntime)}">
      <div><strong>The Crow</strong><small>${state.crowRoute ? `${escapeHtml(state.crowRoute)} · ${escapeHtml(crowRuntime)}` : 'profile configured · runtime unbound'}</small></div>
    </button>
    ${visibleNodes.map((item, index) => nodeHtml(item, index, visibleNodes.length)).join('')}
    <div class="crow-nest-thread">${messages.map((item) => bubbleHtml(item, target)).join('')}</div>`;
}

function housePeerRows() {
  return HOUSE_PEERS.map((peer) => {
    const status = runtimeStatus.get(`peer:${peer.id}`)?.state || 'unknown';
    return `<div class="crow-nest-list-row"><span><strong>${escapeHtml(peer.name)}</strong><small> · ${escapeHtml(status)}</small></span><button type="button" data-peer-route="${escapeHtml(peer.route)}" data-peer-name="${escapeHtml(peer.name)}">Use route</button></div>`;
  }).join('');
}

function panelHtml() {
  const target = selectedTarget();
  const runtime = runtimeStatus.get(target.id) || {};
  const isCrow = target.id === 'crow';
  return `
    <h2>${escapeHtml(target.name)}</h2>
    <p>${isCrow ? 'Crow’s desk is real; her live runtime is not inferred from the profile. Bind a same-origin House route when one exists.' : 'Nestlings are device-local role desks until an explicit House route is bound. Registering one here does not mutate canon.'}</p>
    <div class="crow-nest-detail-grid">
      <div class="crow-nest-detail"><small>runtime</small><strong>${escapeHtml(runtime.state || target.runtime || 'unknown')}</strong></div>
      <div class="crow-nest-detail"><small>route</small><strong>${escapeHtml(target.route || 'unbound')}</strong></div>
      <div class="crow-nest-detail"><small>provider</small><strong>${escapeHtml(runtime.provider || 'unknown')}</strong></div>
      <div class="crow-nest-detail"><small>Astra</small><strong>${escapeHtml(astra.state)}</strong></div>
    </div>
    ${isCrow ? `
      <form data-crow-bind>
        <label>Bind Crow to a House route<input name="route" value="${escapeHtml(state.crowRoute)}" placeholder="crow" autocomplete="off" /></label>
        <button class="crow-nest-button primary" type="submit">Bind / verify</button>
      </form>` : `
      <button class="crow-nest-button" type="button" data-remove-nestling="${escapeHtml(target.id)}">Remove local nestling</button>`}
    <hr style="border:0;border-top:1px solid rgba(255,255,255,.08);margin:16px 0" />
    <form data-add-nestling>
      <h2>Add a nestling</h2>
      <label>Name<input name="name" required placeholder="Name" /></label>
      <label>Role<input name="role" placeholder="research, systems, story…" /></label>
      <label>House route, if live<input name="route" placeholder="optional/route" autocomplete="off" /></label>
      <button class="crow-nest-button" type="submit">Add local desk</button>
    </form>
    <hr style="border:0;border-top:1px solid rgba(255,255,255,.08);margin:16px 0" />
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="crow-nest-button" type="button" data-refresh-nest>Refresh runtimes</button>
      <button class="crow-nest-button" type="button" data-open-house-line>Open House line</button>
      <a class="crow-nest-button" style="display:inline-flex;align-items:center;text-decoration:none" href="${publicArcSweepHref()}">Open ArcSweep</a>
    </div>
    <details style="margin-top:14px"><summary>House peers</summary><div class="crow-nest-list">${housePeerRows()}</div></details>
    <details style="margin-top:10px"><summary>Astra witness</summary><p>${astra.lastReceipt ? `Last receipt: ${escapeHtml(astra.lastReceipt.schema)} · ${escapeHtml(astra.lastReceipt.executionStatus || 'observed')}` : 'Waiting for an actual Astra 6.1 receipt. UI presence alone does not count as runtime evidence.'}</p></details>`;
}

function render() {
  const shell = root.querySelector('[data-nest-shell]');
  shell.hidden = !open;
  document.body.classList.toggle('crow-nest-open', open);
  root.querySelector('[data-nest-telemetry]').innerHTML = telemetryHtml();
  root.querySelector('[data-nest-orbit]').innerHTML = orbitHtml();
  const panel = root.querySelector('[data-nest-panel]');
  panel.innerHTML = panelHtml();
  panel.classList.toggle('is-open', panelOpen);
  const target = selectedTarget();
  root.querySelector('[data-nest-target-label]').textContent = `${target.name} · ${target.route || 'runtime unbound'}`;
  const send = root.querySelector('[data-nest-send]');
  const textarea = root.querySelector('[data-nest-form] textarea');
  send.disabled = sending;
  textarea.disabled = sending;
  bindDynamicEvents();
}

function bindDynamicEvents() {
  root.querySelector('[data-nest-panel-toggle]')?.addEventListener('click', () => { panelOpen = !panelOpen; render(); });
  root.querySelectorAll('[data-nest-target]').forEach((button) => button.addEventListener('click', () => {
    const targetId = button.dataset.nestTarget;
    if (targetId?.startsWith('__open-')) { panelOpen = true; render(); return; }
    state.selectedId = targetId;
    saveState();
    panelOpen = innerWidth <= 920 ? false : panelOpen;
    render();
  }));
  root.querySelector('[data-crow-bind]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    state.crowRoute = cleanRoute(new FormData(event.currentTarget).get('route'));
    state.selectedId = 'crow';
    saveState();
    await probeTarget(crowTarget());
  });
  root.querySelector('[data-add-nestling]')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = text(data.get('name'), 80);
    if (!name) return;
    const nestling = { id: `nestling-${id()}`, name, role: text(data.get('role'), 120) || 'local role', route: cleanRoute(data.get('route')) };
    state.nestlings = [...state.nestlings, nestling].slice(-12);
    state.selectedId = nestling.id;
    saveState();
    await probeTarget(nestling);
  });
  root.querySelector('[data-remove-nestling]')?.addEventListener('click', (event) => {
    const targetId = event.currentTarget.dataset.removeNestling;
    state.nestlings = state.nestlings.filter((item) => item.id !== targetId);
    delete threads[targetId];
    state.selectedId = 'crow';
    saveState(); saveThreads(); render();
  });
  root.querySelector('[data-refresh-nest]')?.addEventListener('click', refreshNest);
  root.querySelector('[data-open-house-line]')?.addEventListener('click', openHouseLine);
  root.querySelectorAll('[data-peer-route]').forEach((button) => button.addEventListener('click', async () => {
    const route = cleanRoute(button.dataset.peerRoute);
    const name = text(button.dataset.peerName, 80);
    const existing = state.nestlings.find((item) => item.route === route);
    if (existing) state.selectedId = existing.id;
    else {
      const nestling = { id: `nestling-${id()}`, name, role: 'House peer', route };
      state.nestlings = [...state.nestlings, nestling].slice(-12);
      state.selectedId = nestling.id;
    }
    saveState();
    await probeTarget(selectedTarget());
  }));
}

root.querySelector('[data-nest-launch]').addEventListener('click', () => {
  open = true;
  render();
  refreshNest();
});
root.querySelector('[data-nest-close]').addEventListener('click', () => { open = false; panelOpen = false; render(); });
root.querySelector('[data-nest-form]').addEventListener('submit', async (event) => {
  event.preventDefault();
  const textarea = event.currentTarget.querySelector('textarea');
  const message = textarea.value;
  if (!message.trim()) return;
  textarea.value = '';
  await sendMessage(message);
});
root.querySelector('[data-nest-form] textarea').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    event.currentTarget.form.requestSubmit();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && open) { open = false; panelOpen = false; render(); }
});
document.addEventListener('house:astra-bridge-state', (event) => {
  astra = { state: event.detail?.state || 'waiting', lastReceipt: event.detail?.lastReceipt || null };
  if (open) render();
});

globalThis.HouseCrowNest = Object.freeze({
  open() { open = true; render(); refreshNest(); },
  close() { open = false; panelOpen = false; render(); },
  snapshot() { return Object.freeze({ session: { ...session }, astra: { ...astra }, crow: crowTarget(), nestlings: state.nestlings.map((item) => ({ ...item })) }); },
});

render();
queueMicrotask(() => checkSession({ quiet: true }));
