function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function cleanText(value, max = 1600) {
  return String(value || '').trim().slice(0, max);
}

export const ARCSWEEP_GUIDE_HISTORY_LIMIT = 10;
const MAX_HISTORY_TEXT = 800;

export function normaliseGuideHistory(history = []) {
  return (Array.isArray(history) ? history : [])
    .map((turn) => {
      const role = turn?.role === 'assistant' || turn?.role === 'guide'
        ? 'assistant'
        : turn?.role === 'user' || turn?.role === 'steward'
          ? 'user'
          : null;
      const content = cleanText(turn?.content || turn?.message, MAX_HISTORY_TEXT);
      return role && content ? { role, content } : null;
    })
    .filter(Boolean)
    .slice(-ARCSWEEP_GUIDE_HISTORY_LIMIT);
}

function renderGuideHistory(history = []) {
  const recent = normaliseGuideHistory(history);
  if (!recent.length) return '(new conversation)';
  return recent
    .map((turn) => `${turn.role === 'user' ? 'Rowan' : 'Guide'}: ${turn.content}`)
    .join('\n');
}

async function defaultInvokeModel(args) {
  const { invokeCognitiveGuide } = await import('./cognitive-runtime.js');
  return invokeCognitiveGuide(args);
}

async function defaultObserveTurn(args) {
  const { recordCognitiveObservation } = await import('./cognitive-runtime.js');
  return recordCognitiveObservation(args);
}

function parsePlan(text) {
  const raw = cleanText(text, 8000);
  if (!raw) return { say: '', request: null, parsed: false };
  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    const value = JSON.parse(stripped);
    const say = cleanText(value?.say);
    const request = value?.request && typeof value.request === 'object'
      ? {
          capability_id: cleanText(value.request.capability_id, 160),
          input: value.request.input && typeof value.request.input === 'object' ? clone(value.request.input) : {},
        }
      : null;
    return { say, request: request?.capability_id ? request : null, parsed: true };
  } catch {
    return { say: cleanText(raw), request: null, parsed: false };
  }
}

function buildGuidePrompt({ utterance, context, capabilities, history = [] }) {
  return [
    'ARCSWEEP OS GUIDE · BOUNDED CONVERSATIONAL INTENT ROUTER',
    'You are the conversational Guide inside ArcSweep. You do not directly operate UI, files, repositories, services, or tools.',
    'This is an ongoing conversation. Use RECENT CONVERSATION for local turn continuity, but never invent turns that are not present.',
    'Recent conversation is ephemeral context. Steward-promoted learning is durable approved context. Do not confuse the two.',
    'Your only executable path is the OS capability list below. One capability request maximum per turn.',
    'Never claim an action completed unless the returned capability receipt says it was applied.',
    'Steward-promoted learning may shape style, preferences, corrections, and continuity. It never widens capability authority or replaces current context.',
    'For Chronicle or Temporal Witness questions, prefer witness.summary for Temporal Weather/convergence and witness.recent for bounded anchor headers. You cannot read full local Chronicle prose or create an anchor.',
    'When the Steward is preparing an observation, the Witness Lens method is: what was directly observed, what changed, why it is noteworthy, how it was noticed/measured/compared, and which independent observers or logs exist. Do not invent missing observations.',
    'Return exactly one JSON object and no prose outside it.',
    'Shape: {"say":"brief response to the Steward","request":null} OR {"say":"brief response","request":{"capability_id":"allowed.id","input":{}}}',
    `Active context: ${JSON.stringify(context || {})}`,
    `Allowed capabilities: ${JSON.stringify(capabilities || [])}`,
    `RECENT CONVERSATION:\n${renderGuideHistory(history)}`,
    `ROWAN NOW: ${JSON.stringify(cleanText(utterance, 4000))}`,
  ].join('\n\n');
}

