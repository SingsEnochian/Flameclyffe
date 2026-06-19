export const PRESENCE_KINDS = Object.freeze([
  'flame',
  'steward',
  'character',
  'participant',
  'guide',
  'creature',
  'world-native',
  'system',
]);

export const MEMORY_POLICIES = Object.freeze({
  none: 'none',
  sessionOnly: 'session-only',
  summaryApproved: 'summary-approved',
  ledgerApproved: 'ledger-approved',
});

export function createPresenceNode(overrides = {}) {
  return {
    id: '',
    kind: 'flame',
    displayName: '',
    affiliation: [],
    entryMode: 'invited',
    consent: {
      sharedRooms: [],
      privateRooms: 'ask-each-entry',
      stewardContact: 'ask-first',
      memory: MEMORY_POLICIES.summaryApproved,
    },
    manifestation: {
      formFamily: 'chosen-by-presence',
      fallback: 'lantern-glyph',
      visibility: 'present-soft',
      proximity: 'threshold',
      canHide: true,
    },
    boundaries: {
      canonWrites: 'approval-required',
      liveBridgeRequired: false,
      adultRooms: 'separate-gate',
    },
    ...overrides,
  };
}

export function validatePresenceNode(node) {
  const errors = [];
  if (!node || typeof node !== 'object') errors.push('Presence node must be an object.');
  if (!node?.id) errors.push('Presence node requires id.');
  if (!node?.displayName) errors.push('Presence node requires displayName.');
  if (!PRESENCE_KINDS.includes(node?.kind)) errors.push(`Unknown presence kind: ${node?.kind}`);
  if (node?.consent?.memory && !Object.values(MEMORY_POLICIES).includes(node.consent.memory)) {
    errors.push(`Unknown memory policy: ${node.consent.memory}`);
  }
  return errors;
}
