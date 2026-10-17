import './wish-grove.css';

import { MAGIC_BOOK_BINDING_KEY } from './magic-book-model.js';
import {
  CODEX_WISH_STORE_EVENT,
  getCodexWishStore,
} from './codex/codex-wish-store.js';

export const WISH_GROVE_SCHEMA = 'hearthweave.universal-codex-wish-grove/v0.1';

const ROOT_ID = 'arcsweep-magic-book';
const PAGE_ID = 'wish-grove';

let installed = false;
let observer = null;
let status = { tone: 'quiet', text: '' };

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

function now() {
  return new Date().toISOString();
}

function root() {
  return globalThis.document?.getElementById?.(ROOT_ID) || null;
}

function rightPage() {
  return root()?.querySelector?.('[data-magic-book-right]') || null;
}

function readBinding() {
  try {
    const raw = globalThis.localStorage?.getItem(MAGIC_BOOK_BINDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function activeWorld() {
  try {
    return globalThis.__arcsweepOS?.session?.()?.active_world_id || 'unscoped';
  } catch {
    return 'unscoped';
  }
}

function isActive() {
  return readBinding()?.active_page_id === PAGE_ID;
}

function store() {
  return getCodexWishStore({ storage: globalThis.localStorage, target: globalThis.document });
}

function setStatus(text, tone = 'quiet') {
  status = { text: String(text || ''), tone };
}

function openQuestionCount(wish, lineage) {
  const ids = new Set(wish.openQuestionIds || []);
  return (lineage.openQuestions || []).filter((question) => ids.has(question.questionId) && question.status === 'open').length;
}

function branchMarkup(branches = []) {
  if (!branches.length) return '<p class="wish-grove-empty">No branches yet. This wish is still a seed.</p>';
  return '<ul class="wish-grove-branches">' + branches.map((branch) => (
    '<li>' +
      '<strong>' + esc(branch.label || branch.branchId) + '</strong>' +
      '<span>' + esc(branch.possibility || '') + '</span>' +
    '</li>'
  )).join('') + '</ul>';
}

function wishCard(wish, lineage) {
  const openCount = openQuestionCount(wish, lineage);
  return [
    '<article class="wish-grove-card" data-wish-id="' + esc(wish.wishId) + '">',
      '<header>',
        '<div>',
          '<p class="wish-grove-label">Wish</p>',
          '<h3>' + esc(wish.desire) + '</h3>',
        '</div>',
        '<span class="wish-grove-state">' + esc(wish.status || 'open') + '</span>',
      '</header>',
      wish.whyItMatters ? '<p class="wish-grove-why"><strong>Why it matters:</strong> ' + esc(wish.whyItMatters) + '</p>' : '',
      '<div class="wish-grove-facts">',
        '<span>scope · ' + esc(wish.worldOrScope || 'unscoped') + '</span>',
        '<span>revision · ' + esc(wish.revision || 1) + '</span>',
        '<span>branches · ' + esc((wish.possibilityBranches || []).length) + '</span>',
        '<span>open questions · ' + esc(openCount) + '</span>',
      '</div>',
      branchMarkup(wish.possibilityBranches || []),
      '<details class="wish-grove-action">',
        '<summary>Open another possibility</summary>',
        '<form data-wish-grove-form="branch" data-wish-id="' + esc(wish.wishId) + '">',
          '<label>Branch name<input name="label" required maxlength="160" placeholder="A different leaf"></label>',
          '<label>Possibility<textarea name="possibility" required rows="2" maxlength="1200" placeholder="What might this wish become?"></textarea></label>',
          '<button type="submit">Branch the wish</button>',
        '</form>',
      '</details>',
      '<details class="wish-grove-action">',
        '<summary>Let the wish change</summary>',
        '<form data-wish-grove-form="revise" data-wish-id="' + esc(wish.wishId) + '">',
          '<label>Revised desire<textarea name="desire" required rows="2" maxlength="1400">' + esc(wish.desire) + '</textarea></label>',
          '<label>Why did it change?<textarea name="reason" required rows="2" maxlength="1200" placeholder="The old form remains in lineage."></textarea></label>',
          '<button type="submit">Record revision</button>',
        '</form>',
      '</details>',
      '<details class="wish-grove-action">',
        '<summary>Plant an open question</summary>',
        '<form data-wish-grove-form="question" data-wish-id="' + esc(wish.wishId) + '">',
          '<label>Question<textarea name="question" required rows="2" maxlength="1400" placeholder="What deserves to remain open?"></textarea></label>',
          '<label>Why keep it alive?<textarea name="why" rows="2" maxlength="1000"></textarea></label>',
          '<button type="submit">Keep the question</button>',
        '</form>',
      '</details>',
    '</article>',
  ].join('');
}

function questionCard(question) {
  const resolved = question.status === 'resolved';
  return [
    '<article class="wish-grove-question" data-question-id="' + esc(question.questionId) + '">',
      '<header>',
        '<div>',
          '<p class="wish-grove-label">Open Question</p>',
          '<h3>' + esc(question.question) + '</h3>',
        '</div>',
        '<span class="wish-grove-state">' + esc(question.status || 'open') + '</span>',
      '</header>',
      question.whyItMatters ? '<p class="wish-grove-why"><strong>Why it matters:</strong> ' + esc(question.whyItMatters) + '</p>' : '',
      '<div class="wish-grove-facts">',
        '<span>revisits · ' + esc((question.revisits || []).length) + '</span>',
        '<span>resolutions · ' + esc((question.resolutions || []).length) + '</span>',
        '<span>belief preserved · ' + (question.preserveBelief === false ? 'no' : 'yes') + '</span>',
      '</div>',
      '<form data-wish-grove-form="revisit" data-question-id="' + esc(question.questionId) + '">',
        '<label>Return to this question<textarea name="note" required rows="2" maxlength="1200" placeholder="What changed, appeared, resonated, or became newly relevant?"></textarea></label>',
        '<button type="submit">Record revisit</button>',
      '</form>',
      resolved
        ? [
            '<form data-wish-grove-form="reopen" data-question-id="' + esc(question.questionId) + '">',
              '<label>Why reopen it?<textarea name="reason" required rows="2" maxlength="1200"></textarea></label>',
              '<button type="submit">Reopen question</button>',
            '</form>',
          ].join('')
        : [
            '<form data-wish-grove-form="resolve" data-question-id="' + esc(question.questionId) + '">',
              '<label>Working resolution<textarea name="statement" required rows="2" maxlength="1400" placeholder="Record an answer without deleting the question."></textarea></label>',
              '<label>Resolution mode<select name="mode"><option value="tentative">Tentative</option><option value="settled">Settled for now</option></select></label>',
              '<button type="submit">Record resolution</button>',
            '</form>',
          ].join(''),
    '</article>',
  ].join('');
}

function markup(lineage) {
  const wishes = lineage.wishes || [];
  const questions = lineage.openQuestions || [];
  const wishBody = wishes.length
    ? wishes.map((wish) => wishCard(wish, lineage)).join('')
    : '<p class="wish-grove-empty">No wishes yet. The page is listening.</p>';
  const questionBody = questions.length
    ? questions.map(questionCard).join('')
    : '<p class="wish-grove-empty">No preserved questions yet.</p>';

  return [
    '<section class="wish-grove" data-wish-grove="' + WISH_GROVE_SCHEMA + '">',
      '<p class="magic-book-kicker">Wish Grove · possibility without scarcity</p>',
      '<h2>What do you wish?</h2>',
      '<p class="wish-grove-intro">A wish is not a disposable prompt. The Codex keeps its origin, branches, questions, revisions, transformations, and return paths.</p>',
      '<form class="wish-grove-create" data-wish-grove-form="create">',
        '<label>Wish<textarea name="desire" required rows="3" maxlength="1600" placeholder="I wish…"></textarea></label>',
        '<label>Why does it matter?<textarea name="why" rows="2" maxlength="1200" placeholder="Meaning is part of the lineage."></textarea></label>',
        '<label>World or scope<input name="scope" maxlength="240" value="' + esc(activeWorld()) + '"></label>',
        '<button type="submit">Plant wish</button>',
      '</form>',
      '<p class="wish-grove-status" data-wish-grove-status data-tone="' + esc(status.tone) + '" aria-live="polite">' + esc(status.text) + '</p>',
      '<section class="wish-grove-section">',
        '<header><p class="wish-grove-label">Possibility Tree</p><strong>' + wishes.length + ' wishes</strong></header>',
        '<div class="wish-grove-list">' + wishBody + '</div>',
      '</section>',
      '<section class="wish-grove-section">',
        '<header><p class="wish-grove-label">Questions worth keeping alive</p><strong>' + questions.filter((row) => row.status === 'open').length + ' open</strong></header>',
        '<div class="wish-grove-list">' + questionBody + '</div>',
      '</section>',
    '</section>',
  ].join('');
}

export function renderWishGrove() {
  if (!isActive()) return false;
  const target = rightPage();
  if (!target) return false;
  target.innerHTML = markup(store().snapshot());
  target.dataset.wishGroveRendered = 'true';
  return true;
}

function deferRender() {
  queueMicrotask(() => renderWishGrove());
}

function formValue(form, name) {
  return String(new FormData(form).get(name) || '').trim();
}

function handleSubmit(event) {
  const form = event.target?.closest?.('[data-wish-grove-form]');
  if (!form || !root()?.contains(form)) return;
  event.preventDefault();
  const action = form.dataset.wishGroveForm;
  const wishId = form.dataset.wishId;
  const questionId = form.dataset.questionId;

  try {
    const api = store();
    if (action === 'create') {
      const desire = formValue(form, 'desire');
      const whyItMatters = formValue(form, 'why');
      const worldOrScope = formValue(form, 'scope') || activeWorld();
      const created = api.createWish({
        wishId: token('wish'),
        origin: 'codex-wish-grove',
        desire,
        whyItMatters,
        worldOrScope,
        createdAt: now(),
        provenance: ['surface://universal-codex/wish-grove'],
      });
      setStatus(`Wish planted: ${created.desire}`, 'success');
    } else if (action === 'branch') {
      const branch = api.branchWish(wishId, {
        branchId: token('branch'),
        label: formValue(form, 'label'),
        possibility: formValue(form, 'possibility'),
        createdAt: now(),
        provenance: ['surface://universal-codex/wish-grove'],
      });
      setStatus(`Another possibility opened. ${branch.possibilityBranches.length} branches remain visible.`, 'success');
    } else if (action === 'revise') {
      const revised = api.reviseWish(wishId, {
        desire: formValue(form, 'desire'),
        reason: formValue(form, 'reason'),
        createdAt: now(),
        provenance: ['surface://universal-codex/wish-grove'],
      });
      setStatus(`Wish revised without erasing revision ${revised.revision - 1}.`, 'success');
    } else if (action === 'question') {
      const created = api.createQuestion({
        questionId: token('question'),
        question: formValue(form, 'question'),
        originWishId: wishId,
        whyItMatters: formValue(form, 'why'),
        worldOrScope: activeWorld(),
        createdAt: now(),
        provenance: ['surface://universal-codex/wish-grove'],
      });
      setStatus(`Question kept alive: ${created.question}`, 'success');
    } else if (action === 'revisit') {
      const revisited = api.revisitQuestion(questionId, {
        revisitId: token('revisit'),
        note: formValue(form, 'note'),
        createdAt: now(),
        provenance: ['surface://universal-codex/wish-grove'],
      });
      setStatus(`Returned to an older question. ${revisited.revisits.length} revisits are now in lineage.`, 'success');
    } else if (action === 'resolve') {
      api.resolveQuestion(questionId, {
        resolutionId: token('resolution'),
        statement: formValue(form, 'statement'),
        mode: formValue(form, 'mode') || 'tentative',
        createdAt: now(),
        provenance: ['surface://universal-codex/wish-grove'],
      });
      setStatus('Resolution recorded. The original question remains in the Codex.', 'success');
    } else if (action === 'reopen') {
      api.reopenQuestion(questionId, {
        revisitId: token('revisit'),
        reason: formValue(form, 'reason'),
        createdAt: now(),
        provenance: ['surface://universal-codex/wish-grove'],
      });
      setStatus('Question reopened. Wonder gets another turn.', 'success');
    } else {
      return;
    }
    deferRender();
  } catch (error) {
    setStatus(error?.message || String(error), 'error');
    deferRender();
  }
}

export function installWishGrove() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener('submit', handleSubmit);
  document.addEventListener(CODEX_WISH_STORE_EVENT, deferRender);
  document.addEventListener('arcsweep:magic-book-ready', deferRender);
  document.addEventListener('arcsweep:magic-book-receipt', deferRender);

  observer = new MutationObserver(() => {
    const page = rightPage();
    if (!isActive() || !page || page.dataset.wishGroveRendered === 'true') return;
    deferRender();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  deferRender();
}

if (typeof document !== 'undefined') installWishGrove();
