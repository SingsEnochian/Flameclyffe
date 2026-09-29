import './wish-grove-suggestion-grove.css';

import { MAGIC_BOOK_BINDING_KEY } from './magic-book-model.js';
import { CODEX_WISH_STORE_EVENT, getCodexWishStore } from './codex/codex-wish-store.js';
import { DEVELOPMENTAL_GOVERNANCE_TARGETS } from './codex/codex-developmental-governance.js';

export const WISH_GROVE_DEVELOPMENTAL_GOVERNANCE_SCHEMA = 'hearthweave.wish-grove-developmental-governance/v0.1';

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
  const id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}:${id}`;
}

function lines(value) {
  return String(value || '').split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
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

function setStatus(message, tone = 'success') {
  const node = grove()?.querySelector?.('[data-wish-grove-status]');
  if (!node) return;
  node.textContent = String(message || '');
  node.dataset.tone = tone;
}

function ringLabel(ring = {}) {
  const changed = typeof ring.whatChanged === 'string'
    ? ring.whatChanged
    : Object.entries(ring.whatChanged || {})
      .filter(([, values]) => Array.isArray(values) ? values.length : Boolean(values))
      .map(([key, values]) => `${key}: ${(Array.isArray(values) ? values : [values]).join(' · ')}`)
      .join('; ');
  return changed || ring.memoryClass || ring.ringId || 'developmental evidence';
}

function requestMarkup(request) {
  return [
    '<article class="wish-grove-suggestion">',
      '<header><div><p class="wish-grove-label">Governance change request</p><strong>' + esc(request.target) + '</strong></div><span>' + esc(request.status || 'prepared') + '</span></header>',
      '<p>' + esc(request.proposedChange) + '</p>',
      '<p class="wish-grove-suggestion-law">Prepared request only. It has not changed curriculum, training strategy, evaluation, field feedback, production, or authority.</p>',
      '<dl class="wish-grove-suggestion-payload">',
        '<div><dt>source rings</dt><dd>' + esc((request.sourceRingIds || []).join(' · ')) + '</dd></div>',
        '<div><dt>preserve</dt><dd>' + esc((request.preserve || []).join(' · ') || 'none recorded') + '</dd></div>',
        '<div><dt>reversibility</dt><dd>' + esc(request.reversibilityPlan || '') + '</dd></div>',
      '</dl>',
    '</article>',
  ].join('');
}

function proposalMarkup(proposal) {
  return [
    '<article class="wish-grove-suggestion">',
      '<header><div><p class="wish-grove-label">Governance proposal</p><strong>' + esc(proposal.target) + '</strong></div><span>proposal</span></header>',
      '<p>' + esc(proposal.proposedChange) + '</p>',
      '<p class="wish-grove-suggestion-rationale">' + esc(proposal.observation) + '</p>',
      '<p class="wish-grove-suggestion-law">Self-observation ≠ self-authority. Review the linked governance-change suggestion in Suggestion Grove.</p>',
    '</article>',
  ].join('');
}

function proposalForm(wishId, branch) {
  const rings = branch.developmentalMemory || [];
  if (!rings.length) return '';
  return [
    '<details>',
      '<summary>Propose a developmental governance change</summary>',
      '<form data-developmental-governance-form data-wish-id="' + esc(wishId) + '" data-branch-id="' + esc(branch.branchId) + '">',
        '<fieldset><legend>Developmental evidence</legend>',
          rings.map((ring) => [
            '<label><input type="checkbox" name="sourceRingId" value="' + esc(ring.ringId) + '"> ',
            '<strong>' + esc(ring.memoryClass || 'developmental-memory') + '</strong> · ' + esc(ringLabel(ring)),
            '</label>',
          ].join('')).join(''),
        '</fieldset>',
        '<label>Governance target<select name="target" required>' + DEVELOPMENTAL_GOVERNANCE_TARGETS.map((target) => '<option value="' + esc(target) + '">' + esc(target) + '</option>').join('') + '</select></label>',
        '<label>What pattern did the developmental evidence reveal?<textarea name="observation" rows="3" required maxlength="2000"></textarea></label>',
        '<label>Proposed change<textarea name="proposedChange" rows="3" required maxlength="2000"></textarea></label>',
        '<label>Expected effects<textarea name="expectedEffects" rows="2" placeholder="one per line"></textarea></label>',
        '<label>Possible regressions / risks<textarea name="risks" rows="2" placeholder="one per line"></textarea></label>',
        '<label>What must remain invariant?<textarea name="preserve" rows="2" placeholder="one per line"></textarea></label>',
        '<label>Scope<textarea name="scope" rows="2" placeholder="one bounded scope per line"></textarea></label>',
        '<label>Reversibility plan<textarea name="reversibilityPlan" rows="3" required maxlength="1800"></textarea></label>',
        '<p class="wish-grove-suggestion-law">This creates a proposal and a reviewable Suggestion Grove item. It does not change configuration, execute training, edit evaluation, alter field feedback, or grant authority.</p>',
        '<button type="submit">Propose governance change</button>',
      '</form>',
    '</details>',
  ].join('');
}

function panelMarkup(wish, branch) {
  const rings = branch.developmentalMemory || [];
  const proposals = branch.developmentalGovernanceProposals || [];
  const requests = branch.governanceChangeRequests || [];
  if (!rings.length && !proposals.length && !requests.length) return '';
  return [
    '<section class="wish-grove-suggestion-grove" data-developmental-governance="' + esc(WISH_GROVE_DEVELOPMENTAL_GOVERNANCE_SCHEMA) + '">',
      '<header><div><p class="wish-grove-label">Developmental Self-Governance</p><h5>What should learning reconsider?</h5></div><span>' + proposals.length + ' proposal' + (proposals.length === 1 ? '' : 's') + '</span></header>',
      '<p class="wish-grove-suggestion-intro">Developmental evidence may motivate a bounded proposal. Observation is not decision, proposal is not approval, approval is not application, and application is not proof of improvement.</p>',
      proposalForm(wish.wishId, branch),
      proposals.length ? '<div class="wish-grove-suggestion-list">' + proposals.map(proposalMarkup).join('') + '</div>' : '',
      requests.length ? '<div class="wish-grove-suggestion-list">' + requests.map(requestMarkup).join('') + '</div>' : '',
    '</section>',
  ].join('');
}

export function renderWishGroveDevelopmentalGovernance() {
  if (!active()) return false;
  const host = grove();
  if (!host) return false;
  const lineage = store().snapshot();
  for (const card of host.querySelectorAll('[data-lifecycle-branch-id]')) {
    card.querySelector?.('[data-developmental-governance]')?.remove?.();
  }
  for (const wish of lineage.wishes || []) {
    for (const branch of wish.possibilityBranches || []) {
      const markup = panelMarkup(wish, branch);
      if (!markup) continue;
      const card = [...host.querySelectorAll('[data-lifecycle-branch-id]')]
        .find((node) => node.dataset.lifecycleBranchId === branch.branchId);
      if (card) card.insertAdjacentHTML('beforeend', markup);
    }
  }
  return true;
}

function schedule() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    renderWishGroveDevelopmentalGovernance();
  });
}

function onSubmit(event) {
  const form = event.target?.closest?.('[data-developmental-governance-form]');
  if (!form || !grove()?.contains(form)) return;
  event.preventDefault();
  try {
    const data = new FormData(form);
    const sourceRingIds = [...form.querySelectorAll('input[name="sourceRingId"]:checked')].map((node) => node.value);
    if (!sourceRingIds.length) throw new Error('Select at least one developmental memory ring.');
    store().proposeDevelopmentalGovernanceChange(form.dataset.wishId, {
      branchId: form.dataset.branchId,
      proposalId: token('developmental-governance-proposal'),
      suggestionId: token('governance-suggestion'),
      target: String(data.get('target') || '').trim(),
      observation: String(data.get('observation') || '').trim(),
      sourceRingIds,
      proposedChange: String(data.get('proposedChange') || '').trim(),
      expectedEffects: lines(data.get('expectedEffects')),
      risks: lines(data.get('risks')),
      preserve: lines(data.get('preserve')),
      scope: lines(data.get('scope')),
      reversibilityPlan: String(data.get('reversibilityPlan') || '').trim(),
      proposedBy: 'steward-ui',
      createdAt: new Date().toISOString(),
      provenance: ['surface://universal-codex/wish-grove/developmental-governance'],
    });
    setStatus('Developmental governance proposal recorded and sent to Suggestion Grove. Nothing changed automatically.');
    form.reset();
  } catch (error) {
    setStatus(error?.message || String(error), 'error');
  }
}

export function installWishGroveDevelopmentalGovernance() {
  if (installed || !globalThis.document) return false;
  installed = true;
  globalThis.document.addEventListener('submit', onSubmit);
  globalThis.document.addEventListener(CODEX_WISH_STORE_EVENT, schedule);
  observer = new MutationObserver(schedule);
  observer.observe(globalThis.document.documentElement, { childList: true, subtree: true });
  schedule();
  return true;
}

if (typeof document !== 'undefined') installWishGroveDevelopmentalGovernance();
