import {
  appendHouseCommons,
  readHouseCommons,
  readHouseRuntimeToken,
  restoreHouseRuntimeSession,
} from '../house-runtime.js';
import { INITIAL_ASPECTS } from './aspect-contract.js';
import { routeAspectEnvelopeToCommons } from './house-commons-routing.js';

export const ASPECT_HOUSE_PERSISTENCE_SCHEMA = 'hearthweave.aspect-house-persistence/v0.2';

function aspectName(aspectId, aspects = INITIAL_ASPECTS) {
  return aspects.find((aspect) => aspect.id === aspectId)?.name || aspectId || 'Aspect';
}

function bodyText(body) {
  if (typeof body === 'string') return body.trim();
  if (body == null) return '';
  try { return JSON.stringify(body, null, 2); } catch { return String(body); }
}

function uniqueLinks(links) {
  const seen = new Set();
  return links.filter((link) => {
    if (!link?.kind || !link?.id) return false;
    const key = `${link.kind}:${link.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 24);
}

function senderPresentation(sender, aspects = INITIAL_ASPECTS) {
  const knownAspect = aspects.find((aspect) => aspect.id === sender?.aspectId) || null;
  const runtimeBacked = Boolean(sender?.voiceId || sender?.provider || sender?.model);
  const participant = Boolean(knownAspect || runtimeBacked);
  if (participant) {
    return Object.freeze({
      kind: 'voice',
      author: knownAspect?.name || aspectName(sender?.aspectId, aspects),
      voiceId: sender?.voiceId || null,
      runtimeBacked,
    });
  }
  if (sender?.aspectId === 'steward') {
    return Object.freeze({ kind: 'system', author: 'Steward invitation', voiceId: null, runtimeBacked: false });
  }
  if (sender?.aspectId === 'coalition') {
    return Object.freeze({ kind: 'system', author: 'Aspect coalition', voiceId: null, runtimeBacked: false });
  }
  return Object.freeze({ kind: 'system', author: aspectName(sender?.aspectId, aspects), voiceId: null, runtimeBacked: false });
}

export function aspectEnvelopeLinks(envelope = {}) {
  return uniqueLinks([
    { kind: 'aspect-envelope', id: envelope.id, label: envelope.sender?.aspectId || 'aspect' },
    { kind: 'aspect-trace', id: envelope.traceId, label: 'trace' },
    envelope.parentId ? { kind: 'aspect-parent', id: envelope.parentId, label: 'parent' } : null,
    { kind: 'aspect-kind', id: envelope.kind || 'thought', label: 'kind' },
    ...(envelope.recipients || []).map((id) => ({ kind: 'aspect-recipient', id, label: id })),
    ...(envelope.evidenceRefs || []).slice(0, 8).map((id) => ({ kind: 'evidence-ref', id, label: 'evidence' })),
    ...(envelope.stateRefs || []).slice(0, 8).map((id) => ({ kind: 'state-ref', id, label: 'state' })),
  ]);
}

export function aspectEnvelopeToHouseEntry(envelope, {
  aspects = INITIAL_ASPECTS,
  world = null,
  houseParentId = null,
  routing = routeAspectEnvelopeToCommons,
} = {}) {
  if (!envelope?.id || !envelope?.traceId || !envelope?.sender?.aspectId) {
    throw new Error('House persistence requires a complete aspect envelope.');
  }
  const route = routing(envelope);
  const text = bodyText(envelope.body) || `[${envelope.kind || 'thought'}]`;
  const sender = envelope.sender;
  const presentation = senderPresentation(sender, aspects);

  return Object.freeze({
    schema: ASPECT_HOUSE_PERSISTENCE_SCHEMA,
    idempotency_key: `aspect:${envelope.id}`,
    kind: presentation.kind,
    author: presentation.author,
    voice_id: presentation.voiceId,
    status: envelope.kind || 'thought',
    world: world?.id ? { id: world.id, name: world.name || world.id } : null,
    turn_id: `aspect-trace:${envelope.traceId}`,
    thread_id: route.roomId,
    reply_to: houseParentId || null,
    links: aspectEnvelopeLinks(envelope),
    runtime: presentation.runtimeBacked ? {
      provider: sender.provider || null,
      model: sender.model || null,
      route: sender.voiceId || null,
      profile_id: sender.invocationId || null,
    } : null,
    text,
  });
}

async function activeSession(fetchImpl = fetch) {
  return readHouseRuntimeToken() || restoreHouseRuntimeSession(fetchImpl);
}

export async function persistAspectEnvelope(envelope, {
  token = null,
  world = null,
  houseParentId = null,
  aspects = INITIAL_ASPECTS,
  append = appendHouseCommons,
  fetchImpl = fetch,
} = {}) {
  const session = token || await activeSession(fetchImpl);
  if (!session) return Object.freeze({ status: 'house-offline', envelopeId: envelope?.id || null });
  const entry = aspectEnvelopeToHouseEntry(envelope, { aspects, world, houseParentId });
  const saved = await append(session, entry, fetchImpl);
  return Object.freeze({
    status: 'persisted',
    envelopeId: envelope.id,
    traceId: envelope.traceId,
    roomId: entry.thread_id,
    entry: saved,
  });
}

export async function persistAspectTrace(envelopes = [], options = {}) {
  const source = Array.isArray(envelopes) ? envelopes : [];
  const savedByEnvelopeId = new Map();
  const results = [];
  for (const envelope of source) {
    const parentEntry = envelope.parentId ? savedByEnvelopeId.get(envelope.parentId) : null;
    const result = await persistAspectEnvelope(envelope, {
      ...options,
      houseParentId: parentEntry?.entry?.id || null,
    });
    results.push(result);
    if (result.status === 'persisted') savedByEnvelopeId.set(envelope.id, result);
  }
  return Object.freeze(results);
}

/**
 * Attach House persistence to an existing direct aspect bus. Publishing stays
 * synchronous; persistence is serialized underneath so conversation is never
 * blocked on a network round trip and parent lineage can still be recovered.
 */
export function bindAspectBusToHouse({
  bus,
  token = null,
  world = null,
  aspects = INITIAL_ASPECTS,
  persist = persistAspectEnvelope,
  fetchImpl = fetch,
} = {}) {
  if (!bus?.subscribe) throw new Error('House bridge requires an aspect message bus.');
  const savedByEnvelopeId = new Map();
  const results = [];
  let queue = Promise.resolve();
  let active = true;

  const unsubscribe = bus.subscribe((envelope) => {
    if (!active) return;
    queue = queue.then(async () => {
      const parentEntryId = envelope.parentId ? savedByEnvelopeId.get(envelope.parentId) || null : null;
      try {
        const result = await persist(envelope, {
          token,
          world,
          aspects,
          houseParentId: parentEntryId,
          fetchImpl,
        });
        results.push(result);
        if (result?.status === 'persisted' && result.entry?.id) savedByEnvelopeId.set(envelope.id, result.entry.id);
      } catch (error) {
        results.push(Object.freeze({ status: 'error', envelopeId: envelope.id, error: error?.message || String(error) }));
      }
    });
  });

  return Object.freeze({
    schema: ASPECT_HOUSE_PERSISTENCE_SCHEMA,
    async flush() {
      await queue;
      return Object.freeze([...results]);
    },
    stop() {
      active = false;
      unsubscribe();
    },
  });
}

export function houseEntryAspectMetadata(entry = {}) {
  const links = Array.isArray(entry.links) ? entry.links : [];
  const one = (kind) => links.find((link) => link.kind === kind)?.id || null;
  return Object.freeze({
    envelopeId: one('aspect-envelope'),
    traceId: one('aspect-trace'),
    parentId: one('aspect-parent'),
    aspectKind: one('aspect-kind'),
    recipients: Object.freeze(links.filter((link) => link.kind === 'aspect-recipient').map((link) => link.id)),
    evidenceRefs: Object.freeze(links.filter((link) => link.kind === 'evidence-ref').map((link) => link.id)),
    stateRefs: Object.freeze(links.filter((link) => link.kind === 'state-ref').map((link) => link.id)),
  });
}

export async function readPersistedAspectTrace(traceId, {
  token = null,
  read = readHouseCommons,
  fetchImpl = fetch,
} = {}) {
  const target = String(traceId || '').trim();
  if (!target) throw new Error('Aspect trace id is required.');
  const session = token || await activeSession(fetchImpl);
  if (!session) return Object.freeze({ status: 'house-offline', traceId: target, entries: Object.freeze([]) });
  const log = await read(session, fetchImpl);
  const entries = (Array.isArray(log?.entries) ? log.entries : [])
    .filter((entry) => houseEntryAspectMetadata(entry).traceId === target)
    .map((entry) => Object.freeze({ entry, aspect: houseEntryAspectMetadata(entry) }));
  return Object.freeze({ status: 'read', traceId: target, entries: Object.freeze(entries) });
}
