import {
  buildContradictionBundle,
  reviewCanonProposal,
  applyCanonPromotion,
} from './canon-intelligence-core.js';
import {
  CANON_INTELLIGENCE_EVENT,
  loadCanonIntelligenceState,
  saveCanonIntelligenceState,
  replaceCanonProposal,
  appendCanonPromotion,
  filterCanonProposals,
} from './canon-intelligence-store.js';

const ROOT_ID = 'arcsweep-canon-intelligence-live';
const esc = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
let filters = { worldId: '', status: '', comparison: '' };

export function renderCanonIntelligenceProposal(proposal) {
  const contradiction = buildContradictionBundle(proposal);
  const evidence = proposal.evidence.map((item) => `<li><code>${esc(item.evidence_id)}</code>${item.source_title ? ` · ${esc(item.source_title)}` : ''}${item.locator ? ` · ${esc(item.locator)}` : ''}</li>`).join('');
  return `<article class="canon-intelligence-card" data-proposal-id="${esc(proposal.proposal_id)}" data-status="${esc(proposal.status)}" data-comparison="${esc(proposal.comparison)}">
    <header><div><strong>${esc(proposal.target.entity_id)}</strong><small>${esc(proposal.target.field_key)} · ${esc(proposal.world_id)}</small></div><span>${esc(proposal.comparison)} · ${esc(proposal.status)}</span></header>
    <div class="canon-intelligence-values"><section><b>Existing canon</b><pre>${esc(JSON.stringify(proposal.existing_value, null, 2))}</pre></section><section><b>Proposed value</b><pre>${esc(JSON.stringify(proposal.proposed_value, null, 2))}</pre></section></div>
    <p>${esc(proposal.comparison_reason || '')}</p>
    <small>Proposed by ${esc(proposal.proposer?.id || 'unknown')}${proposal.confidence != null ? ` · confidence ${esc(proposal.confidence)}` : ''} · ${contradiction.requires_review ? 'review required' : 'review still explicit'}</small>
    <details><summary>Evidence (${proposal.evidence.length})</summary><ul>${evidence || '<li>No evidence receipts.</li>'}</ul></details>
    <div class="canon-intelligence-actions">
      <button type="button" data-canon-review="accept">Accept</button>
      <button type="button" class="quiet" data-canon-review="reject">Reject</button>
      <button type="button" class="quiet" data-canon-review="hold">Hold</button>
      <button type="button" class="quiet" data-canon-review="needs-more-evidence">Need evidence</button>
      <button type="button" class="quiet" data-canon-promote ${proposal.status === 'accepted' ? '' : 'disabled'}>Promote to canon</button>
    </div>
  </article>`;
}

function ensureStyles(doc) {
  if (doc.getElementById(`${ROOT_ID}-styles`)) return;
  const style = doc.createElement('style'); style.id = `${ROOT_ID}-styles`;
  style.textContent = `#${ROOT_ID}{position:fixed;right:1rem;bottom:1rem;z-index:68;width:min(34rem,calc(100vw - 2rem));font:inherit}.canon-intelligence-toggle{border-radius:999px;padding:.55rem .8rem}.canon-intelligence-panel{margin-top:.45rem;max-height:min(78vh,46rem);overflow:auto;padding:.75rem;border:1px solid color-mix(in srgb,var(--gold) 30%,transparent);border-radius:1rem;background:color-mix(in srgb,var(--panel-solid) 97%,black);box-shadow:0 .7rem 2.2rem rgb(0 0 0/.34)}.canon-intelligence-toolbar{display:grid;grid-template-columns:1fr 1fr 1fr;gap:.35rem;margin:.55rem 0}.canon-intelligence-list{display:grid;gap:.55rem}.canon-intelligence-card{padding:.6rem;border:1px solid color-mix(in srgb,var(--green) 20%,transparent);border-radius:.7rem}.canon-intelligence-card[data-comparison="conflict"]{border-color:color-mix(in srgb,#d78b78 65%,transparent)}.canon-intelligence-card header{display:flex;justify-content:space-between;gap:.5rem}.canon-intelligence-card header small{display:block;opacity:.68}.canon-intelligence-values{display:grid;grid-template-columns:1fr 1fr;gap:.4rem;margin:.45rem 0}.canon-intelligence-values section{min-width:0}.canon-intelligence-values pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:9rem;overflow:auto;font-size:.68rem}.canon-intelligence-actions{display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.45rem}@media(max-width:700px){#${ROOT_ID}{right:.6rem;bottom:7.7rem;width:calc(100vw - 1.2rem)}.canon-intelligence-values{grid-template-columns:1fr}.canon-intelligence-toolbar{grid-template-columns:1fr}}`;
  doc.head.append(style);
}

