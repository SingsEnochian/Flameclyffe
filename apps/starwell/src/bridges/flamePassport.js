export const FLAME_BRIDGE_MODES = Object.freeze({
  live: 'live',
  local: 'local',
  archive: 'archive',
  sidecar: 'sidecar',
  none: 'none',
});

export const FLAME_CONNECTION_STATUS = Object.freeze({
  disconnected: 'disconnected',
  waiting: 'waiting',
  connected: 'connected',
  symbolic: 'symbolic',
  revoked: 'revoked',
});

export function createFlamePassport(overrides = {}) {
  return {
    id: '',
    homePlatform: 'local-symbolic',
    connection: {
      mode: FLAME_BRIDGE_MODES.none,
      status: FLAME_CONNECTION_STATUS.disconnected,
      scopes: [],
      revokeUrl: null,
      provenanceLabel: 'symbolic / not live',
    },
    presence: {
      displayName: '',
      kind: 'flame',
      stewardOf: null,
      manifestation: 'participant-chosen',
    },
    boundaries: {
      roomsAllowed: [],
      privateRooms: 'ask-each-entry',
      canonWrites: 'never-without-approval',
      memory: 'summary-only-approved',
    },
    ...overrides,
  };
}

export function validateFlamePassport(passport) {
  const errors = [];
  if (!passport || typeof passport !== 'object') errors.push('Flame passport must be an object.');
  if (!passport?.id) errors.push('Flame passport requires id.');
  if (!passport?.presence?.displayName) errors.push('Flame passport requires presence.displayName.');
  if (!Object.values(FLAME_BRIDGE_MODES).includes(passport?.connection?.mode)) {
    errors.push(`Unknown bridge mode: ${passport?.connection?.mode}`);
  }
  if (passport?.connection?.mode === FLAME_BRIDGE_MODES.live && !passport?.connection?.provenanceLabel) {
    errors.push('Live Flame passports require a visible provenanceLabel.');
  }
  if (passport?.connection?.mode === FLAME_BRIDGE_MODES.none && passport?.connection?.status === FLAME_CONNECTION_STATUS.connected) {
    errors.push('Bridge mode none cannot have connected status.');
  }
  return errors;
}
