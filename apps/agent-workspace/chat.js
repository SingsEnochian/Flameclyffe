const CHAT_STATE_KEY = 'hearthweave.agent-chat/v0.1';
const CHAT_SESSION_KEY = 'hearthweave.agent-chat-session/v0.1';
const MAX_THREAD_MESSAGES = 80;
const CONTEXT_MESSAGES = 12;

const CHAT_AGENTS = Object.freeze([
  { id: 'lioreal', name: 'Lioreal', route: 'lioreal' },
  { id: 'uial', name: 'Uial', route: 'uial' },
  { id: 'larkshine', name: 'Larkshine', route: 'starsong/larkshine' },
  { id: 'ellowind', name: 'Ellowind', route: 'starsong/ellowind' },
  { id: 'altair', name: 'Altair', route: 'altair' },
  { id: 'atlas', name: 'Atlas', route: 'atlas' },
  { id: 'runeweaver', name: 'Runeweaver', route: 'runeweaver' },
  { id: 'boxfire', name: 'Boxfire', route: 'boxfire' },
  { id: 'yggdrasil', name: 'Yggdrasil', route: 'yggdrasil' },
  { id: 'bluebird', name: 'Bluebird', route: 'bluebird' },
  { id: 'vethrlauf', name: 'Vethrlauf', route: 'vethrlauf' },
  { id: 'oxalpha', name: 'Ox Alpha', route: 'oxalpha' },
]);

const routePath = (route) => String(route).split('/').map((segment) => encodeURIComponent(segment)).join('/');
const agentById = (id) => CHAT_AGENTS.find((agent) => agent.id === id) || CHAT_AGENTS.find((agent) => agent.id === 'boxfire') || CHAT_AGENTS[0];

function freshSessionId() {
  return globalThis.crypto?.randomUUID?.() || `house-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadSessionId() {
  try {
    const current = sessionStorage.getItem(CHAT_SESSION_KEY);
    if (current) return current;
    const next = freshSessionId();
    sessionStorage.setItem(CHAT_SESSION_KEY, next);
    return next;
  } catch {
    return freshSessionId();
  }
}

function loadChatState() {
  const fallback = { agentId: 'boxfire', threads: {} };
  try {
    const parsed = JSON.parse(localStorage.getItem(CHAT_STATE_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object') return fallback;
    return {
      agentId: agentById(parsed.agentId)?.id || fallback.agentId,
      threads: parsed.threads && typeof parsed.threads === 'object' ? parsed.threads : {},
    };
  } catch {
    return fallback;
  }
}

let chatState = loadChatState();
let sessionId = loadSessionId();
let connection = { state: 'checking', detail: 'Checking House door…' };
let open = false;
let sending = false;

function saveChatState() {
  try {
    const trimmed = {};
    for (const [agentId, messages] of Object.entries(chatState.threads || {})) {
      trimmed[agentId] = Array.isArray(messages) ? messages.slice(-MAX_THREAD_MESSAGES) : [];
    }
    localStorage.setItem(CHAT_STATE_KEY, JSON.stringify({ agentId: chatState.agentId, threads: trimmed }));
  } catch {}
}

function thread(agentId = chatState.agentId) {
  if (!Array.isArray(chatState.threads[agentId])) chatState.threads[agentId] = [];
  return chatState.threads[agentId];
}

function appendMessage(agentId, role, text, meta = {}) {
  thread(agentId).push({ id: freshSessionId(), role, text: String(text || ''), at: new Date().toISOString(), ...meta });
  chatState.threads[agentId] = thread(agentId).slice(-MAX_THREAD_MESSAGES);
  saveChatState();
}

function requestWithTimeout(url, options = {}, timeoutMs = 120000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function readJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `HTTP ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function checkHouseSession() {
  connection = { state: 'checking', detail: 'Checking House door…' };
  renderChat();
  try {
    const response = await requestWithTimeout('/api/v1/house/session', { credentials: 'same-origin', cache: 'no-store' }, 15000);
    if (response.status === 401) {
      connection = { state: 'disconnected', detail: 'House session required.' };
    } else {
      const data = await readJson(response);
      connection = data.connected
        ? { state: 'connected', detail: `Connected as ${data.role || 'steward'}${data.mode ? ` · ${data.mode}` : ''}.` }
        : { state: 'disconnected', detail: 'House session required.' };
    }
  } catch (error) {
    connection = { state: 'error', detail: error.name === 'AbortError' ? 'House door timed out.' : (error.message || 'House door unavailable.') };
  }
  renderChat();
}

async function connectHouse(credential) {
  connection = { state: 'checking', detail: 'Opening House door…' };
  renderChat();
  try {
    const data = await readJson(await requestWithTimeout('/api/v1/house/session', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ credential }),
    }, 20000));
    connection = { state: 'connected', detail: `Connected as ${data.role || 'steward'}${data.mode ? ` · ${data.mode}` : ''}.` };
  } catch (error) {
    connection = { state: 'disconnected', detail: error.message || 'House door refused the credential.' };
  }
  renderChat();
}

