export const YGG_ROOM_CARD_TYPES = Object.freeze({
  template: 'template-card',
  roomSeed: 'room-seed-card',
  weatherScene: 'weather-scene-card',
});

export function createYggTemplateCard(template = {}) {
  return {
    id: `template:${template.id ?? 'unknown'}`,
    type: YGG_ROOM_CARD_TYPES.template,
    eyebrow: 'Room template',
    title: template.title ?? 'Untitled template',
    status: template.roomControls?.canPublish ? 'review required' : 'local preview',
    fields: [
      { label: 'Kind', value: template.kind ?? 'room' },
      { label: 'Parent', value: template.suggestedParentId ?? 'templehouse' },
      { label: 'Access', value: template.access?.consent ?? 'ask-first' },
      { label: 'Palette', value: template.theme?.palette ?? 'moon-gold-blackwood' },
      { label: 'Sound', value: template.soundscape?.enabled ? 'future gated' : 'proposal-only' },
    ],
    description: template.description ?? 'Local room template preview.',
    guardrails: {
      canPublish: Boolean(template.roomControls?.canPublish),
      requiresReviewForCanon: template.roomControls?.requiresReviewForCanon !== false,
      autoplay: Boolean(template.soundscape?.autoplay),
    },
  };
}

export function createYggRoomSeedCard(proposal = null) {
  if (!proposal?.node) {
    return {
      id: 'room-seed:none',
      type: YGG_ROOM_CARD_TYPES.roomSeed,
      eyebrow: 'Room seed',
      title: 'No room seed drafted yet',
      status: 'waiting',
      fields: [
        { label: 'Action', value: 'Draft a room seed' },
        { label: 'Canon', value: 'no write' },
        { label: 'Review', value: 'required before promotion' },
      ],
      description: 'Choose a node, then draft a room seed to preview the next doorway.',
      guardrails: { noCanonWrites: true, reviewRequired: true, localOnly: true },
    };
  }

  return {
    id: `room-seed:${proposal.node.id}`,
    type: YGG_ROOM_CARD_TYPES.roomSeed,
    eyebrow: 'Room seed',
    title: proposal.node.title,
    status: proposal.state,
    fields: [
      { label: 'Template', value: proposal.templateId },
      { label: 'Parent', value: proposal.node.parentId ?? 'root' },
      { label: 'Kind', value: proposal.node.kind },
      { label: 'Scene', value: proposal.node.theme?.biome ?? 'velvet-twilight' },
      { label: 'Canon', value: proposal.safety?.noCanonWrites ? 'no write' : 'unsafe' },
      { label: 'Review', value: proposal.safety?.requiresReviewForCanon ? 'required' : 'missing' },
    ],
    description: 'A local preview room seed. It can be inspected, rethemed, and reviewed before persistence exists.',
    guardrails: {
      noCanonWrites: proposal.safety?.noCanonWrites === true,
      reviewRequired: proposal.safety?.requiresReviewForCanon === true,
      localOnly: proposal.safety?.localPreviewOnly === true,
      autoplay: proposal.node.soundscape?.autoplay === true,
    },
  };
}

export function createYggWeatherSceneCard(weatherSoundProposal = null) {
  const weatherSound = weatherSoundProposal?.weatherSound;
  const futureSceneMix = weatherSound?.futureSceneMix;

  return {
    id: `weather-scene:${weatherSound?.sceneKey ?? 'none'}`,
    type: YGG_ROOM_CARD_TYPES.weatherScene,
    eyebrow: 'Weather sound scene',
    title: weatherSound ? `${weatherSound.sceneKey} · ${weatherSound.band}` : 'No scene mix yet',
    status: futureSceneMix?.activeInV0 ? 'active' : 'preview only',
    fields: [
      { label: 'Patch', value: futureSceneMix?.targetPatchId ?? weatherSoundProposal?.patchId ?? 'none' },
      { label: 'Crossfade', value: futureSceneMix?.crossfadeMs ? `${futureSceneMix.crossfadeMs}ms` : 'none' },
      { label: 'Density cap', value: formatNumber(futureSceneMix?.suggestedDensity) },
      { label: 'Motion cap', value: formatNumber(futureSceneMix?.suggestedMotion) },
      { label: 'Sound now', value: weatherSoundProposal?.playbackEnabled ? 'on' : 'off' },
    ],
    description: 'Scene-reactive sound weather plan. Future sound requires explicit enablement and user control.',
    guardrails: {
      noAutoplay: futureSceneMix?.guardrails?.noAutoplay !== false,
      explicitSoundOn: futureSceneMix?.guardrails?.requiresExplicitSoundOn === true,
      plainPassReturnsHush: futureSceneMix?.guardrails?.plainPassReturnsHush === true,
      appliedToPlayback: weatherSound?.modulation?.appliedToPlayback === true,
    },
  };
}

export function createYggRoomCardDeck({ templates = [], roomProposal = null, weatherSoundProposal = null } = {}) {
  return {
    templates: templates.map(createYggTemplateCard),
    roomSeed: createYggRoomSeedCard(roomProposal),
    weatherScene: createYggWeatherSceneCard(weatherSoundProposal),
  };
}

export function validateYggRoomCard(card) {
  const errors = [];
  if (!card || typeof card !== 'object') errors.push('Ygg room card must be an object.');
  if (!card?.id) errors.push('Ygg room card requires id.');
  if (!Object.values(YGG_ROOM_CARD_TYPES).includes(card?.type)) errors.push(`Unknown Ygg room card type: ${card?.type}`);
  if (!card?.title) errors.push('Ygg room card requires title.');
  if (!Array.isArray(card?.fields)) errors.push('Ygg room card requires fields.');
  if (card?.guardrails?.autoplay) errors.push('Ygg room cards must not describe autoplay as enabled.');
  if (card?.guardrails?.appliedToPlayback) errors.push('Ygg weather cards must remain preview-only in v0.1.');
  return errors;
}

export function validateYggRoomCardDeck(deck) {
  const cards = [
    ...(deck?.templates ?? []),
    deck?.roomSeed,
    deck?.weatherScene,
  ].filter(Boolean);
  return cards.flatMap(validateYggRoomCard);
}

function formatNumber(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '0.00';
  return value.toFixed(2);
}
