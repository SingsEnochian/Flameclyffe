export const NARRATIVENODE_BRIDGE_SCHEMA = 'arcsweep.narrativenode-bridge/v0.1';
export const NARRATIVENODE_MCP_PLAN_SCHEMA = 'arcsweep.narrativenode-mcp-plan/v0.1';
export const NARRATIVENODE_DEFAULT_MCP_URL = 'http://127.0.0.1:13316/mcp/server/';

const text = (value) => String(value ?? '').trim();
const slug = (value) => text(value).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const clone = (value) => value == null ? value : structuredClone(value);
const symbolicRef = (capture, field = 'id') => '$' + '{' + capture + '}.' + field;

export const NARRATIVENODE_POLYPHONY_TAGS = Object.freeze([
  'diegetic-source',
  'productive-apocrypha',
  'name-lineage',
  'imposed-name',
  'recovered-name',
  'erasure-active',
  'mnemonic-ecology',
  'palimpsest',
  'sensory-memory',
  'overcoupling-risk',
  'agency-boundary',
  'world-truth',
  'witness-belief',
  'institutional-doctrine',
  'folklore',
]);

export const NARRATIVENODE_CUSTOM_CATEGORIES = Object.freeze([
  Object.freeze({
    name: 'In-world Source',
    description: 'A diegetic document, song, inscription, archive, testimony carrier, translation, or other source that exists inside the story world.',
  }),
  Object.freeze({
    name: 'Tradition',
    description: 'A named cultural, institutional, familial, religious, scholarly, or folkloric tradition that can hold its own version of a claim.',
  }),
  Object.freeze({
    name: 'Place Layer',
    description: 'One historical, sacred, linguistic, political, archaeological, folkloric, or recovered stratum of a palimpsest place.',
  }),
]);

export const NARRATIVENODE_STORY_SEEDS = Object.freeze([
  Object.freeze({ name: 'Name Lineage', attribute_type: 'text_list', default_value: '' }),
  Object.freeze({ name: 'Mnemonic Channels', attribute_type: 'text_list', default_value: '' }),
  Object.freeze({ name: 'Erasure Pressure', attribute_type: 'number', default_value: '0' }),
  Object.freeze({ name: 'Resonance Autonomy', attribute_type: 'number', default_value: '1' }),
]);

function step(tool, args = {}, extras = {}) {
  return Object.freeze({
    tool,
    args: Object.freeze(clone(args)),
    requires_active_session: tool !== 'request_mcp_session',
    ...extras,
  });
}

export function buildNarrativeNodeBootstrapPlan({
  purpose = 'Install the ArcSweep polyphonic narrative profile into this NarrativeNode story',
  endpoint = NARRATIVENODE_DEFAULT_MCP_URL,
} = {}) {
  const steps = [
    step('request_mcp_session', { purpose }, { requires_active_session: false, phase: 'permission' }),
    ...NARRATIVENODE_CUSTOM_CATEGORIES.map((category) =>
      step('create_custom_category', category, { phase: 'bootstrap', idempotency: 'check-or-create-by-name' })
    ),
    ...NARRATIVENODE_POLYPHONY_TAGS.map((name) =>
      step('create_tag', { name }, { phase: 'bootstrap', idempotency: 'native-find-or-create' })
    ),
  ];
  for (const entityType of ['character', 'location', 'item', 'faction', 'custom']) {
    for (const seed of NARRATIVENODE_STORY_SEEDS) {
      steps.push(step('add_story_seed', {
        entity_type: entityType,
        name: seed.name,
        attribute_type: seed.attribute_type,
        default_value: seed.default_value,
      }, {
        phase: 'bootstrap',
        idempotency: 'skip-when-seed-name-already-exists',
        affects_future_entities_only: true,
      }));
    }
  }
  steps.push(step('end_mcp_session', {
    summary: 'ArcSweep polyphonic narrative profile installed: diegetic provenance, productive apocrypha, name lineage, mnemonic ecology, palimpsest, erasure, and resonance-autonomy surfaces.',
    category: 'setup',
  }, { phase: 'close' }));
  return Object.freeze({
    schema: NARRATIVENODE_MCP_PLAN_SCHEMA,
    plan_id: 'narrativenode-polyphony-bootstrap-v0.1',
    endpoint,
    execution: 'sequential-mcp-tool-calls',
    external_source_code_incorporated: false,
    user_grant_required: true,
    steps: Object.freeze(steps),
  });
}

