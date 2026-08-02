export const HEARTHGATE_CONTRACT_VERSION = '0.2.0';

export const roomRegions = Object.freeze(['header', 'toolbar', 'content', 'inspector', 'status']);

export function defineRoom(room) {
  if (!room?.id || !room?.title) throw new Error('A Hearthgate room requires id and title.');
  return Object.freeze({
    version: HEARTHGATE_CONTRACT_VERSION,
    icon: '◇',
    description: '',
    packages: [],
    regions: roomRegions,
    ...room,
  });
}

export function defineReceptionProfile(profile) {
  if (!profile?.id || !profile?.name) throw new Error('A Reception Profile requires id and name.');
  return Object.freeze({
    version: HEARTHGATE_CONTRACT_VERSION,
    theme: 'hearthgate-default',
    language: 'en',
    calendar: 'gregorian',
    clock: { timeZone: 'America/New_York', format: '24h' },
    packages: [],
    rooms: [],
    capabilities: {},
    ...profile,
  });
}

export function defineHouseProfile(profile) {
  if (!profile?.id || !profile?.name) throw new Error('A House Profile requires id and name.');
  const foundation = profile.canon?.foundation;
  const overlay = profile.canon?.overlay;
  if (!foundation?.id || !foundation?.name) {
    throw new Error('A House Profile requires an explicit canon foundation.');
  }
  if (!overlay?.id || !overlay?.name) {
    throw new Error('A House Profile requires an explicit overlay.');
  }
  if (foundation.id === overlay.id) {
    throw new Error('Canon foundation and overlay must remain distinct.');
  }
  if (!profile.transferFunctions?.version) {
    throw new Error('A House Profile requires a versioned transfer function.');
  }
  return defineReceptionProfile({
    kind: 'hearthgate-house',
    sovereignty: {
      foundation_preserved: true,
      overlay_silently_merges: false,
      house_identity_preserved: true,
    },
    temporalProfile: {
      timeline: null,
      initialDelta: 1,
      bridgeCoupling: 0.08,
      focusAxis: 'Q',
      measurementStrength: 0.65,
      release: 0.35,
    },
    harmonicIdentity: {
      voice: profile.name,
      baseCarrierHz: 144,
      beatFloorHz: 3,
      beatCeilingHz: 8,
    },
    visualIdentity: {
      structure: 'paired-bridge-geometry',
      atmosphere: 'house-native-field',
      palette: [],
    },
    culturalIdentity: {
      arrivalPrompt: `Arrival at ${profile.name}`,
      receptionPrompt: `${profile.name} receives the crossing`,
    },
    ...profile,
  });
}

export function definePracticePackage(pkg) {
  if (!pkg?.id || !pkg?.name) throw new Error('A Practice Package requires id and name.');
  return Object.freeze({
    version: '0.1.0',
    status: 'installed',
    capabilities: [],
    dependencies: [],
    ...pkg,
  });
}
