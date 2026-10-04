import './wish-grove-possibility-map.css';

import { MAGIC_BOOK_BINDING_KEY } from './magic-book-model.js';
import { CODEX_WISH_STORE_EVENT, getCodexWishStore } from './codex/codex-wish-store.js';
import { compareCodexWishBranches } from './codex/codex-branch-comparison.js';
import { buildOpenQuestionsConstellation } from './codex/codex-question-constellation.js';

export const WISH_GROVE_POSSIBILITY_MAP_SCHEMA = 'hearthweave.wish-grove-possibility-map/v0.1';

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

function csv(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function chip(value, kind) {
  return `<span class="wish-grove-anchor-chip" data-anchor-kind="${esc(kind)}">${esc(value)}</span>`;
}

function anchorGroup(label, values, kind) {
  const body = values.length
    ? `<div class="wish-grove-anchor-chips">${values.map((value) => chip(value, kind)).join('')}</div>`
    : '<small>None linked yet.</small>';
  return `<section class="wish-grove-anchor-group"><strong>${esc(label)}</strong>${body}</section>`;
}

function observationRow(row) {
  const groups = [
    ['Requirements', row.requirements],
    ['Constraints', row.constraints],
    ['Consequences', row.consequences],
    ['Uncertainties', row.uncertainties],
    ['Relationships', row.affectedRelationships],
    ['Receipts', row.receiptRefs],
  ].filter(([, values]) => (values || []).length);
  return [
    '<article class="wish-grove-branch-observation">',
      '<header><strong>' + esc(row.kind || 'analysis') + '</strong><small>' + esc(row.source || 'manual') + '</small></header>',
      '<p>' + esc(row.summary || '') + '</p>',
      groups.map(([label, values]) => '<div class="wish-grove-observation-group"><b>' + esc(label) + '</b><span>' + esc(values.join(' · ')) + '</span></div>').join(''),
    '</article>',
  ].join('');
}

function observationEditor(wishId, branch) {
  const observations = branch.observations || [];
  return [
    '<section class="wish-grove-branch-observations">',
      '<p class="wish-grove-map-note">' + observations.length + ' typed observations. They describe this branch and do not grant authority or select it.</p>',
      observations.length ? '<div class="wish-grove-observation-list">' + observations.map(observationRow).join('') + '</div>' : '',
      '<details class="wish-grove-action">',
        '<summary>Add consequence / uncertainty / simulation receipt</summary>',
        '<form class="wish-grove-observation-form" data-wish-branch-observation-form data-wish-id="' + esc(wishId) + '" data-branch-id="' + esc(branch.branchId) + '">',
          '<label>Observation kind<select name="kind"><option value="analysis">Analysis</option><option value="simulation">Simulation</option><option value="test">Test</option><option value="user-observation">User observation</option></select></label>',
          '<label>Summary<textarea name="summary" required rows="2" maxlength="1400" placeholder="What did this branch reveal?"></textarea></label>',
          '<label>Requirements<input name="requirements" placeholder="comma-separated"></label>',
          '<label>Constraints<input name="constraints" placeholder="comma-separated"></label>',
          '<label>Likely consequences<input name="consequences" placeholder="comma-separated"></label>',
          '<label>Uncertainties<input name="uncertainties" placeholder="comma-separated"></label>',
          '<label>Affected relationships<input name="relationships" placeholder="comma-separated"></label>',
          '<label>Simulation / test receipt refs<input name="receipts" placeholder="comma-separated receipt refs"></label>',
          '<button type="submit">Record branch observation</button>',
        '</form>',
      '</details>',
    '</section>',
  ].join('');
}

function branchMirrorMarkup(wish) {
  const comparison = compareCodexWishBranches(wish);
  if (comparison.branches.length < 2) return '';

  const branchCards = comparison.branches.map((branch) => [
    '<article class="wish-grove-branch-view" data-branch-id="' + esc(branch.branchId) + '">',
      '<strong>' + esc(branch.label) + '</strong>',
      '<span>' + esc(branch.possibility) + '</span>',
      '<div class="wish-grove-branch-terms">' + branch.terms.map((term) => `<span class="wish-grove-branch-term">${esc(term)}</span>`).join('') + '</div>',
      observationEditor(wish.wishId, branch),
    '</article>',
  ].join('')).join('');

  const pairRows = comparison.comparisons.map((pair) => {
    const left = comparison.branches.find((branch) => branch.branchId === pair.leftBranchId);
    const right = comparison.branches.find((branch) => branch.branchId === pair.rightBranchId);
    return [
      '<article class="wish-grove-branch-pair">',
        '<strong>' + esc(left?.label || pair.leftBranchId) + ' ↔ ' + esc(right?.label || pair.rightBranchId) + '</strong>',
        '<p>Shared language: ' + esc(pair.sharedTerms.join(', ') || 'none detected') + '</p>',
        '<p>' + esc(left?.label || 'Left') + ' distinct language: ' + esc(pair.leftDistinctTerms.join(', ') || 'none detected') + '</p>',
        '<p>' + esc(right?.label || 'Right') + ' distinct language: ' + esc(pair.rightDistinctTerms.join(', ') || 'none detected') + '</p>',
      '</article>',
    ].join('');
  }).join('');

  return [
    '<section class="wish-grove-branch-mirror">',
      '<header><div><p class="wish-grove-label">Branch Mirror</p><h4>Compare without collapsing</h4></div><span>' + comparison.branches.length + ' possibilities</span></header>',
      '<p class="wish-grove-map-note">This view describes overlap, difference, consequence, and uncertainty. It does not score, rank, or choose a winner.</p>',
      '<div class="wish-grove-branch-grid">' + branchCards + '</div>',
      '<div class="wish-grove-branch-pairs">' + pairRows + '</div>',
    '</section>',
  ].join('');
}

function relationalPanelMarkup(wish) {
  return [
    '<section class="wish-grove-relational-panel" data-wish-relational-panel="' + esc(WISH_GROVE_POSSIBILITY_MAP_SCHEMA) + '">',
      '<header><div><p class="wish-grove-label">Continuity anchors</p><h4>What must travel with this wish?</h4></div><span>' + esc((wish.anchorLinks || []).length) + ' link events</span></header>',
      '<div class="wish-grove-anchor-groups">',
        anchorGroup('Continuity', wish.continuityAnchors || [], 'continuity'),
        anchorGroup('Relationships', wish.relationshipsTouched || [], 'relationship'),
        anchorGroup('Memory', wish.memoryRefs || [], 'memory'),
      '</div>',
      '<details class="wish-grove-action">',
        '<summary>Link more context</summary>',
        '<form class="wish-grove-anchor-form" data-wish-anchor-form data-wish-id="' + esc(wish.wishId) + '">',
          '<label>Continuity anchors<input name="continuity" placeholder="comma-separated refs"></label>',
          '<label>Relationships touched<input name="relationships" placeholder="comma-separated names or refs"></label>',
          '<label>Memory refs<input name="memories" placeholder="comma-separated memory refs"></label>',
          '<button type="submit">Bind anchors</button>',
        '</form>',
      '</details>',
      branchMirrorMarkup(wish),
    '</section>',
  ].join('');
}

function constellationMarkup(lineage) {
  const map = buildOpenQuestionsConstellation(lineage);
  if (!map.nodes.length) return '';
  const byId = new Map(map.nodes.map((node) => [node.id, node]));
  const lines = map.edges
    .filter((edge) => edge.kind === 'question-question')
    .map((edge) => {
      const left = byId.get(edge.from);
      const right = byId.get(edge.to);
      if (!left || !right) return '';
      return `<line class="wish-grove-constellation-edge" x1="${left.x * 100}" y1="${left.y * 100}" x2="${right.x * 100}" y2="${right.y * 100}"><title>${esc(edge.reasons.join(', '))}</title></line>`;
    }).join('');
  const nodes = map.nodes.map((node) => [
    '<g class="wish-grove-constellation-node" tabindex="0" role="button" data-question-map-jump="' + esc(node.id) + '" data-status="' + esc(node.status) + '" transform="translate(' + (node.x * 100) + ' ' + (node.y * 100) + ')">',
      '<circle r="2.7"></circle>',
      '<title>' + esc(node.label) + '</title>',
    '</g>',
  ].join('')).join('');

  return [
    '<section class="wish-grove-constellation" data-wish-grove-possibility-map="' + esc(WISH_GROVE_POSSIBILITY_MAP_SCHEMA) + '">',
      '<header><div><p class="wish-grove-label">Open Questions Constellation</p><h3>Questions can remain related without becoming one question</h3></div><span>' + map.openCount + ' open · ' + map.resolvedCount + ' resolved</span></header>',
      '<div class="wish-grove-constellation-frame">',
        '<svg viewBox="0 0 100 100" role="img" aria-label="Open Questions constellation. Position is deterministic and does not represent importance.">',
          lines,
          nodes,
        '</svg>',
      '</div>',
      '<p class="wish-grove-map-note">Position comes from question identity and status. Lines appear only for explicit shared origins or references. Neither position nor line count is an importance score.</p>',
    '</section>',
  ].join('');
}

export function renderWishGrovePossibilityMap() {
  if (!active()) return false;
  const host = grove();
  if (!host) return false;
  const lineage = store().snapshot();

  host.querySelector?.('[data-wish-grove-possibility-map]')?.remove?.();
  const constellation = constellationMarkup(lineage);
  if (constellation) {
    const status = host.querySelector('[data-wish-grove-status]');
    if (status?.insertAdjacentHTML) status.insertAdjacentHTML('afterend', constellation);
    else host.insertAdjacentHTML('afterbegin', constellation);
  }

  for (const wish of lineage.wishes || []) {
    const card = [...host.querySelectorAll('[data-wish-id]')]
      .find((node) => node.dataset.wishId === wish.wishId && node.classList.contains('wish-grove-card'));
    if (!card) continue;
    card.querySelector?.('[data-wish-relational-panel]')?.remove?.();
    card.insertAdjacentHTML('beforeend', relationalPanelMarkup(wish));
  }
  return true;
}

function schedule() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    renderWishGrovePossibilityMap();
  });
}

