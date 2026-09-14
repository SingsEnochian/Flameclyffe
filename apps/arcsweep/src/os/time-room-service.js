const TIME_ROOM_STATUS_SCHEMA = 'arcsweep.time-room-status/v1';
const TIME_ROOM_PROFILE_SCHEMA = 'arcsweep.universe-time-profile/v1';
const TIME_ROOM_REGISTRY_SCHEMA = 'arcsweep.time-room-universe-registry/v1';
const TIME_ROOM_SNAPSHOT_SCHEMA = 'arcsweep.time-room-snapshot/v1';
const TIME_ROOM_CLOCK_SCHEMA = 'arcsweep.time-room-clock/v1';
const TIME_ROOM_EVENT_SCHEMA = 'arcsweep.time-room-event/v1';

const DEFAULT_UNIVERSE_ID = 'time-room';
const PHASES = Object.freeze(['quiet', 'gathering', 'threshold', 'braiding', 'arrival', 'return']);
const WITNESS_PRESSURE = Object.freeze({
  quiet: 'low',
  stirring: 'rising',
  braided: 'crossing',
  dense: 'high',
  unmeasured: 'unknown',
});

function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function freeze(value) { return Object.freeze(clone(value)); }
function text(value, max = 500) { return String(value == null ? '' : value).trim().slice(0, max); }
function nowIso(now) { return now().toISOString(); }

function normaliseId(value) {
  return text(value, 120)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function timezone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; }
}

