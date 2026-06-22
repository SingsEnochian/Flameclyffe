import { createWorldNode, validateWorldNode } from '../worlds/worldNodeSchema.js';

export const YGG_INTERFACE_MODES = Object.freeze({
  accountGate: 'account-gate',
  branchPassport: 'branch-passport',
  starmapOverlay: 'starmap-overlay',
  roomBuilder: 'room-builder',
  soundConsole: 'sound-console',
  plainPass: 'plain-pass',
});

export const YGG_ROOM_TEMPLATE_KINDS = Object.freeze({
  chamber: 'chamber',
  grove: 'grove',
  lab: 'lab',
  shrine: 'shrine',
  gallery: 'gallery',
  bridge: 'bridge',
  nest: 'nest',
});

export const YGG_ROOM_BUILD_STATES = Object.freeze({
  proposal: 'proposal',
  localPreview: 'local-preview',
  reviewNeeded: 'review-needed',
  canonReady: 'canon-ready',
  blocked: 'blocked',
});

export function createYggInterface(overrides = {}) {
  const base = {
    id: 'ygg-interface',
    title: 'Ygg Interface',
    mode: YGG_INTERFACE_MODES.roomBuilder,
    enabledInPortalKernel: true,
    labOnly: true,
    inputs: ['pointer', 'keyboard'],
    outputs: ['visible-proposal-data'],
    safety: {
      noCanonWrites: true,
      noExternalBridge: true,
      noLiveAuthRequired: true,
      localPreviewOnly: true,
      supportsReducedMotion: true,
      plainPassAvailable: true,
    },
    provenance: 'Portal Kernel v0.1 lab interface contract',
  };

  return {
    ...base,
    ...overrides,
    inputs: overrides.inputs ?? base.inputs,
    outputs: overrides.outputs ?? base.outputs,
    safety: { ...base.safety, ...(overrides.safety ?? {}) },
  };
}

export function createYggRoomTemplate(overrides = {}) {
  const base = {
    id: 'hearth-nook',
    title: 'Hearth Nook',
    kind: YGG_ROOM_TEMPLATE_KINDS.chamber,
    suggestedParentId: 'templehouse',
    worldKind: 'room',
    description: 'A private resting chamber grown from the Templehouse root.',
    theme: {
      biome: 'hearth-root',
      palette: 'blackwood-gold-glass',
      motion: 'safe',
      contrast: 'normal',
    },
    access: {
      visibility: 'private',
      consent: 'ask-first',
      exitRoute: 'templehouse',
      shared: false,
      ageGate: null,
    },
    soundscape: {
      enabled: false,
      autoplay: false,
      muted: true,
      intensity: 0,
      layers: [],
    },
    roomControls: {
      canRename: true,
      canRetheme: true,
      canInvite: false,
      canPublish: false,
      requiresReviewForCanon: true,
    },
  };

  return {
    ...base,
    ...overrides,
    theme: { ...base.theme, ...(overrides.theme ?? {}) },
    access: { ...base.access, ...(overrides.access ?? {}) },
    soundscape: { ...base.soundscape, ...(overrides.soundscape ?? {}) },
    roomControls: { ...base.roomControls, ...(overrides.roomControls ?? {}) },
  };
}

