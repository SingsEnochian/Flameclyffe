import './wish-grove-suggestion-grove.css';

import { MAGIC_BOOK_BINDING_KEY } from './magic-book-model.js';
import { CODEX_WISH_STORE_EVENT, getCodexWishStore } from './codex/codex-wish-store.js';
import { branchSuggestionSummary } from './codex/codex-suggestion-grove.js';

export const WISH_GROVE_SUGGESTION_SCHEMA = 'hearthweave.wish-grove-suggestion-grove/v0.1';

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

function payloadMarkup(payload = {}) {
  const rows = Object.entries(payload || {}).filter(([, value]) => value != null && String(value).trim() !== '');
  if (!rows.length) return '';
  return '<dl class="wish-grove-suggestion-payload">' + rows.map(([key, value]) => (
    '<div><dt>' + esc(key) + '</dt><dd>' + esc(Array.isArray(value) ? value.join(' · ') : typeof value === 'object' ? JSON.stringify(value) : value) + '</dd></div>'
  )).join('') + '</dl>';
}

function decisionTrail(suggestion) {
  const rows = suggestion.decisionHistory || [];
  if (!rows.length) return '';
  return '<ol class="wish-grove-suggestion-decisions">' + rows.map((row) => [
    '<li>',
      '<strong>' + esc(row.decision) + '</strong>',
      row.reason ? '<span>' + esc(row.reason) + '</span>' : '',
      '<small>' + esc(row.decidedBy || '') + ' · ' + esc(row.createdAt || '') + '</small>',
    '</li>',
  ].join('')).join('') + '</ol>';
}

function materialisationTrail(suggestion) {
  const rows = suggestion.materialisationHistory || [];
  if (!rows.length) return '';
  return '<ol class="wish-grove-suggestion-materialisations">' + rows.map((row) => [
    '<li>',
      '<strong>Materialised</strong>',
      '<span>' + esc(row.nativeRef || '') + '</span>',
      '<small>' + esc(row.materialisedBy || '') + ' · ' + esc(row.createdAt || '') + '</small>',
    '</li>',
  ].join('')).join('') + '</ol>';
}

function reflectionTrail(branch, suggestion) {
  const rows = (branch.learningReflections || []).filter((row) => row.sourceSuggestionId === suggestion.suggestionId);
  if (!rows.length) return '';
  return '<ol class="wish-grove-learning-reflections">' + rows.map((row) => [
    '<li>',
      '<strong>' + esc(row.whatChanged || 'Reflection') + '</strong>',
      row.surprises?.length ? '<span>Surprise: ' + esc(row.surprises.join(' · ')) + '</span>' : '',
      row.deservesAnotherLook?.length ? '<span>Another look: ' + esc(row.deservesAnotherLook.join(' · ')) + '</span>' : '',
      '<small>' + esc(row.reflectedBy || '') + ' · ' + esc(row.createdAt || '') + '</small>',
    '</li>',
  ].join('')).join('') + '</ol>';
}

function materialiseForm(wishId, branchId, suggestion) {
  if (suggestion.status !== 'accepted' || suggestion.applied === true) return '';
  return [
    '<details class="wish-grove-suggestion-materialise">',
      '<summary>Materialise accepted suggestion</summary>',
      '<form data-suggestion-materialise-form data-wish-id="' + esc(wishId) + '" data-branch-id="' + esc(branchId) + '" data-suggestion-id="' + esc(suggestion.suggestionId) + '">',
        '<label>Materialisation note<textarea name="reason" rows="2" maxlength="1000" placeholder="Why turn this accepted suggestion into its native Codex contract now?"></textarea></label>',
        '<label class="wish-grove-suggestion-consent"><input type="checkbox" name="materialise" value="yes" required> I authorise materialising this accepted suggestion into its native Codex contract. This does not grant execution, production, external-write, canon-promotion, or authority-expansion permission.</label>',
        '<button type="submit">Materialise into native contract</button>',
      '</form>',
    '</details>',
  ].join('');
}

