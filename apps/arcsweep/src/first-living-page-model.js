export const FIRST_LIVING_PAGE_SCHEMA = 'arcsweep.first-living-page/v0.1';
export const FIRST_LIVING_PAGE_TRANSITION_SCHEMA = 'arcsweep.continuity-transition/v0.1';
export const FIRST_LIVING_PAGE_STORAGE_KEY = 'hearthgate.arcsweep.first-living-page.v0.1';
export const DEFAULT_INHABITANT_CONTINUITY_ID = 'rowan:rarity';
export const DEFAULT_INHABITANT_NAME = 'Rarity';

const MAX_LINEAGE = 96;
const MAX_THREAD = 24;

function text(value, max = 2000) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function boundedArray(value, limit) {
  return (Array.isArray(value) ? value : []).map(clone).slice(-limit);
}

function eventId(kind, at) {
  return `living-page:${text(kind, 80) || 'event'}:${at}:${Math.random().toString(36).slice(2, 9)}`;
}

function normaliseReceiver(input = {}) {
  return Object.freeze({
    provider: text(input.provider, 160) || null,
    model: text(input.model, 240) || null,
    voice_id: text(input.voice_id || input.voiceId, 120) || null,
    runtime_verified: input.runtime_verified === true || input.runtimeVerified === true,
    execution_path: text(input.execution_path || input.executionPath, 240) || null,
  });
}

function normaliseMessage(input = {}) {
  const role = input.role === 'assistant' || input.role === 'inhabitant'
    ? 'assistant'
    : input.role === 'system'
      ? 'system'
      : 'user';
  return Object.freeze({
    message_id: text(input.message_id || input.id, 240) || null,
    role,
    content: text(input.content || input.message, 4000),
    actor_id: text(input.actor_id, 240) || (role === 'assistant' ? DEFAULT_INHABITANT_CONTINUITY_ID : 'rowan'),
    receiver: role === 'assistant' ? normaliseReceiver(input.receiver || {}) : null,
    occurred_at: input.occurred_at || input.at || null,
  });
}

function snapshotForLineage(state) {
  return Object.freeze({
    world_id: state.world_id,
    room_id: state.room_id,
    visits: state.visits,
    ui_active: state.ui_active,
    lantern: clone(state.lantern),
    inhabitant: {
      continuity_id: state.inhabitant.continuity_id,
      display_name: state.inhabitant.display_name,
      receiver: clone(state.inhabitant.receiver),
      last_spoke_at: state.inhabitant.last_spoke_at,
    },
    thread_count: state.thread.length,
    last_glyph: clone(state.last_glyph),
  });
}

export function normaliseFirstLivingPageState(input = {}) {
  const inhabitantInput = input.inhabitant && typeof input.inhabitant === 'object' ? input.inhabitant : {};
  const lanternInput = input.lantern && typeof input.lantern === 'object' ? input.lantern : {};
  const state = {
    schema: FIRST_LIVING_PAGE_SCHEMA,
    version: '0.1',
    page_id: 'first-living-page',
    steward_id: text(input.steward_id, 240) || 'rowan',
    world_id: text(input.world_id, 240) || null,
    room_id: text(input.room_id, 240) || 'portal',
    ui_active: input.ui_active === true,
    visits: Math.max(0, Number(input.visits) || 0),
    last_opened_at: input.last_opened_at || null,
    inhabitant: {
      continuity_id: text(inhabitantInput.continuity_id, 240) || DEFAULT_INHABITANT_CONTINUITY_ID,
      display_name: text(inhabitantInput.display_name, 160) || DEFAULT_INHABITANT_NAME,
      receiver: normaliseReceiver(inhabitantInput.receiver || {}),
      last_spoke_at: inhabitantInput.last_spoke_at || null,
      last_say: text(inhabitantInput.last_say, 4000) || null,
    },
    lantern: {
      state: lanternInput.state === 'lit' ? 'lit' : 'banked',
      touch_count: Math.max(0, Number(lanternInput.touch_count) || 0),
      changed_at: lanternInput.changed_at || null,
    },
    last_glyph: input.last_glyph && typeof input.last_glyph === 'object'
      ? {
          id: text(input.last_glyph.id, 240) || null,
          name: text(input.last_glyph.name, 240) || null,
          character: text(input.last_glyph.character, 32) || null,
          stroke_count: Math.max(0, Number(input.last_glyph.stroke_count) || 0),
          imprinted_at: input.last_glyph.imprinted_at || null,
        }
      : null,
    thread: boundedArray(input.thread, MAX_THREAD).map(normaliseMessage),
    lineage: boundedArray(input.lineage, MAX_LINEAGE),
  };
  return Object.freeze(clone(state));
}

function transition(stateInput, {
  kind,
  actorId = 'rowan',
  detail = {},
  at = new Date().toISOString(),
  mutate = () => {},
} = {}) {
  const state = normaliseFirstLivingPageState(stateInput);
  const before = snapshotForLineage(state);
  const draft = clone(state);
  mutate(draft);
  const provisional = normaliseFirstLivingPageState(draft);
  const parent = state.lineage[state.lineage.length - 1] || null;
  const event = Object.freeze({
    schema: FIRST_LIVING_PAGE_TRANSITION_SCHEMA,
    event_id: eventId(kind, at),
    parent_event_id: parent?.event_id || null,
    page_id: state.page_id,
    kind: text(kind, 120) || 'state-change',
    actor_id: text(actorId, 240) || 'unknown',
    occurred_at: at,
    before,
    after: snapshotForLineage(provisional),
    detail: Object.freeze(clone(detail || {})),
  });
  return normaliseFirstLivingPageState({
    ...provisional,
    lineage: [...state.lineage, event].slice(-MAX_LINEAGE),
  });
}

