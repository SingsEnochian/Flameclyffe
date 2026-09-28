import './wish-grove-ai-university-handoff.css';

import { MAGIC_BOOK_BINDING_KEY } from './magic-book-model.js';
import { INITIAL_ASPECTS } from './aspects/aspect-contract.js';
import { readAspectMeshRuntime } from './aspects/aspect-mesh-runtime.js';
import { CODEX_WISH_STORE_EVENT, getCodexWishStore } from './codex/codex-wish-store.js';
import {
  createBranchExperimentPermission,
  materialiseBranchExperimentProposal,
} from './codex/codex-branch-experiment-handoff.js';

export const WISH_GROVE_AI_UNIVERSITY_HANDOFF_SCHEMA = 'hearthweave.wish-grove-ai-university-handoff/v0.1';

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

function aspectOptions() {
  return INITIAL_ASPECTS.map((aspect) => (
    `<option value="${esc(aspect.id)}">${esc(aspect.name)} · ${esc(aspect.strengths.join(', '))}</option>`
  )).join('');
}

function collaboratorOptions(initiator = null) {
  return INITIAL_ASPECTS
    .filter((aspect) => aspect.id !== initiator)
    .map((aspect) => `<label><input type="checkbox" name="collaborators" value="${esc(aspect.id)}"> ${esc(aspect.name)}</label>`)
    .join('');
}

function handoffRows(proposal) {
  const rows = proposal.handoffs || [];
  if (!rows.length) return '';
  return '<div class="wish-grove-handoff-list">' + rows.map((handoff) => [
    '<article class="wish-grove-handoff-row">',
      '<strong>Materialised as ' + esc(handoff.experimentId) + '</strong>',
      '<small>Aspect: ' + esc(handoff.aspectId) + ' · envelope ' + esc(handoff.envelopeId) + '</small>',
      '<small>Permission: ' + esc(handoff.permissionId) + ' · execution not started</small>',
    '</article>',
  ].join('')).join('') + '</div>';
}

function handoffMarkup(wishId, branchId, proposal) {
  return [
    '<section class="wish-grove-aiu-handoff" data-aiu-handoff-panel="' + esc(WISH_GROVE_AI_UNIVERSITY_HANDOFF_SCHEMA) + '">',
      '<p class="wish-grove-aiu-note">Materialisation is a separate permission step. It creates an Aspect Experiment proposal with <code>autoStart: false</code>. It does not run the experiment.</p>',
      handoffRows(proposal),
      '<details>',
        '<summary>Authorise sandbox handoff</summary>',
        '<form data-aiu-handoff-form data-wish-id="' + esc(wishId) + '" data-branch-id="' + esc(branchId) + '" data-proposal-id="' + esc(proposal.proposalId) + '">',
          '<label>Initiating faculty<select name="aspectId" required>' + aspectOptions() + '</select></label>',
          '<fieldset><legend>Collaborators</legend>' + collaboratorOptions() + '</fieldset>',
          '<label class="wish-grove-handoff-consent"><input type="checkbox" name="permission" value="yes" required> I authorise materialising this proposal into the sealed AI University / Aspect Experiment sandbox. This does not authorise execution, production effects, external writes, or authority expansion.</label>',
          '<button type="submit">Authorise proposal handoff</button>',
        '</form>',
      '</details>',
    '</section>',
  ].join('');
}

export function renderWishGroveAIUniversityHandoffs() {
  if (!active()) return false;
  const host = grove();
  if (!host) return false;
  const lineage = store().snapshot();
  for (const wish of lineage.wishes || []) {
    for (const branch of wish.possibilityBranches || []) {
      for (const proposal of branch.experimentProposals || []) {
        const card = [...host.querySelectorAll('[data-branch-proposal-id]')]
          .find((node) => node.dataset.branchProposalId === proposal.proposalId);
        if (!card) continue;
        card.querySelector?.('[data-aiu-handoff-panel]')?.remove?.();
        card.insertAdjacentHTML('beforeend', handoffMarkup(wish.wishId, branch.branchId, proposal));
      }
    }
  }
  return true;
}

function schedule() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    renderWishGroveAIUniversityHandoffs();
  });
}

function findWish(lineage, wishId) {
  return (lineage.wishes || []).find((wish) => wish.wishId === wishId) || null;
}

function onSubmit(event) {
  const form = event.target?.closest?.('[data-aiu-handoff-form]');
  if (!form || !grove()?.contains(form)) return;
  event.preventDefault();
  try {
    const data = new FormData(form);
    if (String(data.get('permission') || '') !== 'yes') throw new Error('Explicit sandbox handoff permission is required.');
    const api = store();
    const lineage = api.snapshot();
    const wish = findWish(lineage, form.dataset.wishId);
    if (!wish) throw new Error(`Unknown wish: ${form.dataset.wishId}`);
    const permission = createBranchExperimentPermission({
      permissionId: token('branch-experiment-permission'),
      wishId: form.dataset.wishId,
      branchId: form.dataset.branchId,
      proposalId: form.dataset.proposalId,
      grantedBy: 'steward-ui',
      createdAt: new Date().toISOString(),
      constraints: [
        'materialise proposal only',
        'do not execute experiment',
        'no production effects',
        'no external writes',
        'no authority expansion',
      ],
      provenance: ['surface://universal-codex/wish-grove/ai-university/handoff'],
    });
    const handoff = materialiseBranchExperimentProposal({
      wish,
      branchId: form.dataset.branchId,
      proposalId: form.dataset.proposalId,
      permission,
      runtime: readAspectMeshRuntime(),
      aspectId: String(data.get('aspectId') || ''),
      collaborators: data.getAll('collaborators').map(String),
      createdAt: new Date().toISOString(),
    });
    api.recordExperimentHandoff(wish.wishId, handoff);
    form.reset();
    setStatus(`Proposal materialised as ${handoff.experimentId}. Execution remains unstarted and separately governed.`);
    schedule();
  } catch (error) {
    setStatus(error?.message || String(error), 'error');
  }
}

export function installWishGroveAIUniversityHandoffs() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener(CODEX_WISH_STORE_EVENT, schedule);
  document.addEventListener('arcsweep:magic-book-ready', schedule);
  document.addEventListener('arcsweep:magic-book-receipt', schedule);
  document.addEventListener('submit', onSubmit);
  observer = new MutationObserver(() => {
    if (!active() || !grove()) return;
    const cards = [...grove().querySelectorAll('[data-branch-proposal-id]')];
    if (cards.some((card) => !card.querySelector('[data-aiu-handoff-panel]'))) schedule();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  schedule();
}

if (typeof document !== 'undefined') installWishGroveAIUniversityHandoffs();
