import { createConflict, createSyncEnvelope, mergePolicyFor, SYNC_OPERATION, SYNC_STREAM } from './contracts.js';

export function createBifrostSyncBridge({ deviceId, actorId = 'rowan', local, remote, clock = () => new Date() }) {
  if (!deviceId) throw new TypeError('deviceId is required');
  if (!local?.put || !local?.get || !local?.outbox || !local?.markPushed) throw new TypeError('local sync store is incomplete');

  let status = 'IDLE';
  let lastError = null;
  let lastSyncAt = null;

  async function publish(input) {
    const current = await local.get(input.stream, input.entityId);
    const envelope = createSyncEnvelope({
      ...input,
      deviceId,
      actorId,
      baseRevision: current?.revision || 0,
      revision: (current?.revision || 0) + 1,
    }, { now: clock });
    await local.put(envelope, { pending: true });
    return envelope;
  }

  async function sync() {
    if (!remote?.push || !remote?.pull) return snapshot('OFFLINE');
    status = 'SYNCING';
    lastError = null;
    try {
      const pending = await local.outbox();
      if (pending.length) {
        const pushed = await remote.push(pending);
        await local.markPushed(pushed?.acceptedIds || pending.map(item => item.envelopeId));
      }

      const cursor = await local.getCursor();
      const incoming = await remote.pull(cursor);
      for (const envelope of incoming?.items || []) await ingest(envelope);
      if (incoming?.cursor != null) await local.setCursor(incoming.cursor);

      status = 'SYNCED';
      lastSyncAt = clock().toISOString();
      return snapshot();
    } catch (error) {
      status = 'DEGRADED';
      lastError = String(error?.message || error);
      return snapshot();
    }
  }

  async function ingest(remoteEnvelope) {
    const localEnvelope = await local.get(remoteEnvelope.stream, remoteEnvelope.entityId);
    if (!localEnvelope) return local.put(remoteEnvelope, { pending: false });
    if (localEnvelope.envelopeId === remoteEnvelope.envelopeId) return localEnvelope;

    const policy = mergePolicyFor(remoteEnvelope.stream);
    if (policy === 'APPEND_ONLY') return local.put(remoteEnvelope, { pending: false, append: true });
    if (policy === 'LAST_WRITE_WINS') {
      const winner = Date.parse(remoteEnvelope.createdAt) >= Date.parse(localEnvelope.createdAt) ? remoteEnvelope : localEnvelope;
      await local.put(winner, { pending: winner === localEnvelope });
      return winner;
    }

    if (remoteEnvelope.baseRevision === localEnvelope.revision) {
      await local.put(remoteEnvelope, { pending: false });
      return remoteEnvelope;
    }

    const conflict = createConflict({ local: localEnvelope, remote: remoteEnvelope, reason: 'REVISION_DIVERGENCE', now: clock });
    await local.put(createSyncEnvelope({
      deviceId,
      actorId: 'boxfire',
      stream: SYNC_STREAM.CONFLICT,
      entityId: conflict.conflictId,
      operation: SYNC_OPERATION.APPEND,
      payload: conflict,
    }, { now: clock }), { pending: true, append: true });
    return conflict;
  }

  function snapshot(override) {
    return Object.freeze({ status: override || status, lastError, lastSyncAt, deviceId });
  }

  return Object.freeze({ publish, sync, ingest, status: snapshot });
}
