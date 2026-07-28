import { FOUNDATION_DOCUMENTS, FOUNDATION_WORLD } from './house-dr-bundle-foundation.js';
import { HOUSE_DOCUMENTS_A, HOUSE_WORLDS_A } from './house-dr-bundle-worlds-a.js';
import { HOUSE_DOCUMENTS_B, HOUSE_WORLDS_B } from './house-dr-bundle-worlds-b.js';

export const HOUSE_DR_BUNDLE = Object.freeze({
  id: 'hearthweave-notion-dr-library',
  version: '2026.07.28.2',
  title: 'Hearthweave Desired Reality Library',
  source: 'Notion Shifting Wiki and Desired Reality Scripts',
  decisionDate: '2026-07-28',
  defaultWorldSourceKey: 'hearthweave-foundation',
  worlds: Object.freeze([
    FOUNDATION_WORLD,
    ...HOUSE_WORLDS_A,
    ...HOUSE_WORLDS_B,
  ]),
  documents: Object.freeze([
    ...FOUNDATION_DOCUMENTS,
    ...HOUSE_DOCUMENTS_A,
    ...HOUSE_DOCUMENTS_B,
  ]),
});

export const HOUSE_DR_BUNDLE_SUMMARY = Object.freeze({
  id: HOUSE_DR_BUNDLE.id,
  version: HOUSE_DR_BUNDLE.version,
  worlds: HOUSE_DR_BUNDLE.worlds.length,
  documents: HOUSE_DR_BUNDLE.documents.length,
  source: HOUSE_DR_BUNDLE.source,
  decisionDate: HOUSE_DR_BUNDLE.decisionDate,
});
