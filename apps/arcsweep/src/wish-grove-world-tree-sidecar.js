import './wish-grove-world-tree.css';

import { MAGIC_BOOK_BINDING_KEY } from './magic-book-model.js';
import { CODEX_WISH_STORE_EVENT, getCodexWishStore } from './codex/codex-wish-store.js';
import { buildCodexPossibilityTree } from './codex/codex-possibility-tree.js';

export const WISH_GROVE_WORLD_TREE_SCHEMA = 'hearthweave.wish-grove-world-tree/v0.1';

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

function nodeRadius(kind) {
  if (kind === 'wish') return 3.2;
  if (kind === 'branch') return 2.7;
  if (kind === 'question') return 2.5;
  return 1.9;
}

function treeMarkup(tree) {
  const byId = new Map(tree.nodes.map((node) => [node.id, node]));
  const edges = tree.edges.map((edge) => {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) return '';
    return '<line class="wish-grove-world-tree-edge" data-edge-kind="' + esc(edge.kind) + '" x1="' + (from.x * 100) + '" y1="' + (from.y * 100) + '" x2="' + (to.x * 100) + '" y2="' + (to.y * 100) + '"><title>' + esc(edge.reasons.join(', ')) + '</title></line>';
  }).join('');
  const nodes = tree.nodes.map((node) => [
    '<g class="wish-grove-world-tree-node" tabindex="0" role="button" data-tree-kind="' + esc(node.kind) + '" data-tree-ref="' + esc(node.refId || '') + '" transform="translate(' + (node.x * 100) + ' ' + (node.y * 100) + ')">',
      '<circle r="' + nodeRadius(node.kind) + '"></circle>',
      '<title>' + esc(node.kind + ': ' + node.label) + '</title>',
    '</g>',
  ].join('')).join('');
  const c = tree.counts;
  return [
    '<section class="wish-grove-world-tree" data-wish-grove-world-tree="' + esc(WISH_GROVE_WORLD_TREE_SCHEMA) + '">',
      '<header>',
        '<div><p class="wish-grove-label">Yggdrasil view</p><h3>The possibility tree</h3></div>',
        '<span>' + c.wishes + ' wishes · ' + c.branches + ' branches · ' + c.questions + ' questions</span>',
      '</header>',
      '<p class="wish-grove-world-tree-note">Left to right is type, not rank: wishes → branches → questions → continuity / relationship / memory anchors → belief / evidence / symbol references.</p>',
      '<div class="wish-grove-world-tree-frame">',
        '<svg viewBox="0 0 100 100" role="img" aria-label="Universal Codex possibility tree. Node position shows type and deterministic identity only, not importance.">',
          edges,
          nodes,
        '</svg>',
      '</div>',
      '<div class="wish-grove-world-tree-legend">',
        '<span data-kind="wish">wish</span><span data-kind="branch">branch</span><span data-kind="question">question</span><span data-kind="anchor">anchor</span><span data-kind="reference">reference</span>',
      '</div>',
      '<p class="wish-grove-world-tree-note">Every line is an explicit lineage or reference edge. The map does not infer hidden relationships, score possibilities, or select a preferred future.</p>',
    '</section>',
  ].join('');
}

export function renderWishGroveWorldTree() {
  if (!active()) return false;
  const host = grove();
  if (!host) return false;
  host.querySelector?.('[data-wish-grove-world-tree]')?.remove?.();
  const tree = buildCodexPossibilityTree(store().snapshot());
  if (!tree.nodes.length) return true;
  const status = host.querySelector('[data-wish-grove-status]');
  if (status?.insertAdjacentHTML) status.insertAdjacentHTML('afterend', treeMarkup(tree));
  else host.insertAdjacentHTML('afterbegin', treeMarkup(tree));
  return true;
}

function schedule() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    renderWishGroveWorldTree();
  });
}

function findByData(selector, key, value) {
  return [...(grove()?.querySelectorAll?.(selector) || [])].find((node) => node.dataset?.[key] === value) || null;
}

function jump(kind, ref) {
  let target = null;
  if (kind === 'wish') target = findByData('.wish-grove-card', 'wishId', ref);
  else if (kind === 'question') target = findByData('[data-question-id]', 'questionId', ref);
  else if (kind === 'branch') target = findByData('[data-branch-id]', 'branchId', ref) || findByData('[data-lifecycle-branch-id]', 'lifecycleBranchId', ref);
  if (!target) return;
  target.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  target.setAttribute?.('tabindex', '-1');
  target.focus?.({ preventScroll: true });
}

function onClick(event) {
  const node = event.target?.closest?.('[data-tree-kind][data-tree-ref]');
  if (node) jump(node.dataset.treeKind, node.dataset.treeRef);
}

function onKeydown(event) {
  if (!['Enter', ' '].includes(event.key)) return;
  const node = event.target?.closest?.('[data-tree-kind][data-tree-ref]');
  if (!node) return;
  event.preventDefault();
  jump(node.dataset.treeKind, node.dataset.treeRef);
}

export function installWishGroveWorldTree() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener(CODEX_WISH_STORE_EVENT, schedule);
  document.addEventListener('arcsweep:magic-book-ready', schedule);
  document.addEventListener('arcsweep:magic-book-receipt', schedule);
  document.addEventListener('click', onClick);
  document.addEventListener('keydown', onKeydown);
  observer = new MutationObserver(() => {
    if (!active() || !grove()) return;
    if (!grove().querySelector('[data-wish-grove-world-tree]')) schedule();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  schedule();
}

if (typeof document !== 'undefined') installWishGroveWorldTree();
