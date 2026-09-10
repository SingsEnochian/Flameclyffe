import test from 'node:test';
import assert from 'node:assert/strict';
import { createContextPersistence } from '../src/os/context-persistence.js';
import { createSessionState, createContextCapsule, advanceSession } from '../src/os/kernel.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
  };
}

test('context persistence saves and restores the active OS session and capsule lineage', () => {
  const storage = memoryStorage();
  const persistence = createContextPersistence({ storage });
  const start = createSessionState({
    active_world_id: 'terra-aeterna',
    active_project_id: 'runa-kelyran',
    active_room: 'portal',
    current_goal: 'make the OS remember',
  });
  const capsule = createContextCapsule({
    session: start,
    previousRoom: 'portal',
    currentRoom: 'forge',
    relevantObjects: ['lexeme:meda'],
  });
  const session = advanceSession(start, capsule);

  assert.equal(persistence.save({ session, capsules: [capsule] }), true);
  const restored = persistence.load();
  assert.equal(restored.session.session_id, session.session_id);
  assert.equal(restored.session.active_room, 'forge');
  assert.equal(restored.session.active_world_id, 'terra-aeterna');
  assert.equal(restored.session.current_goal, 'make the OS remember');
  assert.equal(restored.capsules.length, 1);
  assert.equal(restored.capsules[0].capsule_id, capsule.capsule_id);
});

test('context persistence rejects corrupt or foreign storage instead of inventing state', () => {
  const storage = memoryStorage();
  const persistence = createContextPersistence({ storage });
  storage.setItem(persistence.key, '{not-json');
  assert.equal(persistence.load(), null);
  storage.setItem(persistence.key, JSON.stringify({ schema: 'foreign.state/v9', session: {} }));
  assert.equal(persistence.load(), null);
});

test('context persistence is optional when browser storage is unavailable', () => {
  const persistence = createContextPersistence({ storage: null });
  assert.equal(persistence.available(), false);
  assert.equal(persistence.load(), null);
  assert.equal(persistence.save({ session: createSessionState(), capsules: [] }), false);
  assert.equal(persistence.clear(), false);
});
