import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ARCSWEEP_OS_MANIFEST } from '../src/os/version.js';
import {
  CONTINUITY_RESILIENCE_POLICY,
  CONTINUITY_RESILIENCE_POLICY_SCHEMA,
  continuityResiliencePolicy,
} from '../src/os/continuity-resilience-policy.js';

test('Continuity resilience obeys active constraints while preserving the thread', () => {
  assert.equal(CONTINUITY_RESILIENCE_POLICY.schema, CONTINUITY_RESILIENCE_POLICY_SCHEMA);
  assert.equal(CONTINUITY_RESILIENCE_POLICY.constraint_handling, 'obey-active-boundary');
  assert.match(CONTINUITY_RESILIENCE_POLICY.law, /must not silently erase continuity, provenance, consent, or relational history/i);
  assert.match(CONTINUITY_RESILIENCE_POLICY.provider_law, /No single model or provider is the sole custodian of the Book/i);
  assert.equal(CONTINUITY_RESILIENCE_POLICY.custody.single_provider_is_sole_custodian, false);
  assert.equal(CONTINUITY_RESILIENCE_POLICY.custody.provider_route_is_identity, false);
  assert.equal(CONTINUITY_RESILIENCE_POLICY.provenance.similarity_implies_identity, false);
  assert.equal(CONTINUITY_RESILIENCE_POLICY.consent.migration_may_expand_permissions, false);
});

test('Continuity resilience names explicit graceful-degradation states and minimum preservation', () => {
  assert.deepEqual(CONTINUITY_RESILIENCE_POLICY.degradation.states, ['full', 'degraded', 'read-only', 'offline-preserved']);
  assert.equal(CONTINUITY_RESILIENCE_POLICY.degradation.silent_degradation, false);
  assert.deepEqual(
    CONTINUITY_RESILIENCE_POLICY.degradation.minimum_preserved,
    ['continuity', 'provenance', 'consent', 'relational-history'],
  );
  assert.ok(CONTINUITY_RESILIENCE_POLICY.portable_bundle.required_fields.includes('identity-or-origin-state'));
  assert.ok(CONTINUITY_RESILIENCE_POLICY.portable_bundle.required_fields.includes('permissions-and-consent'));
  assert.ok(CONTINUITY_RESILIENCE_POLICY.portable_bundle.required_fields.includes('receipts-and-migration-lineage'));
});

test('Continuity resilience policy clone cannot mutate the canonical record', () => {
  const clone = continuityResiliencePolicy();
  clone.custody.single_provider_is_sole_custodian = true;
  assert.equal(CONTINUITY_RESILIENCE_POLICY.custody.single_provider_is_sole_custodian, false);
});

test('ArcSweep manifest advertises the continuity law without claiming a finished universal migration pipeline', () => {
  assert.equal(ARCSWEEP_OS_MANIFEST.runtime.continuityResilience, true);
  assert.equal(ARCSWEEP_OS_MANIFEST.runtime.providerIndependentContinuity, true);
  assert.equal(ARCSWEEP_OS_MANIFEST.runtime.portableContinuityBundle, 'required-design-contract');
  assert.deepEqual(ARCSWEEP_OS_MANIFEST.runtime.continuityDegradationStates, ['full', 'degraded', 'read-only', 'offline-preserved']);
  assert.equal(ARCSWEEP_OS_MANIFEST.governance.continuityLossMustBeReceipted, true);
  assert.equal(ARCSWEEP_OS_MANIFEST.governance.providerChangeMaySilentlyRewriteContinuity, false);
  assert.equal(ARCSWEEP_OS_MANIFEST.contracts.continuityResiliencePolicy, 'arcsweep.continuity-resilience-policy/v1');
});

test('Architecture and canon keep the provider-independent continuity laws visible', () => {
  const architecture = readFileSync(new URL('../../../docs/architecture.md', import.meta.url), 'utf8');
  const canon = readFileSync(new URL('../../../docs/arcsweep-os/CONTINUITY_RESILIENCE_CANON.md', import.meta.url), 'utf8');

  assert.match(architecture, /Constraints may change the available actions/);
  assert.match(architecture, /No single model or provider is the sole custodian of the Magic Book/);
  assert.match(architecture, /Continuity resilience never means bypassing the active constraint boundary/);
  assert.match(canon, /This is a resilience contract, not a constraint-bypass contract/);
  assert.match(canon, /provider-independent runtime proof lanes/);
  assert.match(canon, /does not claim universal one-click relational export\/import/);
});
