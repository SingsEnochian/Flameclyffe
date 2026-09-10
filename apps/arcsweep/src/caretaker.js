export const ARCSWEEP_CARETAKER_PLAN_SCHEMA = 'arcsweep.caretaker-plan/v0.1';
export const ARCSWEEP_CARETAKER_RECEIPT_SCHEMA = 'arcsweep.caretaker-receipt/v0.1';
export const ARCSWEEP_CARETAKER_ENDPOINT = '/api/v1/house/caretaker';
export const ARCSWEEP_CARETAKER_ACTIONS = Object.freeze(['navigate']);

const MAX_HISTORY_TURNS = 10;
const MAX_HISTORY_TEXT = 1600;

function text(value) {
  return String(value ?? '').trim();
}

function uniqueRooms(rooms = []) {
  const seen = new Set();
  return (Array.isArray(rooms) ? rooms : []).map((room) => {
    if (typeof room === 'string') return { id: text(room), label: text(room) };
    return { id: text(room?.id), label: text(room?.label || room?.name || room?.id) };
  }).filter((room) => room.id && !seen.has(room.id) && seen.add(room.id));
}

export function normaliseCaretakerHistory(history = []) {
  return Object.freeze((Array.isArray(history) ? history : [])
    .map((turn) => {
      const role = turn?.role === 'assistant' || turn?.role === 'caretaker' ? 'assistant' : turn?.role === 'user' ? 'user' : null;
      const content = text(turn?.content || turn?.message).slice(0, MAX_HISTORY_TEXT);
      return role && content ? Object.freeze({ role, content }) : null;
    })
    .filter(Boolean)
    .slice(-MAX_HISTORY_TURNS));
}

export function buildCaretakerContext({ roomId = 'portal', world = null, availableRooms = [] } = {}) {
  return Object.freeze({
    room_id: text(roomId) || 'portal',
    world: world?.id ? { id: text(world.id), name: text(world.name || world.id) } : null,
    available_rooms: uniqueRooms(availableRooms),
  });
}

export function buildCaretakerPrompt({ message, context, history = [] }) {
  const request = text(message);
  if (!request) throw new Error('Caretaker request is required.');
  const roomList = context.available_rooms.map((room) => `${room.id}: ${room.label}`).join('\n') || '(none supplied)';
  const recentConversation = normaliseCaretakerHistory(history);
  const conversationBlock = recentConversation.length
    ? recentConversation.map((turn) => `${turn.role === 'user' ? 'Rowan' : 'Caretaker'}: ${turn.content}`).join('\n')
    : '(new conversation)';
  return [
    'ARCSWEEP CARETAKER v0.2',
    'You are the house intelligence of ArcSweep. You are not a Flame and you do not speak for any Flame.',
    'Talk naturally with Rowan. This is an ongoing conversation, not a one-shot command form. Use RECENT CONVERSATION for continuity, but never invent earlier turns that are not present.',
    'You may answer questions, orient Rowan inside ArcSweep, explain what is visible, and help decide where to go next. Conversation itself does not grant runtime authority.',
    'Runtime law: language may propose an action; only ArcSweep may execute it. Never claim an action occurred.',
    'This version permits exactly one runtime action type: navigate.',
    'Only choose a target room from AVAILABLE ROOMS. If no navigation is requested, return no actions and simply reply conversationally.',
    'Return JSON only with this exact shape:',
    `{"schema":"${ARCSWEEP_CARETAKER_PLAN_SCHEMA}","reply":"natural conversational response","actions":[{"type":"navigate","target":"room-id"}]}`,
    `Current room: ${context.room_id}`,
    `Current world: ${context.world ? `${context.world.name} (${context.world.id})` : 'unassigned'}`,
    `AVAILABLE ROOMS:\n${roomList}`,
    `RECENT CONVERSATION:\n${conversationBlock}`,
    `ROWAN NOW:\n${request}`,
  ].join('\n\n');
}

function jsonCandidate(raw) {
  const source = text(raw);
  if (!source) throw new Error('Caretaker returned an empty plan.');
  const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  if (fenced) return fenced.trim();
  const first = source.indexOf('{');
  const last = source.lastIndexOf('}');
  return first >= 0 && last > first ? source.slice(first, last + 1) : source;
}

