import { createDeepTheoryCandidateFromDomainSweep } from './deep-theory-bridge.js';

const STORE_KEY = 'hearthgate.arcsweep.domain-control-bench.v1';
const MAX_CANDIDATES = 24;
let mounting = false;
let fallback = { version: 1, custom_profiles: [], sweeps: [], theory_candidates: [], active_profile_id: null };

function esc(value = '') {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function readStore() {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(STORE_KEY) || 'null');
    if (parsed?.version === 1 && Array.isArray(parsed.sweeps)) {
      parsed.custom_profiles ||= [];
      parsed.theory_candidates ||= [];
      return parsed;
    }
  } catch {}
  return structuredClone(fallback);
}

function writeStore(store) {
  fallback = structuredClone(store);
  try { globalThis.localStorage?.setItem(STORE_KEY, JSON.stringify(store)); } catch {}
}

function latestSweep(store) {
  const profileId = store.active_profile_id;
  return [...(store.sweeps || [])].reverse().find((sweep) => !profileId || sweep.profile?.profile_id === profileId)
    || store.sweeps?.at(-1)
    || null;
}

function candidateForSweep(store, sweep) {
  if (!sweep) return null;
  return [...(store.theory_candidates || [])].reverse().find((candidate) => candidate.source_sweep_id === sweep.sweep_id) || null;
}

function renderCandidate(candidate) {
  if (!candidate) return '<p class="muted">This sweep has not yet been wrapped as a DEEPTheory candidate.</p>';
  const record = candidate.record;
  return `<article class="theory-candidate-card"><div><p class="eyebrow">Candidate receipt</p><strong>${esc(record.title)}</strong><small>${esc(record.domain)} · ${esc(record.theory_kind)} · ${esc(record.status)}</small></div><dl class="facts"><div><dt>Findings</dt><dd>${record.findings.length}</dd></div><div><dt>Model</dt><dd>${esc(record.models[0]?.name || '—')}</dd></div><div><dt>Physical claim</dt><dd>${record.authority.physical_claim ? 'yes' : 'no'}</dd></div><div><dt>Human review</dt><dd>${record.review.human_review_required ? 'required' : 'not required'}</dd></div><div><dt>Candidate ID</dt><dd>${esc(record.id)}</dd></div><div><dt>Receipt</dt><dd>${esc(candidate.receipt_id)}</dd></div></dl></article>`;
}

function render(store, message = '') {
  const sweep = latestSweep(store);
  const candidate = candidateForSweep(store, sweep);
  const latestCandidate = store.theory_candidates?.at(-1) || null;
  const signature = `${sweep?.sweep_id || 'none'}:${candidate?.receipt_id || 'none'}:${store.theory_candidates?.length || 0}`;
  return `<section class="panel deep-theory-gate" data-deep-theory-gate data-theory-gate-key="${esc(signature)}"><div class="section-heading compact-heading"><div><p class="eyebrow">Theory identifies the pattern</p><h2>DEEPTheory Candidate Gate</h2><p class="muted">Domain Control sweeps enter DEEPTheory as reviewable analytical candidates. The source sweep stays immutable; candidate creation does not accept a theory, make a physical claim, or commit canon.</p></div><span class="bai-topology-badge">${store.theory_candidates?.length || 0} queued</span></div>${message ? `<p class="callout">${esc(message)}</p>` : ''}${sweep ? `<div class="theory-source-sweep"><p><b>${esc(sweep.profile.name)}</b> · ${esc(sweep.summary.topology_state)} · sweep ${esc(sweep.sweep_id)}</p><p class="muted">${esc(sweep.configuration.swept_label)} · ${sweep.hysteresis.detected ? `hysteresis witnessed at ${sweep.hysteresis.witness_count} matched samples` : 'no hysteresis witness in this sampled path'}</p><button type="button" data-theory-action="candidate" ${candidate ? 'disabled' : ''}>${candidate ? 'Candidate already receipted' : 'Create DEEPTheory candidate'}</button></div>${renderCandidate(candidate)}` : '<p class="muted">Run a Domain Control sweep first. The Theory gate will not invent a source run.</p>'}${latestCandidate && (!candidate || latestCandidate.receipt_id !== candidate.receipt_id) ? `<p class="muted">Latest queued candidate: ${esc(latestCandidate.record?.title || latestCandidate.receipt_id)}</p>` : ''}</section>`;
}

function injectStyle() {
  if (document.querySelector('#deep-theory-gate-style')) return;
  const style = document.createElement('style');
  style.id = 'deep-theory-gate-style';
  style.textContent = `.deep-theory-gate{margin-top:1rem}.theory-source-sweep,.theory-candidate-card{margin-top:.8rem;padding:.9rem 1rem;border:1px solid color-mix(in srgb,var(--gold) 22%,transparent);border-radius:12px}.theory-candidate-card>div{display:flex;flex-direction:column;gap:.2rem}.theory-candidate-card small{opacity:.7}`;
  document.head.appendChild(style);
}

function signature(store) {
  const sweep = latestSweep(store);
  const candidate = candidateForSweep(store, sweep);
  return `${sweep?.sweep_id || 'none'}:${candidate?.receipt_id || 'none'}:${store.theory_candidates?.length || 0}`;
}

async function mount() {
  if (mounting) return;
  const title = document.querySelector('main.content h1')?.textContent?.trim();
  if (!['Relational Feedback Chamber', 'Field · DEEP Observer'].includes(title)) {
    document.querySelector('[data-deep-theory-gate]')?.remove();
    return;
  }
  mounting = true;
  try {
    injectStyle();
    const store = readStore();
    const existing = document.querySelector('[data-deep-theory-gate]');
    const key = signature(store);
    if (existing?.dataset.theoryGateKey === key) return;
    if (existing) existing.outerHTML = render(store);
    else document.querySelector('main.content')?.insertAdjacentHTML('beforeend', render(store));
  } finally {
    mounting = false;
  }
}

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-theory-action="candidate"]');
  if (!button) return;
  button.disabled = true;
  const panel = button.closest('[data-deep-theory-gate]');
  try {
    const store = readStore();
    const sweep = latestSweep(store);
    if (!sweep) throw new Error('No domain-control sweep is available.');
    const existing = candidateForSweep(store, sweep);
    if (existing) throw new Error('This sweep already has a DEEPTheory candidate receipt.');
    const candidate = await createDeepTheoryCandidateFromDomainSweep({ sweep });
    store.theory_candidates = [...(store.theory_candidates || []), structuredClone(candidate)].slice(-MAX_CANDIDATES);
    writeStore(store);
    if (panel) panel.outerHTML = render(store, `Queued ${candidate.record.id} for human theory review. Source sweep remains unchanged.`);
  } catch (error) {
    const output = panel?.querySelector('.callout') || document.createElement('p');
    output.className = 'callout';
    output.textContent = `DEEPTheory candidate stopped: ${error.message}`;
    if (panel && !output.parentElement) panel.prepend(output);
    button.disabled = false;
  }
});

const observer = new MutationObserver(() => { void mount(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void mount(); }, { once: true });
else void mount();
