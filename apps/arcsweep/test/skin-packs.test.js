import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BUILTIN_SKIN_PACKS,
  UNIVERSAL_SKIN_SCHEMA,
  contrastRatio,
  createSkinPackFromPalette,
  parsePaletteText,
} from '../src/skin-packs.js';

test('built-in skin packs have unique ids and valid universal schema', () => {
  const ids = BUILTIN_SKIN_PACKS.map((pack) => pack.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const pack of BUILTIN_SKIN_PACKS) {
    assert.equal(pack.schema, UNIVERSAL_SKIN_SCHEMA);
    assert.ok(pack.palette.length >= 3);
    assert.ok(pack.tokens.bg);
    assert.ok(pack.tokens.text);
    assert.ok(pack.tokens.accent);
  }
});

test('Rowan-owned palette skins retain authorisation provenance', () => {
  const rowan = BUILTIN_SKIN_PACKS.filter((pack) => pack.sourceKind === 'rowan-owned');
  assert.equal(rowan.length, 6);
  for (const pack of rowan) {
    assert.equal(pack.provenance.ownerAuthorised, true);
    assert.match(pack.provenance.profile, /colourlovers\.com\/lover\/brilliantrouble/i);
  }
});

test('generated skin chooses readable foreground against its dark field', () => {
  const pack = createSkinPackFromPalette({
    id: 'test',
    name: 'Test',
    colors: ['#7A0C2F', '#99123D', '#B31547', '#ED3B41', '#FF9195'],
  });
  assert.ok(contrastRatio(pack.tokens.text, pack.tokens.bg) >= 4.5);
});

test('whim palette parser accepts mixed text and deduplicates colours', () => {
  assert.deepEqual(
    parsePaletteText('night #112233 / #AABBCC and #112233 plus #778899'),
    ['#112233', '#AABBCC', '#778899'],
  );
});

test('whim palette parser requires at least three colours', () => {
  assert.throws(() => parsePaletteText('#112233 #445566'), /at least three/i);
});
