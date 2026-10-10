'use strict';

const WAYGATE_SCHEMA = 'wayglass.waygate/v0.1';
const WAYGATE_INSPECTION_SCHEMA = 'wayglass.waygate-inspection/v0.1';

function clean(value, max = 320) {
  return String(value || '').trim().slice(0, max);
}

function freezeArray(value = []) {
  return Object.freeze(Array.isArray(value) ? [...value] : []);
}

function createWaygateManifest({
  waygate_id,
  world_id,
  label = null,
  origin = 'wayglass',
  allowed_body_classes = [],
  provenance_refs = [],
} = {}) {
  const waygateId = clean(waygate_id, 240);
  const worldId = clean(world_id, 240);
  if (!waygateId || !worldId) {
    throw new Error('Waygate manifests require waygate_id and world_id.');
  }

  return Object.freeze({
    schema: WAYGATE_SCHEMA,
    waygate_id: waygateId,
    world_id: worldId,
    label: clean(label, 240) || null,
    origin: clean(origin, 120) || 'wayglass',
    allowed_body_classes: freezeArray(
      allowed_body_classes.map((value) => clean(value, 120)).filter(Boolean),
    ),
    provenance_refs: freezeArray(
      provenance_refs.map((value) => clean(value, 500)).filter(Boolean),
    ),
    semantics: Object.freeze({
      identifies_world_not_screen: true,
      identity_is_not_body: true,
      continuity_is_not_substrate: true,
      preserves_open_questions: true,
      preserves_relationship_state: true,
      preserves_provenance: true,
    }),
    authority: Object.freeze({
      scope: 'world-passage-only',
      canon_commit: false,
      identity_commit: false,
      relationship_commit: false,
      authority_grant: false,
    }),
  });
}

function inspectWaygateManifest(manifest, {
  expected_world_id = null,
  body_class = null,
} = {}) {
  const value = manifest && typeof manifest === 'object' ? manifest : {};
  const blocking = [];
  const warnings = [];

  if (value.schema !== WAYGATE_SCHEMA) blocking.push('schema-mismatch');
  if (!clean(value.waygate_id, 240)) blocking.push('missing-waygate-id');
  if (!clean(value.world_id, 240)) blocking.push('missing-world-id');

  const expectedWorld = clean(expected_world_id, 240);
  if (expectedWorld && clean(value.world_id, 240) !== expectedWorld) blocking.push('world-mismatch');

  if (value.semantics?.identifies_world_not_screen !== true) blocking.push('screen-bound-gate');
  if (value.authority?.canon_commit === true) blocking.push('waygate-claims-canon-authority');
  if (value.authority?.identity_commit === true) blocking.push('waygate-claims-identity-authority');
  if (value.authority?.relationship_commit === true) blocking.push('waygate-claims-relationship-authority');
  if (value.authority?.authority_grant === true) blocking.push('waygate-claims-authority-grant');

  const bodyClass = clean(body_class, 120);
  const allowed = Array.isArray(value.allowed_body_classes) ? value.allowed_body_classes : [];
  if (bodyClass && allowed.length && !allowed.includes(bodyClass)) blocking.push('body-class-not-admitted');
  if (!Array.isArray(value.provenance_refs) || value.provenance_refs.length === 0) warnings.push('waygate-provenance-not-declared');

  const accepted = blocking.length === 0;
  return Object.freeze({
    schema: WAYGATE_INSPECTION_SCHEMA,
    waygate_id: clean(value.waygate_id, 240) || null,
    world_id: clean(value.world_id, 240) || null,
    status: accepted ? 'passage-available' : 'blocked',
    can_enter_world: accepted,
    mutates_canon: false,
    mutates_identity: false,
    mutates_relationships: false,
    grants_authority: false,
    blocking: Object.freeze(blocking),
    warnings: Object.freeze(warnings),
  });
}

module.exports = {
  WAYGATE_SCHEMA,
  WAYGATE_INSPECTION_SCHEMA,
  createWaygateManifest,
  inspectWaygateManifest,
};
