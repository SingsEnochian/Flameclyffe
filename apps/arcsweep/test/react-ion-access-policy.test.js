import assert from 'node:assert/strict';
import test from 'node:test';
import { createReactionEndpoint } from '../src/react-ion-bridge.js';
import { evaluateEndpointAccessPolicy } from '../src/react-ion-access-policy.js';

function endpoint({ consentScope = 'private', visibility = 'private', status = 'active', anchor = true } = {}) {
  return createReactionEndpoint({
    name: anchor ? 'window.terra' : 'terra',
    world: { id: 'world-terra', name: 'Terra Aeterna' },
    anchor: anchor ? {
      id: 'anchor-1',
      name: 'First Window',
      consent_scope: consentScope,
      confidence_mode: 'observed',
    } : null,
    address: anchor ? '10.20.30.40@220' : '1.2.3.4@220',
    provenance: anchor ? {
      anchor_visibility: visibility,
      anchor_status: status,
    } : {},
  });
}

test('global Helm authorisation remains mandatory even for a public-safe endpoint', () => {
  const result = evaluateEndpointAccessPolicy({
    endpoint: endpoint({ consentScope: 'public-safe', visibility: 'public' }),
    globalAuthorised: false,
    callerIsOwner: false,
  });
  assert.equal(result.admitted, false);
  assert.deepEqual(result.blocked_by, ['global-helm-authorisation-required']);
});

test('private Concordance anchor remains owner-only after DNS registration', () => {
  const result = evaluateEndpointAccessPolicy({
    endpoint: endpoint(),
    globalAuthorised: true,
    callerIsOwner: false,
    explicitInvitation: true,
  });
  assert.equal(result.admitted, false);
  assert.ok(result.blocked_by.includes('private-anchor-owner-only'));
  assert.ok(result.blocked_by.includes('consent-scope:private'));
  assert.equal(result.authority.private_anchor_does_not_become_public_by_dns_registration, true);
});

test('explicit-invitation-only anchor admits an invited non-owner without changing ownership', () => {
  const result = evaluateEndpointAccessPolicy({
    endpoint: endpoint({ consentScope: 'explicit-invitation-only', visibility: 'public' }),
    globalAuthorised: true,
    callerIsOwner: false,
    explicitInvitation: true,
  });
  assert.equal(result.admitted, true);
});

test('no-passive-inheritance anchor must be explicitly targeted', () => {
  const passive = evaluateEndpointAccessPolicy({
    endpoint: endpoint({ consentScope: 'no-passive-inheritance', visibility: 'public' }),
    globalAuthorised: true,
    callerIsOwner: true,
    explicitTarget: false,
  });
  const explicit = evaluateEndpointAccessPolicy({
    endpoint: endpoint({ consentScope: 'no-passive-inheritance', visibility: 'public' }),
    globalAuthorised: true,
    callerIsOwner: true,
    explicitTarget: true,
  });
  assert.equal(passive.admitted, false);
  assert.ok(passive.blocked_by.includes('consent-scope:no-passive-inheritance'));
  assert.equal(explicit.admitted, true);
});

test('inactive anchor is not routable through endpoint policy', () => {
  const result = evaluateEndpointAccessPolicy({
    endpoint: endpoint({ status: 'cleared' }),
    globalAuthorised: true,
    callerIsOwner: true,
  });
  assert.equal(result.admitted, false);
  assert.ok(result.blocked_by.includes('anchor-status:cleared'));
});

test('ordinary world endpoint is governed by the global Helm gate without anchor restrictions', () => {
  const result = evaluateEndpointAccessPolicy({
    endpoint: endpoint({ anchor: false }),
    globalAuthorised: true,
    callerIsOwner: false,
  });
  assert.equal(result.admitted, true);
  assert.equal(result.endpoint_policy.is_anchor, false);
});
