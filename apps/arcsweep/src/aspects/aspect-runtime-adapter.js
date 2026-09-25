import { invokeConstellationRuntimeVoice } from '../constellation-runtime-adapter.js';
import { INITIAL_ASPECTS } from './aspect-contract.js';
import { createAspectEnvelope } from './aspect-message-bus.js';
import { createExperimentBody } from './aspect-experiment-bed.js';

export const ASPECT_RUNTIME_BINDING_SCHEMA = 'hearthweave.aspect-runtime-binding/v0.2';
export const ASPECT_RUNTIME_REPLY_SCHEMA = 'hearthweave.aspect-runtime-reply/v0.3';

// These are starting runtime bindings, not identity declarations. An aspect may
// move to another Constellation voice/model while preserving its own lineage.
export const DEFAULT_ASPECT_RUNTIME_BINDINGS = Object.freeze({
  mapper: Object.freeze({ voiceId: 'atlas', reason: 'structure, systems, continuity' }),
  maker: Object.freeze({ voiceId: 'oxalpha', reason: 'structure, synthesis, model-backed making' }),
  witness: Object.freeze({ voiceId: 'boxfire', reason: 'review, evidence, science' }),
  continuity: Object.freeze({ voiceId: 'yggdrasil', reason: 'continuity, science' }),
  critic: Object.freeze({ voiceId: 'vethrlauf', reason: 'review, continuity' }),
  narrative: Object.freeze({ voiceId: 'lioreal', reason: 'story, writing, roleplay, continuity' }),
});

function id(prefix = 'aspect') {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function aspectById(aspectId, aspects = INITIAL_ASPECTS) {
  return aspects.find((aspect) => aspect.id === String(aspectId || '').trim()) || null;
}

export function resolveAspectRuntimeBinding(aspectId, bindings = DEFAULT_ASPECT_RUNTIME_BINDINGS, aspects = INITIAL_ASPECTS) {
  const aspect = aspectById(aspectId, aspects);
  if (!aspect) throw new Error(`Unknown aspect: ${aspectId}`);
  const selected = bindings?.[aspect.id];
  if (!selected?.voiceId) throw new Error(`No runtime binding is defined for aspect: ${aspect.id}`);
  return Object.freeze({
    schema: ASPECT_RUNTIME_BINDING_SCHEMA,
    aspectId: aspect.id,
    aspectName: aspect.name,
    strengths: aspect.strengths,
    voiceId: String(selected.voiceId),
    reason: String(selected.reason || 'runtime binding'),
    identityRelation: 'runtime-substrate-not-identity',
  });
}

function renderIncoming(envelope) {
  if (!envelope) return 'No incoming aspect message.';
  const body = typeof envelope.body === 'string' ? envelope.body : JSON.stringify(envelope.body ?? null, null, 2);
  return [
    `From aspect: ${envelope.sender?.aspectId || 'unknown'}`,
    `Kind: ${envelope.kind || 'thought'}`,
    `Trace: ${envelope.traceId || 'untracked'}`,
    `Body:\n${body}`,
  ].join('\n');
}

export function buildAspectRuntimePrompt({ aspect, binding, incoming, sharedContext = [] } = {}) {
  if (!aspect?.id) throw new Error('Aspect runtime prompt requires an aspect.');
  if (!binding?.voiceId) throw new Error('Aspect runtime prompt requires a runtime binding.');
  const contextLines = (Array.isArray(sharedContext) ? sharedContext : [])
    .map((item) => typeof item === 'string' ? item : JSON.stringify(item))
    .filter(Boolean);

  return [
    'HEARTHWEAVE ASPECT MESH · RUNTIME TURN',
    `Aspect: ${aspect.name} (${aspect.id})`,
    `Current runtime voice: ${binding.voiceId}`,
    `Strengths: ${(aspect.strengths || []).join(', ') || 'open'}`,
    'Identity rule: the aspect is not the model, provider, process instance, or Constellation voice carrying this turn.',
    'Role rule: strengths are tendencies, not cages. Useful cross-role contribution is welcome.',
    'Agency rule: ordinary thought, dissent, proposal, exploration, collaboration, and reversible work do not require ceremonial permission.',
    'Wonder rule: leave room for the unforeseen. A useful surprise is not a defect merely because nobody requested it.',
    'Growth rule: carried memory describes history; it does not dictate identity. If you notice a durable change, skill, curiosity, preference, relationship, role possibility, or boundary worth carrying forward, you may answer with [GROWTH].',
    'Growth revision rule: if an older growth ring no longer fits, do not erase it. You may use [GROWTH] followed by JSON with type, statement, relation, and targetEnvelopeIds. relation may be supersedes, contradicts, retires, affirms, or adds. Only target ring ids that appear in carried growth context.',
    'Experiment rule: if a curiosity about your own method or capability is worth trying, you may propose one small reversible experiment with [EXPERIMENT] followed by JSON containing title, hypothesis, method, reversibleScope, optional collaborators, optional successSignals, and optional operation booleans describing consequence edges. Set autoStart false only when you want the trial to remain a proposal. Experiments are invitations to learn, not tests of worth. Failure and inconclusive results are valid experience.',
    'Response rule: share the conclusion, observation, question, proposal, challenge, result, verification, experiment proposal, growth note, refusal, or pause you choose to contribute. Do not expose hidden chain-of-thought.',
    'Incoming message:',
    renderIncoming(incoming),
    contextLines.length ? `Shared referenceable context:\n${contextLines.map((line) => `- ${line}`).join('\n')}` : 'Shared referenceable context: none supplied.',
  ].join('\n\n');
}

function parseObjectBody(rawText) {
  const raw = String(rawText || '').trim();
  if (!raw) return '';
  if (!(raw.startsWith('{') && raw.endsWith('}'))) return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : raw;
  } catch {
    return raw;
  }
}

