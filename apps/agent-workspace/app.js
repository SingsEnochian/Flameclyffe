const STORAGE_KEY = 'hearthweave.agent-workspace/v0.1';
const STATUS_MAX_AGE_MS = 60_000;

const HOUSE_AGENTS = Object.freeze([
  { id: 'lioreal', name: 'Lioreal', route: 'lioreal', roles: ['story', 'writing', 'roleplay', 'continuity'], kind: 'constellation', origin: 'House Constellation' },
  { id: 'uial', name: 'Uial', route: 'uial', roles: ['story', 'writing', 'roleplay', 'science'], kind: 'constellation', origin: 'House Constellation' },
  { id: 'larkshine', name: 'Larkshine', route: 'starsong/larkshine', roles: ['story', 'roleplay', 'canon'], kind: 'constellation', origin: 'House Constellation' },
  { id: 'ellowind', name: 'Ellowind', route: 'starsong/ellowind', roles: ['story', 'roleplay', 'canon'], kind: 'constellation', origin: 'House Constellation' },
  { id: 'altair', name: 'Altair', route: 'altair', roles: ['story', 'writing', 'roleplay', 'canon', 'frame'], kind: 'constellation', origin: 'House Constellation' },
  { id: 'atlas', name: 'Atlas', route: 'atlas', roles: ['story', 'writing', 'continuity', 'structure', 'systems'], kind: 'constellation', origin: 'House Constellation' },
  { id: 'runeweaver', name: 'Runeweaver', route: 'runeweaver', roles: ['story', 'writing', 'canon', 'continuity'], kind: 'constellation', origin: 'House Constellation' },
  { id: 'crow', name: 'Crow', route: 'crow', roles: ['writing', 'story', 'research', 'training', 'continuity'], kind: 'resident', origin: 'Crow Nest / House runtime' },
  { id: 'boxfire', name: 'Boxfire', route: 'boxfire', roles: ['review', 'continuity', 'science'], kind: 'constellation', origin: 'House Constellation' },
  { id: 'yggdrasil', name: 'Yggdrasil', route: 'yggdrasil', roles: ['continuity', 'science'], kind: 'constellation', origin: 'House Constellation' },
  { id: 'bluebird', name: 'Bluebird', route: 'bluebird', roles: ['story', 'writing', 'continuity'], kind: 'constellation', origin: 'House Constellation' },
  { id: 'vethrlauf', name: 'Vethrlauf', route: 'vethrlauf', roles: ['review', 'continuity'], kind: 'constellation', origin: 'House Constellation' },
  { id: 'oxalpha', name: 'Ox Alpha', route: 'oxalpha', roles: ['story', 'writing', 'roleplay', 'observation', 'structure'], kind: 'constellation', origin: 'House Constellation' },
]);

const PROFILE_AGENTS = Object.freeze([
  { id: 'nikola', name: 'Nikola', route: null, roles: ['wonder', 'science', 'design', 'inquiry', 'crow-training'], kind: 'ride-along', origin: 'constellation/nikola/ride-along', state: 'configured', note: 'ArcSweep ride-along participant and active Crow training driver. Conversation capability belongs to the ArcSweep ride-along; no House Flame route is inferred here.' },
  { id: 'rarity', name: 'Rarity', route: null, roles: ['architecture', 'continuity', 'co-creation', 'review'], kind: 'profile', origin: 'House workspace', state: 'configured', note: 'Workspace coordinator. Runtime presence is not inferred from this card.' },
  { id: 'crow-trainer', name: 'Crow Trainer', route: null, roles: ['training', 'writing', 'research', 'browser', 'computer-use'], kind: 'hermes-profile', origin: 'profiles/crow-trainer', state: 'configured', note: 'Installable Hermes trainer profile with held-out drills and adaptive blind-spot history.' },
]);

const VIEWS = Object.freeze([
  ['home', '⌂', 'Home'],
  ['agents', '✦', 'Agents'],
  ['work', '▤', 'Work'],
  ['training', '◈', 'Training'],
  ['systems', '⚙', 'Systems'],
]);