function jumpToQuestion(questionId) {
  const host = grove();
  const target = [...(host?.querySelectorAll?.('[data-question-id]') || [])]
    .find((node) => node.dataset.questionId === questionId);
  target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  target?.setAttribute?.('tabindex', '-1');
  target?.focus?.({ preventScroll: true });
}

function setStatus(message, tone = 'success') {
  const status = grove()?.querySelector?.('[data-wish-grove-status]');
  if (!status) return;
  status.textContent = String(message || '');
  status.dataset.tone = tone;
}

function handleClick(event) {
  const node = event.target?.closest?.('[data-question-map-jump]');
  if (node) jumpToQuestion(node.dataset.questionMapJump);
}

function handleKeydown(event) {
  if (!['Enter', ' '].includes(event.key)) return;
  const node = event.target?.closest?.('[data-question-map-jump]');
  if (!node) return;
  event.preventDefault();
  jumpToQuestion(node.dataset.questionMapJump);
}

function handleAnchorSubmit(form) {
  const data = new FormData(form);
  store().anchorWish(form.dataset.wishId, {
    continuityAnchors: csv(data.get('continuity')),
    relationshipsTouched: csv(data.get('relationships')),
    memoryRefs: csv(data.get('memories')),
    createdAt: new Date().toISOString(),
    provenance: ['surface://universal-codex/wish-grove/anchors'],
  });
  form.reset();
  setStatus('Context linked. Earlier anchors remain in lineage.');
}

