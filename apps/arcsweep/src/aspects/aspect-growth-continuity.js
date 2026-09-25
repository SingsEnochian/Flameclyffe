import { readHouseCommons, readHouseRuntimeToken, restoreHouseRuntimeSession } from '../house-runtime.js';
import { INITIAL_ASPECTS } from './aspect-contract.js';
import { ASPECT_MESSAGE_KINDS } from './aspect-message-bus.js';

export const ASPECT_GROWTH_CONTINUITY_SCHEMA = 'hearthweave.aspect-growth-continuity/v0.1';

const known = new Set(INITIAL_ASPECTS.map((aspect) => aspect.id));

function links(entry, kind) {
  return (Array.isArray(entry?.links) ? entry.links : []).filter((item) => item?.kind === kind);
}

function firstLink(entry, kind) {
  return links(entry, kind)[0] || null;
}

export function growthEnvelopeFromHouseEntry(entry = {}) {
  const envelopeLink = firstLink(entry, 'aspect-envelope');
  const traceLink = firstLink(entry, 'aspect-trace');
  const kindLink = firstLink(entry, 'aspect-kind');
  const aspectId = String(envelopeLink?.label || '').trim();
  if (!envelopeLink?.id || !traceLink?.id || !known.has(aspectId)) return null;
  const requestedKind = String(kindLink?.id || entry.status || 'thought');
  const kind = ASPECT_MESSAGE_KINDS.includes(requestedKind) ? requestedKind : 'thought';
  return Object.freeze({
    id: String(envelopeLink.id),
    traceId: String(traceLink.id),
    ...(firstLink(entry, 'aspect-parent')?.id ? { parentId: String(firstLink(entry, 'aspect-parent').id) } : {}),
    sender: Object.freeze({
      aspectId,
      invocationId: String(entry.runtime?.profile_id || `house:${entry.id || envelopeLink.id}`),
      ...(entry.voice_id ? { voiceId: String(entry.voice_id) } : {}),
      ...(entry.runtime?.provider ? { provider: String(entry.runtime.provider) } : {}),
      ...(entry.runtime?.model ? { model: String(entry.runtime.model) } : {}),
    }),
    recipients: Object.freeze(links(entry, 'aspect-recipient').map((item) => String(item.id)).filter(Boolean)),
    kind,
    body: String(entry.text || ''),
    evidenceRefs: Object.freeze(links(entry, 'evidence-ref').map((item) => String(item.id)).filter(Boolean)),
    stateRefs: Object.freeze(links(entry, 'state-ref').map((item) => String(item.id)).filter(Boolean)),
    createdAt: String(entry.created_at || ''),
  });
}

async function activeSession(fetchImpl = fetch) {
  return readHouseRuntimeToken() || restoreHouseRuntimeSession(fetchImpl);
}

export async function hydrateAspectGrowthGardenFromHouse(garden, {
  token = null,
  read = readHouseCommons,
  fetchImpl = fetch,
  limit = 600,
} = {}) {
  if (!garden?.hydrate) throw new Error('Growth continuity requires a Growth Garden.');
  const session = token || await activeSession(fetchImpl);
  if (!session) return Object.freeze({ schema: ASPECT_GROWTH_CONTINUITY_SCHEMA, status: 'house-offline', count: 0 });
  const log = await read(session, fetchImpl).catch(() => null);
  if (!log) return Object.freeze({ schema: ASPECT_GROWTH_CONTINUITY_SCHEMA, status: 'unavailable', count: 0 });
  const messages = (Array.isArray(log.entries) ? log.entries : [])
    .slice(-Math.max(1, Number(limit) || 600))
    .map(growthEnvelopeFromHouseEntry)
    .filter(Boolean);
  garden.hydrate(messages);
  return Object.freeze({
    schema: ASPECT_GROWTH_CONTINUITY_SCHEMA,
    status: 'hydrated',
    count: messages.length,
  });
}