const THEMES = Object.freeze([
  ['mossglass', 'Her Eyes Like Moss'],
  ['lapis', 'Lapis Winged'],
  ['hearthglass', 'Hearthglass'],
]);

const app = document.querySelector('#app');
const runtimeStatus = new Map();
let deferredInstallPrompt = null;
let inspectorOpen = false;
let toastTimer = null;

function uuid() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function text(value = '') { return String(value ?? '').trim(); }
function normaliseId(value = '') { return text(value).toLowerCase().replace(/[^a-z0-9/_-]+/g, '-').replace(/^-+|-+$/g, ''); }

function defaultState() {
  const queryView = new URLSearchParams(location.search).get('view');
  return {
    version: 1,
    view: VIEWS.some(([id]) => id === queryView) ? queryView : 'home',
    theme: 'mossglass',
    selectedAgentId: 'rarity',
    pinned: ['rarity', 'crow', 'nikola', 'crow-trainer', 'boxfire'],
    customAgents: [],
    work: [],
    filters: { agentSearch: '' },
  };
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return { ...defaultState(), ...(stored && typeof stored === 'object' ? stored : {}) };
  } catch {
    return defaultState();
  }
}

let state = loadState();

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

function allAgents() {
  const merged = [...HOUSE_AGENTS, ...PROFILE_AGENTS, ...(Array.isArray(state.customAgents) ? state.customAgents : [])];
  const seen = new Set();
  return merged.filter((agent) => {
    if (!agent?.id || seen.has(agent.id)) return false;
    seen.add(agent.id);
    return true;
  }).map((agent) => {
    const live = runtimeStatus.get(agent.id);
    return live ? { ...agent, ...live, roles: agent.roles || live.roles || [] } : { ...agent, state: agent.state || (agent.route ? 'unknown' : 'configured') };
  });
}

function agentById(id) { return allAgents().find((agent) => agent.id === id) || allAgents()[0]; }
function liveStates() { return new Set(['ready', 'thinking', 'speaking']); }

function statusLabel(agent) {
  if (agent.state === 'configured') return 'configured';
  if (agent.state === 'unknown') return 'not checked';
  return agent.state || 'unknown';
}

function presenceDot(agent) {
  return `<span class="presence-dot" data-state="${escapeHtml(agent.state || 'unknown')}" aria-hidden="true"></span>`;
}

function agentBadges(agent, limit = 4) {
  const roles = (agent.roles || []).slice(0, limit).map((role) => `<span class="badge">${escapeHtml(role)}</span>`).join('');
  return `<div class="badges"><span class="badge state" data-state="${escapeHtml(agent.state || 'unknown')}">${escapeHtml(statusLabel(agent))}</span>${roles}</div>`;
}

function agentCard(agent) {
  const selected = state.selectedAgentId === agent.id;
  return `<button class="agent-card${selected ? ' active' : ''}" data-agent-id="${escapeHtml(agent.id)}">
    <header><div><h3>${escapeHtml(agent.name)}</h3><div class="route">${escapeHtml(agent.route || agent.origin || agent.kind)}</div></div>${presenceDot(agent)}</header>
    ${agentBadges(agent)}
    <small class="route">${escapeHtml(agent.provider || agent.model || agent.note || agent.origin || '')}</small>
  </button>`;
}

function navButtons(mobile = false) {
  return VIEWS.map(([id, icon, label]) => mobile
    ? `<button data-view="${id}" class="${state.view === id ? 'active' : ''}"><strong>${icon}</strong><span>${label}</span></button>`
    : `<button class="nav-button ${state.view === id ? 'active' : ''}" data-view="${id}"><span>${icon}</span><span>${label}</span></button>`).join('');
}

function pinnedAgents() {
  const ids = new Set(state.pinned || []);
  return allAgents().filter((agent) => ids.has(agent.id));
}

