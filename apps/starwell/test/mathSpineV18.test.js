import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const files = [
  'assets/hearthgate-math-v1.8.js',
  'assets/heimdall-sonification-compiler.js',
  'assets/runa-369-percussion-oscillator.js',
  'assets/wardenclyffe-v18-layer-engine.js',
  'assets/kelyran-galdr-observatory.js',
  'assets/kelyran-galdr-instrument.js',
];

for (const file of files) {
  test(`${file} parses as JavaScript`, () => {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout);
  });
}

test('all active audio modules inherit Hearthgate math spine v1.8', async () => {
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.match(source, /hearthgate\.math-spine\/v1\.8/);
  }
});

test('canonical v1.8 document exposes lattice, address, stratigraphy and observation coupling', async () => {
  const source = await readFile('docs/HEARTHGATE_BRAIDED_SPINE_V1.8.md', 'utf8');
  assert.match(source, /Relational Possibility Lattice/);
  assert.match(source, /State \/ Gate Address/);
  assert.match(source, /Temporal and conceptual stratigraphy/);
  assert.match(source, /O_\{ij\}/);
  assert.match(source, /X=X\(t,/);
});

test('legacy mathematics points to archive and v1.8', async () => {
  for (const file of [
    'docs/deep-observer-math.md',
    'starwell/deep-observer/DEEP_Math_Spine.md',
    'docs/observer/OBSERVER_AUDIO_MATHEMATICS.md',
  ]) {
    const source = await readFile(file, 'utf8');
    assert.match(source, /HEARTHGATE_BRAIDED_SPINE_V1\.8/);
    assert.match(source, /archive\/mathematics\/pre-v1\.8/);
  }
});
