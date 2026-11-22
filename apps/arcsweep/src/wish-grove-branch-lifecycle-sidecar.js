import './wish-grove-branch-lifecycle.css';

import { MAGIC_BOOK_BINDING_KEY } from './magic-book-model.js';
import { CODEX_WISH_STORE_EVENT, getCodexWishStore } from './codex/codex-wish-store.js';
import { CODEX_BRANCH_STATUSES, branchLifecycleSummary } from './codex/codex-branch-lifecycle.js';

export const WISH_GROVE_BRANCH_LIFECYCLE_SCHEMA = 'hearthweave.wish-grove-branch-lifecycle/v0.1';

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

function statusOptions(current = 'open') {
  return CODEX_BRANCH_STATUSES.map((value) => (
    `<option value="${esc(value)}" ${value === current ? 'selected' : ''}>${esc(value)}</option>`
  )).join('');
}

function branchRow(wishId, branch) {
  const transitions = branch.transitions || [];
  const parents = branch.parentBranchIds || [];
  return [
    '<article class="wish-grove-lifecycle-branch" data-lifecycle-branch-id="' + esc(branch.branchId) + '">',
      '<header>',
        '<div><strong>' + esc(branch.label || branch.branchId) + '</strong><small>' + esc(branch.branchId) + '</small></div>',
        '<span data-branch-status="' + esc(branch.status || 'open') + '">' + esc(branch.status || 'open') + '</span>',
      '</header>',
      branch.relation === 'merge' ? '<p class="wish-grove-lifecycle-note">Merged lineage from ' + esc(parents.join(' + ')) + '. Parent branches remain intact.</p>' : '',
      '<p>' + esc(branch.possibility || '') + '</p>',
      '<p class="wish-grove-lifecycle-note">' + transitions.length + ' recorded state transitions. Status describes this branch only and grants no authority.</p>',
      '<details>',
        '<summary>Record branch state</summary>',
        '<form data-branch-lifecycle-form="transition" data-wish-id="' + esc(wishId) + '" data-branch-id="' + esc(branch.branchId) + '">',
          '<label>Status<select name="status">' + statusOptions(branch.status || 'open') + '</select></label>',
          '<label>What changed?<textarea name="note" required rows="2" maxlength="1200" placeholder="Simulation completed, prototype built, branch intentionally retired…"></textarea></label>',
          '<label>Receipt refs<input name="receipts" maxlength="1200" placeholder="comma-separated optional receipts"></label>',
          '<button type="submit">Record transition</button>',
        '</form>',
      '</details>',
    '</article>',
  ].join('');
}

function mergeForm(wish) {
  const branches = wish.possibilityBranches || [];
  if (branches.length < 2) return '';
  return [
    '<details class="wish-grove-lifecycle-merge">',
      '<summary>Open a branch from multiple existing possibilities</summary>',
      '<form data-branch-lifecycle-form="merge" data-wish-id="' + esc(wish.wishId) + '">',
        '<fieldset><legend>Source branches</legend>',
          branches.map((branch) => '<label><input type="checkbox" name="sources" value="' + esc(branch.branchId) + '"> ' + esc(branch.label || branch.branchId) + '</label>').join(''),
        '</fieldset>',
        '<label>New branch name<input name="label" required maxlength="180" placeholder="A new leaf grown from both"></label>',
        '<label>Possibility<textarea name="possibility" required rows="3" maxlength="1600" placeholder="What becomes possible when these branches meet?"></textarea></label>',
        '<button type="submit">Open merged branch</button>',
      '</form>',
    '</details>',
  ].join('');
}