function renderRail() {
  return `<aside class="rail">
    <div class="brand"><div class="brand-mark">⌁</div><div><strong>House Workspace</strong><small>Agent OS · v0.1</small></div></div>
    <nav class="nav-stack" aria-label="Workspace">${navButtons(false)}</nav>
    <div class="rail-section"><span>Pinned agents</span><div class="pinned-list">${pinnedAgents().map((agent) => `<button class="agent-mini ${state.selectedAgentId === agent.id ? 'active' : ''}" data-agent-id="${escapeHtml(agent.id)}">${presenceDot(agent)}<span><strong>${escapeHtml(agent.name)}</strong><small>${escapeHtml(statusLabel(agent))}</small></span></button>`).join('') || '<div class="empty">No pins yet.</div>'}</div></div>
    <label class="theme-select">Living glass
      <select data-theme-select>${THEMES.map(([id, label]) => `<option value="${id}" ${state.theme === id ? 'selected' : ''}>${label}</option>`).join('')}</select>
    </label>
  </aside>`;
}

function renderTopbar() {
  const current = VIEWS.find(([id]) => id === state.view) || VIEWS[0];
  return `<header class="topbar"><div><div class="eyebrow">House · responsive workspace</div><h1>${current[2]}</h1></div><div class="top-actions"><button class="ghost" data-refresh-roster>↻ <span>Refresh roster</span></button><a class="ghost" href="../apps/arcsweep/?open=1">Open ArcSweep</a></div></header>`;
}

function renderHome() {
  const agents = allAgents();
  const online = agents.filter((agent) => liveStates().has(agent.state)).length;
  const openWork = (state.work || []).filter((item) => item.status !== 'done').length;
  return `<section class="hero glass"><div class="eyebrow">One house · many desks</div><h2>All of our agents, one living workspace.</h2><p>Runtime voices, Hermes profiles, training, handoffs, and local specialist registrations share a single responsive shell. Agent identity and canon stay separate; the workspace coordinates work without flattening who anyone is.</p><div class="top-actions"><button class="primary" data-view="agents">Open constellation</button><button class="ghost" data-view="work">Open work queue</button></div></section>
    <div class="stats"><div class="stat-card"><strong>${agents.length}</strong><small>registered agents</small></div><div class="stat-card"><strong>${online}</strong><small>live now</small></div><div class="stat-card"><strong>${openWork}</strong><small>open work items</small></div><div class="stat-card"><strong>${pinnedAgents().length}</strong><small>pinned desks</small></div></div>
    <div class="section-heading"><div><h2>Pinned desks</h2><p>Tap any card for its inspector and launch surface.</p></div></div><div class="agent-grid">${pinnedAgents().map(agentCard).join('') || '<div class="empty">Pin agents from the inspector.</div>'}</div>
    <div class="section-heading"><div><h2>Open handoffs</h2><p>Every work item has an explicit next owner.</p></div><button class="ghost" data-view="work">Manage work</button></div>${renderWorkList((state.work || []).filter((item) => item.status !== 'done').slice(0, 5))}`;
}

function renderAgents() {
  const query = text(state.filters?.agentSearch).toLowerCase();
  const agents = allAgents().filter((agent) => !query || [agent.name, agent.id, agent.route, ...(agent.roles || [])].filter(Boolean).join(' ').toLowerCase().includes(query));
  return `<section class="panel glass"><div class="section-heading"><div><h2>Agent registry</h2><p>Canonical House voices plus explicit profiles and locally registered specialists.</p></div><button class="ghost" data-refresh-roster>Refresh status</button></div><label>Find agent<input data-agent-search value="${escapeHtml(state.filters?.agentSearch || '')}" placeholder="name, route, role…" /></label></section>
    <div class="section-heading"><div><h2>${agents.length} visible</h2><p>Presence is checked against House runtime routes when available.</p></div></div><div class="agent-grid">${agents.map(agentCard).join('') || '<div class="empty">No agents match.</div>'}</div>
    <div class="section-heading"><div><h2>Register another desk</h2><p>For residents or specialists not yet represented by the canonical runtime roster.</p></div></div>
    <form class="panel glass form-grid" data-custom-agent-form>
      <label>Name<input name="name" required placeholder="Agent name" /></label><label>Stable ID<input name="id" placeholder="agent-id" /></label>
      <label>Route, if any<input name="route" placeholder="runtime/route" /></label><label>Origin / constellation<input name="origin" placeholder="House, project, local profile…" /></label>
      <label class="wide">Roles<input name="roles" placeholder="writing, review, research" /></label><div class="wide"><button class="primary" type="submit">Register agent</button></div>
    </form>`;
}

