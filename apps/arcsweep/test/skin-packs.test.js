import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BUILTIN_SKIN_PACKS,
  MOSS_LAPIS_SKIN,
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
    assert.equal(pack.material.family, 'glass');
    assert.ok(Number.isFinite(pack.material.panelOpacity));
    assert.ok(Number.isFinite(pack.material.blur));
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

test('Moss + Lapis session skin preserves named colours and mossglass material', () => {
  assert.equal(MOSS_LAPIS_SKIN.material.id, 'mossglass');
  assert.equal(MOSS_LAPIS_SKIN.provenance.ownerAuthorised, true);
  assert.equal(MOSS_LAPIS_SKIN.namedColors.find((entry) => entry.hex === '#280181')?.name, 'Lapis Winged');
  assert.equal(MOSS_LAPIS_SKIN.namedColors.find((entry) => entry.hex === '#3D504B')?.name, 'Her Eyes Like Moss');
  assert.equal(MOSS_LAPIS_SKIN.namedColors.find((entry) => entry.hex === '#012819')?.status, 'awaiting-name');
});

test('generated skin chooses readable foreground against its dark field', () => {
  const pack = createSkinPackFromPalette({
    id: 'test',
    name: 'Test',
    colors: ['#7A0C2F', '#99123D', '#B31547', '#ED3B41', '#FF9195'],
  });
  assert.ok(contrastRatio(pack.tokens.text, pack.tokens.bg) >= 4.5);
});

test('generated skin receives a living-glass material by default', () => {
  const pack = createSkinPackFromPalette({
    id: 'glass-test',
    name: 'Glass test',
    colors: ['#012819', '#3D504B', '#988FBD'],
  });
  assert.equal(pack.material.id, 'living-glass');
  assert.equal(pack.material.family, 'glass');
  assert.equal(pack.material.tint, pack.tokens.panel);
  assert.equal(pack.material.rim, pack.tokens.line);
  assert.equal(pack.material.glow, pack.tokens.accent);
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
