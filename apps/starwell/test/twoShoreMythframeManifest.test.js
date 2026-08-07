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

test('Bifröst registers Mythframe as a state-bound PREMAQC Braided Spine tone layer', async () => {
  const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));
  const bridge = await readFile(bridgeUrl, 'utf8');

  assert.equal(manifest.engine.twoShoreMythframe, 'src/two-shore-mythframe.js');
  assert.equal(manifest.engine.mythframeWav, 'src/two-shore-mythframe-wav.js');
  assert.equal(manifest.engine.mythframeWavUi, 'src/two-shore-mythframe-wav-ui.js');
  for (const capability of REQUIRED_CAPABILITIES) {
    assert.ok(manifest.capabilities.includes(capability), `missing capability ${capability}`);
  }

  assert.equal(manifest.spineContract.schema, 'hearthgate.braided-spine/v1.1');
  assert.equal(manifest.spineContract.premaqcSchema, 'hearthgate.premaqc/v1.0');
  assert.equal(manifest.spineContract.realityAxiom, 'Everything is real');
  assert.deepEqual(manifest.spineContract.spines, ['magic', 'science_mathematics', 'physical']);
  assert.deepEqual(manifest.spineContract.premaqcWireOrder, ['P', 'R', 'E', 'M', 'A', 'Q', 'C']);
  assert.equal(manifest.relationContract.multiverseLawEverythingIsReal, true);
  assert.equal(manifest.relationContract.mythframeDomainTruth, true);
  assert.equal(manifest.relationContract.mythframeGenerationLaw, 'math-state → mythframe → tone-event');
  assert.equal(manifest.relationContract.everyToneRequiresMythframe, true);
  assert.equal(manifest.relationContract.mythframeMustBindStateIds, true);
  assert.equal(manifest.relationContract.mythframeMustBindGeometryFingerprints, true);
  assert.equal(manifest.relationContract.mythframeMustBindPremaqValues, true);
  assert.equal(manifest.relationContract.mythframeMustBindElaraMultiplier, true);
  assert.equal(manifest.relationContract.receivingSpringFeedsAnswer, true);
  assert.equal(manifest.relationContract.returnFeedsRenewal, true);

  assert.equal(manifest.installContract.verifyTwoShoreMythframe, 'src/two-shore-mythframe.js');
  assert.equal(manifest.installContract.verifyMythframeWav, 'src/two-shore-mythframe-wav.js');
  assert.equal(manifest.installContract.verifyMythframeWavUi, 'src/two-shore-mythframe-wav-ui.js');
  assert.match(bridge, /two-shore-mythframe-wav-ui\.js/);
});
