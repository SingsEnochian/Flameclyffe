import {
  NARRATIVENODE_DEFAULT_MCP_URL,
  NARRATIVENODE_MCP_PLAN_SCHEMA,
} from './narrativenode-polyphony-adapter.js';

export const NARRATIVENODE_ANCESTRY_BRIDGE_SCHEMA = 'arcsweep.narrativenode-ancestry-bridge/v0.1';

const text = (value) => String(value ?? '').trim();
const clone = (value) => value == null ? value : structuredClone(value);

function step(tool, args = {}, extras = {}) {
  return Object.freeze({
    tool,
    args: Object.freeze(clone(args)),
    requires_active_session: tool !== 'request_mcp_session',
    ...extras,
  });
}

function rootKnowledge(root) {
  return Object.freeze({
    name: `Ancestral root: ${root.display_name || root.root_id}`,
    description: (root.fingerprints || []).join('; '),
    notes: [
      'ArcSweep Ancestral Corpus record.',
      'Creator-owned historical source.',
      'No manuscript prose or private source locator transmitted.',
      'Conceptual recurrence does not merge canons.',
      `ArcSweep root id: ${root.root_id}`,
      `Privacy class: ${root.privacy_class || 'private_draft'}`,
    ].join('\n'),
    awareness_scale: 'full',
  });
}

function correspondenceKnowledge(entry) {
  return Object.freeze({
    name: `Ancestral correspondence: ${entry.correspondence_id}`,
    description: text(entry.concept),
    notes: [
      'Steward-reviewed conceptual correspondence.',
      `Source roots: ${(entry.source_root_ids || []).join(', ') || 'none'}`,
      `Present systems: ${(entry.present_system_refs || []).join(', ') || 'none'}`,
      `Confidence: ${entry.confidence || 'unspecified'}`,
      'This is not an identity claim, canon merge, source-code descent claim, or publication grant.',
    ].join('\n'),
    awareness_scale: 'full',
  });
}

export function buildNarrativeNodeAncestryPlan({
  manifest,
  rootIds = [],
  correspondenceIds = [],
  endpoint = NARRATIVENODE_DEFAULT_MCP_URL,
  purpose = 'Project ArcSweep Ancestral Corpus lineage into NarrativeNode without canon merge',
} = {}) {
  if (!manifest || manifest.schema !== 'arcsweep.ancestral-corpus-manifest/v0.1') {
    throw new TypeError('A valid ancestral corpus manifest is required.');
  }
  const selectedRootIds = new Set((rootIds || []).map(text).filter(Boolean));
  const selectedCorrespondenceIds = new Set((correspondenceIds || []).map(text).filter(Boolean));
  const roots = (manifest.roots || []).filter((root) => !selectedRootIds.size || selectedRootIds.has(root.root_id));
  const correspondences = (manifest.correspondences || []).filter((entry) => !selectedCorrespondenceIds.size || selectedCorrespondenceIds.has(entry.correspondence_id));

  const steps = [
    step('request_mcp_session', { purpose }, { requires_active_session: false, phase: 'permission' }),
  ];

  for (const root of roots) {
    steps.push(step('create_knowledge', rootKnowledge(root), {
      phase: 'ancestral-root',
      source_root_id: root.root_id,
      tags: Object.freeze(['ancestral-source', 'creator-owned', 'canon-boundary']),
    }));
  }
  for (const entry of correspondences) {
    steps.push(step('create_knowledge', correspondenceKnowledge(entry), {
      phase: 'ancestral-correspondence',
      correspondence_id: entry.correspondence_id,
      tags: Object.freeze(['conceptual-correspondence', 'canon-boundary']),
    }));
  }

  steps.push(step('end_mcp_session', {
    summary: `Projected ${roots.length} ancestral root(s) and ${correspondences.length} correspondence(s) without private manuscript text or canon promotion.`,
  }, { phase: 'close' }));

  return Object.freeze({
    schema: NARRATIVENODE_MCP_PLAN_SCHEMA,
    bridge_schema: NARRATIVENODE_ANCESTRY_BRIDGE_SCHEMA,
    plan_id: 'narrativenode-ancestry-v0.1',
    endpoint,
    user_grant_required: true,
    execution: 'sequential-mcp-tool-calls',
    external_source_code_incorporated: false,
    private_source_ref_transmitted: false,
    manuscript_text_transmitted: false,
    canon_promoted: false,
    steps: Object.freeze(steps),
  });
}
