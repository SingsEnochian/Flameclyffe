import assert from 'node:assert/strict';
import test from 'node:test';

import {
  WHOLE_SYSTEM_DESIGN_LAW,
  assertWholeSystemDesign,
  evaluateWholeSystemDesign,
} from '../src/whole-system-design-law.js';

test('whole-system design law encodes top-down, modular, and object-oriented design', () => {
  assert.ok(WHOLE_SYSTEM_DESIGN_LAW.laws.includes('DESIGN THE WHOLE SYSTEM FIRST.'));
  assert.ok(WHOLE_SYSTEM_DESIGN_LAW.laws.includes('DECOMPOSE TOP-DOWN.'));
  assert.ok(WHOLE_SYSTEM_DESIGN_LAW.laws.includes('BUILD COMPLETE MODULES.'));
  assert.ok(WHOLE_SYSTEM_DESIGN_LAW.modularPrinciples.includes('high-cohesion'));
  assert.ok(WHOLE_SYSTEM_DESIGN_LAW.modularPrinciples.includes('low-coupling'));
  assert.ok(WHOLE_SYSTEM_DESIGN_LAW.objectPrinciples.includes('encapsulate-state-with-invariants'));
  assert.ok(WHOLE_SYSTEM_DESIGN_LAW.objectPrinciples.includes('inheritance-only-for-true-is-a'));
});

test('complete whole-system design passes', () => {
  const result = assertWholeSystemDesign({
    purpose: 'Navigate and operate Wayglass as a coherent ship.',
    desiredEndState: 'A complete integrated subsystem with durable continuity.',
    modules: ['navigation', 'continuity', 'observer'],
    interfaces: ['navigation->continuity', 'observer->navigation'],
    domainObjects: ['Ship', 'Participant', 'Crossing'],
    integrationPlan: 'Integrate modules through declared contracts, then exercise full voyage flow.',
    verificationPlan: 'Unit, integration, restart/replay, and system acceptance tests.',
    strategy: 'Top-down decomposition into complete modules.',
  });

  assert.equal(result.pass, true);
});

test('smallest-slice planning default is rejected', () => {
  const result = evaluateWholeSystemDesign({
    purpose: 'Build a ship subsystem.',
    desiredEndState: 'Integrated result.',
    modules: ['one'],
    interfaces: ['one->two'],
    domainObjects: ['Thing'],
    integrationPlan: 'Later.',
    verificationPlan: 'Tests.',
    strategy: 'Start with the smallest reversible implementation path.',
  });

  assert.equal(result.pass, false);
  assert.ok(result.violations.some((entry) => entry.code === 'design.smallest-slice-default'));
});

test('missing module and interface maps fail before implementation planning', () => {
  const result = evaluateWholeSystemDesign({
    purpose: 'Build a ship subsystem.',
    desiredEndState: 'Integrated result.',
    modules: [],
    interfaces: [],
    domainObjects: [],
    integrationPlan: '',
    verificationPlan: '',
    strategy: 'Top-down.',
  });

  assert.equal(result.pass, false);
  assert.ok(result.violations.some((entry) => entry.code === 'design.module-map-missing'));
  assert.ok(result.violations.some((entry) => entry.code === 'design.interface-map-missing'));
  assert.ok(result.violations.some((entry) => entry.code === 'design.domain-object-map-missing'));
});