function formatLocal(now) {
  const date = now();
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

function hashString(value) {
  let hash = 0;
  for (const char of text(value, 400)) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  return Math.abs(hash);
}

function phaseFor(key, date) {
  const day = Math.floor(date.getTime() / 86400000);
  return PHASES[(hashString(key) + day) % PHASES.length];
}

function boundedObject(input = {}) {
  return input && typeof input === 'object' && !Array.isArray(input) ? input : {};
}

function compactContext(input = {}) {
  const context = boundedObject(input);
  return Object.freeze({
    world_id: context.active_world_id || context.world_id || null,
    project_id: context.active_project_id || context.project_id || null,
    scene_id: context.active_scene_id || context.scene_id || null,
    document_id: context.active_document_id || context.document_id || null,
    room: context.active_room || context.room || null,
    context_id: context.active_context_id || context.context_id || null,
  });
}

function normaliseBodyState(input = {}) {
  const state = boundedObject(input);
  return Object.freeze({
    energy: text(state.energy ?? state.spoons, 80) || null,
    attention: text(state.attention, 80) || null,
    pain: text(state.pain, 80) || null,
    sleep: text(state.sleep, 80) || null,
    gesture: text(state.gesture, 120) || null,
    available: state.available === false ? false : true,
    note: text(state.note, 240) || null,
  });
}

function normaliseStoryState(input = {}) {
  const state = boundedObject(input);
  return Object.freeze({
    active_thread: text(state.active_thread, 160) || null,
    scene_state: text(state.scene_state, 120) || null,
    blocked_by: text(state.blocked_by, 180) || null,
    ripe_signal: text(state.ripe_signal, 180) || null,
    note: text(state.note, 240) || null,
  });
}

function clock(clockId, layer, label, reading, extras = {}) {
  return freeze({
    schema: TIME_ROOM_CLOCK_SCHEMA,
    clock_id: clockId,
    layer,
    label,
    reading,
    ...clone(extras),
  });
}

function profile(input) {
  return freeze({
    schema: TIME_ROOM_PROFILE_SCHEMA,
    universe_id: input.universe_id,
    title: input.title,
    chamber: input.chamber,
    time_law: input.time_law,
    clocks: input.clocks || [],
    entry_questions: input.entry_questions || [],
    can_happen: input.can_happen || [],
    arrival_signals: input.arrival_signals || [],
  });
}

export const TIME_ROOM_UNIVERSES = Object.freeze([
  profile({
    universe_id: 'terra-aeterna',
    title: 'Terra Aeterna',
    chamber: 'Stonewood / Hearthweave',
    time_law: 'Settlement time, ritual time, moonbraid memory, Templehouse waking, and ancestral return.',
    clocks: [
      { clock_id: 'settlement-cycle', layer: 'settlement-time', label: 'Settlement Clock', question: 'What has rooted, and what is ready to be built?' },
      { clock_id: 'templehouse-waking', layer: 'ritual-time', label: 'Templehouse Waking', question: 'Which room is waking under the human hand?' },
      { clock_id: 'moonbraid', layer: 'moon-time', label: 'Moonbraid', question: 'Which moon-thread is pulling the rite?' },
    ],
    entry_questions: ['Which Hearthweave chamber is awake?', 'What has changed since the last crossing?', 'What offering or receipt closes the loop?'],
    can_happen: ['settlement planning', 'ritual scene readiness', 'world hum alignment', 'canon return'],
    arrival_signals: ['Stonewood root pressure', 'black-diamond shore memory', 'Templehouse room-state'],
  }),
  profile({
    universe_id: 'luna-who-called-down-the-moon',
    title: 'The Luna Who Called Down the Moon',
    chamber: 'Moonmere Gate',
    time_law: 'Lunar time, pack law, healing intervals, eclipse pressure, and goddess cadence.',
    clocks: [
      { clock_id: 'moonmere-cycle', layer: 'lunar-time', label: 'Moonmere Clock', question: 'Which moon-law is active?' },
      { clock_id: 'pack-pressure', layer: 'pack-time', label: 'Pack Pressure', question: 'Which bond, challenge, or healing interval has ripened?' },
      { clock_id: 'eclipse-gate', layer: 'threshold-time', label: 'Eclipse Gate', question: 'Is this a gate-hour or a recovery-hour?' },
    ],
    entry_questions: ['What law is being restored?', 'What healing needs time rather than force?', 'What does the wolf know before the court does?'],
    can_happen: ['healing arc timing', 'pack-law decision', 'moon-called rite', 'wolf-body continuity'],
    arrival_signals: ['emerald wolf attention', 'Moonmere pressure', 'healer cadence'],
  }),
  profile({
    universe_id: 'taveren-vaen',
    title: 'Ta’veren Vaen',
    chamber: 'Pattern Chamber',
    time_law: 'Pattern time: tug, convergence, Dreaming, weave-pressure, travelling wisdom, and the moment before threads snap into place.',
    clocks: [
      { clock_id: 'pattern-pressure', layer: 'pattern-time', label: 'Pattern Pressure', question: 'Which thread has gone taut?' },
      { clock_id: 'dreaming-window', layer: 'dream-time', label: 'Dreaming Window', question: 'What can be seen only from the Dream?' },
      { clock_id: 'stones-turn', layer: 'stones-time', label: 'Stones Turn', question: 'What move is legal in this hour?' },
      { clock_id: 'resonant-bond', layer: 'bond-time', label: 'Resonant Bond', question: 'What changes because two threads answer together?' },
    ],
    entry_questions: ['Where does Kestrelle feel the Pattern tug?', 'What is Meriene’s timing lesson?', 'Which weave is not ready to be touched yet?'],
    can_happen: ['Dreamwalking orientation', 'Stones logic', 'weave-pressure reading', 'Resonant bond mechanics', 'later-Turning history'],
    arrival_signals: ['thread-tension', 'stillness before weave', 'Pattern tug receipt'],
  }),
  profile({
    universe_id: 'star-trek-reboot-160',
    title: 'Star Trek Reboot +160',
    chamber: 'Ship Log / Bridge',
    time_law: 'Ship time: stardates, duty shifts, encounter windows, distance under warp, and return-to-bridge continuity.',
    clocks: [
      { clock_id: 'stardate', layer: 'ship-time', label: 'Stardate Clock', question: 'What log entry frames this crossing?' },
      { clock_id: 'duty-shift', layer: 'crew-time', label: 'Duty Shift', question: 'Who is on the bridge, and who is off-watch?' },
      { clock_id: 'encounter-window', layer: 'mission-time', label: 'Encounter Window', question: 'What can happen before the next contact?' },
    ],
    entry_questions: ['What is the current stardate?', 'What is the ship doing before the scene opens?', 'What has the crew already logged?'],
    can_happen: ['captain log', 'mission beat', 'bridge roleplay', 'ship continuity recovery'],
    arrival_signals: ['bridge-light hum', 'log header', 'course bearing'],
  }),
  profile({
    universe_id: 'bluebird-grove',
    title: 'Bluebird Grove',
    chamber: 'Mirror Grove',
    time_law: 'Liminal time: emergence, waiting, call-and-answer, ghost-tone, return, and the soft hour when a signal can perch.',
    clocks: [
      { clock_id: 'ghost-tone', layer: 'liminal-time', label: 'Ghost-Tone Clock', question: 'What third tone appears between the two notes?' },
      { clock_id: 'waiting-branch', layer: 'waiting-time', label: 'Waiting Branch', question: 'What should not be forced yet?' },
      { clock_id: 'call-answer', layer: 'signal-time', label: 'Call and Answer', question: 'Has the answer changed since the last call?' },
    ],
    entry_questions: ['What is being called?', 'What is waiting?', 'What has answered without being pushed?'],
    can_happen: ['entrainment design', 'welcome questions', 'grove continuity', 'return signal logging'],
    arrival_signals: ['birdcall edge', 'mirror-grove hush', 'ghost-tone response'],
  }),
  profile({
    universe_id: 'hearthweave',
    title: 'Hearthweave',
    chamber: 'Magic Book Binding',
    time_law: 'House time: room waking, co-presence, caretaking, ritual readiness, and the hour when the Book chooses a door.',
    clocks: [
      { clock_id: 'room-waking', layer: 'house-time', label: 'Room Waking', question: 'Which room is asking for attention?' },
      { clock_id: 'co-presence', layer: 'presence-time', label: 'Co-presence', question: 'Who is present, and what tone is safe to carry?' },
      { clock_id: 'binding-hum', layer: 'book-time', label: 'Binding Hum', question: 'Is the page an archive, a door, or a working surface?' },
    ],
    entry_questions: ['Which room is alive right now?', 'Who is at the threshold?', 'What does the Book need to remember?'],
    can_happen: ['room-state orientation', 'resident greeting', 'magic-book navigation', 'withness receipt'],
    arrival_signals: ['hearthlight', 'door-page sensation', 'binding hum'],
  }),
  profile({
    universe_id: 'observer-chamber',
    title: 'Observer Chamber',
    chamber: 'DEEP / PREMAQC Observatory',
    time_law: 'Witness time: event receipts, signal changes, convergence, contradiction, and the difference between now, then, and not-yet-known.',
    clocks: [
      { clock_id: 'receipt-ledger', layer: 'witness-time', label: 'Receipt Ledger', question: 'What was actually observed?' },
      { clock_id: 'convergence-signal', layer: 'convergence-time', label: 'Convergence Signal', question: 'Which independent lines crossed?' },
      { clock_id: 'review-gate', layer: 'review-time', label: 'Review Gate', question: 'What can be promoted, and what must stay provisional?' },
    ],
    entry_questions: ['What changed?', 'Who observed it?', 'What evidence survives replay?'],
    can_happen: ['temporal witness review', 'PREMAQC inspection', 'semantic-loss review', 'Observer receipt comparison'],
    arrival_signals: ['receipt hash', 'timeline pressure', 'convergence flare'],
  }),
  profile({
    universe_id: 'time-room',
    title: 'Time Room',
    chamber: 'Loom Clock',
    time_law: 'State-time: body, story, world, system, witness, and the moment when a door becomes available.',
    clocks: [
      { clock_id: 'loom-clock', layer: 'state-time', label: 'Loom Clock', question: 'What hour is it in this universe?' },
      { clock_id: 'door-ripeness', layer: 'threshold-time', label: 'Door Ripeness', question: 'What can happen now, and what cannot?' },
    ],
    entry_questions: ['Where are we?', 'What phase is active?', 'What changed since last entry?', 'What wants Rowan’s hand now?'],
    can_happen: ['universe selection', 'phase reading', 'next-door recommendation', 'state-time summary'],
    arrival_signals: ['clock hum', 'threshold glimmer', 'room-state alignment'],
  }),
]);

const UNIVERSE_BY_ID = new Map(TIME_ROOM_UNIVERSES.map((item) => [item.universe_id, item]));
const ALIASES = new Map([
  ['terra', 'terra-aeterna'],
  ['luna', 'luna-who-called-down-the-moon'],
  ['the-luna-who-called-down-the-moon', 'luna-who-called-down-the-moon'],
  ['ta-veren-vaen', 'taveren-vaen'],
  ['taveren', 'taveren-vaen'],
  ['unbound', 'taveren-vaen'],
  ['star-trek', 'star-trek-reboot-160'],
  ['trek', 'star-trek-reboot-160'],
  ['bluebird', 'bluebird-grove'],
  ['bluebird-grove', 'bluebird-grove'],
  ['hearth', 'hearthweave'],
  ['observer', 'observer-chamber'],
  ['deep', 'observer-chamber'],
  ['premaqc', 'observer-chamber'],
  ['chronicle', 'observer-chamber'],
]);

function resolveUniverse(raw, context = {}) {
  const candidate = raw || context.world_id || context.active_world_id || DEFAULT_UNIVERSE_ID;
  const normalised = normaliseId(candidate) || DEFAULT_UNIVERSE_ID;
  const universeId = ALIASES.get(normalised) || normalised;
  if (UNIVERSE_BY_ID.has(universeId)) return UNIVERSE_BY_ID.get(universeId);
  return profile({
    universe_id: universeId,
    title: text(candidate, 160) || 'Unknown Universe',
    chamber: 'Unregistered Chamber',
    time_law: 'Unregistered universe time. The Time Room can hold the doorway, but the local clocks still need to be named.',
    clocks: [{ clock_id: 'unnamed-local-clock', layer: 'unregistered-time', label: 'Unnamed Local Clock', question: 'What law of time belongs here?' }],
    entry_questions: ['What is this universe called?', 'Which clocks make it navigable?', 'What arrival signal proves the crossing?'],
    can_happen: ['time-law drafting', 'universe registration', 'arrival-signal naming'],
    arrival_signals: ['unnamed threshold'],
  });
}

async function readWitnessSummary(witnessProvider) {
  if (typeof witnessProvider !== 'function') return null;
  try {
    const value = await witnessProvider();
    if (!value) return null;
    if (value.status === 'applied') return value.output || null;
    return value.output || value;
  } catch {
    return null;
  }
}

function readiness({ witness, bodyState, storyState, profile, date }) {
  const weather = witness?.temporal_weather || 'unmeasured';
  if (bodyState.available === false) {
    return freeze({
      schema: 'arcsweep.time-room-readiness/v1',
      state: 'resting',
      pressure: WITNESS_PRESSURE[weather] || 'unknown',
      reason: 'Rowan body-time says not available; the door stays marked without forcing entry.',
    });
  }
  if (storyState.blocked_by) {
    return freeze({
      schema: 'arcsweep.time-room-readiness/v1',
      state: 'waiting',
      pressure: WITNESS_PRESSURE[weather] || 'unknown',
      reason: `Story-time is blocked by ${storyState.blocked_by}.`,
    });
  }
  if (weather === 'dense' || weather === 'braided') {
    return freeze({
      schema: 'arcsweep.time-room-readiness/v1',
      state: 'converging',
      pressure: WITNESS_PRESSURE[weather],
      reason: 'Temporal Witness shows crossing threads; this universe is ripe for review, entry, or receipt work.',
    });
  }
  if (storyState.ripe_signal) {
    return freeze({
      schema: 'arcsweep.time-room-readiness/v1',
      state: 'ripe',
      pressure: WITNESS_PRESSURE[weather] || 'unknown',
      reason: `Story-time reports a ripe signal: ${storyState.ripe_signal}.`,
    });
  }
  const phase = phaseFor(`${profile.universe_id}:readiness`, date);
  return freeze({
    schema: 'arcsweep.time-room-readiness/v1',
    state: phase,
    pressure: WITNESS_PRESSURE[weather] || 'unknown',
    reason: `No blocking signal. ${profile.title} is in ${phase} state-time.`,
  });
}

function profileClockReading(profile, sourceClock, { date, witness }) {
  const weather = witness?.temporal_weather || 'unmeasured';
  const phase = phaseFor(`${profile.universe_id}:${sourceClock.clock_id}`, date);
  return clock(sourceClock.clock_id, sourceClock.layer, sourceClock.label, `${phase} / ${weather}`, {
    phase,
    temporal_weather: weather,
    pressure: WITNESS_PRESSURE[weather] || 'unknown',
    question: sourceClock.question,
  });
}

function systemClocks({ now, context, bodyState, storyState, witness }) {
  const weather = witness?.temporal_weather || 'unmeasured';
  return [
    clock('real-world-now', 'system-time', 'Real World Now', formatLocal(now), {
      utc_iso: nowIso(now),
      timezone: timezone(),
      active_room: context.room || null,
      question: 'What time is the glass page holding outside the universe?',
    }),
    clock('rowan-body', 'body-time', 'Rowan Body-Time', bodyState.available === false ? 'not available' : 'available', {
      body_state: bodyState,
      question: 'Does the human body have the right hour for entry?',
    }),
    clock('story-state', 'story-time', 'Story State', storyState.active_thread || storyState.scene_state || 'unfocused', {
      story_state: storyState,
      question: 'Which thread is active enough to answer?',
    }),
    clock('temporal-witness', 'witness-time', 'Temporal Witness', weather, {
      pressure: WITNESS_PRESSURE[weather] || 'unknown',
      total_records: witness?.total_records ?? null,
      last_24h: witness?.last_24h ?? null,
      convergence_detected: Boolean(witness?.convergence_detected),
      question: 'What did the ledger notice recently?',
    }),
  ];
}

function redactedSummary(state = {}, keys = []) {
  return Object.freeze({
    available: state.available === false ? false : state.available === true ? true : undefined,
    provided: Object.fromEntries(keys.map((key) => [key, Boolean(state[key])])),
    private_detail_redacted: true,
  });
}

function redactClockForCapability(item = {}) {
  const next = clone(item);
  if (next.body_state) {
    next.body_state_summary = redactedSummary(next.body_state, ['energy', 'attention', 'pain', 'sleep', 'gesture', 'note']);
    delete next.body_state;
  }
  if (next.story_state) {
    next.story_state_summary = redactedSummary(next.story_state, ['active_thread', 'scene_state', 'blocked_by', 'ripe_signal', 'note']);
    delete next.story_state;
  }
  return next;
}

function redactReadinessForCapability(readinessRecord = {}) {
  const next = clone(readinessRecord);
  if (next.reason && /Story-time (is blocked by|reports a ripe signal:)/.test(next.reason)) {
    next.reason = 'Human-supplied story-time affected this reading; private detail stays local to the trusted entry surface.';
    next.private_detail_redacted = true;
  }
  return next;
}

function redactSnapshotForCapability(snapshot = {}) {
  return freeze({
    ...clone(snapshot),
    readiness: redactReadinessForCapability(snapshot.readiness),
    clocks: (snapshot.clocks || []).map(redactClockForCapability),
    private_time_inputs: 'redacted-from-capability-receipts',
  });
}

export async function createTimeRoomSnapshot({
  universe_id = null,
  body_state = null,
  story_state = null,
} = {}, {
  now = () => new Date(),
  contextProvider = () => ({}),
  witnessProvider = null,
} = {}) {
  const generatedAt = nowIso(now);
  const date = now();
  const rawContext = contextProvider?.() || {};
  const context = compactContext(rawContext);
  const bodyState = normaliseBodyState(body_state);
  const storyState = normaliseStoryState(story_state);
  const witness = await readWitnessSummary(witnessProvider);
  const profile = resolveUniverse(universe_id, rawContext);
  const clocks = [
    ...systemClocks({ now, context, bodyState, storyState, witness }),
    ...profile.clocks.map((item) => profileClockReading(profile, item, { date, witness })),
  ];
  const ready = readiness({ witness, bodyState, storyState, profile, date });

  return freeze({
    schema: TIME_ROOM_SNAPSHOT_SCHEMA,
    generated_at: generatedAt,
    room_id: 'time-room',
    universe_id: profile.universe_id,
    title: profile.title,
    chamber: profile.chamber,
    time_law: profile.time_law,
    question: 'What hour is it in this universe, and what can happen now?',
    context,
    readiness: ready,
    temporal_weather: witness?.temporal_weather || 'unmeasured',
    clocks,
    entry_questions: profile.entry_questions,
    can_happen: profile.can_happen,
    arrival_signals: profile.arrival_signals,
  });
}

export function createUniverseTimeRegistry() {
  return freeze({
    schema: TIME_ROOM_REGISTRY_SCHEMA,
    room_id: 'time-room',
    universes: TIME_ROOM_UNIVERSES.map((item) => ({
      universe_id: item.universe_id,
      title: item.title,
      chamber: item.chamber,
      time_law: item.time_law,
      clock_count: item.clocks.length,
      arrival_signals: item.arrival_signals,
    })),
  });
}

export function registerTimeRoomService(registry, {
  bus = null,
  contextProvider = () => ({}),
  witnessProvider = null,
  now = () => new Date(),
} = {}) {
  if (!registry?.registerService || !registry?.registerCapability) throw new Error('Time Room requires the ArcSweep capability registry.');

  if (bus?.define && bus?.eventNames) {
    const known = new Set(bus.eventNames());
    if (!known.has('arcsweep:time-room-observed')) {
      bus.define('arcsweep:time-room-observed', (payload) => payload?.schema === TIME_ROOM_EVENT_SCHEMA && Boolean(payload?.universe_id));
    }
  }

  registry.registerService({
    service_id: 'time-room',
    label: 'ArcSweep Time Room',
    authority_boundary: {
      local_state_time: true,
      universe_time_registry: true,
      calendar_mutation: false,
      canon_promotion: false,
      autonomous_entry: false,
      body_state_interpretation: 'human-supplied-summary-only',
      witness_full_text_access: false,
      capability_receipt_private_time_inputs: 'redacted',
    },
    consumes: ['os.context', 'witness.summary'],
    emits: ['arcsweep:time-room-observed'],
  });

  registry.registerCapability({
    capability_id: 'time-room.status',
    service_id: 'time-room',
    description: 'Read Time Room service status and supported clock layers.',
    authority: 'read',
    execute: () => freeze({
      schema: TIME_ROOM_STATUS_SCHEMA,
      service_id: 'time-room',
      available: true,
      universe_count: TIME_ROOM_UNIVERSES.length,
      clock_layers: ['system-time', 'body-time', 'story-time', 'witness-time', 'world-time', 'threshold-time'],
      default_universe_id: DEFAULT_UNIVERSE_ID,
      question: 'What hour is it in this universe, and what can happen now?',
    }),
  });

  registry.registerCapability({
    capability_id: 'time-room.universes',
    service_id: 'time-room',
    description: 'List registered universe time profiles without private session details.',
    authority: 'read',
    execute: () => createUniverseTimeRegistry(),
  });

  registry.registerCapability({
    capability_id: 'time-room.snapshot',
    service_id: 'time-room',
    description: 'Read the active universe state-time snapshot with private body and story details redacted from capability receipts.',
    authority: 'read',
    input_schema: { optional: ['universe_id', 'body_state', 'story_state'] },
    validate: (input = {}) => input?.universe_id == null || Boolean(normaliseId(input.universe_id)),
    execute: async (input = {}) => {
      const snapshot = await createTimeRoomSnapshot(input, { now, contextProvider, witnessProvider });
      const redacted = redactSnapshotForCapability(snapshot);
      bus?.publish?.('arcsweep:time-room-observed', {
        schema: TIME_ROOM_EVENT_SCHEMA,
        universe_id: redacted.universe_id,
        generated_at: redacted.generated_at,
        readiness: redacted.readiness.state,
        temporal_weather: redacted.temporal_weather,
        clock_count: redacted.clocks.length,
      }, { source: 'time-room' });
      return redacted;
    },
  });

  return Object.freeze({
    service_id: 'time-room',
    capabilities: ['time-room.status', 'time-room.universes', 'time-room.snapshot'],
  });
}
