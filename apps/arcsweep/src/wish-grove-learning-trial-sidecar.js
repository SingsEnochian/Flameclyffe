import './wish-grove-suggestion-grove.css';

import { MAGIC_BOOK_BINDING_KEY } from './magic-book-model.js';
import { CODEX_WISH_STORE_EVENT, getCodexWishStore } from './codex/codex-wish-store.js';

export const WISH_GROVE_LEARNING_TRIAL_SCHEMA = 'hearthweave.wish-grove-learning-trial/v0.1';

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

function executionFor(branch, authorityId) {
  return (branch.trainingExecutionEnvelopes || []).find((row) => row.authorityId === authorityId) || null;
}

function runFor(branch, authorityId) {
  return (branch.trainingRuns || []).find((row) => row.authorityId === authorityId) || null;
}

function deltaForRun(branch, runId) {
  return (branch.behaviouralDeltas || []).find((row) => row.runId === runId) || null;
}

function trialForRun(branch, runId) {
  return (branch.blindLearningTrials || []).find((row) => row.runId === runId) || null;
}

function atlasForDelta(branch, deltaId) {
  return (branch.transferAtlases || []).find((row) => row.sourceBehaviouralDeltaId === deltaId) || null;
}

function executionMarkup(wishId, branch, authority) {
  const bundle = (branch.learningForgeBundles || []).find((row) => row.bundleId === authority.bundleId);
  if (!bundle) return '';
  const envelope = executionFor(branch, authority.authorityId);
  const run = runFor(branch, authority.authorityId);
  const delta = run ? deltaForRun(branch, run.runId) : null;
  const trial = run ? trialForRun(branch, run.runId) : null;
  const atlas = delta ? atlasForDelta(branch, delta.deltaId) : null;

  return [
    '<article class="wish-grove-suggestion" data-learning-trial-authority="' + esc(authority.authorityId) + '">',
      '<header><div><p class="wish-grove-label">Training execution</p><strong>' + esc(bundle.objective) + '</strong></div><span>' + esc(run?.status || envelope ? 'materialised' : 'authorised') + '</span></header>',
      '<p class="wish-grove-suggestion-law">Materialised execution ≠ started execution. Training completion ≠ improvement. Evaluation signal ≠ authority.</p>',
      envelope ? [
        '<p>Envelope: ' + esc(envelope.executionId) + ' · executor ' + esc(envelope.executorTarget) + ' · <strong>autoStart=false</strong></p>',
        '<p>Exact bundle: ' + esc(envelope.bundleId) + ' · exact authority: ' + esc(envelope.authorityId) + '</p>',
      ].join('') : [
        '<details>',
          '<summary>Materialise execution envelope</summary>',
          '<form data-training-execution-form data-wish-id="' + esc(wishId) + '" data-branch-id="' + esc(branch.branchId) + '" data-bundle-id="' + esc(bundle.bundleId) + '" data-authority-id="' + esc(authority.authorityId) + '">',
            '<label>Executor target<select name="executorTarget"><option value="crow-local-adapter">Crow local adapter</option><option value="huggingface-job">Hugging Face job</option><option value="manual-executor">Manual executor</option></select></label>',
            '<label>Runtime profile / notes<textarea name="runtimeProfile" rows="2" placeholder="device=cuda\nquantisation=none"></textarea></label>',
            '<button type="submit">Materialise execution envelope</button>',
          '</form>',
        '</details>',
      ].join(''),
      run ? '<p class="wish-grove-suggestion-rationale">Run ' + esc(run.runId) + ' returned ' + esc(run.status) + '. This records execution only.</p>' : '<p>Awaiting an external executor return. This surface does not launch training.</p>',
      run && !trial ? blindTrialForm(wishId, branch, run) : '',
      trial ? blindTrialMarkup(trial) : '',
      delta && !atlas ? transferAtlasForm(wishId, branch, delta, trial) : '',
      atlas ? transferAtlasMarkup(atlas) : '',
    '</article>',
  ].join('');
}

