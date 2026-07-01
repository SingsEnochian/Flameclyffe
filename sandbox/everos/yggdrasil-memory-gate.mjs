// sandbox/everos/yggdrasil-memory-gate.mjs
// Yggdrasil 1.3: memory safety gate for existing EverCore/EverOS sandbox.
// Place in SingsEnochian/Flameclyffe and import before search/write calls.

import laneMap from './yggdrasil-lane-map.json' assert { type: 'json' };

const PRIVATE_LANES = new Set(laneMap.consent_required_lanes);
const HARD_BLOCKED_PATTERNS = [
  /raw\s+private\s+chat/i,
  /bulk\s+folder\s+ingestion/i,
  /secret(s)?\s+in\s+browser/i,
  /medical|financial|legal/i,
  /third[-\s]?party\s+identifier/i
];

export function classifyMemoryKind(memoryKind) {
  return laneMap.kind_to_lane[memoryKind] || 'unclassified';
}

export function assertCanRetrieve({ lane, consent = false, reason = '' }) {
  if (!lane) {
    return { allowed: false, reason: 'No memory lane supplied.' };
  }

  if (PRIVATE_LANES.has(lane) && !consent) {
    return {
      allowed: false,
      reason: `Lane '${lane}' requires explicit consent before retrieval.`
    };
  }

  if (HARD_BLOCKED_PATTERNS.some(pattern => pattern.test(reason))) {
    return {
      allowed: false,
      reason: 'Retrieval reason touches a blocked ingestion/retrieval boundary.'
    };
  }

  return { allowed: true, reason: 'Retrieval allowed.' };
}

export function assertCanWriteCandidate({ lane, source = '', consent = false, content = '' }) {
  if (!content || !content.trim()) {
    return { allowed: false, reason: 'Empty memory candidate.' };
  }

  if (PRIVATE_LANES.has(lane) && !consent) {
    return {
      allowed: false,
      reason: `Lane '${lane}' requires explicit consent before writing.`
    };
  }

  if (/raw\s+private\s+chat|bulk\s+ingest|skim\s+folders/i.test(source)) {
    return {
      allowed: false,
      reason: 'Raw or bulk ingestion is blocked by default.'
    };
  }

  return { allowed: true, reason: 'Candidate write allowed for review queue.' };
}

export function requireCardInjectionOnly(memoryResults = []) {
  return memoryResults.map((item, index) => ({
    card_id: item.memory_id || item.message_id || `everos_result_${index + 1}`,
    lane: classifyMemoryKind(item.memory_kind),
    source: item.source || 'everos-search',
    visibility: item.visibility || 'unknown',
    tags: Array.isArray(item.tags) ? item.tags : [],
    content: String(item.content || item.text || '').trim(),
    interpretive_context: item.interpretive_context || null
  })).filter(card => card.content);
}
