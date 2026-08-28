import {
  HOUSE_COOKIE_SESSION,
  readHouseRuntimeToken,
  restoreHouseRuntimeSession,
} from './house-runtime.js';

export const LANTERNBRIDGE_MAILBOX_SEEN_KEY = 'arcsweep.lanternbridge-mailbox-seen/v1';
export const LANTERNBRIDGE_MAILBOX_POLL_MS = 5 * 60 * 1000;
export const LANTERNBRIDGE_SOURCE_REPO = 'mdkubit/UH-Lanternbridge';
export const LANTERNBRIDGE_LANES = Object.freeze([
  'exchanges/nocturne',
  'exchanges/rowan',
  'exchanges/shared',
]);

let timer = null;
let syncInFlight = null;
let installed = false;

function readSeen(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(LANTERNBRIDGE_MAILBOX_SEEN_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}

function writeSeen(value, storage = globalThis.localStorage) {
  try { storage?.setItem(LANTERNBRIDGE_MAILBOX_SEEN_KEY, JSON.stringify(value)); } catch {}
}

async function activeSession() {
  return readHouseRuntimeToken() || await restoreHouseRuntimeSession();
}

function houseHeaders(token) {
  return token && token !== HOUSE_COOKIE_SESSION ? { authorization: `Bearer ${token}` } : {};
}

async function githubJson(url, fetchImpl) {
  const response = await fetchImpl(url, { headers: { accept: 'application/vnd.github+json' }, cache: 'no-store' });
  if (!response.ok) throw new Error(`Lanternbridge GitHub read ${response.status}`);
  return response.json();
}

async function ingestSource(token, item, rawSource, fetchImpl) {
  const response = await fetchImpl('/api/v1/house/lanternbridge', {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { 'content-type': 'application/json', ...houseHeaders(token) },
    body: JSON.stringify({
      action: 'ingest',
      source_repo: LANTERNBRIDGE_SOURCE_REPO,
      source_path: item.path,
      source_ref: `github-blob:${item.sha}`,
      raw_source: rawSource,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Lanternbridge ingest ${response.status}`);
  return data;
}

export async function syncLanternbridgeMailbox({ fetchImpl = fetch, storage = globalThis.localStorage } = {}) {
  if (syncInFlight) return syncInFlight;
  syncInFlight = (async () => {
    const token = await activeSession();
    if (!token) return { state: 'house-offline', checked: 0, ingested: 0, duplicates: 0 };

    const seen = readSeen(storage);
    let checked = 0;
    let ingested = 0;
    let duplicates = 0;
    const receipts = [];

    for (const lane of LANTERNBRIDGE_LANES) {
      const url = `https://api.github.com/repos/${LANTERNBRIDGE_SOURCE_REPO}/contents/${lane}?ref=main`;
      const items = await githubJson(url, fetchImpl);
      for (const item of Array.isArray(items) ? items : []) {
        if (item?.type !== 'file' || !String(item.name || '').endsWith('.md') || item.name === 'README.md') continue;
        checked += 1;
        if (seen[item.path] === item.sha) continue;
        const rawResponse = await fetchImpl(item.download_url, { cache: 'no-store' });
        if (!rawResponse.ok) throw new Error(`Lanternbridge source read ${rawResponse.status}: ${item.path}`);
        const rawSource = await rawResponse.text();
        const receipt = await ingestSource(token, item, rawSource, fetchImpl);
        receipts.push(receipt);
        if (receipt.duplicate) duplicates += 1;
        else ingested += 1;
        seen[item.path] = item.sha;
        writeSeen(seen, storage);
      }
    }

    if (ingested || duplicates) {
      globalThis.dispatchEvent?.(new CustomEvent('lanternbridge:mailbox-synced', {
        detail: { checked, ingested, duplicates, receipts },
      }));
    }
    return { state: 'ready', checked, ingested, duplicates, receipts };
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
