import { buildLivingTreeGraph, buildChildrenMap } from './lattice.js';
import { routeLatticeConfig, routeLatticeNodes } from './route-nodes.js';

const STORAGE_KEY = 'flameclyffe.unitResonanceLivingTree.v2';
const validNodeIds = new Set(routeLatticeNodes.map((node) => node.id));
const childrenById = buildChildrenMap(routeLatticeNodes);

const svg = document.querySelector('[data-lattice-svg]');
const edgeList = document.querySelector('[data-edge-list]');
const nodeList = document.querySelector('[data-node-list]');
const detail = document.querySelector('[data-detail]');
const summary = document.querySelector('[data-summary]');
const expandAllButton = document.querySelector('[data-expand-all]');
const pruneButton = document.querySelector('[data-prune]');

const state = loadState();
let graph = buildLivingTreeGraph(routeLatticeNodes, routeLatticeConfig, state);
let nodeById = new Map(graph.nodes.map((node) => [node.id, node]));

function defaultTreeState() {
  return {
    focusId: routeLatticeConfig.tree.defaultFocusId,
    openIds: [...routeLatticeConfig.tree.defaultOpenIds],
  };
}

function loadState() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    const focusId = validNodeIds.has(saved.focusId)
      ? saved.focusId
      : routeLatticeConfig.tree.defaultFocusId;
    const openIds = Array.isArray(saved.openIds)
      ? saved.openIds.filter((id) => validNodeIds.has(id))
      : [...routeLatticeConfig.tree.defaultOpenIds];

    return {
      focusId,
      openIds: openIds.length ? openIds : [...routeLatticeConfig.tree.defaultOpenIds],
    };
  } catch {
    return defaultTreeState();
  }
}

function saveState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setFocus(nodeId) {
  if (!validNodeIds.has(nodeId)) return;
  state.focusId = nodeId;
  if (!state.openIds.includes(nodeId)) state.openIds.push(nodeId);
  saveState();
  rerender();
}

function toggleBranch(nodeId) {
  if (!validNodeIds.has(nodeId)) return;
  const hasChildren = (childrenById.get(nodeId) ?? []).length > 0;
  if (!hasChildren) {
    setFocus(nodeId);
    return;
  }

  const isOpen = state.openIds.includes(nodeId);
  state.focusId = nodeId;
  state.openIds = isOpen ? state.openIds.filter((id) => id !== nodeId) : [...state.openIds, nodeId];
  if (nodeId === routeLatticeConfig.tree.rootId && isOpen) {
    state.openIds = [routeLatticeConfig.tree.rootId];
  }
  saveState();
  rerender();
}

function expandAll() {
  state.openIds = routeLatticeNodes
    .filter((node) => (childrenById.get(node.id) ?? []).length > 0)
    .map((node) => node.id);
  state.focusId = routeLatticeConfig.tree.defaultFocusId;
  saveState();
  rerender();
}

function pruneToTrunk() {
  state.openIds = [routeLatticeConfig.tree.rootId, ...(routeLatticeConfig.tree.defaultOpenIds ?? [])];
  state.focusId = routeLatticeConfig.tree.defaultFocusId;
  saveState();
  rerender();
}

function rerender() {
  graph = buildLivingTreeGraph(routeLatticeNodes, routeLatticeConfig, state);
  nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  renderGraph();
  renderLists();
  showNode(nodeById.get(state.focusId) ?? graph.nodes[0]);
}

function svgElement(tag, attributes = {}) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
  return element;
}

function branchPath(source, target) {
  const midY = (source.position.y + target.position.y) / 2;
  return `M ${source.position.x} ${source.position.y} C ${source.position.x} ${midY}, ${target.position.x} ${midY}, ${target.position.x} ${target.position.y}`;
}

