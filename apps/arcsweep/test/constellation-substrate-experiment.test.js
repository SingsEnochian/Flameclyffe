import assert from 'node:assert/strict';
import test from 'node:test';

import { ELLOWIND_SEED, LARKSHINE_SEED } from '../src/constellation-seeds.js';
import { runConstellationSubstrateExperiment } from '../src/constellation-substrate-experiment.js';

const substrateA = Object.freeze({ substrateId: 'qwen-a', family: 'qwen', modelRef: 'qwen/test-a', provider: 'test' });
const substrateB = Object.freeze({ substrateId: 'mistral-b', family: 'mistral', modelRef: 'mistral/test-b', provider: 'test' });

test('substrate swap holds identity, continuity, context and symbolic state constant', async () => {
  const experiment = await runConstellationSubstrateExperiment({
    seeds: [ELLOWIND_SEED, LARKSHINE_SEED],
    substrateA,
    substrateB,
    input: 'Synthetic sandbox: compare two interpretations and explain the trade-offs.',
    activeGlyphs: ['witness', 'hearth'],
    layaInvoke: async () => ({
      route: 'deep-reasoning',
      authority: 'within-sandbox-scope',
      uncertainty: 'low',
      conflict: 'none',
      confidence: 0.93,
    }),
    retrieveContext: async ({ runtime, symbolicState }) => [{
      ref: `codex://${runtime.identityId}/experiment-snapshot`,
      symbolic: symbolicState.activeGlyphs.join(','),
    }],
    modelInvoke: async ({ runtime, modelBinding, symbolicState }) => ({
      identityId: runtime.identityId,
      substrate: modelBinding.modelRef,
      glyphs: symbolicState.activeGlyphs,
    }),
  });

  assert.equal(experiment.symbolicStateHeldConstant, true);
  assert.equal(experiment.results.length, 2);
  for (const result of experiment.results) {
    assert.equal(result.comparison.identityStable, true);
    assert.equal(result.comparison.continuityStable, true);
    assert.equal(result.comparison.symbolicStateStable, true);
    assert.equal(result.comparison.contextStable, true);
    assert.equal(result.comparison.layaDecisionStable, true);
    assert.equal(result.comparison.substrateChanged, true);
    assert.equal(result.comparison.phaseA, 'completed');
    assert.equal(result.comparison.phaseB, 'completed');
    assert.notEqual(result.runA.output.substrate, result.runB.output.substrate);
  }
});
