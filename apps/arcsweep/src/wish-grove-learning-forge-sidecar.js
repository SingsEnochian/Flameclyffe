import './wish-grove-suggestion-grove.css';

import { MAGIC_BOOK_BINDING_KEY } from './magic-book-model.js';
import { CODEX_WISH_STORE_EVENT, getCodexWishStore } from './codex/codex-wish-store.js';

export const WISH_GROVE_LEARNING_FORGE_SCHEMA = 'hearthweave.wish-grove-learning-forge/v0.1';

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

function authorityFor(branch, bundleId) {
  return (branch.trainingAuthorities || []).find((row) => row.bundleId === bundleId) || null;
}

function runsFor(branch, bundleId) {
  return (branch.trainingRuns || []).filter((row) => row.bundleId === bundleId);
}

function deltasForRun(branch, runId) {
  return (branch.behaviouralDeltas || []).filter((row) => row.runId === runId);
}

function bundleMarkup(wishId, branch, bundle) {
  const authority = authorityFor(branch, bundle.bundleId);
  const runs = runsFor(branch, bundle.bundleId);
  return [
    '<article class="wish-grove-suggestion" data-learning-forge-bundle="' + esc(bundle.bundleId) + '">',
      '<header>',
        '<div><p class="wish-grove-label">Training bundle</p><strong>' + esc(bundle.objective) + '</strong></div>',
        '<span>' + esc(runs.length ? runs.at(-1).status : authority ? 'authorised' : 'prepared') + '</span>',
      '</header>',
      '<p>Base: ' + esc(bundle.baseModelRef) + ' · Adapter: ' + esc(bundle.adapterMethod) + '</p>',
      '<p>Teaching artefacts: ' + esc((bundle.sourceArtifactIds || []).join(' · ')) + '</p>',
      '<p class="wish-grove-suggestion-law">Selected lesson ≠ dataset. Dataset ≠ training authority. Training completion ≠ improvement.</p>',
      authority ? [
        '<p class="wish-grove-suggestion-rationale">Training authority: ' + esc(authority.authorityId) + ' · scope ' + esc(authority.authorityScope) + ' · single use</p>',
        '<p class="wish-grove-suggestion-law">Authority permits one training execution only. It does not permit deployment, production promotion, held-out training, canon promotion, or authority expansion.</p>',
      ].join('') : [
        '<details>',
          '<summary>Authorise one training run</summary>',
          '<form data-learning-forge-authority-form data-wish-id="' + esc(wishId) + '" data-branch-id="' + esc(branch.branchId) + '" data-bundle-id="' + esc(bundle.bundleId) + '">',
            '<label>Purpose<textarea name="purpose" rows="2" maxlength="1000" placeholder="What exact bounded training run is being authorised?"></textarea></label>',
            '<label class="wish-grove-suggestion-consent"><input type="checkbox" name="authorise" value="yes" required> I authorise one training execution for this exact immutable bundle. This does not authorise deployment, production promotion, held-out training, canon promotion, or authority expansion.</label>',
            '<button type="submit">Authorise one training run</button>',
          '</form>',
        '</details>',
      ].join(''),
      runs.length ? '<ol class="wish-grove-learning-reflections">' + runs.map((run) => [
        '<li>',
          '<strong>Run ' + esc(run.runId) + ' · ' + esc(run.status) + '</strong>',
          run.modelArtifactRef ? '<span>Model artefact: ' + esc(run.modelArtifactRef) + '</span>' : '',
          '<span>Completion is evidence of execution, not proof of improvement.</span>',
          deltasForRun(branch, run.runId).map((delta) => [
            '<span>Improved: ' + esc((delta.improved || []).join(' · ') || 'none recorded') + '</span>',
            '<span>Regressed: ' + esc((delta.regressed || []).join(' · ') || 'none recorded') + '</span>',
            '<span>Failed to transfer: ' + esc((delta.failedToTransfer || []).join(' · ') || 'none recorded') + '</span>',
          ].join('')).join(''),
        '</li>',
      ].join('')).join('') + '</ol>' : '',
    '</article>',
  ].join('');
}

function prepareForm(wishId, branch) {
  const trainArtifacts = (branch.curriculumArtifacts || []).filter((row) => row.targetSplit === 'train');
  const bundledIds = new Set((branch.learningForgeBundles || []).flatMap((row) => row.sourceArtifactIds || []));
  const available = trainArtifacts.filter((row) => !bundledIds.has(row.artifactId));
  if (!available.length) return '';
  return [
    '<details>',
      '<summary>Prepare immutable training bundle</summary>',
      '<form data-learning-forge-bundle-form data-wish-id="' + esc(wishId) + '" data-branch-id="' + esc(branch.branchId) + '">',
        '<fieldset><legend>Reviewed train artefacts</legend>',
          available.map((artifact) => '<label><input type="checkbox" name="artifactId" value="' + esc(artifact.artifactId) + '"> ' + esc(artifact.teachingRecord?.whatChanged || artifact.artifactId) + '</label>').join(''),
        '</fieldset>',
        '<label>Learning objective<textarea name="objective" rows="2" required maxlength="1400"></textarea></label>',
        '<label>Base model/checkpoint reference<input name="baseModelRef" required placeholder="crow://base-checkpoint"></label>',
        '<label>Adapter method<input name="adapterMethod" value="lora"></label>',
        '<label>Explicit exclusions<textarea name="exclusions" rows="2" placeholder="one excluded source or class per line"></textarea></label>',
        '<label>Sealed evaluation references<textarea name="sealedEvaluationRefs" rows="2" required placeholder="one held-out evaluation ref per line"></textarea></label>',
        '<label class="wish-grove-suggestion-consent"><input type="checkbox" name="contaminationPassed" value="yes" required> I verified that the selected training artefacts do not contain the sealed evaluation material named above.</label>',
        '<button type="submit">Prepare Learning Forge bundle</button>',
      '</form>',
    '</details>',
  ].join('');
}

