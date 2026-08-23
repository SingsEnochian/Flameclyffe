import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('web Arcsweep and Bifröst load one global PREMAQC Shokz Feather Stop bridge', async () => {
  const [arcsweep, bifrost, canonicalBridge, legacyBridge] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../bifrost/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../src/premaqc-shokz-feather-stop-bridge.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/premaq-shokz-feather-stop-bridge.js', import.meta.url), 'utf8'),
  ]);

  assert.match(arcsweep, /premaqc-shokz-feather-stop-bridge\.js/);
  assert.match(bifrost, /premaqc-shokz-feather-stop-bridge\.js/);
  assert.match(canonicalBridge, /hearthgate\.premaqc-shokz-feather-stop-bridge\/v1/);
  assert.match(canonicalBridge, /legacy_status/);
  assert.match(legacyBridge, /#feather-stop/);
  assert.match(legacyBridge, /#stop-premaq-song/);
  assert.match(legacyBridge, /hearthgate:feather-stop/);
  assert.match(legacyBridge, /GLOBAL FEATHER STOP/);
  assert.match(legacyBridge, /pointerdown/);
  assert.match(legacyBridge, /keydown/);
});
