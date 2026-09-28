import { MAGIC_BOOK_BINDING_KEY } from './magic-book-model.js';
import { CODEX_WISH_STORE_EVENT, getCodexWishStore } from './codex/codex-wish-store.js';
import { selectWonderReturnCandidates } from './codex/codex-wonder-trajectory.js';

export const WISH_GROVE_WONDER_RETURN_SCHEMA = 'hearthweave.wish-grove-wonder-return/v0.1';

const ROOT_ID = 'arcsweep-magic-book';
const PAGE_ID = 'wish-grove';
const SLOT = 'wish-grove-wonder-return';

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

function candidateMarkup(candidate) {
  return [
    '<article class="wish-grove-question" data-wonder-return-question="' + esc(candidate.questionId) + '">',
      '<header>',
        '<div>',
          '<p class="wish-grove-label">Wonder returns</p>',
          '<h3>' + esc(candidate.question) + '</h3>',
        '</div>',
        '<span class="wish-grove-state">' + esc(candidate.dormantDays) + ' days</span>',
      '</header>',
      '<p class="wish-grove-why">This is not a claim that the question is more important than another. It is a return invitation based on explicit lineage and time since the last visit.</p>',
      '<div class="wish-grove-facts">' + candidate.reasons.map((reason) => '<span>' + esc(reason) + '</span>').join('') + '</div>',
      '<button type="button" data-wonder-return-jump="' + esc(candidate.questionId) + '">Find this question</button>',
    '</article>',
  ].join('');
}

export function renderWonderReturns({ asOf = new Date().toISOString() } = {}) {
  if (!active()) return false;
  const host = grove();
  if (!host) return false;
  host.querySelector?.(`[data-${SLOT}]`)?.remove?.();

  const candidates = selectWonderReturnCandidates(store().snapshot(), {
    asOf,
    minimumDormantDays: 7,
    limit: 6,
  });
  if (!candidates.length) return true;

  const section = document.createElement('section');
  section.className = 'wish-grove-section';
  section.dataset[SLOT.replaceAll('-', '')] = WISH_GROVE_WONDER_RETURN_SCHEMA;
  section.setAttribute(`data-${SLOT}`, WISH_GROVE_WONDER_RETURN_SCHEMA);
  section.innerHTML = [
    '<header><p class="wish-grove-label">Questions glowing again</p><strong>' + candidates.length + ' return invitations</strong></header>',
    '<div class="wish-grove-list">' + candidates.map(candidateMarkup).join('') + '</div>',
  ].join('');

  const status = host.querySelector('[data-wish-grove-status]');
  if (status?.after) status.after(section);
  else host.prepend(section);
  return true;
}

function schedule() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    renderWonderReturns();
  });
}

function onClick(event) {
  const button = event.target?.closest?.('[data-wonder-return-jump]');
  if (!button) return;
  const id = button.dataset.wonderReturnJump;
  const target = globalThis.document?.querySelector?.(`[data-question-id="${CSS.escape(id)}"]`);
  target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  target?.setAttribute?.('tabindex', '-1');
  target?.focus?.({ preventScroll: true });
}

export function installWonderReturns() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener(CODEX_WISH_STORE_EVENT, schedule);
  document.addEventListener('arcsweep:magic-book-ready', schedule);
  document.addEventListener('arcsweep:magic-book-receipt', schedule);
  document.addEventListener('click', onClick);
  observer = new MutationObserver(() => {
    if (!active() || !grove()) return;
    const existing = grove()?.querySelector?.(`[data-${SLOT}]`);
    if (!existing) schedule();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  schedule();
}

if (typeof document !== 'undefined') installWonderReturns();
