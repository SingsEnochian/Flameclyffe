function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function normaliseWords(values = []) {
  const input = Array.isArray(values) ? values : [values];
  return [...new Set(input
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => value.trim().toLowerCase()))];
}

function normaliseSkill(input = {}) {
  const skillId = String(input.skill_id || '').trim();
  if (!skillId) throw new Error('Scientific skill requires skill_id.');
  const version = String(input.version || '1').trim();
  return Object.freeze({
    schema: 'arcsweep.scientific-skill-descriptor/v1',
    skill_id: skillId,
    version,
    label: input.label || skillId,
    topics: normaliseWords(input.topics),
    capabilities: normaliseWords(input.capabilities),
    source_refs: [...new Set((input.source_refs || []).filter((value) => typeof value === 'string' && value.trim()))],
    authority: 'procedural-knowledge-only',
    grants_runtime_authority: false,
    notes: input.notes || null,
  });
}

export const DEFAULT_SCIENTIFIC_SKILLS = Object.freeze([
  normaliseSkill({
    skill_id: 'observer-semantic-status',
    version: '1',
    label: 'Observer semantic status',
    topics: ['observer', 'diagnostics', 'status', 'provenance'],
    capabilities: ['observer.status'],
    source_refs: [
      'https://github.com/mdkubit/Project-Zero-Ezra-Edition',
      'https://github.com/K-Dense-AI/scientific-agent-skills/releases/tag/v2.69.0',
    ],
    notes: 'Keep availability, integration health, runtime state, data health, activity, and domain status distinct. Unknown remains unknown.',
  }),
  normaliseSkill({
    skill_id: 'epistemic-ledger',
    version: '1',
    label: 'Evidence and mechanism ledger',
    topics: ['evidence', 'claims', 'mechanisms', 'provenance', 'observer'],
    capabilities: ['observer.epistemic-ledger', 'observer.narrative-state'],
    source_refs: [
      'https://github.com/K-Dense-AI/scientific-agent-skills/releases/tag/v2.69.0',
    ],
    notes: 'Track observations, measurements, transformations, claims, and explicit mechanism edges without promoting visualisation or narrative into evidence.',
  }),
  normaliseSkill({
    skill_id: 'semantic-acceptance',
    version: '1',
    label: 'Semantic acceptance',
    topics: ['acceptance', 'testing', 'semantics', 'receipts'],
    capabilities: ['observer.status', 'observer.deep-current'],
    source_refs: [
      'https://github.com/K-Dense-AI/scientific-agent-skills/releases/tag/v2.69.0',
      'https://github.com/mdkubit/Project-Zero-Ezra-Edition',
    ],
    notes: 'A successful transport, DOM event, or API response does not prove the intended semantic state changed.',
  }),
  normaliseSkill({
    skill_id: 'canonical-narrative-state',
    version: '1',
    label: 'Canonical narrative state',
    topics: ['narrative', 'claims', 'evidence', 'objections', 'risks', 'research-gaps'],
    capabilities: ['observer.narrative-state'],
    source_refs: [
      'https://github.com/cyber-dash-tech/revela',
    ],
    notes: 'Keep narrative state traceable to claims and evidence while preserving objections, risks, gaps, and provenance boundaries.',
  }),
]);

export function createScientificSkillRouter({ skills = DEFAULT_SCIENTIFIC_SKILLS } = {}) {
  const records = new Map();

  function register(input) {
    const record = normaliseSkill(input);
    const key = `${record.skill_id}@${record.version}`;
    if (records.has(key)) throw new Error(`Scientific skill already registered: ${key}`);
    records.set(key, record);
    return clone(record);
  }

  for (const skill of skills) register(skill);

  function list() {
    return [...records.values()].map(clone);
  }

  function select({ topics = [], capabilities = [], limit = 5 } = {}) {
    const requestedTopics = normaliseWords(topics);
    const requestedCapabilities = normaliseWords(capabilities);
    const maximum = Math.max(1, Math.min(20, Number(limit) || 5));
    const ranked = [...records.values()].map((record) => {
      const topicHits = requestedTopics.filter((topic) => record.topics.includes(topic));
      const capabilityHits = requestedCapabilities.filter((capability) => record.capabilities.includes(capability));
      return {
        record,
        score: topicHits.length * 2 + capabilityHits.length * 3,
        topic_hits: topicHits,
        capability_hits: capabilityHits,
      };
    }).filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.record.skill_id.localeCompare(b.record.skill_id))
      .slice(0, maximum)
      .map((item) => ({
        ...clone(item.record),
        match: {
          score: item.score,
          topic_hits: item.topic_hits,
          capability_hits: item.capability_hits,
        },
      }));

    return Object.freeze({
      schema: 'arcsweep.scientific-skill-selection/v1',
      requested: Object.freeze({ topics: requestedTopics, capabilities: requestedCapabilities }),
      selected: ranked,
      selection_only: true,
      grants_runtime_authority: false,
    });
  }

  return Object.freeze({ register, list, select });
}

export function registerScientificSkillService(registry, { skills = DEFAULT_SCIENTIFIC_SKILLS } = {}) {
  if (!registry?.registerService || !registry?.registerCapability) throw new Error('Scientific skill service requires the ArcSweep capability registry.');
  const router = createScientificSkillRouter({ skills });

  registry.registerService({
    service_id: 'scientific-skill-router',
    label: 'Scientific Skill Router',
    authority_boundary: {
      selection_only: true,
      procedural_knowledge_only: true,
      capability_grant: false,
      source_mutation: false,
    },
    consumes: [],
    emits: [],
  });

  registry.registerCapability({
    capability_id: 'skills.list',
    service_id: 'scientific-skill-router',
    description: 'List installed scientific procedural-knowledge descriptors without loading every skill into active context.',
    authority: 'read',
    execute: () => ({
      schema: 'arcsweep.scientific-skill-list/v1',
      skills: router.list(),
      grants_runtime_authority: false,
    }),
  });

  registry.registerCapability({
    capability_id: 'skills.select',
    service_id: 'scientific-skill-router',
    description: 'Select a bounded subset of scientific skills by topic or capability intent.',
    authority: 'read',
    input_schema: { optional: ['topics', 'capabilities', 'limit'] },
    validate: (input) => input && typeof input === 'object',
    execute: (input) => router.select(input),
  });

  return Object.freeze({
    service_id: 'scientific-skill-router',
    capabilities: ['skills.list', 'skills.select'],
    router,
  });
}
