import { FOUNDATION_DOCUMENTS, FOUNDATION_WORLD } from './house-dr-bundle-foundation.js';
import { HOUSE_DOCUMENTS_A, HOUSE_WORLDS_A } from './house-dr-bundle-worlds-a.js';
import { HOUSE_DOCUMENTS_B, HOUSE_WORLDS_B } from './house-dr-bundle-worlds-b.js';
import { applyTaaverenVaenCanonOverlay } from './taaveren-vaen-canon-overlay.js';

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

export const HOUSE_DR_BUNDLE = Object.freeze({
  id: 'hearthweave-notion-dr-library',
  version: '2026.09.05.1',
  title: 'Hearthweave Desired Reality Library',
  source: 'Notion Shifting Wiki and Desired Reality Scripts with receipted current-canon overlays',
  decisionDate: '2026-09-05',
  defaultWorldSourceKey: 'hearthweave-foundation',
  worlds: CANON_OVERLAY.worlds,
  documents: CANON_OVERLAY.documents,
  canonOverlays: Object.freeze([CANON_OVERLAY.overlay]),
});

export const HOUSE_DR_BUNDLE_SUMMARY = Object.freeze({
  id: HOUSE_DR_BUNDLE.id,
  version: HOUSE_DR_BUNDLE.version,
  worlds: HOUSE_DR_BUNDLE.worlds.length,
  documents: HOUSE_DR_BUNDLE.documents.length,
  source: HOUSE_DR_BUNDLE.source,
  decisionDate: HOUSE_DR_BUNDLE.decisionDate,
});
