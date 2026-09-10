import { invokeCaretaker } from './caretaker.js';
import {
  caretakerTransportLabel,
  resolveCaretakerTransport,
} from './caretaker-transport.js';
import { readActiveRuntimeWorldContext } from './runtime-world-context.js';

export const ARCSWEEP_CARETAKER_SIDECAR_VERSION = 'arcsweep.caretaker-sidecar/v0.3';
export const ARCSWEEP_CARETAKER_LOCAL_RECEIPTS = 'arcsweep.caretaker.receipts.v0.1';
export const ARCSWEEP_CARETAKER_CHAT_HISTORY = 'arcsweep.caretaker.chat.v0.2';

const MAX_CHAT_MESSAGES = 24;
let installed = false;

function roomButtons() {
  return [...document.querySelectorAll('button[data-room]')].filter((button) => button.dataset.room);
}

function availableRooms() {
  const seen = new Set();
  return roomButtons().map((button) => ({
    id: String(button.dataset.room || '').trim(),
    label: String(button.textContent || button.dataset.room || '').replace(/\s+/g, ' ').trim(),
  })).filter((room) => room.id && !seen.has(room.id) && seen.add(room.id));
}

function activeRoomId() {
  return document.querySelector('.sidebar button[data-room].active')?.dataset.room
    || document.querySelector('button[data-room].active')?.dataset.room
    || document.querySelector('.content[data-houseglass-room]')?.dataset.houseglassRoom
    || 'portal';
}

export async function currentCaretakerWorld(readWorld = readActiveRuntimeWorldContext) {
  try {
    const context = await readWorld();
    const world = context?.world;
    const id = String(world?.id || context?.active_world_id || context?.identity_anchor?.world_id || '').trim();
    if (!id) return null;
    return {
      id,
      name: String(world?.name || id).trim(),
    };
  } catch {
    return null;
  }
}

