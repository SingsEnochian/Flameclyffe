import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  registerWayglassSurface,
  registerWayglassSurfaceAlias,
  resolveWayglassSurfaceId,
  listWayglassSurfaces,
  listWayglassSurfaceAliases,
} from '../src/surface-registry.js';
import { resolveWayglassEntry, WAYGLASS_ENTRY_SURFACE } from '../src/wayglass-entry.js';
import { FIRST_WAYGLASS_ORGANS } from '../src/organ-donors.js';

test('legacy ArcSweep surface ids are aliases into canonical Wayglass rooms', () => {
  const canonical = 'wayglass:test-native-room';
  const legacy = 'arcsweep:test-native-room';
  registerWayglassSurface({ surface_id: canonical, label: 'Native test room', mount() {} });
  registerWayglassSurfaceAlias(legacy, canonical);

  assert.equal(resolveWayglassSurfaceId(legacy), canonical);
  assert.ok(listWayglassSurfaces().some(surface => surface.surface_id === canonical));
  assert.equal(listWayglassSurfaces().some(surface => surface.surface_id === legacy), false);
  assert.ok(listWayglassSurfaceAliases().some(item => item.alias_id === legacy && item.target_id === canonical));
});

test('Wayglass entry map canonically routes writing and world deck inside Wayglass', () => {
  const available = [
    { surface_id: WAYGLASS_ENTRY_SURFACE },
    { surface_id: 'wayglass:writing-room' },
    { surface_id: 'wayglass:world-continuity' },
  ];
  assert.equal(resolveWayglassEntry({ available, room: 'writing' }).surface_id, 'wayglass:writing-room');
  assert.equal(resolveWayglassEntry({ available, room: 'deck' }).surface_id, 'wayglass:world-continuity');
  assert.equal(resolveWayglassEntry({ available, room: 'worlds' }).surface_id, 'wayglass:world-continuity');
});

test('ArcSweep world and continuity lineage is a registered Wayglass organ', () => {
  const organ = FIRST_WAYGLASS_ORGANS.find(item => item.organ_id === 'wayglass.organ.world-continuity-core');
  assert.ok(organ);
  assert.equal(organ.maturity, 'FUNCTIONAL');
  assert.ok(organ.lineage.includes('arcsweep:world-registry'));
  assert.ok(organ.capabilities.includes('world.registry.select-active'));
  assert.ok(organ.capabilities.includes('continuity.evidence.inspect'));
  assert.equal(typeof organ.adapter.loadState, 'function');
  assert.equal(typeof organ.adapter.buildRuntimeWorldContext, 'function');
});

test('canonical Wayglass registration no longer mounts the old ArcSweep iframe deck', async () => {
  const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  const nativeSurface = await readFile(new URL('../src/surfaces/world-continuity.js', import.meta.url), 'utf8');
  const writingRoom = await readFile(new URL('../src/surfaces/arcsweep-writing.js', import.meta.url), 'utf8');

  assert.doesNotMatch(main, /mountArcSweepDeckSurface/);
  assert.doesNotMatch(main, /surface_id:\s*['"]arcsweep:deck['"]/);
  assert.match(main, /surface_id:\s*['"]wayglass:world-continuity['"]/);
  assert.match(main, /registerWayglassSurfaceAlias\(['"]arcsweep:deck['"],\s*['"]wayglass:world-continuity['"]\)/);

  assert.doesNotMatch(nativeSurface, /<iframe/i);
  assert.doesNotMatch(nativeSurface, /['\"]\/arcsweep\//, 'native surface must not contain a runtime /arcsweep/ URL');
  assert.match(nativeSurface, /loadState/);
  assert.match(nativeSurface, /saveState/);
  assert.match(nativeSurface, /buildRuntimeWorldContext/);

  assert.match(writingRoom, /data-surface=\\\"wayglass-writing-room\\\"/);
  assert.doesNotMatch(writingRoom, /data-surface=\\\"arcsweep-writing\\\"/);
});
