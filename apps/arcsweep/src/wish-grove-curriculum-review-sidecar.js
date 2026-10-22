import './wish-grove-suggestion-grove.css';

import { MAGIC_BOOK_BINDING_KEY } from './magic-book-model.js';
import { CODEX_WISH_STORE_EVENT, getCodexWishStore } from './codex/codex-wish-store.js';

export const WISH_GROVE_CURRICULUM_SCHEMA = 'hearthweave.wish-grove-curriculum-review/v0.1';

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

function reviewFor(branch, reflectionId) {
  const rows = branch.curriculumReviews || [];
  return rows.filter((row) => row.reflectionId === reflectionId).at(-1) || null;
}

function ringsFor(branch, reflectionId) {
  return (branch.developmentalMemory || []).filter((row) => row.sourceReflectionId === reflectionId);
}

function developmentalMarkup(branch, reflection) {
  const rings = ringsFor(branch, reflection.reflectionId);
  if (!rings.length) return '';
  return [
    '<section class="wish-grove-suggestion-grove" data-developmental-memory>',
      '<header><div><p class="wish-grove-label">Developmental Memory</p><h5>How did learning change the learner?</h5></div><span>' + rings.length + ' ring' + (rings.length === 1 ? '' : 's') + '</span></header>',
      '<p class="wish-grove-suggestion-intro">Event memory ≠ conclusion memory ≠ memory of cognitive change. A developmental ring records change without becoming an identity law.</p>',
      '<ol class="wish-grove-learning-reflections">' + rings.map((ring) => [
        '<li>',
          '<strong>' + esc(ring.whatChanged || 'Cognitive change') + '</strong>',
          ring.remainedUnresolved?.length ? '<span>Unresolved: ' + esc(ring.remainedUnresolved.join(' · ')) + '</span>' : '',
          ring.transferredTo?.length ? '<span>Transferred to: ' + esc(ring.transferredTo.join(' · ')) + '</span>' : '',
          ring.failedToGeneralise?.length ? '<span>Did not generalise: ' + esc(ring.failedToGeneralise.join(' · ')) + '</span>' : '',
          '<small>' + esc(ring.createdAt || '') + '</small>',
        '</li>',
      ].join('')).join('') + '</ol>',
    '</section>',
  ].join('');
}

function reflectionMarkup(wishId, branch, reflection) {
  const latestReview = reviewFor(branch, reflection.reflectionId);
  const reviewed = Boolean(latestReview);
  return [
    '<article class="wish-grove-suggestion" data-curriculum-reflection-id="' + esc(reflection.reflectionId) + '">',
      '<header>',
        '<div><p class="wish-grove-label">Curriculum candidate</p><strong>' + esc(reflection.whatChanged) + '</strong></div>',
        '<span>' + esc(latestReview?.outcome || 'unreviewed') + '</span>',
      '</header>',
      reflection.unresolved?.length ? '<p>Unresolved: ' + esc(reflection.unresolved.join(' · ')) + '</p>' : '',
      '<p class="wish-grove-suggestion-law">Candidate ≠ selection. Selection does not execute training. A teaching artefact is not canonical truth.</p>',
      reviewed ? '<p class="wish-grove-suggestion-rationale">Latest review: ' + esc(latestReview.outcome) + (latestReview.reason ? ' · ' + esc(latestReview.reason) : '') + '</p>' : '',
      '<details>',
        '<summary>Curriculum Review</summary>',
        '<form data-curriculum-review-form data-wish-id="' + esc(wishId) + '" data-branch-id="' + esc(branch.branchId) + '" data-reflection-id="' + esc(reflection.reflectionId) + '">',
          '<label>Review note<textarea name="reason" rows="2" maxlength="1200" placeholder="Why should this become teaching material, remain open, or be archived?"></textarea></label>',
          '<label>Where did it transfer?<textarea name="transferredTo" rows="2" placeholder="one case or domain per line"></textarea></label>',
          '<label>Where did it fail to generalise?<textarea name="failedToGeneralise" rows="2" placeholder="one case or domain per line"></textarea></label>',
          '<label>Scope notes<textarea name="scopeNotes" rows="2" placeholder="what must not be over-generalised?"></textarea></label>',
          '<div class="wish-grove-suggestion-actions">',
            '<button type="submit" name="outcome" value="train">Train candidate</button>',
            '<button type="submit" name="outcome" value="held-out">Held-out</button>',
            '<button type="submit" name="outcome" value="boxfire">Boxfire</button>',
            '<button type="submit" name="outcome" value="keep-open">Keep Open</button>',
            '<button type="submit" name="outcome" value="archive">Archive</button>',
          '</div>',
        '</form>',
      '</details>',
      developmentalMarkup(branch, reflection),
    '</article>',
  ].join('');
}

