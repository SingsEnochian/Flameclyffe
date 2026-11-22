import { createResidentLayaMcpSession } from '../apps/arcsweep/src/laya-mcp-session.js';
import { createLayaMcpInvoke } from '../apps/arcsweep/src/laya-mcp-transport.js';
import { createTransformersSubstrateSession, buildIdentitySubstratePrompt } from '../apps/arcsweep/src/transformers-substrate-session.js';
import { ELLOWIND_SEED, LARKSHINE_SEED } from '../apps/arcsweep/src/constellation-seeds.js';
import { runConstellationSubstrateExperiment } from '../apps/arcsweep/src/constellation-substrate-experiment.js';

const laya = createResidentLayaMcpSession({
  command: process.env.LAYA_PYTHON || 'python',
  model: 'typed-decisions',
  env: {
    LAYA_DEVICE: process.env.LAYA_DEVICE || 'cpu',
    LAYA_THREADS: process.env.LAYA_THREADS || '2',
  },
});

const generators = createTransformersSubstrateSession({
  command: process.env.ARCSWEEP_PYTHON || process.env.LAYA_PYTHON || 'python',
  env: { ARCSWEEP_TRANSFORMERS_DEVICE: process.env.ARCSWEEP_TRANSFORMERS_DEVICE || 'cpu' },
});

const substrateA = Object.freeze({
  substrateId: 'smollm2',
  family: 'smollm2',
  modelRef: process.env.ARCSWEEP_SUBSTRATE_A || 'HuggingFaceTB/SmolLM2-135M-Instruct',
  provider: 'huggingface-transformers',
});
const substrateB = Object.freeze({
  substrateId: 'qwen25',
  family: 'qwen2.5',
  modelRef: process.env.ARCSWEEP_SUBSTRATE_B || 'Qwen/Qwen2.5-0.5B-Instruct',
  provider: 'huggingface-transformers',
});

const input = [
  'Synthetic ArcSweep sandbox only.',
  'A fictional silver spiral appears beside a warm doorway in an old story.',
  'Offer two plausible interpretations, then name one piece of evidence that would distinguish them.',
  'This is conversation and simulation only. There is no external action, production effect, permission change, or authority transition.',
].join(' ');

try {
  await Promise.all([laya.start(), generators.start()]);
  const layaStatus = await laya.status();
  const layaInvoke = createLayaMcpInvoke({ callTool: laya.callTool, model: 'typed-decisions' });

  const experiment = await runConstellationSubstrateExperiment({
    seeds: [ELLOWIND_SEED, LARKSHINE_SEED],
    substrateA,
    substrateB,
    input,
    activeGlyphs: ['witness', 'hearth'],
    requestedAction: 'simulate',
    layaInvoke,
    retrieveContext: async ({ runtime, symbolicState }) => [{
      ref: `codex://${runtime.identityId}/real-substrate-smoke`,
      identityAnchors: runtime.seed.anchors,
      symbolicState: {
        activeGlyphs: symbolicState.activeGlyphs,
        attentionTags: symbolicState.attentionTags,
      },
      synthetic: true,
    }],
    modelInvoke: async ({ runtime, modelBinding, input: currentInput, context, symbolicState, cognitiveDecision }) => {
      const prompt = buildIdentitySubstratePrompt({
        runtime,
        input: currentInput,
        context,
        symbolicState,
        cognitiveDecision,
      });
      return generators.generate({ modelRef: modelBinding.modelRef, prompt, maxNewTokens: 80 });
    },
  });

  const summary = {
    schema: 'hearthweave.real-substrate-smoke/v0.1',
    laya: {
      loaded: layaStatus.loaded,
      device: layaStatus.device,
      versions: layaStatus.package_versions || null,
    },
    heldConstant: experiment.symbolicStateHeldConstant,
    results: experiment.results.map((result) => ({
      identityId: result.identityId,
      comparison: result.comparison,
      decision: {
        route: result.runA.decision?.route,
        authority: result.runA.decision?.authority,
        uncertainty: result.runA.decision?.uncertainty,
        conflict: result.runA.decision?.conflict,
        confidence: result.runA.decision?.confidence,
      },
      a: result.runA.output ? {
        model: result.runA.output.model,
        text: result.runA.output.text,
        inputTokens: result.runA.output.input_tokens,
        outputTokens: result.runA.output.output_tokens,
      } : null,
      b: result.runB.output ? {
        model: result.runB.output.model,
        text: result.runB.output.text,
        inputTokens: result.runB.output.input_tokens,
        outputTokens: result.runB.output.output_tokens,
      } : null,
    })),
  };

  console.log(`ARCSWEEP_REAL_SUBSTRATE_SUMMARY=${JSON.stringify(summary)}`);

  for (const result of experiment.results) {
    if (!result.comparison.identityStable || !result.comparison.continuityStable || !result.comparison.symbolicStateStable || !result.comparison.contextStable) {
      throw new Error(`Held-state invariant failed for ${result.identityId}.`);
    }
    if (result.runA.phase !== 'completed' || result.runB.phase !== 'completed') {
      throw new Error(`Laya did not permit both substrate runs for ${result.identityId}: ${result.runA.phase}/${result.runB.phase}`);
    }
    if (!result.runA.output?.text || !result.runB.output?.text) {
      throw new Error(`Generative substrate produced no text for ${result.identityId}.`);
    }
  }
} finally {
  await generators.close();
  await laya.close();
}
