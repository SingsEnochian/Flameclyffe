import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveKnowledgeCells } from '../src/knowledge-graph.js';

const futureKnowledge = {
  id: 'kestrelle.knowledge.sealed-map',
  cellType: 'character_knowledge',
  subject: { kind: 'character', id: 'kestrelle' },
  predicate: 'knows',
  value: 'the sealed letter contains a map',
  status: 'active',
  authority: { kind: 'project_canon', confidence: 1 },
  source: { surface: 'github', locator: 'test/chapter-8.md' },
  temporal: { storyOrderFrom: 57, storyOrderUntil: null },
  mutability: 'revisable_with_provenance',
};

test('fictional story order blocks future character knowledge before its event gate', () => {
  const before = resolveKnowledgeCells([futureKnowledge], {
    subject: { kind: 'character', id: 'kestrelle' },
    cellTypes: ['character_knowledge'],
    storyOrder: 42,
  });
  assert.equal(before.length, 0);
});

test('fictional story order activates character knowledge at and after its event gate', () => {
  const atGate = resolveKnowledgeCells([futureKnowledge], {
    subject: { kind: 'character', id: 'kestrelle' },
    cellTypes: ['character_knowledge'],
    storyOrder: 57,
  });
  const later = resolveKnowledgeCells([futureKnowledge], {
    subject: { kind: 'character', id: 'kestrelle' },
    cellTypes: ['character_knowledge'],
    storyOrder: 91,
  });
  assert.deepEqual(atGate.map((cell) => cell.id), ['kestrelle.knowledge.sealed-map']);
  assert.deepEqual(later.map((cell) => cell.id), ['kestrelle.knowledge.sealed-map']);
});
