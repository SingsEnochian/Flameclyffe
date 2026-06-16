import { createCircle, createPath, createSvgElement, createText } from '../shared/dom-svg.js';
import { alternatingBend, curvedPathBetween } from '../shared/svg-paths.js';
import {
  SIGNAL_GARDEN_CONFIG,
  SIGNAL_GARDEN_CORE,
  SIGNAL_GARDEN_SIGNALS,
} from './signal-garden.model.js';

const branchLayer = document.querySelector('#branch-layer');
const nodeLayer = document.querySelector('#node-layer');
const signalList = document.querySelector('#signal-list');
const status = document.querySelector('#signal-status');
const pulseAllButton = document.querySelector('#pulse-all');
const resetButton = document.querySelector('#reset-pulses');

let activeSignals = new Set();
let settleTimer = null;

function renderBranches() {
  branchLayer.replaceChildren();

  SIGNAL_GARDEN_SIGNALS.forEach((signal, index) => {
    const group = createSvgElement('g');
    group.classList.add('branch');
    group.dataset.signal = signal.id;
    group.dataset.active = String(activeSignals.has(signal.id));

    const path = curvedPathBetween(SIGNAL_GARDEN_CORE, signal, {
      bend: alternatingBend(index, SIGNAL_GARDEN_CONFIG.bend),
    });

    group.append(createPath(path, 'branch-path'), createPath(path, 'branch-pulse'));
    branchLayer.append(group);
  });
}

function renderNodes() {
  nodeLayer.replaceChildren();

  const core = createSvgElement('g', {
    transform: `translate(${SIGNAL_GARDEN_CORE.x} ${SIGNAL_GARDEN_CORE.y})`,
  });
  core.classList.add('node', 'core');
  core.append(
    createCircle(SIGNAL_GARDEN_CONFIG.coreRadius),
    createText(SIGNAL_GARDEN_CORE.label, SIGNAL_GARDEN_CONFIG.coreLabelOffsetY)
  );
  nodeLayer.append(core);

  SIGNAL_GARDEN_SIGNALS.forEach((signal) => {
    const node = createSvgElement('g', {
      transform: `translate(${signal.x} ${signal.y})`,
    });
    node.classList.add('node');
    node.dataset.signal = signal.id;
    node.dataset.active = String(activeSignals.has(signal.id));
    node.append(
      createCircle(SIGNAL_GARDEN_CONFIG.nodeRadius),
      createText(signal.label, SIGNAL_GARDEN_CONFIG.labelOffsetY)
    );
    nodeLayer.append(node);
  });
}

function renderControls() {
  signalList.replaceChildren();

  SIGNAL_GARDEN_SIGNALS.forEach((signal) => {
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
  activeSignals = new Set(SIGNAL_GARDEN_SIGNALS.map((signal) => signal.id));
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
  settleTimer = window.setTimeout(settle, SIGNAL_GARDEN_CONFIG.activeMs);
}

function updateStatus() {
  if (activeSignals.size === 0) {
    status.textContent = 'No signal selected.';
    return;
  }

  const labels = SIGNAL_GARDEN_SIGNALS
    .filter((signal) => activeSignals.has(signal.id))
    .map((signal) => signal.label);

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