function panelMarkup(wish) {
  const summary = branchLifecycleSummary(wish);
  const branches = wish.possibilityBranches || [];
  if (!branches.length) return '';
  return [
    '<section class="wish-grove-lifecycle" data-wish-branch-lifecycle="' + esc(WISH_GROVE_BRANCH_LIFECYCLE_SCHEMA) + '">',
      '<header>',
        '<div><p class="wish-grove-label">Possibility lifecycle</p><h4>Let a branch change without deleting its past</h4></div>',
        '<span>' + summary.transitionCount + ' transitions · ' + summary.mergeCount + ' merges</span>',
      '</header>',
      '<p class="wish-grove-lifecycle-note">A branch may be explored, simulated, designed, prototyped, realised, reopened, or retired. None of those states silently removes another branch.</p>',
      '<div class="wish-grove-lifecycle-list">' + branches.map((branch) => branchRow(wish.wishId, branch)).join('') + '</div>',
      mergeForm(wish),
    '</section>',
  ].join('');
}

function setStatus(message, tone = 'success') {
  const status = grove()?.querySelector?.('[data-wish-grove-status]');
  if (!status) return;
  status.textContent = String(message || '');
  status.dataset.tone = tone;
}

function render() {
  if (!active()) return false;
  const host = grove();
  if (!host) return false;
  const lineage = store().snapshot();
  for (const wish of lineage.wishes || []) {
    const card = [...host.querySelectorAll('.wish-grove-card')].find((node) => node.dataset.wishId === wish.wishId);
    if (!card) continue;
    card.querySelector?.('[data-wish-branch-lifecycle]')?.remove?.();
    const markup = panelMarkup(wish);
    if (markup) card.insertAdjacentHTML('beforeend', markup);
  }
  return true;
}

function schedule() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    render();
  });
}

function csv(value) {
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function submitTransition(form) {
  const data = new FormData(form);
  store().transitionBranch(form.dataset.wishId, {
    branchId: form.dataset.branchId,
    transitionId: token('branch-transition'),
    status: String(data.get('status') || 'open'),
    note: String(data.get('note') || '').trim(),
    receiptRefs: csv(data.get('receipts')),
    createdAt: new Date().toISOString(),
    provenance: ['surface://universal-codex/wish-grove/branch-lifecycle'],
  });
  setStatus('Branch state recorded. Earlier states remain in lineage.');
}

function submitMerge(form) {
  const data = new FormData(form);
  const sources = data.getAll('sources').map(String).filter(Boolean);
  store().mergeBranches(form.dataset.wishId, {
    branchId: token('branch'),
    sourceBranchIds: sources,
    label: String(data.get('label') || '').trim(),
    possibility: String(data.get('possibility') || '').trim(),
    createdAt: new Date().toISOString(),
    provenance: ['surface://universal-codex/wish-grove/branch-lifecycle'],
  });
  setStatus('Merged possibility opened. Source branches remain visible and unchanged.');
}

function onSubmit(event) {
  const form = event.target?.closest?.('[data-branch-lifecycle-form]');
  if (!form || !grove()?.contains(form)) return;
  event.preventDefault();
  try {
    if (form.dataset.branchLifecycleForm === 'transition') submitTransition(form);
    else if (form.dataset.branchLifecycleForm === 'merge') submitMerge(form);
    else return;
    form.reset();
    schedule();
  } catch (error) {
    setStatus(error?.message || String(error), 'error');
  }
}

export function installWishGroveBranchLifecycle() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener(CODEX_WISH_STORE_EVENT, schedule);
  document.addEventListener('arcsweep:magic-book-ready', schedule);
  document.addEventListener('arcsweep:magic-book-receipt', schedule);
  document.addEventListener('submit', onSubmit);
  observer = new MutationObserver(() => {
    if (!active() || !grove()) return;
    const lineage = store().snapshot();
    const missing = (lineage.wishes || []).some((wish) => {
      if (!(wish.possibilityBranches || []).length) return false;
      const card = [...grove().querySelectorAll('.wish-grove-card')].find((node) => node.dataset.wishId === wish.wishId);
      return card && !card.querySelector('[data-wish-branch-lifecycle]');
    });
    if (missing) schedule();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  schedule();
}

if (typeof document !== 'undefined') installWishGroveBranchLifecycle();
