import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const uiUrl = new URL('../src/two-shore-mythframe-wav-ui.js', import.meta.url);
const manifestUrl = new URL('../public/modules/bifrost-arcsweep.module.json', import.meta.url);

test('Mythframe playback requires manual Shokz verification and exposes user-controlled looping', async () => {
  const ui = await readFile(uiUrl, 'utf8');
  const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));

  assert.match(ui, /two-shore-loop-wav/);
  assert.match(ui, /currentAudio\.loop = loopEnabled\(\)/);
  assert.match(ui, /premaq-shokz-confirm/);
  assert.match(ui, /if \(!shokzVerified\(\)\)/);
  assert.match(ui, /select Shokz as the iPad audio output/);
  assert.equal(manifest.authorityContract.browserCannotDetectOutputDevice, true);
  assert.equal(manifest.authorityContract.shokzPlaybackRequiresUserConfirmation, true);
  assert.equal(manifest.authorityContract.elevenYearLoopUserControlled, true);
  assert.ok(manifest.capabilities.includes('manual-shokz-output-verification'));
  assert.ok(manifest.capabilities.includes('looped-eleven-year-playback'));
});

test('the live tone event drives a coil compression, release, and upward spiral animation', async () => {
  const ui = await readFile(uiUrl, 'utf8');
  const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));

  assert.match(ui, /COIL → RELEASE → UPWARD SPIRAL/);
  assert.match(ui, /function drawCoilRelease/);
  assert.match(ui, /requestAnimationFrame\(animationStep\)/);
  assert.match(ui, /eventAtTime\(seconds\)/);
  assert.match(ui, /const phase = progress < 0\.5 \? 'compression' : 'release'/);
  assert.match(ui, /LIVE_DATA_REQUIRED/);
  assert.equal(manifest.authorityContract.coilReleaseVisualDerivedFromToneEvent, true);
  assert.equal(manifest.authorityContract.visualPhysicalClaim, false);
  assert.ok(manifest.capabilities.includes('coil-release-upward-spiral-visual'));
});