function handleObservationSubmit(form) {
  const data = new FormData(form);
  const kind = String(data.get('kind') || 'analysis');
  store().observeBranch(form.dataset.wishId, {
    branchId: form.dataset.branchId,
    observationId: token('branch-observation'),
    kind,
    source: kind === 'simulation' ? 'wish-grove:simulation' : 'wish-grove',
    summary: String(data.get('summary') || '').trim(),
    requirements: csv(data.get('requirements')),
    constraints: csv(data.get('constraints')),
    consequences: csv(data.get('consequences')),
    uncertainties: csv(data.get('uncertainties')),
    affectedRelationships: csv(data.get('relationships')),
    receiptRefs: csv(data.get('receipts')),
    createdAt: new Date().toISOString(),
    provenance: ['surface://universal-codex/wish-grove/branch-mirror'],
  });
  form.reset();
  setStatus('Branch observation recorded without selecting a winner.');
}

function handleSubmit(event) {
  const anchorForm = event.target?.closest?.('[data-wish-anchor-form]');
  const observationForm = event.target?.closest?.('[data-wish-branch-observation-form]');
  const form = observationForm || anchorForm;
  if (!form || !grove()?.contains(form)) return;
  event.preventDefault();
  try {
    if (observationForm) handleObservationSubmit(observationForm);
    else handleAnchorSubmit(anchorForm);
  } catch (error) {
    setStatus(error?.message || String(error), 'error');
  }
}

export function installWishGrovePossibilityMap() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener(CODEX_WISH_STORE_EVENT, schedule);
  document.addEventListener('arcsweep:magic-book-ready', schedule);
  document.addEventListener('arcsweep:magic-book-receipt', schedule);
  document.addEventListener('click', handleClick);
  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('submit', handleSubmit);

  observer = new MutationObserver(() => {
    if (!active() || !grove()) return;
    const host = grove();
    const needsConstellation = (store().snapshot().openQuestions || []).length > 0
      && !host.querySelector('[data-wish-grove-possibility-map]');
    const missingPanel = [...host.querySelectorAll('.wish-grove-card')]
      .some((card) => !card.querySelector('[data-wish-relational-panel]'));
    if (needsConstellation || missingPanel) schedule();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  schedule();
}

if (typeof document !== 'undefined') installWishGrovePossibilityMap();
