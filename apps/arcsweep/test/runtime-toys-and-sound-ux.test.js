import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { summarizeSidecarHealth } from '../src/sidecar-health-panel.js';

test('sidecar health distinguishes lazy absence from actual critical failure', () => {
  const lazy = summarizeSidecarHealth({ schema: 'arcsweep.sidecar-scheduler/v1', loaded: [], failures: [], packs: [] });
  assert.equal(lazy.state, 'awaiting-lazy-organs');
  const failed = summarizeSidecarHealth({ schema: 'arcsweep.sidecar-scheduler/v1', loaded: [], failures: [{ specifier: './house-chat-authoritative-surface.js', pack: 'house', message: 'boom' }], packs: [] });
  assert.equal(failed.state, 'critical-failure');
});

test('House browser smoke is explicit, synthetic, receipted, and reload-aware', async () => {
  const source = await readFile(new URL('../src/house-browser-smoke.js', import.meta.url), 'utf8');
  assert.match(source, /Synthetic route check only/);
  assert.match(source, /validation_only/);
  assert.match(source, /runHouseBrowserSmoke/);
  assert.match(source, /verifyPendingHouseSmokeReload/);
  assert.match(source, /data-full/);
  assert.doesNotMatch(source, /runHouseBrowserSmoke\(\);\s*$/m);
});

test('Sound Room exposes one in-room instrument rail over existing organs', async () => {
  const source = await readFile(new URL('../src/sound-organ-navigation.js', import.meta.url), 'utf8');
  assert.match(source, /mountSoundInstrumentRail/);
  assert.match(source, /data-sound-instrument-rail/);
  assert.match(source, /SOUND_ORGANS\.forEach/);
  assert.doesNotMatch(source, /new StorySoundscape/);
});

test('Sound Bank UX reports loading, ready, error and remembers preset per world', async () => {
  const source = await readFile(new URL('../src/soundfont-runtime-repair.js', import.meta.url), 'utf8');
  const status = await readFile(new URL('../src/soundfont-status.js', import.meta.url), 'utf8');
  assert.match(source, /loading-bank/);
  assert.match(source, /bank-file-loading/);
  assert.match(source, /bank-file-ready/);
  assert.match(source, /bank-file-error/);
  assert.match(source, /bank-ready/);
  assert.match(source, /preset-selected/);
  assert.match(source, /audition-started/);
  assert.match(source, /arcsweep\.soundfont\.preference\/v1/);
  assert.match(status, /no bank loaded/);
  assert.match(source, /bankAttempts/);
});

test('new toys are real Vite build dependencies and House smoke stays lazy with House', async () => {
  const source = await readFile(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');
  assert.match(source, /semantic-lab-sidecar\.js/);
  assert.match(source, /sidecar-health-panel\.js/);
  assert.match(source, /house-browser-smoke\.js/);
  assert.match(source, /import\.meta\.glob/);
  const globalBlock = source.slice(source.indexOf('const GLOBAL_SIDECARS'), source.indexOf('const SIDECAR_PACKS'));
  assert.doesNotMatch(globalBlock, /house-browser-smoke/);
});
