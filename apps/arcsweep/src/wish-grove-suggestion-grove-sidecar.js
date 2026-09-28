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

function suggestionMarkup(wishId, branchId, suggestion) {
  return [
    '<article class="wish-grove-suggestion" data-suggestion-id="' + esc(suggestion.suggestionId) + '" data-suggestion-status="' + esc(suggestion.status || 'open') + '">',
      '<header>',
        '<div><p class="wish-grove-label">' + esc(suggestion.kind) + '</p><strong>' + esc(suggestion.summary) + '</strong></div>',
        '<span>' + esc(suggestion.status || 'open') + '</span>',
      '</header>',
      suggestion.rationale ? '<p class="wish-grove-suggestion-rationale">' + esc(suggestion.rationale) + '</p>' : '',
      payloadMarkup(suggestion.payload),
      '<p class="wish-grove-suggestion-law">Suggestion only. It grants no authority and applies nothing automatically.</p>',
      decisionTrail(suggestion),
      '<form data-suggestion-decision-form data-wish-id="' + esc(wishId) + '" data-branch-id="' + esc(branchId) + '" data-suggestion-id="' + esc(suggestion.suggestionId) + '">',
        '<label>Decision note<textarea name="reason" rows="2" maxlength="1000" placeholder="Why accept, decline, or leave this alive?"></textarea></label>',
        '<div class="wish-grove-suggestion-actions">',
          '<button type="submit" name="decision" value="accept">Accept</button>',
          '<button type="submit" name="decision" value="keep-open">Keep Open</button>',
          '<button type="submit" name="decision" value="decline">Decline</button>',
        '</div>',
      '</form>',
    '</article>',
  ].join('');
}

function panelMarkup(wish, branch) {
  const suggestions = branch.suggestions || [];
  if (!suggestions.length) return '';
  const summary = branchSuggestionSummary(wish);
  return [
    '<section class="wish-grove-suggestion-grove" data-suggestion-grove="' + esc(WISH_GROVE_SUGGESTION_SCHEMA) + '">',
      '<header><div><p class="wish-grove-label">Suggestion Grove</p><h5>What might this evidence change?</h5></div><span>' + suggestions.length + ' on this branch</span></header>',
      '<p class="wish-grove-suggestion-intro">Returned evidence may propose a next move. Review is lineage, not obedience: suggestion ≠ decision, decision ≠ authority, acceptance ≠ automatic application.</p>',
      '<div class="wish-grove-suggestion-counts">',
        '<span>' + summary.counts.open + ' open</span>',
        '<span>' + summary.counts.accepted + ' accepted</span>',
        '<span>' + summary.counts.declined + ' declined</span>',
      '</div>',
      '<div class="wish-grove-suggestion-list">' + suggestions.map((row) => suggestionMarkup(wish.wishId, branch.branchId, row)).join('') + '</div>',
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

function onSubmit(event) {
  const form = event.target?.closest?.('[data-suggestion-decision-form]');
  if (!form || !grove()?.contains(form)) return;
  event.preventDefault();
  try {
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
    schedule();
    return result;
  } catch (error) {
    setStatus(error?.message || String(error), 'error');
    return null;
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
