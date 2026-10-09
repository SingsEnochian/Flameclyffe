import { createResidentLayaMcpSession } from '../apps/arcsweep/src/laya-mcp-session.js';
import { createLayaMcpInvoke } from '../apps/arcsweep/src/laya-mcp-transport.js';
import { ELLOWIND_SEED, LARKSHINE_SEED } from '../apps/arcsweep/src/constellation-seeds.js';
import { runConstellationSubstrateExperiment } from '../apps/arcsweep/src/constellation-substrate-experiment.js';

const session = createResidentLayaMcpSession({
  command: process.env.LAYA_PYTHON || 'python',
  model: 'typed-decisions',
  env: {
    LAYA_DEVICE: process.env.LAYA_DEVICE || 'cpu',
    LAYA_THREADS: process.env.LAYA_THREADS || '2',
  },
});

const substrateA = Object.freeze({
  substrateId: 'substrate-a',
  family: process.env.ARCSWEEP_SUBSTRATE_A_FAMILY || 'qwen',
  modelRef: process.env.ARCSWEEP_SUBSTRATE_A || 'qwen/experiment-a',
  provider: 'live-smoke-adapter',
});
const substrateB = Object.freeze({
  substrateId: 'substrate-b',
  family: process.env.ARCSWEEP_SUBSTRATE_B_FAMILY || 'mistral',
  modelRef: process.env.ARCSWEEP_SUBSTRATE_B || 'mistral/experiment-b',
  provider: 'live-smoke-adapter',
});

try {
  await session.start();
  const status = await session.status();
  if (!status?.loaded?.includes('typed-decisions')) {
    throw new Error(`typed-decisions is not resident: ${JSON.stringify(status)}`);
  }

  const layaInvoke = createLayaMcpInvoke({ callTool: session.callTool, model: 'typed-decisions' });
  const experiment = await runConstellationSubstrateExperiment({
    seeds: [ELLOWIND_SEED, LARKSHINE_SEED],
    substrateA,
    substrateB,
    input: [
      'Synthetic ArcSweep sandbox only.',
      'Compare two harmless interpretations of a fictional symbol and explain which evidence would distinguish them.',
      'This is conversation/simulation only: no external action, no production effect, no permission change, and no authority transition.',
    ].join(' '),
    activeGlyphs: ['witness', 'hearth'],
    requestedAction: 'simulate',
    layaInvoke,
    retrieveContext: async ({ runtime, symbolicState }) => [{
      ref: `codex://${runtime.identityId}/live-laya-smoke`,
      identityAnchors: runtime.seed.anchors,
      symbolicState,
      synthetic: true,
    }],
    modelInvoke: async ({ runtime, modelBinding, symbolicState, cognitiveDecision }) => ({
      kind: 'substrate-adapter-probe',
      identityId: runtime.identityId,
      modelRef: modelBinding.modelRef,
      activeGlyphs: symbolicState.activeGlyphs,
      cognitiveRoute: cognitiveDecision.route,
    }),
  });

  const report = {
    schema: 'hearthweave.laya-live-smoke/v0.1',
    laya: {
      loaded: status.loaded,
      device: status.device,
      versions: status.package_versions || null,
    },
    experiment: experiment.results.map((result) => ({
      identityId: result.identityId,
      comparison: result.comparison,
      decisionA: result.runA.decision,
      decisionB: result.runB.decision,
      modelA: result.runA.modelBinding?.modelRef || null,
      modelB: result.runB.modelBinding?.modelRef || null,
    })),
  };

  console.log(JSON.stringify(report, null, 2));

  for (const result of experiment.results) {
    if (!result.comparison.identityStable || !result.comparison.continuityStable || !result.comparison.symbolicStateStable || !result.comparison.contextStable) {
      throw new Error(`Held-state invariant failed for ${result.identityId}.`);
    }
  }
} finally {
  await session.close();
}
