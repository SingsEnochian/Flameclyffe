function clone(value) {
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function clean(value, max = 160) {
  return String(value || '').trim().slice(0, max);
}

export function createInteractionState(initial = {}) {
  let state = {
    channel: initial.channel === 'OOC' ? 'OOC' : 'IC',
    turn_owner: clean(initial.turn_owner) || 'Rowan',
    character_ownership: Array.isArray(initial.character_ownership) ? initial.character_ownership.map(normaliseOwnership).filter(Boolean) : [],
  };

  function normaliseOwnership(entry) {
    const character = clean(entry?.character);
    const owner = clean(entry?.owner);
    if (!character || !owner) return null;
    const permission = ['owned', 'shared', 'temporary-handoff'].includes(entry?.permission)
      ? entry.permission
      : 'owned';
    return { character, owner, permission };
  }

  function snapshot() {
    return Object.freeze(clone(state));
  }

  function setChannel(channel) {
    state = { ...state, channel: channel === 'OOC' ? 'OOC' : 'IC' };
    return snapshot();
  }

  function setTurnOwner(owner) {
    state = { ...state, turn_owner: clean(owner) || state.turn_owner };
    return snapshot();
  }

  function setOwnership(entry) {
    const next = normaliseOwnership(entry);
    if (!next) return snapshot();
    state = {
      ...state,
      character_ownership: [
        ...state.character_ownership.filter((item) => item.character.toLowerCase() !== next.character.toLowerCase()),
        next,
      ],
    };
    return snapshot();
  }

  function removeOwnership(character) {
    const key = clean(character).toLowerCase();
    state = { ...state, character_ownership: state.character_ownership.filter((item) => item.character.toLowerCase() !== key) };
    return snapshot();
  }

  return Object.freeze({ snapshot, setChannel, setTurnOwner, setOwnership, removeOwnership });
}
