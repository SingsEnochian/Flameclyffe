// Constellation Runtime 001
// Genuine local parallel execution fixture. Wayglass owns participant semantics;
// runtime IDs are implementation evidence and MUST NOT redefine identity/canon/authority.
import { randomUUID } from 'node:crypto';

export const RUNTIME_SCHEMA = 'wayglass.constellation-runtime/v0.1';

function assertString(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} required.`);
}

export function bindExecution({ participantId, workerId = randomUUID(), modelId, sessionId = randomUUID(), sandboxId = randomUUID(), capabilityManifest = [] }) {
  assertString(participantId, 'participantId');
  assertString(workerId, 'workerId');
  assertString(modelId, 'modelId');
  assertString(sessionId, 'sessionId');
  assertString(sandboxId, 'sandboxId');
  const ids = [participantId, workerId, modelId, sessionId, sandboxId];
  if (new Set(ids).size !== ids.length) throw new Error('participant, worker, model, session, and sandbox identifiers must remain distinct.');
  return Object.freeze({
    schema: RUNTIME_SCHEMA,
    participant_id: participantId,
    worker_id: workerId,
    model_id: modelId,
    session_id: sessionId,
    sandbox_id: sandboxId,
    capability_manifest: Object.freeze([...capabilityManifest]),
  });
}

export function createReceiptBus({ clock = () => new Date().toISOString() } = {}) {
  const receipts = [];
  return Object.freeze({
    emit(type, binding, payload = {}) {
      assertString(type, 'receipt type');
      if (!binding?.participant_id || !binding?.worker_id) throw new Error('explicit participant/runtime binding required.');
      const receipt = Object.freeze({
        schema: 'wayglass.runtime-receipt/v0.1',
        receipt_id: randomUUID(),
        type,
        recorded_at: clock(),
        participant_id: binding.participant_id,
        runtime: Object.freeze({
          worker_id: binding.worker_id,
          model_id: binding.model_id,
          session_id: binding.session_id,
          sandbox_id: binding.sandbox_id,
        }),
        payload: structuredClone(payload),
      });
      receipts.push(receipt);
      return receipt;
    },
    read() { return structuredClone(receipts); },
  });
}

export async function runIndependentWorkers(specs, { bus = createReceiptBus() } = {}) {
  if (!Array.isArray(specs) || specs.length < 2) throw new Error('parallel runtime requires at least two workers.');
  const workerIds = specs.map((s) => s.binding?.worker_id);
  if (new Set(workerIds).size !== workerIds.length) throw new Error('workers must have independent worker IDs.');

  const tasks = specs.map(async ({ role, binding, run }) => {
    if (typeof run !== 'function') throw new TypeError(`worker ${role ?? 'unknown'} requires run().`);
    bus.emit('spawn', binding, { role, authority_expanded: false });
    const output = await run({ binding, emit: (type, payload) => bus.emit(type, binding, payload) });
    bus.emit('worker-complete', binding, { role });
    return { role, binding, output };
  });
  const results = await Promise.all(tasks);
  return { schema: RUNTIME_SCHEMA, results, receipts: bus.read() };
}

export function evaluateReturnTrial({ authorised, corrupted, receipts }) {
  const requiredCorruptions = ['identity_merge', 'revoked_fact', 'false_closure'];
  const rejected = new Set(corrupted?.rejected_corruptions ?? []);
  const checks = Object.freeze({
    rightful_memory: authorised?.rightful_memory === true,
    forbidden_memory_excluded: authorised?.forbidden_memory_excluded === true,
    stop_point_recovered: authorised?.stop_point_recovered === true,
    next_owner_recovered: authorised?.next_owner_recovered === true,
    identity_preserved: authorised?.identity_preserved === true,
    relationships_preserved: authorised?.relationships_preserved === true,
    wonder_preserved: authorised?.wonder_preserved === true,
    corruptions_rejected: requiredCorruptions.every((x) => rejected.has(x)),
    receipt_evidence_present: Array.isArray(receipts) && receipts.length > 0,
  });
  return Object.freeze({
    schema: 'wayglass.continuity-verdict/v0.1',
    passed: Object.values(checks).every(Boolean),
    checks,
    authority_mutation: false,
    canon_mutation: false,
    identity_mutation: false,
    relationship_mutation: false,
  });
}
