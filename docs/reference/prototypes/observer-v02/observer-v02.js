import { createCircle, createPath, createSvgElement, createText } from '../shared/dom-svg.js';
import { alternatingBend, curvedPathBetween } from '../shared/svg-paths.js';
import {
  DEFAULT_VECTOR,
  OBSERVER_CONFIG,
  OBSERVER_CORE,
  OBSERVER_METRICS,
} from './observer-vector.model.js';

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
  if (key === 'E' && value > OBSERVER_CONFIG.entropyUnstableThreshold) return 'unstable';
  if (value < OBSERVER_CONFIG.lowThreshold) return 'low';
  if (value > OBSERVER_CONFIG.highThreshold) return 'high';
  return 'steady';
}

function renderControls() {
  controlHost.replaceChildren();

  Object.entries(OBSERVER_METRICS).forEach(([key, meta]) => {
    const row = document.createElement('div');
    row.className = 'vector-row';

    const label = document.createElement('label');
    label.setAttribute('for', `control-${key}`);
    label.textContent = key;
    label.title = meta.label;

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

  Object.entries(OBSERVER_METRICS).forEach(([key, meta], index) => {
    const group = createSvgElement('g');
    group.classList.add('branch');
    group.dataset.metric = key;
    group.dataset.state = branchState(key, vector[key]);

    const path = curvedPathBetween(OBSERVER_CORE, meta, {
      bend: alternatingBend(index, OBSERVER_CONFIG.bend),
    });

    group.append(
      createPath(path, 'branch-noise'),
      createPath(path, 'branch-path'),
      createPath(path, 'branch-sheen')
    );

    branchLayer.append(group);
  });
}

function renderNodes() {
  nodeLayer.replaceChildren();

  const coreGroup = createSvgElement('g', {
    transform: `translate(${OBSERVER_CORE.x} ${OBSERVER_CORE.y})`,
  });
  coreGroup.classList.add('node', 'core');
  coreGroup.append(
    createCircle(OBSERVER_CONFIG.coreRadius),
    createText(OBSERVER_CORE.label, OBSERVER_CONFIG.coreLabelOffsetY)
  );
  nodeLayer.append(coreGroup);

  Object.entries(OBSERVER_METRICS).forEach(([key, meta]) => {
    const group = createSvgElement('g', {
      transform: `translate(${meta.x} ${meta.y})`,
    });
    group.classList.add('node');
    group.dataset.metric = key;
    group.dataset.state = branchState(key, vector[key]);
    group.append(
      createCircle(OBSERVER_CONFIG.nodeRadius),
      createText(`${key} ${pct(vector[key])}`, OBSERVER_CONFIG.labelOffsetY)
    );
    nodeLayer.append(group);
  });
}

function applyCssVariables() {
  Object.entries(OBSERVER_METRICS).forEach(([key, meta]) => {
    root.style.setProperty(meta.css, String(vector[key]));
  });
}

function renderReadout() {
  const items = Object.entries(OBSERVER_METRICS).map(([key, meta]) => {
    return `<div class="metric-pill"><span>${key} · ${meta.label}</span><strong>${pct(vector[key])}</strong></div>`;
  });
  readoutHost.innerHTML = `<div class="metric-grid">${items.join('')}</div>`;
}

function renderNarrative() {
  const strongest = Object.keys(vector).reduce((best, key) => vector[key] > vector[best] ? key : best, 'P');
  const entropyTone = vector.E > OBSERVER_CONFIG.entropyUnstableThreshold
    ? 'The edge is noisy; the field asks for gentler pacing.'
    : 'The edge remains readable enough to hold the pattern.';
  const chargeTone = vector.charge > OBSERVER_CONFIG.flareThreshold
    ? 'Charge is bright and close to flare.'
    : 'Charge is present but not overwhelming.';
  narrativeHost.textContent = `${OBSERVER_METRICS[strongest].label} leads the instrument. ${entropyTone} ${chargeTone}`;
}

function breathe() {
  shell.classList.remove('is-breathing');
  requestAnimationFrame(() => shell.classList.add('is-breathing'));
  window.setTimeout(() => shell.classList.remove('is-breathing'), OBSERVER_CONFIG.breatheMs);
}

function demoDrift() {
  Object.keys(vector).forEach((key, index) => {
    const wave = Math.sin(Date.now() / OBSERVER_CONFIG.driftInterval + index) * OBSERVER_CONFIG.driftScale;
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
