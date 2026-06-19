import { buildLatticeGraph } from './lattice.js';
import { routeLatticeConfig, routeLatticeNodes } from './route-nodes.js';

const graph = buildLatticeGraph(routeLatticeNodes, routeLatticeConfig);
const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));

const svg = document.querySelector('[data-lattice-svg]');
const edgeList = document.querySelector('[data-edge-list]');
const nodeList = document.querySelector('[data-node-list]');
const detail = document.querySelector('[data-detail]');
const summary = document.querySelector('[data-summary]');

function svgElement(tag, attributes = {}) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
  return element;
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

  const edgeLayer = svgElement('g', { class: 'edge-layer' });
  const nodeLayer = svgElement('g', { class: 'node-layer' });
  svg.append(edgeLayer, nodeLayer);

  graph.edges.forEach((edge) => {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (!source || !target) return;

    const line = svgElement('line', {
      x1: source.position.x,
      y1: source.position.y,
      x2: target.position.x,
      y2: target.position.y,
      class: 'lattice-edge',
      'data-source': edge.source,
      'data-target': edge.target,
      'stroke-opacity': 0.24 + edge.strength * 0.56,
      'stroke-width': 1.2 + edge.strength * 3.2,
    });
    line.addEventListener('pointerenter', () => showEdge(edge));
    edgeLayer.append(line);
  });

  graph.nodes.forEach((node) => {
    const group = svgElement('a', { href: node.href, class: `lattice-node kind-${node.kind}` });
    const halo = svgElement('circle', {
      cx: node.position.x,
      cy: node.position.y,
      r: node.kind === 'core' ? 19 : 15,
      class: 'node-halo',
      filter: 'url(#softGlow)',
    });
    const dot = svgElement('circle', {
      cx: node.position.x,
      cy: node.position.y,
      r: node.kind === 'core' ? 8 : 6,
      class: 'node-dot',
    });
    const label = svgElement('text', {
      x: node.position.x,
      y: node.position.y + 30,
      class: 'node-label',
      'text-anchor': 'middle',
    });
    label.textContent = node.label;
    group.addEventListener('pointerenter', () => showNode(node));
    group.append(halo, dot, label);
    nodeLayer.append(group);
  });
}

function formatDistance(value) {
  return value.toFixed(3);
}

function showEdge(edge) {
  const source = nodeById.get(edge.source);
  const target = nodeById.get(edge.target);
  if (!detail || !source || !target) return;

  const strongest = [...edge.dimensions].sort((a, b) => b.contribution - a.contribution).slice(0, 3);
  detail.innerHTML = `
    <p class="eyebrow">Unit strand</p>
    <h2>${source.label} ⇄ ${target.label}</h2>
    <p>Distance <strong>${formatDistance(edge.distance)}</strong>, unit target <strong>${graph.metric.unitDistance}</strong>, strength <strong>${formatDistance(edge.strength)}</strong>.</p>
    <p class="micro">Loudest dimensions: ${strongest.map((item) => `${item.key} ${formatDistance(item.contribution)}`).join(', ')}</p>
  `;
}

function showNode(node) {
  if (!detail) return;
  const touching = graph.edges.filter((edge) => edge.source === node.id || edge.target === node.id);
  detail.innerHTML = `
    <p class="eyebrow">${node.kind}</p>
    <h2>${node.label}</h2>
    <p>${node.meta?.note ?? 'No note yet.'}</p>
    <p class="micro">Visible unit strands: ${touching.length}. Vector: ${graph.metric.dimensions.map((dimension) => `${dimension}: ${node.vector[dimension]}`).join(', ')}</p>
  `;
}

function renderLists() {
  if (summary) {
    summary.textContent = `${graph.nodes.length} visible nodes · ${graph.edges.length} unit strands · metric ${graph.metric.id}`;
  }

  if (edgeList) {
    edgeList.innerHTML = graph.edges
      .map((edge) => {
        const source = nodeById.get(edge.source);
        const target = nodeById.get(edge.target);
        return `<li><button type="button" data-edge="${edge.source}:${edge.target}">${source?.label ?? edge.source} ⇄ ${target?.label ?? edge.target}<span>${formatDistance(edge.distance)}</span></button></li>`;
      })
      .join('');

    edgeList.querySelectorAll('button[data-edge]').forEach((button) => {
      const [source, target] = button.dataset.edge.split(':');
      const edge = graph.edges.find((candidate) => candidate.source === source && candidate.target === target);
      if (edge) button.addEventListener('click', () => showEdge(edge));
    });
  }

  if (nodeList) {
    nodeList.innerHTML = graph.nodes
      .map((node) => `<li><a href="${node.href}">${node.label}<span>${node.kind}</span></a></li>`)
      .join('');
  }
}

renderGraph();
renderLists();
showNode(graph.nodes.find((node) => node.id === 'lattice-lab') ?? graph.nodes[0]);

window.FlameclyffeUnitResonanceLattice = Object.freeze({ graph });
