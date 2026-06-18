const DEFAULT_SEED = {
  schema_version: '1.0.0',
  room_id: 'moonroot-writing-chamber',
  title: 'Moonroot Writing Chamber',
  kind: 'writing_room',
  purpose: 'draft_fiction',
  theme: {
    palette: 'moonroot',
    materials: ['white_stonewood', 'dark_water', 'copper_lantern'],
    mood: ['quiet', 'luminous', 'guarded', 'tidal'],
    light: 'moonlit_bioluminescent',
    motion: 'slow_tidal_pulse'
  },
  renderer: {
    layout: 'split_chamber',
    node_shape: 'bloom',
    connection_shape: 'tendril',
    ambient_density: 0.42,
    effects: ['spores', 'moon_glow', 'ripples']
  },
  nodes: [
    { id: 'writing-desk', kind: 'editor', label: 'Writing Desk', position: { x: 0.32, y: 0.62 } },
    { id: 'archive-pool', kind: 'archive', label: 'Archive Pool', position: { x: 0.72, y: 0.36 } },
    { id: 'moon-window', kind: 'ambient', label: 'Moon Window', position: { x: 0.5, y: 0.18 } },
    { id: 'tea-table', kind: 'rest', label: 'Tea Table', position: { x: 0.26, y: 0.82 } },
    { id: 'grove-door', kind: 'portal', label: 'Door to Grove', target: 'whispering-grove', position: { x: 0.82, y: 0.72 } }
  ],
  signals: { growth: 'save_event', phase: 'manual_interaction', glow: 'focus_mode' },
  consent: { live_text: false, interaction_rhythm: false, local_context: false, sound: false, haptics: false },
  storage: { drafts: 'local_first', exports: 'manual_only', packets: 'none' },
  accessibility: { reduced_motion_default: true, low_stim_available: true, keyboard_navigation: true }
};

const PALETTE_TOKENS = {
  moonroot: {
    bg: '#050807',
    panel: 'rgba(14, 24, 20, 0.72)',
    text: '#d9e7df',
    muted: '#95aa9f',
    accent: '#a3e2c9',
    accentSoft: 'rgba(163, 226, 201, 0.14)',
    border: 'rgba(163, 226, 201, 0.18)',
    copper: '#c98755'
  }
};

const MATERIAL_TOKENS = {
  white_stonewood: { accent: '#dff8ed', border: 'rgba(223, 248, 237, 0.2)' },
  dark_water: { bg: '#040807', panel: 'rgba(11, 21, 18, 0.78)' },
  copper_lantern: { copper: '#c98755' }
};

const state = { seed: DEFAULT_SEED, activeNodeId: null, leafGrowth: 0.44, phaseAngle: 0 };
const root = document.documentElement;
const shell = document.querySelector('.grove-shell');
const titleEl = document.getElementById('groveTitle');
const purposeEl = document.getElementById('grovePurpose');
const kindEl = document.getElementById('groveKind');
const paletteEl = document.getElementById('grovePalette');
const storyEl = document.getElementById('groveStory');
const nodeLayer = document.getElementById('nodeLayer');
const tendrilLayer = document.getElementById('tendrilLayer');
const saveGlowButton = document.getElementById('saveGlowButton');
const lowStimButton = document.getElementById('lowStimButton');
const exportSeedButton = document.getElementById('exportSeedButton');

