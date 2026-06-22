import { createYggInterface, createYggRoomTemplate, createYggRoomProposal } from './yggInterfaceSchema.js';

export const yggInterfaces = Object.freeze([
  createYggInterface({
    id: 'ygg-account-gate',
    title: 'Ygg Account Gate',
    mode: 'account-gate',
    inputs: ['keyboard', 'pointer'],
    outputs: ['local-account-preview', 'visible-consent-state'],
  }),
  createYggInterface({
    id: 'ygg-branch-passport',
    title: 'Ygg Branch Passport',
    mode: 'branch-passport',
    inputs: ['account-customization'],
    outputs: ['identity-card-preview', 'privacy-state'],
  }),
  createYggInterface({
    id: 'ygg-room-builder',
    title: 'Ygg Room Builder',
    mode: 'room-builder',
    inputs: ['template', 'account-customization', 'current-node'],
    outputs: ['room-seed-proposal', 'world-node-preview'],
  }),
  createYggInterface({
    id: 'ygg-starmap-overlay',
    title: 'Ygg Starmap Overlay',
    mode: 'starmap-overlay',
    inputs: ['world-node-registry', 'pointer', 'keyboard'],
    outputs: ['map-hotspot-preview', 'tooltip-preview'],
  }),
  createYggInterface({
    id: 'ygg-sound-console',
    title: 'Ygg Sound Console',
    mode: 'sound-console',
    inputs: ['room-seed-proposal', 'sound-patch-registry'],
    outputs: ['proposal-only-sound-layer', 'muted-room-soundscape-preview'],
  }),
]);

export const yggRoomTemplates = Object.freeze([
  createYggRoomTemplate({
    id: 'hearth-nook',
    title: 'Hearth Nook',
    kind: 'chamber',
    suggestedParentId: 'templehouse',
    description: 'A private resting room grown near Templehouse, tuned for quiet, captions, and soft return routes.',
  }),
  createYggRoomTemplate({
    id: 'starlit-atelier',
    title: 'Starlit Atelier',
    kind: 'gallery',
    suggestedParentId: 'dreaming-grove',
    worldKind: 'gallery',
    description: 'A visual room for canon images, sketches, and living reference cards.',
    theme: { biome: 'starlight-gallery', palette: 'sea-blue-moon-gold', motion: 'safe' },
    access: { visibility: 'shared', consent: 'invite-only', exitRoute: 'dreaming-grove', shared: true },
    roomControls: { canInvite: true, canPublish: false, requiresReviewForCanon: true },
  }),
  createYggRoomTemplate({
    id: 'tone-lab',
    title: 'Tone Lab',
    kind: 'lab',
    suggestedParentId: 'ygg-gate',
    worldKind: 'lab',
    description: 'A proposal-only sound and haptic design room. It displays sound contracts without live playback.',
    theme: { biome: 'threshold-root', palette: 'north-star-gold-green', motion: 'safe' },
    access: { visibility: 'private', consent: 'ask-first', exitRoute: 'ygg-gate', shared: false },
    roomControls: { canRename: true, canRetheme: true, canInvite: false, canPublish: false, requiresReviewForCanon: true },
  }),
  createYggRoomTemplate({
    id: 'moon-bridge',
    title: 'Moon Bridge',
    kind: 'bridge',
    suggestedParentId: 'dreaming-grove',
    worldKind: 'room',
    description: 'A threshold room for moving between Grove, Terra Aeterna, and story-world branches with clear exit routes.',
    theme: { biome: 'moonlit-threshold', palette: 'velvet-twilight', motion: 'still-magic' },
    access: { visibility: 'shared', consent: 'invite-only', exitRoute: 'dreaming-grove', shared: true },
    roomControls: { canInvite: true, canPublish: false, requiresReviewForCanon: true },
  }),
]);

export function findYggInterface(id) {
  return yggInterfaces.find((yggInterface) => yggInterface.id === id) ?? null;
}

export function findYggRoomTemplate(id) {
  return yggRoomTemplates.find((template) => template.id === id) ?? null;
}

export function createYggRoomBuilderProposal({ templateId = 'hearth-nook', account, parentNodeId, customization } = {}) {
  const template = findYggRoomTemplate(templateId) ?? findYggRoomTemplate('hearth-nook');
  return createYggRoomProposal({
    template,
    account,
    parentNodeId,
    customization: customization ?? account?.customization,
  });
}
