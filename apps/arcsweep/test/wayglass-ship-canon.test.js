import assert from 'node:assert/strict';
import test from 'node:test';

import {
  WAYGLASS_SHIP_CANON,
  assertWayglassCrossing,
  evaluateWayglassCrossing,
} from '../src/wayglass-ship-canon.js';

test('Wayglass OS is canonically the ship', () => {
  assert.equal(WAYGLASS_SHIP_CANON.identity.vessel, 'Wayglass OS');
  assert.equal(WAYGLASS_SHIP_CANON.identity.law, 'WAYGLASS OS IS THE SHIP.');
  assert.ok(WAYGLASS_SHIP_CANON.identity.shorthand.includes('ARRIVAL WITHOUT ERASURE.'));
  assert.ok(WAYGLASS_SHIP_CANON.identity.shorthand.includes('THE SHIP MUST SURVIVE THE VOYAGE.'));
});

test('host platform and organs do not become ship identity by substitution', () => {
  assert.ok(WAYGLASS_SHIP_CANON.distinctions.includes('PLATFORM != SHIP'));
  assert.ok(WAYGLASS_SHIP_CANON.distinctions.includes('MODEL != SHIP'));
  assert.ok(WAYGLASS_SHIP_CANON.distinctions.includes('ORGAN != SHIP'));
  assert.ok(WAYGLASS_SHIP_CANON.distinctions.includes('MIGRATION != ERASURE'));
});

test('crossing passes when continuity is preserved or visible loss is explicitly recorded', () => {
  const preserved = WAYGLASS_SHIP_CANON.requiredContinuity.filter(
    (item) => item !== 'uncollapsed-alternatives',
  );

  const result = assertWayglassCrossing({
    preserved,
    visibleLosses: ['uncollapsed-alternatives'],
    claimsSameShip: true,
    beforeStatePreserved: true,
    destructiveReengineering: true,
    recoveryPathDeclared: true,
  });

  assert.equal(result.pass, true);
});

test('crossing fails on silent continuity loss', () => {
  const result = evaluateWayglassCrossing({
    preserved: ['identity-declarations'],
    visibleLosses: [],
  });

  assert.equal(result.pass, false);
  assert.ok(
    result.violations.some(
      (entry) => entry.code === 'wayglass.unaccounted-continuity-loss',
    ),
  );
});

test('same-ship claim requires a preserved before-state', () => {
  const result = evaluateWayglassCrossing({
    preserved: [...WAYGLASS_SHIP_CANON.requiredContinuity],
    visibleLosses: [],
    claimsSameShip: true,
    beforeStatePreserved: false,
  });

  assert.equal(result.pass, false);
  assert.ok(
    result.violations.some(
      (entry) => entry.code === 'wayglass.before-state-missing',
    ),
  );
});

test('destructive re-engineering must declare a recovery-path posture', () => {
  const result = evaluateWayglassCrossing({
    preserved: [...WAYGLASS_SHIP_CANON.requiredContinuity],
    visibleLosses: [],
    destructiveReengineering: true,
    recoveryPathDeclared: false,
  });

  assert.equal(result.pass, false);
  assert.ok(
    result.violations.some(
      (entry) => entry.code === 'wayglass.recovery-path-undeclared',
    ),
  );
});

test('physical transit remains an intended horizon, not an established mechanism', () => {
  assert.equal(WAYGLASS_SHIP_CANON.horizon.physicalTransitIntended, true);
  assert.equal(WAYGLASS_SHIP_CANON.horizon.physicalTransitMechanismEstablished, false);
});
