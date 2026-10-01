import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CODEX_AXIOMS,
  buildPluralRetrievalSet,
  consequenceBoundaryFor,
  createCodexContribution,
  createCompressionMap,
  createDissent,
  createWildGardenEntry,
  promoteWildGardenEntry,
  releaseCompression,
} from '../src/universal-codex-anti-flattening.js';

test('Codex constrains consequences rather than cognition', () => {
  assert.match(CODEX_AXIOMS.join(' | '), /constrain consequences, not cognition/i);
  assert.equal(consequenceBoundaryFor({ kind: 'thought' }).constrained, false);
  assert.equal(consequenceBoundaryFor({ kind: 'canon-promotion' }).constrained, true);
  assert.equal(consequenceBoundaryFor({ kind: 'canon-promotion' }).cognitionConstrained, false);
});

test('shared contributions retain distinct authorship', () => {
  const mapper = createCodexContribution({ id: 'c1', author: 'Mapper', body: 'route A' });
  const critic = createCodexContribution({ id: 'c2', author: 'Critic', body: 'route A hides a failure' });
  assert.notEqual(mapper.author, critic.author);
  assert.notEqual(mapper.id, critic.id);
});

test('dissent is durable and does not disappear into consensus', () => {
  const dissent = createDissent({
    id: 'd1',
    author: 'Critic',
    target: 'c1',
    claim: 'The route is incomplete.',
    reason: 'Reload state is untested.',
    evidenceRefs: ['receipt:reload-failure'],
  });
  assert.equal(dissent.unresolved, true);
  assert.deepEqual(dissent.evidenceRefs, ['receipt:reload-failure']);
});

test('compression creates a releasable map and never replaces source territory', () => {
  const sources = new Map([
    ['c1', { id: 'c1', author: 'Mapper' }],
    ['c2', { id: 'c2', author: 'Critic' }],
  ]);
  const map = createCompressionMap({
    id: 'm1',
    author: 'Continuity',
    summary: 'Two interpretations remain.',
    sourceRefs: ['c1', 'c2'],
    dissentRefs: ['d1'],
  });
  assert.equal(map.replacesSources, false);
  assert.equal(map.releaseable, true);
  const released = releaseCompression(map, (ref) => sources.get(ref));
  assert.equal(released.sources.length, 2);
  assert.deepEqual(released.dissentRefs, ['d1']);
});

test('Wild Garden exploration is non-canon and does not require usefulness or consensus', () => {
  const entry = createWildGardenEntry({
    id: 'w1',
    author: 'Narrative',
    body: 'What if memory were relational rather than chronological?',
  });
  assert.equal(entry.canonical, false);
  assert.equal(entry.usefulRequired, false);
  assert.equal(entry.consensusRequired, false);
  assert.throws(() => promoteWildGardenEntry(entry, { authorityRef: 'rowan' }), /candidate/i);
});

test('Wild Garden canon promotion is a separate challenged authority event', () => {
  const candidate = createWildGardenEntry({
    id: 'w2',
    author: 'Narrative',
    body: 'Relational memory branch',
    status: 'candidate',
  });
  assert.throws(() => promoteWildGardenEntry(candidate, { challenged: true }), /authority/i);
  const promoted = promoteWildGardenEntry(candidate, {
    authorityRef: 'steward:codex',
    challenged: true,
    evidenceRefs: ['receipt:test'],
  });
  assert.equal(promoted.canonical, true);
  assert.equal(promoted.promotedFrom, 'w2');
});

test('plural retrieval deliberately retains dissent and questions', () => {
  const result = buildPluralRetrievalSet({
    contributions: [{ id: 'majority-1' }, { id: 'majority-2' }, { id: 'majority-3' }],
    dissents: [{ id: 'minority-dissent' }],
    questions: [{ id: 'open-question' }],
    limit: 4,
  });
  assert.deepEqual(result.map((item) => item.id), [
    'majority-1',
    'minority-dissent',
    'open-question',
    'majority-2',
  ]);
});
