// sandbox/everos/yggdrasil-everos-bridge.mjs
// Thin Yggdrasil-facing bridge over existing sandbox/everos/evercore-client.mjs.
// Requires copying yggdrasil-memory-gate.mjs and yggdrasil-memory-card.mjs beside it.

import { checkHealth, searchMemories, storeMemory } from './evercore-client.mjs';
import { assertCanRetrieve, assertCanWriteCandidate, requireCardInjectionOnly } from './yggdrasil-memory-gate.mjs';
import { formatMemoryCards } from './yggdrasil-memory-card.mjs';

export async function getYggMemoryContext({
  query,
  lane = 'project_canon',
  consent = false,
  reason = 'chat-context',
  topK = 8
} = {}) {
  const decision = assertCanRetrieve({ lane, consent, reason });
  if (!decision.allowed) {
    return {
      ok: false,
      blocked: true,
      reason: decision.reason,
      prompt_context: '',
      cards: []
    };
  }

  try {
    await checkHealth();
    const results = await searchMemories(query, { topK });
    const cards = requireCardInjectionOnly(normalizeEverCoreResults(results));
    return {
      ok: true,
      blocked: false,
      reason: 'Retrieved memory context.',
      cards,
      prompt_context: formatMemoryCards(cards)
    };
  } catch (error) {
    return {
      ok: false,
      blocked: false,
      reason: `Memory unavailable: ${error.message}`,
      prompt_context: '',
      cards: []
    };
  }
}

export async function writeYggMemoryCandidate({
  content,
  lane = 'project_canon',
  source = 'curated-yggdrasil-candidate',
  consent = false,
  memoryId,
  sender = 'rowan',
  senderName = 'Rowan'
} = {}) {
  const decision = assertCanWriteCandidate({ lane, source, consent, content });
  if (!decision.allowed) {
    return { ok: false, blocked: true, reason: decision.reason };
  }

  const wrapped = [
    `Lane: ${lane}`,
    `Source: ${source}`,
    'Review state: candidate',
    '',
    content.trim()
  ].join('\n');

  try {
    const result = await storeMemory(wrapped, {
      messageId: memoryId,
      sender,
      senderName,
      role: 'user'
    });
    return { ok: true, blocked: false, result };
  } catch (error) {
    return { ok: false, blocked: false, reason: error.message };
  }
}

function normalizeEverCoreResults(results) {
  if (Array.isArray(results)) return results;
  if (Array.isArray(results?.memories)) return results.memories;
  if (Array.isArray(results?.data)) return results.data;
  if (Array.isArray(results?.results)) return results.results;
  return [];
}
