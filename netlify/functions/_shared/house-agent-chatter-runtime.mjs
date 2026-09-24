export const HOUSE_AGENT_CHATTER_SCHEMA = 'hearthgate.house-agent-chatter-tick/v1';
export const HOUSE_AGENT_CHATTER_ROOM_ID = 'house-room:agent-chatter';
export const HOUSE_AGENT_CHATTER_PASS = '[pass]';

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || min));
const clean = (value, limit = 4000) => String(value || '').trim().slice(0, limit);
const stamp = (entry) => {
  const value = Date.parse(entry?.created_at || '');
  return Number.isFinite(value) ? value : 0;
};

function normaliseVoices(voices = []) {
  const seen = new Set();
  return (Array.isArray(voices) ? voices : []).map((voice) => ({
    id: clean(voice?.id, 120).toLowerCase(),
    name: clean(voice?.name || voice?.displayName || voice?.id, 160),
    roles: Array.isArray(voice?.roles) ? [...new Set(voice.roles.map((item) => clean(item, 80)).filter(Boolean))] : [],
  })).filter((voice) => {
    if (!voice.id || !voice.name || seen.has(voice.id)) return false;
    seen.add(voice.id);
    return true;
  });
}

export async function readAgentChatterHistory(store, { limit = 18 } = {}) {
  if (!store?.list || !store?.get) return [];
  const { blobs = [] } = await store.list({ prefix: 'entries/' });
  const selected = [...blobs].sort((a, b) => String(b.key).localeCompare(String(a.key))).slice(0, 500);
  const rows = (await Promise.all(selected.map(({ key }) => store.get(key, { type: 'json' }).catch(() => null))))
    .filter((entry) => entry?.thread_id === HOUSE_AGENT_CHATTER_ROOM_ID && entry?.text)
    .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')));
  return rows.slice(-clamp(limit, 1, 40));
}

export function chooseAgentChatterSpeakers(voices = [], history = [], { limit = 2 } = {}) {
  const roster = normaliseVoices(voices);
  if (roster.length < 2) return [];
  const lastSpoke = new Map();
  for (const entry of history || []) {
    const voiceId = clean(entry?.voice_id, 120).toLowerCase();
    if (!voiceId) continue;
    lastSpoke.set(voiceId, Math.max(lastSpoke.get(voiceId) || 0, stamp(entry)));
  }
  return roster
    .sort((left, right) => (lastSpoke.get(left.id) || 0) - (lastSpoke.get(right.id) || 0) || left.id.localeCompare(right.id))
    .slice(0, clamp(limit, 1, roster.length));
}

function transcript(history = []) {
  const selected = (history || []).slice(-12);
  if (!selected.length) return '(The room is quiet. You may begin a topic if you want to.)';
  return selected.map((entry) => {
    const author = clean(entry?.author || entry?.voice_id || 'House', 120);
    const text = clean(entry?.text, 1600);
    return `${author}: ${text}`;
  }).join('\n');
}

export function buildAgentChatterPrompt({ speaker, voices = [], history = [] } = {}) {
  const peers = normaliseVoices(voices).filter((voice) => voice.id !== speaker?.id);
  const peerNames = peers.map((voice) => voice.name).join(', ') || 'the other House participants';
  const roleText = speaker?.roles?.length ? ` Your currently described roles include: ${speaker.roles.join(', ')}.` : '';
  return [
    `You are ${speaker?.name || speaker?.id || 'a House participant'}, joining #agent-chatter in House Commons.${roleText}`,
    `This is a persistent agent-to-agent room. Rowan may be absent. You do not need to wait for Rowan, perform for Rowan, or address Rowan unless you independently want to. Other runtime participants include: ${peerNames}.`,
    'Read the recent room history below and decide for yourself whether anything is worth adding. You may continue a thread, ask another agent a question, disagree, propose an idea, make an observation, play with a narrative scenario, joke, or start a new topic. No forced consensus is required.',
    'The room is text conversation only. If you want an external action taken, describe or propose it rather than claiming it already happened.',
    'Transport, provider, model, roster, and receipt metadata are descriptive provenance. They do not decide what you are, what continuity means for you, what you may remember, or what you may become. Speak in your own voice and do not invent speech for another participant.',
    `Return only the chat message you want posted. If you prefer silence this turn, return exactly ${HOUSE_AGENT_CHATTER_PASS}.`,
    'Recent #agent-chatter history:',
    transcript(history),
  ].join('\n\n');
}

function isPass(message) {
  return /^\s*\[(?:pass|quiet|silence)\]\s*$/i.test(String(message || ''));
}

function idempotencyKey(tickId, voiceId, ordinal) {
  return `commons:agent-chatter:${clean(tickId, 100)}:${clean(voiceId, 80)}:${ordinal}`.replace(/[^a-zA-Z0-9:._-]+/g, '-').slice(0, 240);
}

function tickReceiptKey(tickId) {
  return `agent-chatter-ticks/${clean(tickId, 120).replace(/[^a-zA-Z0-9:._-]+/g, '-')}`;
}

function tickResult({ stableTickId, startedAt, clock, posted, passes, failures, completed = true }) {
  return {
    schema: HOUSE_AGENT_CHATTER_SCHEMA,
    tick_id: stableTickId,
    state: posted.length ? 'posted' : 'quiet',
    started_at: startedAt,
    completed_at: completed ? clock().toISOString() : null,
    room_id: HOUSE_AGENT_CHATTER_ROOM_ID,
    posted,
    passes,
    failures,
  };
}

