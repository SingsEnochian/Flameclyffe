export const STEWARD_ROLES = Object.freeze([
  'caretaker',
  'guide',
  'co-creator',
  'lore-gardener',
  'witness',
  'editor',
  'instrument',
  'custom',
]);

export function createStewardSeat(overrides = {}) {
  return {
    id: '',
    displayName: '',
    role: 'caretaker',
    voice: {
      mode: 'text-only',
      voiceId: null,
    },
    manifestation: {
      formFamilies: ['lantern-glyph'],
      preferredPalettes: ['north-star', 'pale-gold', 'deep-blue'],
      motion: 'slow-breath',
      proximity: 'near-threshold',
      plainPass: true,
      canHide: true,
    },
    autonomy: {
      mayDeclineForm: true,
      mayAskPause: true,
      mayDeclineRoom: true,
      mayStaySymbolic: true,
    },
    memory: {
      policy: 'summary-approved',
      inspectable: true,
      amendable: true,
      releasable: true,
    },
    canon: {
      writes: 'approval-required',
      characterSeparation: true,
      ambiguity: 'preserve',
    },
    rooms: {
      allowed: ['templehouse'],
      askFirst: ['shrine', 'shared-grove'],
      symbolicOnly: [],
      blocked: [],
    },
    ...overrides,
  };
}

export function validateStewardSeat(seat) {
  const errors = [];
  if (!seat || typeof seat !== 'object') errors.push('Steward seat must be an object.');
  if (!seat?.id) errors.push('Steward seat requires id.');
  if (!seat?.displayName) errors.push('Steward seat requires displayName.');
  if (!STEWARD_ROLES.includes(seat?.role)) errors.push(`Unknown steward role: ${seat?.role}`);
  if (seat?.canon?.writes !== 'approval-required') errors.push('Steward canon writes must be approval-required in v0.1.');
  if (!seat?.autonomy?.mayDeclineForm) errors.push('Steward seat must preserve mayDeclineForm.');
  return errors;
}