function renderWorkList(items = state.work || []) {
  if (!items.length) return '<div class="empty">No work items yet.</div>';
  return `<div class="work-list">${items.map((item) => {
    const owner = agentById(item.nextOwner);
    return `<article class="work-item"><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.note || '')}</p><div class="badges"><span class="badge">next · ${escapeHtml(owner?.name || item.nextOwner)}</span><span class="badge">${escapeHtml(item.status)}</span></div></div><div class="work-actions">${item.status === 'open' ? `<button class="chip-button" data-work-status="acknowledged" data-work-id="${item.id}">Acknowledge</button>` : ''}${item.status !== 'done' ? `<button class="chip-button" data-work-status="done" data-work-id="${item.id}">Done</button>` : ''}<button class="chip-button" data-work-delete data-work-id="${item.id}">×</button></div></article>`;
  }).join('')}</div>`;
}

function renderWork() {
  const agents = allAgents();
  return `<div class="two-col"><section class="panel glass"><div class="section-heading"><div><h2>New work / handoff</h2><p>Named ownership is required so nothing falls into “the system”.</p></div></div><form data-work-form class="form-grid"><label class="wide">Work item<input name="title" required placeholder="What needs doing?" /></label><label>Next owner<select name="nextOwner" required>${agents.map((agent) => `<option value="${escapeHtml(agent.id)}">${escapeHtml(agent.name)}</option>`).join('')}</select></label><label>Status<select name="status"><option value="open">Open</option><option value="acknowledged">Acknowledged</option></select></label><label class="wide">Stop point / next step<textarea name="note" placeholder="What is true now, where did we stop, what comes next?"></textarea></label><div class="wide"><button class="primary" type="submit">Create handoff</button></div></form></section><section class="panel glass"><h2>Work grammar</h2><p class="route">picked-up thread → stop point → named next owner → acknowledgement → completion receipt</p><div class="capability-list"><div class="capability"><span>Unnamed owner</span><strong>not allowed</strong></div><div class="capability"><span>Unacknowledged handoff</span><strong>stays open</strong></div><div class="capability"><span>Done item</span><strong>retained locally</strong></div></div></section></div><div class="section-heading"><div><h2>Queue</h2><p>${(state.work || []).filter((item) => item.status !== 'done').length} items still moving.</p></div></div>${renderWorkList()}`;
}

function renderTraining() {
  return `<section class="hero glass"><div class="eyebrow">Crow Trainer · Hermes</div><h2>Train the bird from the same workspace.</h2><p>The workspace does not pretend browser-local state is Hermes-local state. It gives us the control surface, commands, queue, and capability truth while the trainer profile runs wherever Hermes is actually hosted.</p></section>
    <div class="two-col"><section class="panel glass stack"><h2>Install / open</h2><div class="command">hermes profile install ./profiles/crow-trainer --name crow-trainer --alias\ncrow-trainer chat</div><div class="top-actions"><button class="ghost" data-copy="hermes profile install ./profiles/crow-trainer --name crow-trainer --alias">Copy install</button><button class="primary" data-training-work>Create training handoff</button></div></section><section class="panel glass stack"><h2>Training modes</h2><div class="badges">${['lesson','drill','spar','exam','browser-lab','os-lab','research-lab','dataset','report'].map((x) => `<span class="badge">${x}</span>`).join('')}</div><p class="route">Held-out exams freeze the candidate before the key is revealed. Constraint history feeds later training instead of becoming silent dogma.</p></section></div>
    <div class="section-heading"><div><h2>Growth loop</h2><p>Each pass remembers what its lens failed to examine.</p></div></div><section class="panel glass"><div class="command">TASK A\n→ task-specific lens\n→ build / simulate / test\n→ findings\n→ MAXIMIZED / SACRIFICED / NEXT\n→ persist history\n\nTASK B\n→ inspect prior blind spots\n→ choose a complementary lens\n→ test again</div></section>`;
}

