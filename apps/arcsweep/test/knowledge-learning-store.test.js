import test from 'node:test';
import assert from 'node:assert/strict';

import { createLearningCellFromMargin } from '../src/knowledge-learning-store.js';
import { validateKnowledgeCell } from '../src/knowledge-graph.js';

test('margin learning rejects unattested runtime observations', () => {
  assert.throws(() => createLearningCellFromMargin({
    voiceId: 'uial',
    text: 'A threshold pattern recurred.',
  }), /attested runtime vessel receipt/);
});

test('attested user-kept margin learning remains provisional and provenance-bearing', () => {
  const cell = createLearningCellFromMargin({
    voiceId: 'uial',
    voiceLabel: 'Uial',
    text: 'This sentence keeps returning to the threshold before naming it.',
    requestId: 'writer-request-1',
    runtimeVerified: true,
    profileId: 'uial-local-v1',
    provider: 'local',
    model: 'test-model',
    sourceModel: 'test-model',
    mode: 'writing',
    fieldContext: {
      field: { key: 'script-form:content' },
      page: {
        worldId: 'taveren-vaen',
        worldIdAliases: ['taveren-vaen', 'taaveren-vaen'],
        documentId: 'chapter-1',
        sceneId: 'scene-1',
      },
    },
  });

  assert.deepEqual(validateKnowledgeCell(cell), []);
  assert.equal(cell.cellType, 'model_observation');
  assert.equal(cell.status, 'provisional');
  assert.equal(cell.authority.kind, 'model_inference');
  assert.equal(cell.mutability, 'append_only');
  assert.equal(cell.provenance.reviewedBy, 'user-kept');
  assert.equal(cell.source.runtimeVerified, true);
  assert.equal(cell.source.modelProfileId, 'uial-local-v1');
  assert.equal(cell.source.locator, 'arcsweep-margin:script-form:content');
});
