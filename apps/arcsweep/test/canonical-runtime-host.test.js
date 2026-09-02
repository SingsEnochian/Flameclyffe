import test from 'node:test';
import assert from 'node:assert/strict';
import { ARCSWEEP_CANONICAL_RUNTIME_URL, canonicalRuntimeTarget } from '../src/canonical-runtime-host.js';

test('GitHub Pages ArcSweep routes to the canonical Vercel runtime', () => {
  const target = canonicalRuntimeTarget({
    hostname: 'singsenochian.github.io',
    href: 'https://singsenochian.github.io/Flameclyffe/apps/arcsweep/?open=1#commons',
  });
  assert.equal(target, `${ARCSWEEP_CANONICAL_RUNTIME_URL}?open=1#commons`);
});

test('static=1 preserves the GitHub Pages fallback', () => {
  assert.equal(canonicalRuntimeTarget({
    hostname: 'singsenochian.github.io',
    href: 'https://singsenochian.github.io/Flameclyffe/apps/arcsweep/?static=1',
  }), null);
});

test('canonical production host does not redirect', () => {
  assert.equal(canonicalRuntimeTarget({
    hostname: 'flameclyffe.vercel.app',
    href: 'https://flameclyffe.vercel.app/arcsweep/',
  }), null);
});
