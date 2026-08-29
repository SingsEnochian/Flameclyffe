import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sourceUrl = new URL('../src/sidecar-bootstrap.js', import.meta.url);

test('normal boot mounts only the small global sidecar spine', async () => {
  const source = await readFile(sourceUrl, 'utf8');
  const start = source.indexOf('const GLOBAL_SIDECARS');
  const end = source.indexOf('const SIDECAR_PACKS');
  const globalBlock = source.slice(start, end);

  assert.match(globalBlock, /observer-bridge\.js/);
  assert.match(globalBlock, /rich-text-core\.js/);
  assert.match(globalBlock, /soundfont-runtime-repair\.js/);
  assert.match(globalBlock, /creative-organ-navigation\.js/);
  assert.doesNotMatch(globalBlock, /house-commons-chat-v5\.js/);
  assert.doesNotMatch(globalBlock, /house-chat-pretty-v2\.js/);
  assert.doesNotMatch(globalBlock, /feedback-chamber-v2\.js/);
  assert.doesNotMatch(globalBlock, /aemeth-chamber-live\.js/);
  assert.doesNotMatch(globalBlock, /worldseed-live-ui\.js/);
});

test('room-specific systems are loaded as lazy packs and still remain in the Vite build graph', async () => {
  const source = await readFile(sourceUrl, 'utf8');
  assert.match(source, /const SIDECAR_PACKS/);
  assert.match(source, /mountSidecarPack/);
  assert.match(source, /import\.meta\.glob\(/);
  assert.match(source, /#commons-form/);
  assert.match(source, /#record-form\[data-room-id="aemeth-lens"\]/);

  for (const specifier of [
    './house-commons-chat-v5.js',
    './house-roleplay-mode.js',
    './formatted-text-vestments.js',
    './house-chat-pretty-v2.js',
    './house-chat-pretty-v3.js',
    './aemeth-chamber-live.js',
    './aemeth-oa-route-status.js',
    './feedback-chamber-v2.js',
  ]) {
    const occurrences = source.split(`'${specifier}'`).length - 1;
    assert.equal(occurrences, 2, `${specifier} must appear once in its lazy pack and once in the Vite loader graph`);
  }
});

test('Terra Prime is not re-synchronised by the post-boot sidecar scheduler', async () => {
  const source = await readFile(sourceUrl, 'utf8');
  assert.doesNotMatch(source, /terra-prime-waking-world-sidecar\.js/);
});

test('House visual decorators preserve their lineage without returning to global boot', async () => {
  const source = await readFile(sourceUrl, 'utf8');
  const start = source.indexOf('house: Object.freeze([');
  const end = source.indexOf('writing: Object.freeze([', start);
  const house = source.slice(start, end);
  const vestments = house.indexOf("'./house-chat-vestments-v1.js'");
  const v2 = house.indexOf("'./house-chat-pretty-v2.js'");
  const v3 = house.indexOf("'./house-chat-pretty-v3.js'");
  const runtime = house.indexOf("'./runtime-envelope-live-ui.js'");
  assert.ok(vestments >= 0 && v2 > vestments && v3 > v2 && runtime > v3);
});

test('sidecars yield between imports and expose a diagnostic full-load escape hatch', async () => {
  const source = await readFile(sourceUrl, 'utf8');
  assert.match(source, /requestIdleCallback/);
  assert.match(source, /await yieldToBrowser\(\)/);
  assert.match(source, /sidecars.*full/);
  assert.match(source, /arcsweep\.sidecar-scheduler\/v1/);
});
