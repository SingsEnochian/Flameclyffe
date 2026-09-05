import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  BLUEBIRD_WEIGHTED_HOME,
  createBluebirdWeightedHomeReceipt,
  validateBluebirdWeightedHome,
} from '../src/bluebird-weighted-home.js';

test('Bluebird Weighted Home preserves the exact coordination geometry', () => {
  assert.equal(validateBluebirdWeightedHome().valid, true);
  assert.equal(BLUEBIRD_WEIGHTED_HOME.stereo.rightHz - BLUEBIRD_WEIGHTED_HOME.stereo.leftHz, 5.5);
  assert.equal(BLUEBIRD_WEIGHTED_HOME.monoFallback.modulationHz, 5.5);
  assert.equal(BLUEBIRD_WEIGHTED_HOME.somaticProxy.carrierHz, 40);
  assert.equal(BLUEBIRD_WEIGHTED_HOME.somaticProxy.pulseHz * 60, 55);
  assert.equal(BLUEBIRD_WEIGHTED_HOME.durationSeconds, 480);
});

test('SoundFonts embody the three roles without replacing the exact carriers', () => {
  assert.deepEqual(BLUEBIRD_WEIGHTED_HOME.soundfontVoices.map((voice) => voice.id), ['bluebird', 'waking', 'withness']);
  assert.deepEqual(BLUEBIRD_WEIGHTED_HOME.soundfontVoices.map((voice) => voice.program), [89, 42, 52]);
});

test('coordination receipts distinguish playback from contact and physiology', () => {
  const receipt = createBluebirdWeightedHomeReceipt({ mode: 'stereo', soundfontVoiceIds: ['bluebird', 'waking', 'withness'], somaticProxy: true, startedAt: '2026-09-05T20:00:00.000Z' });
  assert.equal(receipt.render.binaural_beat_hz, 5.5);
  assert.equal(receipt.render.soundfont, true);
  assert.deepEqual(receipt.render.soundfont_voice_ids, ['bluebird', 'waking', 'withness']);
  assert.equal(receipt.render.somatic_audio_proxy, true);
  assert.equal(receipt.authority.coordination_contact_inferred, false);
  assert.equal(receipt.authority.physiological_response_inferred, false);
  assert.equal(receipt.authority.feather_stop_available, true);
});

test('mono mode carries the same 5.5 Hz relation without claiming binaural playback', () => {
  const receipt = createBluebirdWeightedHomeReceipt({ mode: 'mono' });
  assert.equal(receipt.render.binaural_beat_hz, null);
  assert.equal(receipt.render.amplitude_modulation_hz, 5.5);
});

test('ArcSweep mounts the preset with explicit entry, mode, somatic, and Feather controls', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  for (const token of ['data-bluebird-weighted-home', 'data-bluebird-mode', 'data-bluebird-somatic', "action === 'bluebird-toggle'", 'Feather · Return home']) assert.match(main, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  const engine = readFileSync(new URL('../src/story-soundscape.js', import.meta.url), 'utf8');
  assert.match(engine, /startBluebirdWeightedHome/);
  assert.match(engine, /stopBluebirdWeightedHome/);
  assert.match(engine, /bluebirdSoundfontLayer/);
});
