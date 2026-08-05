import test from 'node:test';
import assert from 'node:assert/strict';
import { createBifrostSyncBridge } from '../src/bifrost-sync/bridge.js';
import { createMemorySyncStore } from '../src/bifrost-sync/memory-store.js';
import { SYNC_OPERATION, SYNC_STREAM } from '../src/bifrost-sync/contracts.js';
import { createDesktopLoopbackRemote } from '../src/bifrost-sync/adapters/desktop-loopback.js';

const clock = () => new Date('2026-08-05T16:45:00.000Z');

test('offline publish remains in outbox and reports offline', async () => {
  const local = createMemorySyncStore();
  const bridge = createBifrostSyncBridge({ deviceId: 'web-ipad', local, clock });
  await bridge.publish({ stream: SYNC_STREAM.SETTINGS, entityId: 'active-world', operation: SYNC_OPERATION.UPSERT, payload: { world: 'terra-aeterna' } });
  assert.equal((await local.outbox()).length, 1);
  assert.equal((await bridge.sync()).status, 'OFFLINE');
});

test('web and desktop exchange envelopes through one remote', async () => {
  const relay = [];
  const remote = {
    async push(items) { relay.push(...items); return { acceptedIds: items.map(x => x.envelopeId) }; },
    async pull() { return { items: relay, cursor: relay.at(-1)?.createdAt || null }; },
  };
  const webStore = createMemorySyncStore();
  const desktopStore = createMemorySyncStore();
  const web = createBifrostSyncBridge({ deviceId: 'web', local: webStore, remote, clock });
  const desktop = createBifrostSyncBridge({ deviceId: 'desktop', local: desktopStore, remote, clock });

  await web.publish({ stream: SYNC_STREAM.RECEIPT, entityId: 'receipt-1', operation: SYNC_OPERATION.APPEND, payload: { organ: 'tone' } });
  assert.equal((await web.sync()).status, 'SYNCED');
  assert.equal((await desktop.sync()).status, 'SYNCED');
  assert.equal((await desktopStore.list(SYNC_STREAM.RECEIPT)).length, 1);
});

test('divergent canon writes create an explicit Boxfire conflict', async () => {
  const local = createMemorySyncStore();
  const bridge = createBifrostSyncBridge({ deviceId: 'desktop', local, clock });
  await bridge.publish({ stream: SYNC_STREAM.CANON, entityId: 'terra:falka', operation: SYNC_OPERATION.UPSERT, payload: { name: 'Falka' } });
  const remote = {
    schema: 'hearthgate.bifrost-sync/v1', envelopeId: 'remote-1', deviceId: 'web', actorId: 'rowan',
    stream: SYNC_STREAM.CANON, entityId: 'terra:falka', operation: SYNC_OPERATION.UPSERT,
    baseRevision: 0, revision: 1, payload: { name: 'Falka Hearthlight' }, sourceRuntime: 'web', createdAt: clock().toISOString(),
  };
  const result = await bridge.ingest(remote);
  assert.equal(result.status, 'OPEN');
  assert.equal(result.reason, 'REVISION_DIVERGENCE');
  assert.equal((await local.list(SYNC_STREAM.CONFLICT)).length, 1);
});

test('desktop bridge refuses non-loopback hosts', () => {
  assert.throws(() => createDesktopLoopbackRemote({ baseUrl: 'https://example.com', pairingToken: 'x' }), /loopback-only/);
});
