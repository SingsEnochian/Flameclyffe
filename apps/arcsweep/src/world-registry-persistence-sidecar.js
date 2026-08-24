import { loadState, newId, saveState } from './storage.js';
import {
  createWorldRegistryEntry,
  deleteWorldRegistryEntry,
  updateWorldRegistryEntry,
} from './world-registry-operations.js';
import {
  WORLD_REGISTRY_JOURNAL_KEY,
  createWorldRegistryJournal,
  normaliseWorldRegistryJournal,
  reconcileWorldRegistry,
  recordWorldDeletion,
  recordWorldSnapshot,
} from './world-registry-journal.js';

const RESUME_KEY = 'hearthgate.arcsweep.world-registry-resume.v2';
let busy = false;
let resuming = false;

function readJson(storage, key, fallback) {
  try {
    const raw = storage?.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(storage, key, value) {
  try {
    storage?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function readJournal() {
  return normaliseWorldRegistryJournal(
    readJson(globalThis.localStorage, WORLD_REGISTRY_JOURNAL_KEY, createWorldRegistryJournal()),
  );
}

function writeJournal(journal) {
  if (!writeJson(globalThis.localStorage, WORLD_REGISTRY_JOURNAL_KEY, journal)) {
    throw new Error('the durable World Registry recovery journal could not be written');
  }
}

function markResume(worldId, message = '') {
  writeJson(globalThis.sessionStorage, RESUME_KEY, { room: 'worlds', worldId, message });
}

function clearResume() {
  try { globalThis.sessionStorage?.removeItem(RESUME_KEY); } catch {}
}

function showInlineError(anchor, message) {
  if (!anchor) return;
  const host = anchor.closest('article, section, form') || anchor.parentElement;
  let output = host?.querySelector('[data-world-registry-persistence-error]');
  if (!output) {
    output = document.createElement('p');
    output.dataset.worldRegistryPersistenceError = 'true';
    output.className = 'callout';
    host?.appendChild(output);
  }
  output.textContent = message;
}

function resumeWorldRegistry() {
  if (resuming) return;
  const resume = readJson(globalThis.sessionStorage, RESUME_KEY, null);
  if (!resume || resume.room !== 'worlds') return;
  const worldsButton = document.querySelector('#app [data-room="worlds"]');
  if (!worldsButton) return;

  resuming = true;
  clearResume();
  worldsButton.click();
  queueMicrotask(() => {
    if (resume.worldId) {
      document.querySelector(`#app [data-world-id="${CSS.escape(resume.worldId)}"]`)?.click();
    }
    resuming = false;
  });
}

async function verifyWorld(worldId, predicate, failureMessage) {
  const verified = await loadState();
  const world = verified.worlds?.find((item) => item?.id === worldId) || null;
  if (!predicate(world, verified)) throw new Error(failureMessage);
  return verified;
}

async function persistNewWorld(button) {
  if (busy) return;
  busy = true;
  button.disabled = true;
  try {
    const current = await loadState();
    const now = new Date().toISOString();
    const { state, world } = createWorldRegistryEntry(current, {
      id: newId('world'),
      now,
    });

    writeJournal(recordWorldSnapshot(readJournal(), world, now));
    await saveState(state, { reason: 'world-registry-new-world-atomic-v2' });
    await verifyWorld(
      world.id,
      (saved) => Boolean(saved),
      'the new world was not present after the save round trip',
    );

    markResume(world.id, 'New world saved and verified.');
    globalThis.location?.reload();
  } catch (error) {
    busy = false;
    button.disabled = false;
    showInlineError(button, `World creation stopped: ${error.message}`);
  }
}

async function persistWorldForm(form, anchor = form) {
  if (busy) return;
  busy = true;
  const button = form.querySelector('[data-action="save-world"]');
  if (button) button.disabled = true;
  try {
    const data = new FormData(form);
    const current = await loadState();
    const now = new Date().toISOString();
    const { state, world } = updateWorldRegistryEntry(current, {
      id: data.get('id'),
      name: data.get('name'),
      kind: data.get('kind'),
      description: data.get('description'),
      now,
    });

    writeJournal(recordWorldSnapshot(readJournal(), world, now));
    await saveState(state, { reason: 'world-registry-save-atomic-v2' });
    await verifyWorld(
      world.id,
      (saved) => Boolean(saved && saved.updatedAt === world.updatedAt),
      'the edited world did not survive the save round trip',
    );

    markResume(world.id, 'World saved and verified.');
    globalThis.location?.reload();
  } catch (error) {
    busy = false;
    if (button) button.disabled = false;
    showInlineError(anchor, `World save stopped: ${error.message}`);
  }
}

async function persistWorldDeletion(button) {
  if (busy) return;
  busy = true;
  button.disabled = true;
  try {
    const current = await loadState();
    const id = button.dataset.id || button.closest('form')?.querySelector('[name="id"]')?.value;
    const now = new Date().toISOString();
    const { state } = deleteWorldRegistryEntry(current, { id, now });

    writeJournal(recordWorldDeletion(readJournal(), id, now));
    await saveState(state, { reason: 'world-registry-delete-atomic-v2' });
    await verifyWorld(
      id,
      (saved) => !saved,
      'the deleted world reappeared after the save round trip',
    );

    markResume(state.activeWorldId, 'World deletion saved and verified.');
    globalThis.location?.reload();
  } catch (error) {
    busy = false;
    button.disabled = false;
    showInlineError(button, `World deletion stopped: ${error.message}`);
  }
}

async function repairFromJournal() {
  try {
    const journal = readJournal();
    if (!Object.keys(journal.entries).length) return;
    const current = await loadState();
    const repaired = reconcileWorldRegistry(current, journal);
    if (!repaired.changed) return;

    await saveState(repaired.state, { reason: 'world-registry-journal-recovery-v2' });
    const preferred = repaired.recovered[0] || repaired.refreshed[0] || repaired.state.activeWorldId;
    markResume(preferred, 'World Registry recovered from its durable journal.');
    globalThis.location?.reload();
  } catch (error) {
    console.error('WORLD_REGISTRY_RECOVERY', error);
  }
}

document.addEventListener('click', (event) => {
  const newButton = event.target.closest('#app [data-action="new-world"]');
  if (newButton) {
    event.preventDefault();
    event.stopImmediatePropagation();
    void persistNewWorld(newButton);
    return;
  }

  const saveButton = event.target.closest('#app [data-action="save-world"]');
  if (saveButton) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const form = saveButton.closest('#world-registry-form');
    if (form) void persistWorldForm(form, saveButton);
    return;
  }

  const deleteButton = event.target.closest('#app [data-action="delete-world"]');
  if (deleteButton) {
    event.preventDefault();
    event.stopImmediatePropagation();
    void persistWorldDeletion(deleteButton);
  }
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

void repairFromJournal();
