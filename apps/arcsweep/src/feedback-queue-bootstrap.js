import { loadState, saveState } from './storage.js';
import { createEmptyFeedbackQueue, normalizeFeedbackQueue } from './feedback-cycle-queue.js';

const QUEUE_STORAGE_KEY = 'arcsweep.feedback-cycle-queue/v1';

function readMirror() {
  try {
    const raw = globalThis.localStorage?.getItem(QUEUE_STORAGE_KEY);
    return raw ? normalizeFeedbackQueue(JSON.parse(raw)) : createEmptyFeedbackQueue();
  } catch {
    return createEmptyFeedbackQueue();
  }
}

function hasQueueData(queue) {
  return Object.keys(queue.entries || {}).length > 0 || (queue.receipts || []).length > 0;
}

function timeValue(value) {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

const state = await loadState();
const coreQueue = normalizeFeedbackQueue(state.feedbackQueue);
const mirrorQueue = readMirror();
const coreHasData = hasQueueData(coreQueue);
const mirrorHasData = hasQueueData(mirrorQueue);
const mirrorIsNewer = timeValue(mirrorQueue.updated_at) > timeValue(coreQueue.updated_at);

if (mirrorHasData && (!coreHasData || mirrorIsNewer)) {
  state.feedbackQueue = mirrorQueue;
  await saveState(state, {
    reason: 'feedback-queue-mirror-recovery',
    source: 'browser-development-mirror',
  });
} else if (coreHasData) {
  try { globalThis.localStorage?.setItem(QUEUE_STORAGE_KEY, JSON.stringify(coreQueue)); } catch {}
}
