export const BRANCH_STATES = {
  dormant: 'Thin loch-green thread. Barely breathing.',
  listening: 'Soft gold signal bead. Waiting for intent.',
  active: 'Pulse current traveling from root to node.',
  stressed: 'Mauve static and unstable branch edge.',
  protected: 'Silver ward sheath around the branch.',
  severed: 'Broken route with residual afterglow.',
  healing: 'Green-gold repair moving slowly inward.',
};

export const MODE_LABELS = {
  'signal-garden': 'Projects, logs, patches, and routes.',
  'consent-web': 'Sensory systems remain visible, but inactive until invited.',
  'mood-weather': 'DEEP values tint the branches and alter motion.',
  'lore-constellation': 'Canon relationships as a living map.',
};

export const BRANCH_LOOM_CONFIG = {
  bend: 90,
  breatheMs: 1700,
  nodeRadius: 34,
  coreRadius: 46,
  labelOffsetY: 58,
  coreLabelOffsetY: 6,
};

export const BRANCH_LOOM_NODES = [
  { id: 'core', label: 'DEEP', x: 500, y: 370 },
  { id: 'sound', label: 'Sound', x: 180, y: 130, state: 'protected' },
  { id: 'haptics', label: 'Haptics', x: 390, y: 95, state: 'dormant' },
  { id: 'gaze', label: 'Gaze', x: 720, y: 120, state: 'listening' },
  { id: 'signals', label: 'Signals', x: 835, y: 350, state: 'active' },
  { id: 'wiki', label: 'Wiki', x: 675, y: 610, state: 'healing' },
  { id: 'weather', label: 'Weather', x: 335, y: 625, state: 'stressed' },
  { id: 'archive', label: 'Archive', x: 145, y: 405, state: 'severed' },
];

export function makeBranchLoomBranches(nodes = BRANCH_LOOM_NODES) {
  return nodes
    .filter((node) => node.id !== 'core')
    .map((node, index) => ({
      id: `branch-${node.id}`,
      label: node.label,
      from: 'core',
      to: node.id,
      state: node.state,
      bend: index % 2 === 0 ? BRANCH_LOOM_CONFIG.bend : -BRANCH_LOOM_CONFIG.bend,
    }));
}