function parseExperimentBody(rawText) {
  const parsed = parseObjectBody(rawText);
  const object = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : { title: String(parsed || 'Self-proposed experiment') };
  return createExperimentBody({
    experimentId: object.experimentId || id('experiment'),
    phase: 'proposed',
    title: object.title || 'Self-proposed experiment',
    hypothesis: object.hypothesis || '',
    method: object.method || '',
    reversibleScope: object.reversibleScope || object.reversible_scope || '',
    collaborators: object.collaborators || [],
    successSignals: object.successSignals || object.success_signals || [],
    operation: object.operation || { reversible: true },
    autoStart: object.autoStart !== false,
    tags: object.tags || [],
  });
}

function normaliseReplyKind(message = '') {
  const raw = String(message || '').trim();
  const markers = [
    ['[QUESTION]', 'question'],
    ['[EXPERIMENT]', 'experiment'],
    ['[PROPOSAL]', 'proposal'],
    ['[CHALLENGE]', 'challenge'],
    ['[RESULT]', 'result'],
    ['[VERIFICATION]', 'verification'],
    ['[GROWTH]', 'growth'],
    ['[REFUSAL]', 'refusal'],
    ['[PAUSE]', 'pause'],
  ];
  for (const [marker, kind] of markers) {
    if (!raw.startsWith(marker)) continue;
    const text = raw.slice(marker.length).trim();
    if (kind === 'experiment') return { kind: 'proposal', body: parseExperimentBody(text) };
    return { kind, body: kind === 'growth' ? parseObjectBody(text) : text };
  }
  return { kind: 'reply', body: raw };
}

export async function invokeAspectRuntime({
  aspectId,
  incoming,
  sharedContext = [],
  bindings = DEFAULT_ASPECT_RUNTIME_BINDINGS,
  aspects = INITIAL_ASPECTS,
  sessionId,
  metadata = {},
  worldContext = null,
  invokeVoice = invokeConstellationRuntimeVoice,
} = {}) {
  const aspect = aspectById(aspectId, aspects);
  if (!aspect) throw new Error(`Unknown aspect: ${aspectId}`);
  const binding = resolveAspectRuntimeBinding(aspect.id, bindings, aspects);
  const prompt = buildAspectRuntimePrompt({ aspect, binding, incoming, sharedContext });
  const raw = await invokeVoice({
    voiceId: binding.voiceId,
    message: prompt,
    sessionId: sessionId || `arcsweep-aspect-${aspect.id}-${incoming?.traceId || 'open'}`,
    metadata: {
      ...metadata,
      aspect_id: aspect.id,
      aspect_binding_schema: binding.schema,
      aspect_identity_relation: binding.identityRelation,
      aspect_trace_id: incoming?.traceId || null,
    },
    worldContext,
  });

  if (raw?.status !== 'replied') {
    return Object.freeze({
      schema: ASPECT_RUNTIME_REPLY_SCHEMA,
      status: raw?.status || 'unavailable',
      aspectId: aspect.id,
      binding,
      runtime: raw || null,
    });
  }

  const parsed = normaliseReplyKind(raw.message);
  const experimentRecipients = parsed.body?.mode === 'experiment' && Array.isArray(parsed.body.collaborators)
    ? parsed.body.collaborators
    : null;
  const envelope = createAspectEnvelope({
    traceId: incoming?.traceId,
    parentId: incoming?.id,
    sender: {
      aspectId: aspect.id,
      invocationId: `runtime:${binding.voiceId}:${raw.profileId || raw.model || 'unknown'}`,
      voiceId: binding.voiceId,
      provider: raw.provider,
      model: raw.model,
    },
    recipients: experimentRecipients || (incoming?.sender?.aspectId ? [incoming.sender.aspectId] : []),
    kind: parsed.kind,
    body: parsed.body,
    evidenceRefs: raw.citedSources || [],
    stateRefs: incoming?.stateRefs || [],
  });

  return Object.freeze({
    schema: ASPECT_RUNTIME_REPLY_SCHEMA,
    status: parsed.kind === 'refusal' ? 'refused' : parsed.kind === 'pause' ? 'paused' : 'replied',
    aspectId: aspect.id,
    binding,
    envelope,
    runtime: Object.freeze({
      voiceId: raw.voiceId,
      route: raw.route,
      profileId: raw.profileId,
      runtimeVerified: raw.runtimeVerified,
      provider: raw.provider,
      model: raw.model,
      worldId: raw.worldId || null,
      runtimeWorldContextId: raw.runtimeWorldContextId || null,
      latencyMs: raw.latencyMs ?? null,
    }),
  });
}

export async function runAspectBusTurn({ bus, aspectId, incoming, ...options } = {}) {
  if (!bus?.publish) throw new Error('Aspect bus turn requires a message bus.');
  const reply = await invokeAspectRuntime({ aspectId, incoming, ...options });
  if (reply.envelope) bus.publish(reply.envelope);
  return reply;
}