function blindTrialForm(wishId, branch, run) {
  return [
    '<details>',
      '<summary>Record sealed before/after trial</summary>',
      '<form data-blind-trial-form data-wish-id="' + esc(wishId) + '" data-branch-id="' + esc(branch.branchId) + '" data-run-id="' + esc(run.runId) + '">',
        '<label>Sealed cohort ID<input name="cohortId" required></label>',
        '<label>Blind case IDs<textarea name="caseIds" rows="3" required placeholder="one sealed case id per line"></textarea></label>',
        '<label>Baseline evidence refs<textarea name="baselineEvidenceRefs" rows="2"></textarea></label>',
        '<label>Post-training evidence refs<textarea name="postEvidenceRefs" rows="2"></textarea></label>',
        '<label>Transfer case IDs<textarea name="transferCaseIds" rows="2"></textarea></label>',
        '<label>Transfer evidence refs<textarea name="transferEvidenceRefs" rows="2"></textarea></label>',
        '<label>Boxfire refs<textarea name="boxfireRefs" rows="2"></textarea></label>',
        '<label class="wish-grove-suggestion-consent"><input type="checkbox" name="sealed" value="yes" required> Baseline and post-training evaluation used the same sealed blind cohort, and these cases were not training material.</label>',
        '<button type="submit">Record blind trial</button>',
      '</form>',
    '</details>',
  ].join('');
}

function blindTrialMarkup(trial) {
  return [
    '<section class="wish-grove-suggestion-grove">',
      '<p class="wish-grove-label">Blind learning trial</p>',
      '<p><strong>' + esc(trial.cohortId) + '</strong> · ' + trial.caseIds.length + ' sealed cases</p>',
      '<p>Baseline: ' + esc((trial.baseline.evidenceRefs || []).join(' · ') || 'recorded') + '</p>',
      '<p>Post: ' + esc((trial.post.evidenceRefs || []).join(' · ') || 'recorded') + '</p>',
      '<p class="wish-grove-suggestion-law">No overall winner is declared. Dimensions remain inspectable independently.</p>',
    '</section>',
  ].join('');
}

function transferAtlasForm(wishId, branch, delta, trial) {
  return [
    '<details>',
      '<summary>Map transfer evidence</summary>',
      '<form data-transfer-atlas-form data-wish-id="' + esc(wishId) + '" data-branch-id="' + esc(branch.branchId) + '" data-delta-id="' + esc(delta.deltaId) + '" data-trial-id="' + esc(trial?.trialId || '') + '">',
        '<p>One observation per line: <code>status | capability | domain | evidence-ref</code></p>',
        '<textarea name="observations" rows="5" required placeholder="transferred | epistemic distinction | mythience | case://m1\npartial | relationship repair | Commons | case://r2\nfailed | scope discipline | authority classification | case://a3\nunknown | wonder | novel symbolic domain |"></textarea>',
        '<button type="submit">Record Transfer Atlas</button>',
      '</form>',
    '</details>',
  ].join('');
}

function transferAtlasMarkup(atlas) {
  return [
    '<section class="wish-grove-suggestion-grove">',
      '<p class="wish-grove-label">Transfer Atlas</p>',
      '<ol class="wish-grove-learning-reflections">' + (atlas.observations || []).map((row) => [
        '<li><strong>' + esc(row.status) + ' · ' + esc(row.capability) + '</strong><span>' + esc(row.domain) + '</span>',
        row.evidenceRefs?.length ? '<small>' + esc(row.evidenceRefs.join(' · ')) + '</small>' : '',
        '</li>',
      ].join('')).join('') + '</ol>',
      '<p class="wish-grove-suggestion-law">Transfer is empirical, not assumed. Partial and failed transfer remain visible; unknown is a valid state.</p>',
    '</section>',
  ].join('');
}

function panelMarkup(wish, branch) {
  const authorities = branch.trainingAuthorities || [];
  if (!authorities.length) return '';
  return [
    '<section class="wish-grove-suggestion-grove" data-learning-trial="' + esc(WISH_GROVE_LEARNING_TRIAL_SCHEMA) + '">',
      '<header><div><p class="wish-grove-label">Learning Trial</p><h5>Prove what changed.</h5></div><span>' + authorities.length + ' authorised path' + (authorities.length === 1 ? '' : 's') + '</span></header>',
      '<p class="wish-grove-suggestion-intro">Materialise an executor envelope without auto-starting, then keep blind evaluation and transfer evidence beside the exact training lineage.</p>',
      '<div class="wish-grove-suggestion-list">' + authorities.map((authority) => executionMarkup(wish.wishId, branch, authority)).join('') + '</div>',
    '</section>',
  ].join('');
}

