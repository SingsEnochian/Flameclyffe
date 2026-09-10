import { ARCSWEEP_OS_MANIFEST } from './version.js';

const DEFAULT_HISTORY_LIMIT = 128;

function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function freezeRecord(value) {
  return Object.freeze(clone(value));
}

function nowIso(now = () => new Date()) {
  return now().toISOString();
}

function createId(prefix = 'id') {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}:${uuid || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`;
}

export const OS_EVENT_DEFINITIONS = Object.freeze({
  'arcsweep:navigation-changed': (payload) => Boolean(payload?.current_room),
  'arcsweep:context-capsule-created': (payload) => payload?.schema === ARCSWEEP_OS_MANIFEST.contracts.contextCapsule,
  'arcsweep:service-health-changed': (payload) => Boolean(payload?.service_id && payload?.status),
  'arcsweep:caretaker-fault-detected': (payload) => Boolean(payload?.fault_id && payload?.fault_class),
  'arcsweep:repair-completed': (payload) => payload?.schema === ARCSWEEP_OS_MANIFEST.contracts.repairReceipt,
  'arcsweep:caretaker-alert': (payload) => Boolean(payload?.message),
  'arcsweep:feather-paused': (payload) => payload?.paused === true,
});

export function createEventBus({ definitions = OS_EVENT_DEFINITIONS, historyLimit = DEFAULT_HISTORY_LIMIT, now } = {}) {
  const validators = new Map(Object.entries(definitions));
  const listeners = new Map();
  const history = [];
  let sequence = 0;

  function requireKnownEvent(name) {
    if (!validators.has(name)) throw new Error(`Unknown ArcSweep OS event: ${name}`);
  }

  function define(name, validator = () => true) {
    if (!name) throw new Error('Event name is required.');
    if (validators.has(name)) throw new Error(`Event already defined: ${name}`);
    validators.set(name, validator);
    return name;
  }

  function subscribe(name, handler, { id = createId('subscription') } = {}) {
    requireKnownEvent(name);
    if (typeof handler !== 'function') throw new Error('Event handler must be a function.');
    const bucket = listeners.get(name) || new Map();
    if (bucket.has(id)) throw new Error(`Subscription already exists: ${name}#${id}`);
    bucket.set(id, handler);
    listeners.set(name, bucket);
    return () => bucket.delete(id);
  }

  function unsubscribe(name, id) {
    return listeners.get(name)?.delete(id) || false;
  }

  function publish(name, payload = {}, meta = {}) {
    requireKnownEvent(name);
    const validator = validators.get(name);
    if (validator && validator(payload) !== true) throw new Error(`Invalid payload for ArcSweep OS event: ${name}`);
    sequence += 1;
    const receipt = freezeRecord({
      schema: ARCSWEEP_OS_MANIFEST.contracts.eventReceipt,
      event_id: createId('event'),
      sequence,
      name,
      payload: clone(payload),
      meta: clone(meta),
      emitted_at: nowIso(now),
    });
    history.push(receipt);
    if (history.length > historyLimit) history.splice(0, history.length - historyLimit);
    for (const handler of listeners.get(name)?.values() || []) handler(receipt);
    return receipt;
  }

  return Object.freeze({
    define,
    subscribe,
    unsubscribe,
    publish,
    listenerCount: (name) => listeners.get(name)?.size || 0,
    hasSubscription: (name, id) => listeners.get(name)?.has(id) || false,
    history: () => history.map(clone),
    eventNames: () => [...validators.keys()],
  });
}

export function createSessionState(input = {}, { now } = {}) {
  return freezeRecord({
    schema: 'arcsweep.os-session/v1',
    session_id: input.session_id || createId('session'),
    operator_id: input.operator_id || 'local-operator',
    active_world_id: input.active_world_id || null,
    active_project_id: input.active_project_id || null,
    active_scene_id: input.active_scene_id || null,
    active_document_id: input.active_document_id || null,
    active_room: input.active_room || 'portal',
    current_goal: input.current_goal || null,
    presence_mode: input.presence_mode || 'companion',
    feather_paused: Boolean(input.feather_paused),
    started_at: input.started_at || nowIso(now),
  });
}