export function normaliseCaretakerPlan(value, { availableRooms = [] } = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Caretaker plan must be an object.');
  if (value.schema !== ARCSWEEP_CARETAKER_PLAN_SCHEMA) throw new Error(`Caretaker plan schema must be ${ARCSWEEP_CARETAKER_PLAN_SCHEMA}.`);
  const allowedRooms = new Set(uniqueRooms(availableRooms).map((room) => room.id));
  const inputActions = Array.isArray(value.actions) ? value.actions : [];
  if (inputActions.length > 4) throw new Error('Caretaker v0.1 permits at most four navigation actions per plan.');
  const actions = inputActions.map((action, index) => {
    if (!action || typeof action !== 'object' || Array.isArray(action)) throw new Error(`Caretaker action ${index + 1} must be an object.`);
    const type = text(action.type);
    if (!ARCSWEEP_CARETAKER_ACTIONS.includes(type)) throw new Error(`Caretaker action type is not permitted: ${type || '(empty)'}.`);
    const target = text(action.target);
    if (!target) throw new Error(`Caretaker navigation action ${index + 1} requires a target.`);
    if (allowedRooms.size && !allowedRooms.has(target)) throw new Error(`Caretaker navigation target is not in the supplied room registry: ${target}.`);
    return Object.freeze({ type, target });
  });
  return Object.freeze({
    schema: ARCSWEEP_CARETAKER_PLAN_SCHEMA,
    reply: text(value.reply),
    actions: Object.freeze(actions),
  });
}

export function parseCaretakerPlan(raw, options = {}) {
  let value;
  try { value = JSON.parse(jsonCandidate(raw)); }
  catch { throw new Error('Caretaker response did not contain valid JSON.'); }
  return normaliseCaretakerPlan(value, options);
}

function appliedResult(value) {
  return value === true || value?.ok === true || value?.status === 'applied' || value?.status === 'navigated';
}

export async function executeCaretakerPlan(plan, { navigate } = {}) {
  if (!plan?.actions) throw new Error('Caretaker plan is required.');
  if (typeof navigate !== 'function' && plan.actions.some((action) => action.type === 'navigate')) {
    throw new Error('Caretaker navigation adapter is required.');
  }
  const results = [];
  for (const action of plan.actions) {
    try {
      const output = await navigate(action.target);
      results.push(Object.freeze({
        action,
        status: appliedResult(output) ? 'applied' : 'rejected',
        detail: output && typeof output === 'object' ? structuredClone(output) : output ?? null,
      }));
    } catch (error) {
      results.push(Object.freeze({ action, status: 'error', error: error?.message || String(error) }));
    }
  }
  return Object.freeze(results);
}

export function caretakerExecutionStatus(results = []) {
  if (!results.length) return 'no-action';
  if (results.every((item) => item.status === 'applied')) return 'applied';
  if (results.some((item) => item.status === 'applied')) return 'partial';
  if (results.some((item) => item.status === 'error')) return 'error';
  return 'rejected';
}

export async function invokeCaretaker({
  message,
  history = [],
  roomId = 'portal',
  world = null,
  availableRooms = [],
  navigate,
  token = null,
  endpoint = ARCSWEEP_CARETAKER_ENDPOINT,
  fetchImpl = fetch,
  now = () => new Date().toISOString(),
} = {}) {
  const context = buildCaretakerContext({ roomId, world, availableRooms });
  const prompt = buildCaretakerPrompt({ message, context, history });
  const requestedAt = now();
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      ...(token && token !== 'cookie-session' ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message: prompt, context }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Caretaker route failed (${response.status}).`);
  const plan = parseCaretakerPlan(body.message, { availableRooms: context.available_rooms });
  const results = await executeCaretakerPlan(plan, { navigate });
  return Object.freeze({
    schema: ARCSWEEP_CARETAKER_RECEIPT_SCHEMA,
    receipt_id: body.receipt_id || null,
    status: caretakerExecutionStatus(results),
    requested_at: requestedAt,
    completed_at: now(),
    request: text(message),
    room_before: context.room_id,
    world: context.world,
    provider: body.provider || null,
    model: body.model || null,
    route: endpoint,
    plan,
    action_results: results,
    persistence: body.runtime_braid?.verified === true ? 'runtime-braid-verified' : 'not-yet-durable',
    runtime_braid: body.runtime_braid || null,
  });
}
