import { CHARACTER_BINDINGS, CHARACTER_RELATIONSHIPS, resolveCharacterBinding } from './character-bindings.js';

export const EIGHTFOLD_MOBIUS_SCHEMA = 'wayglass.eightfold-mobius/v0.1';
export const EIGHTFOLD_PHASES = Object.freeze([
  'discover', 'attribute', 'authorize', 'contextualize',
  'route', 'respond', 'receipt', 'return',
]);
const copy = value => JSON.parse(JSON.stringify(value));
const safe = value => String(value ?? '').trim().slice(0, 2000);

/**
 * Read-only traversal of the eightfold Mobius. A response is a proposed
 * response envelope, not generated character speech or an authorized write.
 * No caller-supplied actor identity or permission flag grants write access.
 */
export function traverseEightfoldMobius({ character_id, world_id, prompt = '', route_id = null } = {}) {
  const trace = [];
  const binding = resolveCharacterBinding(character_id);
  trace.push({ phase: 'discover', found: Boolean(binding) });
  const scoped = Boolean(binding && world_id === binding.world_id);
  trace.push({ phase: 'attribute', world_match: scoped, owner_kind: scoped ? binding.ownership : null });
  const authorized = false; // only a trusted host-side verifier may promote writes
  trace.push({ phase: 'authorize', character_write: authorized, reason: 'host-verification-required' });
  const relationship = scoped ? CHARACTER_RELATIONSHIPS.filter(r => r.world_id === world_id && r.members.includes(character_id)).map(copy) : [];
  trace.push({ phase: 'contextualize', relationship_count: relationship.length });
  trace.push({ phase: 'route', requested_route: safe(route_id), route_verified: false });
  const response = scoped ? {
    kind: 'response-proposal',
    character_id, world_id,
    prompt: safe(prompt),
    requires_verified_actor: true,
    may_impersonate_character: false,
    may_commit_canon: false,
  } : null;
  trace.push({ phase: 'respond', proposal_available: Boolean(response), generated_speech: false });
  const receipt = { schema: EIGHTFOLD_MOBIUS_SCHEMA, character_id: safe(character_id), world_id: safe(world_id), status: scoped ? 'read-only-proposal' : 'not-found-or-world-mismatch' };
  trace.push({ phase: 'receipt', status: receipt.status });
  trace.push({ phase: 'return', continuity_committed: false, handoff_required: true });
  return copy({ schema: EIGHTFOLD_MOBIUS_SCHEMA, phases: [...EIGHTFOLD_PHASES], trace, character: scoped ? binding : null, relationships: relationship, response, receipt });
}
export function listEightfoldCharacters(world_id) {
  return copy(CHARACTER_BINDINGS.filter(b => !world_id || b.world_id === world_id));
}
