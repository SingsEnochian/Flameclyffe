import { createLayaCognitiveFrame, runLayaCognition, requiresHumanReview } from './laya-cognition-adapter.js';
import { evaluateAction, selectModelBinding, createRuntimeReceipt } from './constellation-runtime.js';

export const COGNITION_ENGINE_SCHEMA = 'hearthweave.cognition-engine/v0.1';

function freezeArray(value = []) {
  return Object.freeze([...value]);
}

export function createCognitionEngine({
  layaInvoke,
  modelInvoke,
  retrieveContext = async () => [],
} = {}) {
  if (typeof layaInvoke !== 'function') throw new Error('Cognition engine requires a Laya invoke adapter.');
  if (typeof modelInvoke !== 'function') throw new Error('Cognition engine requires a model invoke adapter.');
  if (typeof retrieveContext !== 'function') throw new Error('retrieveContext must be a function.');

  return Object.freeze({
    schema: COGNITION_ENGINE_SCHEMA,

    async cognize({
      runtime,
      input,
      requestedAction = 'converse',
      evidenceRefs = [],
    } = {}) {
      if (!runtime?.identityId || !input) {
        throw new Error('Cognition requires runtime and input.');
      }

      const context = await retrieveContext({ runtime, input });
      const contextRefs = freezeArray((context || []).map((entry) => entry.ref).filter(Boolean));
      const frame = createLayaCognitiveFrame({ runtime, input, contextRefs });
      const decision = await runLayaCognition(frame, { invoke: layaInvoke });

      const actionEvaluation = evaluateAction(runtime, {
        actionKind: requestedAction,
        decision,
      });

      if (requiresHumanReview(decision) || !actionEvaluation.allowed) {
        const receipt = createRuntimeReceipt({
          runtime,
          decision,
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
        cognitiveDecision: decision,
      });

      const receipt = createRuntimeReceipt({
        runtime,
        decision,
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
        context: freezeArray(context),
        modelBinding,
        output,
        actionEvaluation,
        receipt,
      });
    },
  });
}
