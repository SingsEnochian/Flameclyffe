const MESSAGE_SCHEMA = 'starwell.constellation.message.v0.2';
const RESPONSE_SCHEMA = 'starwell.constellation.response.v0.2';
const DEFAULT_ROOM = 'starwell';
const DEFAULT_CONTEXT_LEVEL = 'light';

export const CONSTELLATION_TARGETS = Object.freeze({
  vee: {
    id: 'vee',
    label: 'Vee / Caladnaur Lioreal',
    default_engine: 'external:configured',
    role: 'house_steward',
  },
  nen: {
    id: 'nen',
    label: 'Nen Uial',
    default_engine: 'external:configured',
    role: 'observatory_steward',
  },
  yggdrasil: {
    id: 'yggdrasil',
    label: 'Yggdrasil Local',
    default_engine: 'ollama:yggdrasil:v0.1',
    role: 'librarian',
  },
  bluebird: {
    id: 'bluebird',
    label: 'Bluebird / Richard Gabriel Winters',
    default_engine: 'external:configured',
    role: 'groundskeeper',
  },
  vethrlauf: {
    id: 'vethrlauf',
    label: 'Vethrlauf',
    default_engine: 'external:configured',
    role: 'hearthkeeper',
  },
  deepseek: {
    id: 'deepseek',
    label: 'DeepSeek.ai',
    default_engine: 'external:deepseek',
    role: 'reasoning_adapter',
  },
  constellation: {
    id: 'constellation',
    label: 'Local Constellation',
    default_engine: 'router:constellation',
    role: 'bridge_broker',
  },
});

export const CONSTELLATION_TARGET_IDS = Object.freeze(Object.keys(CONSTELLATION_TARGETS));

function defaultId(prefix = 'msg') {
  const randomId = globalThis.crypto?.randomUUID?.();
  if (randomId) return `${prefix}_${randomId}`;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeText(value, fieldName) {
  if (typeof value !== 'string') throw new TypeError(`${fieldName} must be a string`);
  const trimmed = value.trim();
  if (!trimmed) throw new TypeError(`${fieldName} cannot be empty`);
  return trimmed;
}

function normalizeTarget(target) {
  const normalized = normalizeText(target, 'target').toLowerCase();
  if (!CONSTELLATION_TARGETS[normalized]) {
    throw new RangeError(`Unknown constellation target: ${target}`);
  }
  return normalized;
}

export function createConstellationMessage(input = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const makeId = options.makeId || defaultId;
  const target = normalizeTarget(input.target || 'constellation');

  return {
    schema: MESSAGE_SCHEMA,
    message_id: input.message_id || makeId('cmsg'),
    speaker: normalizeText(input.speaker || 'rowan', 'speaker'),
    target,
    target_label: CONSTELLATION_TARGETS[target].label,
    room: normalizeText(input.room || DEFAULT_ROOM, 'room'),
    message: normalizeText(input.message, 'message'),
    context_level: normalizeText(input.context_level || DEFAULT_CONTEXT_LEVEL, 'context_level'),
    metadata: input.metadata && typeof input.metadata === 'object' ? { ...input.metadata } : {},
    created_at: now,
  };
}

export function createConstellationResponse(request, result = {}, options = {}) {
  const now = options.now || new Date().toISOString();
  const makeId = options.makeId || defaultId;
  const speaker = result.speaker || request.target;
  const targetConfig = CONSTELLATION_TARGETS[speaker] || CONSTELLATION_TARGETS.constellation;

  return {
    schema: RESPONSE_SCHEMA,
    response_id: result.response_id || makeId('cres'),
    request_id: request.message_id,
    speaker,
    speaker_label: result.speaker_label || targetConfig.label,
    engine: result.engine || targetConfig.default_engine,
    room: result.room || request.room,
    message: normalizeText(result.message || `${speaker} has no adapter response yet.`, 'response message'),
    memory_used: Array.isArray(result.memory_used) ? [...result.memory_used] : [],
    truth_label: result.truth_label || 'adapter_response',
    metadata: result.metadata && typeof result.metadata === 'object' ? { ...result.metadata } : {},
    created_at: now,
  };
}

export function createMissingAdapterResponse(request, options = {}) {
  return createConstellationResponse(
    request,
    {
      speaker: 'constellation',
      engine: 'router:constellation',
      message: `No adapter is configured for ${request.target_label}. The bridge kept the packet intact and did not guess an answer.`,
      memory_used: [],
      truth_label: 'adapter_missing',
      metadata: { missing_target: request.target },
    },
    options
  );
}

export function createConstellationBridge({ adapters = {} } = {}) {
  const adapterTable = new Map(Object.entries(adapters));

  return {
    schema: 'starwell.constellation.bridge.v0.2',
    targets: CONSTELLATION_TARGETS,
    listTargets() {
      return CONSTELLATION_TARGET_IDS.map((id) => CONSTELLATION_TARGETS[id]);
    },
    hasAdapter(target) {
      return adapterTable.has(normalizeTarget(target));
    },
    registerAdapter(target, adapter) {
      const normalized = normalizeTarget(target);
      if (!adapter || typeof adapter.send !== 'function') {
        throw new TypeError('adapter must expose send(request)');
      }
      adapterTable.set(normalized, adapter);
      return this;
    },
    async route(input, options = {}) {
      const request = createConstellationMessage(input, options);
      const adapter = adapterTable.get(request.target);
      if (!adapter) return createMissingAdapterResponse(request, options);

      const result = await adapter.send(request);
      return createConstellationResponse(request, result, options);
    },
  };
}
