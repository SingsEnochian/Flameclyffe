import { createCircle, createPath, createSvgElement, createText } from '../shared/dom-svg.js';
import { curvedPathBetween } from '../shared/svg-paths.js';
import {
  BRANCH_LOOM_CONFIG,
  BRANCH_LOOM_NODES,
  BRANCH_STATES,
  MODE_LABELS,
  makeBranchLoomBranches,
} from './branch-loom.model.js';

const nodes = BRANCH_LOOM_NODES.map((node) => ({ ...node }));
const branches = makeBranchLoomBranches(nodes).map((branch) => ({ ...branch }));

const branchLayer = document.querySelector('#branch-layer');
const nodeLayer = document.querySelector('#node-layer');
const branchSelect = document.querySelector('#branch-select');
const stateSelect = document.querySelector('#state-select');
const modeSelect = document.querySelector('#mode-select');
const readout = document.querySelector('#branch-readout');
const breatheButton = document.querySelector('#breathe-button');
const cycleButton = document.querySelector('#cycle-button');
const shell = document.querySelector('.loom-shell');

let selectedBranchId = branches[0].id;

function byId(id) {
  return nodes.find((node) => node.id === id);
}

function renderBranches() {
  branchLayer.replaceChildren();

  branches.forEach((branch) => {
    const group = createSvgElement('g');
    group.classList.add('branch');
    group.dataset.branchId = branch.id;
    group.dataset.state = branch.state;
    group.setAttribute('tabindex', '0');
    group.setAttribute('role', 'button');
    group.setAttribute('aria-label', `${branch.label} branch, ${branch.state}`);

    const path = curvedPathBetween(byId(branch.from), byId(branch.to), { bend: branch.bend });
    const ward = createPath(path, 'branch-ward');
    const base = createPath(path, 'branch-path');
    const gap = createPath(path, 'branch-gap');
    const sheen = createPath(path, 'branch-sheen');

    group.append(ward, base, gap, sheen);
    group.addEventListener('click', () => selectBranch(branch.id));
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectBranch(branch.id);
      }
    });

    branchLayer.append(group);
  });
}

function renderNodes() {
  nodeLayer.replaceChildren();

  nodes.forEach((node) => {
    const group = createSvgElement('g', {
      transform: `translate(${node.x} ${node.y})`,
    });
    group.classList.add('node');
    if (node.id === 'core') group.classList.add('core');

    group.append(
      createCircle(node.id === 'core' ? BRANCH_LOOM_CONFIG.coreRadius : BRANCH_LOOM_CONFIG.nodeRadius),
      createText(
        node.label,
        node.id === 'core' ? BRANCH_LOOM_CONFIG.coreLabelOffsetY : BRANCH_LOOM_CONFIG.labelOffsetY
      )
    );
    nodeLayer.append(group);
  });
}

function populateControls() {
  branchSelect.replaceChildren();

  branches.forEach((branch) => {
    const option = document.createElement('option');
    option.value = branch.id;
    option.textContent = branch.label;
    branchSelect.append(option);
  });
}

function selectBranch(branchId) {
  selectedBranchId = branchId;
  const branch = branches.find((item) => item.id === selectedBranchId);
  branchSelect.value = selectedBranchId;
  stateSelect.value = branch.state;
  updateReadout();
}

function setSelectedState(state) {
  const branch = branches.find((item) => item.id === selectedBranchId);
  branch.state = state;
  renderBranches();
  updateReadout();
}

function updateReadout() {
  const branch = branches.find((item) => item.id === selectedBranchId);
  const mode = modeSelect.value;
  readout.innerHTML = `
    <strong>${branch.label}</strong><br>
    State: ${branch.state}<br>
    ${BRANCH_STATES[branch.state]}<br><br>
    Mode: ${mode.replace('-', ' ')}<br>
    ${MODE_LABELS[mode]}
  `;
}

function breathe() {
  shell.classList.remove('is-breathing');
  requestAnimationFrame(() => {
    shell.classList.add('is-breathing');
  });
  window.setTimeout(() => shell.classList.remove('is-breathing'), BRANCH_LOOM_CONFIG.breatheMs);
}

function cycleStates() {
  const stateNames = Object.keys(BRANCH_STATES);
  branches.forEach((branch) => {
    const currentIndex = stateNames.indexOf(branch.state);
    branch.state = stateNames[(currentIndex + 1) % stateNames.length];
  });
  renderBranches();
  selectBranch(selectedBranchId);
}

branchSelect.addEventListener('change', (event) => selectBranch(event.target.value));
stateSelect.addEventListener('change', (event) => setSelectedState(event.target.value));
modeSelect.addEventListener('change', (event) => {
  shell.dataset.mode = event.target.value;
  updateReadout();
});
breatheButton.addEventListener('click', breathe);
cycleButton.addEventListener('click', cycleStates);

populateControls();
renderBranches();
renderNodes();
selectBranch(selectedBranchId);