function panelMarkup(wish, branch) {
  const reflections = branch.learningReflections || [];
  if (!reflections.length) return '';
  return [
    '<section class="wish-grove-suggestion-grove" data-curriculum-review="' + esc(WISH_GROVE_CURRICULUM_SCHEMA) + '">',
      '<header><div><p class="wish-grove-label">Curriculum Review</p><h5>What should the Tree learn from this?</h5></div><span>' + reflections.length + ' reflection' + (reflections.length === 1 ? '' : 's') + '</span></header>',
      '<p class="wish-grove-suggestion-intro">Reflections can become train, held-out, or Boxfire teaching artefacts only through explicit review. Promotion creates developmental memory, not automatic training.</p>',
      '<div class="wish-grove-suggestion-list">' + reflections.map((reflection) => reflectionMarkup(wish.wishId, branch, reflection)).join('') + '</div>',
    '</section>',
  ].join('');
}

export function renderWishGroveCurriculumReview() {
  if (!active()) return false;
  const host = grove();
  if (!host) return false;
  const lineage = store().snapshot();
  for (const card of host.querySelectorAll('[data-lifecycle-branch-id]')) {
    card.querySelector?.('[data-curriculum-review]')?.remove?.();
  }
  for (const wish of lineage.wishes || []) {
    for (const branch of wish.possibilityBranches || []) {
      if (!(branch.learningReflections || []).length) continue;
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
    renderWishGroveCurriculumReview();
  });
}

function onSubmit(event) {
  const form = event.target?.closest?.('[data-curriculum-review-form]');
  if (!form || !grove()?.contains(form)) return;
  event.preventDefault();
  try {
    const outcome = event.submitter?.value || '';
    const data = new FormData(form);
    store().reviewLearningReflection(form.dataset.wishId, {
      branchId: form.dataset.branchId,
      reflectionId: form.dataset.reflectionId,
      reviewId: token('curriculum-review'),
      outcome,
      reason: String(data.get('reason') || '').trim(),
      transferredTo: lines(data.get('transferredTo')),
      failedToGeneralise: lines(data.get('failedToGeneralise')),
      scopeNotes: lines(data.get('scopeNotes')),
      reviewedBy: 'steward-ui',
      createdAt: new Date().toISOString(),
      provenance: ['surface://universal-codex/wish-grove/curriculum-review'],
    });
    form.reset();
  } catch (error) {
    const status = grove()?.querySelector?.('[data-wish-grove-status]');
    if (status) {
      status.textContent = error?.message || String(error);
      status.dataset.tone = 'error';
    }
  }
}

export function installWishGroveCurriculumReview() {
  if (installed || !globalThis.document) return false;
  installed = true;
  globalThis.document.addEventListener('submit', onSubmit);
  globalThis.document.addEventListener(CODEX_WISH_STORE_EVENT, schedule);
  observer = new MutationObserver(schedule);
  observer.observe(globalThis.document.documentElement, { childList: true, subtree: true });
  schedule();
  return true;
}

if (typeof document !== 'undefined') installWishGroveCurriculumReview();