export function createYggRoomProposal({
  template,
  account,
  parentNodeId,
  roomId,
  title,
  customization = {},
} = {}) {
  const safeTemplate = createYggRoomTemplate(template ?? {});
  const safeAccount = account ?? {};
  const displayName = safeAccount.profile?.displayName ?? safeAccount.customization?.displayName ?? 'Guest Seed';
  const parentId = parentNodeId ?? safeTemplate.suggestedParentId;
  const id = roomId ?? `local-${safeTemplate.id}`;
  const roomTitle = title ?? `${displayName}'s ${safeTemplate.title}`;
  const soundLayers = customization.sound?.defaultPatch ? [`proposal:${customization.sound.defaultPatch}`] : safeTemplate.soundscape.layers;

  const node = createWorldNode({
    id,
    kind: safeTemplate.worldKind,
    title: roomTitle,
    parentId,
    access: {
      ...safeTemplate.access,
      exitRoute: safeTemplate.access.exitRoute ?? parentId,
    },
    theme: {
      ...safeTemplate.theme,
      palette: customization.palette ?? safeTemplate.theme.palette,
      motion: customization.accessibility?.reducedMotion ? 'still-magic' : safeTemplate.theme.motion,
    },
    soundscape: {
      ...safeTemplate.soundscape,
      enabled: false,
      autoplay: false,
      muted: true,
      intensity: 0,
      layers: soundLayers,
    },
    narrative: {
      canonLayer: 'local-preview',
      tone: 'room-seed',
      allowedGuides: [],
      ambiguity: 'preserve',
    },
    embodiment: {
      typing: 'soft-pulse',
      touch: 'gentle-ripple',
      pointer: 'hover-glow',
      motion: customization.accessibility?.reducedMotion ? 'still' : 'permission-required',
      haptics: 'off',
      gaze: 'future-opt-in',
    },
  });

  return {
    id: `proposal:${id}`,
    state: YGG_ROOM_BUILD_STATES.localPreview,
    templateId: safeTemplate.id,
    proposedBy: safeAccount.id ?? 'local-preview-account',
    node,
    controls: safeTemplate.roomControls,
    safety: {
      noCanonWrites: true,
      requiresReviewForCanon: true,
      noAutoplay: true,
      noExternalBridge: true,
      localPreviewOnly: true,
    },
    provenance: 'Ygg room builder local preview proposal',
  };
}

export function validateYggInterface(yggInterface) {
  const errors = [];
  if (!yggInterface || typeof yggInterface !== 'object') errors.push('Ygg interface must be an object.');
  if (!yggInterface?.id) errors.push('Ygg interface requires id.');
  if (!yggInterface?.title) errors.push('Ygg interface requires title.');
  if (!Object.values(YGG_INTERFACE_MODES).includes(yggInterface?.mode)) errors.push(`Unknown Ygg interface mode: ${yggInterface?.mode}`);
  if (!yggInterface?.safety?.noCanonWrites) errors.push('Ygg interfaces must not write canon in v0.1.');
  if (!yggInterface?.safety?.supportsReducedMotion) errors.push('Ygg interfaces must support reduced motion.');
  return errors;
}

export function validateYggRoomTemplate(template) {
  const errors = [];
  if (!template || typeof template !== 'object') errors.push('Ygg room template must be an object.');
  if (!template?.id) errors.push('Ygg room template requires id.');
  if (!template?.title) errors.push('Ygg room template requires title.');
  if (!Object.values(YGG_ROOM_TEMPLATE_KINDS).includes(template?.kind)) errors.push(`Unknown room template kind: ${template?.kind}`);
  if (template?.soundscape?.autoplay) errors.push('Room templates must not request autoplay.');
  if (template?.soundscape?.enabled) errors.push('Room templates must not enable live sound in v0.1.');
  if (template?.roomControls?.canPublish && !template?.roomControls?.requiresReviewForCanon) errors.push('Publish-capable room templates require canon review.');
  return errors;
}

export function validateYggRoomProposal(proposal) {
  const errors = [];
  if (!proposal || typeof proposal !== 'object') errors.push('Ygg room proposal must be an object.');
  if (!proposal?.id) errors.push('Ygg room proposal requires id.');
  if (proposal?.state !== YGG_ROOM_BUILD_STATES.localPreview && proposal?.state !== YGG_ROOM_BUILD_STATES.proposal) {
    errors.push('Ygg room proposals must remain proposal/local-preview in v0.1.');
  }
  if (!proposal?.safety?.noCanonWrites) errors.push('Ygg room proposals must not write canon.');
  if (!proposal?.safety?.requiresReviewForCanon) errors.push('Ygg room proposals require canon review before promotion.');
  if (proposal?.safety?.noAutoplay !== true) errors.push('Ygg room proposals must keep autoplay disabled.');
  if (proposal?.node?.soundscape?.enabled) errors.push('Ygg room proposals must not enable live sound in v0.1.');
  errors.push(...validateWorldNode(proposal?.node));
  return errors;
}
