import {
  NARRATIVENODE_DEFAULT_MCP_URL,
  NARRATIVENODE_MCP_PLAN_SCHEMA,
  buildNarrativeNodeClaimPlan,
} from '../narrativenode-polyphony-adapter.js';
import {
  DEFAULT_COMFYUI_ENDPOINT,
  GENERATOR_REQUEST_SCHEMA,
  normaliseGeneratorEndpoint,
  normaliseGeneratorRequest,
} from '../generator-bridge.js';

export const CHORUS_ENGINE_BINDING_SCHEMA = 'arcsweep.chorus-engine-binding/v0.1';
export const CHORUS_EXECUTION_PLAN_SCHEMA = 'arcsweep.chorus-execution-plan/v0.1';

export const CHORUS_ENGINE_KINDS = Object.freeze([
  'model-route',
  'narrativenode',
  'comfyui',
]);

const text = (value, max = 2048) => String(value ?? '').trim().slice(0, max);
const list = (value = []) => [...new Set((Array.isArray(value) ? value : []).map((item) => text(item, 512)).filter(Boolean))];
const clone = (value) => value == null ? value : (globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value)));
const slug = (value) => text(value, 512).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function normaliseHttpEndpoint(value, fallback) {
  const candidate = text(value, 1024) || fallback;
  let url;
  try { url = new URL(candidate); } catch { throw new Error('Chorus engine endpoint must be a complete http:// or https:// URL.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Chorus engine endpoint must use http:// or https://.');
  if (url.username || url.password) throw new Error('Chorus engine endpoint must not embed credentials.');
  url.hash = '';
  return url.toString();
}

/**
 * Describe which existing engine an aspect uses without copying that engine's
 * implementation into Chorus. Bindings are routing/provenance records only.
 */
export function normaliseChorusEngineBinding(input = {}) {
  const identityId = text(input.identity_id);
  const aspectId = text(input.aspect_id);
  const engine = text(input.engine).toLowerCase();
  if (!identityId || !aspectId) throw new Error('Chorus engine binding requires identity_id and aspect_id.');
  if (!CHORUS_ENGINE_KINDS.includes(engine)) throw new Error(`Unknown Chorus engine: ${engine || 'missing'}`);

  const common = {
    schema: CHORUS_ENGINE_BINDING_SCHEMA,
    binding_id: text(input.binding_id) || `chorus-binding:${slug(identityId)}:${slug(aspectId)}:${slug(engine)}:${slug(input.role || '') || 'default'}`,
    identity_id: identityId,
    aspect_id: aspectId,
    engine,
    owns_identity: false,
    owns_canon: false,
    duplicates_engine_state: false,
    context_refs: list(input.context_refs),
  };

  if (engine === 'model-route') {
    const routeId = text(input.route_id || input.route);
    if (!routeId) throw new Error('Model-route Chorus binding requires route_id.');
    return Object.freeze({
      ...common,
      role: text(input.role) || 'receiver',
      adapter: text(input.adapter) || 'resident/model route',
      route_id: routeId,
      provider: text(input.provider) || null,
      model: text(input.model) || null,
      endpoint_ref: text(input.endpoint_ref) || null,
      state_authority: 'none',
      execution: 'delegate-to-existing-model-route',
    });
  }

  if (engine === 'narrativenode') {
    return Object.freeze({
      ...common,
      role: text(input.role) || 'narrative-state',
      adapter: 'narrativenode-polyphony-adapter',
      endpoint: normaliseHttpEndpoint(input.endpoint, NARRATIVENODE_DEFAULT_MCP_URL),
      protocol: 'mcp',
      state_authority: 'external-narrative-state',
      execution: 'delegate-to-existing-narrativenode-mcp-plan',
    });
  }

  return Object.freeze({
    ...common,
    role: text(input.role) || 'multimodal-workflow',
    adapter: 'generator-bridge',
    endpoint: normaliseGeneratorEndpoint(input.endpoint || DEFAULT_COMFYUI_ENDPOINT),
    protocol: 'comfyui-http',
    state_authority: 'generated-artifact-only',
    execution: 'delegate-to-existing-comfyui-generator-bridge',
  });
}

/**
 * Build a routing plan that points Chorus at existing engines. This function
 * intentionally does not call a provider, NarrativeNode, or ComfyUI itself.
 */
export function buildChorusExecutionPlan({
  identity_id,
  aspect_id,
  task,
  bindings = [],
  narrative = null,
  visual = null,
} = {}) {
  const identityId = text(identity_id);
  const aspectId = text(aspect_id);
  const subject = text(task, 8000);
  if (!identityId || !aspectId || !subject) throw new Error('Chorus execution plan requires identity_id, aspect_id, and task.');

  const normalised = bindings.map((binding) => binding?.schema === CHORUS_ENGINE_BINDING_SCHEMA
    ? Object.freeze(clone(binding))
    : normaliseChorusEngineBinding({ ...binding, identity_id: identityId, aspect_id: aspectId }));

  for (const binding of normalised) {
    if (binding.identity_id !== identityId || binding.aspect_id !== aspectId) {
      throw new Error('Chorus execution plan cannot cross identity/aspect binding boundaries.');
    }
  }

  const steps = [];
  for (const binding of normalised) {
    if (binding.engine === 'model-route') {
      steps.push(Object.freeze({
        kind: 'model-inference',
        binding_id: binding.binding_id,
        delegate: binding.adapter,
        route_id: binding.route_id,
        provider: binding.provider,
        model: binding.model,
        task: subject,
        identity_passed_by_reference: true,
        aspect_passed_by_reference: true,
      }));
      continue;
    }

    if (binding.engine === 'narrativenode') {
      const claims = Array.isArray(narrative?.claims) ? narrative.claims : [];
      const delegatedPlan = claims.length
        ? buildNarrativeNodeClaimPlan({
            worldId: narrative?.world_id || narrative?.worldId || identityId,
            claims,
            purpose: narrative?.purpose || `Chorus ${aspectId} narrative work: ${subject}`,
            endpoint: binding.endpoint,
          })
        : null;
      steps.push(Object.freeze({
        kind: 'narrative-state',
        binding_id: binding.binding_id,
        delegate: binding.adapter,
        endpoint: binding.endpoint,
        protocol: binding.protocol,
        task: subject,
        delegated_plan: delegatedPlan,
        delegated_plan_schema: delegatedPlan?.schema || NARRATIVENODE_MCP_PLAN_SCHEMA,
        copied_state_into_chorus: false,
      }));
      continue;
    }

    const requestInput = visual?.request || visual;
    const request = requestInput?.prompt ? normaliseGeneratorRequest(requestInput) : null;
    steps.push(Object.freeze({
      kind: 'multimodal-workflow',
      binding_id: binding.binding_id,
      delegate: binding.adapter,
      endpoint: binding.endpoint,
      protocol: binding.protocol,
      task: subject,
      generator_request: request,
      generator_request_schema: request?.schema || GENERATOR_REQUEST_SCHEMA,
      graph_builder_reimplemented_in_chorus: false,
    }));
  }

  return Object.freeze({
    schema: CHORUS_EXECUTION_PLAN_SCHEMA,
    identity_id: identityId,
    aspect_id: aspectId,
    task: subject,
    bindings: Object.freeze(normalised),
    steps: Object.freeze(steps),
    identity_authority_granted_to_engine: false,
    canon_authority_granted_to_engine: false,
    aspect_state_duplicated: false,
    execution_delegated: true,
    note: 'Chorus coordinates identity/aspect context. Existing engines retain their own execution and state contracts.',
  });
}

/**
 * A small recommended starting palette. These are roles, not identities.
 * Callers choose actual model routes and may omit NarrativeNode/ComfyUI.
 */
export function chorusAspectEngineRecipe(aspectId) {
  const aspect = text(aspectId).toLowerCase();
  if (aspect === 'narrative') return Object.freeze(['model-route', 'narrativenode']);
  if (['visual', 'image', 'spatial', 'compositor'].includes(aspect)) return Object.freeze(['model-route', 'comfyui']);
  return Object.freeze(['model-route']);
}
