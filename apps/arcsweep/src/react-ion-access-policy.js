import { REACTION_ENDPOINT_SCHEMA } from './react-ion-bridge.js';

export const REACTION_ACCESS_POLICY_SCHEMA = 'reaction.endpoint-access-policy/v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`REACT_ION_ACCESS_POLICY: ${message}`);
}

function normalise(value, fallback = '') {
  return String(value ?? fallback).trim().toLowerCase();
}

export function evaluateEndpointAccessPolicy({
  endpoint,
  globalAuthorised = false,
  callerIsOwner = true,
  circleMember = false,
  explicitInvitation = false,
  explicitTarget = true,
} = {}) {
  invariant(endpoint?.schema === REACTION_ENDPOINT_SCHEMA, 'a React-ion endpoint is required');
  const blockedBy = [];
  if (!globalAuthorised) blockedBy.push('global-helm-authorisation-required');

  const anchor = endpoint.anchor;
  const visibility = normalise(anchor?.visibility, 'private');
  const consentScope = normalise(anchor?.consent_scope, anchor ? 'private' : 'local');
  const anchorStatus = normalise(anchor?.status, anchor ? 'active' : 'not-anchor');

  if (anchor && anchorStatus !== 'active') blockedBy.push(`anchor-status:${anchorStatus}`);

  if (anchor) {
    if (visibility === 'private' && !callerIsOwner) blockedBy.push('private-anchor-owner-only');
    if (visibility === 'circle' && !(callerIsOwner || circleMember || explicitInvitation)) blockedBy.push('circle-anchor-membership-required');

    if (consentScope === 'private' && !callerIsOwner) blockedBy.push('consent-scope:private');
    if (consentScope === 'circle' && !(callerIsOwner || circleMember || explicitInvitation)) blockedBy.push('consent-scope:circle');
    if (consentScope === 'explicit-invitation-only' && !(callerIsOwner || explicitInvitation)) blockedBy.push('consent-scope:explicit-invitation-only');
    if (consentScope === 'no-passive-inheritance' && !explicitTarget) blockedBy.push('consent-scope:no-passive-inheritance');
  }

  return Object.freeze({
    schema: REACTION_ACCESS_POLICY_SCHEMA,
    endpoint: endpoint.name,
    admitted: blockedBy.length === 0,
    blocked_by: Object.freeze(blockedBy),
    context: Object.freeze({
      global_authorised: Boolean(globalAuthorised),
      caller_is_owner: Boolean(callerIsOwner),
      circle_member: Boolean(circleMember),
      explicit_invitation: Boolean(explicitInvitation),
      explicit_target: Boolean(explicitTarget),
    }),
    endpoint_policy: Object.freeze({
      is_anchor: Boolean(anchor),
      visibility,
      consent_scope: consentScope,
      anchor_status: anchorStatus,
    }),
    authority: Object.freeze({
      endpoint_policy_cannot_override_global_helm_authorisation: true,
      private_anchor_does_not_become_public_by_dns_registration: true,
      no_passive_inheritance_requires_explicit_targeting: true,
    }),
  });
}
