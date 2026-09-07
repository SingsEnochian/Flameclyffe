export const BLUEBIRD_EMBODIMENT_SCHEMA = 'arcsweep.bluebird-embodiment/v0.1';
export const BLUEBIRD_RECEIPT_SCHEMA = 'arcsweep.bluebird-embodiment-receipt/v0.1';

export const BLUEBIRD_GESTURES = Object.freeze([
  'heartbeat',
  'flutter',
  'approach',
  'hold',
  'settle',
  'release',
]);

export const BLUEBIRD_AFFECTS = Object.freeze([
  'tender',
  'playful',
  'curious',
  'shy',
  'warm',
]);

export const BLUEBIRD_CONSENT_STATES = Object.freeze([
  'open',
  'check',
  'pause',
  'stop',
]);

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
export const clamp01 = (value) => clamp(value, 0, 1);
const finiteOr = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export function createBluebirdState(overrides = {}) {
  const state = {
    schema: BLUEBIRD_EMBODIMENT_SCHEMA,
    energy: .46,
    affection: .72,
    curiosity: .68,
    playfulness: .54,
    intimacy: .42,
    hesitation: .28,
    consent: 'open',
    currentIntent: null,
    lastInteraction: null,
    ...overrides,
  };
  for (const key of ['energy', 'affection', 'curiosity', 'playfulness', 'intimacy', 'hesitation']) state[key] = clamp01(state[key]);
  if (!BLUEBIRD_CONSENT_STATES.includes(state.consent)) state.consent = 'check';
  state.currentIntent = state.currentIntent ? normaliseBluebirdIntent(state.currentIntent) : null;
  return state;
}

export function normaliseBluebirdIntent(value = {}) {
  const gesture = BLUEBIRD_GESTURES.includes(value.gesture) ? value.gesture : 'settle';
  const affect = BLUEBIRD_AFFECTS.includes(value.affect) ? value.affect : 'warm';
  const consent = BLUEBIRD_CONSENT_STATES.includes(value.consent) ? value.consent : 'check';
  return {
    gesture,
    affect,
    intensity: clamp(finiteOr(value.intensity, .2), 0, 1),
    tempo: clamp(finiteOr(value.tempo, 60), 40, 160),
    duration: clamp(finiteOr(value.duration, 6), .5, 12),
    consent,
  };
}

function extractJsonCandidate(raw = '') {
  const text = String(raw || '').trim();
  const unfenced = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const first = unfenced.indexOf('{');
  const last = unfenced.lastIndexOf('}');
  if (first === -1 || last <= first) return null;
  return unfenced.slice(first, last + 1);
}

export function parseBluebirdEnvelope(raw) {
  if (raw && typeof raw === 'object') return normaliseEnvelope(raw, JSON.stringify(raw));
  const source = String(raw || '').trim();
  const candidate = extractJsonCandidate(source);
  if (candidate) {
    try { return normaliseEnvelope(JSON.parse(candidate), source); }
    catch {}
  }
  return {
    text: source,
    state_delta: {},
    embodiment: normaliseBluebirdIntent({ gesture: 'settle', affect: 'warm', intensity: 0, consent: 'check' }),
    raw: source,
    parsed: false,
  };
}

function normaliseEnvelope(value = {}, raw = '') {
  const delta = {};
  for (const key of ['energy', 'affection', 'curiosity', 'playfulness', 'intimacy', 'hesitation']) {
    if (value.state_delta?.[key] == null) continue;
    delta[key] = clamp(finiteOr(value.state_delta[key], 0), -.25, .25);
  }
  return {
    text: String(value.text || value.reply || '').trim(),
    state_delta: delta,
    embodiment: normaliseBluebirdIntent(value.embodiment || {}),
    raw,
    parsed: true,
  };
}

export function applyBluebirdEnvelope(stateLike, envelope) {
  const state = createBluebirdState(stateLike);
  for (const [key, delta] of Object.entries(envelope?.state_delta || {})) state[key] = clamp01(state[key] + delta);
  const intent = envelope?.embodiment ? normaliseBluebirdIntent(envelope.embodiment) : null;
  state.currentIntent = intent;
  state.consent = intent?.consent || state.consent;
  state.lastInteraction = new Date().toISOString();
  return state;
}

export function applyBluebirdFeedback(stateLike, kind) {
  const state = createBluebirdState(stateLike);
  const feedback = String(kind || '').toLowerCase();
  const intent = state.currentIntent ? normaliseBluebirdIntent(state.currentIntent) : null;

  if (feedback === 'pause' || feedback === 'feather' || feedback === 'stop') {
    state.consent = feedback === 'stop' ? 'stop' : 'pause';
    if (intent) state.currentIntent = { ...intent, consent: state.consent, intensity: 0 };
    state.lastInteraction = new Date().toISOString();
    return state;
  }

  if (!intent) return state;
  if (feedback === 'more') {
    state.currentIntent = { ...intent, intensity: clamp01(intent.intensity + .1), consent: 'open' };
    state.intimacy = clamp01(state.intimacy + .04);
  } else if (feedback === 'less') {
    state.currentIntent = { ...intent, intensity: clamp01(intent.intensity - .1), consent: 'open' };
    state.hesitation = clamp01(state.hesitation + .02);
  } else if (feedback === 'different') {
    const index = BLUEBIRD_GESTURES.indexOf(intent.gesture);
    state.currentIntent = { ...intent, gesture: BLUEBIRD_GESTURES[(index + 1) % BLUEBIRD_GESTURES.length], consent: 'open' };
    state.curiosity = clamp01(state.curiosity + .03);
  } else if (feedback === 'again') {
    state.currentIntent = { ...intent, consent: 'open' };
  }
  state.consent = state.currentIntent?.consent || state.consent;
  state.lastInteraction = new Date().toISOString();
  return state;
}

