import { readHouseCommons, readHouseRuntimeToken, restoreHouseRuntimeSession } from './house-runtime.js';
import { getKelyranSupabase } from './kelyran-supabase.js';

export const HOUSE_BRAID_RECEIPT_UI_VERSION = 'arcsweep.house-braid-receipt-ui/v1';
export const HOUSE_RUNTIME_RECEIPT_EDGE = 'https://rufrmjyusalnifpegllj.supabase.co/functions/v1/arcsweep-runtime-receipt';

let installed = false;
let timer = null;
let refreshInFlight = null;
let observer = null;

const esc = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

async function supabaseAccessToken() {
  const client = await getKelyranSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  const token = data?.session?.access_token;
  if (!token) throw new Error('Steward Supabase session required for braid receipts.');
  return token;
}

async function readRecentRuntimeReceipts() {
  const token = await supabaseAccessToken();
  const response = await fetch(HOUSE_RUNTIME_RECEIPT_EDGE, {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.detail || body?.error || `Runtime receipt read failed (${response.status}).`);
  return (Array.isArray(body.events) ? body.events : []).filter((event) => event?.event_type === 'model-reply-receipted');
}

function receiptKey({ thread_id, turn_id, voice_id } = {}) {
  return `${String(thread_id || '')}\u241f${String(turn_id || '')}\u241f${String(voice_id || '')}`;
}

function receiptForEntry(entry, byKey) {
  if (!entry || entry.kind !== 'voice' || !entry.voice_id || !entry.turn_id) return null;
  return byKey.get(receiptKey(entry)) || null;
}

function receiptMarkup(receipt) {
  if (!receipt) return '<span class="house-braid-chip house-braid-chip-unbraided" data-braid-state="unbraided" title="No matching durable Runtime Braid receipt was found for this model reply.">◇ unbraided</span>';
  const title = [
    'Runtime Braid verified',
    receipt.provider && `provider: ${receipt.provider}`,
    receipt.model && `model: ${receipt.model}`,
    receipt.route && `route: ${receipt.route}`,
    receipt.world_id && `world: ${receipt.world_id}`,
    receipt.thread_id && `thread: ${receipt.thread_id}`,
    receipt.turn_id && `turn: ${receipt.turn_id}`,
    receipt.event_sequence != null && `event: #${receipt.event_sequence}`,
    receipt.packet_fingerprint && `fingerprint: ${receipt.packet_fingerprint}`,
  ].filter(Boolean).join('\n');
  const event = receipt.event_sequence != null ? ` #${receipt.event_sequence}` : '';
  return `<button type="button" class="house-braid-chip house-braid-chip-verified" data-braid-state="verified" data-braid-event="${esc(receipt.event_id || '')}" title="${esc(title)}">◈ braided${esc(event)}</button>`;
}

function renderInspector(receipt) {
  let dialog = document.getElementById('house-braid-receipt-inspector');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'house-braid-receipt-inspector';
    dialog.className = 'house-braid-receipt-inspector';
    dialog.innerHTML = '<form method="dialog"><header><div><span class="eyebrow">Runtime Braid</span><h2>House reply receipt</h2></div><button type="submit" class="quiet">Close</button></header><pre data-braid-inspector-body></pre></form>';
    document.body.append(dialog);
  }
  const body = dialog.querySelector('[data-braid-inspector-body]');
  if (body) body.textContent = JSON.stringify(receipt, null, 2);
  dialog.showModal?.();
}

function decorate(entries, receipts) {
  const entryMap = new Map((entries || []).map((entry) => [String(entry.id || ''), entry]));
  const byKey = new Map((receipts || []).map((receipt) => [receiptKey(receipt), receipt]));
  document.querySelectorAll('.commons-chat-entry[data-entry-id]').forEach((article) => {
    const entry = entryMap.get(String(article.dataset.entryId || ''));
    if (!entry || entry.kind !== 'voice') return;
    const header = article.querySelector('header');
    if (!header) return;
    const actions = header.querySelector('div:last-child') || header;
    const existing = article.querySelector('[data-braid-state]');
    const receipt = receiptForEntry(entry, byKey);
    const state = receipt ? `verified:${receipt.event_id}` : 'unbraided';
    if (existing?.dataset?.braidFingerprint === state) return;
    existing?.remove();
    const holder = document.createElement('span');
    holder.innerHTML = receiptMarkup(receipt);
    const chip = holder.firstElementChild;
    if (!chip) return;
    chip.dataset.braidFingerprint = state;
    if (receipt) chip.addEventListener('click', () => renderInspector(receipt));
    actions.prepend(chip);
  });
}

export async function refreshHouseBraidReceipts() {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const session = readHouseRuntimeToken() || await restoreHouseRuntimeSession();
    if (!session || !document.querySelector('#commons-form')) return { status: 'house-offline' };
    const [commons, receipts] = await Promise.all([readHouseCommons(session), readRecentRuntimeReceipts()]);
    const entries = Array.isArray(commons?.entries) ? commons.entries : Array.isArray(commons) ? commons : [];
    decorate(entries, receipts);
    return { status: 'ready', entries: entries.length, receipts: receipts.length };
  })().catch((error) => ({ status: 'degraded', error: error?.message || String(error) })).finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

export function installHouseBraidReceiptUI() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  const style = document.createElement('style');
  style.textContent = `.house-braid-chip{border:1px solid var(--line-soft);border-radius:999px;padding:.16rem .42rem;font-size:.72rem;line-height:1.2;background:transparent;color:var(--muted);cursor:help}.house-braid-chip-verified{color:var(--seafoam,#8dd8c0);cursor:pointer}.house-braid-chip-unbraided{opacity:.7}.house-braid-receipt-inspector{width:min(42rem,calc(100vw - 2rem));border:1px solid var(--line-soft);border-radius:1rem;background:var(--panel);color:inherit}.house-braid-receipt-inspector form>header{display:flex;justify-content:space-between;gap:1rem;align-items:start}.house-braid-receipt-inspector pre{max-height:60vh;overflow:auto;white-space:pre-wrap;word-break:break-word;background:var(--panel-deep,var(--panel));padding:.8rem;border-radius:.7rem}`;
  document.head.append(style);
  observer = new MutationObserver(() => queueMicrotask(() => void refreshHouseBraidReceipts()));
  observer.observe(document.body, { childList: true, subtree: true });
  timer = setInterval(() => void refreshHouseBraidReceipts(), 5000);
  globalThis.addEventListener?.('beforeunload', () => { observer?.disconnect(); if (timer) clearInterval(timer); }, { once: true });
  void refreshHouseBraidReceipts();
  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:house-braid-receipt-ui-ready', { detail: { version: HOUSE_BRAID_RECEIPT_UI_VERSION } }));
}

if (typeof document !== 'undefined') installHouseBraidReceiptUI();