async function afterRender() {
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

export async function navigateCaretakerRoom(target) {
  const button = roomButtons().find((candidate) => candidate.dataset.room === target);
  if (!button) return { ok: false, status: 'missing', target, observed_room: activeRoomId() };
  button.click();
  await afterRender();
  const observedRoom = activeRoomId();
  return {
    ok: observedRoom === target,
    status: observedRoom === target ? 'navigated' : 'not-observed',
    target,
    observed_room: observedRoom,
  };
}

function nonDurableReceipt(receipt, error = null) {
  return Object.freeze({
    ...structuredClone(receipt),
    persistence: receipt.persistence === 'runtime-braid-verified' ? receipt.persistence : 'not-yet-durable',
    ...(error ? { storage_error: error?.message || String(error) } : {}),
  });
}

export function persistCaretakerReceiptLocal(receipt, storage = globalThis.localStorage) {
  if (!storage) return nonDurableReceipt(receipt);
  let previous = [];
  try {
    previous = JSON.parse(storage.getItem(ARCSWEEP_CARETAKER_LOCAL_RECEIPTS) || '[]');
    if (!Array.isArray(previous)) previous = [];
  } catch { previous = []; }
  const stored = {
    ...structuredClone(receipt),
    persistence: receipt.persistence === 'runtime-braid-verified' ? receipt.persistence : 'local-replayable',
    stored_at: new Date().toISOString(),
  };
  try {
    storage.setItem(ARCSWEEP_CARETAKER_LOCAL_RECEIPTS, JSON.stringify([stored, ...previous].slice(0, 60)));
    return Object.freeze(stored);
  } catch (error) {
    return nonDurableReceipt(receipt, error);
  }
}

export function readCaretakerReceiptsLocal(storage = globalThis.localStorage) {
  if (!storage) return [];
  try {
    const value = JSON.parse(storage.getItem(ARCSWEEP_CARETAKER_LOCAL_RECEIPTS) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function normaliseChatTurn(turn) {
  const role = turn?.role === 'assistant' ? 'assistant' : turn?.role === 'user' ? 'user' : null;
  const content = String(turn?.content || '').trim().slice(0, 4000);
  if (!role || !content) return null;
  return {
    role,
    content,
    at: String(turn?.at || new Date().toISOString()).slice(0, 40),
  };
}

export function readCaretakerChatLocal(storage = globalThis.localStorage) {
  if (!storage?.getItem) return [];
  try {
    const parsed = JSON.parse(storage.getItem(ARCSWEEP_CARETAKER_CHAT_HISTORY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normaliseChatTurn).filter(Boolean).slice(-MAX_CHAT_MESSAGES);
  } catch {
    return [];
  }
}

export function persistCaretakerChatLocal(turns, storage = globalThis.localStorage) {
  const bounded = (Array.isArray(turns) ? turns : []).map(normaliseChatTurn).filter(Boolean).slice(-MAX_CHAT_MESSAGES);
  try { storage?.setItem?.(ARCSWEEP_CARETAKER_CHAT_HISTORY, JSON.stringify(bounded)); } catch { /* conversation remains usable without persistence */ }
  return bounded;
}

export function clearCaretakerChatLocal(storage = globalThis.localStorage) {
  try { storage?.removeItem?.(ARCSWEEP_CARETAKER_CHAT_HISTORY); } catch { /* non-fatal */ }
}

function installStyle() {
  if (document.getElementById('arcsweep-caretaker-style')) return;
  const style = document.createElement('style');
  style.id = 'arcsweep-caretaker-style';
  style.textContent = `
    .arcsweep-caretaker-launch{position:fixed;left:.8rem;bottom:.8rem;z-index:1400;border:1px solid var(--line-soft,#665);border-radius:999px;padding:.48rem .72rem;background:var(--panel,#171717);color:inherit;box-shadow:0 .5rem 2rem rgba(0,0,0,.28);cursor:pointer}
    .arcsweep-caretaker{width:min(42rem,calc(100vw - 1.5rem));height:min(44rem,calc(100vh - 2rem));max-height:calc(100vh - 2rem);border:1px solid var(--line-soft,#665);border-radius:1rem;background:var(--panel,#171717);color:inherit;padding:0;box-shadow:0 1rem 4rem rgba(0,0,0,.45);overflow:hidden}
    .arcsweep-caretaker::backdrop{background:rgba(0,0,0,.42);backdrop-filter:blur(5px)}
    .arcsweep-caretaker-shell{height:100%;display:grid;grid-template-rows:auto minmax(0,1fr) auto auto;gap:.65rem;padding:1rem;box-sizing:border-box}
    .arcsweep-caretaker header{display:flex;justify-content:space-between;gap:1rem;align-items:start}
    .arcsweep-caretaker h2{margin:.1rem 0}.arcsweep-caretaker p{margin:.1rem 0}
    .arcsweep-caretaker-thread{min-height:0;overflow:auto;display:flex;flex-direction:column;gap:.6rem;padding:.4rem .15rem .6rem;scrollbar-gutter:stable}
    .arcsweep-caretaker-message{max-width:86%;border:1px solid var(--line-soft,#665);border-radius:.9rem;padding:.62rem .72rem;white-space:pre-wrap;overflow-wrap:anywhere}
    .arcsweep-caretaker-message[data-role="user"]{align-self:flex-end;background:var(--panel-deep,#111)}
    .arcsweep-caretaker-message[data-role="assistant"]{align-self:flex-start;background:color-mix(in srgb,var(--panel,#171717) 84%,#8d78ff 16%)}
    .arcsweep-caretaker-message[data-role="system"]{align-self:center;max-width:94%;font-size:.82rem;opacity:.72;border-style:dashed}
    .arcsweep-caretaker-speaker{display:block;font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;opacity:.62;margin-bottom:.22rem}
    .arcsweep-caretaker-composer{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.5rem;align-items:end}
    .arcsweep-caretaker textarea{width:100%;box-sizing:border-box;resize:none;min-height:3rem;max-height:8rem;background:var(--panel-deep,#111);color:inherit;border:1px solid var(--line-soft,#665);border-radius:.75rem;padding:.72rem;font:inherit}
    .arcsweep-caretaker-actions{display:flex;gap:.45rem;align-items:center;justify-content:space-between}
    .arcsweep-caretaker-status{font-size:.78rem;opacity:.72}
    .arcsweep-caretaker-runtime{font-size:.76rem;opacity:.8;margin-top:.2rem}
    @media (max-width:540px){.arcsweep-caretaker{width:calc(100vw - .7rem);height:calc(100vh - .7rem);max-height:calc(100vh - .7rem)}.arcsweep-caretaker-message{max-width:92%}.arcsweep-caretaker-composer{grid-template-columns:1fr}.arcsweep-caretaker-composer button{justify-self:end}}
  `;
  document.head.append(style);
}

function markup() {
  return `
    <section class="arcsweep-caretaker-shell" aria-label="ArcSweep Caretaker conversation">
      <header>
        <div>
          <span class="eyebrow">House intelligence · v0.3</span>
          <h2>ArcSweep Caretaker</h2>
          <p class="arcsweep-caretaker-status">Conversation + bounded navigation</p>
          <p class="arcsweep-caretaker-runtime" data-caretaker-runtime>Connecting automatically…</p>
        </div>
        <button type="button" class="quiet" data-caretaker-close>Close</button>
      </header>
      <div class="arcsweep-caretaker-thread" data-caretaker-thread role="log" aria-live="polite" aria-label="Caretaker conversation"></div>
      <form data-caretaker-form>
        <div class="arcsweep-caretaker-composer">
          <textarea name="request" required rows="2" aria-label="Message Caretaker" placeholder="Talk to me, ask where something is, or tell me where you want to go…"></textarea>
          <button type="submit">Send</button>
        </div>
      </form>
      <div class="arcsweep-caretaker-actions">
        <button type="button" class="quiet" data-caretaker-clear>Clear conversation</button>
        <div class="arcsweep-caretaker-status" data-caretaker-proof>No runtime action requested.</div>
      </div>
    </section>`;
}

function appendMessage(thread, role, content) {
  if (!thread || !content) return null;
  const message = document.createElement('div');
  message.className = 'arcsweep-caretaker-message';
  message.dataset.role = role;
  const speaker = document.createElement('span');
  speaker.className = 'arcsweep-caretaker-speaker';
  speaker.textContent = role === 'user' ? 'Rowan' : role === 'assistant' ? 'Caretaker' : 'ArcSweep';
  const body = document.createElement('span');
  body.textContent = content;
  message.append(speaker, body);
  thread.append(message);
  thread.scrollTop = thread.scrollHeight;
  return message;
}

function renderConversation(thread, history) {
  thread.replaceChildren();
  if (!history.length) {
    appendMessage(thread, 'assistant', 'Hi. I live here now. Talk to me normally, ask what ArcSweep is doing, or tell me where you want to go.');
    return;
  }
  for (const turn of history) appendMessage(thread, turn.role, turn.content);
}

function shortModel(value) {
  const text = String(value || '').trim();
  if (!text) return 'model connected';
  const tail = text.split('/').at(-1) || text;
  return tail.replace(/:cheapest$/, '').replace(/^hf\.co\//, '');
}

async function primeCaretakerConnection(runtimeStatus) {
  if (!runtimeStatus) return null;
  runtimeStatus.textContent = 'Connecting automatically…';
  try {
    const transport = await resolveCaretakerTransport();
    runtimeStatus.textContent = caretakerTransportLabel(transport);
    return transport;
  } catch (error) {
    runtimeStatus.textContent = error?.message || 'Caretaker connection unavailable.';
    return null;
  }
}

async function runCaretaker(form, thread, proof, runtimeStatus) {
  const textarea = form.elements.request;
  const request = String(new FormData(form).get('request') || '').trim();
  if (!request) return;

  const history = readCaretakerChatLocal();
  appendMessage(thread, 'user', request);
  textarea.value = '';
  const waiting = appendMessage(thread, 'system', 'Caretaker is thinking…');
  proof.textContent = `Current room: ${activeRoomId()} · conversation is free; navigation remains bounded.`;

  const transport = await resolveCaretakerTransport();
  runtimeStatus.textContent = caretakerTransportLabel(transport);
  if (!transport.token) {
    throw new Error('Sign in to ArcSweep once with the Steward identity. Caretaker will connect automatically after that.');
  }

  const world = await currentCaretakerWorld();
  const receipt = await invokeCaretaker({
    message: request,
    history,
    roomId: activeRoomId(),
    world,
    availableRooms: availableRooms(),
    navigate: navigateCaretakerRoom,
    token: transport.token,
    endpoint: transport.endpoint,
  });
  const stored = persistCaretakerReceiptLocal(receipt);
  waiting?.remove();
  const reply = stored.plan.reply || (stored.status === 'no-action' ? 'I’m here.' : 'Request interpreted.');
  appendMessage(thread, 'assistant', reply);
  persistCaretakerChatLocal([
    ...history,
    { role: 'user', content: request, at: stored.requested_at },
    { role: 'assistant', content: reply, at: stored.completed_at },
  ]);

  const actionSummary = stored.action_results.length
    ? stored.action_results.map((item) => `${item.status}: ${item.action.type} → ${item.action.target}`).join(' · ')
    : 'conversation only';
  const executionPath = stored.execution_path || stored.provider || 'runtime';
  proof.textContent = `${stored.status} · ${actionSummary} · ${executionPath} · ${stored.persistence}`;
  runtimeStatus.textContent = `Caretaker online · ${shortModel(stored.model)} · ${caretakerTransportLabel(transport)}`;
  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:caretaker-receipt', { detail: stored }));
}

export function installCaretakerSidecar() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  installStyle();

  const launch = document.createElement('button');
  launch.type = 'button';
  launch.className = 'arcsweep-caretaker-launch';
  launch.dataset.caretakerLaunch = 'true';
  launch.textContent = '⌁ Caretaker';
  launch.setAttribute('aria-label', 'Open ArcSweep Caretaker');

  const dialog = document.createElement('dialog');
  dialog.className = 'arcsweep-caretaker';
  dialog.dataset.caretaker = 'true';
  dialog.innerHTML = markup();

  document.body.append(launch, dialog);
  const form = dialog.querySelector('[data-caretaker-form]');
  const thread = dialog.querySelector('[data-caretaker-thread]');
  const proof = dialog.querySelector('[data-caretaker-proof]');
  const runtimeStatus = dialog.querySelector('[data-caretaker-runtime]');
  const textarea = form?.elements?.request;

  renderConversation(thread, readCaretakerChatLocal());

  launch.addEventListener('click', () => {
    renderConversation(thread, readCaretakerChatLocal());
    dialog.showModal?.();
    void primeCaretakerConnection(runtimeStatus);
    requestAnimationFrame(() => textarea?.focus?.());
  });
  dialog.querySelector('[data-caretaker-close]')?.addEventListener('click', () => dialog.close?.());
  dialog.querySelector('[data-caretaker-clear]')?.addEventListener('click', () => {
    clearCaretakerChatLocal();
    renderConversation(thread, []);
    proof.textContent = 'Conversation cleared. Runtime receipts are preserved separately.';
    textarea?.focus?.();
  });
  textarea?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      form?.requestSubmit?.();
    }
  });
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const submit = form.querySelector('[type="submit"]');
    if (submit) submit.disabled = true;
    runCaretaker(form, thread, proof, runtimeStatus).catch((error) => {
      thread.querySelector('.arcsweep-caretaker-message[data-role="system"]:last-child')?.remove();
      appendMessage(thread, 'system', error?.message || String(error));
      proof.textContent = 'No action receipt was produced.';
    }).finally(() => {
      if (submit) submit.disabled = false;
      textarea?.focus?.();
    });
  });

  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:caretaker-ready', { detail: { version: ARCSWEEP_CARETAKER_SIDECAR_VERSION } }));
}

if (typeof document !== 'undefined') installCaretakerSidecar();
