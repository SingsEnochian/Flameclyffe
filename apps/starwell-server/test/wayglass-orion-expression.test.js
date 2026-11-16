'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { composeOrionExpression } = require('../wayglass/orion-expression.cjs');
const { previewWyrdruneRitual } = require('../../../lib/wayglass-wyrdrune-ritual.cjs');
const { digest } = require('../../../lib/wyrdrune/canonical.cjs');

test('Orion receives the verified WTL Return and image and supplies bounded local media direction', async () => {
  const source = readFileSync(join(__dirname, '../../../lib/wyrdrune/lantern-return.wtl'), 'utf8');
  const preview = await previewWyrdruneRitual(source);
  const image = Buffer.from('89504e470d0a1a0a', 'hex').toString('base64');
  let calls = 0;
  let hue = 212;
  const opts = {
    route: { model: () => 'orion-fixture', endpoint: () => 'http://127.0.0.1:11434/api/chat' },
    fetchImpl: async (_url, req) => {
      calls++;
      const body = JSON.parse(req.body);
      assert.deepEqual(body.messages[1].images, [image]);
      assert.deepEqual(JSON.parse(body.messages[1].content), preview.values);
      return Response.json({ model: 'orion-fixture', message: { content: JSON.stringify({
        image: { hue, depth: 0.6, spread: 0.5 }, sound: { fundamental: 220, interval: 1.5, texture: 0.2 },
      }) } });
    },
  };
  const input = { source, receiptHash: preview.receiptHash, image };
  const result = await composeOrionExpression(input, opts);
  assert.equal(result.frames.sound.lead_silence_ms, 1200);
  assert.equal(result.frames.sound.autoplay, false);
  assert.equal(result.frames.image.hue, 212);
  assert.equal(result.provenance.frameDigest, digest(result.frames));
  assert.deepEqual(result.provenance.inputModes, ['text', 'image']);
  await assert.rejects(composeOrionExpression({ ...input, receiptHash: 'stale' }, opts), /does not match/);
  assert.equal(calls, 1);
  hue = 361;
  await assert.rejects(composeOrionExpression(input, opts), /invalid hue/);
});

test('Orion directs each authored cue and Wayglass inserts all silences in place', async () => {
  const source = readFileSync(join(__dirname, '../../../lib/wyrdrune/lantern-return.wtl'), 'utf8');
  const preview = await previewWyrdruneRitual(source);
  const authored = preview.values[1].cues;
  const dirs = authored.filter(cue => cue.kind !== 'silence').map((_cue, index) => ({
    durationMs: 1000 + index * 100,
    image: { hue: index * 30, spread: 0.5, depth: 0.6 },
    sound: { fundamental: 220, interval: 1.5, texture: 0.2 },
  }));
  const opts = {
    route: { model: () => 'orion-fixture', endpoint: () => 'http://127.0.0.1:11434/api/chat' },
    fetchImpl: async (_url, req) => {
      assert.deepEqual(JSON.parse(JSON.parse(req.body).messages[1].content), authored);
      return Response.json({ message: { content: JSON.stringify({ directions: dirs }) } });
    },
  };
  const input = { source, receiptHash: preview.receiptHash, selection: 1 };
  const { timeline, provenance } = await composeOrionExpression(input, opts);
  assert.equal(timeline.length, authored.length);
  assert.deepEqual(timeline[1], { kind: 'silence', milliseconds: 1200, durationMs: 1200, startMs: 1000 });
  assert.equal(timeline[2].startMs, 2200);
  assert.equal(timeline[2].text, authored[2].text);
  assert.equal(timeline[2].voice, authored[2].voice);
  assert.equal(timeline[2].image.hue, 30);
  assert.equal(provenance.frameDigest, digest(timeline));
  dirs.pop();
  await assert.rejects(composeOrionExpression(input, opts), /each expressive cue/);
});
