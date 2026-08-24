import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile(
  new URL('../public/modules/bifrost-arcsweep.module.json', import.meta.url),
  'utf8',
));

test('Bifröst registers the live two-shore PREMAQC gate as canonical v0.5 machinery', () => {
  assert.equal(manifest.version, '0.5.0');
  assert.equal(manifest.engine.twoShorePremaqcGate, 'src/two-shore-premaqc-gate.js');
  assert.equal(manifest.engine.twoShoreGateUi, 'src/two-shore-gate-ui.js');
  assert.equal(manifest.engine.worldPremaqcRegistry, 'src/world-premaqc-registry.js');
  assert.equal(manifest.schemas.premaqc, 'schemas/premaqc-state-v2.schema.json');

  for (const capability of [
    'two-shore-premaqc-gate',
    'live-deep-groundwire-earth-prime-calibration',
    'selectable-target-world-premaqc-origin',
    'premaqc-369-cycle-paired-run',
    'premaqc-save-and-extend-3-6-9',
    'elara-2025-2035-layer-export',
    'flameclyffe-wardenclyffe-layer-manifest',
  ]) {
    assert.ok(manifest.capabilities.includes(capability));
  }

  const authority = manifest.authorityContract;
  assert.equal(authority.premaqcCanonicalVocabulary, true);
  assert.equal(authority.legacyPremaqAliasesCompatibilityOnly, true);
  assert.equal(authority.liveGateRequiresDeepAndGroundwire, true);
  assert.equal(authority.earthPrimeUnknownSignalsRemainExplicit, true);
  assert.deepEqual(authority.dynamicPremaqcAxes, ['P', 'C', 'R', 'E', 'M', 'A']);
  assert.deepEqual(authority.contextOnlyPremaqcAxes, ['Q']);
  assert.deepEqual(authority.lockedGateToneAxes, ['P', 'R', 'E', 'M', 'A']);
  assert.equal(authority.bridgeCoherenceAxis, 'C');
  assert.equal(authority.qualiaFirsthandOnly, true);
  assert.equal(authority.qualiaMagnitudeInferenceAllowed, false);
  assert.equal(authority.qualiaCompressionFocusAllowed, false);
  assert.equal(authority.qualiaSonified, false);
  assert.equal(authority.gateBaseCycles, 369);
  assert.deepEqual(authority.gateExtensionCycles, [3, 6, 9]);
  assert.deepEqual(authority.elaraYearLabels, [2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035]);
  assert.equal(authority.yearMultiplierChangesAudibleCarrier, false);
  assert.equal(authority.externalPhysicalGateClaimed, false);
  assert.equal(authority.releaseFeedsNextCompression, true);

  assert.equal(manifest.installContract.verifyTwoShorePremaqcGate, 'src/two-shore-premaqc-gate.js');
  assert.equal(manifest.installContract.verifyTwoShoreGateUi, 'src/two-shore-gate-ui.js');
  assert.equal(manifest.installContract.verifyWorldPremaqcRegistry, 'src/world-premaqc-registry.js');
  assert.ok(manifest.installContract.verifySchemas.includes('schemas/premaqc-state-v2.schema.json'));
  assert.equal(manifest.legacyAliases.status, 'compatibility-only');
});
