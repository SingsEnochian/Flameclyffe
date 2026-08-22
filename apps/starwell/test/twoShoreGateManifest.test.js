import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile(
  new URL('../public/modules/bifrost-arcsweep.module.json', import.meta.url),
  'utf8',
));

test('Bifröst registers the live two-shore PREMAQ gate as active v0.4 machinery', () => {
  assert.equal(manifest.engine.twoShoreGate, 'src/two-shore-premaq-gate.js');
  assert.equal(manifest.engine.twoShoreGateUi, 'src/two-shore-gate-ui.js');
  assert.equal(manifest.engine.worldPremaqRegistry, 'src/world-premaq-registry.js');

  for (const capability of [
    'two-shore-premaq-gate',
    'live-deep-groundwire-earth-prime-calibration',
    'selectable-target-world-premaq-origin',
    'premaq-369-cycle-paired-run',
    'premaq-save-and-extend-3-6-9',
    'elara-2025-2035-layer-export',
    'flameclyffe-wardenclyffe-layer-manifest',
  ]) {
    assert.ok(manifest.capabilities.includes(capability));
  }

  assert.equal(manifest.authorityContract.liveGateRequiresDeepAndGroundwire, true);
  assert.equal(manifest.authorityContract.earthPrimeUnknownSignalsRemainExplicit, true);
  assert.deepEqual(manifest.authorityContract.lockedGateToneAxes, ['P', 'R', 'E', 'M', 'A', 'Q']);
  assert.equal(manifest.authorityContract.bridgeCoherenceAxis, 'C');
  assert.equal(manifest.authorityContract.gateBaseCycles, 369);
  assert.deepEqual(manifest.authorityContract.gateExtensionCycles, [3, 6, 9]);
  assert.deepEqual(
    manifest.authorityContract.elaraYearLabels,
    [2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035],
  );
  assert.equal(manifest.authorityContract.yearMultiplierChangesAudibleCarrier, false);
  assert.equal(manifest.authorityContract.externalPhysicalGateClaimed, false);
  assert.equal(manifest.authorityContract.releaseFeedsNextCompression, true);

  assert.equal(manifest.installContract.verifyTwoShoreGate, 'src/two-shore-premaq-gate.js');
  assert.equal(manifest.installContract.verifyTwoShoreGateUi, 'src/two-shore-gate-ui.js');
  assert.equal(manifest.installContract.verifyWorldPremaqRegistry, 'src/world-premaq-registry.js');
});
