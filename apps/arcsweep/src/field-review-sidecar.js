import { loadState, saveState } from './storage.js';
import { enqueueUnreviewedFieldCycles, fieldQueueEntries, reviewFieldCycle } from './field-review-admission.js';

const MIRROR_KEY = 'arcsweep.feedback-cycle-queue/v1';
const REVIEW_ROOMS = new Set(['Field · DEEP Observer', 'Relational Feedback Chamber']);
let scanning = false;
let mounting = false;
let timer = null;

function esc(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function mirror(queue) {
  try { globalThis.localStorage?.setItem(MIRROR_KEY, JSON.stringify(queue)); } catch {}
}

function notify(detail = {}) {
  const EventClass = globalThis.CustomEvent;
  if (typeof globalThis.dispatchEvent === 'function' && typeof EventClass === 'function') {
    globalThis.dispatchEvent(new EventClass('arcsweep:receipts-updated', { detail: { field_review: true, ...detail } }));
  }
}

async function persistQueue(state, queue, meta = {}) {
  state.feedbackQueue = structuredClone(queue);
  mirror(queue);
  await saveState(state, { reason: 'field-review-queue', ...meta });
}

async function scan() {
  if (scanning) return;
  scanning = true;
  try {
    const state = await loadState();
    const result = enqueueUnreviewedFieldCycles({ queue: state.feedbackQueue, feedbackCycles: state.feedbackCycles || [] });
    if (!result.changed) return;
    await persistQueue(state, result.queue, { admittedCount: result.admitted.length });
    notify({ admitted_count: result.admitted.length });
  } finally { scanning = false; }
}

function entryMarkup(entry) {
  const stamp = entry.enqueued_at ? new Date(entry.enqueued_at).toLocaleString() : 'time unavailable';
  const evidence = (entry.evidence_refs || []).map((item) => item.schema).filter(Boolean).join(' · ') || 'field evidence';
  const status = String(entry.status || 'pending_review').replaceAll('_', ' ');
  return `<article class="queue-entry" data-field-review-entry="${esc(entry.cycle_id)}"><div class="queue-entry-head"><strong>Field · ${esc(status)}</strong><small>${esc(stamp)}</small></div><p>${esc(String(entry.turn?.work || '').slice(0, 320))}</p><p class="muted small">${esc(evidence)} · ${esc(entry.cycle_id)}</p>${entry.status === 'pending_review' ? `<div class="button-row"><button type="button" class="steward-commit" data-field-review-action="accepted" data-cycle-id="${esc(entry.cycle_id)}">Accept ✶</button><button type="button" class="quiet" data-field-review-action="archived" data-cycle-id="${esc(entry.cycle_id)}">Archive</button><button type="button" class="quiet danger" data-field-review-action="discarded" data-cycle-id="${esc(entry.cycle_id)}">Discard</button></div>` : `<p class="callout">Reviewed ${esc(entry.reviewed_by || '')}${entry.reviewed_at ? ` · ${esc(new Date(entry.reviewed_at).toLocaleString())}` : ''}</p>`}</article>`;
}

function renderKey(worldId, queue, entries) {
  return `${worldId || 'none'}:${queue?.updated_at || 'none'}:${entries.map((entry) => `${entry.cycle_id}:${entry.status}:${entry.review_receipt_id || 'none'}`).join('|')}`;
}

async function mount(message = '') {
  if (mounting) return;
  const title = document.querySelector('main.content h1')?.textContent?.trim();
  if (!REVIEW_ROOMS.has(title)) {
    document.querySelector('[data-field-review-gate]')?.remove();
    return;
  }
  mounting = true;
  try {
    const state = await loadState();
    const world = state.worlds.find((item) => item.id === state.activeWorldId) || state.worlds[0];
    const entries = fieldQueueEntries(state.feedbackQueue, world?.id);
    const pending = entries.filter((item) => item.status === 'pending_review');
    const key = renderKey(world?.id, state.feedbackQueue, entries);
    const existing = document.querySelector('[data-field-review-gate]');
    if (existing?.dataset.fieldReviewKey === key && !message) return;
    const roomNote = title === 'Relational Feedback Chamber'
      ? 'Field observations share this stewardship queue and remain visibly sourced as Field.'
      : 'Field observations enter the same stewardship queue used by relational Feedback.';
    const html = `<section class="panel feedback-queue" data-field-review-gate data-field-review-key="${esc(key)}"><div class="section-heading compact-heading"><div><p class="eyebrow">Field → shared stewardship gate</p><h2>Field observation review${pending.length ? ` · ${pending.length}` : ''}</h2><p class="muted">${esc(roomNote)} Review decides historical admission, not what you experienced.</p></div><span class="bai-topology-badge">${pending.length ? 'REVIEW' : 'CLEAR'}</span></div>${message ? `<p class="callout">${esc(message)}</p>` : ''}${entries.length ? entries.slice(0, 8).map(entryMarkup).join('') : '<p class="muted">No Field observation has entered the review gate yet.</p>'}</section>`;
    if (existing) existing.outerHTML = html;
    else document.querySelector('main.content')?.insertAdjacentHTML('beforeend', html);
  } finally { mounting = false; }
}

function schedule(delay = 90) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    timer = null;
    await scan();
    await mount();
  }, delay);
}

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-field-review-action]');
  if (!button) return;
  try {
    const state = await loadState();
    const result = reviewFieldCycle(state.feedbackQueue, button.dataset.cycleId, button.dataset.fieldReviewAction, { reviewedBy: 'Rowan' });
    await persistQueue(state, result.queue, { cycleId: button.dataset.cycleId, decision: button.dataset.fieldReviewAction });
    notify({ cycle_id: button.dataset.cycleId, decision: button.dataset.fieldReviewAction });
    await mount(`Field cycle ${button.dataset.cycleId} → ${button.dataset.fieldReviewAction}.`);
  } catch (error) {
    await mount(`Field review stopped: ${error.message}`);
  }
});

globalThis.addEventListener?.('arcsweep:receipts-updated', () => schedule(0));
for (const eventName of ['submit', 'click', 'change']) document.addEventListener(eventName, () => schedule(), true);
const observer = new MutationObserver(() => schedule());
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => schedule(0), { once: true });
else schedule(0);
