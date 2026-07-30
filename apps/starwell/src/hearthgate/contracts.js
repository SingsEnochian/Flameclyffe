export const HEARTHGATE_CONTRACT_VERSION = '0.1.0';

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
