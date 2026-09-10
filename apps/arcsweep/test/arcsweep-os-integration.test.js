import test from 'node:test';
import assert from 'node:assert/strict';
import { installArcSweepOS } from '../src/os/bootstrap.js';
import { createRoomNavigation } from '../src/os/room-navigation.js';
import { createWorkspaceContext } from '../src/os/workspace-context.js';
import { createFault, runRepairTransaction } from '../src/os/caretaker.js';
import { createCheckpointStore } from '../src/os/kernel.js';

function fixture() {
  let active = 'portal';
  let blocked = false;
  const buttons = ['portal', 'forge', 'records'].map(room => ({ dataset: { room }, click() { if (!blocked) active = room; } }));
  const document = { querySelectorAll: () => buttons, querySelector: () => buttons.find(button => button.dataset.room === active) };
  const navigation = createRoomNavigation({ document, settle: async () => {} });
  const cache = new Map();
  const storage = { getItem: key => cache.get(key) ?? null, setItem: (key, value) => cache.set(key, value), removeItem: key => cache.delete(key) };
  let disk = { activeWorldId: 'terra-aeterna', drawings: ['untouched'] };
  const workspace = createWorkspaceContext({ load: async () => structuredClone(disk), save: async value => { disk = structuredClone(value); }, read: async key => structuredClone(disk[key] ?? null), set() {}, clear() {} });
  const start = () => { delete globalThis.__arcsweepOS; return installArcSweepOS({ navigation, storage, workspace }); };
  return { navigation, storage, workspace, start, disk: () => disk, block: () => { blocked = true; }, resetRoom: () => { active = 'portal'; } };
}

test('Guide observes room, preserves world and drawing, persists receipt, and restores after restart', async () => {
  const f = fixture();
  const os = f.start();
  const receipt = await os.guide.request('os.navigate', { room: 'forge', patch: { world_id: 'invented-world', project_id: 'runa', current_goal: 'draw meda' } });
  assert.equal(receipt.status, 'applied');
  assert.equal(f.navigation.activeRoom(), 'forge');
  assert.equal(os.session().active_world_id, 'terra-aeterna');
  assert.deepEqual(f.disk().drawings, ['untouched']);
  assert.ok((await f.workspace.read()).receipts.some(item => item.call_id === receipt.call_id));
  assert.equal(os.snapshot().workspace_persistence.cloud_verified, false);
  os.persistence.clear();
  f.resetRoom();
  const restarted = f.start();
  await restarted.ready;
  assert.equal(f.navigation.activeRoom(), 'forge');
  assert.equal(restarted.session().current_goal, 'draw meda');
  assert.equal(restarted.session().active_project_id, 'runa');
  assert.ok(restarted.snapshot().capability_receipts.some(item => item.call_id === receipt.call_id));
});

test('missing or ineffective room controls cannot advance the context', async () => {
  const f = fixture(); const os = f.start(); await os.ready;
  assert.equal((await os.guide.request('os.navigate', { room: 'missing' })).status, 'rejected');
  f.block();
  assert.notEqual((await os.guide.request('os.navigate', { room: 'forge' })).status, 'applied');
  assert.equal(os.session().active_room, 'portal');
  assert.equal(os.capsules().length, 0);
});

test('real context cache service repairs corruption once and honours Feather and budget', async () => {
  const f = fixture(); const os = f.start(); await os.ready;
  os.setFeatherPaused(true);
  f.storage.setItem(os.persistence.key, 'broken');
  await os.inspect();
  assert.equal(os.persistence.capture(), 'broken');
  assert.equal(os.snapshot().repair_receipts.length, 0);
  os.setFeatherPaused(false);
  f.storage.setItem(os.persistence.key, 'broken');
  await os.inspect(); await os.flush();
  assert.equal(os.persistence.load().session.session_id, os.session().session_id);
  assert.equal(os.snapshot().repair_receipts.at(-1).result, 'committed');
  f.storage.setItem(os.persistence.key, 'broken-again');
  await os.inspect(); await os.flush();
  assert.equal(os.persistence.capture(), 'broken-again');
  assert.equal(os.snapshot().repair_receipts.at(-1).result, 'escalated');
});

test('workspace readback detects a silently dropped write', async () => {
  const workspace = createWorkspaceContext({ load: async () => ({}), save: async () => {}, read: async () => null, set() {}, clear() {} });
  await assert.rejects(workspace.write({ value: 'new' }), /readback mismatch/);
});

for (const mode of ['missing-contract', 'capture-fails', 'verified', 'unverified', 'rollback-throws']) {
  test(`repair failure evidence: ${mode}`, async () => {
    let actual = 'before'; let applied = false;
    const options = {
      fault: createFault({ service_id: 'derived-cache', fault_class: 'DERIVED-STATE' }),
      checkpointStore: createCheckpointStore(),
      captureState: () => { if (mode === 'capture-fails') throw new Error('storage denied'); return actual; },
      apply: () => { applied = true; actual = 'bad-repair'; },
      validate: () => ({ ok: false, check: 'injected-failure' }),
      rollback: ({ priorState }) => { if (mode === 'rollback-throws') throw new Error('restore denied'); if (mode !== 'unverified') actual = priorState; },
      verifyRollback: ({ priorState }) => actual === priorState,
    };
    if (mode === 'missing-contract') delete options.rollback;
    const receipt = await runRepairTransaction(options);
    if (['missing-contract', 'capture-fails'].includes(mode)) {
      assert.equal(receipt.result, 'contained'); assert.equal(applied, false); assert.equal(actual, 'before');
    } else if (mode === 'verified') {
      assert.equal(receipt.result, 'rolled-back'); assert.equal(actual, 'before');
    } else {
      assert.equal(receipt.result, 'escalated'); assert.equal(receipt.reversible, false); assert.equal(actual, 'bad-repair');
    }
  });
}

test('unreadable workspace is preserved when subsequent capability receipts arrive', async () => {
  delete globalThis.__arcsweepOS;
  let writes = 0;
  const f = fixture();
  const os = installArcSweepOS({ navigation: f.navigation, storage: f.storage, workspace: {
    read: async () => { throw new Error('disk unavailable'); },
    write: async () => { writes++; }, activeContext: async () => ({}),
  } });
  await os.guide.request('os.context');
  assert.equal(writes, 0);
  assert.equal(os.snapshot().workspace_persistence.status, 'restore-failed');
});

test('Feather interrupts navigation while active workspace context is being resolved', async () => {
  delete globalThis.__arcsweepOS;
  const f = fixture(); let release; let entered;
  const reached = new Promise(resolve => { entered = resolve; });
  const os = installArcSweepOS({ navigation: f.navigation, storage: f.storage, workspace: {
    read: async () => null, write: async () => ({}),
    activeContext: () => { entered(); return new Promise(resolve => { release = resolve; }); },
  } });
  const call = os.guide.request('os.navigate', { room: 'forge' });
  await reached; os.setFeatherPaused(true); release({});
  assert.notEqual((await call).status, 'applied');
  assert.equal(f.navigation.activeRoom(), 'portal');
});