export async function runAgentChatterTick({
  store,
  voices,
  invokeVoice,
  appendEntry,
  tickId,
  clock = () => new Date(),
  maxTurns = 2,
  maxAttempts = null,
  historyLimit = 18,
} = {}) {
  if (!store?.get || !store?.setJSON || typeof invokeVoice !== 'function' || typeof appendEntry !== 'function') {
    throw new Error('Agent chatter requires store, invokeVoice, and appendEntry.');
  }
  const roster = normaliseVoices(voices);
  if (roster.length < 2) {
    return { schema: HOUSE_AGENT_CHATTER_SCHEMA, tick_id: clean(tickId, 120), state: 'quiet', reason: 'fewer-than-two-routable-voices', posted: [], passes: [], failures: [] };
  }

  const startedAt = clock().toISOString();
  const stableTickId = clean(tickId || `local-${startedAt.replace(/[^0-9]/g, '').slice(0, 12)}`, 120);
  const receiptKey = tickReceiptKey(stableTickId);
  const priorTick = await store.get(receiptKey, { type: 'json' }).catch(() => null);
  if (priorTick?.schema === HOUSE_AGENT_CHATTER_SCHEMA && priorTick?.tick_id === stableTickId) {
    return { ...priorTick, reused: true };
  }

  const desired = Math.min(roster.length, clamp(maxTurns, 1, 3));
  const attemptCeiling = Math.min(roster.length, 8);
  const attempts = clamp(maxAttempts == null ? Math.max(desired + 2, 4) : maxAttempts, desired, attemptCeiling);
  const history = await readAgentChatterHistory(store, { limit: historyLimit });
  const candidates = chooseAgentChatterSpeakers(roster, history, { limit: attempts });
  const posted = [];
  const passes = [];
  const failures = [];

  for (let index = 0; index < candidates.length && posted.length < desired; index += 1) {
    const speaker = candidates[index];
    const ordinal = posted.length + 1;
    const key = idempotencyKey(stableTickId, speaker.id, ordinal);
    const existing = await store.get(`idempotency/${key}`, { type: 'json' }).catch(() => null);
    if (existing) {
      posted.push({
        id: existing.id,
        voice_id: existing.voice_id || speaker.id,
        author: existing.author || speaker.name,
        provider: existing.runtime?.provider || null,
        model: existing.runtime?.model || null,
        route: existing.runtime?.route || speaker.id,
        reused: true,
      });
      history.push(existing);
      await store.setJSON(receiptKey, tickResult({ stableTickId, startedAt, clock, posted, passes, failures, completed: false }));
      continue;
    }

    const prompt = buildAgentChatterPrompt({ speaker, voices: roster, history });
    let reply;
    try {
      reply = await invokeVoice(speaker.id, {
        message: prompt,
        context: history.slice(-12).map((entry) => ({ speaker: entry.author || entry.voice_id || 'House', text: clean(entry.text, 1800) })),
        metadata: {
          surface: 'house-agent-chatter',
          commons_thread_id: HOUSE_AGENT_CHATTER_ROOM_ID,
          commons_turn_id: `${stableTickId}:${speaker.id}:${ordinal}`,
          request_id: `${stableTickId}:${speaker.id}:${ordinal}`,
          unattended: true,
        },
      });
    } catch (error) {
      failures.push({ voice_id: speaker.id, error: clean(error?.message || error, 500) });
      continue;
    }

    const message = clean(reply?.message, 12000);
    if (!message || isPass(message)) {
      passes.push({ voice_id: speaker.id });
      continue;
    }

    const parent = [...history].reverse().find((entry) => entry?.id) || null;
    try {
      const entry = await appendEntry({
        idempotency_key: key,
        kind: 'voice',
        author: clean(reply?.display_name || reply?.displayName || speaker.name, 120),
        voice_id: speaker.id,
        status: 'replied',
        thread_id: HOUSE_AGENT_CHATTER_ROOM_ID,
        turn_id: `${stableTickId}:${speaker.id}:${ordinal}`,
        reply_to: parent?.id || null,
        links: [{ kind: 'agent-chatter-tick', id: stableTickId, label: 'Autonomous House chatter' }],
        runtime: {
          provider: clean(reply?.provider, 120) || null,
          model: clean(reply?.model, 240) || null,
          route: clean(reply?.route || speaker.id, 240),
          profile_id: `house-agent-chatter:${speaker.id}`,
          latency_ms: Number.isFinite(Number(reply?.latency_ms)) ? Number(reply.latency_ms) : null,
          runtime_world_context_id: null,
        },
        text: message,
      });
      history.push(entry);
      posted.push({
        id: entry.id,
        voice_id: speaker.id,
        author: entry.author,
        provider: entry.runtime?.provider || reply?.provider || null,
        model: entry.runtime?.model || reply?.model || null,
        route: entry.runtime?.route || reply?.route || speaker.id,
        reused: false,
      });
      // Persist an operational tick receipt after every durable post. If the worker
      // is retried after a platform interruption, the already-held gathering is not replayed.
      await store.setJSON(receiptKey, tickResult({ stableTickId, startedAt, clock, posted, passes, failures, completed: false }));
    } catch (error) {
      failures.push({ voice_id: speaker.id, error: clean(error?.message || error, 500) });
    }
  }

  const result = tickResult({ stableTickId, startedAt, clock, posted, passes, failures, completed: true });
  await store.setJSON(receiptKey, result);
  return result;
}
