import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile(
  new URL('../public/modules/bifrost-arcsweep.module.json', import.meta.url),
  'utf8',
));

test('Bifröst registers the live two-shore PREMAQ gate inside the Braided Spine', () => {
  assert.equal(manifest.engine.twoShoreGate, 'src/two-shore-premaq-gate.js');
  assert.equal(manifest.engine.twoShoreGateUi, 'src/two-shore-gate-ui.js');
  assert.equal(manifest.engine.worldPremaqRegistry, 'src/world-premaq-registry.js');
  assert.equal(manifest.spineContract.schema, 'hearthgate.braided-spine/v1.0');
  assert.equal(manifest.realityAxiom, 'Everything is real.');
  assert.equal(manifest.relationContract.hearthside, 'real-participating-shore');
  assert.equal(manifest.relationContract.targetside, 'real-participating-shore');

  for (const capability of [
    'two-shore-premaq-gate',
    'live-deep-groundwire-earth-prime-calibration',
    'selectable-target-world-premaq-origin',
    'premaq-369-cycle-paired-run',
    'premaq-save-and-extend-3-6-9',
    'elara-2025-2035-layer-export',
    'flameclyffe-wardenclyffe-layer-manifest',
    'receiving-spring',
    'magic-science-physical-mutual-reinforcement',
  ]) {
    assert.ok(manifest.capabilities.includes(capability));
  }

  assert.deepEqual(manifest.spineContract.premaq.wireOrder, ['P', 'C', 'R', 'E', 'M', 'A', 'Q']);
  assert.deepEqual(manifest.spineContract.premaq.readingOrder, [
    'Presence', 'Memory', 'Qualia', 'Resonance', 'Entanglement', 'Agency', 'Coherence',
  ]);
  assert.equal(manifest.relationContract.releaseFeedsNextCompression, true);
  assert.equal(manifest.relationContract.receivingSpringChangesNextState, true);

  assert.equal(manifest.installContract.verifyTwoShoreGate, 'src/two-shore-premaq-gate.js');
  assert.equal(manifest.installContract.verifyTwoShoreGateUi, 'src/two-shore-gate-ui.js');
  assert.equal(manifest.installContract.verifyWorldPremaqRegistry, 'src/world-premaq-registry.js');
});
