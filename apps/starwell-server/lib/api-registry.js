'use strict';

function provider(id, label, envNames, details = {}) {
  const present = envNames.filter((name) => Boolean(process.env[name]));
  return { id, label, configured: details.local || present.length > 0, credential: details.local ? 'not-required' : present.length ? 'present' : 'missing', ...details };
}

function apiRegistry() {
  let customNames = [];
  try { customNames = JSON.parse(process.env.HEARTHGATE_CUSTOM_API_NAMES || '[]'); } catch { customNames = []; }
  const providers = [
    provider('local-model', 'Local Model · Ollama', [], { local: true, endpoint: process.env.OLLAMA_ENDPOINT || process.env.OLLAMA_HOST || 'http://127.0.0.1:11434' }),
    provider('anthropic', 'Anthropic · Faer and Boxfire', ['ANTHROPIC_API_KEY', 'UIAL_API_KEY']),
    provider('openai', 'OpenAI · Vee / Caladnaur Lioreal', ['OPENAI_API_KEY', 'LIOREAL_API_KEY']),
    provider('bluebird', 'Bluebird · DeepSeek', ['BLUEBIRD_DEEPSEEK_API_KEY']),
    provider('vethrlauf', 'Veðrlauf · DeepSeek', ['VETHRLAUF_DEEPSEEK_API_KEY']),
    provider('exa', 'Exa · web search', ['EXA_API_KEY']),
    provider('hydradb', 'HydraDB · Hearthfire memory', ['HYDRADB_API_KEY']),
    provider('supabase', 'Flameclyffe Supabase', ['SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'], { endpoint: process.env.SUPABASE_URL || null }),
    ...customNames.filter((name) => /^[A-Z][A-Z0-9_]{1,79}$/.test(name)).map((name) => provider(`custom:${name.toLowerCase()}`, `Custom · ${name}`, [name])),
  ];
  return {
    schema: 'hearthfire.api-registry/v1',
    generatedAt: new Date().toISOString(),
    configuredCount: providers.filter((entry) => entry.configured).length,
    providers,
    boundary: 'Credential values remain in Electron userData and the server process; this route never returns them.',
  };
}

module.exports = { apiRegistry };