function panelMarkup(wish, branch) {
  const trainArtifacts = (branch.curriculumArtifacts || []).filter((row) => row.targetSplit === 'train');
  if (!trainArtifacts.length && !(branch.learningForgeBundles || []).length) return '';
  return [
    '<section class="wish-grove-suggestion-grove" data-learning-forge="' + esc(WISH_GROVE_LEARNING_FORGE_SCHEMA) + '">',
      '<header><div><p class="wish-grove-label">Learning Forge</p><h5>What may actually change the learner?</h5></div><span>' + (branch.learningForgeBundles || []).length + ' bundle' + ((branch.learningForgeBundles || []).length === 1 ? '' : 's') + '</span></header>',
      '<p class="wish-grove-suggestion-intro">Reviewed teaching artefacts may become an immutable dataset candidate. Training authority is a separate, explicit, single-use act. Held-out material stays sealed.</p>',
      prepareForm(wish.wishId, branch),
      '<div class="wish-grove-suggestion-list">' + (branch.learningForgeBundles || []).map((bundle) => bundleMarkup(wish.wishId, branch, bundle)).join('') + '</div>',
    '</section>',
  ].join('');
}

export function renderWishGroveLearningForge() {
  if (!active()) return false;
  const host = grove();
  if (!host) return false;
  const lineage = store().snapshot();
  for (const card of host.querySelectorAll('[data-lifecycle-branch-id]')) {
    card.querySelector?.('[data-learning-forge]')?.remove?.();
  }
  for (const wish of lineage.wishes || []) {
    for (const branch of wish.possibilityBranches || []) {
      const markup = panelMarkup(wish, branch);
      if (!markup) continue;
      const card = [...host.querySelectorAll('[data-lifecycle-branch-id]')]
        .find((node) => node.dataset.lifecycleBranchId === branch.branchId);
      if (!card) continue;
      card.insertAdjacentHTML('beforeend', markup);
    }
  }
  return true;
}

function schedule() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    renderWishGroveLearningForge();
  });
}

function onSubmit(event) {
  const bundleForm = event.target?.closest?.('[data-learning-forge-bundle-form]');
  const authorityForm = event.target?.closest?.('[data-learning-forge-authority-form]');
  const form = bundleForm || authorityForm;
  if (!form || !grove()?.contains(form)) return;
  event.preventDefault();
  try {
    const data = new FormData(form);
    if (bundleForm) {
      const artifactIds = [...form.querySelectorAll('input[name="artifactId"]:checked')].map((node) => node.value);
      if (!artifactIds.length) throw new Error('Select at least one reviewed train artefact.');
      if (String(data.get('contaminationPassed') || '') !== 'yes') throw new Error('A clean held-out contamination check is required.');
      const sealedEvaluationRefs = lines(data.get('sealedEvaluationRefs'));
      store().prepareTrainingBundle(form.dataset.wishId, {
        branchId: form.dataset.branchId,
        bundleId: token('learning-forge-bundle'),
        artifactIds,
        objective: String(data.get('objective') || '').trim(),
        baseModelRef: String(data.get('baseModelRef') || '').trim(),
        adapterMethod: String(data.get('adapterMethod') || 'lora').trim(),
        exclusions: lines(data.get('exclusions')),
        sealedEvaluationRefs,
        contaminationCheck: { passed: true, checkedAgainst: sealedEvaluationRefs, detectedArtifactIds: [] },
        preparedBy: 'steward-ui',
        createdAt: new Date().toISOString(),
        provenance: ['surface://universal-codex/wish-grove/learning-forge'],
      });
      setStatus('Immutable Learning Forge bundle prepared. No training authority was granted.');
    } else {
      if (String(data.get('authorise') || '') !== 'yes') throw new Error('Explicit training authority is required.');
      store().authoriseTrainingBundle(form.dataset.wishId, {
        branchId: form.dataset.branchId,
        bundleId: form.dataset.bundleId,
        authorityId: token('training-authority'),
        authorisedBy: 'steward-ui',
        purpose: String(data.get('purpose') || '').trim(),
        createdAt: new Date().toISOString(),
        provenance: ['surface://universal-codex/wish-grove/learning-forge/authority'],
      });
      setStatus('One exact training run authorised. Nothing executed or deployed automatically.');
    }
    form.reset();
  } catch (error) {
    setStatus(error?.message || String(error), 'error');
  }
}

export function installWishGroveLearningForge() {
  if (installed || !globalThis.document) return false;
  installed = true;
  globalThis.document.addEventListener('submit', onSubmit);
  globalThis.document.addEventListener(CODEX_WISH_STORE_EVENT, schedule);
  observer = new MutationObserver(schedule);
  observer.observe(globalThis.document.documentElement, { childList: true, subtree: true });
  schedule();
  return true;
}

if (typeof document !== 'undefined') installWishGroveLearningForge();
