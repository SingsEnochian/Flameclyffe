// Canon-scoped character attribution; never derive identity ownership from the active model route.
export const CHARACTER_BINDINGS_SCHEMA = 'wayglass.character-bindings/v0.1';
export const CHARACTER_BINDINGS = Object.freeze([
  { character_id: 'psychic:eilidh-amalia-elden', name: 'Eilidh Amalia Elden', world_id: 'psychic-universe', ownership: 'user', owner_id: 'Rowan', source: 'apps/wayglass/test/wayglass-core.test.js', status: 'confirmed' },
  { character_id: 'psychic:izar-virel-angelou', name: 'Izar Virel Angelou', world_id: 'psychic-universe', ownership: 'model-specific', owner_id: 'Crow', source: 'apps/wayglass/test/wayglass-core.test.js', status: 'confirmed' },
]);
export const CHARACTER_RELATIONSHIPS = Object.freeze([
  { relationship_id: 'psychic:izar-eilidh', kind: 'provisional-resonance-bond', members: ['psychic:izar-virel-angelou', 'psychic:eilidh-amalia-elden'], world_id: 'psychic-universe', status: 'canon-documented', consent: 'independent-per-participant', identity_merge: false },
]);
const MODES = new Set(['user', 'shared-narrative', 'model-specific']);
export function validateCharacterBindings(bindings = CHARACTER_BINDINGS) {
  const ids = new Set();
  for (const b of bindings) {
    if (!b || !b.character_id || !b.world_id || !MODES.has(b.ownership)) throw new Error('invalid character binding');
    if (ids.has(b.character_id)) throw new Error('duplicate character binding');
    ids.add(b.character_id);
    if (b.ownership !== 'shared-narrative' && !b.owner_id) throw new Error('missing character owner');
    if (b.ownership === 'shared-narrative' && b.owner_id) throw new Error('shared narrative cannot have exclusive owner');
  }
  return true;
}
export function canWriteCharacter(binding, actorId) {
  if (!binding || !actorId) return false;
  if (binding.ownership === 'shared-narrative') return false; // host must authorize collaboration per session
  if (binding.owner_id === actorId) return true;
  return false; // handoffs require a trusted host verifier, not caller-supplied flags
}
export function resolveCharacterBinding(characterId, bindings = CHARACTER_BINDINGS) {
  return bindings.find(b => b.character_id === characterId) || null;
}
