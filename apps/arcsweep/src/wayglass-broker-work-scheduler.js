/**
 * Optional Wayglass work-dispatch seam, inspired by AIOS queue centralisation.
 * This is NOT a new identity kernel, provider router, durable receipt store,
 * privileged execution surface, or live host integration.
 *
 * Trusted host supplies authorize() and execute(). Adapters only execute
 * broker-selected work; they cannot create authority or choose another route.
 */
export const WAYGLASS_WORK_SCHEDULER_SCHEMA = 'wayglass.broker.work-queue/v0.1';
export const WAYGLASS_WORK_SNAPSHOT_SCHEMA = 'wayglass.broker.unverified-work-snapshot/v0.1';
export const WAYGLASS_RECONSTRUCTION_SCHEMA = 'wayglass.broker.reconstruction-proposal/v0.1';

const JOB_KINDS = new Set(['model', 'tool', 'memory', 'storage']);
const ID = /^[a-zA-Z0-9][a-zA-Z0-9:._-]{0,127}$/;
const MAX_PUBLIC_TEXT = 16000;
const MAX_CHUNK = 3000;
const own = (obj, key) => Object.hasOwn(obj, key);
const bounded = (value, field, max = 1024) => {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new TypeError(field + ' must be a bounded non-empty string.');
  }
  return value;
};
const identifier = (value, field) => {
  if (!ID.test(bounded(value, field, 128))) throw new TypeError(field + ' is not a valid reference.');
  return value;
};
const view = job => Object.freeze({
  schema: WAYGLASS_WORK_SNAPSHOT_SCHEMA,
  verified: false,
  durable: false,
  authority_grant: false,
  identity_commit: false,
  canon_commit: false,
  job_id: job.job_id,
  kind: job.kind,
  participant_id: job.participant_id,
  world_id: job.world_id,
  route_id: job.route_id,
  work_ref: job.work_ref,
  status: job.status,
  visible_output: job.visible_output,
  stop_point: job.stop_point,
  next_owner: job.next_owner,
  unresolved_wonder_questions: Object.freeze([...job.unresolved_wonder_questions]),
  provenance_refs: Object.freeze([...job.provenance_refs]),
  recovery_class: job.recovery_class,
  stop_receipt_id: job.stop_receipt_id,
  reason: job.reason,
});

