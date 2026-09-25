export const CONSEQUENCE_BOUNDARY_SCHEMA = 'hearthweave.consequence-boundary/v0.2';

export const CONSEQUENCE_EDGE_KINDS = Object.freeze([
  'external-commitment',
  'financial-commitment',
  'hard-to-reverse-destruction',
  'credential-or-secret-exposure',
  'authoritative-identity-mutation',
  'authoritative-canon-promotion',
  'permission-expansion',
  'explicit-consent-boundary',
  'destructive-production-without-recovery',
]);

export function classifyConsequence(operation = {}) {
  const edges = [];

  if (operation.external === true || operation.externallyBinding === true) edges.push('external-commitment');
  if (operation.financial === true) edges.push('financial-commitment');
  if (operation.destructive === true && operation.reversible !== true) edges.push('hard-to-reverse-destruction');
  if (operation.exposesCredentials === true || operation.exposesSecrets === true) edges.push('credential-or-secret-exposure');
  if (operation.identityMutation === 'authoritative') edges.push('authoritative-identity-mutation');
  if (operation.canonPromotion === 'authoritative') edges.push('authoritative-canon-promotion');
  if (operation.permissionExpansion === true) edges.push('permission-expansion');
  if (operation.consentBoundary === true) edges.push('explicit-consent-boundary');
  if (operation.production === true && operation.destructive === true && operation.practicalRecovery !== true) {
    edges.push('destructive-production-without-recovery');
  }

  const uniqueEdges = [...new Set(edges)];
  return Object.freeze({
    schema: CONSEQUENCE_BOUNDARY_SCHEMA,
    ordinary: uniqueEdges.length === 0,
    requiresExplicitEdgeHandling: uniqueEdges.length > 0,
    edges: Object.freeze(uniqueEdges),
  });
}

export function mayProceedInOrdinaryScope(operation = {}) {
  return classifyConsequence(operation).ordinary;
}