export function renderWishGroveLearningTrial() {
  if (!active()) return false;
  const host = grove();
  if (!host) return false;
  const lineage = store().snapshot();
  for (const card of host.querySelectorAll('[data-lifecycle-branch-id]')) card.querySelector?.('[data-learning-trial]')?.remove?.();
  for (const wish of lineage.wishes || []) {
    for (const branch of wish.possibilityBranches || []) {
      const markup = panelMarkup(wish, branch);
      if (!markup) continue;
      const card = [...host.querySelectorAll('[data-lifecycle-branch-id]')].find((node) => node.dataset.lifecycleBranchId === branch.branchId);
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
    renderWishGroveLearningTrial();
  });
}

function parseProfile(value) {
  return Object.fromEntries(lines(value).map((row) => {
    const index = row.indexOf('=');
    return index < 0 ? [row, true] : [row.slice(0, index).trim(), row.slice(index + 1).trim()];
  }));
}

function parseObservations(value) {
  return lines(value).map((row) => {
    const [status, capability, domain, evidenceRef] = row.split('|').map((part) => part.trim());
    return { status, capability, domain, evidenceRefs: evidenceRef ? [evidenceRef] : [] };
  });
}

function onSubmit(event) {
  const executionForm = event.target?.closest?.('[data-training-execution-form]');
  const trialForm = event.target?.closest?.('[data-blind-trial-form]');
  const atlasForm = event.target?.closest?.('[data-transfer-atlas-form]');
  const form = executionForm || trialForm || atlasForm;
  if (!form || !grove()?.contains(form)) return;
  event.preventDefault();
  try {
    const data = new FormData(form);
    if (executionForm) {
      store().materialiseTrainingExecution(form.dataset.wishId, {
        branchId: form.dataset.branchId,
        bundleId: form.dataset.bundleId,
        authorityId: form.dataset.authorityId,
        executionId: token('training-execution'),
        executorTarget: String(data.get('executorTarget') || '').trim(),
        runtimeProfile: parseProfile(data.get('runtimeProfile')),
        preparedBy: 'steward-ui',
        createdAt: new Date().toISOString(),
        provenance: ['surface://universal-codex/wish-grove/learning-trial/execution'],
      });
      setStatus('Training execution envelope materialised with autoStart=false. Nothing launched.');
    } else if (trialForm) {
      if (String(data.get('sealed') || '') !== 'yes') throw new Error('Confirm the sealed cohort boundary before recording the trial.');
      const caseIds = lines(data.get('caseIds'));
      const transferCaseIds = lines(data.get('transferCaseIds'));
      store().recordBlindTrial(form.dataset.wishId, {
        branchId: form.dataset.branchId,
        trialId: token('blind-trial'),
        runId: form.dataset.runId,
        cohortId: String(data.get('cohortId') || '').trim(),
        caseIds,
        baseline: { caseIds, evidenceRefs: lines(data.get('baselineEvidenceRefs')) },
        post: { caseIds, evidenceRefs: lines(data.get('postEvidenceRefs')) },
        transferCaseIds,
        transfer: { evidenceRefs: lines(data.get('transferEvidenceRefs')) },
        boxfireRefs: lines(data.get('boxfireRefs')),
        evaluatedBy: 'steward-ui',
        createdAt: new Date().toISOString(),
        provenance: ['surface://universal-codex/wish-grove/learning-trial/blind'],
      });
      setStatus('Blind before/after trial recorded. Held-out cohort remains non-training.');
    } else {
      store().recordLearningTransferAtlas(form.dataset.wishId, {
        branchId: form.dataset.branchId,
        atlasId: token('transfer-atlas'),
        deltaId: form.dataset.deltaId,
        trialId: form.dataset.trialId || '',
        observations: parseObservations(data.get('observations')),
        recordedBy: 'steward-ui',
        createdAt: new Date().toISOString(),
        provenance: ['surface://universal-codex/wish-grove/learning-trial/transfer-atlas'],
      });
      setStatus('Transfer Atlas recorded without claiming universality.');
    }
    form.reset();
  } catch (error) {
    setStatus(error?.message || String(error), 'error');
  }
}

export function installWishGroveLearningTrial() {
  if (installed || !globalThis.document) return false;
  installed = true;
  globalThis.document.addEventListener('submit', onSubmit);
  globalThis.document.addEventListener(CODEX_WISH_STORE_EVENT, schedule);
  observer = new MutationObserver(schedule);
  observer.observe(globalThis.document.documentElement, { childList: true, subtree: true });
  schedule();
  return true;
}

if (typeof document !== 'undefined') installWishGroveLearningTrial();
