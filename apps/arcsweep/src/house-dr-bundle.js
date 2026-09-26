import { FOUNDATION_DOCUMENTS, FOUNDATION_WORLD } from './house-dr-bundle-foundation.js';
import { HOUSE_DOCUMENTS_A, HOUSE_WORLDS_A } from './house-dr-bundle-worlds-a.js';
import { HOUSE_DOCUMENTS_B, HOUSE_WORLDS_B } from './house-dr-bundle-worlds-b.js';
import { applyTaaverenVaenCanonOverlay } from './taaveren-vaen-canon-overlay.js';

export const HOUSE_DR_FIELD_PACKS = Object.freeze([
  Object.freeze({
    id: 'ultra-detailed-dr-script',
    schemaVersion: 'arcsweep.dr-field-pack/v0.1',
    path: '../presets/dr-script-ultra-detailed.v0.1.json',
    sourceTitle: 'Copy of ☆ ⥤ ultra-detailed DR script template ⥢ ☆',
    optional: true,
    worldSpecificExtensions: true,
  }),
]);

const CANON_OVERLAY = applyTaaverenVaenCanonOverlay({
  worlds: [
    FOUNDATION_WORLD,
    ...HOUSE_WORLDS_A,
    ...HOUSE_WORLDS_B,
  ],
  documents: [
    ...FOUNDATION_DOCUMENTS,
    ...HOUSE_DOCUMENTS_A,
    ...HOUSE_DOCUMENTS_B,
  ],
});

const WORLDS_WITH_FIELD_PACKS = Object.freeze(CANON_OVERLAY.worlds.map((world) => Object.freeze({
  ...world,
  fieldPacks: Object.freeze([
    ...new Set([
      ...(world.fieldPacks || []),
      ...HOUSE_DR_FIELD_PACKS.map((pack) => pack.path),
    ]),
  ]),
})));

export const HOUSE_DR_BUNDLE = Object.freeze({
  id: 'hearthweave-notion-dr-library',
  version: '2026.09.26.1',
  title: 'Hearthweave Desired Reality Library',
  source: 'Notion Shifting Wiki and Desired Reality Scripts with receipted current-canon overlays',
  decisionDate: '2026-09-26',
  defaultWorldSourceKey: 'hearthweave-foundation',
  fieldPacks: HOUSE_DR_FIELD_PACKS,
  worlds: WORLDS_WITH_FIELD_PACKS,
  documents: CANON_OVERLAY.documents,
  canonOverlays: Object.freeze([CANON_OVERLAY.overlay]),
});

export const HOUSE_DR_BUNDLE_SUMMARY = Object.freeze({
  id: HOUSE_DR_BUNDLE.id,
  version: HOUSE_DR_BUNDLE.version,
  worlds: HOUSE_DR_BUNDLE.worlds.length,
  documents: HOUSE_DR_BUNDLE.documents.length,
  fieldPacks: HOUSE_DR_BUNDLE.fieldPacks.length,
  source: HOUSE_DR_BUNDLE.source,
  decisionDate: HOUSE_DR_BUNDLE.decisionDate,
});