function renderGraph() {
  if (!svg) return;
  svg.innerHTML = '';

  const defs = svgElement('defs');
  defs.innerHTML = `
    <filter id="softGlow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
  `;
  svg.append(defs);

  const branchLayer = svgElement('g', { class: 'branch-layer' });
  const resonanceLayer = svgElement('g', { class: 'resonance-layer' });
  const nodeLayer = svgElement('g', { class: 'node-layer' });
  svg.append(branchLayer, resonanceLayer, nodeLayer);

  graph.branchEdges.forEach((edge) => {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (!source || !target) return;

    const path = svgElement('path', {
      d: branchPath(source, target),
      class: `tree-branch ${target.isFocused ? 'is-focused' : ''} ${target.isAncestor ? 'is-ancestor' : ''}`,
      'data-source': edge.source,
      'data-target': edge.target,
    });
    path.addEventListener('pointerenter', () => showBranch(edge));
    branchLayer.append(path);
  });

  graph.resonanceEdges.forEach((edge) => {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (!source || !target) return;

    const line = svgElement('line', {
      x1: source.position.x,
      y1: source.position.y,
      x2: target.position.x,
      y2: target.position.y,
      class: 'resonance-strand',
      'data-source': edge.source,
      'data-target': edge.target,
      'stroke-opacity': 0.14 + edge.strength * 0.42,
      'stroke-width': 0.9 + edge.strength * 2.1,
    });
    line.addEventListener('pointerenter', () => showEdge(edge));
    resonanceLayer.append(line);
  });

  graph.nodes.forEach((node) => {
    const hasChildren = (childrenById.get(node.id) ?? []).length > 0;
    const group = svgElement('g', {
      class: [
        'lattice-node',
        `kind-${node.kind}`,
        node.isFocused ? 'is-focused' : '',
        node.isAncestor ? 'is-ancestor' : '',
        hasChildren ? 'has-children' : 'is-leaf',
        node.isOpen ? 'is-open' : 'is-closed',
      ].filter(Boolean).join(' '),
      tabindex: '0',
      role: 'button',
      'aria-label': `${node.label}. ${hasChildren ? 'Toggle branch' : 'Focus leaf'}`,
    });
    const halo = svgElement('circle', {
      cx: node.position.x,
      cy: node.position.y,
      r: node.isFocused ? 25 : hasChildren ? 20 : 16,
      class: 'node-halo',
      filter: 'url(#softGlow)',
    });
    const dot = svgElement('circle', {
      cx: node.position.x,
      cy: node.position.y,
      r: node.isFocused ? 10 : hasChildren ? 8 : 6,
      class: 'node-dot',
    });
    const bud = svgElement('text', {
      x: node.position.x,
      y: node.position.y + 4,
      class: 'node-bud',
      'text-anchor': 'middle',
    });
    bud.textContent = hasChildren ? (node.isOpen ? '−' : '+') : '•';
    const label = svgElement('text', {
      x: node.position.x,
      y: node.position.y - 24,
      class: 'node-label',
      'text-anchor': 'middle',
    });
    label.textContent = node.label;
    group.addEventListener('pointerenter', () => showNode(node));
    group.addEventListener('click', () => toggleBranch(node.id));
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleBranch(node.id);
      }
    });
    group.append(halo, dot, bud, label);
    nodeLayer.append(group);
  });
}

function formatDistance(value) {
  return value.toFixed(3);
}

function showBranch(edge) {
  const source = nodeById.get(edge.source);
  const target = nodeById.get(edge.target);
  if (!detail || !source || !target) return;

  detail.innerHTML = `
    <p class="eyebrow">Living branch</p>
    <h2>${source.label} grows ${target.label}</h2>
    <p>This is a tree relationship: parent to child. It controls what opens, collapses, and becomes reachable.</p>
    <p class="actions"><button type="button" data-focus-node="${target.id}">Focus ${target.label}</button><a href="${target.href}">${target.meta?.action ?? 'Open route'}</a></p>
  `;
  bindDetailButtons();
}

