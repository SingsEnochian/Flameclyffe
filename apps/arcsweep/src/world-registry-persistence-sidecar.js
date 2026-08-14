import { loadState, newId, saveState } from './storage.js';
import { createWorldRegistryEntry, updateWorldRegistryEntry } from './world-registry-operations.js';

const RESUME_KEY = 'hearthgate.arcsweep.world-registry-resume.v1';
let resuming = false;

function showInlineError(anchor, message) {
  if (!anchor) return;
  let output = anchor.parentElement?.querySelector('[data-world-registry-persistence-error]');
  if (!output) {
    output = document.createElement('p');
    output.dataset.worldRegistryPersistenceError = 'true';
    output.className = 'callout';
    anchor.parentElement?.appendChild(output);
  }
  output.textContent = message;
}

function markResume(worldId) {
  try {
    sessionStorage.setItem(RESUME_KEY, JSON.stringify({ room: 'worlds', worldId }));
  } catch {}
}

function readResume() {
  try {
    const raw = sessionStorage.getItem(RESUME_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearResume() {
  try { sessionStorage.removeItem(RESUME_KEY); } catch {}
}

function resumeWorldRegistry() {
  if (resuming) return;
  const resume = readResume();
  if (!resume || resume.room !== 'worlds') return;
  const worldsButton = document.querySelector('#app [data-room="worlds"]');
  if (!worldsButton) return;

  resuming = true;
  clearResume();
  worldsButton.click();
  queueMicrotask(() => { resuming = false; });
}

async function persistNewWorld(button) {
  button.disabled = true;
  try {
    const current = await loadState();
    const { state, world } = createWorldRegistryEntry(current, {
      id: newId('world'),
      now: new Date().toISOString(),
    });
    await saveState(state, { reason: 'world-registry-new-world-atomic' });
    markResume(world.id);
    globalThis.location?.reload();
  } catch (error) {
    button.disabled = false;
    showInlineError(button, `World creation stopped: ${error.message}`);
  }
}

async function persistWorldForm(form) {
  const submit = form.querySelector('button[type="submit"]');
  if (submit) submit.disabled = true;
  try {
    const data = new FormData(form);
    const current = await loadState();
    const { state, world } = updateWorldRegistryEntry(current, {
      id: data.get('id'),
      name: data.get('name'),
      kind: data.get('kind'),
      description: data.get('description'),
      now: new Date().toISOString(),
    });
    await saveState(state, { reason: 'world-registry-save-atomic' });
    markResume(world.id);
    globalThis.location?.reload();
  } catch (error) {
    if (submit) submit.disabled = false;
    showInlineError(submit || form, `World save stopped: ${error.message}`);
  }
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('#app [data-action="new-world"]');
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  void persistNewWorld(button);
}, true);

document.addEventListener('submit', (event) => {
  const form = event.target.closest('#app #world-registry-form');
  if (!form) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  void persistWorldForm(form);
}, true);

const observer = new MutationObserver(() => resumeWorldRegistry());
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', resumeWorldRegistry, { once: true });
} else {
  resumeWorldRegistry();
}