export function createContextCapsule({ session, previousRoom = null, currentRoom, patch = {}, relevantObjects = [], openWork = [], authorityBoundary = null, receiptIds = [] } = {}, { now } = {}) {
  if (!session?.session_id) throw new Error('Context capsule requires an ArcSweep OS session.');
  if (!currentRoom) throw new Error('Context capsule requires currentRoom.');
  return freezeRecord({
    schema: ARCSWEEP_OS_MANIFEST.contracts.contextCapsule,
    capsule_id: createId('context'),
    session_id: session.session_id,
    world_id: patch.world_id ?? session.active_world_id ?? null,
    project_id: patch.project_id ?? session.active_project_id ?? null,
    scene_id: patch.scene_id ?? session.active_scene_id ?? null,
    document_id: patch.document_id ?? session.active_document_id ?? null,
    previous_room: previousRoom,
    current_room: currentRoom,
    current_goal: patch.current_goal ?? session.current_goal ?? null,
    relevant_objects: clone(relevantObjects),
    open_work: clone(openWork),
    authority_boundary: authorityBoundary,
    receipt_ids: clone(receiptIds),
    created_at: nowIso(now),
  });
}

export function advanceSession(session, capsule) {
  if (!session?.session_id || !capsule?.capsule_id) throw new Error('advanceSession requires a session and context capsule.');
  if (session.session_id !== capsule.session_id) throw new Error('Context capsule belongs to a different session.');
  return freezeRecord({
    ...session,
    active_world_id: capsule.world_id,
    active_project_id: capsule.project_id,
    active_scene_id: capsule.scene_id,
    active_document_id: capsule.document_id,
    active_room: capsule.current_room,
    current_goal: capsule.current_goal,
  });
}

export function createCheckpointStore({ now } = {}) {
  const checkpoints = new Map();
  return Object.freeze({
    capture(subject, { label = null, metadata = {} } = {}) {
      const checkpoint = freezeRecord({
        schema: ARCSWEEP_OS_MANIFEST.contracts.checkpoint,
        checkpoint_id: createId('checkpoint'),
        label,
        state: clone(subject),
        metadata: clone(metadata),
        created_at: nowIso(now),
      });
      checkpoints.set(checkpoint.checkpoint_id, checkpoint);
      return clone(checkpoint);
    },
    read(checkpointId) {
      const checkpoint = checkpoints.get(checkpointId);
      return checkpoint ? clone(checkpoint) : null;
    },
    restore(checkpointId) {
      const checkpoint = checkpoints.get(checkpointId);
      if (!checkpoint) throw new Error(`Unknown checkpoint: ${checkpointId}`);
      return clone(checkpoint.state);
    },
    remove(checkpointId) {
      return checkpoints.delete(checkpointId);
    },
  });
}

export function createServiceHealth(input = {}, { now } = {}) {
  const allowed = new Set(['healthy', 'degraded', 'failed', 'paused']);
  const status = allowed.has(input.status) ? input.status : 'degraded';
  return freezeRecord({
    schema: ARCSWEEP_OS_MANIFEST.contracts.health,
    service_id: input.service_id,
    status,
    version: input.version || null,
    last_success_at: input.last_success_at || null,
    last_error: input.last_error || null,
    dependencies: clone(input.dependencies || []),
    recoverable: input.recoverable !== false,
    repair_class: input.repair_class || null,
    checkpoint_id: input.checkpoint_id || null,
    observed_at: input.observed_at || nowIso(now),
  });
}

export function createHealthRegistry({ bus = null, now } = {}) {
  const records = new Map();
  return Object.freeze({
    set(input) {
      if (!input?.service_id) throw new Error('Health record requires service_id.');
      const record = createServiceHealth(input, { now });
      records.set(record.service_id, record);
      bus?.publish?.('arcsweep:service-health-changed', record);
      return clone(record);
    },
    get(serviceId) {
      const record = records.get(serviceId);
      return record ? clone(record) : null;
    },
    snapshot() {
      return [...records.values()].map(clone);
    },
  });
}

export function createRepairReceipt(input = {}, { now } = {}) {
  const result = input.result || 'contained';
  if (!['committed', 'rolled-back', 'contained', 'escalated'].includes(result)) throw new Error(`Invalid repair result: ${result}`);
  return freezeRecord({
    schema: ARCSWEEP_OS_MANIFEST.contracts.repairReceipt,
    repair_id: input.repair_id || createId('repair'),
    detected_at: input.detected_at || nowIso(now),
    fault_class: input.fault_class || 'UNKNOWN',
    service_id: input.service_id || 'unknown',
    before_checkpoint: input.before_checkpoint || null,
    repair_level: input.repair_level || 'R0',
    action: input.action || 'observe',
    authority_sources: clone(input.authority_sources || []),
    validation: clone(input.validation || []),
    result,
    after_checkpoint: input.after_checkpoint || null,
    reversible: input.reversible !== false,
    source_patch_pr: input.source_patch_pr || null,
    completed_at: input.completed_at || nowIso(now),
  });
}
