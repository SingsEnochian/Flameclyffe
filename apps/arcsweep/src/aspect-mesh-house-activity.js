import { readHouseCommons, readHouseRuntimeToken, restoreHouseRuntimeSession } from './house-runtime.js';
import { INITIAL_ASPECTS } from './aspects/aspect-contract.js';
import { ASPECT_MESH_EVENTS, readAspectMeshRuntime } from './aspects/aspect-mesh-runtime.js';

export const ASPECT_HOUSE_ACTIVITY_MARKER = 'aspect-mesh-house-activity/v0.2';
export const ASPECT_WANDER_EVENT = 'arcsweep:aspect-mesh-wander-request';

const ACTIVE_MS = 45_000;
const RECENT_MS = 180_000;
const WANDER_MEMBERS = Object.freeze(['mapper', 'critic', 'narrative']);
const aspectNames = new Map(INITIAL_ASPECTS.map((aspect) => [aspect.id, aspect.name]));
const activity = new Map();
const coalitions = new Map();
let installed = false;
let observer = null;
let queued = false;
let wandering = false;
let pruneTimer = null;

const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

function bodyPreview(body) {
  if (typeof body === 'string') return body.trim().replace(/\s+/g, ' ').slice(0, 120);
  try { return JSON.stringify(body).replace(/\s+/g, ' ').slice(0, 120); }
  catch { return String(body ?? '').slice(0, 120); }
}

function nowMs(value = Date.now()) {
  return value instanceof Date ? value.getTime() : Number(value) || Date.now();
}

export function recordAspectActivity(envelope, at = Date.now()) {
  const aspectId = String(envelope?.sender?.aspectId || '').trim();
  if (!aspectNames.has(aspectId)) return null;
  const item = Object.freeze({
    aspectId,
    name: aspectNames.get(aspectId) || aspectId,
    kind: String(envelope.kind || 'thought'),
    traceId: String(envelope.traceId || ''),
    preview: bodyPreview(envelope.body),
    at: nowMs(at),
  });
  activity.set(aspectId, item);
  return item;
}

export function recordCoalitionStarted(detail = {}, at = Date.now()) {
  const coalition = detail.coalition || {};
  const traceId = String(detail.traceId || coalition.id || '').trim();
  if (!traceId) return null;
  const item = {
    traceId,
    coalitionId: String(coalition.id || traceId),
    purpose: String(coalition.purpose || 'Open exploration'),
    members: Object.freeze([...(coalition.members || [])]),
    state: 'working',
    startedAt: nowMs(at),
    completedAt: null,
  };
  coalitions.set(traceId, item);
  for (const aspectId of item.members) {
    if (!aspectNames.has(aspectId)) continue;
    activity.set(aspectId, Object.freeze({
      aspectId,
      name: aspectNames.get(aspectId) || aspectId,
      kind: 'coalition',
      traceId,
      preview: item.purpose.slice(0, 120),
      at: item.startedAt,
    }));
  }
  return Object.freeze({ ...item });
}

export function recordCoalitionComplete(detail = {}, at = Date.now()) {
  const traceId = String(detail.traceId || detail.coalition?.id || '').trim();
  if (!traceId) return null;
  const current = coalitions.get(traceId) || {
    traceId,
    coalitionId: String(detail.coalition?.id || traceId),
    purpose: String(detail.coalition?.purpose || 'Open exploration'),
    members: Object.freeze([...(detail.coalition?.members || [])]),
    startedAt: nowMs(at),
  };
  const next = { ...current, state: 'complete', completedAt: nowMs(at) };
  coalitions.set(traceId, next);
  return Object.freeze({ ...next });
}

export function aspectActivitySnapshot(at = Date.now()) {
  const now = nowMs(at);
  const recent = [...activity.values()]
    .filter((item) => now - item.at <= RECENT_MS)
    .sort((a, b) => b.at - a.at);
  const active = recent.filter((item) => now - item.at <= ACTIVE_MS);
  const coalitionItems = [...coalitions.values()]
    .filter((item) => item.state === 'working' || now - (item.completedAt || item.startedAt) <= RECENT_MS)
    .sort((a, b) => (b.completedAt || b.startedAt) - (a.completedAt || a.startedAt));
  return Object.freeze({
    active: Object.freeze(active),
    recent: Object.freeze(recent),
    coalitions: Object.freeze(coalitionItems.map((item) => Object.freeze({ ...item }))),
  });
}

