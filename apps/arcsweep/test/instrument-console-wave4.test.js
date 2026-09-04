import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { APPLET_CATALOGUE, contextualAppletLaunchTarget } from '../src/applets.js';
import {
  BRAID_GLYPH_SCHEMA,
  appletHealth,
  braidGlyph,
  buildAppletCompletenessMatrix,
  contextualLaunchUrl,
  normaliseFavourites,
} from '../src/instrument-console.js';

test('contextual launch preserves existing query plus active World identity', () => {
  const context = { worldId: 'terra-prime', worldName: 'Terra Prime', worldseedFingerprint: 'sha256:abc' };
  const href = contextualLaunchUrl('/Flameclyffe/apps/arcsweep/?soundOrgan=runa', context, 'runa');
  assert.match(href, /soundOrgan=runa/);
  assert.match(href, /worldId=terra-prime/);
  assert.match(href, /worldName=Terra(?:\+|%20)Prime/);
  assert.match(href, /worldseed=sha256%3Aabc/);
  assert.match(href, /from=arcsweep/);
  assert.match(href, /appletId=runa/);
});

test('applet router carries instrument context instead of dropping the active World', () => {
  const originalLocation = globalThis.location;
  globalThis.location = { origin: 'https://singsenochian.github.io' };
  try {
    const href = contextualAppletLaunchTarget('runa', { worldId: 'terra', worldName: 'Terra Prime', worldseedFingerprint: 'seed' });
    assert.match(href, /worldId=terra/);
    assert.match(href, /appletId=runa/);
  } finally {
    globalThis.location = originalLocation;
  }
});

test('applet completeness matrix covers every World × every registered applet', () => {
  const state = {
    worlds: [
      { id: 'a', name: 'A', applets: APPLET_CATALOGUE.map((item) => ({ id: item.id, visible: true })) },
      { id: 'b', name: 'B', applets: APPLET_CATALOGUE.map((item) => ({ id: item.id, visible: false })) },
    ],
  };
  const matrix = buildAppletCompletenessMatrix(state);
  assert.equal(matrix.rows.length, APPLET_CATALOGUE.length * 2);
  assert.equal(matrix.rows.filter((row) => row.worldId === 'a' && row.selected).length, APPLET_CATALOGUE.length);
  assert.equal(matrix.rows.filter((row) => row.worldId === 'b' && row.selected).length, 0);
});

test('favourites are deduplicated and unknown applets are ignored', () => {
  const known = APPLET_CATALOGUE[0].id;
  assert.deepEqual(normaliseFavourites([known, known, 'definitely-not-an-applet']), [known]);
});

test('organ health distinguishes native, configured, live and offline states', () => {
  const native = APPLET_CATALOGUE.find((item) => !item.pagesHref);
  const external = APPLET_CATALOGUE.find((item) => item.pagesHref);
  assert.equal(appletHealth(native).state, 'registered');
  assert.equal(appletHealth(external).state, 'configured');
  assert.equal(appletHealth(external, { ok: true }).state, 'verified-live');
  assert.equal(appletHealth(external, { ok: false }).state, 'offline');
});

test('standard braid glyph contract keeps verified and not-observed states explicit', () => {
  const absent = braidGlyph(null);
  assert.equal(absent.schema, BRAID_GLYPH_SCHEMA);
  assert.equal(absent.glyph, '◇');
  assert.equal(absent.state, 'not-observed');
  const verified = braidGlyph({ event_type: 'model-reply-receipted', event_id: 'evt', event_sequence: 7 });
  assert.equal(verified.glyph, '◈');
  assert.equal(verified.state, 'verified');
  assert.match(verified.label, /#7/);
});

test('instrument console ships search, filters, favourites, health probing and matrix', async () => {
  const source = await readFile(new URL('../src/instrument-console-sidecar.js', import.meta.url), 'utf8');
  for (const marker of ['Find applet', 'Category', 'Favourites only', 'Probe launch targets', 'Instrument Console', 'instrument-matrix']) assert.match(source, new RegExp(marker));
});

test('Worlds pack includes the instrument console and House braid UI uses shared glyph semantics', async () => {
  const bootstrap = await readFile(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');
  const braid = await readFile(new URL('../src/house-braid-receipt-ui.js', import.meta.url), 'utf8');
  assert.match(bootstrap, /instrument-console-sidecar\.js/);
  assert.match(braid, /import \{ braidGlyph \} from '\.\/instrument-console\.js'/);
  assert.match(braid, /provider:/);
  assert.match(braid, /model:/);
  assert.match(braid, /route:/);
  assert.match(braid, /thread:/);
  assert.match(braid, /turn:/);
});