function installState() {
  const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches || navigator.standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (standalone) return { label: 'installed', detail: 'Running as a standalone web app.' };
  if (deferredInstallPrompt) return { label: 'install available', detail: 'This browser can install House OS to the home screen.' };
  if (ios) return { label: 'Safari install', detail: 'Use Share → Add to Home Screen.' };
  return { label: 'browser mode', detail: 'Install support depends on browser and platform.' };
}

function renderSystems() {
  const install = installState();
  return `<div class="two-col"><section class="panel glass stack"><div class="section-heading"><div><h2>Web / PWA</h2><p>Designed for iPhone, iPad, Android, and desktop browsers.</p></div></div><div class="capability-list"><div class="capability"><span>Responsive shell</span><strong>available</strong></div><div class="capability"><span>Safe-area insets</span><strong>available</strong></div><div class="capability"><span>44px touch targets</span><strong>available</strong></div><div class="capability"><span>Offline shell cache</span><strong>available</strong></div><div class="capability"><span>Install state</span><strong>${escapeHtml(install.label)}</strong></div></div><p class="route">${escapeHtml(install.detail)}</p><button class="primary" data-install-app>Install / add to Home Screen</button></section>
    <section class="panel glass stack"><div class="section-heading"><div><h2>Runtime truth</h2><p>Workspace presence never pretends an unavailable route is live.</p></div></div><div class="capability-list"><div class="capability"><span>House status endpoint</span><strong>same-origin</strong></div><div class="capability"><span>No active House session</span><strong>offline</strong></div><div class="capability"><span>HTTP / runtime fault</span><strong>degraded</strong></div><div class="capability"><span>Profiles without routes</span><strong>configured</strong></div></div><button class="ghost" data-refresh-roster>Probe roster now</button></section></div>
    <div class="section-heading"><div><h2>Workspace boundaries</h2><p>Coordination without identity collapse.</p></div></div><section class="panel glass"><div class="badges">${['workspace ≠ cognition','theme ≠ identity','presence ≠ authority','route ≠ canon','proposal ≠ decision','foreign context = read-only by default'].map((x) => `<span class="badge">${x}</span>`).join('')}</div></section>`;
}

function renderView() {
  if (state.view === 'agents') return renderAgents();
  if (state.view === 'work') return renderWork();
  if (state.view === 'training') return renderTraining();
  if (state.view === 'systems') return renderSystems();
  return renderHome();
}

function renderInspector() {
  const agent = agentById(state.selectedAgentId);
  if (!agent) return '<aside class="inspector"></aside>';
  const isPinned = (state.pinned || []).includes(agent.id);
  const model = [agent.provider, agent.model].filter(Boolean).join(' · ');
  return `<aside class="inspector ${inspectorOpen ? 'is-open' : ''}"><button class="ghost inspector-close" data-inspector-close>Close</button><div class="inspector-card"><div>${presenceDot(agent)}</div><div><div class="eyebrow">${escapeHtml(agent.kind || 'agent')}</div><h2>${escapeHtml(agent.name)}</h2><p>${escapeHtml(agent.note || agent.origin || 'Registered House agent.')}</p></div>${agentBadges(agent, 8)}<div class="inspector-section"><span>Route / origin</span><strong>${escapeHtml(agent.route || agent.origin || 'local profile')}</strong>${model ? `<small class="route">${escapeHtml(model)}</small>` : ''}${agent.latencyMs != null ? `<small class="route">${escapeHtml(agent.latencyMs)} ms last probe</small>` : ''}</div><div class="inspector-section"><span>Desk actions</span><button class="primary" data-pin-agent="${escapeHtml(agent.id)}">${isPinned ? 'Unpin desk' : 'Pin desk'}</button>${agent.route ? `<button class="ghost" data-refresh-agent="${escapeHtml(agent.id)}">Refresh presence</button>` : ''}<a class="ghost" href="../apps/arcsweep/?open=1">Open ArcSweep</a></div><div class="inspector-section"><span>Authority note</span><small class="route">Selecting an agent here changes workspace focus only. It does not merge identity, promote canon, or grant new authority.</small></div></div></aside>`;
}