export function createWayglassBrokerWorkScheduler({
  authorize,
  execute,
  maxJobs = 64,
} = {}) {
  if (typeof authorize !== 'function' || typeof execute !== 'function') {
    throw new TypeError('Broker requires separate host authorization and executor callbacks.');
  }
  if (!Number.isSafeInteger(maxJobs) || maxJobs < 1 || maxJobs > 256) {
    throw new TypeError('Broker queue size must be within 1..256.');
  }
  const jobs = new Map();
  const ready = [];
  let busy = false;
  let runningId = null;
  let abortController = null;

  function enqueue(request) {
    if (!request || typeof request !== 'object' || Array.isArray(request)) {
      throw new TypeError('A typed Wayglass work request is required.');
    }
    const job_id = identifier(request.job_id, 'job_id');
    const kind = bounded(request.kind, 'kind', 16);
    if (!JOB_KINDS.has(kind)) throw new TypeError('Unknown broker syscall kind.');
    if (jobs.has(job_id)) throw new Error('Duplicate work ID is not admitted.');
    if (jobs.size >= maxJobs) throw new Error('Broker work queue is full.');
    const wonder = request.unresolved_wonder_questions;
    const refs = request.provenance_refs;
    if (!Array.isArray(refs) || refs.length < 1 || refs.length > 24
        || !refs.every(x => typeof x === 'string' && x.length > 0 && x.length <= 500)) {
      throw new TypeError('A bounded provenance reference list is required.');
    }
    if (!Array.isArray(wonder) || wonder.length > 24
        || !wonder.every(x => typeof x === 'string' && x.length <= 1000)) {
      throw new TypeError('Open Wonder questions require a bounded list.');
    }
    const job = {
      job_id, kind,
      participant_id: identifier(request.participant_id, 'participant_id'),
      world_id: identifier(request.world_id, 'world_id'),
      route_id: identifier(request.route_id, 'route_id'),
      work_ref: identifier(request.work_ref, 'work_ref'),
      stop_point: bounded(request.stop_point, 'stop_point'),
      next_owner: identifier(request.next_owner, 'next_owner'),
      unresolved_wonder_questions: [...wonder],
      provenance_refs: [...refs],
      visible_output: '',
      status: 'queued',
      reason: null,
      recovery_class: null,
      stop_receipt_id: null,
    };
    jobs.set(job_id, job);
    ready.push(job_id);
    return view(job);
  }

  function inspect(jobId) {
    const job = jobs.get(jobId);
    return job ? view(job) : null;
  }

  function interrupt(jobId, stopPoint) {
    const job = jobs.get(jobId);
    if (!job || !['queued', 'running', 'waiting-permission'].includes(job.status)) {
      return job ? view(job) : null;
    }
    if (stopPoint !== undefined) job.stop_point = bounded(stopPoint, 'stop_point');
    job.status = 'offline-pending-receipt';
    job.reason = 'explicit-interrupt';
    job.recovery_class = 'text-reconstruction-only';
    const idx = ready.indexOf(jobId);
    if (idx !== -1) ready.splice(idx, 1);
    if (runningId === jobId) abortController?.abort();
    return view(job);
  }

  async function runNext() {
    if (busy) return Object.freeze({ status: 'broker-busy' });
    const jobId = ready.shift();
    if (!jobId) return Object.freeze({ status: 'broker-idle' });
    const job = jobs.get(jobId);
    if (!job || job.status !== 'queued') return Object.freeze({ status: 'broker-idle' });
    busy = true;
    runningId = jobId;
    abortController = new AbortController();
    try {
      const authorization = await authorize(view(job));
      if (job.status !== 'queued') return view(job);
      if (!authorization || authorization.admitted !== true) {
        job.status = 'waiting-permission';
        job.reason = 'host-authorization-required';
        return view(job);
      }
      job.status = 'running';
      // No agent-selected route and no provider-specific scheduling in execute().
      const result = await execute(view(job), { signal: abortController.signal });
      if (job.status !== 'running') return view(job);
      if (!result || typeof result !== 'object'
          || !['yield', 'complete', 'permission-required', 'route-unavailable'].includes(result.type)) {
        job.status = 'offline-pending-receipt';
        job.reason = 'invalid-executor-result';
        job.recovery_class = 'text-reconstruction-only';
        return view(job);
      }
      if (result.type === 'permission-required') {
        job.status = 'waiting-permission';
        job.reason = 'executor-requested-permission';
        return view(job);
      }
      if (result.type === 'route-unavailable') {
        job.status = 'offline-pending-receipt';
        job.reason = 'route-unavailable';
        job.recovery_class = 'text-reconstruction-only';
        return view(job);
      }
      // Only publicly emitted output is retained. Hidden reasoning, logits,
      // secrets and self-reported model checkpoint objects are not captured.
      const chunk = result.public_text ?? '';
      if (typeof chunk !== 'string' || chunk.length > MAX_CHUNK
          || job.visible_output.length + chunk.length > MAX_PUBLIC_TEXT) {
        job.status = 'offline-pending-receipt';
        job.reason = 'unbounded-public-output';
        job.recovery_class = 'text-reconstruction-only';
        return view(job);
      }
      job.visible_output += chunk;
      if (result.type === 'complete') {
        job.status = 'completed';
        return view(job);
      }
      job.status = 'queued';
      ready.push(jobId); // cooperative round robin; other queued work runs first
      return view(job);
    } catch {
      if (job.status === 'queued' || job.status === 'running') {
        job.status = 'offline-pending-receipt';
        job.reason = 'executor-failed';
        job.recovery_class = 'text-reconstruction-only';
      }
      return view(job); // provider errors can contain secrets: don't reflect them
    } finally {
      busy = false;
      runningId = null;
      abortController = null;
    }
  }

  // A caller cannot turn a draft snapshot into durable continuity. The host
  // must inspect the authoritative stop receipt and its provenance separately.
  async function attachVerifiedStopReceipt(jobId, receipt, verifyAuthoritativeReceipt) {
    const job = jobs.get(jobId);
    if (!job || job.status !== 'offline-pending-receipt') {
      throw new Error('Job is not awaiting a stop receipt.');
    }
    if (typeof verifyAuthoritativeReceipt !== 'function' || !receipt
        || receipt.schema !== 'wayglass.stop-receipt/v0.1'
        || receipt.world_id !== job.world_id
        || receipt.participant_id !== job.participant_id
        || receipt.route_id !== job.route_id
        || receipt.stop_point !== job.stop_point
        || receipt.next_owner !== job.next_owner
        || !receipt.receipt_id) {
      throw new Error('Authoritative stop receipt inspection is required.');
    }
    if (await verifyAuthoritativeReceipt(receipt, view(job)) !== true) {
      throw new Error('Stop receipt failed provenance and continuity inspection.');
    }
    job.status = 'offline-preserved';
    job.stop_receipt_id = receipt.receipt_id;
    return view(job);
  }

  function proposeReconstruction(jobId, targetRouteId) {
    const job = jobs.get(jobId);
    if (!job || job.status !== 'offline-preserved') throw new Error('Verified stop receipt required before reconstruction.');
    return Object.freeze({
      schema: WAYGLASS_RECONSTRUCTION_SCHEMA,
      status: 'proposal-only',
      mode: 'text-reconstruction',
      exact_resume: false,
      authority_grant: false,
      participant_id: job.participant_id,
      from_route_id: job.route_id,
      to_route_id: identifier(targetRouteId, 'target_route_id'),
      source_stop_receipt_id: job.stop_receipt_id,
      last_visible_output: job.visible_output,
      stop_point: job.stop_point,
      next_owner: job.next_owner,
      unresolved_wonder_questions: Object.freeze([...job.unresolved_wonder_questions]),
      provenance_refs: Object.freeze([...job.provenance_refs]),
    });
  }

  function retryPermission(jobId) {
    const job = jobs.get(jobId);
    if (!job || job.status !== 'waiting-permission') throw new Error('Job is not waiting for permission.');
    job.status = 'queued';
    job.reason = null;
    ready.push(jobId); // authorisation is rechecked on every step
    return view(job);
  }

  return Object.freeze({
    enqueue, inspect, interrupt, runNext, retryPermission,
    attachVerifiedStopReceipt, proposeReconstruction,
    status: () => Object.freeze({ schema: WAYGLASS_WORK_SCHEDULER_SCHEMA, queued: ready.length, busy, jobs: jobs.size }),
  });
}
