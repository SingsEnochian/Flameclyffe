import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../src/aspects/aspect-mesh-runtime.js', import.meta.url), 'utf8');

test('Aspect Mesh exposes coalition start and completion lifecycle events', () => {
  assert.match(source, /coalitionStarted:\s*'arcsweep:aspect-mesh-coalition-started'/);
  assert.match(source, /coalitionComplete:\s*'arcsweep:aspect-mesh-coalition-complete'/);
});

test('coalition start is emitted before coalition work begins', () => {
  const started = source.indexOf('ASPECT_MESH_EVENTS.coalitionStarted');
  const run = source.indexOf('const result = await runAspectCoalition');
  const complete = source.indexOf('ASPECT_MESH_EVENTS.coalitionComplete');
  assert.ok(started >= 0 && run >= 0 && complete >= 0);
  assert.ok(started < run, 'coalitionStarted should be visible before work begins');
  assert.ok(run < complete, 'coalitionComplete should follow coalition work');
});
