import { createRepairReceipt, createServiceHealth } from './kernel.js';

function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}
function nowIso(now = () => new Date()) { return now().toISOString(); }
function createId(prefix = 'id') {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}:${uuid || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`;
}

export const CARETAKER_FAULT_CLASSES = Object.freeze([
  'TRANSIENT','DERIVED-STATE','STATE-DIVERGENCE','LINEAGE','IDENTITY/ROUTE','UI/WIRING','DATA/SCHEMA','AUTHORITY','UNKNOWN',
]);

export function createFault(input = {}, { now } = {}) {
  const faultClass = CARETAKER_FAULT_CLASSES.includes(input.fault_class) ? input.fault_class : 'UNKNOWN';
  return Object.freeze({
    schema: 'arcsweep.caretaker-fault/v1',
    fault_id: input.fault_id || createId('fault'),
    fault_class: faultClass,
    service_id: input.service_id || 'unknown',
    fingerprint: input.fingerprint || `${faultClass}:${input.service_id || 'unknown'}:${input.code || input.message || 'unspecified'}`,
    code: input.code || null,
    message: input.message || 'ArcSweep OS fault detected.',
    recoverable: input.recoverable !== false,
    repair_level: input.repair_level || 'R0',
    metadata: clone(input.metadata || {}),
    detected_at: input.detected_at || nowIso(now),
  });
}

export function createRepairBudget({ maxAttemptsPerFingerprint = 1, maxRepairsPerService = 3 } = {}) {
  const attempts = new Map();
  const serviceRepairs = new Map();
  return Object.freeze({
    mayAttempt(fault) {
      return (attempts.get(fault.fingerprint) || 0) < maxAttemptsPerFingerprint &&
        (serviceRepairs.get(fault.service_id) || 0) < maxRepairsPerService;
    },
    noteAttempt(fault) { attempts.set(fault.fingerprint, (attempts.get(fault.fingerprint) || 0) + 1); },
    noteCommittedRepair(fault) { serviceRepairs.set(fault.service_id, (serviceRepairs.get(fault.service_id) || 0) + 1); },
    snapshot() { return { attempts: Object.fromEntries(attempts), service_repairs: Object.fromEntries(serviceRepairs) }; },
  });
}

export async function runRepairTransaction({
  fault, repairLevel = 'R1', action, checkpointStore, captureState, apply, validate, rollback,
  bus = null, budget = null, now,
} = {}) {
  if (!fault?.fault_id) throw new Error('Repair transaction requires a fault.');
  if (typeof captureState !== 'function') throw new Error('Repair transaction requires captureState.');
  if (typeof apply !== 'function') throw new Error('Repair transaction requires apply.');
  if (typeof validate !== 'function') throw new Error('Repair transaction requires validate.');
  if (!checkpointStore?.capture || !checkpointStore?.restore) throw new Error('Repair transaction requires checkpointStore.');

  if (budget && !budget.mayAttempt(fault)) {
    const contained = createRepairReceipt({
      fault_class: fault.fault_class, service_id: fault.service_id, repair_level: repairLevel, action,
      validation: [{ ok: false, check: 'repair-budget', detail: 'Automatic repair budget exhausted.' }],
      result: 'escalated',
    }, { now });
    bus?.publish?.('arcsweep:repair-completed', contained);
    return contained;
  }

  budget?.noteAttempt(fault);
  const checkpoint = checkpointStore.capture(await captureState(), {
    label: `${fault.service_id}:${action || 'repair'}`,
    metadata: { fault_id: fault.fault_id, fingerprint: fault.fingerprint },
  });
  let applicationResult = null;
  let validation = null;
  try {
    applicationResult = await apply({ fault, checkpoint: clone(checkpoint) });
    validation = await validate({ fault, checkpoint: clone(checkpoint), applicationResult });
  } catch (error) {
    validation = { ok: false, check: 'repair-execution', detail: error?.message || String(error) };
  }
  const checks = Array.isArray(validation) ? validation : [validation || { ok: false, check: 'validation', detail: 'No validation result.' }];
  const valid = checks.length > 0 && checks.every((item) => item?.ok === true);
  if (!valid) {
    const priorState = checkpointStore.restore(checkpoint.checkpoint_id);
    if (typeof rollback === 'function') await rollback({ fault, checkpoint: clone(checkpoint), priorState, applicationResult });
    const receipt = createRepairReceipt({
      fault_class: fault.fault_class, service_id: fault.service_id, before_checkpoint: checkpoint.checkpoint_id,
      repair_level: repairLevel, action, validation: checks, result: 'rolled-back', reversible: true,
    }, { now });
    bus?.publish?.('arcsweep:repair-completed', receipt);
    return receipt;
  }
  budget?.noteCommittedRepair(fault);
  const receipt = createRepairReceipt({
    fault_class: fault.fault_class, service_id: fault.service_id, before_checkpoint: checkpoint.checkpoint_id,
    repair_level: repairLevel, action, validation: checks, result: 'committed', reversible: true,
  }, { now });
  bus?.publish?.('arcsweep:repair-completed', receipt);
  return receipt;
}

export function createCaretaker({ bus, checkpointStore, healthRegistry, repairBudget = createRepairBudget(), now } = {}) {
  if (!bus?.publish || !bus?.subscribe) throw new Error('Caretaker requires the ArcSweep OS event bus.');
  if (!checkpointStore?.capture) throw new Error('Caretaker requires checkpoint storage.');
  const requiredSubscriptions = new Map();
  const requiredServices = new Map();
  let featherPaused = false;

  function emitFault(input) {
    const fault = createFault(input, { now });
    bus.publish('arcsweep:caretaker-fault-detected', fault);
    return fault;
  }

  function registerRequiredSubscription({ eventName, subscriptionId, handler, serviceId = 'arcsweep-os', repair = true } = {}) {
    if (!eventName || !subscriptionId || typeof handler !== 'function') throw new Error('Required subscription needs eventName, subscriptionId, and handler.');
    requiredSubscriptions.set(`${eventName}#${subscriptionId}`, { eventName, subscriptionId, handler, serviceId, repair });
    if (!bus.hasSubscription(eventName, subscriptionId)) bus.subscribe(eventName, handler, { id: subscriptionId });
    return `${eventName}#${subscriptionId}`;
  }

  function registerRequiredService({
    serviceId, probe, repair = null, rollback = null, repairLevel = 'R1', faultClass = 'TRANSIENT',
  } = {}) {
    if (!serviceId || typeof probe !== 'function') throw new Error('Required service needs serviceId and probe.');
    if (repair !== null && typeof repair !== 'function') throw new Error('Service repair must be a function when supplied.');
    if (rollback !== null && typeof rollback !== 'function') throw new Error('Service rollback must be a function when supplied.');
    requiredServices.set(serviceId, { serviceId, probe, repair, rollback, repairLevel, faultClass });
    return serviceId;
  }

  async function repairSubscription(fault, descriptor) {
    const key = `${descriptor.eventName}#${descriptor.subscriptionId}`;
    return runRepairTransaction({
      fault, repairLevel: 'R1', action: 'rebind-event-subscription', checkpointStore, bus, budget: repairBudget, now,
      captureState: () => ({ key, present: bus.hasSubscription(descriptor.eventName, descriptor.subscriptionId) }),
      apply: () => {
        if (!bus.hasSubscription(descriptor.eventName, descriptor.subscriptionId)) bus.subscribe(descriptor.eventName, descriptor.handler, { id: descriptor.subscriptionId });
        return { rebound: true };
      },
      validate: () => ({ ok: bus.hasSubscription(descriptor.eventName, descriptor.subscriptionId), check: 'required-subscription-present', detail: key }),
      rollback: ({ priorState }) => { if (priorState?.present === false) bus.unsubscribe(descriptor.eventName, descriptor.subscriptionId); },
    });
  }

  async function inspectRequiredSubscriptions() {
    const findings = [];
    for (const descriptor of requiredSubscriptions.values()) {
      if (bus.hasSubscription(descriptor.eventName, descriptor.subscriptionId)) continue;
      const fault = emitFault({
        fault_class: 'UI/WIRING', service_id: descriptor.serviceId, code: 'missing-event-subscription',
        message: `Required subscription is missing: ${descriptor.eventName}#${descriptor.subscriptionId}`,
        repair_level: descriptor.repair ? 'R1' : 'R0',
        metadata: { event_name: descriptor.eventName, subscription_id: descriptor.subscriptionId },
      });
      findings.push(fault);
      if (descriptor.repair && !featherPaused) await repairSubscription(fault, descriptor);
    }
    return findings;
  }

  async function probeService(descriptor) {
    try {
      const result = await descriptor.probe();
      if (result === true) return { ok: true, detail: null };
      if (result && typeof result === 'object') return { ok: result.ok === true, detail: clone(result) };
      return { ok: false, detail: result ?? null };
    } catch (error) {
      return { ok: false, detail: { error: error?.message || String(error) } };
    }
  }

  async function repairService(fault, descriptor) {
    return runRepairTransaction({
      fault,
      repairLevel: descriptor.repairLevel,
      action: 'recover-required-service',
      checkpointStore,
      bus,
      budget: repairBudget,
      now,
      captureState: async () => ({
        health: healthRegistry?.get?.(descriptor.serviceId) || null,
        probe: await probeService(descriptor),
      }),
      apply: async (context) => descriptor.repair?.(context),
      validate: async () => {
        const probe = await probeService(descriptor);
        if (probe.ok) {
          healthRegistry?.set?.({
            service_id: descriptor.serviceId,
            status: 'healthy',
            last_success_at: nowIso(now),
            recoverable: true,
            repair_class: descriptor.repairLevel,
          });
        }
        return { ok: probe.ok, check: 'required-service-healthy', detail: clone(probe.detail) };
      },
      rollback: async (context) => descriptor.rollback?.(context),
    });
  }

  async function inspectRequiredServices() {
    const findings = [];
    for (const descriptor of requiredServices.values()) {
      const probe = await probeService(descriptor);
      if (probe.ok) continue;
      healthRegistry?.set?.({
        service_id: descriptor.serviceId,
        status: 'failed',
        last_error: probe.detail?.error || 'Required service probe failed.',
        recoverable: Boolean(descriptor.repair),
        repair_class: descriptor.repair ? descriptor.repairLevel : 'R0',
      });
      const fault = emitFault({
        fault_class: descriptor.faultClass,
        service_id: descriptor.serviceId,
        code: 'required-service-unhealthy',
        message: `Required service is unhealthy: ${descriptor.serviceId}`,
        recoverable: Boolean(descriptor.repair),
        repair_level: descriptor.repair ? descriptor.repairLevel : 'R0',
        metadata: { probe: clone(probe.detail) },
      });
      findings.push(fault);
      if (descriptor.repair && !featherPaused) await repairService(fault, descriptor);
    }
    return findings;
  }

  function setFeatherPaused(paused = true) {
    featherPaused = Boolean(paused);
    if (featherPaused) bus.publish('arcsweep:feather-paused', { paused: true, source: 'caretaker' });
    return featherPaused;
  }

  function publishHealth(input) {
    const record = createServiceHealth(input, { now });
    if (healthRegistry?.set) return healthRegistry.set(record);
    bus.publish('arcsweep:service-health-changed', record);
    return record;
  }

  return Object.freeze({
    emitFault,
    registerRequiredSubscription,
    registerRequiredService,
    inspectRequiredSubscriptions,
    inspectRequiredServices,
    repairSubscription,
    repairService,
    setFeatherPaused,
    featherPaused: () => featherPaused,
    publishHealth,
    repairBudget: () => repairBudget.snapshot(),
  });
}
