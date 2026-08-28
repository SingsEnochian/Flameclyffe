import {
  HOUSE_COOKIE_SESSION,
  readHouseRuntimeToken,
  restoreHouseRuntimeSession,
} from './house-runtime.js';

export const LANTERNBRIDGE_MAILBOX_POLL_MS = 5 * 60 * 1000;

let timer = null;
let syncInFlight = null;
let installed = false;

async function activeSession() {
  return readHouseRuntimeToken() || await restoreHouseRuntimeSession();
}

function houseHeaders(token) {
  return token && token !== HOUSE_COOKIE_SESSION ? { authorization: `Bearer ${token}` } : {};
}

export async function syncLanternbridgeMailbox({
  fetchImpl = fetch,
  sessionProvider = activeSession,
} = {}) {
  if (syncInFlight) return syncInFlight;
  syncInFlight = (async () => {
    const token = await sessionProvider();
    if (!token) return { state: 'house-offline', checked: 0, processed: 0, duplicates: 0 };

    const response = await fetchImpl('/api/v1/house/lanternbridge/sync', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'content-type': 'application/json', ...houseHeaders(token) },
      body: '{}',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Lanternbridge mailbox sync ${response.status}`);

    if (data.processed || data.duplicates) {
      globalThis.dispatchEvent?.(new CustomEvent('lanternbridge:mailbox-synced', { detail: data }));
    }
    return data;
  })().finally(() => { syncInFlight = null; });
  return syncInFlight;
}

export function installLanternbridgeMailboxLive() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  const run = () => {
    if (document.visibilityState === 'hidden') return;
    void syncLanternbridgeMailbox().catch((error) => console.warn('[Lanternbridge] mailbox sync failed', error));
  };
  run();
  timer = setInterval(run, LANTERNBRIDGE_MAILBOX_POLL_MS);
  document.addEventListener('visibilitychange', run);
  globalThis.addEventListener?.('beforeunload', () => {
    if (timer) clearInterval(timer);
    document.removeEventListener('visibilitychange', run);
  }, { once: true });
}

if (typeof document !== 'undefined') installLanternbridgeMailboxLive();
