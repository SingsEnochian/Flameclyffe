import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const ROOT = new URL('../../../', import.meta.url);
const htmlPath = new URL('apps/starwell/wardenclyffe-mobius/index.html', ROOT);
const entryPath = new URL('apps/starwell/src/wardenclyffe-mobius-main.js', ROOT);
const html = readFileSync(htmlPath, 'utf8');
const entry = readFileSync(entryPath, 'utf8');

const expectedAssets = [
  'starwell-audio-patch-contract.js',
  'starwell-groundwire-audio-contract.js',
  'starwell-audio-output-calibration.js',
  'starwell-shared-audio-context.js',
  'starwell-concurrent-field-audio.js',
  'starwell-groundwire-field-adapter.js',
  'starwell-groundwire-panel.js',
  'groundwire.js',
  'mobius-audio-bus.js',
  'mobius-layered-spec-adapter.js',
  'mobius-deep-groundwire-adapter.js',
  'wardenclyffe-mobius-coupler.js',
  'wardenclyffe-groundwire-live.js',
  'starwell-audio-output-witness.js',
];

test('coupled lab owns its control layer through one Vite module', () => {
  const moduleScripts = [...html.matchAll(/<script\s+type="module"\s+src="([^"]+)"\s*><\/script>/g)];

  assert.equal(moduleScripts.length, 1);
  assert.equal(moduleScripts[0][1], '../src/wardenclyffe-mobius-main.js');
  assert.doesNotMatch(html, /\.\.\/\.\.\/\.\.\/assets\//);
  assert.match(html, /data-control-layer="loading"/);
});

test('Vite entry imports every engine stage and exposes boot diagnostics', () => {
  expectedAssets.forEach((filename) => {
    assert.match(entry, new RegExp(filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.equal(existsSync(new URL(`assets/${filename}`, ROOT)), true, `${filename} must exist`);
  });

  assert.match(entry, /StarwellCoupledBoot/);
  assert.match(entry, /Control layer failed at/);
  assert.match(entry, /missingGlobals/);
  assert.match(entry, /await load\(\)/);
});
