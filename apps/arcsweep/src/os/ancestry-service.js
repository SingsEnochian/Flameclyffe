import {
  createAncestralCorpus,
  buildAncestralTraversal,
  queryAncestralCorpus,
} from '../ancestral-corpus.js';
import { ANCESTRAL_PUBLIC_MANIFEST } from '../ancestral-corpus-seed.js';
import {
  ancestralCodexForSystem,
  ancestralCodexIndex,
  ancestralCodexSnapshot,
} from '../ancestral-codex-reader.js';

export const ANCESTRY_SERVICE_SCHEMA = 'arcsweep.ancestry-service/v0.1';
export const ANCESTRY_STATUS_SCHEMA = 'arcsweep.ancestry-status/v0.1';

const corpus = createAncestralCorpus(ANCESTRAL_PUBLIC_MANIFEST);
const freeze = (value) => Object.freeze(value);
const text = (value) => String(value ?? '').trim();
const list = (value) => Array.isArray(value) ? value.map(text).filter(Boolean) : [];

function safeQueryInput(input = {}) {
  return {
    rootIds: list(input.root_ids ?? input.rootIds),
    fingerprints: list(input.fingerprints),
    presentSystemRefs: list(input.present_system_refs ?? input.presentSystemRefs),
    includeRoots: input.include_roots !== false,
    includeCorrespondences: input.include_correspondences !== false,
  };
}

export function ancestryStatus() {
  return freeze({
    schema: ANCESTRY_STATUS_SCHEMA,
    service_id: 'ancestry',
    available: true,
    corpus_id: corpus.corpus_id,
    root_count: ANCESTRAL_PUBLIC_MANIFEST.roots.length,
    correspondence_count: ANCESTRAL_PUBLIC_MANIFEST.correspondences.length,
    public_source_text_present: false,
    private_source_ref_exposed: false,
    canon_merge_authority: false,
    relation_identity_law: 'A != B != R',
  });
}

export function registerAncestryService(registry, { bus = null } = {}) {
  if (!registry?.registerService || !registry?.registerCapability) {
    throw new Error('Ancestry service requires the ArcSweep capability registry.');
  }

  if (bus?.define && bus?.eventNames) {
    const known = new Set(bus.eventNames());
    if (!known.has('arcsweep:ancestry-read')) {
      bus.define('arcsweep:ancestry-read', (payload) => payload?.schema === 'arcsweep.ancestry-read-event/v0.1' && Boolean(payload?.ref));
    }
  }

  registry.registerService({
    service_id: 'ancestry',
    label: 'ArcSweep Ancestral Corpus',
    authority_boundary: {
      public_manifest_read: true,
      private_source_read: false,
      manuscript_prose_read: false,
      source_binding_mutation: false,
      canon_promotion: false,
      narrative_node_mutation: false,
      relation_state_mutation: false,
    },
    consumes: ['ancestral-public-manifest'],
    emits: ['arcsweep:ancestry-read'],
  });

  registry.registerCapability({
    capability_id: 'ancestry.status',
    service_id: 'ancestry',
    description: 'Read Ancestral Corpus service status and public-boundary guarantees.',
    authority: 'read',
    execute: () => ancestryStatus(),
  });

  registry.registerCapability({
    capability_id: 'ancestry.index',
    service_id: 'ancestry',
    description: 'List public-safe ancestral roots, reviewed correspondences, and present-system references.',
    authority: 'read',
    execute: () => freeze({
      schema: 'arcsweep.ancestry-index/v0.1',
      nodes: freeze(ancestralCodexIndex()),
      public_source_text_present: false,
      canon_merge_authority: false,
    }),
  });

  registry.registerCapability({
    capability_id: 'ancestry.query',
    service_id: 'ancestry',
    description: 'Query public-safe ancestral roots and reviewed conceptual correspondences.',
    authority: 'read',
    input_schema: { optional: ['root_ids', 'fingerprints', 'present_system_refs', 'include_roots', 'include_correspondences'] },
    validate: (input = {}) => input && typeof input === 'object' && !Array.isArray(input),
    execute: (input = {}) => queryAncestralCorpus(corpus, safeQueryInput(input)),
  });

  registry.registerCapability({
    capability_id: 'ancestry.read',
    service_id: 'ancestry',
    description: 'Read one Universal Codex ancestry node with adjacent correspondence context.',
    authority: 'read',
    input_schema: { required: ['ref'] },
    validate: (input = {}) => Boolean(text(input.ref)),
    execute: (input = {}) => {
      const ref = text(input.ref);
      const snapshot = ancestralCodexSnapshot(ref);
      bus?.publish?.('arcsweep:ancestry-read', {
        schema: 'arcsweep.ancestry-read-event/v0.1',
        ref,
        selected_kind: snapshot.selected?.kind || null,
        related_count: snapshot.related?.length || 0,
        manuscript_text_present: false,
      }, { source: 'ancestry' });
      return snapshot;
    },
  });

  registry.registerCapability({
    capability_id: 'ancestry.traverse',
    service_id: 'ancestry',
    description: 'Traverse a public-safe root → correspondence → present-system lineage graph.',
    authority: 'read',
    input_schema: { required: ['ref'] },
    validate: (input = {}) => Boolean(text(input.ref)),
    execute: (input = {}) => buildAncestralTraversal(corpus, text(input.ref)),
  });

  registry.registerCapability({
    capability_id: 'ancestry.system-lineage',
    service_id: 'ancestry',
    description: 'Read reviewed ancestral correspondences for one present system without claiming direct descent.',
    authority: 'read',
    input_schema: { required: ['system_ref'] },
    validate: (input = {}) => Boolean(text(input.system_ref)),
    execute: (input = {}) => ancestralCodexForSystem(text(input.system_ref)),
  });

  return freeze({
    schema: ANCESTRY_SERVICE_SCHEMA,
    service_id: 'ancestry',
    capabilities: freeze([
      'ancestry.status',
      'ancestry.index',
      'ancestry.query',
      'ancestry.read',
      'ancestry.traverse',
      'ancestry.system-lineage',
    ]),
  });
}
