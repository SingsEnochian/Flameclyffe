import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  TOYBOX_SCHEMA,
  listSensoryProfiles,
  listToyboxToys,
  resolveSensoryProfile,
  toyboxSnapshot,
} from '../src/toybox-model.js';

test('Toybox exposes six optional play organs with unique ids', () => {
  const toys = listToyboxToys();
  assert.equal(toys.length, 6);
  assert.equal(new Set(toys.map(toy => toy.toy_id)).size, toys.length);
  for (const toy of toys) {
    assert.equal(typeof toy.purpose, 'string');
    assert.ok(toy.inputs.length > 0);
    assert.ok(toy.outputs.length > 0);
  }
});

test('sensory profiles change expression without diagnosis-labelled modes', () => {
  const profiles = listSensoryProfiles();
  assert.deepEqual(profiles.map(profile => profile.id), ['quiet', 'balanced', 'sparkly']);
  const quiet = resolveSensoryProfile('quiet');
  const sparkly = resolveSensoryProfile('sparkly');
  assert.ok(quiet.motion < sparkly.motion);
  assert.ok(quiet.particle_density < sparkly.particle_density);
  assert.ok(quiet.audio_gain < sparkly.audio_gain);
  assert.ok(quiet.haptic_scale < sparkly.haptic_scale);
});

test('reduced motion suppresses autonomous motion while preserving the selected sensory profile', () => {
  const profile = resolveSensoryProfile('sparkly', { reducedMotion: true });
  assert.equal(profile.id, 'sparkly');
  assert.equal(profile.motion, 0);
  assert.equal(profile.reduced_motion, true);
  assert.ok(profile.particle_density <= 0.5);
  assert.match(profile.description, /preserving interaction/i);
});

test('Toybox snapshot declares capability boundaries and no scoring or diagnosis', () => {
  const snapshot = toyboxSnapshot({
    profile: 'balanced',
    hapticsAvailable: true,
    audioAvailable: true,
  });
  assert.equal(snapshot.schema, TOYBOX_SCHEMA);
  assert.equal(snapshot.capabilities.haptics, true);
  assert.equal(snapshot.capabilities.audio, true);
  assert.match(snapshot.rule, /do not diagnose/i);
  assert.match(snapshot.rule, /score productivity/i);
});

test('Toybox surface keeps audio and haptics explicitly user-triggered', () => {
  const source = readFileSync(new URL('../src/surfaces/toybox.js', import.meta.url), 'utf8');
  assert.match(source, /data-sound="hum"/);
  assert.match(source, /data-sound="stop"/);
  assert.match(source, /addEventListener\('click'.*startSound/s);
  assert.match(source, /navigator\.vibrate/);
  assert.match(source, /No autoplay/);
  assert.doesNotMatch(source, /autoplay\s*=\s*["']?true/i);
});

test('Wayglass main registers Toybox as a first-class surface and URL room', () => {
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.match(source, /surface_id: 'wayglass:toybox'/);
  assert.match(source, /roomQuery === 'toybox'/);
});
