import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveWotChapterIcon, validateWotChapterIconFilename, clearWotChapterIconManifestCache } from '../src/wot-chapter-icons.js';

const manifest = JSON.parse(await readFile(new URL('../assets/third-party/wot-chapter-icons/manifest.json', import.meta.url), 'utf8'));
const ok = (value) => ({ ok: true, status: 200, async json() { return structuredClone(value); } });

test('WoT icon pack remains external, pinned, attributed, and outside Flameclyffe asset licensing', () => {
  assert.equal(manifest.status, 'external-quarantined');
  assert.equal(manifest.upstream.repository, 'jcsalomon/wot-chapter-icons');
  assert.equal(manifest.upstream.commit, '7fd9e09a192afdaa80c0a0fcc8f8ae7a5cf49ab5');
  assert.equal(manifest.rights.projectLicense, 'CC BY-SA 3.0 Unported');
  assert.equal(manifest.rights.attributionRequired, true);
  assert.equal(manifest.rights.flameclyffeAssetLicenseInherited, false);
  assert.equal(manifest.policy.vendorCopies, false);
  assert.equal(manifest.policy.doNotInferBroaderTorPermission, true);
});

test('resolver accepts only pinned upstream SVG filenames and returns rights metadata', async () => {
  clearWotChapterIconManifestCache();
  const ref = await resolveWotChapterIcon('Dice-icon.svg', { fetchImpl: async () => ok(manifest) });
  assert.match(ref.url, /7fd9e09a192afdaa80c0a0fcc8f8ae7a5cf49ab5\/Dice-icon\.svg$/);
  assert.match(ref.attribution, /Joel Salomon/);
  assert.match(ref.attribution, /Tor Books/);
  assert.equal(ref.canonPromotion, false);
  assert.throws(() => validateWotChapterIconFilename('../Dice-icon.svg'));
  assert.throws(() => validateWotChapterIconFilename('Dice.png'));
});