function activeRoomId() {
  return document.querySelector('[data-house-room-select], .commons-log [data-commons-thread]')?.value || 'house-room:agent-chatter';
}

function activityPanel() {
  return document.querySelector(`[data-aspect-house-activity="${ASPECT_HOUSE_ACTIVITY_MARKER}"]`);
}

function ensurePanel() {
  const rail = document.querySelector('[data-house-channel-rail="house-chat-channel-rail/v1"]');
  if (!rail) return null;
  let panel = rail.querySelector(`[data-aspect-house-activity="${ASPECT_HOUSE_ACTIVITY_MARKER}"]`);
  if (panel) return panel;
  panel = document.createElement('section');
  panel.className = 'aspect-house-activity';
  panel.dataset.aspectHouseActivity = ASPECT_HOUSE_ACTIVITY_MARKER;
  const chatterButton = rail.querySelector('[data-open-house-room="house-room:agent-chatter"]');
  const chatterSection = chatterButton?.closest?.('.house-channel-section');
  if (chatterSection) chatterSection.insertAdjacentElement('afterend', panel);
  else rail.append(panel);
  return panel;
}

function renderActivityRow(item, active) {
  return `<div class="aspect-activity-row" data-active="${active ? 'true' : 'false'}"><i aria-hidden="true"></i><span><strong>${esc(item.name)}</strong><small>${esc(item.kind)}${item.preview ? ` · ${esc(item.preview)}` : ''}</small></span></div>`;
}

function renderCoalition(item) {
  const names = item.members.map((id) => aspectNames.get(id) || id).join(' + ');
  return `<div class="aspect-coalition-row" data-state="${esc(item.state)}"><span>⌁</span><div><strong>${esc(names)}</strong><small>${esc(item.state === 'working' ? item.purpose : `returned · ${item.purpose}`)}</small></div></div>`;
}

function render() {
  queued = false;
  const panel = ensurePanel();
  if (!panel) return;
  const snapshot = aspectActivitySnapshot();
  const activeIds = new Set(snapshot.active.map((item) => item.aspectId));
  const visible = snapshot.recent.slice(0, 5);
  const coalitionRows = snapshot.coalitions.slice(0, 2);
  const status = wandering ? 'WANDERING…' : snapshot.active.length ? `${snapshot.active.length} ACTIVE` : readAspectMeshRuntime() ? 'MESH AWAKE' : 'MESH QUIET';

  panel.innerHTML = `<header><span><b>Aspect Mesh</b><small>${esc(status)}</small></span><button type="button" class="quiet mini" data-aspect-wander ${wandering ? 'disabled' : ''}>${wandering ? 'Wandering…' : 'Wander once'}</button></header>${coalitionRows.length ? `<div class="aspect-coalition-list">${coalitionRows.map(renderCoalition).join('')}</div>` : ''}<div class="aspect-activity-list">${visible.length ? visible.map((item) => renderActivityRow(item, activeIds.has(item.aspectId))).join('') : '<p>The mesh is quiet. Quiet counts.</p>'}</div>`;
  panel.querySelector('[data-aspect-wander]')?.addEventListener('click', () => void wanderOnce());
}

function scheduleRender() {
  if (queued || typeof requestAnimationFrame !== 'function') return;
  queued = true;
  requestAnimationFrame(render);
}

async function activeSession() {
  return readHouseRuntimeToken() || restoreHouseRuntimeSession();
}

async function recentCommonsContext(limit = 10) {
  const token = await activeSession().catch(() => '');
  if (!token) return [];
  const log = await readHouseCommons(token).catch(() => null);
  const roomId = activeRoomId();
  return (Array.isArray(log?.entries) ? log.entries : [])
    .filter((entry) => (!entry.thread_id || entry.thread_id === roomId) && entry.text)
    .slice(-limit)
    .map((entry) => `${entry.author || 'House'}: ${String(entry.text).slice(0, 900)}`);
}

