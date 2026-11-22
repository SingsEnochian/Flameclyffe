import './wish-grove-ai-university.css';

import { MAGIC_BOOK_BINDING_KEY } from './magic-book-model.js';
import { CODEX_WISH_STORE_EVENT, getCodexWishStore } from './codex/codex-wish-store.js';

export const WISH_GROVE_AI_UNIVERSITY_SCHEMA = 'hearthweave.wish-grove-ai-university/v0.1';

const ROOT_ID = 'arcsweep-magic-book';
const PAGE_ID = 'wish-grove';
let installed = false;
let observer = null;
let queued = false;

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function token(prefix) {
  const id = globalThis.crypto?.randomUUID?.()
    || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}:${id}`;
}

function active() {
  try {
    const raw = globalThis.localStorage?.getItem(MAGIC_BOOK_BINDING_KEY);
    return raw && JSON.parse(raw)?.active_page_id === PAGE_ID;
  } catch {
    return false;
  }
}

function grove() {
  return globalThis.document?.querySelector?.(`#${ROOT_ID} [data-wish-grove]`) || null;
}

function store() {
  return getCodexWishStore({ storage: globalThis.localStorage, target: globalThis.document });
}

function csv(value) {
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function line(label, values) {
  return (values || []).length ? '<p><b>' + esc(label) + ':</b> ' + esc(values.join(' · ')) + '</p>' : '';
}

function resultMarkup(result) {
  return [
    '<article class="wish-grove-aiu-result">',
      '<header><strong>' + esc(result.outcome || 'observed') + '</strong><small>' + esc(result.createdAt || '') + '</small></header>',
      '<p>' + esc(result.observation || '') + '</p>',
      line('Uncertainties', result.uncertainties),
      line('Affected relationships', result.affectedRelationships),
      line('Evidence', result.evidenceRefs),
      line('Questions opened', result.questionsOpened),
      line('Receipts', result.receiptRefs),
      '<p class="wish-grove-aiu-note">Evidence returned. Authority did not.</p>',
    '</article>',
  ].join('');
}

function proposalMarkup(wishId, branchId, proposal) {
  return [
    '<article class="wish-grove-aiu-proposal" data-branch-proposal-id="' + esc(proposal.proposalId) + '">',
      '<header>',
        '<div><strong>' + esc(proposal.title) + '</strong><small>' + esc(proposal.proposalId) + '</small></div>',
        '<span>' + esc(proposal.status || 'proposed') + '</span>',
      '</header>',
      proposal.discriminatingQuestion ? '<p><b>Discriminating question:</b> ' + esc(proposal.discriminatingQuestion) + '</p>' : '',
      '<p><b>Hypothesis:</b> ' + esc(proposal.hypothesis) + '</p>',
      '<p><b>Method:</b> ' + esc(proposal.method) + '</p>',
      '<div class="wish-grove-aiu-badges"><span>sandbox</span><span>synthetic</span><span>no production effects</span><span>no execution permission</span><span>no winner selection</span></div>',
      '<p><b>Required authority:</b> ' + esc(proposal.requiredAuthority || 'sandbox-only') + '</p>',
      line('Assumptions held constant', proposal.assumptionsHeldConstant),
      line('Evidence criteria', proposal.evidenceCriteria?.length ? proposal.evidenceCriteria : proposal.successSignals),
      line('Relationships at boundary', proposal.relationshipsAtBoundary),
      line('Continuity anchors at boundary', proposal.continuityAnchorsAtBoundary),
      line('Out of scope', proposal.outOfScope),
      line('Questions kept open', proposal.questions),
      (proposal.results || []).length ? '<div class="wish-grove-aiu-results">' + proposal.results.map(resultMarkup).join('') + '</div>' : '',
      '<details>',
        '<summary>Attach returned sandbox evidence</summary>',
        '<form data-aiu-branch-form="result" data-wish-id="' + esc(wishId) + '" data-branch-id="' + esc(branchId) + '" data-proposal-id="' + esc(proposal.proposalId) + '">',
          '<label>Outcome<select name="outcome"><option value="observed">Observed</option><option value="worked">Worked</option><option value="did-not-work">Did not work</option><option value="mixed">Mixed</option><option value="inconclusive">Inconclusive</option></select></label>',
          '<label>Observation<textarea name="observation" required rows="2" maxlength="1800" placeholder="What did the sandbox actually return?"></textarea></label>',
          '<label>Uncertainties<input name="uncertainties" maxlength="1200" placeholder="comma-separated uncertainties still open"></label>',
          '<label>Affected relationships<input name="relationships" maxlength="1200" placeholder="comma-separated relationship refs"></label>',
          '<label>Evidence refs<input name="evidence" maxlength="1200" placeholder="comma-separated evidence refs"></label>',
          '<label>Questions opened<input name="questions" maxlength="1200" placeholder="comma-separated new questions"></label>',
          '<label>Receipt refs<input name="receipts" maxlength="1200" placeholder="comma-separated sandbox/test receipts"></label>',
          '<button type="submit">Attach evidence</button>',
        '</form>',
      '</details>',
    '</article>',
  ].join('');
}

function panelMarkup(wishId, branch) {
  const proposals = branch.experimentProposals || [];
  return [
    '<section class="wish-grove-aiu" data-wish-grove-ai-university="' + esc(WISH_GROVE_AI_UNIVERSITY_SCHEMA) + '">',
      '<header><div><p class="wish-grove-label">AI University</p><h5>Teach this possibility by experiment</h5></div><span>' + proposals.length + ' proposals</span></header>',
      '<p class="wish-grove-aiu-note">A proposal is a question with a method and explicit boundaries. Saving it does not start an experiment, select a branch, grant authority, or create production effects.</p>',
      proposals.length ? '<div class="wish-grove-aiu-list">' + proposals.map((proposal) => proposalMarkup(wishId, branch.branchId, proposal)).join('') + '</div>' : '',
      '<details>',
        '<summary>Propose a discriminating sandbox experiment</summary>',
        '<form data-aiu-branch-form="proposal" data-wish-id="' + esc(wishId) + '" data-branch-id="' + esc(branch.branchId) + '">',
          '<label>Title<input name="title" required maxlength="220" placeholder="Test one uncertainty in this branch"></label>',
          '<label>Discriminating question<textarea name="discriminatingQuestion" rows="2" maxlength="1400" placeholder="What could this test help distinguish?"></textarea></label>',
          '<label>Hypothesis<textarea name="hypothesis" required rows="2" maxlength="1400" placeholder="If we try X in a sealed sandbox, we expect Y…"></textarea></label>',
          '<label>Method<textarea name="method" required rows="3" maxlength="1800" placeholder="A reversible, synthetic method with no production effects."></textarea></label>',
          '<label>Assumptions held constant<input name="assumptions" maxlength="1200" placeholder="comma-separated held conditions"></label>',
          '<label>Evidence criteria<input name="signals" maxlength="1200" placeholder="comma-separated observable signals"></label>',
          '<label>Relationships at the boundary<input name="relationships" maxlength="1200" placeholder="comma-separated relationship refs"></label>',
          '<label>Continuity anchors at the boundary<input name="anchors" maxlength="1200" placeholder="comma-separated continuity refs"></label>',
          '<label>Out of scope<input name="outOfScope" maxlength="1200" placeholder="what this test cannot establish"></label>',
          '<label>Questions to keep open<input name="questions" maxlength="1200" placeholder="comma-separated questions"></label>',
          '<button type="submit">Save sandbox proposal</button>',
        '</form>',
      '</details>',
    '</section>',
  ].join('');
}

function setStatus(message, tone = 'success') {
  const node = grove()?.querySelector?.('[data-wish-grove-status]');
  if (!node) return;
  node.textContent = String(message || '');
  node.dataset.tone = tone;
}

export function renderWishGroveAIUniversity() {
  if (!active()) return false;
  const host = grove();
  if (!host) return false;
  const lineage = store().snapshot();
  for (const wish of lineage.wishes || []) {
    for (const branch of wish.possibilityBranches || []) {
      const card = [...host.querySelectorAll('[data-lifecycle-branch-id]')]
        .find((node) => node.dataset.lifecycleBranchId === branch.branchId);
      if (!card) continue;
      card.querySelector?.('[data-wish-grove-ai-university]')?.remove?.();
      card.insertAdjacentHTML('beforeend', panelMarkup(wish.wishId, branch));
    }
  }
  return true;
}

function schedule() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    renderWishGroveAIUniversity();
  });
}

