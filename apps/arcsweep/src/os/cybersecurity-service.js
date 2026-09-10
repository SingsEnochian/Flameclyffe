function clone(value) {
  if (value === undefined) return undefined;
  return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

export const CYBERSECURITY_SEED_SCHEMA = 'arcsweep.cybersecurity-seed/v1';
export const CYBERSECURITY_SEED_PATH = 'security/arcsweep-cybersecurity-seed-v1.json';

function validateSeed(seed) {
  if (!seed || seed.schema !== CYBERSECURITY_SEED_SCHEMA) throw new Error('Cybersecurity intelligence seed has an invalid schema.');
  if (!Array.isArray(seed.sources) || !Array.isArray(seed.risk_families)) throw new Error('Cybersecurity intelligence seed is missing sources or risk families.');
  return seed;
}

function resolveSeedUrl() {
  if (typeof document !== 'undefined' && document.baseURI) return new URL(CYBERSECURITY_SEED_PATH, document.baseURI).href;
  return CYBERSECURITY_SEED_PATH;
}

export async function loadCybersecuritySeed({ fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('Cybersecurity intelligence requires fetch().');
  const response = await fetchImpl(resolveSeedUrl(), { cache: 'no-store' });
  if (!response?.ok) throw new Error(`Cybersecurity intelligence seed failed to load: ${response?.status || 'unknown-status'}`);
  return clone(validateSeed(await response.json()));
}

export function registerCybersecurityIntelligenceService(registry, { loadSeed = loadCybersecuritySeed } = {}) {
  if (!registry?.registerService || !registry?.registerCapability) throw new Error('Cybersecurity Intelligence service requires the ArcSweep capability registry.');
  let cachedSeed = null;

  async function seed() {
    if (!cachedSeed) cachedSeed = clone(validateSeed(await loadSeed()));
    return clone(cachedSeed);
  }

  registry.registerService({
    service_id: 'cybersecurity-intelligence',
    label: 'ArcSweep Cybersecurity Intelligence',
    authority_boundary: {
      read_intelligence: true,
      classify_known_risk_tags: true,
      mutate_runtime_policy: false,
      grant_capability_authority: false,
      autonomous_offensive_action: false,
      source_mutation: false,
    },
    consumes: [],
    emits: [],
  });

  registry.registerCapability({
    capability_id: 'security.catalog',
    service_id: 'cybersecurity-intelligence',
    description: 'Read the vetted ArcSweep cybersecurity intelligence seed and its ingest policy.',
    authority: 'read',
    execute: () => seed(),
  });

  registry.registerCapability({
    capability_id: 'security.sources',
    service_id: 'cybersecurity-intelligence',
    description: 'Read the currently vetted cybersecurity intelligence source catalogue.',
    authority: 'read',
    execute: async () => (await seed()).sources,
  });

  registry.registerCapability({
    capability_id: 'security.risk-families',
    service_id: 'cybersecurity-intelligence',
    description: 'Read the defensive risk-family vocabulary used by Sentinel and the capability firewall.',
    authority: 'read',
    execute: async () => (await seed()).risk_families,
  });

  registry.registerCapability({
    capability_id: 'security.source',
    service_id: 'cybersecurity-intelligence',
    description: 'Read one vetted security source descriptor by stable source ID.',
    authority: 'read',
    input_schema: { required: ['source_id'] },
    validate: (input) => Boolean(String(input?.source_id || '').trim()),
    execute: async (input) => {
      const catalog = await seed();
      return catalog.sources.find((item) => item.source_id === input.source_id) || null;
    },
  });

  registry.registerCapability({
    capability_id: 'security.classify-known-risk-tags',
    service_id: 'cybersecurity-intelligence',
    description: 'Separate supplied defensive risk tags into known and unknown vocabulary without changing policy.',
    authority: 'read',
    input_schema: { required: ['risk_families'] },
    validate: (input) => Array.isArray(input?.risk_families),
    execute: async (input) => {
      const catalog = await seed();
      const knownVocabulary = new Set(catalog.risk_families);
      const supplied = [...new Set(input.risk_families.map((item) => String(item).trim()).filter(Boolean))];
      return {
        known: supplied.filter((item) => knownVocabulary.has(item)),
        unknown: supplied.filter((item) => !knownVocabulary.has(item)),
      };
    },
  });

  return Object.freeze({
    service_id: 'cybersecurity-intelligence',
    capabilities: [
      'security.catalog',
      'security.sources',
      'security.risk-families',
      'security.source',
      'security.classify-known-risk-tags',
    ],
  });
}
