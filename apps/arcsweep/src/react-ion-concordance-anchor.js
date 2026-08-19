import { createDestinationRegistration } from './react-ion-registry.js';

export const REACTION_CONCORDANCE_ANCHOR_BRIDGE_SCHEMA = 'reaction.concordance-anchor-bridge/v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`REACT_ION_CONCORDANCE_ANCHOR: ${message}`);
}

function text(value, field) {
  const normalised = String(value ?? '').trim();
  invariant(normalised, `${field} is required`);
  return normalised;
}

export async function createConcordanceAnchorDestination({
  anchor,
  registrationId,
  dnsName,
  aliases = [],
  worldId,
  worldName,
  address,
  state = 'draft',
  publicationAuthorised = false,
  updatedAt = new Date().toISOString(),
} = {}) {
  invariant(anchor && typeof anchor === 'object', 'a Concordance anchor is required');
  const anchorId = text(anchor.id || anchor.slug, 'anchor.id');
  const anchorName = text(anchor.display_name || anchor.label, 'anchor.display_name');
  const anchorStatus = String(anchor.status || 'active').trim().toLowerCase();
  const requestedState = String(state || 'draft').trim().toLowerCase();
  invariant(['draft', 'approved', 'deprecated'].includes(requestedState), 'state must be draft, approved, or deprecated');
  if (requestedState === 'approved') {
    invariant(publicationAuthorised === true, 'approved anchor publication requires explicit authorisation');
    invariant(anchorStatus === 'active', 'only an active Concordance anchor may be approved for dimensional routing');
  }

  const registration = await createDestinationRegistration({
    id: text(registrationId, 'registrationId'),
    name: text(dnsName, 'dnsName'),
    aliases,
    kind: 'anchor',
    worldId: text(worldId, 'worldId'),
    worldName: text(worldName, 'worldName'),
    anchorId,
    anchorName,
    anchorConsentScope: String(anchor.consent_scope || 'private').trim(),
    anchorConfidenceMode: String(anchor.confidence_mode || 'unknown').trim(),
    anchorVisibility: String(anchor.visibility || 'private').trim(),
    anchorStatus,
    address: text(address, 'address'),
    state: requestedState,
    notes: `Concordance anchor metadata only; no camera image or video. Anchor layer ${String(anchor.layer || 'unknown')}; device ${String(anchor.device_mode || 'unknown')}.`,
    updatedAt,
  });

  return Object.freeze({
    schema: REACTION_CONCORDANCE_ANCHOR_BRIDGE_SCHEMA,
    registration,
    anchor_ref: Object.freeze({
      id: anchorId,
      name: anchorName,
      layer: String(anchor.layer || 'unknown'),
      visibility: String(anchor.visibility || 'private'),
      consent_scope: String(anchor.consent_scope || 'private'),
      confidence_mode: String(anchor.confidence_mode || 'unknown'),
      status: anchorStatus,
    }),
    authority: Object.freeze({
      publication_authorised: requestedState === 'approved' ? true : Boolean(publicationAuthorised),
      approval_requires_explicit_action: true,
      address_inferred_from_anchor_geometry: false,
      camera_media_copied: false,
      metadata_only: true,
    }),
  });
}
