import {
  HOUSE_COOKIE_SESSION,
  appendHouseCommons,
  readHouseCommons,
  readHouseRuntimeToken,
  restoreHouseRuntimeSession,
} from './house-runtime.js';
import { streamConstellationRuntimeVoice } from './flame-chat-stream-client.js';

export const HOUSE_BROWSER_SMOKE_VERSION = 'arcsweep.house-browser-smoke/v1';
const PENDING_KEY = 'arcsweep.house-browser-smoke.pending/v1';

export function houseBrowserPreflight(root = document) {
  const checks = Object.freeze({
    authoritative_surface: Boolean(root.querySelector('[data-house-chat-authoritative], [data-house-chat-surface-mounted], #commons-form')),
    native_composer: Boolean(root.querySelector('[contenteditable="true"], [data-house-rich-composer], #commons-form textarea')),
    runtime_roster: Boolean(root.querySelector('[data-house-chat-runtime-roster], [data-runtime-roster], [data-house-voice-roster]')),
    commons_log: Boolean(root.querySelector('.commons-log, [data-house-chat-log]')),
    room_identity: Boolean(root.querySelector('[data-house-room], [data-room-id], [data-active-room]')),
  });
  return Object.freeze({
    schema: 'arcsweep.house-browser-preflight/v1',
    checks,
    ready: Object.values(checks).every(Boolean),
    note: 'Preflight is DOM-only and non-mutating. Full smoke is explicit because it writes a synthetic receipted turn.',
  });
}

async function activeToken() {
  return readHouseRuntimeToken() || await restoreHouseRuntimeSession() || HOUSE_COOKIE_SESSION;
}

function worldContext() {
  return Object.freeze({
    schema: 'arcsweep.runtime-world-context/v1',
    context_id: `browser-smoke-context:${Date.now()}`,
    identity_anchor: { world_id: 'terra-prime', world_name: 'Terra Prime' },
    provenance: { source: 'arcsweep-browser-smoke' },
  });
}

export async function runHouseBrowserSmoke() {
  const token = await activeToken();
  const threadId = `browser-smoke:${Date.now()}`;
  const turnId = `${threadId}:rowan`;
  const prompt = 'ARCSWEEP BROWSER SMOKE. Synthetic route check only. Reply briefly that Ox Alpha is present; do not infer Qualia, alter canon, or treat this as story content.';
  const before = await readHouseCommons(token);
  await appendHouseCommons(token, {
    kind: 'steward', author: 'Browser Smoke', status: 'sent',
    world: { id: 'terra-prime', name: 'Terra Prime' },
    thread_id: threadId, turn_id: turnId, mentions: ['oxalpha'], text: prompt,
    metadata: { synthetic_smoke: true, authority: 'validation_only' },
  });
  const reply = await streamConstellationRuntimeVoice({
    voiceId: 'oxalpha', message: prompt, sessionId: threadId, context: [],
    metadata: { surface: 'browser-smoke', world_id: 'terra-prime', synthetic_smoke: true, interaction_mode: 'chat' },
    worldContext: worldContext(),
  });
  await appendHouseCommons(token, {
    kind: 'voice', author: 'Ox Alpha', voice_id: 'oxalpha', status: 'replied',
    world: { id: 'terra-prime', name: 'Terra Prime' }, thread_id: threadId, turn_id: `${threadId}:oxalpha`, reply_to: turnId,
    runtime: { provider: reply.provider, model: reply.model, route: reply.route || 'oxalpha', profile_id: reply.profileId || null, latency_ms: reply.latencyMs ?? null, runtime_world_context_id: reply.runtimeWorldContextId || null },
    text: reply.message,
    metadata: { synthetic_smoke: true, authority: 'validation_only' },
  });
  const after = await readHouseCommons(token);
  const entries = (after.entries || []).filter((entry) => entry.thread_id === threadId);
  const receipt = Object.freeze({
    schema: HOUSE_BROWSER_SMOKE_VERSION,
    thread_id: threadId,
    persisted_entries: entries.length,
    before_count: before.entries?.length ?? null,
    after_count: after.entries?.length ?? null,
    attributable_reply: Boolean(entries.find((entry) => entry.voice_id === 'oxalpha' && entry.runtime?.provider && entry.runtime?.model)),
    provider: reply.provider || null,
    model: reply.model || null,
    reload_verified: false,
    authority: 'validation_only',
  });
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(receipt)); } catch {}
  return receipt;
}

