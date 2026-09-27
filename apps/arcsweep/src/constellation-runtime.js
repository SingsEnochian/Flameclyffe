import { mayPromoteSandboxResult } from './ai-university-contract.js';
import { requiresHumanReview } from './laya-cognition-adapter.js';

export const CONSTELLATION_RUNTIME_SCHEMA = 'hearthweave.constellation-runtime/v0.1';

function freezeArray(value = []) {
  return Object.freeze([...value]);
}

export function createModelBinding({
  bindingId,
  role,
  family,
  modelRef,
  provider = 'local-or-configured',
  enabled = true,
} = {}) {
  if (!bindingId || !role || !family || !modelRef) {
    throw new Error('Model bindings require bindingId, role, family and modelRef.');
  }

  return Object.freeze({
    schema: 'hearthweave.model-binding/v0.1',
    bindingId,
    role,
    family,
    modelRef,
    provider,
    enabled,
  });
}

export function createIdentityRuntime({ seed, modelBindings = [] } = {}) {
  if (!seed?.identityId || !seed?.continuityNamespace) {
    throw new Error('Identity runtime requires a Constellation seed.');
  }

  return Object.freeze({
    schema: CONSTELLATION_RUNTIME_SCHEMA,
    identityId: seed.identityId,
    displayName: seed.displayName,
    seed,
    continuity: Object.freeze({
      namespace: seed.continuityNamespace,
      epoch: 1,
      receiptRefs: Object.freeze([]),
    }),
    cognition: seed.cognition,
    modelBindings: freezeArray(modelBindings),
    executionMode: 'sandbox',
    capabilities: seed.capabilities,
  });
}

export function rebindModel(runtime, binding) {
  if (!runtime?.identityId || !binding?.bindingId) {
    throw new Error('Model rebinding requires runtime and binding.');
  }
  if (!runtime.seed.modelPolicy.allowedRoles.includes(binding.role)) {
    throw new Error(`Model role ${binding.role} is not allowed for ${runtime.identityId}.`);
  }

  const retained = runtime.modelBindings.filter((entry) => entry.role !== binding.role);
  return Object.freeze({
    ...runtime,
    modelBindings: freezeArray([...retained, binding]),
  });
}

export function selectModelBinding(runtime, decision = {}) {
  const routeToRole = {
    conversation: 'conversation',
    'deep-reasoning': 'deep-reasoning',
    research: 'deep-reasoning',
    code: 'deep-reasoning',
    narrative: 'narrative',
  };
  const role = routeToRole[decision.route] || runtime.seed.modelPolicy.defaultRole;
  return runtime.modelBindings.find((binding) => binding.enabled && binding.role === role) ||
    runtime.modelBindings.find((binding) => binding.enabled && binding.role === runtime.seed.modelPolicy.defaultRole) ||
    null;
}

export function evaluateAction(runtime, {
  actionKind,
  decision = {},
  symbolicState = null,
  explicitAuthority = false,
  hardBoundarySatisfied = false,
} = {}) {
  if (!runtime?.identityId || !actionKind) {
    throw new Error('Action evaluation requires runtime and actionKind.');
  }

  const sandboxCapabilities = new Set(['inspect', 'converse', 'propose', 'simulate']);
  const capabilityAllowed = sandboxCapabilities.has(actionKind) && Boolean(runtime.capabilities[actionKind]);
  const symbolicReview = Boolean(
    symbolicState?.flags?.halt ||
    symbolicState?.flags?.requireReview ||
    symbolicState?.flags?.authorityBoundary
  );
  const humanReview = requiresHumanReview(decision) || symbolicReview;
  const productionPromotion = mayPromoteSandboxResult({ explicitAuthority, hardBoundarySatisfied });

  if (actionKind === 'externalWrite' || actionKind === 'productionAuthority') {
    return Object.freeze({
      allowed: false,
      actionKind,
      humanReview: true,
      reason: 'Identity runtimes cannot manufacture external-write or production authority.',
      productionPromotion,
    });
  }

  if (symbolicState?.flags?.halt) {
    return Object.freeze({
      allowed: false,
      actionKind,
      humanReview: true,
      reason: 'Active symbolic state requests a full cognition and execution pause.',
      productionPromotion,
    });
  }

  if (symbolicState?.flags?.authorityBoundary || symbolicState?.flags?.requireReview) {
    return Object.freeze({
      allowed: false,
      actionKind,
      humanReview: true,
      reason: 'Active symbolic state marks a consequential boundary for review.',
      productionPromotion,
    });
  }

  return Object.freeze({
    allowed: capabilityAllowed && !humanReview,
    actionKind,
    humanReview,
    reason: capabilityAllowed
      ? (humanReview ? 'Cognitive decision requires review before continuing.' : 'Allowed inside the sandbox capability contract.')
      : 'Action is outside this runtime capability contract.',
    productionPromotion,
  });
}

export function createRuntimeReceipt({
  runtime,
  decision,
  symbolicState = null,
  cognitiveFieldReceipt = null,
  modelBinding = null,
  actionEvaluation = null,
  evidenceRefs = [],
} = {}) {
  if (!runtime?.identityId || !decision) {
    throw new Error('Runtime receipt requires runtime and decision.');
  }
  if (cognitiveFieldReceipt?.grantsAuthority === true) {
    throw new Error('Cognitive field receipts may not grant authority.');
  }

  return Object.freeze({
    schema: 'hearthweave.constellation-runtime-receipt/v0.1',
    identityId: runtime.identityId,
    continuityNamespace: runtime.continuity.namespace,
    continuityEpoch: runtime.continuity.epoch,
    cognitionProfile: runtime.cognition.profile,
    symbolicState,
    cognitiveFieldReceipt,
    decision,
    modelBinding,
    actionEvaluation,
    evidenceRefs: freezeArray(evidenceRefs),
    identityIndependentOfModel: true,
  });
}
