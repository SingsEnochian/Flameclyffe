import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspaceContextStore, WORKSPACE_STORAGE_KEY } from '../src/os/workspace-context.js';

function storageHarness() {
  const map = new Map();
  return {
    getItem: (key) => map.has(key) ? map.get(key) : null,
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: (key) => { map.delete(key); },
    raw: () => map,
  };
}

test('durable workspace context keeps bounded navigation continuity across browser sessions', () => {
  const storage = storageHarness();
  const store = createWorkspaceContextStore({ storage, now: () => new Date('2026-09-10T18:00:00.000Z') });
  assert.equal(store.available(), true);
  assert.equal(store.save({
    session_id: 'ephemeral-session-do-not-save',
    active_world_id: 'terra-aeterna',
    active_project_id: 'runa-kelyran',
    active_scene_id: 'scene:1',
    active_document_id: 'doc:1',
    active_room: 'forge',
    current_goal: 'finish the runnable OS',
    presence_mode: 'companion',
    operator_id: 'private-operator',
  }), true);

  const restored = store.load();
  assert.equal(restored.active_world_id, 'terra-aeterna');
  assert.equal(restored.active_project_id, 'runa-kelyran');
  assert.equal(restored.active_room, 'forge');
  assert.equal(restored.current_goal, 'finish the runnable OS');
  assert.equal(restored.session_id, undefined);
  assert.equal(restored.operator_id, undefined);
  assert.equal(storage.raw().has(WORKSPACE_STORAGE_KEY), true);
});

test('workspace context rejects foreign/corrupt state and bounds free text', () => {
  const storage = storageHarness();
  const store = createWorkspaceContextStore({ storage });
  storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify({ schema: 'foreign/v1', active_room: 'records' }));
  assert.equal(store.load(), null);
  storage.setItem(WORKSPACE_STORAGE_KEY, '{broken');
  assert.equal(store.load(), null);

  const longGoal = 'x'.repeat(600);
  const safe = store.sanitize({ active_room: 'forge', current_goal: longGoal });
  assert.equal(safe.current_goal.length, 240);
});