export function narrativeNodeTagsForClaim(claim = {}) {
  const tags = new Set();
  const truthLayer = text(claim.truth_layer || claim.truthLayer).toLowerCase();
  if (truthLayer === 'world-truth') tags.add('world-truth');
  if (truthLayer === 'witness-belief') tags.add('witness-belief');
  if (truthLayer === 'institutional-doctrine') tags.add('institutional-doctrine');
  if (truthLayer === 'folklore') tags.add('folklore');
  if (claim.productive_apocrypha === true || claim.productiveApocrypha === true) tags.add('productive-apocrypha');
  if (claim.diegetic_provenance || claim.diegeticProvenance) tags.add('diegetic-source');
  if (claim.erasure === true) tags.add('erasure-active');
  if (claim.overcoupling_risk === true || claim.overcouplingRisk === true) tags.add('overcoupling-risk');
  for (const value of claim.tags || []) {
    const normalized = text(value).replace(/^#/, '').toLowerCase();
    if (NARRATIVENODE_POLYPHONY_TAGS.includes(normalized)) tags.add(normalized);
  }
  return [...tags];
}

export function mapClaimToNarrativeNodeKnowledge(claim = {}) {
  const id = text(claim.id || claim.claim_id || claim.claimId);
  const name = text(claim.name || claim.label);
  if (!id || !name) throw new Error('NARRATIVENODE_BRIDGE: claim requires id and name');
  const description = text(claim.summary || claim.description);
  const sourceIds = (claim.source_ids || claim.sourceIds || []).map(text).filter(Boolean);
  const tradition = text(claim.tradition);
  const notes = [
    'ArcSweep bridge record. This is a narrative knowledge object, not an automatic canon promotion.',
    claim.productive_apocrypha === true || claim.productiveApocrypha === true
      ? 'Resolution: intentionally plural / productive apocrypha; do not select a winner automatically.'
      : null,
    tradition ? `Tradition: ${tradition}` : null,
    sourceIds.length ? `ArcSweep source IDs: ${sourceIds.join(', ')}` : null,
  ].filter(Boolean).join('\n');
  return Object.freeze({
    bridge_id: `claim:${slug(id)}`,
    source_claim_id: id,
    create: Object.freeze({
      tool: 'create_knowledge',
      args: Object.freeze({
        name,
        description,
        notes,
        awareness_scale: claim.awareness_scale || claim.awarenessScale || 'full',
        ...(claim.scene ? { scene: claim.scene } : {}),
      }),
    }),
    tags: Object.freeze(narrativeNodeTagsForClaim(claim)),
    awareness: Object.freeze((claim.awareness || []).map((entry) => ({
      observer: text(entry.observer || entry.character),
      level: entry.level,
      ...(entry.at ? { at: entry.at } : {}),
    })).filter((entry) => entry.observer && entry.level != null)),
  });
}

export function buildNarrativeNodeClaimPlan({
  worldId,
  claims = [],
  purpose = null,
  endpoint = NARRATIVENODE_DEFAULT_MCP_URL,
} = {}) {
  const mapped = claims.map(mapClaimToNarrativeNodeKnowledge);
  const steps = [
    step('request_mcp_session', {
      purpose: purpose || `Sync ArcSweep polyphonic narrative knowledge for ${text(worldId) || 'the active world'}`,
    }, { requires_active_session: false, phase: 'permission' }),
  ];

  for (const item of mapped) {
    const capture = `knowledge:${item.bridge_id}`;
    steps.push(step(item.create.tool, item.create.args, {
      phase: 'knowledge',
      capture_as: capture,
      source_claim_id: item.source_claim_id,
    }));
    if (item.tags.length) {
      steps.push(step('add_tags', {
        host: symbolicRef(capture),
        tags: item.tags,
      }, {
        phase: 'knowledge-tags',
        symbolic_refs: true,
      }));
    }
    if (item.awareness.length) {
      steps.push(step('set_knowledge_awareness', {
        knowledge: symbolicRef(capture),
        entries: item.awareness,
      }, {
        phase: 'knowledge-awareness',
        symbolic_refs: true,
      }));
    }
  }

  steps.push(step('end_mcp_session', {
    summary: `Synced ${mapped.length} ArcSweep knowledge record(s) into NarrativeNode without canon promotion.`,
    category: 'authoring',
  }, { phase: 'close' }));

  return Object.freeze({
    schema: NARRATIVENODE_MCP_PLAN_SCHEMA,
    plan_id: `narrativenode-claims:${slug(worldId || 'world')}`,
    endpoint,
    world_id: text(worldId) || null,
    user_grant_required: true,
    sequential: true,
    symbolic_reference_syntax: '$' + '{capture_name}.field',
    steps: Object.freeze(steps),
  });
}

export function mapNameLineageToNarrativeNode({
  entity,
  lineage,
  sceneByNameId = {},
} = {}) {
  const entityRef = text(entity?.id || entity?.name || entity);
  if (!entityRef) throw new Error('NARRATIVENODE_BRIDGE: entity is required for name lineage');
  const names = Array.isArray(lineage?.names) ? lineage.names : [];
  const calls = [];
  for (const record of names) {
    if (!record?.value) continue;
    const at = sceneByNameId[record.id] || null;
    if (record.kind === 'self-name' && !at) continue;
    calls.push(Object.freeze({
      tool: 'add_aliases',
      args: Object.freeze({
        entity: entityRef,
        aliases: [{ value: record.value }],
        ...(at ? { at } : {}),
        ...(at ? {
          track_as_knowledge: {
            name: `Name event: ${record.value}`,
            description: `${record.kind}; authority=${record.authority || 'local'}; consent=${record.consent || 'unknown'}`,
            awareness_scale: 'full',
          },
        } : {}),
      }),
      tags: Object.freeze([
        'name-lineage',
        record.kind === 'imposed-name' ? 'imposed-name' : null,
        record.kind === 'recovered-name' ? 'recovered-name' : null,
      ].filter(Boolean)),
    }));
  }
  return Object.freeze({
    schema: NARRATIVENODE_BRIDGE_SCHEMA,
    entity: entityRef,
    calls: Object.freeze(calls),
    note: 'NarrativeNode aliases carry historical/chosen names; ArcSweep retains the full authority/consent lineage.',
  });
}

export function narrativeNodeInteropReceipt({
  plan,
  executedSteps = [],
  completedAt = new Date().toISOString(),
} = {}) {
  if (plan?.schema !== NARRATIVENODE_MCP_PLAN_SCHEMA) throw new Error('NARRATIVENODE_BRIDGE: receipt requires an MCP plan');
  return Object.freeze({
    schema: 'arcsweep.narrativenode-interop-receipt/v0.1',
    plan_id: plan.plan_id,
    world_id: plan.world_id || null,
    endpoint: plan.endpoint,
    completed_at: completedAt,
    executed_steps: Object.freeze(executedSteps.map(clone)),
    canon_promoted: false,
    external_source_code_incorporated: false,
    user_grant_was_required: true,
  });
}
