import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BUILT_IN_DOMAIN_CONTROL_PROFILES,
  DOMAIN_CONTROL_SWEEP_SCHEMA,
  compareDomainControlSweeps,
  normaliseDomainControlProfile,
  runBidirectionalDomainSweep,
} from '../src/domain-control-bench.js';

function profile(id) {
  return BUILT_IN_DOMAIN_CONTROL_PROFILES.find((item) => item.profile_id === id);
}

test('natural-system fixture carries explicit non-intentional controls', () => {
  const blackHoleStar = profile('black-hole-star-lrd');
  assert.ok(blackHoleStar);
  assert.equal(blackHoleStar.domain, 'astrophysics');
  assert.equal(blackHoleStar.control_semantics.a.intentional, false);
  assert.equal(blackHoleStar.control_semantics.b.intentional, false);
  assert.equal(blackHoleStar.authority.physical_claim, false);
  assert.equal(blackHoleStar.authority.physical_calibration, false);
});

test('BAI remains a distinct intentional projection without becoming the generic ontology', () => {
  const bai = profile('bai-requested-transformation');
  const natural = profile('black-hole-star-lrd');
  assert.equal(bai.control_semantics.b.role, 'intention');
  assert.equal(bai.control_semantics.b.intentional, true);
  assert.notEqual(natural.control_semantics.b.role, 'intention');
  assert.equal(natural.control_semantics.b.intentional, false);
});

test('bidirectional control-b sweep witnesses canonical cusp hysteresis', async () => {
  const sweep = await runBidirectionalDomainSweep({
    profile: profile('black-hole-star-lrd'),
    sweptControl: 'b',
    start: -0.6,
    end: 0.6,
    steps: 61,
    fixedControl: -1,
    initialOrderParameter: 0,
    generatedAt: '2026-08-14T13:30:00.000Z',
  });

  assert.equal(sweep.schema, DOMAIN_CONTROL_SWEEP_SCHEMA);
  assert.equal(sweep.configuration.swept_control, 'b');
  assert.equal(sweep.profile.control_semantics.b.intentional, false);
  assert.equal(sweep.hysteresis.detected, true);
  assert.ok(sweep.hysteresis.witness_count > 0);
  assert.ok(sweep.hysteresis.loop_area > 0);
  assert.equal(sweep.summary.topology_state, 'HYSTERETIC');
  assert.ok(sweep.summary.max_equilibrium_count >= 3);
});

test('the bench can sweep control a as an independent domain variable', async () => {
  const sweep = await runBidirectionalDomainSweep({
    profile: profile('runa-acoustic-field'),
    sweptControl: 'a',
    start: 0.25,
    end: -1.5,
    steps: 31,
    fixedControl: 0.2,
    initialOrderParameter: 0,
    generatedAt: '2026-08-14T13:31:00.000Z',
  });

  assert.equal(sweep.configuration.swept_control, 'a');
  assert.equal(sweep.configuration.fixed_control, 'b');
  assert.equal(sweep.forward.length, 31);
  assert.equal(sweep.reverse.length, 31);
  assert.equal(sweep.forward[0].control_a, 0.25);
  assert.equal(sweep.forward.at(-1).control_a, -1.5);
  assert.equal(sweep.authority.controls_may_be_nonintentional, true);
});

test('sweep receipts replay deterministically at the fingerprint level for identical inputs', async () => {
  const input = {
    profile: profile('bai-requested-transformation'),
    sweptControl: 'b',
    start: -0.5,
    end: 0.5,
    steps: 41,
    fixedControl: -1,
    initialOrderParameter: 0,
  };
  const first = await runBidirectionalDomainSweep({ ...input, generatedAt: '2026-08-14T13:32:00.000Z' });
  const second = await runBidirectionalDomainSweep({ ...input, generatedAt: '2026-08-14T13:33:00.000Z' });
  assert.equal(first.sweep_fingerprint, second.sweep_fingerprint);
  assert.equal(first.sweep_id, second.sweep_id);
  assert.notEqual(first.generated_at, second.generated_at);
});

test('custom profile normalisation preserves semantic distinction and comparison does not equate domains', async () => {
  const weather = normaliseDomainControlProfile({
    profile_id: 'weather-front-test',
    name: 'Weather front test',
    domain: 'meteorology',
    control_semantics: {
      a: { role: 'pressure-gradient', label: 'Pressure gradient', unit: 'normal-form', intentional: false },
      b: { role: 'moisture-flux', label: 'Moisture flux', unit: 'normal-form', intentional: false },
    },
    ranges: {
      a: { minimum: -2, maximum: 0.5, default: -1 },
      b: { minimum: -0.6, maximum: 0.6, default: 0 },
    },
  });
  const weatherSweep = await runBidirectionalDomainSweep({ profile: weather, sweptControl: 'b', fixedControl: -1, steps: 21 });
  const baiSweep = await runBidirectionalDomainSweep({ profile: profile('bai-requested-transformation'), sweptControl: 'b', fixedControl: -1, steps: 21 });
  const comparison = compareDomainControlSweeps([weatherSweep, baiSweep]);

  assert.equal(comparison.row_count, 2);
  assert.equal(comparison.authority.semantics_not_assumed_equivalent_across_domains, true);
  assert.equal(comparison.rows[0].control_b_intentional, false);
  assert.equal(comparison.rows[1].control_b_intentional, true);
});
