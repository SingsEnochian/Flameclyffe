import test from 'node:test';
import assert from 'node:assert/strict';

import {
  analyseCuspCatastrophe,
  analyseCuspTrace,
} from '../src/arcsweep-temporal-quantum/cusp-catastrophe.js';

test('canonical cusp separates single, multistable, fold, and cusp regimes', () => {
  assert.equal(analyseCuspCatastrophe({ structure: 1, intention: 0 }).regime, 'single-stable');
  assert.equal(analyseCuspCatastrophe({ structure: -1, intention: 0 }).regime, 'multistable');
  assert.equal(analyseCuspCatastrophe({ structure: -3, intention: 2 }).regime, 'fold-boundary');
  assert.equal(analyseCuspCatastrophe({ structure: 0, intention: 0 }).regime, 'cusp-point');
});

test('multistable region exposes two stable branches separated by an unstable branch', () => {
  const observation = analyseCuspCatastrophe({ structure: -1, intention: 0, orderParameter: 0.9 });
  assert.equal(observation.equilibria.length, 3);
  assert.deepEqual(observation.equilibria.map((root) => root.stability), ['stable', 'unstable', 'stable']);
  assert.equal(observation.selected_equilibrium.branch, 'upper');
  assert.equal(observation.history.path_dependence_possible, true);
});

test('intention remains distinct from PREMAQC Agency in the observation contract', () => {
  const observation = analyseCuspCatastrophe({ structure: -1, intention: 0 });
  assert.equal(observation.epistemic.intention_is_premaqc_agency, false);
  assert.equal(observation.epistemic.physical_claim, false);
});

test('hysteresis requires opposite sweeps at comparable controls on different stable branches', () => {
  const increasing = analyseCuspCatastrophe({
    structure: -1,
    intention: 0,
    orderParameter: 1,
    previous: { controls: { structure: -1, intention: -0.1 } },
  });
  const decreasing = analyseCuspCatastrophe({
    structure: -1,
    intention: 0,
    orderParameter: -1,
    previous: { controls: { structure: -1, intention: 0.1 } },
  });
  const trace = analyseCuspTrace([increasing, decreasing]);
  assert.equal(trace.hysteresis_detected, true);
  assert.equal(trace.witnesses.length, 1);
  assert.notEqual(trace.witnesses[0].left_branch, trace.witnesses[0].right_branch);
});
