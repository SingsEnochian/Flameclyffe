import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveInputWeather } from '../src/interaction/starwellInputWeather.js';
import {
  createWeatherSoundProposal,
  resolveEnvironmentSoundSignal,
  resolveSceneMixProfile,
  resolveTextSoundSignal,
} from '../src/sound/weatherSoundConductor.js';

test('weather sound conductor reads text density', () => {
  const signal = resolveTextSoundSignal('Build a rain room with soft water and a safe exit.');

  assert.equal(signal.empty, false);
  assert.equal(signal.words > 0, true);
  assert.equal(signal.creation > 0, true);
  assert.equal(Object.hasOwn(signal, 'rawText'), false);
});

test('environment signal resolves scenes from room metadata', () => {
  const grove = resolveEnvironmentSoundSignal({
    id: 'dreaming-grove',
    kind: 'grove',
    theme: { biome: 'grove-starlight', palette: 'sea-blue-moon-gold' },
  });
  const shrine = resolveEnvironmentSoundSignal({
    id: 'templehouse-shrine',
    kind: 'shrine',
    theme: { biome: 'velvet-twilight', palette: 'moon-gold-blackwood' },
  });

  assert.equal(grove.sceneKey, 'grove');
  assert.equal(grove.isGrove, true);
  assert.equal(shrine.sceneKey, 'shrine');
});

test('scene mix profiles provide crossfade and caps', () => {
  const profile = resolveSceneMixProfile('grove');

  assert.equal(profile.patchId, 'dreaming_grove_purrfield');
  assert.equal(profile.crossfadeMs >= 1800, true);
  assert.equal(profile.densityCap <= 0.45, true);
  assert.equal(profile.motionCap <= 0.24, true);
});

test('weather sound proposal is scene reactive and preview only', () => {
  const inputWeather = resolveInputWeather({
    typing: { cadence: 0.8, revision: 0.1 },
    pointer: { drift: 0.6 },
  });
  const proposal = createWeatherSoundProposal({
    text: 'Grow a root room from the Ygg Gate.',
    node: { id: 'ygg-gate', kind: 'instrument', theme: { biome: 'threshold-root', palette: 'north-star-gold-green' } },
    inputWeather,
  });

  assert.equal(proposal.proposalOnly, true);
  assert.equal(proposal.playbackEnabled, false);
  assert.equal(proposal.weatherSound.futureSceneMix.appliesWhenSoundIsUserEnabled, true);
  assert.equal(proposal.weatherSound.futureSceneMix.activeInV0, false);
  assert.equal(proposal.weatherSound.futureSceneMix.sceneReactive, true);
  assert.equal(proposal.weatherSound.futureSceneMix.suggestedGain, 0);
  assert.equal(proposal.weatherSound.futureSceneMix.crossfade.curve, 'equal-power');
  assert.equal(proposal.weatherSound.futureSceneMix.guardrails.noAutoplay, true);
});

test('quiet access settings route weather sound to hush', () => {
  const proposal = createWeatherSoundProposal({
    text: 'Soft grove with bells and water.',
    node: { id: 'dreaming-grove', kind: 'grove', theme: { biome: 'grove-starlight', palette: 'sea-blue-moon-gold' } },
    inputWeather: resolveInputWeather({ typing: { cadence: 0.9 }, pointer: { drift: 0.7 } }),
    accessibility: { sensoryQuiet: true, plainPassDefault: true },
  });

  assert.equal(proposal.patchId, 'north_star_still');
  assert.equal(proposal.weatherSound.band, 'hush');
  assert.equal(proposal.weatherSound.modulation.suggestedDensity, 0.08);
  assert.equal(proposal.weatherSound.safety.playbackEnabled, false);
});
