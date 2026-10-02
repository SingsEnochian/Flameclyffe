import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSomaticTexture,
  listSomaticTextures,
  somaticTextureClaim,
  textureFrequencyScale,
  texturePan,
  textureVibrationPattern,
} from '../src/somatic-textures.js';

test('somatic texture catalog separates meaning from rendering texture', () => {
  const ids = listSomaticTextures().map((item) => item.id);
  for (const id of ['neutral', 'charge', 'branching', 'projection', 'dream', 'damping', 'return', 'focus', 'uncertainty']) {
    assert.ok(ids.includes(id), `missing somatic texture: ${id}`);
  }
  const claim = somaticTextureClaim(getSomaticTexture('projection'));
  assert.equal(claim.physical_claim, false);
  assert.match(claim.note, /does not establish/i);
});

test('sound texture transforms stay bounded', () => {
  const projection = getSomaticTexture('projection');
  for (let i = 0; i < 12; i += 1) {
    assert.ok(textureFrequencyScale(projection, i) >= 0.75);
    assert.ok(textureFrequencyScale(projection, i) <= 1.25);
    assert.ok(texturePan(projection, i) >= -1);
    assert.ok(texturePan(projection, i) <= 1);
  }
});

test('charge haptics build while damping haptics settle', () => {
  const base = [30, 20, 50, 20, 70];
  const charge = textureVibrationPattern(base, getSomaticTexture('charge'));
  const damping = textureVibrationPattern(base, getSomaticTexture('damping'));
  assert.ok(charge[4] > charge[0]);
  assert.ok(damping[4] < damping[0]);
  assert.equal(charge.length, base.length);
  assert.equal(damping.length, base.length);
});