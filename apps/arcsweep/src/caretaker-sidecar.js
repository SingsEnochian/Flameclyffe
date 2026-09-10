import { invokeCaretaker } from './caretaker.js';
import { readHouseRuntimeToken, restoreHouseRuntimeSession } from './house-runtime.js';
import { readActiveRuntimeWorldContext } from './runtime-world-context.js';

export const ARCSWEEP_CARETAKER_SIDECAR_VERSION = 'arcsweep.caretaker-sidecar/v0.1';
export const ARCSWEEP_CARETAKER_LOCAL_RECEIPTS = 'arcsweep.caretaker.receipts.v0.1';

let installed = false;

function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

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

function installStyle() {
  if (document.getElementById('arcsweep-caretaker-style')) return;
  const style = document.createElement('style');
  style.id = 'arcsweep-caretaker-style';
  style.textContent = `
    .arcsweep-caretaker-launch{position:fixed;left:.8rem;bottom:.8rem;z-index:1400;border:1px solid var(--line-soft,#665);border-radius:999px;padding:.48rem .72rem;background:var(--panel,#171717);color:inherit;box-shadow:0 .5rem 2rem rgba(0,0,0,.28);cursor:pointer}
    .arcsweep-caretaker{width:min(34rem,calc(100vw - 1.5rem));border:1px solid var(--line-soft,#665);border-radius:1rem;background:var(--panel,#171717);color:inherit;padding:0;box-shadow:0 1rem 4rem rgba(0,0,0,.45)}
    .arcsweep-caretaker::backdrop{background:rgba(0,0,0,.42);backdrop-filter:blur(5px)}
    .arcsweep-caretaker form{display:grid;gap:.75rem;padding:1rem}
    .arcsweep-caretaker header{display:flex;justify-content:space-between;gap:1rem;align-items:start}
    .arcsweep-caretaker h2{margin:.1rem 0}.arcsweep-caretaker p{margin:.1rem 0}
    .arcsweep-caretaker textarea{width:100%;box-sizing:border-box;resize:vertical;min-height:5rem;background:var(--panel-deep,#111);color:inherit;border:1px solid var(--line-soft,#665);border-radius:.65rem;padding:.65rem}
    .arcsweep-caretaker-actions{display:flex;gap:.5rem;align-items:center;justify-content:flex-end}
    .arcsweep-caretaker-output{min-height:2.7rem;border:1px solid var(--line-soft,#665);border-radius:.65rem;padding:.65rem;white-space:pre-wrap}
    .arcsweep-caretaker-status{font-size:.78rem;opacity:.72}
  `;
  document.head.append(style);
}

function markup() {
  return `
    <form method="dialog" data-caretaker-form>
      <header>
        <div><span class="eyebrow">House intelligence · v0.1</span><h2>ArcSweep Caretaker</h2><p class="arcsweep-caretaker-status">Mighty Sword 9B · bounded navigation only</p></div>
        <button type="button" class="quiet" data-caretaker-close>Close</button>
      </header>
      <label>Ask the house<textarea name="request" required placeholder="Take me to Glyph Forge."></textarea></label>
      <div class="arcsweep-caretaker-output" data-caretaker-output>Waiting at the threshold.</div>
      <div class="arcsweep-caretaker-status" data-caretaker-proof>No action has been requested.</div>
      <div class="arcsweep-caretaker-actions"><button type="submit">Ask Caretaker</button></div>
    </form>`;
}

async function runCaretaker(form, output, proof) {
  const request = String(new FormData(form).get('request') || '').trim();
  if (!request) return;
  output.textContent = 'Listening…';
  proof.textContent = `Current room: ${activeRoomId()} · navigation is the only armed action.`;
  const token = readHouseRuntimeToken() || await restoreHouseRuntimeSession();
  if (!token) throw new Error('House Runtime session is required before the Caretaker can act.');
  const world = await currentCaretakerWorld();
  const receipt = await invokeCaretaker({
    message: request,
    roomId: activeRoomId(),
    world,
    availableRooms: availableRooms(),
    navigate: navigateCaretakerRoom,
    token,
  });
  const stored = persistCaretakerReceiptLocal(receipt);
  output.textContent = stored.plan.reply || (stored.status === 'no-action' ? 'No navigation requested.' : 'Request interpreted.');
  const actionSummary = stored.action_results.length
    ? stored.action_results.map((item) => `${item.status}: ${item.action.type} → ${item.action.target}`).join(' · ')
    : 'no runtime action';
  proof.textContent = `${stored.status} · ${actionSummary} · ${stored.persistence}`;
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
  const output = dialog.querySelector('[data-caretaker-output]');
  const proof = dialog.querySelector('[data-caretaker-proof]');

  launch.addEventListener('click', () => dialog.showModal?.());
  dialog.querySelector('[data-caretaker-close]')?.addEventListener('click', () => dialog.close?.());
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const submit = form.querySelector('[type="submit"]');
    if (submit) submit.disabled = true;
    runCaretaker(form, output, proof).catch((error) => {
      output.textContent = error?.message || String(error);
      proof.textContent = 'No action receipt was produced.';
    }).finally(() => { if (submit) submit.disabled = false; });
  });

  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:caretaker-ready', { detail: { version: ARCSWEEP_CARETAKER_SIDECAR_VERSION } }));
}

if (typeof document !== 'undefined') installCaretakerSidecar();
