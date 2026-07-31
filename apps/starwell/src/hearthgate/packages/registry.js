import { definePracticePackage } from '../contracts.js';

export const practicePackages = Object.freeze([
  definePracticePackage({ id: 'hearthgate.design', name: 'Hearthgate Design System', capabilities: ['tokens', 'components', 'accessibility'] }),
  definePracticePackage({
    id: 'hearthgate.arcsweep',
    name: 'Arcsweep Navigation',
    capabilities: [
      'rooms',
      'wayfinding',
      'reviewed-continuity-import',
      'continuity-deduplication',
      'continuity-rollback',
      'provenance-preservation',
      'bounded-session-resolution',
      'ephemeral-session-context',
      'session-load-receipts',
    ],
  }),
  definePracticePackage({ id: 'terra.canon', name: 'Terra Aeterna Canon', capabilities: ['canon', 'timeline', 'artifacts'] }),
  definePracticePackage({ id: 'kelyran.language', name: 'Kelyran Language', capabilities: ['language', 'pronunciation'] }),
  definePracticePackage({ id: 'kelyran.glyphs', name: 'Kelyran Audible Glyphs', capabilities: ['glyphs', 'ink', 'playback'] }),
  definePracticePackage({ id: 'deep.observer', name: 'DEEP Observer', capabilities: ['observer', 'signals', 'premaq'] }),
  definePracticePackage({ id: 'runa.audio', name: 'Runa Acoustic Engine', capabilities: ['audio', 'binaural', 'world-profile'] }),
]);

export function getPracticePackage(id) {
  return practicePackages.find((pkg) => pkg.id === id) || null;
}

export function resolveProfilePackages(profile) {
  return profile.packages.map(getPracticePackage).filter(Boolean);
}
