import { INITIAL_ASPECTS } from './aspect-contract.js';
import { createAspectMessageBus } from './aspect-message-bus.js';
import { createAspectSharedState } from './aspect-state.js';
import { runAspectBusTurn } from './aspect-runtime-adapter.js';

export const ASPECT_COALITION_SCHEMA = 'hearthweave.aspect-coalition/v0.2';

function id(prefix = 'coalition') {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function strings(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || '').trim()).filter(Boolean))];
}

export function createAspectCoalition({
  id: coalitionId,
  purpose,
  members = [],
  synthesisAspectId = null,
  mode = 'working',
  createdAt = new Date().toISOString(),
  aspects = INITIAL_ASPECTS,
} = {}) {
  const memberIds = strings(members);
  if (!String(purpose || '').trim()) throw new Error('Aspect coalition requires a purpose.');
  if (memberIds.length < 2) throw new Error('Aspect coalition requires at least two members.');
  const known = new Set(aspects.map((aspect) => aspect.id));
  const unknown = memberIds.filter((member) => !known.has(member));
  if (unknown.length) throw new Error(`Unknown coalition aspect(s): ${unknown.join(', ')}`);
  if (synthesisAspectId && !memberIds.includes(synthesisAspectId)) throw new Error('Synthesis aspect must be a coalition member.');

  return Object.freeze({
    schema: ASPECT_COALITION_SCHEMA,
    id: String(coalitionId || id()),
    purpose: String(purpose).trim(),
    members: Object.freeze(memberIds),
    synthesisAspectId: synthesisAspectId ? String(synthesisAspectId) : null,
    mode: String(mode || 'working'),
    createdAt: String(createdAt),
  });
}

function textBody(body) {
  if (typeof body === 'string') return body;
  try { return JSON.stringify(body); } catch { return String(body ?? ''); }
}

export function coalitionSharedContext({ coalition, bus, state } = {}) {
  const messages = bus?.all?.() || [];
  const snapshot = state?.snapshot?.() || { contributions: [], alternatives: [], openQuestions: [] };
  return Object.freeze([
    `Coalition purpose: ${coalition?.purpose || 'open'}`,
    `Coalition members: ${(coalition?.members || []).join(', ')}`,
    ...messages.slice(-12).map((message) => `${message.sender.aspectId} [${message.kind}]: ${textBody(message.body).slice(0, 1600)}`),
    ...snapshot.openQuestions.slice(-6).map((question) => `Open question from ${question.aspectId}: ${question.text}`),
  ]);
}

export async function runCoalitionRound({
  coalition,
  incoming,
  bus = createAspectMessageBus(),
  state = createAspectSharedState(),
  invokeTurn = runAspectBusTurn,
  runtimeOptions = {},
} = {}) {
  if (!coalition?.members?.length) throw new Error('Coalition round requires a coalition.');
  let current = incoming;
  const replies = [];

  for (const aspectId of coalition.members) {
    const reply = await invokeTurn({
      bus,
      aspectId,
      incoming: current,
      sharedContext: coalitionSharedContext({ coalition, bus, state }),
      ...runtimeOptions,
    });
    replies.push(reply);
    if (!reply?.envelope) continue;
    state.contribute({
      aspectId,
      kind: reply.envelope.kind,
      content: reply.envelope.body,
      refs: [reply.envelope.id, ...(reply.envelope.evidenceRefs || [])],
    });
    if (reply.envelope.kind === 'question') {
      state.ask({ aspectId, text: textBody(reply.envelope.body) });
    }
    current = reply.envelope;
  }

  return Object.freeze({
    coalition,
    bus,
    state,
    replies: Object.freeze(replies),
    lastEnvelope: current,
  });
}

export async function requestCoalitionSynthesis({
  coalition,
  bus,
  state,
  incoming,
  invokeTurn = runAspectBusTurn,
  runtimeOptions = {},
} = {}) {
  const aspectId = coalition?.synthesisAspectId;
  if (!aspectId) return Object.freeze({ status: 'not-requested', envelope: null });
  const synthesisRequest = bus.publish({
    traceId: incoming?.traceId || coalition.id,
    parentId: incoming?.id,
    sender: { aspectId: 'coalition', invocationId: coalition.id },
    recipients: [aspectId],
    kind: 'question',
    body: {
      coalitionId: coalition.id,
      purpose: coalition.purpose,
      request: 'Synthesize the coalition’s useful conclusions, retained disagreements, and next reversible route. Do not erase dissent.',
    },
  });
  const reply = await invokeTurn({
    bus,
    aspectId,
    incoming: synthesisRequest,
    sharedContext: coalitionSharedContext({ coalition, bus, state }),
    ...runtimeOptions,
  });
  if (reply?.envelope) {
    state.contribute({
      aspectId,
      kind: 'synthesis',
      content: reply.envelope.body,
      refs: [reply.envelope.id],
    });
  }
  return Object.freeze({ status: reply?.envelope ? 'synthesized' : reply?.status || 'unavailable', envelope: reply?.envelope || null, reply });
}

export async function runAspectCoalition({
  coalition,
  seed,
  rounds = 1,
  bus = createAspectMessageBus(),
  state = createAspectSharedState(),
  invokeTurn = runAspectBusTurn,
  runtimeOptions = {},
} = {}) {
  if (!coalition) throw new Error('Aspect coalition is required.');
  if (!seed?.id) throw new Error('Aspect coalition requires a seed envelope.');
  const count = Math.max(1, Math.min(6, Number(rounds) || 1));
  const existingSeed = bus.all().find((message) => message.id === seed.id);
  let incoming = existingSeed || bus.publish(seed);
  const roundResults = [];

  for (let round = 0; round < count; round += 1) {
    const result = await runCoalitionRound({ coalition, incoming, bus, state, invokeTurn, runtimeOptions });
    roundResults.push(result);
    incoming = result.lastEnvelope || incoming;
  }

  const synthesis = await requestCoalitionSynthesis({ coalition, bus, state, incoming, invokeTurn, runtimeOptions });
  return Object.freeze({
    coalition,
    rounds: Object.freeze(roundResults),
    synthesis,
    trace: bus.forTrace(seed.traceId),
    sharedState: state.snapshot(),
  });
}
