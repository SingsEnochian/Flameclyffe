import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');
const vercel = JSON.parse(fs.readFileSync(path.join(repoRoot, 'vercel.json'), 'utf8'));

test('Vercel preview publishes the current Arcsweep build under /arcsweep', () => {
  assert.equal(vercel.outputDirectory, 'dist/starwell');
  assert.match(vercel.buildCommand, /npm run starwell:build/);
  assert.match(vercel.buildCommand, /npm run arcsweep:build/);
  assert.match(vercel.buildCommand, /npm run arcsweep:stage:vercel/);

  const starwellIndex = vercel.buildCommand.indexOf('npm run starwell:build');
  const arcsweepBuildIndex = vercel.buildCommand.indexOf('npm run arcsweep:build');
  const stageIndex = vercel.buildCommand.indexOf('npm run arcsweep:stage:vercel');
  assert.ok(starwellIndex >= 0 && arcsweepBuildIndex > starwellIndex && stageIndex > arcsweepBuildIndex);
});