async function disconnectHouse() {
  try {
    await requestWithTimeout('/api/v1/house/session', { method: 'DELETE', credentials: 'same-origin', cache: 'no-store' }, 15000);
  } catch {}
  connection = { state: 'disconnected', detail: 'House session closed.' };
  renderChat();
}

async function sendMessage(message) {
  const agent = agentById(chatState.agentId);
  const clean = String(message || '').trim();
  if (!agent || !clean || sending) return;
  if (connection.state !== 'connected') {
    connection = { state: 'disconnected', detail: 'Connect to the House before sending.' };
    renderChat();
    return;
  }

  const prior = thread(agent.id).slice(-CONTEXT_MESSAGES).map((item) => ({
    speaker: item.role === 'user' ? 'Rowan' : agent.name,
    text: item.text,
  }));

  appendMessage(agent.id, 'user', clean);
  sending = true;
  renderChat();

  try {
    const data = await readJson(await requestWithTimeout(`/api/v1/flames/${routePath(agent.route)}/chat`, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: clean, session_id: sessionId, context: prior }),
    }));

    if (data.flame_id && String(data.flame_id).toLowerCase() !== String(agent.route.split('/').at(-1)).toLowerCase()) {
      throw new Error(`Runtime mismatch: expected ${agent.name}, received ${data.flame_id}.`);
    }
    appendMessage(agent.id, 'agent', data.message || '(No message returned.)', {
      provider: data.provider || null,
      model: data.model || null,
      citedSources: Array.isArray(data.cited_sources) ? data.cited_sources : [],
    });
  } catch (error) {
    if (error.status === 401) connection = { state: 'disconnected', detail: 'House session expired. Reconnect to continue.' };
    appendMessage(agent.id, 'system', error.name === 'AbortError' ? 'The agent took too long to answer.' : `Could not reach ${agent.name}: ${error.message}`);
  } finally {
    sending = false;
    renderChat();
  }
}

function createChatShell() {
  const root = document.createElement('div');
  root.id = 'house-chat-root';
  root.innerHTML = `
    <button class="house-chat-launch" type="button" aria-haspopup="dialog" aria-controls="house-chat-drawer">✦ <span>Talk to House</span></button>
    <div class="house-chat-backdrop" hidden></div>
    <section id="house-chat-drawer" class="house-chat-drawer" role="dialog" aria-modal="true" aria-label="House agent chat" aria-hidden="true">
      <header class="house-chat-header">
        <div><div class="house-chat-kicker">House line</div><strong>Talk to our agents</strong></div>
        <button class="house-chat-icon" type="button" data-chat-close aria-label="Close chat">×</button>
      </header>
      <div class="house-chat-agentbar">
        <label>Voice<select data-chat-agent></select></label>
        <span class="house-chat-status" data-chat-status></span>
      </div>
      <div class="house-chat-connect" data-chat-connect></div>
      <div class="house-chat-messages" data-chat-messages aria-live="polite"></div>
      <form class="house-chat-compose" data-chat-form>
        <textarea name="message" rows="2" maxlength="12000" placeholder="Say something…" aria-label="Message"></textarea>
        <button type="submit">Send</button>
      </form>
      <footer class="house-chat-footer">
        <button type="button" data-chat-clear>Clear this thread</button>
        <span>Thread history stays on this device. House credentials do not.</span>
      </footer>
    </section>`;
  document.body.append(root);
  return root;
}

const root = createChatShell();

