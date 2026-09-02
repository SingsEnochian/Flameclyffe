import assert from 'node:assert/strict';
import test from 'node:test';

import { fieldSourceCandidates, readCurrentField } from '../src/field-source.js';

const NOW = Date.parse('2026-09-02T03:00:00.000Z');

test('GitHub Pages reads the published DEEP cache before unavailable server routes', () => {
  const urls = fieldSourceCandidates(
    'https://singsenochian.github.io/Flameclyffe/apps/arcsweep/',
    NOW,
  );

  assert.match(urls[0], /^https:\/\/singsenochian\.github\.io\/Flameclyffe\/data\/deep-current\.json\?field-slot=/);
  assert.equal(urls[1], 'https://singsenochian.github.io/api/v1/field/current');
});

test('hosted Field succeeds from the static cache without probing the absent API', async () => {
  const calls = [];
  const payload = { generated_at: '2026-09-02T03:00:00.000Z', field: { P: 0.5 } };
  const fetchImpl = async (url) => {
    calls.push(url);
    return { ok: true, status: 200, statusText: 'OK', async json() { return payload; } };
  };

  const result = await readCurrentField({
    fetchImpl,
    location: 'https://singsenochian.github.io/Flameclyffe/apps/arcsweep/',
    now: NOW,
  });

  assert.equal(result, payload);
  assert.equal(calls.length, 1);
  assert.match(calls[0], /\/Flameclyffe\/data\/deep-current\.json/);
});

test('local development keeps the live API first and falls back to the cache', async () => {
  const calls = [];
  const payload = { field: { P: 0.6 } };
  const fetchImpl = async (url) => {
    calls.push(url);
    if (calls.length === 1) return { ok: false, status: 404, statusText: 'Not Found' };
    return { ok: true, status: 200, statusText: 'OK', async json() { return payload; } };
  };

  assert.equal(await readCurrentField({
    fetchImpl,
    location: 'http://127.0.0.1:5184/',
    now: NOW,
  }), payload);
  assert.equal(calls[0], 'http://127.0.0.1:5184/api/v1/field/current');
  assert.match(calls[1], /^http:\/\/127\.0\.0\.1:5184\/data\/deep-current\.json/);
});
