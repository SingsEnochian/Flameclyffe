import { loadState } from './storage.js';
import { reviewDeepTheoryCandidate } from './deep-theory-review.js';
import { createDeepTimeRecordFromAcceptedFeedback, buildDeepTimeWindow } from './deep-time-bridge.js';
import { createTheoryGroundedAcceptanceAdvice } from './theory-grounded-acceptance-advisor.js';

const STORE_KEY = 'hearthgate.arcsweep.domain-control-bench.v1';
const FEEDBACK_QUEUE_KEY = 'arcsweep.feedback-cycle-queue/v1';
const MAX_REVIEWS = 24;
const MAX_ADVICE = 24;
let mounting = false;
let fallback = { version: 1, theory_candidates: [], theory_reviews: [], deep_time_records: [], advisor_receipts: [] };

function esc(value = '') { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
function readStore() {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(STORE_KEY) || 'null');
    if (parsed?.version === 1) {
      parsed.theory_candidates ||= [];
      parsed.theory_reviews ||= [];
      parsed.deep_time_records ||= [];
      parsed.advisor_receipts ||= [];
      parsed.custom_profiles ||= [];
      parsed.sweeps ||= [];
      return parsed;
    }
  } catch {}
  return structuredClone(fallback);
}
function writeStore(store) { fallback = structuredClone(store); try { globalThis.localStorage?.setItem(STORE_KEY, JSON.stringify(store)); } catch {} }
function readFeedbackQueue() { try { return JSON.parse(globalThis.localStorage?.getItem(FEEDBACK_QUEUE_KEY) || 'null') || { entries: {} }; } catch { return { entries: {} }; } }
function latestCandidate(store) { return store.theory_candidates?.at(-1) || null; }
function reviewForCandidate(store, candidate) { return candidate ? [...(store.theory_reviews || [])].reverse().find((review) => review.source_candidate_receipt_id === candidate.receipt_id) || null : null; }
function acceptedReview(store) { return [...(store.theory_reviews || [])].reverse().find((review) => review.decision === 'accepted') || null; }

async function feedbackContext() {
  const state = await loadState();
  const world = state.worlds.find((item) => item.id === state.activeWorldId) || state.worlds[0] || null;
  const cycles = (state.feedbackCycles || []).filter((cycle) => cycle.world?.id === world?.id);
  const queue = readFeedbackQueue();
  const acceptedEntries = Object.values(queue.entries || {}).filter((entry) => entry.status === 'accepted' && entry.world?.id === world?.id);
  return { world, cycles, acceptedEntries };
}

function signature(store, context) {
  const candidate = latestCandidate(store);
  const review = reviewForCandidate(store, candidate);
  const advice = store.advisor_receipts?.at(-1) || null;
  return `${candidate?.receipt_id || 'none'}:${review?.receipt_id || 'none'}:${store.deep_time_records?.length || 0}:${advice?.receipt_id || 'none'}:${context.acceptedEntries.length}`;
}

