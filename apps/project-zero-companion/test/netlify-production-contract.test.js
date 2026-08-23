import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const repoFile = (path) => readFile(new URL(`../../../${path}`, import.meta.url), 'utf8');

test('Netlify production builds and stages Project Zero Companion on its canonical route', async () => {
  const [netlify, pkg, vite, stage] = await Promise.all([
    repoFile('netlify.toml'),
    repoFile('package.json'),
    repoFile('apps/project-zero-companion/vite.config.js'),
    repoFile('apps/project-zero-companion/stage-netlify.cjs'),
  ]);

  assert.match(vite, /PROJECT_ZERO_BASE \|\| '\/project-zero-companion\/'/);
  assert.match(netlify, /npm run project-zero:build/);
  assert.match(netlify, /npm run project-zero:stage:netlify/);
  assert.match(netlify, /PROJECT_ZERO_BASE = "\/project-zero-companion\/"/);
  assert.match(pkg, /"project-zero:stage:netlify": "node apps\/project-zero-companion\/stage-netlify\.cjs"/);
  assert.match(stage, /dist', 'starwell', 'project-zero-companion/);
  assert.match(stage, /arcsweep\.great-braid\.receipted/);
  assert.match(stage, /Great Braid receipt rail/);
});

test('production staging refuses a Companion build with a noncanonical asset base', async () => {
  const stage = await repoFile('apps/project-zero-companion/stage-netlify.cjs');
  assert.match(stage, /html\.includes\('\/project-zero-companion\/'\)/);
  assert.match(stage, /must be built for the canonical \/project-zero-companion\/ production base/);
});
