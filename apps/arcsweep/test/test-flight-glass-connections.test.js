import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const glassJs = await readFile(new URL('../..//agent-workspace/refractive-glass-three.js', import.meta.url), 'utf8');
const glassCss = await readFile(new URL('../..//agent-workspace/refractive-glass-three.css', import.meta.url), 'utf8');
const crewLink = await readFile(new URL('../..//agent-workspace/connection-doctor.js', import.meta.url), 'utf8');
const hermesDoctor = await readFile(new URL('../../../profiles/crow-trainer/scripts/connection_doctor.py', import.meta.url), 'utf8');

test('refractive glass has real transmission thickness and moving caustic cues', () => {
  assert.match(glassJs, /MeshPhysicalMaterial/);
  assert.match(glassJs, /transmission:0\.95/);
  assert.match(glassJs, /thickness:spec\.thickness\+0\.7/);
  assert.match(glassJs, /TorusKnotGeometry/);
  assert.match(glassJs, /CanvasTexture/);
  assert.match(glassJs, /EquirectangularReflectionMapping/);
  assert.match(glassJs, /ACESFilmicToneMapping/);
  assert.match(glassJs, /dispersion/);
  assert.match(glassJs, /--glass-velocity/);
  assert.match(glassJs, /--glass-specular/);
  assert.match(glassCss, /Optical body: a visible slab edge/);
  assert.match(glassCss, /--glass-depth-shift/);
  assert.match(glassCss, /data-glass-moving="true"/);
  assert.match(glassCss, /--glass-velocity-blur/);
  assert.match(glassCss, /--glass-shadow-size/);
});

test('coarse pointer motion can steer optics instead of freezing the glass on touch devices', () => {
  assert.match(glassJs, /coarsePointer\.matches && event\.buttons===0 && event\.pressure===0/);
  assert.match(glassJs, /panel\.addEventListener\('pointerdown'/);
  assert.match(glassJs, /coarsePointer\.matches\?0\.72:1/);
});

test('Hermes doctor separates connection failure classes and redacts likely secrets', () => {
  for (const kind of ['authentication','authorization','rate-limit','upstream','tls','transport','stream-transport','request-size','route-or-model']) {
    assert.match(hermesDoctor, new RegExp(`"${kind}"`));
  }
  assert.match(hermesDoctor, /def scrub_output/);
  assert.match(hermesDoctor, /<redacted-key>/);
  assert.match(hermesDoctor, /<redacted-token>/);
  assert.match(hermesDoctor, /"Hermes doctor"/);
});

test('Hermes live probe is explicit, bounded, and surfaced in Crew Link', () => {
  assert.match(hermesDoctor, /--probe/);
  assert.match(hermesDoctor, /Reply exactly HERMES_CONNECTION_OK and nothing else/);
  assert.match(hermesDoctor, /PROBE_TIMEOUT = 45/);
  assert.match(crewLink, /connection_doctor\.py --probe/);
  assert.doesNotMatch(hermesDoctor, /write_text|unlink\(|rename\(|config\.yaml.*write/i);
});