function submitProposal(form) {
  const data = new FormData(form);
  const signals = csv(data.get('signals'));
  store().proposeBranchExperiment(form.dataset.wishId, {
    branchId: form.dataset.branchId,
    proposalId: token('branch-experiment'),
    title: String(data.get('title') || '').trim(),
    discriminatingQuestion: String(data.get('discriminatingQuestion') || '').trim(),
    hypothesis: String(data.get('hypothesis') || '').trim(),
    method: String(data.get('method') || '').trim(),
    assumptionsHeldConstant: csv(data.get('assumptions')),
    successSignals: signals,
    evidenceCriteria: signals,
    relationshipsAtBoundary: csv(data.get('relationships')),
    continuityAnchorsAtBoundary: csv(data.get('anchors')),
    outOfScope: csv(data.get('outOfScope')),
    requiredAuthority: 'sandbox-only',
    questions: csv(data.get('questions')),
    createdAt: new Date().toISOString(),
    provenance: ['surface://universal-codex/wish-grove/ai-university'],
  });
  setStatus('Discriminating sandbox experiment proposed. Nothing was executed and no branch was selected.');
}

function submitResult(form) {
  const data = new FormData(form);
  store().recordBranchExperimentResult(form.dataset.wishId, {
    branchId: form.dataset.branchId,
    proposalId: form.dataset.proposalId,
    resultId: token('branch-experiment-result'),
    outcome: String(data.get('outcome') || 'observed'),
    observation: String(data.get('observation') || '').trim(),
    uncertainties: csv(data.get('uncertainties')),
    affectedRelationships: csv(data.get('relationships')),
    evidenceRefs: csv(data.get('evidence')),
    questionsOpened: csv(data.get('questions')),
    receiptRefs: csv(data.get('receipts')),
    createdAt: new Date().toISOString(),
    provenance: ['surface://universal-codex/wish-grove/ai-university/result'],
  });
  setStatus('Sandbox evidence attached to the exact branch proposal. The evidence did not grant authority.');
}

function onSubmit(event) {
  const form = event.target?.closest?.('[data-aiu-branch-form]');
  if (!form || !grove()?.contains(form)) return;
  event.preventDefault();
  try {
    if (form.dataset.aiuBranchForm === 'proposal') submitProposal(form);
    else if (form.dataset.aiuBranchForm === 'result') submitResult(form);
    else return;
    form.reset();
    schedule();
  } catch (error) {
    setStatus(error?.message || String(error), 'error');
  }
}

export function installWishGroveAIUniversity() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener(CODEX_WISH_STORE_EVENT, schedule);
  document.addEventListener('arcsweep:magic-book-ready', schedule);
  document.addEventListener('arcsweep:magic-book-receipt', schedule);
  document.addEventListener('submit', onSubmit);
  observer = new MutationObserver(() => {
    if (!active() || !grove()) return;
    const lifecycleCards = [...grove().querySelectorAll('[data-lifecycle-branch-id]')];
    if (lifecycleCards.some((card) => !card.querySelector('[data-wish-grove-ai-university]'))) schedule();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  schedule();
}

if (typeof document !== 'undefined') installWishGroveAIUniversity();