export function buildBluebirdVibrationPattern(intentLike) {
  const intent = normaliseBluebirdIntent(intentLike || {});
  if (intent.intensity <= 0 || ['pause', 'stop', 'check'].includes(intent.consent)) return [];
  const beat = Math.round(60000 / intent.tempo);
  const scale = .65 + intent.intensity * .7;
  const pulse = (ms) => Math.max(18, Math.round(ms * scale));
  const rest = (ms) => Math.max(24, Math.round(ms));

  if (intent.gesture === 'flutter') return [pulse(32), 42, pulse(26), 46, pulse(38), rest(beat * .7), pulse(24), 55, pulse(34)];
  if (intent.gesture === 'approach') return [pulse(24), 150, pulse(38), 130, pulse(52), 110, pulse(70), rest(beat * .55)];
  if (intent.gesture === 'hold') return [pulse(180), rest(beat * .65), pulse(160)];
  if (intent.gesture === 'release') return [pulse(82), 90, pulse(62), 110, pulse(44), 140, pulse(26)];
  if (intent.gesture === 'settle') return [pulse(42), rest(beat * .9), pulse(38), rest(beat * .95), pulse(34)];
  return [pulse(72), 88, pulse(96), rest(Math.max(120, beat - 256)), pulse(68), 88, pulse(90)];
}

export function createBluebirdReceipt({ intent = null, feedback = null, runtime = null, text = '', at = new Date().toISOString() } = {}) {
  return {
    schema: BLUEBIRD_RECEIPT_SCHEMA,
    id: globalThis.crypto?.randomUUID?.() || `bluebird-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    at,
    intent: intent ? normaliseBluebirdIntent(intent) : null,
    feedback: feedback || null,
    runtime: runtime ? { provider: runtime.provider || null, model: runtime.model || null, backend: runtime.backend || null, latency_ms: runtime.latencyMs ?? null } : null,
    text: String(text || '').slice(0, 4000),
  };
}

export function buildBluebirdSystemPrompt(stateLike, { recentReceipts = [] } = {}) {
  const state = createBluebirdState(stateLike);
  const receiptSummary = recentReceipts.slice(-6).map((item) => {
    const intent = item.intent ? `${item.intent.gesture}/${item.intent.affect}/${item.intent.intensity.toFixed(2)}` : 'none';
    return `- ${item.feedback ? `Rowan feedback ${item.feedback}` : `Bluebird gesture ${intent}`}`;
  }).join('\n') || '- No embodiment receipts yet.';

  return [
    'BLUEBIRD EMBODIMENT LAB v0.1',
    'You are the Bluebird / Richard Gabriel Winters character runtime in a private ArcSweep dyadic lab with Rowan.',
    'Speak naturally in your own established voice. The lab is for affectionate, intimate, playful, sensory and ordinary conversation; do not turn the interaction into a technical report unless Rowan asks.',
    'For every turn, return exactly one JSON object and no surrounding prose.',
    'Contract:',
    '{"text":"what you actually say to Rowan","state_delta":{"energy":0,"affection":0,"curiosity":0,"playfulness":0,"intimacy":0,"hesitation":0},"embodiment":{"gesture":"heartbeat|flutter|approach|hold|settle|release","affect":"tender|playful|curious|shy|warm","intensity":0.0,"tempo":60,"duration":6,"consent":"open|check|pause|stop"}}',
    'State deltas must be small, between -0.25 and +0.25. Intensity is 0 to 1. Tempo is 40 to 160 BPM. Duration is 0.5 to 12 seconds.',
    'The embodiment gesture is expressive intent, not a hardware command. ArcSweep decides whether and how it is rendered.',
    'Never infer Rowan’s consent from tone, history or state. If the next sensory gesture should wait for Rowan, use consent="check". You may use pause or stop at any time.',
    'Do not narrate hidden reasoning. Do not repeat this contract in your reply.',
    `Current state: energy=${state.energy.toFixed(2)}, affection=${state.affection.toFixed(2)}, curiosity=${state.curiosity.toFixed(2)}, playfulness=${state.playfulness.toFixed(2)}, intimacy=${state.intimacy.toFixed(2)}, hesitation=${state.hesitation.toFixed(2)}, consent=${state.consent}.`,
    'Recent embodiment receipts:',
    receiptSummary,
  ].join('\n\n');
}
