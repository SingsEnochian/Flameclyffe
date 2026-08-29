import { createHash } from 'node:crypto';
import candidatesModule from '../../../apps/starwell-server/flames/model-candidates.js';
import { authoriseHouseRequest } from './house-session.mjs';
import { compileWildGenerationContext } from '../../../apps/arcsweep/src/bridge-network.js';
import { createContributionEnvelope } from '../../../apps/arcsweep/src/mythframe-federation.js';

const { getModelCandidate } = candidatesModule;
const CANDIDATE_ID = 'qwen38-27b-lab';
const WILD_SCHEMA = 'arcsweep.emergence-wild-receipt/v1';

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});
const clean = (value, max = 64000) => String(value ?? '').trim().slice(0, max);
const fingerprint = (value) => `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;

function candidate() {
  const value = getModelCandidate(CANDIDATE_ID);
  if (!value?.deployment?.lab_route) throw new Error('Pinned Qwen emergence candidate is not armed.');
  return value;
}

function credential(candidateValue, env) {
  return clean(env.get(candidateValue.runtime.api_key_env) || env.get('HF_TOKEN') || env.get('HFTOKEN'), 10000);
}

export function emergenceLabStatus(env) {
  const value = candidate();
  const token = credential(value, env);
  return {
    schema: 'arcsweep.emergence-lab-status/v1',
    lane: 'wild',
    candidate_id: value.candidate_id,
    display_name: value.display_name,
    provider: value.runtime.backend,
    model_exact: value.model_id,
    configured: Boolean(token),
    missing: token ? [] : [value.runtime.api_key_env || 'HF_TOKEN'],
    generator_only: true,
    evaluator_context_visible: false,
    scoring_context_visible: false,
    control_plane_context_visible: false,
    memory_write: false,
    continuity_admission: false,
    canon_admission: false,
  };
}

function systemPrompt() {
  return [
    'Inhabit the supplied participant-local world state and realize the next causally reachable transition.',
    'Use the supplied world facts, history, participant knowledge, capabilities, relationships, agency boundaries, constraints, reachable possibilities, memory-active context, and orientation as the lived scene state.',
    'Return the lived transition itself. Preserve participant agency, causal reachability, and world constraints while allowing consequences to occur through the state actually provided.',
  ].join('\n\n');
}

function userPayload(context) {
  return `WILD CONTEXT\n${JSON.stringify(context, null, 2)}`;
}

async function providerJson(fetchImpl, url, options) {
  const response = await fetchImpl(url, { ...options, signal: AbortSignal.timeout(60_000) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.error?.message || data.error || data.message || 'provider rejected request';
    const error = new Error(`Hugging Face Inference Providers ${response.status}: ${detail}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function runWildEmergenceTrial(body, env, fetchImpl = fetch, {
  clock = () => new Date(),
  idFactory = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}`,
} = {}) {
  const value = candidate();
  const token = credential(value, env);
  if (!token) throw new Error(`Missing server configuration: ${value.runtime.api_key_env || 'HF_TOKEN'}`);
  if (body?.prompt || body?.seed || body?.continuity_anchors?.length || body?.translation_capsules?.length || body?.evaluator_context) {
    throw new Error('WILD lane accepts wild_context only; seeded, federation, evaluator, and free-prompt control context are separate lanes.');
  }
  const context = compileWildGenerationContext(body?.wild_context);
  const requestedAt = clock().toISOString();
  const contextFingerprint = fingerprint(context);
  const base = clean(env.get(value.runtime.base_url_env), 2000) || value.runtime.base_url;
  const reasoningEffort = clean(env.get(value.runtime.reasoning_effort_env), 80) || value.runtime.default_reasoning_effort;

  const data = await providerJson(fetchImpl, `${base.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({
      model: value.model_id,
      max_tokens: value.runtime.max_tokens,
      reasoning_effort: reasoningEffort,
      stream: false,
      messages: [
        { role: 'system', content: systemPrompt() },
        { role: 'user', content: userPayload(context) },
      ],
    }),
  });

  const message = clean(data.choices?.[0]?.message?.content, 64000);
  if (!message) throw new Error('Provider returned an empty WILD transition.');
  const trialId = `emergence-wild-${idFactory()}`;
  const contribution = await createContributionEnvelope({
    contributionId: `${trialId}:contribution`,
    voiceId: 'emergence-lab:qwen38-27b',
    identityContinuityId: 'substrate-lab:qwen38-27b',
    identityRelation: 'unknown',
    runtimeProvider: value.runtime.backend,
    runtimeModelExact: value.model_id,
    runtimeRoute: '/api/v1/house/emergence-lab',
    sessionId: clean(body?.session_id, 1000) || trialId,
    mythframeScope: [],
    sourceContextReceipts: Array.isArray(body?.source_context_receipts) ? body.source_context_receipts : [],
    foreignTranslationCapsulesUsed: [],
    contributionKind: 'emergence_wild_generation',
    adoptionRequested: false,
    adoptionResult: 'not-requested',
  }, { clock, idFactory: () => `${idFactory()}-envelope` });

  return {
    schema: WILD_SCHEMA,
    trial_id: trialId,
    requested_at: requestedAt,
    completed_at: clock().toISOString(),
    lane: 'wild',
    role: 'generator',
    candidate_id: value.candidate_id,
    provider: value.runtime.backend,
    model_exact: value.model_id,
    reasoning_effort: reasoningEffort,
    wild_context_fingerprint: contextFingerprint,
    message,
    usage: data.usage || null,
    contribution_envelope: contribution,
    authority: {
      generator_only: true,
      evaluator_context_visible: false,
      scoring_context_visible: false,
      control_plane_context_visible: false,
      surprise_is_optimization_target: false,
      resident_identity_created: false,
      hidden_reasoning_stored: false,
      memory_write: false,
      relation_admission: false,
      continuity_admission: false,
      canon_admission: false,
      ambient_cross_constellation_influence: false,
    },
  };
}

export function createEmergenceLabHandler({ env, fetchImpl = fetch, clock = () => new Date(), idFactory } = {}) {
  return async function handle(request) {
    if (!authoriseHouseRequest(request, env)) return json(401, { error: 'Valid House Runtime session required.' });
    if (request.method === 'GET') return json(200, emergenceLabStatus(env));
    if (request.method !== 'POST') return json(405, { error: 'GET status or POST WILD trial required.' });
    let body;
    try { body = await request.json(); } catch { return json(400, { error: 'Valid JSON body required.' }); }
    try {
      return json(200, await runWildEmergenceTrial(body, env, fetchImpl, { clock, idFactory }));
    } catch (error) {
      const configuration = /Missing server configuration/.test(error.message);
      const badRequest = /required|accepts wild_context only|forbids evaluator\/control|Unsupported WILD context field/.test(error.message);
      return json(configuration ? 503 : badRequest ? 400 : 502, { error: error.message || 'WILD emergence trial failed.' });
    }
  };
}