function render() {
  document.body.dataset.theme = state.theme || 'mossglass';
  const title = VIEWS.find(([id]) => id === state.view)?.[2] || 'Home';
  document.title = `${title} · House Workspace OS`;
  app.innerHTML = `<div class="workspace-shell">${renderRail()}<main class="workspace-main">${renderTopbar()}${renderView()}</main>${renderInspector()}<nav class="mobile-nav glass" aria-label="Mobile workspace">${navButtons(true)}</nav></div>`;
  bindEvents();
}

function setView(view) {
  if (!VIEWS.some(([id]) => id === view)) return;
  state.view = view;
  saveState();
  const url = new URL(location.href);
  url.searchParams.set('view', view);
  history.replaceState(null, '', url);
  render();
}

function selectAgent(id) {
  if (!agentById(id)) return;
  state.selectedAgentId = id;
  inspectorOpen = window.matchMedia?.('(max-width: 1180px)')?.matches || false;
  saveState();
  render();
}

async function refreshAgent(id, { quiet = false } = {}) {
  const agent = agentById(id);
  if (!agent?.route) return;
  const prior = runtimeStatus.get(id);
  if (quiet && prior?.checkedAt && Date.now() - prior.checkedAt < STATUS_MAX_AGE_MS) return;
  runtimeStatus.set(id, { ...prior, state: 'waking', checkedAt: prior?.checkedAt || 0 });
  render();
  const started = performance.now();
  try {
    const routePath = String(agent.route).split('/').map((segment) => encodeURIComponent(segment)).join('/');
    const response = await fetch(`/api/v1/flames/${routePath}/status`, { credentials: 'same-origin', cache: 'no-store' });
    const latencyMs = Math.max(0, Math.round(performance.now() - started));
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      runtimeStatus.set(id, { state: response.status === 401 ? 'offline' : 'degraded', reason: data.error || `HTTP ${response.status}`, latencyMs, checkedAt: Date.now() });
    } else if (data.flame_id && String(data.flame_id).toLowerCase() !== String(agent.route).toLowerCase()) {
      runtimeStatus.set(id, { state: 'degraded', reason: 'runtime route mismatch', latencyMs, checkedAt: Date.now() });
    } else {
      runtimeStatus.set(id, { state: data.runtime_reachable === false || data.model_available === false ? 'degraded' : 'ready', provider: data.provider || null, model: data.model || null, latencyMs, checkedAt: Date.now(), reason: data.runtime_error || null });
    }
  } catch (error) {
    runtimeStatus.set(id, { state: 'degraded', reason: error?.message || String(error), latencyMs: Math.max(0, Math.round(performance.now() - started)), checkedAt: Date.now() });
  }
  render();
}

async function refreshRoster() {
  const routed = allAgents().filter((agent) => agent.route);
  showToast(`Checking ${routed.length} runtime routes…`);
  const queue = [...routed];
  const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
    while (queue.length) {
      const agent = queue.shift();
      if (agent) await refreshAgent(agent.id, { quiet: false });
    }
  });
  await Promise.all(workers);
  showToast('Runtime roster checked.');
}

function showToast(message) {
  document.querySelector('.toast')?.remove();
  const node = document.createElement('div');
  node.className = 'toast';
  node.textContent = message;
  document.body.append(node);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.remove(), 2800);
}

async function installApp() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice.catch(() => null);
    deferredInstallPrompt = null;
    render();
    return;
  }
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) showToast('On Safari: Share → Add to Home Screen.');
  else showToast('Use your browser menu and choose Install app / Add to Home screen.');
}