function reflectionForm(wishId, branchId, suggestion) {
  if (suggestion.applied !== true || !suggestion.materialisationId) return '';
  return [
    '<details class="wish-grove-learning-reflection">',
      '<summary>Record learning reflection</summary>',
      '<form data-learning-reflection-form data-wish-id="' + esc(wishId) + '" data-branch-id="' + esc(branchId) + '" data-suggestion-id="' + esc(suggestion.suggestionId) + '" data-materialisation-id="' + esc(suggestion.materialisationId) + '">',
        '<label>What changed?<textarea name="whatChanged" rows="2" required maxlength="1600"></textarea></label>',
        '<label>What remains unresolved?<textarea name="unresolved" rows="2" placeholder="one item per line"></textarea></label>',
        '<label>What relationship changed?<textarea name="relationshipChanges" rows="2" placeholder="one item per line"></textarea></label>',
        '<label>What assumption failed?<textarea name="failedAssumptions" rows="2" placeholder="one item per line"></textarea></label>',
        '<label>What surprised us?<textarea name="surprises" rows="2" placeholder="one item per line"></textarea></label>',
        '<label>What became more interesting?<textarea name="becameMoreInteresting" rows="2" placeholder="one item per line"></textarea></label>',
        '<label>What deserves another look simply because it is interesting?<textarea name="deservesAnotherLook" rows="2" placeholder="one item per line"></textarea></label>',
        '<label>What did we believe before?<textarea name="beliefBefore" rows="2"></textarea></label>',
        '<label>What do we believe now?<textarea name="beliefNow" rows="2"></textarea></label>',
        '<label>What should remain possible?<textarea name="possibilitiesToPreserve" rows="2" placeholder="one item per line"></textarea></label>',
        '<p class="wish-grove-suggestion-law">Reflection is a shareable judgement product and curriculum candidate. It is not hidden chain-of-thought, automatic memory, automatic training, canon, or authority.</p>',
        '<button type="submit">Record reflection</button>',
      '</form>',
    '</details>',
  ].join('');
}

function suggestionMarkup(wishId, branch, suggestion) {
  return [
    '<article class="wish-grove-suggestion" data-suggestion-id="' + esc(suggestion.suggestionId) + '" data-suggestion-status="' + esc(suggestion.status || 'open') + '" data-suggestion-applied="' + (suggestion.applied === true ? 'true' : 'false') + '">',
      '<header>',
        '<div><p class="wish-grove-label">' + esc(suggestion.kind) + '</p><strong>' + esc(suggestion.summary) + '</strong></div>',
        '<span>' + esc(suggestion.applied === true ? 'materialised' : suggestion.status || 'open') + '</span>',
      '</header>',
      suggestion.rationale ? '<p class="wish-grove-suggestion-rationale">' + esc(suggestion.rationale) + '</p>' : '',
      payloadMarkup(suggestion.payload),
      '<p class="wish-grove-suggestion-law">Suggestion only. It grants no authority and applies nothing automatically.</p>',
      decisionTrail(suggestion),
      materialisationTrail(suggestion),
      reflectionTrail(branch, suggestion),
      suggestion.applied !== true ? [
        '<form data-suggestion-decision-form data-wish-id="' + esc(wishId) + '" data-branch-id="' + esc(branch.branchId) + '" data-suggestion-id="' + esc(suggestion.suggestionId) + '">',
          '<label>Decision note<textarea name="reason" rows="2" maxlength="1000" placeholder="Why accept, decline, or leave this alive?"></textarea></label>',
          '<div class="wish-grove-suggestion-actions">',
            '<button type="submit" name="decision" value="accept">Accept</button>',
            '<button type="submit" name="decision" value="keep-open">Keep Open</button>',
            '<button type="submit" name="decision" value="decline">Decline</button>',
          '</div>',
        '</form>',
      ].join('') : '',
      materialiseForm(wishId, branch.branchId, suggestion),
      reflectionForm(wishId, branch.branchId, suggestion),
    '</article>',
  ].join('');
}

function panelMarkup(wish, branch) {
  const suggestions = branch.suggestions || [];
  if (!suggestions.length) return '';
  const summary = branchSuggestionSummary(wish);
  const materialised = suggestions.filter((row) => row.applied === true).length;
  return [
    '<section class="wish-grove-suggestion-grove" data-suggestion-grove="' + esc(WISH_GROVE_SUGGESTION_SCHEMA) + '">',
      '<header><div><p class="wish-grove-label">Suggestion Grove</p><h5>What might this evidence change?</h5></div><span>' + suggestions.length + ' on this branch</span></header>',
      '<p class="wish-grove-suggestion-intro">Returned evidence may propose a next move. Review is lineage, not obedience: suggestion ≠ decision, decision ≠ authority, acceptance ≠ application. Materialisation is a separate explicit act.</p>',
      '<div class="wish-grove-suggestion-counts">',
        '<span>' + summary.counts.open + ' open</span>',
        '<span>' + summary.counts.accepted + ' accepted</span>',
        '<span>' + summary.counts.declined + ' declined</span>',
        '<span>' + materialised + ' materialised</span>',
      '</div>',
      '<div class="wish-grove-suggestion-list">' + suggestions.map((row) => suggestionMarkup(wish.wishId, branch, row)).join('') + '</div>',
    '</section>',
  ].join('');
}

export function renderWishGroveSuggestionGrove() {
  if (!active()) return false;
  const host = grove();
  if (!host) return false;
  const lineage = store().snapshot();
  for (const card of host.querySelectorAll('[data-lifecycle-branch-id]')) {
    card.querySelector?.('[data-suggestion-grove]')?.remove?.();
  }
  for (const wish of lineage.wishes || []) {
    for (const branch of wish.possibilityBranches || []) {
      if (!(branch.suggestions || []).length) continue;
      const card = [...host.querySelectorAll('[data-lifecycle-branch-id]')]
        .find((node) => node.dataset.lifecycleBranchId === branch.branchId);
      if (!card) continue;
      card.insertAdjacentHTML('beforeend', panelMarkup(wish, branch));
    }
  }
  return true;
}