async function loadSeed() {
  try {
    const response = await fetch('../examples/moonroot-writing-chamber.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Seed fetch failed: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn('Using embedded Moonroot fallback seed.', error);
    return DEFAULT_SEED;
  }
}

function setVar(name, value) {
  if (value) root.style.setProperty(name, value);
}

function applyTheme(seed) {
  let tokens = { ...(PALETTE_TOKENS[seed.theme?.palette] ?? PALETTE_TOKENS.moonroot) };
  for (const material of seed.theme?.materials ?? []) {
    tokens = { ...tokens, ...(MATERIAL_TOKENS[material] ?? {}) };
  }
  setVar('--grove-bg', tokens.bg);
  setVar('--grove-panel', tokens.panel);
  setVar('--grove-text', tokens.text);
  setVar('--grove-muted', tokens.muted);
  setVar('--grove-accent', tokens.accent);
  setVar('--grove-accent-soft', tokens.accentSoft);
  setVar('--grove-border', tokens.border);
  setVar('--grove-copper', tokens.copper);
}

function words(value) {
  return String(value ?? 'unknown').replaceAll(/[_-]+/g, ' ');
}

function renderHeader(seed) {
  titleEl.textContent = seed.title ?? 'Untitled Grove';
  purposeEl.textContent = [
    `Purpose: ${words(seed.purpose)}`,
    `Mood: ${(seed.theme?.mood ?? []).map(words).join(', ') || 'unspecified'}`,
    `Materials: ${(seed.theme?.materials ?? []).map(words).join(', ') || 'unspecified'}`
  ].join(' · ');
  kindEl.textContent = words(seed.kind);
  paletteEl.textContent = words(seed.theme?.palette);
}

function fallbackPosition(index, total) {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2 - Math.PI / 2;
  return { x: 0.5 + Math.cos(angle) * 0.32, y: 0.5 + Math.sin(angle) * 0.32 };
}

function nodePosition(node, index, total) {
  const pos = node.position ?? fallbackPosition(index, total);
  return {
    x: Math.min(Math.max(Number(pos.x ?? 0.5), 0.06), 0.94),
    y: Math.min(Math.max(Number(pos.y ?? 0.5), 0.08), 0.9)
  };
}

function renderNodes(seed) {
  nodeLayer.replaceChildren();
  const total = seed.nodes?.length ?? 0;
  for (const [index, node] of (seed.nodes ?? []).entries()) {
    const pos = nodePosition(node, index, total);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'grove-node';
    button.dataset.nodeId = node.id;
    button.dataset.kind = node.kind;
    button.style.setProperty('--node-x', pos.x);
    button.style.setProperty('--node-y', pos.y);
    button.setAttribute('aria-pressed', String(state.activeNodeId === node.id));
    button.setAttribute('aria-label', `${node.label}, ${words(node.kind)} node`);

    const label = document.createElement('span');
    label.className = 'node-label';
    label.textContent = node.label;
    button.append(label);
    button.addEventListener('click', () => selectNode(node));
    nodeLayer.append(button);
  }
  requestAnimationFrame(renderTendrils);
}

function renderTendrils() {
  tendrilLayer.replaceChildren();
  const buttons = [...document.querySelectorAll('.grove-node')];
  if (buttons.length < 2) return;
  const box = tendrilLayer.getBoundingClientRect();
  const namespace = 'http://www.w3.org/2000/svg';

  for (let index = 0; index < buttons.length - 1; index += 1) {
    const from = buttons[index].getBoundingClientRect();
    const to = buttons[index + 1].getBoundingClientRect();
    const x1 = from.left + from.width / 2 - box.left;
    const y1 = from.top + from.height / 2 - box.top;
    const x2 = to.left + to.width / 2 - box.left;
    const y2 = to.top + to.height / 2 - box.top;
    const cx = (x1 + x2) / 2 + Math.sin(index + state.phaseAngle) * 34;
    const cy = (y1 + y2) / 2 - Math.cos(index + state.phaseAngle) * 34;
    const path = document.createElementNS(namespace, 'path');
    path.setAttribute('d', `M ${x1},${y1} Q ${cx},${cy} ${x2},${y2}`);
    tendrilLayer.append(path);
  }
}

function updateDisplay({ growth = state.leafGrowth, phase = state.phaseAngle } = {}) {
  state.leafGrowth = Math.min(Math.max(growth, 0.18), 1.25);
  state.phaseAngle = phase;
  setVar('--leaf-growth', String(state.leafGrowth));
  setVar('--phase-angle', `${state.phaseAngle}rad`);
  renderTendrils();
}

function selectNode(node) {
  state.activeNodeId = node.id;
  const target = node.target ? ` It opens toward ${words(node.target)}.` : '';
  storyEl.textContent = `You approach ${node.label}, a ${words(node.kind)} node in ${state.seed.title}.${target}`;
  updateDisplay({ growth: state.leafGrowth + 0.08, phase: state.phaseAngle + 0.48 });
  for (const button of document.querySelectorAll('.grove-node')) {
    button.setAttribute('aria-pressed', String(button.dataset.nodeId === node.id));
  }
}

function simulateSaveGlow() {
  const signal = state.seed.signals?.growth ?? 'save_event';
  storyEl.textContent = `The Grove received a local ${words(signal)} preview. Leaves brighten inside the renderer.`;
  updateDisplay({ growth: state.leafGrowth + 0.12, phase: state.phaseAngle + 0.22 });
}

function toggleLowStim() {
  const isLowStim = shell.dataset.lowStim === 'true';
  shell.dataset.lowStim = String(!isLowStim);
  lowStimButton.setAttribute('aria-pressed', String(!isLowStim));
  lowStimButton.textContent = isLowStim ? 'Low-stim preview' : 'Standard preview';
}

function showSeedSummary() {
  storyEl.textContent = `${state.seed.title} is loaded from a Grove Seed with ${(state.seed.nodes ?? []).length} nodes and ${state.seed.renderer?.connection_shape ?? 'no'} connections.`;
}

function bindControls() {
  saveGlowButton.addEventListener('click', simulateSaveGlow);
  lowStimButton.addEventListener('click', toggleLowStim);
  exportSeedButton.addEventListener('click', showSeedSummary);
  window.addEventListener('resize', () => requestAnimationFrame(renderTendrils));
}

async function init() {
  state.seed = await loadSeed();
  applyTheme(state.seed);
  renderHeader(state.seed);
  renderNodes(state.seed);
  bindControls();
  storyEl.textContent = state.seed.accessibility?.screen_reader_summary || `${state.seed.title} is ready. Choose a node to preview the Grove.`;
}

init();
