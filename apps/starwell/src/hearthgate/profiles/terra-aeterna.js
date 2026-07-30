import { defineReceptionProfile } from '../contracts.js';

export const terraAeternaProfile = defineReceptionProfile({
  id: 'terra-aeterna',
  name: 'Terra Aeterna',
  world: 'Terra Aeterna',
  theme: 'terra-aeterna',
  language: 'kelyran-en',
  calendar: 'terra-v0.1',
  clock: { timeZone: 'America/New_York', format: '24h', worldTime: true },
  packages: [
    'hearthgate.design',
    'hearthgate.arcsweep',
    'terra.canon',
    'kelyran.language',
    'kelyran.glyphs',
    'deep.observer',
    'runa.audio',
  ],
  rooms: ['hearth', 'library', 'foundry', 'observatory', 'laboratory', 'conservatory', 'archive', 'house'],
  capabilities: {
    observer: true,
    audio: true,
    glyphs: true,
    canon: true,
    timeline: true,
  },
});
