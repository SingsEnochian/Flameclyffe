import './wish-grove-ai-university-execution.css';

import { MAGIC_BOOK_BINDING_KEY } from './magic-book-model.js';
import { readAspectMeshRuntime } from './aspects/aspect-mesh-runtime.js';
import { CODEX_WISH_STORE_EVENT, getCodexWishStore } from './codex/codex-wish-store.js';
import {
  CODEX_BRANCH_RETURN_STORE_EVENT,
  getCodexBranchReturnStore,
} from './codex/codex-branch-experiment-return-store.js';
import {
  createBranchExecutionPermission,
  runBranchSandboxExperiment,
} from './codex/codex-branch-experiment-execution.js';

export const WISH_GROVE_AI_UNIVERSITY_EXECUTION_SCHEMA = 'hearthweave.wish-grove-ai-university-execution/v0.1';

const ROOT_ID = 'arcsweep-magic-book';
const PAGE_ID = 'wish-grove';
let installed = false;
let observer = null;
let queued = false;
let running = new Set();

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

function wishStore() {
  return getCodexWishStore({ storage: globalThis.localStorage, target: globalThis.document });
}

function returnStore() {
  return getCodexBranchReturnStore({ storage: globalThis.localStorage, target: globalThis.document });
}

function setStatus(message, tone = 'success') {
  const node = grove()?.querySelector?.('[data-wish-grove-status]');
  if (!node) return;
  node.textContent = String(message || '');
  node.dataset.tone = tone;
}

function returnRows(experimentId) {
  return returnStore().snapshot().returns.filter((row) => row.experimentId === experimentId);
}

function returnMarkup(row) {
  return [
    '<article class="wish-grove-execution-return" data-return-id="' + esc(row.returnId) + '">',
      '<header><strong>' + esc(row.outcome || 'inconclusive') + '</strong><span>' + esc(row.status || 'unknown') + '</span></header>',
      '<p>' + esc(row.observation || '') + '</p>',
      row.suggestedBranchStatus ? '<p class="wish-grove-execution-note">Suggested branch state: <b>' + esc(row.suggestedBranchStatus) + '</b>. Suggestion only. No transition was applied.</p>' : '',
      row.ingestedIntoCodex
        ? '<p class="wish-grove-execution-ingested">Ingested into Codex lineage · ' + esc(row.ingestedAt || '') + '</p>'
        : '<form data-aiu-return-ingest-form data-return-id="' + esc(row.returnId) + '" data-wish-id="' + esc(row.wishId) + '"><label class="wish-grove-execution-consent"><input type="checkbox" name="ingest" value="yes" required> Ingest this returned evidence into the exact branch proposal. Do not automatically change branch state or create canon.</label><button type="submit">Ingest return into Codex</button></form>',
    '</article>',
  ].join('');
}

function handoffExecutionMarkup(wishId, branchId, proposalId, handoff) {
  const returns = returnRows(handoff.experimentId);
  const alreadyReturned = returns.length > 0;
  const busy = running.has(handoff.experimentId);
  return [
    '<section class="wish-grove-execution" data-aiu-execution-panel="' + esc(handoff.experimentId) + '">',
      '<header><div><p class="wish-grove-label">Sandbox execution gate</p><strong>' + esc(handoff.experimentId) + '</strong></div><span>' + (busy ? 'running' : alreadyReturned ? 'returned' : 'unrun') + '</span></header>',
      '<p class="wish-grove-execution-note">The proposal handoff exists, but execution is still a different permission. A run stays inside the reversible Aspect Experiment sandbox and returns evidence to a separate inbox.</p>',
      returns.length ? '<div class="wish-grove-execution-returns">' + returns.map(returnMarkup).join('') + '</div>' : '',
      !alreadyReturned ? [
        '<details ' + (busy ? 'open' : '') + '>',
          '<summary>' + (busy ? 'Sandbox is running…' : 'Authorise one sandbox run') + '</summary>',
          '<form data-aiu-execution-form data-wish-id="' + esc(wishId) + '" data-branch-id="' + esc(branchId) + '" data-proposal-id="' + esc(proposalId) + '" data-experiment-id="' + esc(handoff.experimentId) + '" data-handoff-envelope-id="' + esc(handoff.envelopeId) + '">',
            '<label>Rounds<select name="rounds"><option value="1">1 round</option><option value="2">2 rounds</option><option value="3">3 rounds</option></select></label>',
            '<label class="wish-grove-execution-consent"><input type="checkbox" name="permission" value="yes" required> I authorise this exact materialised experiment to run in the sealed sandbox. This does not authorise production effects, external writes, authority expansion, automatic promotion, or automatic Codex ingestion.</label>',
            '<button type="submit" ' + (busy ? 'disabled' : '') + '>Run authorised sandbox experiment</button>',
          '</form>',
        '</details>',
      ].join('') : '',
    '</section>',
  ].join('');
}