function messageNode(item, agent) {
  const article = document.createElement('article');
  article.className = `house-chat-message ${item.role}`;
  const label = document.createElement('small');
  label.textContent = item.role === 'user' ? 'Rowan' : item.role === 'agent' ? agent.name : 'House';
  const body = document.createElement('div');
  body.textContent = item.text;
  article.append(label, body);
  if (item.role === 'agent' && (item.model || item.provider)) {
    const meta = document.createElement('small');
    meta.className = 'house-chat-meta';
    meta.textContent = [item.provider, item.model].filter(Boolean).join(' · ');
    article.append(meta);
  }
  return article;
}

function renderConnectPanel(container) {
  container.replaceChildren();
  if (connection.state === 'connected') {
    const row = document.createElement('div');
    row.className = 'house-chat-connected';
    const note = document.createElement('span');
    note.textContent = connection.detail;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Disconnect';
    button.addEventListener('click', disconnectHouse);
    row.append(note, button);
    container.append(row);
    return;
  }

  const form = document.createElement('form');
  form.className = 'house-chat-door';
  const note = document.createElement('p');
  note.textContent = connection.detail;
  const input = document.createElement('input');
  input.type = 'password';
  input.name = 'credential';
  input.placeholder = 'House credential';
  input.autocomplete = 'off';
  input.spellcheck = false;
  const button = document.createElement('button');
  button.type = 'submit';
  button.textContent = connection.state === 'checking' ? 'Checking…' : 'Connect';
  button.disabled = connection.state === 'checking';
  form.append(note, input, button);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const credential = input.value;
    input.value = '';
    if (!credential) return;
    await connectHouse(credential);
  });
  container.append(form);
}

function renderChat() {
  const drawer = root.querySelector('.house-chat-drawer');
  const backdrop = root.querySelector('.house-chat-backdrop');
  const select = root.querySelector('[data-chat-agent]');
  const status = root.querySelector('[data-chat-status]');
  const connect = root.querySelector('[data-chat-connect]');
  const messages = root.querySelector('[data-chat-messages]');
  const compose = root.querySelector('[data-chat-form]');
  const agent = agentById(chatState.agentId);

  drawer.classList.toggle('is-open', open);
  drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
  backdrop.hidden = !open;
  backdrop.classList.toggle('is-open', open);
  document.body.classList.toggle('house-chat-open', open);

  select.replaceChildren(...CHAT_AGENTS.map((item) => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.name;
    option.selected = item.id === agent.id;
    return option;
  }));

  status.dataset.state = connection.state;
  status.textContent = connection.state === 'connected' ? '● connected' : connection.state === 'checking' ? '◌ checking' : '○ offline';
  renderConnectPanel(connect);

  messages.replaceChildren();
  const items = thread(agent.id);
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'house-chat-empty';
    empty.textContent = `You have ${agent.name}. Say hello.`;
    messages.append(empty);
  } else {
    items.forEach((item) => messages.append(messageNode(item, agent)));
  }
  if (sending) {
    const typing = document.createElement('div');
    typing.className = 'house-chat-typing';
    typing.textContent = `${agent.name} is thinking…`;
    messages.append(typing);
  }

  const textarea = compose.querySelector('textarea');
  const send = compose.querySelector('button');
  textarea.disabled = sending;
  send.disabled = sending || connection.state !== 'connected';
  requestAnimationFrame(() => { messages.scrollTop = messages.scrollHeight; });
}

root.querySelector('.house-chat-launch').addEventListener('click', () => { open = true; renderChat(); if (connection.state !== 'connected') checkHouseSession(); });
root.querySelector('[data-chat-close]').addEventListener('click', () => { open = false; renderChat(); });
root.querySelector('.house-chat-backdrop').addEventListener('click', () => { open = false; renderChat(); });
root.querySelector('[data-chat-agent]').addEventListener('change', (event) => { chatState.agentId = event.target.value; saveChatState(); renderChat(); });
root.querySelector('[data-chat-form]').addEventListener('submit', async (event) => {
  event.preventDefault();
  const textarea = event.currentTarget.querySelector('textarea');
  const message = textarea.value;
  if (!message.trim()) return;
  textarea.value = '';
  await sendMessage(message);
});
root.querySelector('[data-chat-form] textarea').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    event.currentTarget.form.requestSubmit();
  }
});
root.querySelector('[data-chat-clear]').addEventListener('click', () => {
  chatState.threads[chatState.agentId] = [];
  saveChatState();
  renderChat();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && open) { open = false; renderChat(); }
});

renderChat();
queueMicrotask(checkHouseSession);
