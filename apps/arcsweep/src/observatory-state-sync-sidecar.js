import { loadState, saveState, OBSERVATORY_MIRROR_KEY, normaliseObservatoryStore } from './storage.js';

const FEEDBACK_QUEUE_KEY = 'arcsweep.feedback-cycle-queue/v1';
const SYNC_DELAY_MS = 80;
let lastCommittedSignature = null;
let timer = null;
let syncing = false;
let pending = false;

function readJson(key) {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? { raw, value: JSON.parse(raw) } : { raw: '', value: null };
  } catch {
    return { raw: '', value: null };
  }
}

function snapshotMirrors() {
  const observatory = readJson(OBSERVATORY_MIRROR_KEY);
  const feedback = readJson(FEEDBACK_QUEUE_KEY);
  return {
    signature: `${observatory.raw}\u241e${feedback.raw}`,
    observatory: observatory.value?.version === 1 ? normaliseObservatoryStore(observatory.value) : null,
    feedbackQueue: feedback.value?.schema === 'arcsweep.feedback-cycle-queue/v1' ? feedback.value : null,
  };
}

async function commitMirrorSnapshot() {
  if (syncing) {
    pending = true;
    return;
  }
  const snapshot = snapshotMirrors();
  if (snapshot.signature === lastCommittedSignature) return;
  if (!snapshot.observatory && !snapshot.feedbackQueue) {
    lastCommittedSignature = snapshot.signature;
    return;
  }

  syncing = true;
  try {
    const state = await loadState();
    if (snapshot.observatory) state.observatory = snapshot.observatory;
    if (snapshot.feedbackQueue) state.feedbackQueue = structuredClone(snapshot.feedbackQueue);
    await saveState(state, {
      reason: 'observatory-mirror-sync',
      observatory: Boolean(snapshot.observatory),
      feedbackQueue: Boolean(snapshot.feedbackQueue),
    });
    lastCommittedSignature = snapshotMirrors().signature;
  } finally {
    syncing = false;
    if (pending) {
      pending = false;
      scheduleSync(0);
    }
  }
}

function scheduleSync(delay = SYNC_DELAY_MS) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void commitMirrorSnapshot();
  }, delay);
}

for (const eventName of ['click', 'change', 'submit']) {
  document.addEventListener(eventName, () => scheduleSync(), true);
}

const observer = new MutationObserver(() => scheduleSync());
observer.observe(document.documentElement, { childList: true, subtree: true });

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => scheduleSync(0), { once: true });
} else {
  scheduleSync(0);
}
