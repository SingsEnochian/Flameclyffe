export const ANCESTRAL_CORPUS_MANIFEST_SCHEMA = 'arcsweep.ancestral-corpus-manifest/v0.1';
export const ANCESTRAL_SOURCE_BINDING_SCHEMA = 'arcsweep.ancestral-source-binding/v0.1';
export const ANCESTRAL_QUERY_SCHEMA = 'arcsweep.ancestral-query/v0.1';
export const ANCESTRAL_QUERY_RESULT_SCHEMA = 'arcsweep.ancestral-query-result/v0.1';

const text = (value) => String(value ?? '').trim();
const clone = (value) => value == null ? value : structuredClone(value);
const unique = (values) => [...new Set((values || []).map(text).filter(Boolean))];

export function validateAncestralManifest(manifest) {
  if (!manifest || manifest.schema !== ANCESTRAL_CORPUS_MANIFEST_SCHEMA) {
    throw new TypeError('A valid ancestral corpus manifest is required.');
  }
  const roots = Array.isArray(manifest.roots) ? manifest.roots : [];
  const rootIds = new Set();
  for (const root of roots) {
    const id = text(root?.root_id);
    if (!id) throw new TypeError('Every ancestral root requires root_id.');
    if (rootIds.has(id)) throw new TypeError(`Duplicate ancestral root_id: ${id}`);
    rootIds.add(id);
    if (manifest.public_repo_policy === 'no-manuscript-prose') {
      if (text(root?.source_ref)) throw new TypeError(`Public ancestral root ${id} must not expose source_ref.`);
      if (Object.prototype.hasOwnProperty.call(root || {}, 'prose') || Object.prototype.hasOwnProperty.call(root || {}, 'text')) {
        throw new TypeError(`Public ancestral root ${id} must not embed manuscript prose.`);
      }
    }
  }
  for (const correspondence of Array.isArray(manifest.correspondences) ? manifest.correspondences : []) {
    for (const rootId of correspondence.source_root_ids || []) {
      if (!rootIds.has(rootId)) throw new TypeError(`Correspondence references unknown ancestral root: ${rootId}`);
    }
  }
  return true;
}

export function bindPrivateAncestralSource(manifest, {
  rootId,
  sourceRef,
  contentHash = null,
  boundAt = new Date().toISOString(),
  privacyClass = 'private_draft',
} = {}) {
  validateAncestralManifest(manifest);
  const id = text(rootId);
  const root = manifest.roots.find((entry) => entry.root_id === id);
  if (!root) throw new TypeError(`Unknown ancestral root: ${id || 'missing'}`);
  const ref = text(sourceRef);
  if (!ref) throw new TypeError('sourceRef is required for a private ancestral binding.');
  if (root.source_binding !== 'private_only') throw new TypeError(`Root ${id} is not declared private_only.`);
  return Object.freeze({
    schema: ANCESTRAL_SOURCE_BINDING_SCHEMA,
    root_id: id,
    source_ref: ref,
    privacy_class: text(privacyClass) || 'private_draft',
    content_hash: text(contentHash) || null,
    bound_at: boundAt,
    publication_authority: false,
  });
}

export function createAncestralCorpus(manifest, { privateBindings = [] } = {}) {
  validateAncestralManifest(manifest);
  const bindingMap = new Map();
  for (const binding of privateBindings) {
    if (binding?.schema !== ANCESTRAL_SOURCE_BINDING_SCHEMA) throw new TypeError('Invalid ancestral source binding.');
    if (!manifest.roots.some((root) => root.root_id === binding.root_id)) throw new TypeError(`Binding references unknown root: ${binding.root_id}`);
    bindingMap.set(binding.root_id, clone(binding));
  }
  return Object.freeze({
    schema: 'arcsweep.ancestral-corpus/v0.1',
    corpus_id: manifest.corpus_id,
    manifest: clone(manifest),
    private_bindings: Object.freeze([...bindingMap.values()].map((entry) => Object.freeze(entry))),
  });
}

