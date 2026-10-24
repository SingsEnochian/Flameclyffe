import test from 'node:test';
import assert from 'node:assert/strict';
import { registerWayglassSurface, mountWayglassSurface } from '../src/surface-registry.js';

test('switching Wayglass rooms invokes instrument teardown exactly once per exit', async () => {
  const history=[], root={};
  registerWayglassSurface({
    surface_id:'test:living-observer-lifecycle',
    mount: async () => { history.push('observer:mount'); return () => history.push('observer:cleanup'); },
  });
  registerWayglassSurface({
    surface_id:'test:plain-room-lifecycle',
    mount: async () => { history.push('room:mount'); },
  });
  await mountWayglassSurface('test:living-observer-lifecycle',root);
  await mountWayglassSurface('test:plain-room-lifecycle',root);
  await mountWayglassSurface('test:plain-room-lifecycle',root);
  assert.deepEqual(history,['observer:mount','observer:cleanup','room:mount','room:mount']);
});

test('unknown rooms do not tear down an active view', async () => {
  const history=[],root={};
  registerWayglassSurface({
    surface_id:'test:observer-no-destructive-unknown',
    mount:()=>()=>history.push('cleanup'),
  });
  await mountWayglassSurface('test:observer-no-destructive-unknown',root);
  await assert.rejects(mountWayglassSurface('nonexistent:room',root),/Unknown Wayglass surface/);
  assert.deepEqual(history,[]);
});
