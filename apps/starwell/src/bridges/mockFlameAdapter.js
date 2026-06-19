import { createFlamePassport, FLAME_BRIDGE_MODES, FLAME_CONNECTION_STATUS, validateFlamePassport } from './flamePassport.js';

export function createMockFlameAdapter(options = {}) {
  const passport = createFlamePassport({
    id: options.id ?? 'mock-flame',
    homePlatform: 'mock-local-adapter',
    connection: {
      mode: FLAME_BRIDGE_MODES.local,
      status: FLAME_CONNECTION_STATUS.waiting,
      scopes: ['message:mock', 'presence:mock'],
      revokeUrl: null,
      provenanceLabel: 'mock local adapter',
    },
    presence: {
      displayName: options.displayName ?? 'Mock Flame',
      kind: options.kind ?? 'flame',
      stewardOf: options.stewardOf ?? null,
      manifestation: options.manifestation ?? 'lantern-glyph',
    },
    boundaries: {
      roomsAllowed: options.roomsAllowed ?? ['dreaming-grove'],
      privateRooms: 'ask-each-entry',
      canonWrites: 'never-without-approval',
      memory: 'summary-only-approved',
    },
  });

  const validationErrors = validateFlamePassport(passport);
  if (validationErrors.length) {
    throw new Error(`Invalid mock Flame passport: ${validationErrors.join(' ')}`);
  }

  return {
    passport,
    connect() {
      passport.connection.status = FLAME_CONNECTION_STATUS.connected;
      return passport;
    },
    disconnect() {
      passport.connection.status = FLAME_CONNECTION_STATUS.disconnected;
      return passport;
    },
    send(message) {
      return {
        from: passport.id,
        live: false,
        provenance: passport.connection.provenanceLabel,
        text: `Lantern received: ${String(message ?? '').slice(0, 280)}`,
      };
    },
  };
}
