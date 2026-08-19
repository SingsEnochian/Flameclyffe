import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearKnowledgeSubjectCache,
  loadKnowledgeSubject,
  resolveKnowledgeSubjectCells,
} from '../src/knowledge-subject-loader.js';

const manifest = {
  contract: 'arcsweep.subject-bank-manifest/v1',
  subjects: {
    'character:kestrelle': {
      label: 'Kestrelle',
      banks: ['./cells/characters/kestrelle.cells.json'],
    },
  },
};

const bank = {
  cells: [
    {
      id: 'kestrelle.identity.name',
      cellType: 'identity',
      subject: { kind: 'character', id: 'kestrelle' },
      predicate: 'has_name',
      value: 'Kestrelle',
      status: 'stable',
      authority: { kind: 'project_canon', confidence: 1 },
      source: { surface: 'github', locator: 'test/kestrelle.md' },
      mutability: 'stable_core',
    },
    {
      id: 'kestrelle.knowledge.future-discovery',
      cellType: 'character_knowledge',
      subject: { kind: 'character', id: 'kestrelle' },
      predicate: 'knows',
      value: 'the sealed letter contains a map',
      status: 'active',
      authority: { kind: 'project_canon', confidence: 1 },
      source: { surface: 'github', locator: 'test/chapter-8.md' },
      temporal: { validFrom: '2026-09-10T00:00:00.000Z', validUntil: null },
      mutability: 'revisable_with_provenance',
    },
  ],
};

function fakeFetch(url) {
  const value = String(url);
  if (value.endsWith('/subject-banks.json')) return Promise.resolve({ ok: true, json: async () => manifest });
  if (value.endsWith('/cells/characters/kestrelle.cells.json')) return Promise.resolve({ ok: true, json: async () => bank });
  return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
}

test('character knowledge does not activate before its chronology gate', async () => {
  clearKnowledgeSubjectCache();
  const before = await resolveKnowledgeSubjectCells(
    { kind: 'character', id: 'kestrelle' },
    { cellTypes: ['identity', 'character_knowledge'], at: '2026-09-01T00:00:00.000Z' },
    { fetchImpl: fakeFetch, includeLocal: false },
  );
  assert.deepEqual(before.cells.map((cell) => cell.id), ['kestrelle.identity.name']);

  const after = await resolveKnowledgeSubjectCells(
    { kind: 'character', id: 'kestrelle' },
    { cellTypes: ['identity', 'character_knowledge'], at: '2026-09-12T00:00:00.000Z' },
    { fetchImpl: fakeFetch, includeLocal: false },
  );
  assert.equal(after.cells.some((cell) => cell.id === 'kestrelle.knowledge.future-discovery'), true);
});

test('narrative voice may exist entirely in local learned cortex before a static bank is created', async () => {
  clearKnowledgeSubjectCache();
  const localCell = {
    id: 'narrative_voice.deep-third.learned.1',
    cellType: 'model_observation',
    subject: { kind: 'narrative_voice', id: 'deep-third' },
    predicate: 'observed_during_writing',
    value: 'keeps physical sensation close to the POV character',
    status: 'provisional',
    authority: { kind: 'model_inference', speakerOrAuthor: 'Lioreal', confidence: null },
    source: { surface: 'runtime', locator: 'arcsweep-margin:scene-form:content' },
    mutability: 'append_only',
  };
  const loaded = await loadKnowledgeSubject(
    { kind: 'narrative_voice', id: 'deep-third', label: 'Deep Third' },
    {
      fetchImpl: fakeFetch,
      localCellLoader: async ({ subjectKind, subjectId }) =>
        subjectKind === 'narrative_voice' && subjectId === 'deep-third' ? [localCell] : [],
    },
  );
  assert.equal(loaded.staticBankCount, 0);
  assert.equal(loaded.localCellCount, 1);
  assert.equal(loaded.cells[0].id, localCell.id);
});
