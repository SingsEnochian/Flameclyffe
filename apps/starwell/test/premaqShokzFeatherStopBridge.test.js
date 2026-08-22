import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('web Arcsweep and Bifröst load one global PREMAQ Shokz Feather Stop bridge', async () => {
  const [arcsweep, bifrost, bridge] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../bifrost/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../src/premaq-shokz-feather-stop-bridge.js', import.meta.url), 'utf8'),
  ]);

  assert.match(arcsweep, /premaq-shokz-feather-stop-bridge\.js/);
  assert.match(bifrost, /premaq-shokz-feather-stop-bridge\.js/);
  assert.match(bridge, /#feather-stop/);
  assert.match(bridge, /#stop-premaq-song/);
  assert.match(bridge, /hearthgate:feather-stop/);
  assert.match(bridge, /GLOBAL FEATHER STOP/);
  assert.match(bridge, /pointerdown/);
  assert.match(bridge, /keydown/);
});
