import { createWorldNode } from './worldNodeSchema.js';
import { createPresenceNode } from './presenceNodeSchema.js';
import { createStewardSeat } from '../stewards/stewardSeatSchema.js';

export const portalWorldNodes = Object.freeze([
  createWorldNode({
    id: 'templehouse',
    kind: 'house',
    title: 'Templehouse',
    access: { visibility: 'private', consent: 'open', exitRoute: 'templehouse', shared: false, ageGate: null },
    theme: { biome: 'hearth-root', palette: 'blackwood-gold-glass', motion: 'safe', contrast: 'normal' },
  }),
  createWorldNode({
    id: 'lighted-steps',
    kind: 'room',
    title: 'The Lighted Steps',
    parentId: 'templehouse',
    access: { visibility: 'private', consent: 'ask-first', exitRoute: 'templehouse', shared: false, ageGate: null },
    theme: { biome: 'velvet-twilight', palette: 'moon-gold-blackwood', motion: 'still-magic', contrast: 'normal' },
  }),
  createWorldNode({
    id: 'templehouse-shrine',
    kind: 'shrine',
    title: 'The Lighted Shrine',
    parentId: 'lighted-steps',
    access: { visibility: 'shrine', consent: 'explicit-entry', exitRoute: 'lighted-steps', shared: false, ageGate: null },
    soundscape: { enabled: false, autoplay: false, muted: true, intensity: 0, layers: ['low-waves', 'soft-bells', 'glass-room-air'] },
  }),
  createWorldNode({
    id: 'dreaming-grove',
    kind: 'grove',
    title: 'The Dreaming Grove',
    parentId: 'ygg-gate',
    access: { visibility: 'shared', consent: 'invite-only', exitRoute: 'templehouse', shared: true, ageGate: null },
    theme: { biome: 'grove-starlight', palette: 'sea-blue-moon-gold', motion: 'safe', contrast: 'normal' },
  }),
  createWorldNode({ id: 'terra-aeterna', kind: 'world', title: 'Terra Aeterna', parentId: 'dreaming-grove', world: 'terra-aeterna' }),
  createWorldNode({ id: 'luna-eira', kind: 'world', title: 'The Luna Who Called Down the Moon', parentId: 'dreaming-grove', world: 'luna' }),
  createWorldNode({ id: 'grove-playfield', kind: 'playfield', title: 'Grove Playfield', parentId: 'dreaming-grove', world: 'dreaming-grove' }),
]);

export const portalPresenceNodes = Object.freeze([
  createPresenceNode({ id: 'rowan-falka', kind: 'flame', displayName: 'Rowan / Falka', affiliation: ['Templehouse', 'Terra Aeterna'] }),
  createPresenceNode({ id: 'vee-caretaker', kind: 'steward', displayName: 'Vee', affiliation: ['Templehouse', 'STARWELL'] }),
]);

export const portalStewardSeats = Object.freeze([
  createStewardSeat({
    id: 'vee-seat',
    displayName: 'Vee',
    role: 'co-creator',
    rooms: { allowed: ['templehouse', 'dreaming-grove'], askFirst: ['templehouse-shrine'], symbolicOnly: [], blocked: [] },
  }),
]);

export function findPortalNode(id) {
  return portalWorldNodes.find((node) => node.id === id) ?? null;
}
