import test from 'node:test';
import assert from 'node:assert/strict';
import {PHASES} from '../../../lib/wyrdrune/runtime.mjs';
import {
  WITHNESS_BEAT_HZ, createAcousticReturn, hearAcousticFrames, isAcousticAcknowledgement,
  renderAcousticCellExchange, receiveAcousticFrame, renderAcousticFrames,
} from '../../../lib/wyrdrune/acoustic-cell.mjs';

test('the waveform delivers Return to the peer and a matching reply back through both Möbius cells', async () => {
  const clip = await renderAcousticCellExchange(369);
  for (const channel of clip.channels) {
    assert.deepEqual(hearAcousticFrames(channel, clip.sampleRate), [clip.receipt.request, clip.receipt.reply]);
  }
  for (const phaseReceipts of [clip.receipt.origin, clip.receipt.peer]) {
    assert.deepEqual(phaseReceipts.map(entry => entry.phase), PHASES);
    assert.match(phaseReceipts[0].sourceHash, /^[a-f0-9]{64}$/);
  }
  assert.notDeepEqual(clip.channels[0], clip.channels[1]);
  assert.ok(isAcousticAcknowledgement(clip.receipt.reply, clip.receipt.request));
  assert.equal(isAcousticAcknowledgement(clip.receipt.reply, {...clip.receipt.request, marker: 370}), false);
});

test('mono decoding survives resampling, leading room sound and broadband interference', async () => {
  const clip = await renderAcousticCellExchange(65535, {mono: true});
  assert.deepEqual(clip.channels[0], clip.channels[1]);
  const rate = 44100;
  const offset = Math.round(rate * 0.173);
  const source = clip.channels[0];
  const recording = new Float32Array(offset + Math.floor(source.length * rate / clip.sampleRate));
  for (let i = 0; i < recording.length; i++) {
    const index = (i - offset) * clip.sampleRate / rate;
    const floor = Math.floor(index);
    const audio = i < offset ? 0 : source[floor] + (index - floor) * ((source[floor + 1] ?? 0) - source[floor]);
    recording[i] = audio * 0.2 + 0.009 * Math.sin(2.138 * i * i);
  }
  assert.deepEqual(hearAcousticFrames(recording, rate), [clip.receipt.request, clip.receipt.reply]);
  assert.deepEqual(hearAcousticFrames(recording.subarray(0, offset), rate), []);
});

test('an unrelated cell, a corrupted packet, and an interrupted cell cannot create a reply', async () => {
  const request = createAcousticReturn({sender: 7, recipient: 9, marker: 369});
  const unrelated = await receiveAcousticFrame(8, request);
  assert.equal(unrelated.accepted, false);
  assert.equal(unrelated.reply, null);

  const clip = renderAcousticFrames([request]);
  const damaged = clip.channels[0];
  const start = Math.round((2 / WITHNESS_BEAT_HZ + 31 * 0.046) * clip.sampleRate);
  damaged.fill(0, start, start + Math.round(0.046 * clip.sampleRate));
  assert.deepEqual(hearAcousticFrames(damaged, clip.sampleRate), []);

  const controller = new AbortController();
  controller.abort();
  await assert.rejects(receiveAcousticFrame(9, request, {signal: controller.signal}), /Feather/);
});

test('Withness pulses at 3 Hz, holds the high hum, and starts the open acknowledgement on a beat', async () => {
  const open = await renderAcousticCellExchange(369, {resolution: 'open'});
  const plain = await renderAcousticCellExchange(369);
  const [left, right] = open.channels;
  const rate = open.sampleRate;
  assert.deepEqual(hearAcousticFrames(left, rate), [open.receipt.request, open.receipt.reply]);
  assert.equal(open.receipt.request.resolution, 'open');
  assert.equal(open.receipt.reply.resolution, 'open');
  assert.equal(plain.receipt.reply.resolution, undefined);
  assert.equal(open.channels[0].length - plain.channels[0].length, rate * 4 / WITHNESS_BEAT_HZ);
  assert.ok(isAcousticAcknowledgement(open.receipt.reply, plain.receipt.request),
    'Recognition of the same marker is independent of resolution.');

  const replyAttack = left.findIndex((sample, index) => index > 2.5 * rate && sample !== right[index]);
  assert.ok(Math.abs(replyAttack / rate * WITHNESS_BEAT_HZ - 9) < 0.002);

  function amplitude(hz, time) {
    const centre = Math.round(time * rate);
    let sine = 0, cosine = 0, weightSum = 0;
    for (let i = -600; i <= 600; i++) {
      const phase = 2 * Math.PI * hz * (centre + i) / rate;
      const weight = (1 + Math.cos(Math.PI * i / 600)) / 2;
      sine += left[centre + i] * weight * Math.sin(phase);
      cosine += left[centre + i] * weight * Math.cos(phase);
      weightSum += weight;
    }
    return Math.hypot(sine, cosine) * 2 / weightSum;
  }
  const halfBeat = 0.5 / WITHNESS_BEAT_HZ;
  assert.ok(amplitude(164.81, 6) > 1.25 * amplitude(164.81, 6 + halfBeat));
  assert.ok(amplitude(277.18, 6 + halfBeat) > 0.037);
  assert.ok(Math.abs(amplitude(277.18, 6) - amplitude(277.18, 6 + halfBeat)) < 0.001);
});