function render(store, context, message = '') {
  const candidate = latestCandidate(store);
  const review = reviewForCandidate(store, candidate);
  const accepted = acceptedReview(store);
  const worldRecords = (store.deep_time_records || []).filter((record) => record.world_id === context.world?.id);
  const window = buildDeepTimeWindow(worldRecords, { minimumRecords: 3 });
  const advice = store.advisor_receipts?.at(-1) || null;
  const key = signature(store, context);
  return `<section class="panel theory-review-advisor" data-theory-review-advisor data-theory-review-key="${esc(key)}">
    <div class="section-heading compact-heading"><div><p class="eyebrow">Review → Time → Advice</p><h2>DEEPTheory Review & Acceptance Advisor</h2><p class="muted">An analytical candidate can be accepted only by explicit review. Accepted feedback can enter DEEPTime. The advisor may recommend a gate; it never accepts a state for you.</p></div></div>
    ${message ? `<p class="callout">${esc(message)}</p>` : ''}
    <div class="grid two compact-grid">
      <article class="theory-review-card"><p class="eyebrow">Theory review</p>${candidate ? `<strong>${esc(candidate.record.title)}</strong><small>${esc(candidate.record.domain)} · ${esc(candidate.record.status)}</small>${review ? `<p><b>${esc(review.decision)}</b> by ${esc(review.reviewed_by)}</p><p class="muted">${esc(review.note)}</p>` : `<label>Reviewer<input data-theory-reviewer value="Rowan" /></label><label>Review note<input data-theory-review-note placeholder="Why this analytical model is or is not admitted." /></label><div class="button-row"><button type="button" data-theory-review-action="reviewed">Mark reviewed</button><button type="button" data-theory-review-action="accepted">Accept analytical model</button><button type="button" class="quiet" data-theory-review-action="retired">Retire</button></div>`}` : '<p class="muted">Create a DEEPTheory candidate from a Domain Control sweep first.</p>'}</article>
      <article class="theory-review-card"><p class="eyebrow">DEEPTime window</p><strong>${esc(context.world?.name || 'No active world')}</strong><p>${context.acceptedEntries.length} human-accepted feedback cycle${context.acceptedEntries.length === 1 ? '' : 's'} available · ${worldRecords.length} DEEPTime record${worldRecords.length === 1 ? '' : 's'} built.</p><p class="muted">${window.sufficient ? `Window ${esc(window.sequence_id)} · λ ${window.lambda_start}→${window.lambda_end}` : 'At least three accepted temporal records are required before the advisor calls coverage sufficient.'}</p><button type="button" data-deep-time-action="build" ${context.acceptedEntries.length ? '' : 'disabled'}>Build / extend DEEPTime from accepted feedback</button></article>
    </div>
    <article class="theory-advisor-card"><p class="eyebrow">Theory-Grounded Acceptance Advisor</p>${accepted ? `<p>Accepted theory: <b>${esc(accepted.reviewed_record.title)}</b> · domain <code>${esc(accepted.reviewed_record.domain)}</code></p><p class="muted">Current accepted-feedback DEEPTime context is <code>arcsweep-feedback</code>. Cross-domain application is refused unless a later explicit mapping receipt bridges them.</p><button type="button" data-advisor-action="run">Run advisor against current DEEPTime window</button>` : '<p class="muted">No accepted DEEPTheory review is available yet.</p>'}${advice ? `<dl class="facts"><div><dt>Recommendation</dt><dd>${esc(advice.recommendation.status)}</dd></div><div><dt>Confidence</dt><dd>${Number(advice.recommendation.confidence).toFixed(3)}</dd></div><div><dt>Temporal coverage</dt><dd>${advice.deep_time_window.record_ids.length} records</dd></div><div><dt>Auto-accept</dt><dd>never</dd></div><div><dt>Receipt</dt><dd>${esc(advice.receipt_id)}</dd></div></dl><p class="muted">${esc(advice.recommendation.rationale)}</p>` : ''}</article>
  </section>`;
}

function injectStyle() {
  if (document.querySelector('#theory-review-advisor-style')) return;
  const style = document.createElement('style');
  style.id = 'theory-review-advisor-style';
  style.textContent = `.theory-review-advisor{margin-top:1rem}.theory-review-card,.theory-advisor-card{display:flex;flex-direction:column;gap:.45rem;padding:.9rem 1rem;border:1px solid color-mix(in srgb,var(--gold) 22%,transparent);border-radius:12px}.theory-advisor-card{margin-top:.8rem}.theory-review-card small{opacity:.72}`;
  document.head.appendChild(style);
}

async function mount(message = '') {
  if (mounting) return;
  const title = document.querySelector('main.content h1')?.textContent?.trim();
  if (!['Relational Feedback Chamber', 'Field · DEEP Observer'].includes(title)) { document.querySelector('[data-theory-review-advisor]')?.remove(); return; }
  mounting = true;
  try {
    injectStyle();
    const store = readStore();
    const context = await feedbackContext();
    const existing = document.querySelector('[data-theory-review-advisor]');
    const key = signature(store, context);
    if (!message && existing?.dataset.theoryReviewKey === key) return;
    if (existing) existing.outerHTML = render(store, context, message);
    else document.querySelector('main.content')?.insertAdjacentHTML('beforeend', render(store, context, message));
  } finally { mounting = false; }
}