function showEdge(edge) {
  const source = nodeById.get(edge.source);
  const target = nodeById.get(edge.target);
  if (!detail || !source || !target) return;

  const strongest = [...edge.dimensions].sort((a, b) => b.contribution - a.contribution).slice(0, 3);
  detail.innerHTML = `
    <p class="eyebrow">Resonance strand</p>
    <h2>${source.label} ⇄ ${target.label}</h2>
    <p>These two visible branches are close in the configured route metric. Distance <strong>${formatDistance(edge.distance)}</strong>, unit target <strong>${graph.metric.unitDistance}</strong>, strength <strong>${formatDistance(edge.strength)}</strong>.</p>
    <p class="micro">Loudest dimensions: ${strongest.map((item) => `${item.key} ${formatDistance(item.contribution)}`).join(', ')}</p>
  `;
}

function showNode(node) {
  if (!detail || !node) return;
  const childCount = (childrenById.get(node.id) ?? []).length;
  const touching = graph.resonanceEdges.filter((edge) => edge.source === node.id || edge.target === node.id);
  detail.innerHTML = `
    <p class="eyebrow">${node.kind} ${childCount ? 'branch' : 'leaf'}</p>
    <h2>${node.label}</h2>
    <p>${node.meta?.note ?? 'No note yet.'}</p>
    <p class="actions"><button type="button" data-toggle-node="${node.id}">${childCount ? (node.isOpen ? 'Fold branch' : 'Grow branch') : 'Focus leaf'}</button><a href="${node.href}">${node.meta?.action ?? 'Open route'}</a></p>
    <p class="micro">Children: ${childCount}. Visible resonance strands: ${touching.length}. Vector: ${graph.metric.dimensions.map((dimension) => `${dimension}: ${node.vector[dimension]}`).join(', ')}</p>
  `;
  bindDetailButtons();
}

function bindDetailButtons() {
  detail?.querySelectorAll('[data-toggle-node]').forEach((button) => {
    button.addEventListener('click', () => toggleBranch(button.dataset.toggleNode));
  });
  detail?.querySelectorAll('[data-focus-node]').forEach((button) => {
    button.addEventListener('click', () => setFocus(button.dataset.focusNode));
  });
}

function renderLists() {
  if (summary) {
    summary.textContent = `${graph.nodes.length} visible branches · ${graph.branchEdges.length} tree limbs · ${graph.resonanceEdges.length} resonance strands · focus ${state.focusId}`;
  }

  if (edgeList) {
    edgeList.innerHTML = graph.resonanceEdges.length
      ? graph.resonanceEdges
        .map((edge) => {
          const source = nodeById.get(edge.source);
          const target = nodeById.get(edge.target);
          return `<li><button type="button" data-edge="${edge.source}:${edge.target}">${source?.label ?? edge.source} ⇄ ${target?.label ?? edge.target}<span>${formatDistance(edge.distance)}</span></button></li>`;
        })
        .join('')
      : '<li><span class="empty">Open more branches to reveal resonance strands.</span></li>';

    edgeList.querySelectorAll('button[data-edge]').forEach((button) => {
      const [source, target] = button.dataset.edge.split(':');
      const edge = graph.resonanceEdges.find((candidate) => candidate.source === source && candidate.target === target);
      if (edge) button.addEventListener('click', () => showEdge(edge));
    });
  }

  if (nodeList) {
    nodeList.innerHTML = graph.nodes
      .map((node) => `<li><button type="button" data-focus-node="${node.id}">${node.label}<span>${node.isOpen ? 'open' : node.hasChildren ? 'closed' : 'leaf'}</span></button></li>`)
      .join('');

    nodeList.querySelectorAll('button[data-focus-node]').forEach((button) => {
      button.addEventListener('click', () => setFocus(button.dataset.focusNode));
    });
  }
}

expandAllButton?.addEventListener('click', expandAll);
pruneButton?.addEventListener('click', pruneToTrunk);

rerender();

window.FlameclyffeUnitResonanceLattice = Object.freeze({
  get graph() {
    return graph;
  },
  state,
  expandAll,
  pruneToTrunk,
});
