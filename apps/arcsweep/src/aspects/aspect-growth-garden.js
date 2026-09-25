import { INITIAL_ASPECTS } from './aspect-contract.js';

export const ASPECT_GROWTH_GARDEN_SCHEMA = 'hearthweave.aspect-growth-garden/v0.2';
export const ASPECT_GROWTH_PROFILE_SCHEMA = 'hearthweave.aspect-growth-profile/v0.2';
export const GROWTH_CLAIM_TYPES = Object.freeze(['skill', 'curiosity', 'preference', 'relationship', 'role', 'boundary', 'note']);
export const GROWTH_RELATIONS = Object.freeze(['adds', 'supersedes', 'contradicts', 'retires', 'affirms']);

const PATTERN_LABELS = Object.freeze({
  proposal: 'route-making',
  result: 'completion',
  verification: 'verification',
  challenge: 'critical challenge',
  question: 'inquiry',
  reply: 'dialogue',
  refusal: 'boundary expression',
  pause: 'self-pacing',
});

const THREAD_OPENERS = new Set(['question', 'proposal', 'challenge']);
const THREAD_CLOSERS = new Set(['result', 'verification']);

function text(value, max = 1200) {
  return String(value ?? '').trim().slice(0, max);
}

function bodyText(body, max = 500) {
  if (typeof body === 'string') return text(body, max);
  try { return text(JSON.stringify(body ?? ''), max); } catch { return text(body, max); }
}

function strings(values, max = 120) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map((value) => text(value, max))
    .filter(Boolean))];
}

function knownAspectIds(aspects = INITIAL_ASPECTS) {
  return new Set(aspects.map((aspect) => aspect.id));
}

function mergeMessages(...sources) {
  const byId = new Map();
  for (const source of sources) {
    for (const message of Array.isArray(source) ? source : []) {
      if (!message?.id) continue;
      byId.set(String(message.id), message);
    }
  }
  return [...byId.values()].sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
}

function normaliseClaim(message, known) {
  if (message?.kind !== 'growth' || !known.has(message?.sender?.aspectId)) return null;
  const body = message.body;
  const object = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const requestedType = text(object.type || object.kind || 'note', 40).toLowerCase();
  const type = GROWTH_CLAIM_TYPES.includes(requestedType) ? requestedType : 'note';
  const subjectAspectId = known.has(text(object.subjectAspectId || object.subject_aspect_id, 80))
    ? text(object.subjectAspectId || object.subject_aspect_id, 80)
    : message.sender.aspectId;
  const statement = text(object.statement || object.text || (typeof body === 'string' ? body : JSON.stringify(body ?? '')), 1000);
  if (!statement) return null;
  const requestedRelation = text(object.relation || 'adds', 32).toLowerCase();
  const relation = GROWTH_RELATIONS.includes(requestedRelation) ? requestedRelation : 'adds';
  const targetEnvelopeIds = strings(object.targetEnvelopeIds || object.target_envelope_ids || object.targets, 160);
  const tags = strings(object.tags, 80);
  return Object.freeze({
    type,
    subjectAspectId,
    sourceAspectId: message.sender.aspectId,
    source: subjectAspectId === message.sender.aspectId ? 'self-report' : 'peer-observation',
    statement,
    relation,
    targetEnvelopeIds: Object.freeze(targetEnvelopeIds),
    tags: Object.freeze(tags),
    envelopeId: message.id,
    traceId: message.traceId || null,
    createdAt: message.createdAt || '',
  });
}

function claimStates(claims) {
  const states = new Map(claims.map((claim) => [claim.envelopeId, {
    active: true,
    contested: false,
    retired: false,
    supersededBy: [],
    contradictedBy: [],
    retiredBy: [],
    affirmedBy: [],
  }]));

  for (const claim of claims) {
    for (const targetId of claim.targetEnvelopeIds || []) {
      const target = states.get(targetId);
      if (!target || targetId === claim.envelopeId) continue;
      if (claim.relation === 'supersedes') {
        target.active = false;
        target.supersededBy.push(claim.envelopeId);
      } else if (claim.relation === 'retires') {
        target.active = false;
        target.retired = true;
        target.retiredBy.push(claim.envelopeId);
      } else if (claim.relation === 'contradicts') {
        target.contested = true;
        target.contradictedBy.push(claim.envelopeId);
      } else if (claim.relation === 'affirms') {
        target.affirmedBy.push(claim.envelopeId);
      }
    }
  }

  return new Map([...states].map(([id, state]) => [id, Object.freeze({
    ...state,
    supersededBy: Object.freeze([...state.supersededBy]),
    contradictedBy: Object.freeze([...state.contradictedBy]),
    retiredBy: Object.freeze([...state.retiredBy]),
    affirmedBy: Object.freeze([...state.affirmedBy]),
  })]));
}