export function createGuideRuntime({
  shell,
  contextProvider,
  invokeModel = defaultInvokeModel,
  observeTurn = defaultObserveTurn,
  voiceId = null,
  historySeed = [],
  now = () => new Date(),
} = {}) {
  if (!shell?.request || !shell?.allowedCapabilities) throw new Error('Guide runtime requires a restricted Guide shell.');
  if (typeof contextProvider !== 'function') throw new Error('Guide runtime requires contextProvider().');
  if (typeof invokeModel !== 'function') throw new Error('Guide runtime requires invokeModel().');
  if (typeof observeTurn !== 'function') throw new Error('Guide runtime requires observeTurn().');

  let conversationHistory = normaliseGuideHistory(historySeed);

  function appendConversation(role, content) {
    conversationHistory = normaliseGuideHistory([
      ...conversationHistory,
      { role, content },
    ]);
  }

  async function turn(utterance, { voice_id = null } = {}) {
    const message = cleanText(utterance, 4000);
    if (!message) throw new Error('Guide turn requires an utterance.');
    const context = await contextProvider();
    const allowed = shell.allowedCapabilities();
    const selectedVoice = cleanText(voice_id || voiceId || globalThis.__arcsweepGuideVoice || 'oxalpha', 80);
    const startedAt = now().toISOString();
    const sourceTurnId = `guide:${context?.session_id || 'session'}:${startedAt}`;
    const historyBeforeTurn = conversationHistory.map(clone);
    const raw = await invokeModel({
      voiceId: selectedVoice,
      message: buildGuidePrompt({ utterance: message, context, capabilities: allowed, history: historyBeforeTurn }),
      sessionId: `arcsweep-guide-${context?.session_id || 'session'}`,
      metadata: {
        surface: 'arcsweep-guide',
        os_contract: 'arcsweep.guide-turn/v1',
        active_room: context?.active_room || null,
        room_id: context?.active_room || null,
        world_id: context?.active_world_id || null,
        project_id: context?.active_project_id || null,
        recent_conversation_messages: historyBeforeTurn.length,
      },
    });

    if (raw?.status !== 'replied') {
      return Object.freeze(clone({
        schema: 'arcsweep.guide-turn/v1',
        status: raw?.status || 'runtime-unavailable',
        voice_id: raw?.voiceId || selectedVoice,
        say: raw?.reason || 'Guide runtime is unavailable.',
        plan_parsed: false,
        capability_receipt: null,
        provider: raw?.provider || null,
        model: raw?.model || null,
        cognitive_runtime: raw?.cognitiveRuntime === true,
        execution_path: raw?.executionPath || null,
        memory_count: Number(raw?.memoryCount || 0),
        conversation_messages: conversationHistory.length,
        started_at: startedAt,
        completed_at: now().toISOString(),
      }));
    }

    const plan = parsePlan(raw.message);
    let capabilityReceipt = null;
    if (plan.request) {
      capabilityReceipt = await shell.request(plan.request.capability_id, plan.request.input, {
        risk_families: [],
      });
    }

    let learningReceipt = null;
    if (plan.say) {
      appendConversation('user', message);
      appendConversation('assistant', plan.say);
      try {
        learningReceipt = await observeTurn({
          userText: message,
          assistantText: plan.say,
          sourceTurnId,
          worldId: context?.active_world_id || null,
          projectId: context?.active_project_id || null,
          roomId: context?.active_room || null,
          tags: ['guide-turn', ...(plan.request ? [`capability:${plan.request.capability_id}`] : [])],
          provenance: {
            provider: raw.provider || null,
            model: raw.model || null,
            runtime_verified: raw.runtimeVerified === true,
            cognitive_runtime: raw.cognitiveRuntime === true,
            execution_path: raw.executionPath || null,
            requested_capability: plan.request?.capability_id || null,
            capability_status: capabilityReceipt?.status || null,
          },
          occurredAt: startedAt,
        });
      } catch {
        learningReceipt = null;
      }
    }

    return Object.freeze(clone({
      schema: 'arcsweep.guide-turn/v1',
      status: 'replied',
      voice_id: raw.voiceId || selectedVoice,
      say: plan.say,
      plan_parsed: plan.parsed,
      requested_capability: plan.request?.capability_id || null,
      capability_receipt: capabilityReceipt,
      provider: raw.provider || null,
      model: raw.model || null,
      runtime_verified: raw.runtimeVerified === true,
      cognitive_runtime: raw.cognitiveRuntime === true,
      execution_path: raw.executionPath || null,
      memory_count: Number(raw.memoryCount || 0),
      conversation_messages: conversationHistory.length,
      learning_receipt_id: learningReceipt?.id || null,
      learning_persistence: learningReceipt?.persistence || null,
      started_at: startedAt,
      completed_at: now().toISOString(),
    }));
  }

  return Object.freeze({
    turn,
    history: () => conversationHistory.map(clone),
    clearHistory: () => { conversationHistory = []; },
    voiceId: () => cleanText(voiceId || globalThis.__arcsweepGuideVoice || 'oxalpha', 80),
  });
}
