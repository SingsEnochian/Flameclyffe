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
  assert.equal(observation.epistemic.control_b_is_intention, true);
  assert.equal(observation.epistemic.physical_claim, false);
});

test('domain-general controls do not manufacture intention for natural systems', () => {
  const semantics = {
    a: {
      role: 'envelope-density',
      label: 'Envelope density',
      unit: 'normalised',
      source: 'model-input',
      intentional: false,
    },
    b: {
      role: 'accretion-rate',
      label: 'Accretion rate',
      unit: 'normalised',
      source: 'model-input',
      intentional: false,
    },
  };
  const observation = analyseCuspCatastrophe({
    controlA: -1,
    controlB: 0.05,
    controlSemantics: semantics,
    orderParameter: 1,
    previous: { controls: { a: -1, b: -0.05 } },
  });

  assert.equal(observation.controls.a, -1);
  assert.equal(observation.controls.b, 0.05);
  assert.equal(observation.control_semantics.a.role, 'envelope-density');
  assert.equal(observation.control_semantics.b.role, 'accretion-rate');
  assert.equal(observation.control_semantics.b.intentional, false);
  assert.equal(observation.history.control_b_direction, 'increasing');
  assert.equal(observation.history.intention_direction, null);
  assert.equal(observation.epistemic.control_b_is_intention, false);
  assert.equal(observation.epistemic.controls_are_domain_semantic, true);
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

test('hysteresis detector follows generic control-b sweep direction as well as BAI intention sweeps', () => {
  const semantics = {
    a: { role: 'density', label: 'Density', intentional: false },
    b: { role: 'forcing', label: 'External forcing', intentional: false },
  };
  const increasing = analyseCuspCatastrophe({
    controlA: -1,
    controlB: 0,
    controlSemantics: semantics,
    orderParameter: 1,
    previous: { controls: { a: -1, b: -0.1 } },
  });
  const decreasing = analyseCuspCatastrophe({
    controlA: -1,
    controlB: 0,
    controlSemantics: semantics,
    orderParameter: -1,
    previous: { controls: { a: -1, b: 0.1 } },
  });
  const trace = analyseCuspTrace([increasing, decreasing]);
  assert.equal(trace.hysteresis_detected, true);
  assert.equal(trace.epistemic.requires_opposite_control_b_sweeps, true);
  assert.equal(trace.witnesses[0].control_semantics.b.label, 'External forcing');
});
