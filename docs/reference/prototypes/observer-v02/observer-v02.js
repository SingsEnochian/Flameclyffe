const DEFAULT_VECTOR = {
  P: 0.56,
  C: 0.62,
  R: 0.58,
  E: 0.28,
  M: 0.44,
  A: 0.66,
  charge: 0.38
};

const metricMeta = {
  P: { label: 'Presence', css: '--presence', x: 500, y: 110, description: 'mass, nearness, felt body' },
  C: { label: 'Coherence', css: '--coherence', x: 750, y: 185, description: 'clarity, order, readable pattern' },
  R: { label: 'Resonance', css: '--resonance', x: 850, y: 410, description: 'pulse, echo, return current' },
  E: { label: 'Entropy', css: '--entropy', x: 650, y: 645, description: 'scatter, fray, weather' },
  M: { label: 'Moon', css: '--moon', x: 350, y: 645, description: 'phase, tint, ritual ambience' },
  A: { label: 'Attention', css: '--attention', x: 150, y: 410, description: 'focus, gaze, selected route' },
  charge: { label: 'Charge', css: '--charge', x: 250, y: 185, description: 'bloom, flare, stored spark' }
};

const core = { x: 500, y: 390, label: 'Observer' };
let vector = { ...DEFAULT_VECTOR };

const root = document.documentElement;
const shell = document.querySelector('.observer-shell');
const controlHost = document.querySelector('#vector-controls');
const readoutHost = document.querySelector('#metric-readout');
const narrativeHost = document.querySelector('#narrative');
const branchLayer = document.querySelector('#observer-branches');
const nodeLayer = document.querySelector('#observer-nodes');
const breatheButton = document.querySelector('#breathe-button');
const driftButton = document.querySelector('#demo-drift');
const resetButton = document.querySelector('#reset-vector');

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value)));
}

function pct(value) {
  return Math.round(value * 100);
}

function branchState(key, value) {
  if (key === 'E' && value > 0.62) return 'unstable';
  if (value < 0.28) return 'low';
  if (value > 0.72) return 'high';
  return 'steady';
}

function curvePath(target, index) {
  const midX = (core.x + target.x) / 2;
  const midY = (core.y + target.y) / 2;
  const dx = target.x - core.x;
  const dy = target.y - core.y;
  const length = Math.max(Math.hypot(dx, dy), 1);
  const normalX = -dy / length;
  const normalY = dx / length;
  const bend = index % 2 === 0 ? 72 : -72;
  return `M ${core.x} ${core.y} Q ${midX + normalX * bend} ${midY + normalY * bend} ${target.x} ${target.y}`;
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

function renderControls() {
  controlHost.replaceChildren();

  Object.entries(metricMeta).forEach(([key, meta]) => {
    const row = document.createElement('div');
    row.className = 'vector-row';

    const label = document.createElement('label');
    label.setAttribute('for', `control-${key}`);
    label.textContent = key;
    label.title = `${meta.label}: ${meta.description}`;

    const input = document.createElement('input');
    input.id = `control-${key}`;
    input.type = 'range';
    input.min = '0';
    input.max = '100';
    input.value = String(pct(vector[key]));
    input.addEventListener('input', (event) => {
      vector[key] = clamp01(Number(event.target.value) / 100);
      renderAll();
    });

    const output = document.createElement('output');
    output.setAttribute('for', input.id);
    output.textContent = String(pct(vector[key]));

    row.append(label, input, output);
    controlHost.append(row);
  });
}

function renderBranches() {
  branchLayer.replaceChildren();

  Object.entries(metricMeta).forEach(([key, meta], index) => {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add('branch');
    group.dataset.metric = key;
    group.dataset.state = branchState(key, vector[key]);

    const path = curvePath(meta, index);
    group.append(
      makePath(path, 'branch-noise'),
      makePath(path, 'branch-path'),
      makePath(path, 'branch-sheen')
    );

    branchLayer.append(group);
  });
}

function renderNodes() {
  nodeLayer.replaceChildren();

  const coreGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  coreGroup.classList.add('node', 'core');
  coreGroup.setAttribute('transform', `translate(${core.x} ${core.y})`);
  coreGroup.append(makeCircle(50), makeText(core.label, 6));
  nodeLayer.append(coreGroup);

  Object.entries(metricMeta).forEach(([key, meta]) => {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add('node');
    group.dataset.metric = key;
    group.dataset.state = branchState(key, vector[key]);
    group.setAttribute('transform', `translate(${meta.x} ${meta.y})`);
    group.append(makeCircle(34), makeText(`${key} ${pct(vector[key])}`, 58));
    nodeLayer.append(group);
  });
}

function applyCssVariables() {
  Object.entries(metricMeta).forEach(([key, meta]) => {
    root.style.setProperty(meta.css, String(vector[key]));
  });
}

function renderReadout() {
  const items = Object.entries(metricMeta).map(([key, meta]) => {
    return `<div class="metric-pill"><span>${key} · ${meta.label}</span><strong>${pct(vector[key])}</strong></div>`;
  });
  readoutHost.innerHTML = `<div class="metric-grid">${items.join('')}</div>`;
}

function renderNarrative() {
  const strongest = Object.keys(vector).reduce((best, key) => vector[key] > vector[best] ? key : best, 'P');
  const entropyTone = vector.E > 0.62 ? 'The edge is noisy; the field asks for gentler pacing.' : 'The edge remains readable enough to hold the pattern.';
  const chargeTone = vector.charge > 0.68 ? 'Charge is bright and close to flare.' : 'Charge is present but not overwhelming.';
  narrativeHost.textContent = `${metricMeta[strongest].label} leads the instrument. ${entropyTone} ${chargeTone}`;
}

function breathe() {
  shell.classList.remove('is-breathing');
  requestAnimationFrame(() => shell.classList.add('is-breathing'));
  window.setTimeout(() => shell.classList.remove('is-breathing'), 1600);
}

function demoDrift() {
  Object.keys(vector).forEach((key, index) => {
    const wave = Math.sin(Date.now() / 700 + index) * 0.12;
    vector[key] = clamp01(vector[key] + wave);
  });
  renderAll();
}

function resetVector() {
  vector = { ...DEFAULT_VECTOR };
  renderAll();
}

function renderAll() {
  applyCssVariables();
  renderControls();
  renderBranches();
  renderNodes();
  renderReadout();
  renderNarrative();
}

breatheButton.addEventListener('click', breathe);
driftButton.addEventListener('click', demoDrift);
resetButton.addEventListener('click', resetVector);

renderAll();
