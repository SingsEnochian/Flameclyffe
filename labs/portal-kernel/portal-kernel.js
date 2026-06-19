import { portalWorldNodes, findPortalNode } from '../../apps/starwell/src/worlds/portalRegistry.js';
import { createMockFlameAdapter } from '../../apps/starwell/src/bridges/mockFlameAdapter.js';
import { resolveInputWeather } from '../../apps/starwell/src/interaction/starwellInputWeather.js';

const output = document.querySelector('[data-output]');
const branches = document.querySelector('[data-branches]');
const nodes = document.querySelector('[data-nodes]');
const growButton = document.querySelector('[data-grow]');
const inviteButton = document.querySelector('[data-invite]');
const resetButton = document.querySelector('[data-reset]');

const positions = new Map([
  ['templehouse', [90, 340]],
  ['lighted-steps', [190, 265]],
  ['templehouse-shrine', [295, 205]],
  ['ygg-gate', [365, 155]],
  ['dreaming-grove', [430, 150]],
  ['terra-aeterna', [575, 80]],
  ['luna-eira', [600, 170]],
  ['grove-playfield', [560, 270]],
]);

let grown = false;
let invited = false;
let currentNodeId = 'templehouse';
let lastMockExchange = null;

function render() {
  const activeNodes = grown ? portalWorldNodes : portalWorldNodes.filter((node) => node.id === 'templehouse');
  branches.innerHTML = '';
  nodes.innerHTML = '';

  activeNodes.forEach((node) => {
    if (node.parentId && positions.has(node.parentId) && positions.has(node.id)) {
      const [x1, y1] = positions.get(node.parentId);
      const [x2, y2] = positions.get(node.id);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${x1} ${y1} C ${x1 + 30} ${y1 - 60}, ${x2 - 40} ${y2 + 60}, ${x2} ${y2}`);
      path.setAttribute('class', 'branch');
      branches.append(path);
    }
  });

  activeNodes.forEach((node) => {
    const position = positions.get(node.id);
    if (!position) return;
    const [x, y] = position;
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', `node ${node.id === currentNodeId ? 'is-current' : ''}`);
    group.setAttribute('tabindex', '0');
    group.setAttribute('role', 'button');
    group.setAttribute('aria-label', node.title);
    group.addEventListener('click', () => focusNode(node.id));
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        focusNode(node.id);
      }
    });

    const halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    halo.setAttribute('cx', x);
    halo.setAttribute('cy', y);
    halo.setAttribute('r', node.id === currentNodeId ? 24 : 16);
    halo.setAttribute('class', 'halo');

    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', x);
    dot.setAttribute('cy', y);
    dot.setAttribute('r', invited && node.id === 'dreaming-grove' ? 10 : 7);
    dot.setAttribute('class', invited && node.id === 'dreaming-grove' ? 'dot invited' : 'dot');

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', x);
    label.setAttribute('y', y - 28);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('class', 'label');
    label.textContent = node.title;

    group.append(halo, dot, label);
    nodes.append(group);
  });

  renderOutput();
}

function focusNode(id) {
  currentNodeId = id;
  render();
}

function renderOutput(extra = {}) {
  const node = findPortalNode(currentNodeId);
  const weather = resolveInputWeather({ typing: { cadence: grown ? 0.42 : 0.08, revision: 0.1 }, pointer: { drift: invited ? 0.64 : 0.12 } });
  output.textContent = JSON.stringify({ node, invitedMockFlame: invited, weather, mockExchange: lastMockExchange, ...extra }, null, 2);
}

growButton?.addEventListener('click', () => {
  grown = true;
  currentNodeId = 'dreaming-grove';
  render();
});

inviteButton?.addEventListener('click', () => {
  const adapter = createMockFlameAdapter({ displayName: 'Mock Grove Flame', roomsAllowed: ['dreaming-grove'] });
  adapter.connect();
  invited = true;
  currentNodeId = 'dreaming-grove';
  lastMockExchange = { mockPassport: adapter.passport, mockReply: adapter.send('May I enter the Grove?') };
  render();
});

resetButton?.addEventListener('click', () => {
  grown = false;
  invited = false;
  lastMockExchange = null;
  currentNodeId = 'templehouse';
  render();
});

render();