export async function verifyPendingHouseSmokeReload() {
  let pending = null;
  try { pending = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null'); } catch {}
  if (!pending?.thread_id) return null;
  try {
    const token = await activeToken();
    const current = await readHouseCommons(token);
    const entries = (current.entries || []).filter((entry) => entry.thread_id === pending.thread_id);
    const verified = Object.freeze({ ...pending, persisted_entries_after_reload: entries.length, reload_verified: entries.length >= 2 });
    if (verified.reload_verified) localStorage.removeItem(PENDING_KEY);
    globalThis.dispatchEvent?.(new CustomEvent('arcsweep:house-browser-smoke-reload', { detail: verified }));
    return verified;
  } catch (error) {
    return Object.freeze({ ...pending, reload_verified: false, reload_error: error?.message || String(error) });
  }
}

function styles() {
  if (document.querySelector('[data-house-smoke-style]')) return;
  const node = document.createElement('style'); node.dataset.houseSmokeStyle = HOUSE_BROWSER_SMOKE_VERSION;
  node.textContent = `.house-smoke-launch{display:grid;grid-template-columns:1.6rem 1fr;gap:.45rem;align-items:center;width:100%;padding:.55rem .65rem;border:0;border-radius:.65rem;background:transparent;color:inherit;text-align:left;font:inherit;font-size:.86rem;cursor:pointer}.house-smoke-launch:hover,.house-smoke-launch:focus-visible{background:color-mix(in srgb,var(--accent,#c89b62) 12%,transparent);outline:none}.house-smoke-dialog{width:min(760px,94vw);border:1px solid #ffffff20;border-radius:1rem;padding:1rem;background:var(--panel,#171512);color:inherit}.house-smoke-output{white-space:pre-wrap;overflow-wrap:anywhere;background:#0004;border-radius:.7rem;padding:.7rem;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace}.house-smoke-actions{display:flex;gap:.5rem;flex-wrap:wrap;margin:.7rem 0}.house-smoke-actions button{padding:.5rem .7rem;border-radius:.6rem;border:1px solid #ffffff25;background:#ffffff09;color:inherit;cursor:pointer}`; document.head.append(node);
}

function mount() {
  const nav = document.querySelector('.sidebar nav[aria-label="Primary Arcsweep rooms"]');
  if (!nav || nav.querySelector('[data-house-smoke-launch]')) return;
  const button = document.createElement('button'); button.type = 'button'; button.className = 'house-smoke-launch'; button.dataset.houseSmokeLaunch = HOUSE_BROWSER_SMOKE_VERSION; button.innerHTML = '<span aria-hidden="true">✓</span><span>House Smoke</span>';
  const dialog = document.createElement('dialog'); dialog.className = 'house-smoke-dialog'; dialog.dataset.houseSmokeDialog = HOUSE_BROWSER_SMOKE_VERSION;
  dialog.innerHTML = `<h2>House browser acceptance smoke</h2><p>Preflight reads the live DOM only. Full smoke is explicit because it appends one synthetic Steward turn and one attributable Ox Alpha reply to Commons.</p><div class="house-smoke-actions"><button type="button" data-preflight>Run preflight</button><button type="button" data-full>Run full smoke</button><button type="button" data-close>Close</button></div><div class="house-smoke-output" data-output></div>`;
  const output = dialog.querySelector('[data-output]');
  dialog.querySelector('[data-preflight]').addEventListener('click', () => { output.textContent = JSON.stringify(houseBrowserPreflight(), null, 2); });
  dialog.querySelector('[data-full]').addEventListener('click', async (event) => {
    event.currentTarget.disabled = true; output.textContent = 'Running synthetic House circulation…';
    try { output.textContent = JSON.stringify(await runHouseBrowserSmoke(), null, 2); }
    catch (error) { output.textContent = JSON.stringify({ ok: false, error: error?.message || String(error) }, null, 2); }
    finally { event.currentTarget.disabled = false; }
  });
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  button.addEventListener('click', () => { output.textContent = JSON.stringify(houseBrowserPreflight(), null, 2); dialog.showModal(); });
  nav.append(button); document.body.append(dialog);
}

export function installHouseBrowserSmoke() {
  styles(); mount(); void verifyPendingHouseSmokeReload();
  const observer = new MutationObserver(mount); observer.observe(document.body, { childList: true, subtree: true });
  globalThis.addEventListener('beforeunload', () => observer.disconnect(), { once: true });
}

if (typeof document !== 'undefined') installHouseBrowserSmoke();
