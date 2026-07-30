import { defineRoom } from '../contracts.js';

export const hearthgateRooms = Object.freeze([
  defineRoom({ id: 'hearth', title: 'Hearth', icon: '✴', description: 'Living Room, anchors, doors, and shared presence.' }),
  defineRoom({ id: 'library', title: 'Library', icon: '▤', description: 'Canon, worlds, characters, timelines, discoveries, and manuscripts.', packages: ['terra.canon'] }),
  defineRoom({ id: 'foundry', title: 'Foundry', icon: '◇', description: 'Glyph Studio, brushes, fonts, calligraphy, teaching, and export.', packages: ['kelyran.glyphs'] }),
  defineRoom({ id: 'observatory', title: 'Observatory', icon: '◉', description: 'Current sky, Observer, signals, logs, science, and world overlays.', packages: ['deep.observer'] }),
  defineRoom({ id: 'laboratory', title: 'Laboratory', icon: '△', description: 'Research instruments, experiments, models, and diagnostics.' }),
  defineRoom({ id: 'conservatory', title: 'Conservatory', icon: '♫', description: 'World sound spaces, binaural stacks, tone profiles, and playback.', packages: ['runa.audio'] }),
  defineRoom({ id: 'archive', title: 'Archive', icon: '▣', description: 'Exports, snapshots, provenance, backups, and retained records.' }),
  defineRoom({ id: 'house', title: 'House', icon: '⌂', description: 'Reception Profiles, installed packages, permissions, and settings.' }),
]);

export function getRoom(id) {
  return hearthgateRooms.find((room) => room.id === id) || null;
}
