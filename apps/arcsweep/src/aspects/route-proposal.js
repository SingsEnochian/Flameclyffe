export const ROUTE_PROPOSAL_SCHEMA = 'hearthweave.route-proposal/v0.2';
export const ROUTE_PROPOSAL_MODES = Object.freeze(['working', 'exploration', 'candidate']);

function strings(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || '').trim()).filter(Boolean))];
}

function id(prefix = 'route') {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

export function createRouteProposal({
  id: proposalId,
  proposer,
  intent,
  summary,
  operations = [],
  assumptions = [],
  benefits = [],
  costs = [],
  risks = [],
  reversible = true,
  rollback = null,
  verification = [],
  stateEffects = [],
  mode = 'working',
  parentRouteId = null,
  createdAt = new Date().toISOString(),
} = {}) {
  const proposerId = String(proposer || '').trim();
  if (!proposerId) throw new Error('Route proposal requires a proposer.');
  if (!String(intent || '').trim()) throw new Error('Route proposal requires an intent.');
  if (!String(summary || '').trim()) throw new Error('Route proposal requires a summary.');
  if (!ROUTE_PROPOSAL_MODES.includes(mode)) throw new Error(`Unsupported route proposal mode: ${mode}`);

  return Object.freeze({
    schema: ROUTE_PROPOSAL_SCHEMA,
    id: String(proposalId || id()),
    proposer: proposerId,
    intent: String(intent).trim(),
    summary: String(summary).trim(),
    operations: Object.freeze(structuredClone(Array.isArray(operations) ? operations : [])),
    assumptions: Object.freeze(strings(assumptions)),
    benefits: Object.freeze(strings(benefits)),
    costs: Object.freeze(strings(costs)),
    risks: Object.freeze(strings(risks)),
    reversible: reversible !== false,
    rollback: rollback ? String(rollback) : null,
    verification: Object.freeze(structuredClone(Array.isArray(verification) ? verification : [])),
    stateEffects: Object.freeze(strings(stateEffects)),
    mode,
    parentRouteId: parentRouteId ? String(parentRouteId) : null,
    createdAt: String(createdAt),
  });
}

export function branchRoute(parent, overrides = {}) {
  if (!parent?.id) throw new Error('A parent route is required to branch.');
  return createRouteProposal({
    ...parent,
    ...overrides,
    id: overrides.id,
    parentRouteId: parent.id,
    mode: overrides.mode || 'exploration',
  });
}

export function preserveAlternatives(...proposals) {
  const routes = proposals.flat().filter(Boolean);
  const ids = new Set();
  for (const route of routes) {
    if (!route?.id) throw new Error('Alternative route requires an id.');
    if (ids.has(route.id)) throw new Error(`Duplicate route id: ${route.id}`);
    ids.add(route.id);
  }
  return Object.freeze([...routes]);
}
