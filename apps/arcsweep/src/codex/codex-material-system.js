export const CODEX_MATERIAL_SCHEMA = 'hearthweave.codex-material/v0.1';

export const CODEX_MATERIALS = Object.freeze({
  enduring: Object.freeze({
    id: 'enduring',
    family: 'metal',
    surface: 'gold',
    meaning: 'durable memory, canon, reflection, lineage',
    live: false,
  }),
  living: Object.freeze({
    id: 'living',
    family: 'light',
    surface: 'teal',
    meaning: 'present activity, fresh contribution, current trace',
    live: true,
  }),
  possible: Object.freeze({
    id: 'possible',
    family: 'glass',
    surface: 'teal-glass',
    meaning: 'experiment, proposal, transition, uncommitted possibility',
    live: false,
  }),
  liminal: Object.freeze({
    id: 'liminal',
    family: 'glass',
    surface: 'indigo-glass',
    meaning: 'counterfactual, roleplay, alternate branch, speculative leaf',
    live: false,
  }),
  continuity: Object.freeze({
    id: 'continuity',
    family: 'body',
    surface: 'leather-stone',
    meaning: 'quiet continuity, page body, return path, persistent structure',
    live: false,
  }),
  organic: Object.freeze({
    id: 'organic',
    family: 'ink',
    surface: 'moss-seafoam',
    meaning: 'growth, relationship, recurring collaboration',
    live: false,
  }),
  quiet: Object.freeze({
    id: 'quiet',
    family: 'absence',
    surface: 'none',
    meaning: 'valid silence; nothing needs to prove activity',
    live: false,
  }),
});

export function resolveCodexMaterial(materialId = 'continuity') {
  return CODEX_MATERIALS[materialId] || CODEX_MATERIALS.continuity;
}

export function applyCodexMaterial(node, materialId, { active = null } = {}) {
  if (!node?.dataset) return null;
  const material = resolveCodexMaterial(materialId);
  node.dataset.codexMaterial = material.id;
  node.dataset.codexMaterialFamily = material.family;
  node.dataset.codexMaterialSurface = material.surface;
  const isActive = active == null ? material.live : Boolean(active);
  node.dataset.codexActive = isActive ? 'true' : 'false';
  return material;
}
