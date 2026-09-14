import {
  auditCanonicalSpine,
  canonicalKnowledgeBoundaries,
  canonicalNode,
  canonicalRelations,
  indexCanonicalSpine,
} from '../../../lib/canonical-spine-core.js';

let cachedGraph = null;
let cachedPromise = null;

export function canonicalSpineAssetUrl(locationLike = globalThis.location) {
  const origin = locationLike?.origin || globalThis.location?.origin || 'http://localhost';
  const pathname = locationLike?.pathname || '/';
  const spineMarker = '/spine/';
  const spineIndex = pathname.indexOf(spineMarker);
  const appBase = spineIndex >= 0
    ? pathname.slice(0, spineIndex + 1)
    : pathname.endsWith('/')
      ? pathname
      : pathname.slice(0, pathname.lastIndexOf('/') + 1);
  return new URL(`${appBase}canonical-spine.seed.json`, origin).href;
}

export async function loadCanonicalSpine({ force = false, fetchImpl = globalThis.fetch, locationLike = globalThis.location } = {}) {
  if (!force && cachedGraph) return cachedGraph;
  if (!force && cachedPromise) return cachedPromise;
  if (typeof fetchImpl !== 'function') throw new Error('Canonical Spine requires fetch.');

  cachedPromise = (async () => {
    const response = await fetchImpl(canonicalSpineAssetUrl(locationLike), { cache: 'no-store' });
    if (!response.ok) throw new Error(`Canonical Spine unavailable: HTTP ${response.status}`);
    const graph = await response.json();
    const audit = auditCanonicalSpine(graph);
    if (audit.errors.length) throw new Error(`Canonical Spine invalid: ${audit.errors.join('; ')}`);
    cachedGraph = graph;
    return graph;
  })();

  try {
    return await cachedPromise;
  } finally {
    cachedPromise = null;
  }
}

export function clearCanonicalSpineCache() {
  cachedGraph = null;
  cachedPromise = null;
}

export function canonicalSpineIndex(graph) {
  return indexCanonicalSpine(graph);
}

export function inspectCanonicalNode(graph, id) {
  const node = canonicalNode(graph, id);
  if (!node) return null;
  const relations = canonicalRelations(graph, id);
  return {
    node,
    incoming: relations.incoming,
    outgoing: relations.outgoing,
    knowledgeBoundaries: canonicalKnowledgeBoundaries(graph, id),
  };
}

export function canonicalSpineHealth(graph) {
  const audit = auditCanonicalSpine(graph);
  return {
    ok: audit.errors.length === 0,
    errors: audit.errors,
    warnings: audit.warnings,
    collisions: audit.collisions,
    nodeCount: graph.nodes?.length || 0,
    edgeCount: graph.edges?.length || 0,
    boundaryCount: graph.knowledgeBoundaries?.length || 0,
    receiptCount: graph.receipts?.length || 0,
    sourceFingerprint: graph._mirror?.sourceFingerprint || null,
  };
}
