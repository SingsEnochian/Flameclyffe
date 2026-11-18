import test from 'node:test';
import assert from 'node:assert/strict';
import {PHASES} from '../../../lib/wyrdrune/runtime.mjs';
import {
  createAcousticReturn, hearAcousticFrames, isAcousticAcknowledgement,
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
  const start = Math.round((0.6 + 31 * 0.046) * clip.sampleRate);
  damaged.fill(0, start, start + Math.round(0.046 * clip.sampleRate));
  assert.deepEqual(hearAcousticFrames(damaged, clip.sampleRate), []);

  const controller = new AbortController();
  controller.abort();
  await assert.rejects(receiveAcousticFrame(9, request, {signal: controller.signal}), /Feather/);
});
