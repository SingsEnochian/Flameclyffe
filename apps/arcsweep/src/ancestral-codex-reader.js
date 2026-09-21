import { createAncestralCorpus, buildAncestralTraversal, queryAncestralCorpus } from './ancestral-corpus.js';
import { ANCESTRAL_PUBLIC_MANIFEST } from './ancestral-corpus-seed.js';

export const ANCESTRAL_CODEX_READER_SCHEMA = 'arcsweep.ancestral-codex-reader/v0.1';

const corpus = createAncestralCorpus(ANCESTRAL_PUBLIC_MANIFEST);
const clone = (value) => value == null ? value : structuredClone(value);
const text = (value) => String(value ?? '').trim();

function boundaryForNode(node) {
  if (!node) return 'Unknown node. No ancestry claim is made.';
  if (node.kind === 'ancestral-root') {
    return 'Creator-owned historical source. Similarity to a present system does not merge canons, publish manuscript prose, or prove direct implementation ancestry.';
  }
  if (node.kind === 'correspondence') {
    return 'Steward-reviewed conceptual correspondence. It is a relation between ideas, not an assertion that two worlds or entities are identical.';
  }
  return 'Present-system node. Incoming ancestral correspondences are interpretive lineage records, not runtime state or canon promotion.';
}

export function ancestralCodexSnapshot(startRef = 'ancestral:amalthi-transition') {
  const start = text(startRef) || 'ancestral:amalthi-transition';
  const traversal = buildAncestralTraversal(corpus, start);
  const selected = traversal.nodes.find((node) => node.id === start) || null;
  const relatedEdges = traversal.edges.filter((edge) => edge.from === start || edge.to === start);
  const relatedIds = new Set(relatedEdges.flatMap((edge) => [edge.from, edge.to]).filter((id) => id !== start));
  const related = traversal.nodes.filter((node) => relatedIds.has(node.id));
  return Object.freeze({
    schema: ANCESTRAL_CODEX_READER_SCHEMA,
    corpus_id: corpus.corpus_id,
    selected: selected ? clone(selected) : null,
    related: Object.freeze(related.map((node) => Object.freeze(clone(node)))),
    traversal,
    boundary: boundaryForNode(selected),
    public_source_text_present: false,
    canon_merge_authority: false,
  });
}

export function ancestralCodexForSystem(systemRef) {
  const ref = text(systemRef);
  const query = queryAncestralCorpus(corpus, { presentSystemRefs: [ref] });
  const rootIds = new Set(query.correspondences.flatMap((entry) => entry.source_root_ids || []));
  return Object.freeze({
    schema: 'arcsweep.ancestral-codex-system-lineage/v0.1',
    system_ref: ref,
    roots: Object.freeze(query.roots.filter((root) => rootIds.has(root.root_id)).map((root) => Object.freeze(clone(root)))),
    correspondences: Object.freeze(query.correspondences.map((entry) => Object.freeze(clone(entry)))),
    boundary: 'System lineage view shows reviewed conceptual correspondences only. It does not claim source-code descent, canon identity, or publication authority.',
  });
}

export function ancestralCodexIndex() {
  const nodes = [];
  for (const root of ANCESTRAL_PUBLIC_MANIFEST.roots) {
    nodes.push(Object.freeze({ id: root.root_id, kind: 'ancestral-root', label: root.display_name }));
  }
  for (const correspondence of ANCESTRAL_PUBLIC_MANIFEST.correspondences) {
    nodes.push(Object.freeze({ id: correspondence.correspondence_id, kind: 'correspondence', label: correspondence.concept }));
    for (const system of correspondence.present_system_refs) {
      if (!nodes.some((entry) => entry.id === system)) nodes.push(Object.freeze({ id: system, kind: 'present-system', label: system }));
    }
  }
  return Object.freeze(nodes);
}
