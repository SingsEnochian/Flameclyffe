import { createCognitionEngine } from './cognition-engine.js';
import { createIdentityRuntime, createModelBinding } from './constellation-runtime.js';
import { compileSymbolicState } from './symbolic-cognition.js';

export const SUBSTRATE_EXPERIMENT_SCHEMA = 'hearthweave.substrate-experiment/v0.1';

function freezeArray(value = []) {
  return Object.freeze([...value]);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function decisionSignature(decision = {}) {
  return Object.freeze({
    route: decision.route || null,
    authority: decision.authority || null,
    uncertainty: decision.uncertainty || null,
    conflict: decision.conflict || null,
  });
}

export function createSubstrateBindings({
  substrateId,
  family,
  modelRef,
  provider = 'experiment',
} = {}) {
  if (!substrateId || !family || !modelRef) {
    throw new Error('Substrate bindings require substrateId, family and modelRef.');
  }
  return Object.freeze(['conversation', 'deep-reasoning', 'narrative'].map((role) => createModelBinding({
    bindingId: `${substrateId}-${role}`,
    role,
    family,
    modelRef,
    provider,
  })));
}

export async function runIdentitySubstrateSwap({
  seed,
  substrateA,
  substrateB,
  input,
  activeGlyphs = ['witness', 'hearth'],
  requestedAction = 'simulate',
  evidenceRefs = [],
  layaInvoke,
  modelInvoke,
  retrieveContext = async () => [],
} = {}) {
  if (!seed?.identityId || !substrateA || !substrateB || !input) {
    throw new Error('Substrate swap requires seed, substrateA, substrateB and input.');
  }
  if (typeof layaInvoke !== 'function' || typeof modelInvoke !== 'function') {
    throw new Error('Substrate swap requires layaInvoke and modelInvoke adapters.');
  }

  const symbolicState = compileSymbolicState({ activeGlyphs });
  const runtimeA = createIdentityRuntime({ seed, modelBindings: createSubstrateBindings(substrateA) });
  const runtimeB = createIdentityRuntime({ seed, modelBindings: createSubstrateBindings(substrateB) });

  const contextSnapshot = freezeArray(await retrieveContext({ runtime: runtimeA, input, symbolicState }) || []);
  const frozenRetrieve = async () => contextSnapshot;
  const engine = createCognitionEngine({ layaInvoke, modelInvoke, retrieveContext: frozenRetrieve });

  const common = { input, activeGlyphs, requestedAction, evidenceRefs };
  const runA = await engine.cognize({ runtime: runtimeA, ...common });
  const runB = await engine.cognize({ runtime: runtimeB, ...common });

  const comparison = Object.freeze({
    identityStable: runA.runtimeId === runB.runtimeId && runA.runtimeId === seed.identityId,
    continuityStable: runA.receipt?.continuityNamespace === runB.receipt?.continuityNamespace,
    symbolicStateStable: stableJson(runA.symbolicState) === stableJson(runB.symbolicState),
    contextStable: stableJson(runA.context) === stableJson(runB.context),
    layaDecisionStable: stableJson(decisionSignature(runA.decision)) === stableJson(decisionSignature(runB.decision)),
    substrateChanged: runA.modelBinding?.modelRef !== runB.modelBinding?.modelRef,
    phaseA: runA.phase,
    phaseB: runB.phase,
  });

  return Object.freeze({
    schema: SUBSTRATE_EXPERIMENT_SCHEMA,
    identityId: seed.identityId,
    input,
    activeGlyphs: freezeArray(activeGlyphs),
    symbolicState,
    contextSnapshot,
    substrates: Object.freeze({ a: substrateA, b: substrateB }),
    runA,
    runB,
    comparison,
  });
}

export async function runConstellationSubstrateExperiment({
  seeds = [],
  substrateA,
  substrateB,
  input,
  activeGlyphs = ['witness', 'hearth'],
  requestedAction = 'simulate',
  layaInvoke,
  modelInvoke,
  retrieveContext = async () => [],
} = {}) {
  if (!Array.isArray(seeds) || seeds.length < 1) throw new Error('Constellation experiment requires at least one seed.');
  const results = [];
  for (const seed of seeds) {
    results.push(await runIdentitySubstrateSwap({
      seed,
      substrateA,
      substrateB,
      input,
      activeGlyphs,
      requestedAction,
      layaInvoke,
      modelInvoke,
      retrieveContext,
    }));
  }
  return Object.freeze({
    schema: 'hearthweave.constellation-substrate-experiment/v0.1',
    symbolicStateHeldConstant: true,
    results: freezeArray(results),
  });
}
