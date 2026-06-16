const STATES = {
  dormant: 'Thin loch-green thread. Barely breathing.',
  listening: 'Soft gold signal bead. Waiting for intent.',
  active: 'Pulse current traveling from root to node.',
  stressed: 'Mauve static and unstable branch edge.',
  protected: 'Silver ward sheath around the branch.',
  severed: 'Broken route with residual afterglow.',
  healing: 'Green-gold repair moving slowly inward.'
};

const MODE_LABELS = {
  'signal-garden': 'Projects, logs, patches, and routes.',
  'consent-web': 'Sensory systems remain visible, but inactive until invited.',
  'mood-weather': 'DEEP values tint the branches and alter motion.',
  'lore-constellation': 'Canon relationships as a living map.'
};

const nodes = [
  { id: 'core', label: 'DEEP', x: 500, y: 370 },
  { id: 'sound', label: 'Sound', x: 180, y: 130, state: 'protected' },
  { id: 'haptics', label: 'Haptics', x: 390, y: 95, state: 'dormant' },
  { id: 'gaze', label: 'Gaze', x: 720, y: 120, state: 'listening' },
  { id: 'signals', label: 'Signals', x: 835, y: 350, state: 'active' },
  { id: 'wiki', label: 'Wiki', x: 675, y: 610, state: 'healing' },
  { id: 'weather', label: 'Weather', x: 335, y: 625, state: 'stressed' },
  { id: 'archive', label: 'Archive', x: 145, y: 405, state: 'severed' }
];

const branches = nodes
  .filter((node) => node.id !== 'core')
  .map((node, index) => ({
    id: `branch-${node.id}`,
    label: node.label,
    from: 'core',
    to: node.id,
    state: node.state,
    bend: index % 2 === 0 ? 90 : -90
  }));

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

function curvePath(branch) {
  const start = byId(branch.from);
  const end = byId(branch.to);
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.max(Math.hypot(dx, dy), 1);
  const normalX = -dy / length;
  const normalY = dx / length;
  const controlX = midX + normalX * branch.bend;
  const controlY = midY + normalY * branch.bend;
  return `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`;
}

function renderBranches() {
  branchLayer.replaceChildren();

  branches.forEach((branch) => {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add('branch');
    group.dataset.branchId = branch.id;
    group.dataset.state = branch.state;
    group.setAttribute('tabindex', '0');
    group.setAttribute('role', 'button');
    group.setAttribute('aria-label', `${branch.label} branch, ${branch.state}`);

    const path = curvePath(branch);
    const ward = makePath(path, 'branch-ward');
    const base = makePath(path, 'branch-path');
    const gap = makePath(path, 'branch-gap');
    const sheen = makePath(path, 'branch-sheen');

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

function makePath(d, className) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  path.classList.add(className);
  return path;
}

function renderNodes() {
  nodeLayer.replaceChildren();

  nodes.forEach((node) => {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add('node');
    if (node.id === 'core') group.classList.add('core');
    group.setAttribute('transform', `translate(${node.x} ${node.y})`);

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', node.id === 'core' ? 46 : 34);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('y', node.id === 'core' ? 6 : 58);
    text.textContent = node.label;

    group.append(circle, text);
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
    ${STATES[branch.state]}<br><br>
    Mode: ${mode.replace('-', ' ')}<br>
    ${MODE_LABELS[mode]}
  `;
}

function breathe() {
  shell.classList.remove('is-breathing');
  requestAnimationFrame(() => {
    shell.classList.add('is-breathing');
  });
  window.setTimeout(() => shell.classList.remove('is-breathing'), 1700);
}

function cycleStates() {
  const stateNames = Object.keys(STATES);
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