document.addEventListener('click', async (event) => {
  const reviewButton = event.target.closest('[data-theory-review-action]');
  if (reviewButton) {
    try {
      const panel = reviewButton.closest('[data-theory-review-advisor]');
      const store = readStore();
      const candidate = latestCandidate(store);
      if (!candidate) throw new Error('No candidate is available.');
      if (reviewForCandidate(store, candidate)) throw new Error('This candidate already has a review receipt.');
      const review = await reviewDeepTheoryCandidate({
        candidate,
        decision: reviewButton.dataset.theoryReviewAction,
        reviewedBy: panel.querySelector('[data-theory-reviewer]')?.value,
        note: panel.querySelector('[data-theory-review-note]')?.value,
      });
      store.theory_reviews = [...(store.theory_reviews || []), structuredClone(review)].slice(-MAX_REVIEWS);
      writeStore(store);
      await mount(`Theory review receipted as ${review.receipt_id}. Source candidate remains immutable.`);
    } catch (error) { await mount(`Theory review stopped: ${error.message}`); }
    return;
  }

  const deepTimeButton = event.target.closest('[data-deep-time-action="build"]');
  if (deepTimeButton) {
    try {
      const store = readStore();
      const { world, cycles, acceptedEntries } = await feedbackContext();
      const byCycle = new Map(cycles.map((cycle) => [cycle.cycle_id, cycle]));
      const existingIds = new Set((store.deep_time_records || []).map((record) => record.provenance?.observation_run_id));
      let records = (store.deep_time_records || []).filter((record) => record.world_id === world.id).sort((a, b) => Number(a.lambda) - Number(b.lambda));
      let previous = records.at(-1) || null;
      let added = 0;
      const entries = [...acceptedEntries].sort((a, b) => String(a.reviewed_at || '').localeCompare(String(b.reviewed_at || '')));
      for (const entry of entries) {
        if (existingIds.has(entry.cycle_id)) continue;
        const cycle = byCycle.get(entry.cycle_id);
        if (!cycle) continue;
        const record = await createDeepTimeRecordFromAcceptedFeedback({ cycle, acceptedQueueEntry: entry, previousRecord: previous });
        store.deep_time_records.push(structuredClone(record));
        previous = record;
        added += 1;
      }
      writeStore(store);
      await mount(`DEEPTime extended by ${added} accepted record${added === 1 ? '' : 's'}. Unmatched accepted queue summaries were left untouched.`);
    } catch (error) { await mount(`DEEPTime bridge stopped: ${error.message}`); }
    return;
  }

  const advisorButton = event.target.closest('[data-advisor-action="run"]');
  if (!advisorButton) return;
  try {
    const store = readStore();
    const review = acceptedReview(store);
    if (!review) throw new Error('An accepted DEEPTheory review is required.');
    const { world } = await feedbackContext();
    const records = (store.deep_time_records || []).filter((record) => record.world_id === world.id).sort((a, b) => Number(a.lambda) - Number(b.lambda));
    const advice = await createTheoryGroundedAcceptanceAdvice({ theoryReviewReceipt: review, deepTimeRecords: records, contextDomain: 'arcsweep-feedback' });
    store.advisor_receipts = [...(store.advisor_receipts || []), structuredClone(advice)].slice(-MAX_ADVICE);
    writeStore(store);
    await mount(`Advisor receipted ${advice.recommendation.status}. It did not accept or rewrite any state.`);
  } catch (error) { await mount(`Acceptance advisor stopped: ${error.message}`); }
});

const observer = new MutationObserver(() => { void mount(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void mount(); }, { once: true });
else void mount();
