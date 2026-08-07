// Braided Spine inheritance: docs/HEARTHGATE_BRAIDED_SPINE.md
// PREMAQ reading order: Presence · Memory · Qualia · Resonance · Entanglement · Agency · Coherence
// Stable wire order: P C R E M A Q

export const FIFTH_FORM_ANCHORS = {
  seed: {
    label: 'Seed Mode',
    role: 'listening',
    axis: { x: 0, y: 0, z: 0 },
    vector: { P: 0.46, C: 0.54, R: 0.48, E: 0.18, M: 0.42, A: 0.38, Q: 0.32 },
    chambers: ['anchor'],
    statement: 'The form listens. Presence holds the seed while Memory and Qualia remain close to Root.'
  },
  stonewood: {
    label: 'Stonewood',
    role: 'rooting',
    axis: { x: -0.18, y: 0.42, z: -0.34 },
    vector: { P: 0.86, C: 0.78, R: 0.52, E: 0.56, M: 0.74, A: 0.62, Q: 0.48 },
    chambers: ['anchor', 'witness'],
    statement: 'The form roots downward. Presence, Memory, and Coherence carry Stonewood while Entanglement binds its living relations.'
  },
  starwell: {
    label: 'STARWELL',
    role: 'lifting',
    axis: { x: 0.04, y: -0.58, z: 0.36 },
    vector: { P: 0.68, C: 0.84, R: 0.78, E: 0.72, M: 0.62, A: 0.82, Q: 0.72 },
    chambers: ['witness', 'qualia'],
    statement: 'The form lifts and clarifies. Resonance, Agency, Qualia, and Coherence draw the upper geometry forward.'
  },
  'ashfen-cairn': {
    label: 'Ashfen Cairn',
    role: 'mending',
    axis: { x: -0.54, y: 0.08, z: -0.12 },
    vector: { P: 0.72, C: 0.66, R: 0.58, E: 0.68, M: 0.78, A: 0.56, Q: 0.42 },
    chambers: ['anchor', 'flow'],
    statement: 'The form pulls left and earthward. Memory and Entanglement open the mending hinge between Root and Flow.'
  },
  'wraithtide-shore': {
    label: 'Wraithtide Shore',
    role: 'tidal',
    axis: { x: 0.56, y: 0.18, z: 0.22 },
    vector: { P: 0.58, C: 0.64, R: 0.88, E: 0.76, M: 0.76, A: 0.68, Q: 0.66 },
    chambers: ['flow', 'qualia'],
    statement: 'The form becomes tidal. Resonance, Memory, Entanglement, and Qualia draw the right-hand geometry into current.'
  },
  withinwood: {
    label: 'The Withinwood',
    role: 'inward',
    axis: { x: -0.36, y: -0.18, z: -0.58 },
    vector: { P: 0.64, C: 0.72, R: 0.46, E: 0.74, M: 0.88, A: 0.78, Q: 0.68 },
    chambers: ['witness', 'release'],
    statement: 'The form turns inward. Memory and Qualia deepen the passage while Agency remains available to answer.'
  },
  'salt-veil': {
    label: 'Salt Veil',
    role: 'release',
    axis: { x: 0.28, y: 0.58, z: -0.22 },
    vector: { P: 0.52, C: 0.58, R: 0.62, E: 0.82, M: 0.54, A: 0.5, Q: 0.46 },
    chambers: ['flow', 'release'],
    statement: 'The form sifts and releases. Entanglement carries the crossing through Flow while Memory preserves what returns.'
  }
};

export const FIFTH_FORM_CHAMBERS = [
  { id: 'anchor', label: 'Anchor', x: 0, y: 0.42, z: -0.24, turn: 0 },
  { id: 'witness', label: 'Witness', x: 0, y: -0.5, z: 0.22, turn: 36 },
  { id: 'flow', label: 'Flow', x: 0.5, y: 0.1, z: 0.08, turn: 108 },
  { id: 'qualia', label: 'Qualia', x: -0.5, y: 0.1, z: 0.28, turn: 252 },
  { id: 'release', label: 'Release', x: 0, y: 0.03, z: -0.5, turn: 180 }
];

export function getAnchorFromHash(hash) {
  const id = String(hash || '').replace('#', '') || 'seed';
  return FIFTH_FORM_ANCHORS[id] ? id : 'seed';
}
