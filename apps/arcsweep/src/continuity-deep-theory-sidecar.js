import { loadState, saveState } from './storage.js';
import { ensureContinuityEvidenceLedger } from './continuity-evidence-state.js';
import { createDeepTheoryCandidateFromContinuityEvidence } from './continuity-deep-theory-bridge.js';

let mounting = false;
let submitting = false;

function esc(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function isDeepObserverActive() {
  return Boolean(document.querySelector('.nav-button.active[data-room="deep-observer"]'));
}

function activeWorld(state) {
  return state.worlds?.find((world) => world.id === state.activeWorldId) || state.worlds?.[0] || null;
}

function continuityCandidates(state, worldId) {
  return (state.observatory?.theory_candidates || []).filter((candidate) => (
    candidate?.record?.domain === 'continuity-evidence'
    && (!worldId || candidate?.record?.title?.includes(worldId) || candidate?.source_world_id === worldId)
  ));
}

async function renderPanel(message = '') {
  const state = await loadState();
  const world = activeWorld(state);
  const ledger = ensureContinuityEvidenceLedger(state);
  const evidence = ledger.entries.filter((entry) => !world?.id || entry.world_id === world.id);
  const candidates = continuityCandidates(state, world?.id);
  const latest = candidates.at(-1) || null;
  return `<section class="panel continuity-theory-gate" data-continuity-theory-gate>
    <div class="section-heading compact-heading"><div><p class="eyebrow">Continuity Evidence → DEEPTheory</p><h2>Continuity Theory Candidate Gate</h2><p class="muted">Wrap the current receipted evidence slice as a reviewable DEEPTheory comparison. Candidate creation cannot accept theory, commit canon, or prove identity.</p></div></div>
    ${message ? `<p class="callout">${esc(message)}</p>` : ''}
    <dl class="facts"><div><dt>Evidence receipts</dt><dd>${evidence.length}</dd></div><div><dt>Queued candidates</dt><dd>${candidates.length}</dd></div><div><dt>World</dt><dd>${esc(world?.name || '—')}</dd></div></dl>
    <button type="button" data-continuity-theory-candidate ${evidence.length ? '' : 'disabled'}>Queue continuity DEEPTheory candidate</button>
    ${latest ? `<p class="muted">Latest: <code>${esc(latest.receipt_id)}</code> · human review required</p>` : '<p class="muted">No continuity evidence candidate has been queued for this world.</p>'}
  </section>`;
}

async function mount(message = '') {
  if (mounting || !isDeepObserverActive()) return;
  mounting = true;
  try {
    const html = await renderPanel(message);
    const existing = document.querySelector('[data-continuity-theory-gate]');
    if (existing) existing.outerHTML = html;
    else document.querySelector('main.content')?.insertAdjacentHTML('beforeend', html);
  } finally { mounting = false; }
}

async function queueCandidate(button) {
  if (submitting) return;
  submitting = true;
  button.disabled = true;
  try {
    const state = await loadState();
    const world = activeWorld(state);
    if (!world) throw new Error('No active world is available.');
    const ledger = ensureContinuityEvidenceLedger(state);
    const candidate = await createDeepTheoryCandidateFromContinuityEvidence({ ledger, worldId: world.id });
    state.observatory ||= {};
    state.observatory.theory_candidates ||= [];
    if (!state.observatory.theory_candidates.some((item) => item.record_fingerprint === candidate.record_fingerprint)) {
      state.observatory.theory_candidates = [...state.observatory.theory_candidates, { ...structuredClone(candidate), source_world_id: world.id }].slice(-24);
      await saveState(state, { reason: 'continuity-deep-theory-candidate', receipt_id: candidate.receipt_id });
      globalThis.dispatchEvent?.(new CustomEvent('arcsweep:receipts-updated', { detail: { continuity_theory: true } }));
    }
    await mount(`Queued ${candidate.receipt_id}. Human review remains required.`);
  } catch (error) {
    await mount(`DEEPTheory candidate stopped: ${error.message}`);
  } finally { submitting = false; }
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-continuity-theory-candidate]');
  if (button) void queueCandidate(button);
});

globalThis.addEventListener?.('arcsweep:continuity-evidence-updated', () => { void mount(); });
const observer = new MutationObserver(() => { void mount(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void mount(); }, { once: true });
else void mount();
