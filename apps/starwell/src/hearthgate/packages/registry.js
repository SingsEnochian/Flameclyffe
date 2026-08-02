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
      'premaq-v2-ingest',
      'temporal-quantum-state',
      'norm-preserving-evolution',
      'collapse-release-cycle',
      'outward-spiral-memory',
      'dual-presence-anchoring',
      'temporal-twist',
      'canon-calibrated-world-projection',
      'sovereign-canon-library-manifest',
      'large-corpus-stream-ingest',
      'desktop-authoritative-library',
      'web-library-window',
      'loopback-bifrost-library-bridge',
      'paired-session-authority',
      'canon-library-search',
      'canon-library-backup-restore',
      'canon-library-sync-receipts',
      'foundation-overlay-separation',
    ],
  }),
  definePracticePackage({ id: 'terra.canon', name: 'Terra Aeterna Canon', capabilities: ['canon', 'timeline', 'artifacts'] }),
  definePracticePackage({ id: 'kelyran.language', name: 'Kelyran Language', capabilities: ['language', 'pronunciation'] }),
  definePracticePackage({ id: 'kelyran.glyphs', name: 'Kelyran Audible Glyphs', capabilities: ['glyphs', 'ink', 'playback'] }),
  definePracticePackage({
    id: 'deep.observer',
    name: 'DEEP Observer',
    capabilities: ['observer', 'signals', 'premaq', 'premaq-v2', 'temporal-state-source', 'receipt-provenance'],
  }),
  definePracticePackage({ id: 'runa.audio', name: 'Runa Acoustic Engine', capabilities: ['audio', 'binaural', 'world-profile'] }),
]);

export function getPracticePackage(id) {
  return practicePackages.find((pkg) => pkg.id === id) || null;
}

export function resolveProfilePackages(profile) {
  return profile.packages.map(getPracticePackage).filter(Boolean);
}
