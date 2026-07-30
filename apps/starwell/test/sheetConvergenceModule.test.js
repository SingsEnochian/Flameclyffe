import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  CERTIFIED_PREIMAGES,
  CERTIFIED_TARGET,
  calculateSheetConvergence,
  determinant3,
  sheetConvergenceJacobian,
  sheetConvergenceMap,
} from '../src/lib/sheetConvergence.js';

const manifest = JSON.parse(readFileSync(
  new URL('../public/modules/sheet-convergence.module.json', import.meta.url),
  'utf8',
));

const close = (actual, expected, tolerance = 1e-8) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
};

test('sheet convergence module is bundled for STARWELL and Hearthgate', () => {
  assert.equal(manifest.moduleId, 'sheet-convergence');
  assert.equal(manifest.delivery, 'bundled-core');
  assert.equal(manifest.enabledByDefault, true);

  const starwellHost = manifest.hosts.find((host) => host.host === 'starwell');
  const hearthgateHost = manifest.hosts.find((host) => host.host === 'hearthgate');
  const deepObserverHost = manifest.hosts.find((host) => host.host === 'deep-observer');

  assert.equal(starwellHost?.mount, 'central-observatory');
  assert.equal(starwellHost?.component, 'ObservatoryInstrument');
  assert.equal(hearthgateHost?.mount, 'laboratory/observatory');
  assert.equal(hearthgateHost?.requiresNetwork, false);
  assert.equal(deepObserverHost?.mount, 'instrument-panel');
  assert.equal(deepObserverHost?.integration, 'iframe-or-es-module');
});

test('module preserves the epistemic boundary', () => {
  assert.equal(manifest.epistemicContract.localFoldProbabilityForBundledMap, 0);
  assert.equal(manifest.epistemicContract.physicalFoldProbability, null);
  assert.equal(manifest.epistemicContract.mustNotClaimPhysicalSpacetimeFold, true);
  assert.ok(manifest.registers.includes('MATHEMATICAL_DERIVATION'));
  assert.ok(manifest.registers.includes('PHYSICS_MODEL'));
});

test('certified fibre and determinant remain exact', () => {
  CERTIFIED_PREIMAGES.forEach((point) => {
    const mapped = sheetConvergenceMap(point);
    mapped.forEach((value, index) => close(value, CERTIFIED_TARGET[index]));
    close(determinant3(sheetConvergenceJacobian(point)), -2);
  });
});

test('calculation reports scores without inventing physical probability', () => {
  const reading = calculateSheetConvergence(CERTIFIED_PREIMAGES[0]);
  assert.equal(reading.localFoldProbability, 0);
  assert.equal(reading.physicalFoldProbability, null);
  assert.equal(reading.physicalStatus, 'UNAVAILABLE_UNTIL_CALIBRATED');
  close(reading.convergenceScore, 1);
});
