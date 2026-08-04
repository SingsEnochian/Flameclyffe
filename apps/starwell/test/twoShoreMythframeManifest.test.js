import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manifestUrl = new URL('../public/modules/bifrost-arcsweep.module.json', import.meta.url);
const bridgeUrl = new URL('../src/premaq-shokz-feather-stop-bridge.js', import.meta.url);

const REQUIRED_CAPABILITIES = Object.freeze([
  'state-bound-two-shore-mythframe',
  'math-mythframe-tone-generation',
  'eleven-year-mythframe-horizon',
  'every-tone-event-mythframe-gated',
  'eleven-year-mythframe-wav',
]);

test('Bifröst registers Mythframe as a required math-to-tone layer', async () => {
  const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));
  const bridge = await readFile(bridgeUrl, 'utf8');

  assert.equal(manifest.engine.twoShoreMythframe, 'src/two-shore-mythframe.js');
  assert.equal(manifest.engine.mythframeWav, 'src/two-shore-mythframe-wav.js');
  assert.equal(manifest.engine.mythframeWavUi, 'src/two-shore-mythframe-wav-ui.js');
  for (const capability of REQUIRED_CAPABILITIES) {
    assert.ok(manifest.capabilities.includes(capability), `missing capability ${capability}`);
  }
  assert.equal(manifest.authorityContract.multiverseLawEverythingIsReal, true);
  assert.equal(manifest.authorityContract.mythframeDomainTruth, true);
  assert.equal(manifest.authorityContract.mythframeGenerationLaw, 'math-state → mythframe → tone-event');
  assert.equal(manifest.authorityContract.everyToneRequiresMythframe, true);
  assert.equal(manifest.authorityContract.mythframeMustBindStateIds, true);
  assert.equal(manifest.authorityContract.mythframeMustBindGeometryFingerprints, true);
  assert.equal(manifest.authorityContract.mythframeMustBindPremaqValues, true);
  assert.equal(manifest.authorityContract.mythframeMustBindElaraMultiplier, true);
  assert.equal(manifest.installContract.verifyTwoShoreMythframe, 'src/two-shore-mythframe.js');
  assert.equal(manifest.installContract.verifyMythframeWav, 'src/two-shore-mythframe-wav.js');
  assert.equal(manifest.installContract.verifyMythframeWavUi, 'src/two-shore-mythframe-wav-ui.js');
  assert.match(bridge, /two-shore-mythframe-wav-ui\.js/);
});