function render(root, storage) {
  const state = loadCanonIntelligenceState(storage);
  const visible = filterCanonProposals(state, filters);
  const list = root.querySelector('[data-canon-intelligence-list]');
  const count = root.querySelector('[data-canon-intelligence-count]');
  if (count) count.textContent = `${visible.length}/${state.proposals.length} proposals · ${state.promotions.length} promoted`;
  if (list) list.innerHTML = visible.length ? visible.map(renderCanonIntelligenceProposal).join('') : '<p class="muted">No Canon Intelligence proposals match this view.</p>';
}

export function installCanonIntelligenceLiveUi(doc = globalThis.document, storage = globalThis.localStorage) {
  if (!doc?.body) return;
  ensureStyles(doc);
  let root = doc.getElementById(ROOT_ID);
  if (!root) {
    root = doc.createElement('aside'); root.id = ROOT_ID; root.setAttribute('aria-label', 'Canon Intelligence live review');
    root.innerHTML = `<button type="button" class="canon-intelligence-toggle" aria-expanded="false">⌬ Canon Intelligence <small data-canon-intelligence-count></small></button><section class="canon-intelligence-panel" hidden><header><strong>Proposal & contradiction inbox</strong><small>Evidence → proposal → Steward review → canon</small></header><div class="canon-intelligence-toolbar"><input data-canon-filter-world placeholder="World id"/><select data-canon-filter-status><option value="">All statuses</option><option>pending</option><option>accepted</option><option>rejected</option><option>held</option><option value="needs-more-evidence">needs-more-evidence</option></select><select data-canon-filter-comparison><option value="">All relations</option><option>agree</option><option>extend</option><option>conflict</option><option>unknown</option></select></div><div class="canon-intelligence-list" data-canon-intelligence-list aria-live="polite"></div></section>`;
    doc.body.append(root);
  }
  const panel = root.querySelector('.canon-intelligence-panel'); const toggle = root.querySelector('.canon-intelligence-toggle');
  toggle?.addEventListener('click', () => { const open = panel.hidden; panel.hidden = !open; toggle.setAttribute('aria-expanded', String(open)); render(root, storage); });
  root.querySelector('[data-canon-filter-world]')?.addEventListener('input', (event) => { filters.worldId = event.target.value.trim(); render(root, storage); });
  root.querySelector('[data-canon-filter-status]')?.addEventListener('change', (event) => { filters.status = event.target.value; render(root, storage); });
  root.querySelector('[data-canon-filter-comparison]')?.addEventListener('change', (event) => { filters.comparison = event.target.value; render(root, storage); });
  root.addEventListener('click', async (event) => {
    const card = event.target.closest?.('[data-proposal-id]'); if (!card) return;
    const state = loadCanonIntelligenceState(storage); const proposal = state.proposals.find((item) => item.proposal_id === card.dataset.proposalId); if (!proposal) return;
    const action = event.target.closest?.('[data-canon-review]')?.dataset.canonReview;
    if (action) {
      const reviewed = reviewCanonProposal(proposal, { action, steward: 'Rowan' });
      saveCanonIntelligenceState(replaceCanonProposal(state, reviewed), storage, doc); render(root, storage); return;
    }
    if (event.target.closest?.('[data-canon-promote]') && proposal.status === 'accepted') {
      const mutator = globalThis.arcsweepCanonIntelligenceMutator;
      if (typeof mutator !== 'function') { doc.dispatchEvent(new CustomEvent('arcsweep:canon-intelligence-promotion-unavailable', { detail: { proposal_id: proposal.proposal_id } })); return; }
      const receipt = await applyCanonPromotion(proposal, { steward: 'Rowan', mutateCanon: mutator });
      saveCanonIntelligenceState(appendCanonPromotion(state, receipt), storage, doc); render(root, storage);
    }
  });
  doc.addEventListener(CANON_INTELLIGENCE_EVENT, () => render(root, storage));
  render(root, storage);
}

if (typeof document !== 'undefined') installCanonIntelligenceLiveUi();