export function renderWishGroveAIUniversityExecution() {
  if (!active()) return false;
  const host = grove();
  if (!host) return false;
  const lineage = wishStore().snapshot();
  for (const wish of lineage.wishes || []) {
    for (const branch of wish.possibilityBranches || []) {
      for (const proposal of branch.experimentProposals || []) {
        const card = [...host.querySelectorAll('[data-branch-proposal-id]')]
          .find((node) => node.dataset.branchProposalId === proposal.proposalId);
        if (!card) continue;
        card.querySelectorAll?.('[data-aiu-execution-panel]')?.forEach?.((node) => node.remove());
        for (const handoff of proposal.handoffs || []) {
          card.insertAdjacentHTML('beforeend', handoffExecutionMarkup(wish.wishId, branch.branchId, proposal.proposalId, handoff));
        }
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
    renderWishGroveAIUniversityExecution();
  });
}

function findWish(wishId) {
  return wishStore().snapshot().wishes.find((wish) => wish.wishId === wishId) || null;
}

async function runSandbox(form) {
  const data = new FormData(form);
  if (String(data.get('permission') || '') !== 'yes') throw new Error('Explicit sandbox execution permission is required.');
  const experimentId = form.dataset.experimentId;
  if (running.has(experimentId)) return;
  const wish = findWish(form.dataset.wishId);
  if (!wish) throw new Error(`Unknown wish: ${form.dataset.wishId}`);
  running.add(experimentId);
  schedule();
  try {
    const permission = createBranchExecutionPermission({
      permissionId: token('branch-execution-permission'),
      wishId: form.dataset.wishId,
      branchId: form.dataset.branchId,
      proposalId: form.dataset.proposalId,
      experimentId,
      handoffEnvelopeId: form.dataset.handoffEnvelopeId,
      grantedBy: 'steward-ui',
      rounds: Number(data.get('rounds') || 1),
      createdAt: new Date().toISOString(),
      constraints: [
        'sealed reversible sandbox only',
        'no production effects',
        'no external writes',
        'no authority expansion',
        'no automatic promotion',
        'return evidence to inbox before Codex ingestion',
      ],
      provenance: ['surface://universal-codex/wish-grove/ai-university/execution'],
    });
    const returned = await runBranchSandboxExperiment({
      wish,
      branchId: form.dataset.branchId,
      proposalId: form.dataset.proposalId,
      experimentId,
      permission,
      runtime: readAspectMeshRuntime(),
      createdAt: new Date().toISOString(),
    });
    returnStore().append(returned);
    setStatus(`Sandbox returned ${returned.status}. Evidence is waiting for separate Codex ingestion.`);
  } finally {
    running.delete(experimentId);
    schedule();
  }
}

function ingestReturn(form) {
  const data = new FormData(form);
  if (String(data.get('ingest') || '') !== 'yes') throw new Error('Explicit Codex return-ingestion approval is required.');
  const returns = returnStore();
  const row = returns.snapshot().returns.find((item) => item.returnId === form.dataset.returnId);
  if (!row) throw new Error(`Unknown branch experiment return: ${form.dataset.returnId}`);
  if (row.ingestedIntoCodex) return;
  const resultId = `codex-ingest:${row.returnId}`;
  const ingestion = wishStore().ingestExperimentReturn(form.dataset.wishId, row, {
    resultId,
    createdAt: new Date().toISOString(),
  });
  returns.markIngested(row.returnId, { codexResultId: resultId });
  const suggestion = ingestion.suggestedBranchStatus
    ? ` Branch-state suggestion ${ingestion.suggestedBranchStatus} remains unapplied.`
    : '';
  setStatus(`Returned evidence ingested into Codex lineage.${suggestion}`);
  schedule();
}

function onSubmit(event) {
  const execution = event.target?.closest?.('[data-aiu-execution-form]');
  const ingestion = event.target?.closest?.('[data-aiu-return-ingest-form]');
  const form = execution || ingestion;
  if (!form || !grove()?.contains(form)) return;
  event.preventDefault();
  if (execution) {
    void runSandbox(execution).catch((error) => {
      running.delete(execution.dataset.experimentId);
      setStatus(error?.message || String(error), 'error');
      schedule();
    });
    return;
  }
  try {
    ingestReturn(ingestion);
  } catch (error) {
    setStatus(error?.message || String(error), 'error');
  }
}

export function installWishGroveAIUniversityExecution() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener(CODEX_WISH_STORE_EVENT, schedule);
  document.addEventListener(CODEX_BRANCH_RETURN_STORE_EVENT, schedule);
  document.addEventListener('arcsweep:magic-book-ready', schedule);
  document.addEventListener('arcsweep:magic-book-receipt', schedule);
  document.addEventListener('submit', onSubmit);
  observer = new MutationObserver(() => {
    if (!active() || !grove()) return;
    const handoffs = wishStore().snapshot().wishes.flatMap((wish) =>
      (wish.possibilityBranches || []).flatMap((branch) =>
        (branch.experimentProposals || []).flatMap((proposal) => proposal.handoffs || [])));
    if (handoffs.length && !grove().querySelector('[data-aiu-execution-panel]')) schedule();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  schedule();
}

if (typeof document !== 'undefined') installWishGroveAIUniversityExecution();
