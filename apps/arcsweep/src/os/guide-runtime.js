function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function cleanText(value, max = 1600) {
  return String(value || '').trim().slice(0, max);
}

async function defaultInvokeModel(args) {
  const { invokeConstellationRuntimeVoice } = await import('../constellation-runtime-adapter.js');
  return invokeConstellationRuntimeVoice(args);
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

function buildGuidePrompt({ utterance, context, capabilities }) {
  return [
    'ARCSWEEP OS GUIDE · BOUNDED INTENT ROUTER',
    'You are the conversational Guide inside ArcSweep. You do not directly operate UI, files, repositories, services, or tools.',
    'Your only executable path is the OS capability list below. One capability request maximum per turn.',
    'Never claim an action completed unless the returned capability receipt says it was applied.',
    'Return exactly one JSON object and no prose outside it.',
    'Shape: {"say":"brief response to the Steward","request":null} OR {"say":"brief response","request":{"capability_id":"allowed.id","input":{}}}',
    `Active context: ${JSON.stringify(context || {})}`,
    `Allowed capabilities: ${JSON.stringify(capabilities || [])}`,
    `Steward utterance: ${JSON.stringify(cleanText(utterance, 4000))}`,
  ].join('\n\n');
}

export function createGuideRuntime({
  shell,
  contextProvider,
  invokeModel = defaultInvokeModel,
  voiceId = null,
  now = () => new Date(),
} = {}) {
  if (!shell?.request || !shell?.allowedCapabilities) throw new Error('Guide runtime requires a restricted Guide shell.');
  if (typeof contextProvider !== 'function') throw new Error('Guide runtime requires contextProvider().');
  if (typeof invokeModel !== 'function') throw new Error('Guide runtime requires invokeModel().');

  async function turn(utterance, { voice_id = null } = {}) {
    const message = cleanText(utterance, 4000);
    if (!message) throw new Error('Guide turn requires an utterance.');
    const context = await contextProvider();
    const allowed = shell.allowedCapabilities();
    const selectedVoice = cleanText(voice_id || voiceId || globalThis.__arcsweepGuideVoice || 'oxalpha', 80);
    const startedAt = now().toISOString();
    const raw = await invokeModel({
      voiceId: selectedVoice,
      message: buildGuidePrompt({ utterance: message, context, capabilities: allowed }),
      sessionId: `arcsweep-guide-${context?.session_id || 'session'}`,
      metadata: {
        surface: 'arcsweep-guide',
        os_contract: 'arcsweep.guide-turn/v1',
        active_room: context?.active_room || null,
        world_id: context?.active_world_id || null,
        project_id: context?.active_project_id || null,
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
      started_at: startedAt,
      completed_at: now().toISOString(),
    }));
  }

  return Object.freeze({
    turn,
    voiceId: () => cleanText(voiceId || globalThis.__arcsweepGuideVoice || 'oxalpha', 80),
  });
}
