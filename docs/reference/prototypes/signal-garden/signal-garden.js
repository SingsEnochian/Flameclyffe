const SIGNALS = [
  { id: 'presence', label: 'Presence', x: 500, y: 120 },
  { id: 'coherence', label: 'Coherence', x: 740, y: 190 },
  { id: 'resonance', label: 'Resonance', x: 850, y: 410 },
  { id: 'entropy', label: 'Entropy', x: 650, y: 640 },
  { id: 'moon', label: 'Moon', x: 350, y: 640 },
  { id: 'attention', label: 'Attention', x: 150, y: 410 },
  { id: 'charge', label: 'Charge', x: 260, y: 190 }
];

const CORE = { x: 500, y: 390, label: 'DEEP' };
const ACTIVE_MS = 1400;

const branchLayer = document.querySelector('#branch-layer');
const nodeLayer = document.querySelector('#node-layer');
const signalList = document.querySelector('#signal-list');
const status = document.querySelector('#signal-status');
const pulseAllButton = document.querySelector('#pulse-all');
const resetButton = document.querySelector('#reset-pulses');

let activeSignals = new Set();
let settleTimer = null;

function curvePath(target, index) {
  const midX = (CORE.x + target.x) / 2;
  const midY = (CORE.y + target.y) / 2;
  const dx = target.x - CORE.x;
  const dy = target.y - CORE.y;
  const length = Math.max(Math.hypot(dx, dy), 1);
  const normalX = -dy / length;
  const normalY = dx / length;
  const bend = index % 2 === 0 ? 70 : -70;
  return `M ${CORE.x} ${CORE.y} Q ${midX + normalX * bend} ${midY + normalY * bend} ${target.x} ${target.y}`;
}

function makePath(d, className) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  path.classList.add(className);
  return path;
}

function makeCircle(radius) {
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('r', radius);
  return circle;
}

function makeText(label, y) {
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('y', y);
  text.textContent = label;
  return text;
}

function renderBranches() {
  branchLayer.replaceChildren();

  SIGNALS.forEach((signal, index) => {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add('branch');
    group.dataset.signal = signal.id;
    group.dataset.active = String(activeSignals.has(signal.id));
    const path = curvePath(signal, index);
    group.append(makePath(path, 'branch-path'), makePath(path, 'branch-pulse'));
    branchLayer.append(group);
  });
}

function renderNodes() {
  nodeLayer.replaceChildren();

  const core = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  core.classList.add('node', 'core');
  core.setAttribute('transform', `translate(${CORE.x} ${CORE.y})`);
  core.append(makeCircle(50), makeText(CORE.label, 6));
  nodeLayer.append(core);

  SIGNALS.forEach((signal) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    node.classList.add('node');
    node.dataset.signal = signal.id;
    node.dataset.active = String(activeSignals.has(signal.id));
    node.setAttribute('transform', `translate(${signal.x} ${signal.y})`);
    node.append(makeCircle(34), makeText(signal.label, 58));
    nodeLayer.append(node);
  });
}

function renderControls() {
  signalList.replaceChildren();

  SIGNALS.forEach((signal) => {
    const button = document.createElement('button');
    button.className = 'signal-button';
    button.type = 'button';
    button.dataset.signal = signal.id;
    button.setAttribute('aria-pressed', String(activeSignals.has(signal.id)));
    button.textContent = signal.label;
    button.addEventListener('click', () => pulseSignal(signal.id));
    signalList.append(button);
  });
}

function pulseSignal(id) {
  activeSignals = new Set([id]);
  scheduleSettle();
  renderAll();
}

function pulseAll() {
  activeSignals = new Set(SIGNALS.map((signal) => signal.id));
  scheduleSettle();
  renderAll();
}

function settle() {
  activeSignals.clear();
  if (settleTimer) window.clearTimeout(settleTimer);
  settleTimer = null;
  renderAll();
}

function scheduleSettle() {
  if (settleTimer) window.clearTimeout(settleTimer);
  settleTimer = window.setTimeout(settle, ACTIVE_MS);
}

function updateStatus() {
  if (activeSignals.size === 0) {
    status.textContent = 'No signal selected.';
    return;
  }
  const labels = SIGNALS.filter((signal) => activeSignals.has(signal.id)).map((signal) => signal.label);
  status.textContent = `Pulsing: ${labels.join(', ')}.`;
}

function renderAll() {
  renderBranches();
  renderNodes();
  renderControls();
  updateStatus();
}

pulseAllButton.addEventListener('click', pulseAll);
resetButton.addEventListener('click', settle);

renderAll();
