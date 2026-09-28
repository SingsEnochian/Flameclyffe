import { createLayaCognitiveFrame, runLayaCognition, requiresHumanReview } from './laya-cognition-adapter.js';
import { evaluateAction, selectModelBinding, createRuntimeReceipt } from './constellation-runtime.js';
import { compileSymbolicState } from './symbolic-cognition.js';
import { createCognitiveFieldState, stepCognitiveField } from './cognitive-field-engine.js';
import { deriveWonderState } from './wonder-protocol.js';

export const COGNITION_ENGINE_SCHEMA = 'hearthweave.cognition-engine/v0.1';

function freezeArray(value = []) {
  return Object.freeze([...value]);
}

export function createCognitionEngine({
  layaInvoke,
  modelInvoke,
  retrieveContext = async () => [],
  glyphRegistry = null,
  cognitiveFieldConfig = null,
} = {}) {
  if (typeof layaInvoke !== 'function') throw new Error('Cognition engine requires a Laya invoke adapter.');
  if (typeof modelInvoke !== 'function') throw new Error('Cognition engine requires a model invoke adapter.');
  if (typeof retrieveContext !== 'function') throw new Error('retrieveContext must be a function.');

  const fieldStates = new Map();

  function currentField(runtime) {
    const fieldId = runtime.continuity.namespace;
    return fieldStates.get(fieldId) || createCognitiveFieldState({ fieldId });
  }

  return Object.freeze({
    schema: COGNITION_ENGINE_SCHEMA,

    getFieldState(runtime) {
      if (!runtime?.continuity?.namespace) throw new Error('Field state lookup requires a runtime.');
      return currentField(runtime);
    },

    async cognize({
      runtime,
      input,
      requestedAction = 'converse',
      evidenceRefs = [],
      activeGlyphs = [],
    } = {}) {
      if (!runtime?.identityId || !input) {
        throw new Error('Cognition requires runtime and input.');
      }

      const symbolicState = glyphRegistry
        ? compileSymbolicState({ activeGlyphs, registry: glyphRegistry })
        : compileSymbolicState({ activeGlyphs });

      if (symbolicState.flags.halt) {
        const wonderState = deriveWonderState({ symbolicState });
        const decision = Object.freeze({
          schema: 'hearthweave.laya-decision/v0.1',
          route: 'human-review',
          initiative: 'silent',
          authority: 'permission-required',
          uncertainty: 'high',
          conflict: 'none',
          confidence: null,
          source: 'symbolic-halt',
        });
        const actionEvaluation = evaluateAction(runtime, {
          actionKind: requestedAction,
          decision,
          symbolicState,
        });
        const receipt = createRuntimeReceipt({
          runtime,
          decision,
          symbolicState,
          cognitiveFieldReceipt: null,
          wonderState,
          modelBinding: null,
          actionEvaluation,
          evidenceRefs: freezeArray(evidenceRefs),
        });

        return Object.freeze({
          schema: COGNITION_ENGINE_SCHEMA,
          phase: 'paused',
          runtimeId: runtime.identityId,
          frame: null,
          decision,
          symbolicState,
          cognitiveField: null,
          cognitiveFieldReceipt: null,
          wonderState,
          context: Object.freeze([]),
          modelBinding: null,
          output: null,
          actionEvaluation,
          receipt,
        });
      }

      const context = await retrieveContext({ runtime, input, symbolicState });
      const contextRefs = freezeArray((context || []).map((entry) => entry.ref).filter(Boolean));
      const fieldStep = stepCognitiveField({
        state: currentField(runtime),
        symbolicState,
        continuitySlice: context,
        recentEvents: [input],
        config: cognitiveFieldConfig || undefined,
      });
      fieldStates.set(runtime.continuity.namespace, fieldStep.state);

      const cognitiveField = fieldStep.summary;
      const wonderState = deriveWonderState({ symbolicState, cognitiveField });
      const frame = createLayaCognitiveFrame({
        runtime,
        input,
        contextRefs,
        symbolicState,
        cognitiveField,
        wonderState,
      });
      const decision = await runLayaCognition(frame, { invoke: layaInvoke });

      const actionEvaluation = evaluateAction(runtime, {
        actionKind: requestedAction,
        decision,
        symbolicState,
      });

      if (requiresHumanReview(decision) || !actionEvaluation.allowed) {
        const receipt = createRuntimeReceipt({
          runtime,
          decision,
          symbolicState,
          cognitiveFieldReceipt: fieldStep.receipt,
          wonderState,
          modelBinding: null,
          actionEvaluation,
          evidenceRefs: freezeArray([...evidenceRefs, ...contextRefs]),
        });

        return Object.freeze({
          schema: COGNITION_ENGINE_SCHEMA,
          phase: 'review-required',
          runtimeId: runtime.identityId,
          frame,
          decision,
          symbolicState,
          cognitiveField,
          cognitiveFieldReceipt: fieldStep.receipt,
          wonderState,
          context: freezeArray(context),
          modelBinding: null,
          output: null,
          actionEvaluation,
          receipt,
        });
      }

      const modelBinding = selectModelBinding(runtime, decision);
      if (!modelBinding) {
        const receipt = createRuntimeReceipt({
          runtime,
          decision,
          symbolicState,
          cognitiveFieldReceipt: fieldStep.receipt,
          wonderState,
          modelBinding: null,
          actionEvaluation: Object.freeze({
            ...actionEvaluation,
            allowed: false,
            humanReview: true,
            reason: 'No enabled model binding satisfies the selected cognitive route.',
          }),
          evidenceRefs: freezeArray([...evidenceRefs, ...contextRefs]),
        });

        return Object.freeze({
          schema: COGNITION_ENGINE_SCHEMA,
          phase: 'model-required',
          runtimeId: runtime.identityId,
          frame,
          decision,
          symbolicState,
          cognitiveField,
          cognitiveFieldReceipt: fieldStep.receipt,
          wonderState,
          context: freezeArray(context),
          modelBinding: null,
          output: null,
          actionEvaluation: receipt.actionEvaluation,
          receipt,
        });
      }

      const output = await modelInvoke({
        runtime,
        modelBinding,
        input,
        context: freezeArray(context),
        symbolicState,
        cognitiveField,
        wonderState,
        cognitiveDecision: decision,
      });

      const receipt = createRuntimeReceipt({
        runtime,
        decision,
        symbolicState,
        cognitiveFieldReceipt: fieldStep.receipt,
        wonderState,
        modelBinding,
        actionEvaluation,
        evidenceRefs: freezeArray([...evidenceRefs, ...contextRefs]),
      });

      return Object.freeze({
        schema: COGNITION_ENGINE_SCHEMA,
        phase: 'completed',
        runtimeId: runtime.identityId,
        frame,
        decision,
        symbolicState,
        cognitiveField,
        cognitiveFieldReceipt: fieldStep.receipt,
        wonderState,
        context: freezeArray(context),
        modelBinding,
        output,
        actionEvaluation,
        receipt,
      });
    },
  });
}