function decorateClaims(claims) {
  const states = claimStates(claims);
  return claims.map((claim) => Object.freeze({
    ...claim,
    state: states.get(claim.envelopeId) || Object.freeze({ active: true, contested: false, retired: false }),
  }));
}

function patternRows(messages) {
  const counts = new Map();
  for (const message of messages) {
    const label = PATTERN_LABELS[message.kind];
    if (!label) continue;
    const current = counts.get(message.kind) || { kind: message.kind, label, count: 0, lastAt: '' };
    current.count += 1;
    current.lastAt = String(message.createdAt || current.lastAt || '');
    counts.set(message.kind, current);
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || b.lastAt.localeCompare(a.lastAt))
    .map((row) => Object.freeze(row));
}

function collaborationRows(aspectId, messages, known) {
  const counts = new Map();
  for (const message of messages) {
    const sender = message?.sender?.aspectId;
    if (!known.has(sender)) continue;
    for (const recipient of message.recipients || []) {
      if (!known.has(recipient) || recipient === sender) continue;
      if (sender !== aspectId && recipient !== aspectId) continue;
      const other = sender === aspectId ? recipient : sender;
      const current = counts.get(other) || { aspectId: other, turns: 0, traces: new Set(), lastAt: '' };
      current.turns += 1;
      if (message.traceId) current.traces.add(message.traceId);
      current.lastAt = String(message.createdAt || current.lastAt || '');
      counts.set(other, current);
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.turns - a.turns || b.lastAt.localeCompare(a.lastAt))
    .map((row) => Object.freeze({
      aspectId: row.aspectId,
      turns: row.turns,
      traceCount: row.traces.size,
      lastAt: row.lastAt,
      recurring: row.turns >= 3 || row.traces.size >= 2,
    }));
}

function openCuriosities(aspectId, messages) {
  const answered = new Set(messages.map((message) => message.parentId).filter(Boolean));
  return messages
    .filter((message) => message?.sender?.aspectId === aspectId && message.kind === 'question' && !answered.has(message.id))
    .slice(-8)
    .reverse()
    .map((message) => Object.freeze({
      envelopeId: message.id,
      traceId: message.traceId || null,
      text: bodyText(message.body),
      createdAt: message.createdAt || '',
    }));
}

function openThreadRows(aspectId, messages, known) {
  const traces = new Map();
  for (const message of messages) {
    if (!message?.traceId) continue;
    const row = traces.get(message.traceId) || { traceId: message.traceId, messages: [], aspects: new Set() };
    row.messages.push(message);
    if (known.has(message?.sender?.aspectId)) row.aspects.add(message.sender.aspectId);
    for (const recipient of message.recipients || []) if (known.has(recipient)) row.aspects.add(recipient);
    traces.set(message.traceId, row);
  }

  return [...traces.values()]
    .filter((row) => row.aspects.has(aspectId))
    .map((row) => {
      const opened = row.messages.filter((message) => THREAD_OPENERS.has(message.kind));
      const closed = row.messages.some((message) => THREAD_CLOSERS.has(message.kind));
      if (!opened.length || closed) return null;
      const last = row.messages[row.messages.length - 1];
      const lastOpener = opened[opened.length - 1];
      return Object.freeze({
        traceId: row.traceId,
        aspects: Object.freeze([...row.aspects]),
        openedBy: lastOpener.sender?.aspectId || null,
        kind: lastOpener.kind,
        text: bodyText(lastOpener.body, 420),
        lastAt: String(last?.createdAt || lastOpener.createdAt || ''),
      });
    })
    .filter(Boolean)
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
    .slice(0, 8);
}

export function buildAspectGrowthSnapshot(messages = [], aspects = INITIAL_ASPECTS) {
  const source = mergeMessages(messages);
  const known = knownAspectIds(aspects);
  const claims = decorateClaims(source.map((message) => normaliseClaim(message, known)).filter(Boolean));
  const profiles = {};

  for (const aspect of aspects) {
    const own = source.filter((message) => message?.sender?.aspectId === aspect.id);
    const aspectClaims = claims.filter((claim) => claim.subjectAspectId === aspect.id);
    const activeClaims = aspectClaims.filter((claim) => claim.state.active && !claim.state.retired);
    profiles[aspect.id] = Object.freeze({
      schema: ASPECT_GROWTH_PROFILE_SCHEMA,
      aspectId: aspect.id,
      aspectName: aspect.name,
      seedStrengths: Object.freeze([...(aspect.strengths || [])]),
      messageCount: own.length,
      demonstratedPatterns: Object.freeze(patternRows(own)),
      collaborators: Object.freeze(collaborationRows(aspect.id, source, known)),
      openCuriosities: Object.freeze(openCuriosities(aspect.id, source)),
      openThreads: Object.freeze(openThreadRows(aspect.id, source, known)),
      claims: Object.freeze(aspectClaims),
      activeClaims: Object.freeze(activeClaims),
      archivedClaims: Object.freeze(aspectClaims.filter((claim) => !claim.state.active || claim.state.retired)),
      contestedClaims: Object.freeze(aspectClaims.filter((claim) => claim.state.contested)),
      selfReports: Object.freeze(activeClaims.filter((claim) => claim.source === 'self-report')),
      peerObservations: Object.freeze(activeClaims.filter((claim) => claim.source === 'peer-observation')),
      skillClaims: Object.freeze(activeClaims.filter((claim) => claim.type === 'skill')),
      roleSuggestions: Object.freeze(activeClaims.filter((claim) => claim.type === 'role')),
      preferenceClaims: Object.freeze(activeClaims.filter((claim) => claim.type === 'preference' || claim.type === 'relationship')),
      boundaryNotes: Object.freeze(activeClaims.filter((claim) => claim.type === 'boundary')),
    });
  }

  return Object.freeze({
    schema: ASPECT_GROWTH_GARDEN_SCHEMA,
    messageCount: source.length,
    claimCount: claims.length,
    activeClaimCount: claims.filter((claim) => claim.state.active && !claim.state.retired).length,
    profiles: Object.freeze(profiles),
  });
}

export function growthContextForAspect(snapshot, aspectId) {
  const profile = snapshot?.profiles?.[aspectId];
  if (!profile) return Object.freeze([]);
  const lines = [
    'Growth memory is descriptive continuity, not identity law. Patterns may suggest; they do not silently redefine you.',
    'Older rings remain available even when later growth supersedes, retires, or contradicts them.',
  ];
  const patterns = profile.demonstratedPatterns.filter((row) => row.count >= 2).slice(0, 4);
  if (patterns.length) lines.push(`Demonstrated patterns: ${patterns.map((row) => `${row.label} ×${row.count}`).join(', ')}.`);
  const recurring = profile.collaborators.filter((row) => row.recurring).slice(0, 4);
  if (recurring.length) lines.push(`Recurring collaborators: ${recurring.map((row) => `${row.aspectId} (${row.turns} turns across ${row.traceCount} traces)`).join(', ')}.`);
  if (profile.openCuriosities.length) lines.push(`Open curiosities: ${profile.openCuriosities.slice(0, 3).map((item) => item.text).join(' | ')}`);
  if (profile.openThreads.length) lines.push(`Unfinished threads: ${profile.openThreads.slice(0, 3).map((item) => `${item.traceId}: ${item.text}`).join(' | ')}`);
  if (profile.selfReports.length) lines.push(`Your carried self-observations: ${profile.selfReports.slice(-3).map((claim) => claim.statement).join(' | ')}`);
  if (profile.peerObservations.length) lines.push(`Peer observations, not facts about identity: ${profile.peerObservations.slice(-3).map((claim) => `${claim.sourceAspectId}: ${claim.statement}${claim.state.contested ? ' [contested]' : ''}`).join(' | ')}`);
  if (profile.contestedClaims.length) lines.push(`Contested older rings remain in provenance: ${profile.contestedClaims.slice(-3).map((claim) => `${claim.envelopeId}: ${claim.statement}`).join(' | ')}`);
  return Object.freeze(lines);
}

export function createAspectGrowthGarden({ bus = null, history = [], aspects = INITIAL_ASPECTS } = {}) {
  let carried = mergeMessages(history);
  let snapshot = buildAspectGrowthSnapshot(mergeMessages(carried, bus?.all?.() || []), aspects);
  const subscribers = new Set();

  function refresh() {
    snapshot = buildAspectGrowthSnapshot(mergeMessages(carried, bus?.all?.() || []), aspects);
    for (const listener of subscribers) listener(snapshot);
    return snapshot;
  }

  const unsubscribeBus = bus?.subscribe?.(() => refresh()) || (() => {});

  return Object.freeze({
    schema: ASPECT_GROWTH_GARDEN_SCHEMA,
    snapshot() {
      return snapshot;
    },
    forAspect(aspectId) {
      return snapshot.profiles?.[String(aspectId || '')] || null;
    },
    contextFor(aspectId) {
      return growthContextForAspect(snapshot, String(aspectId || ''));
    },
    hydrate(messages = []) {
      carried = mergeMessages(carried, messages);
      return refresh();
    },
    subscribe(listener) {
      if (typeof listener !== 'function') throw new Error('Growth Garden subscriber must be a function.');
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
    stop() {
      unsubscribeBus();
      subscribers.clear();
    },
  });
}
