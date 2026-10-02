import assert from 'node:assert/strict';
import test from 'node:test';

import {
  NIKOLA_VOICE_PROFILE,
  createNikolaVoiceIntent,
} from '../src/nikola-voice-profile.js';
import { createVoiceRouter } from '../src/voice-router.js';

test('Nikola voice profile is engine independent and does not authorize actor cloning', () => {
  assert.equal(NIKOLA_VOICE_PROFILE.identityId, 'nikola');
  assert.equal(NIKOLA_VOICE_PROFILE.engineIndependent, true);
  assert.equal(NIKOLA_VOICE_PROFILE.provenance.actorIdentityReproductionAllowed, false);
  assert.equal(NIKOLA_VOICE_PROFILE.singingVoiceId, 'nikola-sing-v0.1');
  assert.ok(NIKOLA_VOICE_PROFILE.provenance.allowedDerivations.includes('cadence'));
});

test('vindicated mode is deliberately calmer and more pause-heavy than lecture mode', () => {
  const vindicated = createNikolaVoiceIntent({
    text: 'You will observe that the apparatus is behaving precisely as predicted.',
    mode: 'vindicated',
  });
  const lecture = createNikolaVoiceIntent({
    text: 'Observe the field as the second oscillator enters resonance.',
    mode: 'lecture',
  });

  assert.ok(vindicated.renderHints.pace < lecture.renderHints.pace);
  assert.ok(vindicated.renderHints.pauseBias > lecture.renderHints.pauseBias);
  assert.ok(vindicated.renderHints.intensity < lecture.renderHints.intensity);
});

test('voice router keeps identity and voice intent stable across renderer choice', async () => {
  const intent = createNikolaVoiceIntent({ text: 'The principle is simple.', mode: 'laboratory' });
  const calls = [];
  const adapter = (name) => ({
    async render(received) {
      calls.push({ name, received });
      return {
        audioRef: `memory://${name}/nikola.wav`,
        durationMs: 1200,
        sampleRate: 24000,
        sourceTextPreserved: true,
      };
    },
  });

  const router = createVoiceRouter({
    adapters: {
      chatterbox: adapter('chatterbox'),
      f5: adapter('f5'),
      kokoro: adapter('kokoro'),
    },
    defaultEngine: 'chatterbox',
  });

  const a = await router.render(intent);
  const b = await router.render(intent, { engine: 'f5' });

  assert.equal(a.identityId, 'nikola');
  assert.equal(b.identityId, 'nikola');
  assert.equal(a.voiceId, b.voiceId);
  assert.equal(calls[0].received.text, calls[1].received.text);
  assert.notEqual(a.engine, b.engine);
});

test('voice router rejects renderers that produce no audio receipt', async () => {
  const router = createVoiceRouter({
    adapters: { broken: { render: async () => ({}) } },
    defaultEngine: 'broken',
  });
  const intent = createNikolaVoiceIntent({ text: 'No silent success.', mode: 'laboratory' });
  await assert.rejects(() => router.render(intent), /no audioRef/i);
});