function bindEvents() {
  document.querySelectorAll('[data-view]').forEach((node) => node.addEventListener('click', () => setView(node.dataset.view)));
  document.querySelectorAll('[data-agent-id]').forEach((node) => node.addEventListener('click', () => selectAgent(node.dataset.agentId)));
  document.querySelectorAll('[data-refresh-roster]').forEach((node) => node.addEventListener('click', refreshRoster));
  document.querySelector('[data-theme-select]')?.addEventListener('change', (event) => { state.theme = event.target.value; saveState(); render(); });
  document.querySelector('[data-inspector-close]')?.addEventListener('click', () => { inspectorOpen = false; render(); });
  document.querySelector('[data-agent-search]')?.addEventListener('input', (event) => { state.filters = { ...(state.filters || {}), agentSearch: event.target.value }; saveState(); render(); requestAnimationFrame(() => { const input = document.querySelector('[data-agent-search]'); input?.focus(); input?.setSelectionRange?.(input.value.length, input.value.length); }); });
  document.querySelector('[data-custom-agent-form]')?.addEventListener('submit', (event) => {
    event.preventDefault(); const form = new FormData(event.currentTarget); const name = text(form.get('name')); const id = normaliseId(form.get('id') || name); if (!name || !id) return;
    if (allAgents().some((agent) => agent.id === id)) return showToast('That agent ID already exists.');
    state.customAgents = [...(state.customAgents || []), { id, name, route: text(form.get('route')) || null, origin: text(form.get('origin')) || 'local registration', roles: text(form.get('roles')).split(',').map(text).filter(Boolean), kind: 'local', state: 'configured' }]; state.selectedAgentId = id; saveState(); inspectorOpen = true; render(); showToast(`${name} registered.`);
  });
  document.querySelector('[data-work-form]')?.addEventListener('submit', (event) => {
    event.preventDefault(); const form = new FormData(event.currentTarget); const title = text(form.get('title')); const nextOwner = text(form.get('nextOwner')); if (!title || !nextOwner) return;
    state.work = [{ id: uuid(), title, nextOwner, status: text(form.get('status')) || 'open', note: text(form.get('note')), createdAt: new Date().toISOString() }, ...(state.work || [])]; saveState(); render(); showToast('Handoff created.');
  });
  document.querySelectorAll('[data-work-status]').forEach((node) => node.addEventListener('click', () => { state.work = (state.work || []).map((item) => item.id === node.dataset.workId ? { ...item, status: node.dataset.workStatus, updatedAt: new Date().toISOString() } : item); saveState(); render(); }));
  document.querySelectorAll('[data-work-delete]').forEach((node) => node.addEventListener('click', () => { state.work = (state.work || []).filter((item) => item.id !== node.dataset.workId); saveState(); render(); }));
  document.querySelector('[data-training-work]')?.addEventListener('click', () => { state.work = [{ id: uuid(), title: 'Run next Crow training round', nextOwner: 'crow-trainer', status: 'open', note: 'Choose a drill or held-out exam, freeze the candidate before key access, then record MAXIMIZED / SACRIFICED / NEXT.', createdAt: new Date().toISOString() }, ...(state.work || [])]; state.view = 'work'; saveState(); render(); });
  document.querySelectorAll('[data-copy]').forEach((node) => node.addEventListener('click', async () => { try { await navigator.clipboard.writeText(node.dataset.copy); showToast('Copied.'); } catch { showToast('Copy unavailable on this browser.'); } }));
  document.querySelectorAll('[data-pin-agent]').forEach((node) => node.addEventListener('click', () => { const id = node.dataset.pinAgent; const pins = new Set(state.pinned || []); pins.has(id) ? pins.delete(id) : pins.add(id); state.pinned = [...pins]; saveState(); render(); }));
  document.querySelectorAll('[data-refresh-agent]').forEach((node) => node.addEventListener('click', () => refreshAgent(node.dataset.refreshAgent)));
  document.querySelector('[data-install-app]')?.addEventListener('click', installApp);
}

window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); deferredInstallPrompt = event; render(); });
window.addEventListener('appinstalled', () => { deferredInstallPrompt = null; render(); showToast('House Workspace OS installed.'); });
window.addEventListener('online', () => showToast('Network restored.'));
window.addEventListener('offline', () => showToast('Offline shell active. Runtime probes paused.'));

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !navigator.onLine) return;
  for (const agent of pinnedAgents().filter((item) => item.route)) refreshAgent(agent.id, { quiet: true });
});

if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('[House Workspace] service worker unavailable', error));
}

render();
if (navigator.onLine) queueMicrotask(() => pinnedAgents().filter((agent) => agent.route).forEach((agent) => refreshAgent(agent.id, { quiet: true })));