export function openFirstLivingPage(state, {
  worldId = null,
  roomId = 'portal',
  at = new Date().toISOString(),
} = {}) {
  return transition(state, {
    kind: 'page-enter',
    actorId: 'rowan',
    at,
    detail: { world_id: text(worldId, 240) || null, room_id: text(roomId, 240) || 'portal' },
    mutate(draft) {
      draft.world_id = text(worldId, 240) || draft.world_id || null;
      draft.room_id = text(roomId, 240) || draft.room_id || 'portal';
      draft.ui_active = true;
      draft.visits = Math.max(0, Number(draft.visits) || 0) + 1;
      draft.last_opened_at = at;
    },
  });
}

export function leaveFirstLivingPage(state, {
  actorId = 'rowan',
  reason = 'native-page-selected',
  at = new Date().toISOString(),
} = {}) {
  if (!normaliseFirstLivingPageState(state).ui_active) return normaliseFirstLivingPageState(state);
  return transition(state, {
    kind: 'page-leave',
    actorId,
    at,
    detail: { reason: text(reason, 240) || 'native-page-selected' },
    mutate(draft) { draft.ui_active = false; },
  });
}

export function toggleLivingLantern(state, {
  actorId = 'rowan',
  at = new Date().toISOString(),
} = {}) {
  const current = normaliseFirstLivingPageState(state);
  const next = current.lantern.state === 'lit' ? 'banked' : 'lit';
  return transition(current, {
    kind: 'lantern-touch',
    actorId,
    at,
    detail: { from: current.lantern.state, to: next },
    mutate(draft) {
      draft.lantern = {
        state: next,
        touch_count: Math.max(0, Number(draft.lantern?.touch_count) || 0) + 1,
        changed_at: at,
      };
    },
  });
}

export function recordLivingPageTurn(state, {
  role,
  content,
  actorId = null,
  receiver = null,
  at = new Date().toISOString(),
} = {}) {
  const message = normaliseMessage({
    role,
    content,
    actor_id: actorId || (role === 'assistant' ? DEFAULT_INHABITANT_CONTINUITY_ID : 'rowan'),
    receiver: receiver || {},
    occurred_at: at,
    message_id: `living-message:${at}:${Math.random().toString(36).slice(2, 9)}`,
  });
  if (!message.content) return normaliseFirstLivingPageState(state);
  return transition(state, {
    kind: message.role === 'assistant' ? 'inhabitant-turn' : message.role === 'system' ? 'system-note' : 'steward-turn',
    actorId: message.actor_id,
    at,
    detail: {
      role: message.role,
      message_id: message.message_id,
      receiver: message.receiver,
    },
    mutate(draft) {
      draft.thread = [...boundedArray(draft.thread, MAX_THREAD - 1), message];
      if (message.role === 'assistant') {
        draft.inhabitant.receiver = clone(message.receiver);
        draft.inhabitant.last_spoke_at = at;
        draft.inhabitant.last_say = message.content;
      }
    },
  });
}

export function imprintLivingGlyph(state, {
  glyph = null,
  actorId = 'rowan',
  at = new Date().toISOString(),
} = {}) {
  const imprint = glyph && typeof glyph === 'object' ? {
    id: text(glyph.id, 240) || null,
    name: text(glyph.name, 240) || null,
    character: text(glyph.character, 32) || null,
    stroke_count: Math.max(0, Number(glyph.stroke_count ?? glyph.strokeCount) || 0),
    imprinted_at: at,
  } : null;
  if (!imprint?.id && !imprint?.name && !imprint?.character) return normaliseFirstLivingPageState(state);
  return transition(state, {
    kind: 'glyph-imprint',
    actorId,
    at,
    detail: { glyph: imprint },
    mutate(draft) { draft.last_glyph = imprint; },
  });
}

export function firstLivingPageContext(stateInput) {
  const state = normaliseFirstLivingPageState(stateInput);
  const lastEvents = state.lineage.slice(-6).map((event) => ({
    kind: event.kind,
    actor_id: event.actor_id,
    occurred_at: event.occurred_at,
    detail: clone(event.detail || {}),
  }));
  const thread = state.thread.slice(-8).map((message) => ({
    role: message.role,
    actor_id: message.actor_id,
    content: message.content,
    occurred_at: message.occurred_at,
  }));
  return Object.freeze({
    schema: 'arcsweep.first-living-page-context/v0.1',
    page_id: state.page_id,
    world_id: state.world_id,
    room_id: state.room_id,
    visits: state.visits,
    lantern: clone(state.lantern),
    inhabitant: {
      continuity_id: state.inhabitant.continuity_id,
      display_name: state.inhabitant.display_name,
      receiver: clone(state.inhabitant.receiver),
      last_spoke_at: state.inhabitant.last_spoke_at,
    },
    last_glyph: clone(state.last_glyph),
    recent_lineage: lastEvents,
    recent_thread: thread,
  });
}
