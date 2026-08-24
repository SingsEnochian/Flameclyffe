import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const canonicalSurfaces = Object.freeze([
  '../index.html',
  '../bifrost/index.html',
  '../src/premaqc-contract.js',
  '../src/premaqc-shokz-soundfont.js',
  '../src/premaqc-shokz-feather-stop-bridge.js',
  '../src/two-shore-premaqc-gate.js',
  '../src/world-premaqc-registry.js',
  '../bifrost/premaqc-song.js',
  '../bifrost/two-shore-premaqc.js',
  '../public/modules/bifrost-arcsweep.module.json',
  '../../../starwell/deep-observer/schemas/premaqc-state-v2.schema.json',
]);

const bareLegacy = /PREMAQ(?!C)/g;

test('canonical PREMAQC entry surfaces never present PREMAQ as current vocabulary', async () => {
  for (const relativePath of canonicalSurfaces) {
    const source = await readFile(new URL(relativePath, import.meta.url), 'utf8');
    const matches = [...source.matchAll(bareLegacy)];
    if (!matches.length) continue;

    // Compatibility declarations are allowed only when the same local context explicitly labels them legacy.
    for (const match of matches) {
      const start = Math.max(0, match.index - 180);
      const end = Math.min(source.length, match.index + 220);
      const context = source.slice(start, end);
      assert.match(
        context,
        /legacy|compatibility/i,
        `${relativePath} emits bare PREMAQ outside an explicit legacy/compatibility declaration`,
      );
    }
  }
});

test('canonical Bifröst UI has no Q compression option and states six dynamic PREMAQC voices', async () => {
  const html = await readFile(new URL('../bifrost/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /<option value="Q"/);
  assert.match(html, /Six dynamic voices across thirty-five chained cycles/);
  assert.match(html, /P · C · R · E · M · A/);
  assert.match(html, /Q · firsthand context only · not sonified/);
  assert.doesNotMatch(html, bareLegacy);
});
