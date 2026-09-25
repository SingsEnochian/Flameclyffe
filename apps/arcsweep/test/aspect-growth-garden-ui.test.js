import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('runtime integration mounts the Growth Garden sidecar', async () => {
  const source = await readFile(new URL('../src/runtime-integration-bootstrap.js', import.meta.url), 'utf8');
  assert.match(source, /aspect-growth-garden-sidecar\.js/);
});

test('Growth Garden UI is descriptive, provenance-shaped, and not a ranking system', async () => {
  const source = await readFile(new URL('../src/aspect-growth-garden-sidecar.js', import.meta.url), 'utf8');
  assert.match(source, /Patterns describe history\. They do not dictate identity\./);
  assert.match(source, /trace rings/);
  assert.match(source, /Discovered skills/);
  assert.match(source, /Role possibilities/);
  assert.match(source, /Preferences & relationships/);
  assert.match(source, /Carried self-observations/);
  assert.match(source, /Peer observations/);
  assert.match(source, /Recurring threads/);
  assert.match(source, /Open curiosities/);
  assert.match(source, /Unfinished paths/);
  assert.doesNotMatch(source, /progress-bar|xp\b|level\s*\d|score\s*[:=]/i);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
});

test('Garden UI reads the live mesh snapshot instead of creating another memory store', async () => {
  const source = await readFile(new URL('../src/aspect-growth-garden-sidecar.js', import.meta.url), 'utf8');
  assert.match(source, /readAspectMeshRuntime\(\)\?\.growthSnapshot/);
  assert.match(source, /ASPECT_MESH_EVENTS\.growthChanged/);
  assert.doesNotMatch(source, /appendHouseCommons|saveLocalJson|indexedDB/i);
});
