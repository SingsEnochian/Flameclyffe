import {
  createEmptyTransformationRequestState,
  loadState,
  normaliseTransformationRequestState,
  saveState,
} from './storage.js';

export const TRANSFORMATION_MIRROR_KEY = 'hearthgate.arcsweep.transformation-requests.v1';
const SYNC_DELAY_MS = 80;
let syncing = false;
let timer = null;
let lastMirrorRaw = null;

function readMirror() {
  try {
    const raw = globalThis.localStorage?.getItem(TRANSFORMATION_MIRROR_KEY) || '';
    return {
      raw,
      store: raw ? normaliseTransformationRequestState(JSON.parse(raw)) : createEmptyTransformationRequestState(),
    };
  } catch {
    return { raw: '', store: createEmptyTransformationRequestState() };
  }
}

function writeMirror(store) {
  try {
    const raw = JSON.stringify(normaliseTransformationRequestState(store));
    globalThis.localStorage?.setItem(TRANSFORMATION_MIRROR_KEY, raw);
    lastMirrorRaw = raw;
  } catch {}
}

function notifyReceiptsUpdated(detail = {}) {
  const EventClass = globalThis.CustomEvent;
  if (typeof globalThis.dispatchEvent === 'function' && typeof EventClass === 'function') {
    globalThis.dispatchEvent(new EventClass('arcsweep:receipts-updated', { detail: { transformations: true, ...detail } }));
  }
}

function hasData(store) {
  return Object.values(store?.byWorld || {}).some((record) =>
    (record.requests?.length || 0) + (record.responses?.length || 0) + (record.circuits?.length || 0) > 0,
  );
}

function timeValue(value) {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function latestTime(store) {
  let latest = 0;
  for (const record of Object.values(store?.byWorld || {})) {
    for (const request of record.requests || []) latest = Math.max(latest, timeValue(request.requested_at));
    for (const response of record.responses || []) latest = Math.max(latest, timeValue(response.observed_at));
    for (const circuit of record.circuits || []) latest = Math.max(latest, timeValue(circuit.created_at));
  }
  return latest;
}

async function bootstrap() {
  if (syncing) return;
  syncing = true;
  try {
    const state = await loadState();
    const core = normaliseTransformationRequestState(state.transformationRequests);
    const mirror = readMirror();
    const coreHas = hasData(core);
    const mirrorHas = hasData(mirror.store);
    if (mirrorHas && (!coreHas || latestTime(mirror.store) > latestTime(core))) {
      state.transformationRequests = mirror.store;
      await saveState(state, { reason: 'transformation-receipt-mirror-recovery' });
      lastMirrorRaw = mirror.raw;
      notifyReceiptsUpdated({ recovered_from_mirror: true });
    } else if (coreHas) {
      writeMirror(core);
      notifyReceiptsUpdated({ restored_from_core: true });
    } else {
      state.transformationRequests = createEmptyTransformationRequestState();
      writeMirror(state.transformationRequests);
    }
  } finally {
    syncing = false;
  }
}

async function syncMirrorIntoCore() {
  if (syncing) return;
  const mirror = readMirror();
  if (mirror.raw === lastMirrorRaw) return;
  syncing = true;
  try {
    const state = await loadState();
    const core = normaliseTransformationRequestState(state.transformationRequests);
    const mirrorStore = mirror.store;
    if (JSON.stringify(core) !== JSON.stringify(mirrorStore)) {
      state.transformationRequests = mirrorStore;
      await saveState(state, { reason: 'transformation-receipt-update' });
      notifyReceiptsUpdated({ persisted_to_core: true });
    }
    lastMirrorRaw = readMirror().raw;
  } finally {
    syncing = false;
  }
}

function scheduleSync(delay = SYNC_DELAY_MS) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void syncMirrorIntoCore();
  }, delay);
}

await bootstrap();

for (const eventName of ['click', 'change', 'submit']) {
  document.addEventListener(eventName, () => scheduleSync(), true);
}

const observer = new MutationObserver(() => scheduleSync());
observer.observe(document.documentElement, { childList: true, subtree: true });
