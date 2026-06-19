export const FIFTH_FORM_ANCHORS = {
  seed: {
    label: 'Seed Mode',
    role: 'listening',
    axis: { x: 0, y: 0, z: 0 },
    vector: { P: 0.46, C: 0.54, R: 0.48, E: 0.18, M: 0.42, A: 0.38, charge: 0.32 },
    chambers: ['anchor'],
    statement: 'The form is listening. No anchor is dominant yet.'
  },
  stonewood: {
    label: 'Stonewood',
    role: 'rooting',
    axis: { x: -0.18, y: 0.42, z: -0.34 },
    vector: { P: 0.86, C: 0.78, R: 0.52, E: 0.16, M: 0.44, A: 0.62, charge: 0.48 },
    chambers: ['anchor', 'witness'],
    statement: 'The form roots downward. Presence and coherence carry the field while entropy stays contained.'
  },
  starwell: {
    label: 'STARWELL',
    role: 'lifting',
    axis: { x: 0.04, y: -0.58, z: 0.36 },
    vector: { P: 0.68, C: 0.84, R: 0.78, E: 0.22, M: 0.62, A: 0.82, charge: 0.72 },
    chambers: ['witness', 'charge'],
    statement: 'The form lifts and clarifies. Coherence, resonance, and attention draw the upper geometry forward.'
  },
  'ashfen-cairn': {
    label: 'Ashfen Cairn',
    role: 'mending',
    axis: { x: -0.54, y: 0.08, z: -0.12 },
    vector: { P: 0.72, C: 0.66, R: 0.58, E: 0.28, M: 0.48, A: 0.56, charge: 0.42 },
    chambers: ['anchor', 'flow'],
    statement: 'The form pulls left and earthward. The mending hinge opens between root and flow.'
  },
  'wraithtide-shore': {
    label: 'Wraithtide Shore',
    role: 'tidal',
    axis: { x: 0.56, y: 0.18, z: 0.22 },
    vector: { P: 0.58, C: 0.64, R: 0.88, E: 0.34, M: 0.76, A: 0.68, charge: 0.66 },
    chambers: ['flow', 'charge'],
    statement: 'The form becomes tidal. Resonance and moon-state pull the right-hand geometry into current.'
  },
  withinwood: {
    label: 'The Withinwood',
    role: 'inward',
    axis: { x: -0.36, y: -0.18, z: -0.58 },
    vector: { P: 0.64, C: 0.72, R: 0.46, E: 0.24, M: 0.88, A: 0.78, charge: 0.38 },
    chambers: ['witness', 'release'],
    statement: 'The form turns inward. Attention and moon-depth darken the passage without breaking the field.'
  },
  'salt-veil': {
    label: 'Salt Veil',
    role: 'release',
    axis: { x: 0.28, y: 0.58, z: -0.22 },
    vector: { P: 0.52, C: 0.58, R: 0.62, E: 0.42, M: 0.54, A: 0.5, charge: 0.46 },
    chambers: ['flow', 'release'],
    statement: 'The form sifts and releases. Entropy is allowed to move through a bounded lower channel.'
  }
};

export const FIFTH_FORM_CHAMBERS = [
  { id: 'anchor', label: 'Anchor', x: 0, y: 0.42, z: -0.24, turn: 0 },
  { id: 'witness', label: 'Witness', x: 0, y: -0.5, z: 0.22, turn: 36 },
  { id: 'flow', label: 'Flow', x: 0.5, y: 0.1, z: 0.08, turn: 108 },
  { id: 'charge', label: 'Charge', x: -0.5, y: 0.1, z: 0.28, turn: 252 },
  { id: 'release', label: 'Release', x: 0, y: 0.03, z: -0.5, turn: 180 }
];

export function getAnchorFromHash(hash) {
  const id = String(hash || '').replace('#', '') || 'seed';
  return FIFTH_FORM_ANCHORS[id] ? id : 'seed';
}