export function queryAncestralCorpus(corpus, {
  rootIds = [],
  fingerprints = [],
  presentSystemRefs = [],
  includeRoots = true,
  includeCorrespondences = true,
} = {}) {
  if (!corpus || corpus.schema !== 'arcsweep.ancestral-corpus/v0.1') throw new TypeError('A valid ancestral corpus is required.');
  const manifest = corpus.manifest;
  const requestedRoots = new Set(unique(rootIds));
  const requestedFingerprints = new Set(unique(fingerprints));
  const requestedSystems = new Set(unique(presentSystemRefs));

  const rootMatches = (manifest.roots || []).filter((root) => {
    if (requestedRoots.size && !requestedRoots.has(root.root_id)) return false;
    if (requestedFingerprints.size && !(root.fingerprints || []).some((value) => requestedFingerprints.has(value))) return false;
    return true;
  });
  const matchedRootIds = new Set(rootMatches.map((root) => root.root_id));

  const correspondenceMatches = (manifest.correspondences || []).filter((entry) => {
    if (requestedRoots.size && !(entry.source_root_ids || []).some((id) => requestedRoots.has(id))) return false;
    if (requestedFingerprints.size && !(entry.source_root_ids || []).some((id) => matchedRootIds.has(id))) return false;
    if (requestedSystems.size && !(entry.present_system_refs || []).some((id) => requestedSystems.has(id))) return false;
    return true;
  });

  const bindingByRoot = new Map((corpus.private_bindings || []).map((binding) => [binding.root_id, binding]));
  return Object.freeze({
    schema: ANCESTRAL_QUERY_RESULT_SCHEMA,
    query: Object.freeze({
      schema: ANCESTRAL_QUERY_SCHEMA,
      root_ids: Object.freeze([...requestedRoots]),
      fingerprints: Object.freeze([...requestedFingerprints]),
      present_system_refs: Object.freeze([...requestedSystems]),
    }),
    roots: Object.freeze(includeRoots ? rootMatches.map((root) => Object.freeze({
      ...clone(root),
      private_binding_present: bindingByRoot.has(root.root_id),
      source_ref: null,
    })) : []),
    correspondences: Object.freeze(includeCorrespondences ? correspondenceMatches.map((entry) => Object.freeze(clone(entry))) : []),
  });
}

export function buildAncestralTraversal(corpus, startRef) {
  const start = text(startRef);
  if (!start) throw new TypeError('startRef is required.');
  const manifest = corpus?.manifest;
  if (!manifest) throw new TypeError('A valid ancestral corpus is required.');

  const nodes = new Map();
  const edges = [];
  const addNode = (id, kind, label, extra = {}) => {
    if (!nodes.has(id)) nodes.set(id, Object.freeze({ id, kind, label, ...clone(extra) }));
  };

  for (const root of manifest.roots || []) {
    addNode(root.root_id, 'ancestral-root', root.display_name || root.root_id, {
      privacy_class: root.privacy_class,
      fingerprints: clone(root.fingerprints || []),
    });
  }
  for (const relation of manifest.correspondences || []) {
    addNode(relation.correspondence_id, 'correspondence', relation.concept || relation.correspondence_id, {
      status: relation.status,
      confidence: relation.confidence,
    });
    for (const rootId of relation.source_root_ids || []) {
      edges.push(Object.freeze({ from: rootId, to: relation.correspondence_id, kind: 'supports-correspondence' }));
    }
    for (const systemRef of relation.present_system_refs || []) {
      addNode(systemRef, 'present-system', systemRef);
      edges.push(Object.freeze({ from: relation.correspondence_id, to: systemRef, kind: 'corresponds-to' }));
    }
  }

  const adjacency = new Map();
  for (const edge of edges) {
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
    if (!adjacency.has(edge.to)) adjacency.set(edge.to, []);
    adjacency.get(edge.from).push(edge.to);
    adjacency.get(edge.to).push(edge.from);
  }
  if (!nodes.has(start)) return Object.freeze({ schema: 'arcsweep.ancestral-traversal/v0.1', start_ref: start, nodes: Object.freeze([]), edges: Object.freeze([]) });

  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const current = queue.shift();
    for (const next of adjacency.get(current) || []) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return Object.freeze({
    schema: 'arcsweep.ancestral-traversal/v0.1',
    start_ref: start,
    nodes: Object.freeze([...seen].map((id) => nodes.get(id)).filter(Boolean)),
    edges: Object.freeze(edges.filter((edge) => seen.has(edge.from) && seen.has(edge.to))),
  });
}
