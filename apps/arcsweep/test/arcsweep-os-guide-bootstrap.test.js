import test from 'node:test';
import assert from 'node:assert/strict';

test('bootstrapped Guide reads context, navigates through OS, and obeys Feather', async () => {
  const previous = globalThis.__arcsweepOS;
  delete globalThis.__arcsweepOS;
  const module = await import(`../src/os/bootstrap.js?guide-bootstrap-test=${Date.now()}`);
  const os = module.arcsweepOS;

  const context = await os.guide.request('os.context');
  assert.equal(context.status, 'applied');
  assert.equal(context.output.schema, 'arcsweep.os-context-summary/v1');
  assert.equal(context.output.active_room, 'portal');

  const navigate = await os.guide.request('os.navigate', {
    room: 'forge',
    patch: { world_id: 'terra-aeterna', project_id: 'runa-kelyran', current_goal: 'guide the OS' },
  });
  assert.equal(navigate.status, 'applied');

  const after = await os.guide.request('os.context');
  assert.equal(after.output.active_room, 'forge');
  assert.equal(after.output.active_world_id, 'terra-aeterna');
  assert.equal(after.output.current_goal, 'guide the OS');

  const outsideAllowlist = await os.guide.request('sidecars.mount-pack', { pack: 'house' });
  assert.equal(outsideAllowlist.status, 'rejected');
  assert.equal(outsideAllowlist.reason, 'guide-capability-not-allowed');

  os.setFeatherPaused(true);
  const pausedNavigation = await os.guide.request('os.navigate', { room: 'records' });
  assert.equal(pausedNavigation.status, 'rejected');
  assert.equal(pausedNavigation.reason, 'feather-paused');

  const pausedRead = await os.guide.request('os.context');
  assert.equal(pausedRead.status, 'applied');
  const diagnostics = os.snapshot();
  assert.ok(diagnostics.security_tripwires.some((item) => item.reason === 'feather-paused'));
  assert.ok(diagnostics.guide.allowed_capabilities.some((item) => item.capability_id === 'os.navigate'));
  assert.deepEqual(diagnostics.authority_leases, []);

  delete globalThis.__arcsweepOS;
  if (previous) globalThis.__arcsweepOS = previous;
});
