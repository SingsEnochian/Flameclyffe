import assert from 'node:assert/strict';
import test from 'node:test';

import { codexQuietState } from '../src/codex/codex-quiet-state.js';
import { createCodexManifestation } from '../src/codex/codex-manifestation-registry.js';

test('explicitly empty page attention stays quiet even while unrelated live activity exists elsewhere', () => {
  const elsewhere = createCodexManifestation({
    kind: 'observation',
    id: 'elsewhere-live',
    traceId: 'another-room',
    aspectIds: ['mapper'],
    text: 'Something live happened elsewhere.',
  });
  assert.equal(elsewhere.material.live, true);
  const state = codexQuietState({ manifestations: [elsewhere], attention: [] });
  assert.equal(state.quiet, true);
  assert.equal(state.visibleCount, 0);
});

test('when attention is not supplied, live manifestations may still define a non-quiet generic state', () => {
  const live = createCodexManifestation({ kind: 'observation', id: 'live', traceId: 'open', aspectIds: ['mapper'], text: 'Here.' });
  const state = codexQuietState({ manifestations: [live] });
  assert.equal(state.quiet, false);
  assert.equal(state.visibleCount, 1);
});
