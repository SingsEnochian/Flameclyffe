import { POSSIBILITY_TOPOLOGY_SCHEMA } from './possibility-topology.js';

function freeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(freeze));
  if (value && typeof value === 'object') return Object.freeze(Object.fromEntries(Object.entries(value).map(([key, item]) => [key, freeze(item)])));
  return value;
}

export function createPossibilityRouteSet({ topology, availableModalities } = {}) {
  if (topology?.schema !== POSSIBILITY_TOPOLOGY_SCHEMA) throw new Error('POSSIBILITY_BROKER: possibility topology is required');
  const known = new Set(topology.topology?.possibility_expansion?.newly_legible_modalities || []);
  const modalities = [...new Set((availableModalities || [...known]).filter(Boolean))];
  const continuity = topology.trajectory?.continuity_pattern || [];
  const ask = topology.orientation?.ask || '';

  const branches = modalities.map((modality) => freeze({
    branch_id: `route:${modality}`,
    modality,
    orientation: ask,
    path: ['project-zero', `projection:${modality}`],
    carrying: continuity,
    strength: {
      continuity_receipted: continuity.length > 0,
      source_lineage_present: (topology.trajectory?.source_receipt_ids || []).length > 0,
      traversal_evidence_present: Boolean(topology.trajectory?.crossing_id),
    },
    coherence: {
      ask_present: Boolean(ask),
      modality_legible: known.has(modality),
      trajectory_present: (topology.trajectory?.path || []).length > 0,
    },
    status: known.has(modality) ? 'presently-legible' : 'available-untraversed',
  }));

  return freeze({
    schema: 'arcsweep.possibility-route-set/v1',
    orientation: ask,
    branches,
    branch_count: branches.length,
    selection_mode: 'coherence-oriented-plural',
    ranking: null,
    winner: null,
    principle: 'Learning expands legible paths; routing retains the paths and conditions under which each becomes coherent.',
  });
}