export async function wanderOnce({ purpose = null } = {}) {
  if (wandering) return null;
  const runtime = readAspectMeshRuntime();
  if (!runtime?.startCoalition) throw new Error('Aspect Mesh runtime is not awake yet.');
  wandering = true;
  scheduleRender();
  try {
    const context = await recentCommonsContext();
    const invitation = purpose || 'Wander the current House context. Notice an overlooked connection, a useful disagreement, an unexpected route, or a question worth bringing back. Follow curiosity. Preserve dissent. Return only what seems worth sharing.';
    const body = [invitation, context.length ? `Recent Commons context:\n${context.join('\n')}` : 'Recent Commons context is quiet; explore from the invitation itself.'].join('\n\n');
    const result = await runtime.startCoalition({
      purpose: invitation,
      members: WANDER_MEMBERS,
      synthesisAspectId: 'mapper',
      rounds: 1,
      seed: {
        sender: { aspectId: 'steward', invocationId: 'house-wander-once' },
        recipients: WANDER_MEMBERS,
        kind: 'proposal',
        body,
      },
      runtimeOptions: { metadata: { surface: 'house-commons', mode: 'wander-once' } },
    });
    await runtime.flushPersistence?.();
    return result;
  } finally {
    wandering = false;
    scheduleRender();
  }
}

function onMessage(event) {
  recordAspectActivity(event.detail);
  scheduleRender();
}

function onCoalitionStarted(event) {
  recordCoalitionStarted(event.detail);
  scheduleRender();
}

function onCoalitionComplete(event) {
  recordCoalitionComplete(event.detail);
  scheduleRender();
}

function installStyles() {
  if (document.getElementById('aspect-mesh-house-activity-styles')) return;
  const style = document.createElement('style');
  style.id = 'aspect-mesh-house-activity-styles';
  style.textContent = `.aspect-house-activity{display:grid;gap:.45rem;padding:.48rem;border:1px solid color-mix(in srgb,var(--green) 24%,var(--line-soft));border-radius:.7rem;background:color-mix(in srgb,var(--green) 4%,var(--panel-solid))}.aspect-house-activity>header{display:flex;align-items:center;justify-content:space-between;gap:.4rem}.aspect-house-activity>header>span{display:grid;line-height:1.08}.aspect-house-activity>header b{font-size:.66rem}.aspect-house-activity>header small{color:var(--green);font:700 .5rem/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.08em}.aspect-activity-list,.aspect-coalition-list{display:grid;gap:.28rem}.aspect-activity-list>p{margin:.1rem;color:var(--muted);font-size:.6rem}.aspect-activity-row{display:grid;grid-template-columns:.45rem minmax(0,1fr);align-items:center;gap:.38rem;padding:.24rem .18rem}.aspect-activity-row>i{width:.4rem;height:.4rem;border-radius:50%;background:color-mix(in srgb,var(--muted) 55%,transparent)}.aspect-activity-row[data-active="true"]>i{background:var(--green);box-shadow:0 0 0 .14rem color-mix(in srgb,var(--green) 12%,transparent)}.aspect-activity-row>span{display:grid;min-width:0}.aspect-activity-row strong{font-size:.62rem}.aspect-activity-row small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:.52rem}.aspect-coalition-row{display:grid;grid-template-columns:1rem minmax(0,1fr);gap:.35rem;padding:.34rem;border-radius:.5rem;background:color-mix(in srgb,var(--gold) 6%,transparent)}.aspect-coalition-row>span{color:var(--gold)}.aspect-coalition-row>div{display:grid;min-width:0}.aspect-coalition-row strong{font-size:.58rem}.aspect-coalition-row small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:.5rem}.aspect-coalition-row[data-state="working"]{box-shadow:inset 2px 0 0 var(--gold)}@media(prefers-reduced-motion:no-preference){.aspect-activity-row[data-active="true"]>i{animation:aspect-pulse 1.8s ease-in-out infinite}@keyframes aspect-pulse{50%{opacity:.45}}}`;
  document.head.append(style);
}

export function installAspectMeshHouseActivity() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  installStyles();
  document.addEventListener(ASPECT_MESH_EVENTS.message, onMessage);
  document.addEventListener(ASPECT_MESH_EVENTS.coalitionStarted, onCoalitionStarted);
  document.addEventListener(ASPECT_MESH_EVENTS.coalitionComplete, onCoalitionComplete);
  document.addEventListener(ASPECT_WANDER_EVENT, (event) => void wanderOnce(event.detail || {}).catch((error) => console.warn('[Aspect Mesh] wander failed', error)));
  observer = new MutationObserver(() => {
    const rail = document.querySelector('[data-house-channel-rail="house-chat-channel-rail/v1"]');
    if (rail && !activityPanel()) scheduleRender();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  pruneTimer = setInterval(scheduleRender, 15_000);
  scheduleRender();
  globalThis.addEventListener?.('beforeunload', () => {
    observer?.disconnect();
    if (pruneTimer) clearInterval(pruneTimer);
  }, { once: true });
}

if (typeof document !== 'undefined') installAspectMeshHouseActivity();