function schedule() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    renderWishGroveSuggestionGrove();
  });
}

function onDecision(form, event) {
  const submitterDecision = event.submitter?.value || '';
  if (!['accept', 'decline', 'keep-open'].includes(submitterDecision)) throw new Error('Choose Accept, Decline, or Keep Open.');
  const data = new FormData(form);
  const result = store().decideBranchSuggestion(form.dataset.wishId, {
    branchId: form.dataset.branchId,
    suggestionId: form.dataset.suggestionId,
    decisionId: token('suggestion-decision'),
    decision: submitterDecision,
    reason: String(data.get('reason') || '').trim(),
    decidedBy: 'steward-ui',
    createdAt: new Date().toISOString(),
    provenance: ['surface://universal-codex/wish-grove/suggestion-grove'],
  });
  const verb = submitterDecision === 'keep-open' ? 'kept open' : submitterDecision === 'accept' ? 'accepted for consideration' : 'declined';
  setStatus(`Suggestion ${verb}. Nothing was applied automatically.`);
  form.reset();
  return result;
}

function onMaterialise(form) {
  const data = new FormData(form);
  if (String(data.get('materialise') || '') !== 'yes') throw new Error('Explicit materialisation approval is required.');
  const result = store().materialiseBranchSuggestion(form.dataset.wishId, {
    branchId: form.dataset.branchId,
    suggestionId: form.dataset.suggestionId,
    materialisationId: token('suggestion-materialisation'),
    materialisedBy: 'steward-ui',
    reason: String(data.get('reason') || '').trim(),
    createdAt: new Date().toISOString(),
    provenance: ['surface://universal-codex/wish-grove/suggestion-grove/materialise'],
  });
  setStatus(`Accepted suggestion materialised as ${result.nativeRef}. No additional authority was granted.`);
  form.reset();
  return result;
}

function onReflection(form) {
  const data = new FormData(form);
  const result = store().recordLearningReflection(form.dataset.wishId, {
    branchId: form.dataset.branchId,
    reflectionId: token('learning-reflection'),
    sourceSuggestionId: form.dataset.suggestionId,
    sourceMaterialisationId: form.dataset.materialisationId,
    whatChanged: String(data.get('whatChanged') || '').trim(),
    unresolved: lines(data.get('unresolved')),
    relationshipChanges: lines(data.get('relationshipChanges')),
    failedAssumptions: lines(data.get('failedAssumptions')),
    surprises: lines(data.get('surprises')),
    becameMoreInteresting: lines(data.get('becameMoreInteresting')),
    deservesAnotherLook: lines(data.get('deservesAnotherLook')),
    beliefBefore: String(data.get('beliefBefore') || '').trim(),
    beliefNow: String(data.get('beliefNow') || '').trim(),
    possibilitiesToPreserve: lines(data.get('possibilitiesToPreserve')),
    reflectedBy: 'steward-ui',
    createdAt: new Date().toISOString(),
    provenance: ['surface://universal-codex/wish-grove/suggestion-grove/reflection'],
  });
  setStatus('Learning reflection recorded as an append-only curriculum candidate. Nothing was trained, canonised, or written to memory automatically.');
  form.reset();
  return result;
}

function onSubmit(event) {
  const decision = event.target?.closest?.('[data-suggestion-decision-form]');
  const materialise = event.target?.closest?.('[data-suggestion-materialise-form]');
  const reflection = event.target?.closest?.('[data-learning-reflection-form]');
  const form = decision || materialise || reflection;
  if (!form || !grove()?.contains(form)) return;
  event.preventDefault();
  try {
    if (decision) onDecision(decision, event);
    else if (materialise) onMaterialise(materialise);
    else onReflection(reflection);
    schedule();
  } catch (error) {
    setStatus(error?.message || String(error), 'error');
  }
}

export function installWishGroveSuggestionGrove() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener(CODEX_WISH_STORE_EVENT, schedule);
  document.addEventListener('arcsweep:magic-book-ready', schedule);
  document.addEventListener('arcsweep:magic-book-receipt', schedule);
  document.addEventListener('submit', onSubmit);
  observer = new MutationObserver(() => {
    if (!active() || !grove()) return;
    const hasSuggestions = store().snapshot().wishes.some((wish) =>
      (wish.possibilityBranches || []).some((branch) => (branch.suggestions || []).length));
    if (hasSuggestions && !grove().querySelector('[data-suggestion-grove]')) schedule();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  schedule();
}

if (typeof document !== 'undefined') installWishGroveSuggestionGrove();
