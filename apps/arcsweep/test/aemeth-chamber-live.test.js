import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { appendAemethModelWitness, formatAemethModelWitness } from '../src/aemeth-chamber-live.js';

const liveSource = await readFile(new URL('../src/aemeth-chamber-live.js', import.meta.url), 'utf8');

test('OA live witness receipt preserves identity and provider/model provenance', () => {
  const receipt = {
    displayName: 'Ox Alpha',
    status: 'replied',
    provider: 'huggingface-inference-providers',
    model: 'zai-org/GLM-5.3-Flash',
    executionPath: 'supabase-edge-to-huggingface-router',
    createdAt: '2026-08-28T13:00:00.000Z',
    text: 'Interpretation: a structural reading.',
  };
  const text = formatAemethModelWitness(receipt);
  assert.match(text, /^OA · 2026-08-28T13:00:00.000Z · replied/m);
  assert.match(text, /huggingface-inference-providers · zai-org\/GLM-5\.3-Flash/);
  assert.match(text, /supabase-edge-to-huggingface-router/);
  assert.match(text, /Interpretation: a structural reading\./);
});

test('OA live witness appends to its own lane without rewriting prior material', () => {
  const next = appendAemethModelWitness('Earlier OA witness', {
    status: 'replied',
    provider: 'huggingface-inference-providers',
    model: 'zai-org/GLM-5.3-Flash',
    createdAt: '2026-08-28T13:01:00.000Z',
    text: 'Second reading.',
  });
  assert.match(next, /^Earlier OA witness/);
  assert.match(next, /---/);
  assert.match(next, /Second reading\./);
});

test('Aemeth live invite uses portable OA transport rather than requiring one host', () => {
  assert.match(liveSource, /invokeOxAlphaPortable/);
  assert.match(liveSource, /House route when present/);
  assert.match(liveSource, /host-neutral fallback/);
  assert.doesNotMatch(liveSource, /Connect the House Runtime before inviting OA/);
});
