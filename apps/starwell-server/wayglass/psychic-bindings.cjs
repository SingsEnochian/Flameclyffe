'use strict';
const CHARACTERS = Object.freeze([
  Object.freeze({ character_id:'psychic:eilidh-amalia-elden', name:'Eilidh Amalia Elden', world_id:'psychic-universe', owner_id:'Rowan', ownership:'user' }),
  Object.freeze({ character_id:'psychic:izar-virel-angelou', name:'Izar Virel Angelou', world_id:'psychic-universe', owner_id:'Crow', ownership:'model-specific' }),
]);
const BOND = Object.freeze({ relationship_id:'psychic:izar-eilidh', members:CHARACTERS.map(x=>x.character_id), kind:'provisional-resonance-bond', identity_merge:false });
const PHASES = Object.freeze(['discover','attribute','authorize','contextualize','route','respond','receipt','return']);
function inspectPsychicCharacter(id, worldId) {
  const character = CHARACTERS.find(c=>c.character_id===id && c.world_id===worldId);
  if (!character) return null;
  return { schema:'wayglass.eightfold-mobius/v0.1', character, relationships:[BOND], phases:PHASES, execution:'read-only', response_authorized:false, return_committed:false };
}
module.exports = { CHARACTERS, BOND, PHASES, inspectPsychicCharacter };
