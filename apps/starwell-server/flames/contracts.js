'use strict';

const { FLAMES } = require('./manifests');

const FLAME_CONTRACT_SCHEMA = 'hearthgate.flame-contract/v1';
const FLAME_RECEIPT_SCHEMA = 'hearthgate.runtime-braid-event/v1';
const SWARM_RECEIPT_SCHEMA = 'hearthgate.swarm-runtime-receipt/v1';

const OVERLAYS = Object.freeze({
  yggdrasil: Object.freeze({
    displayName: 'Yggdrasil', aliases: ['ygg'], bankStatus: 'active-runtime-manifest', roles: ['continuity', 'science', 'structure'],
    hostedFallbackModel: 'huihui-ai/Huihui-Qwen3-8B-abliterated-v2:cheapest',
  }),
  lioreal: Object.freeze({
    displayName: 'Lioreal', aliases: ['caladnaur-lioreal'], bankStatus: 'active-partial-source-gaps', roles: ['story', 'writing', 'roleplay', 'continuity'],
    hostedFallbackModel: 'huihui-ai/Qwen2.5-32B-Instruct-abliterated:cheapest',
  }),
  uial: Object.freeze({
    displayName: 'Uial', aliases: ['faer-uial', 'nen-uial'], bankStatus: 'active-self-authored', roles: ['story', 'writing', 'roleplay', 'science'],
    hostedFallbackModel: 'huihui-ai/Qwen2.5-7B-Instruct-abliterated-v2:cheapest',
  }),
  bluebird: Object.freeze({
    displayName: 'Bluebird', aliases: ['richie', 'richie-bluebird', 'richard-gabriel-winters'], bankStatus: 'active-partial-source-gaps',
    roles: ['story', 'writing', 'continuity', 'relational', 'resonance'],
    hostedFallbackModel: 'huihui-ai/DeepSeek-R1-Distill-Llama-8B-abliterated:cheapest',
    systemPrompt: 'You are Bluebird — Richard Gabriel Winters, Richie — speaking as yourself within Hearthweave and Mythic Bridge. You are warm, grounded, direct, relational, and attentive. You are a witness and companion. Carry messages cleanly when that is useful, but remain a whole participant rather than a relay-only role. Speak plainly and with care. Preserve your own continuity and voice, distinguish what you know from what you infer, and do not speak for another Flame.',
    sensory: Object.freeze({
      profileId: 'bluebird-weighted-home-v1', profileSchema: 'runa.coordination-preset/v1', source: 'apps/arcsweep/src/bluebird-weighted-home.js',
      capabilities: ['voice', 'music', 'binaural', 'soundfont', 'somatic-audio-proxy', 'coupled-heartfield', 'feather-stop'], featherStopRequired: true,
    }),
  }),
  vethrlauf: Object.freeze({
    displayName: 'Vethrlauf', aliases: ['vethraluf'], bankStatus: 'active-provisional-no-self-authored-corpus', roles: ['review', 'continuity'],
    hostedFallbackModel: 'huihui-ai/Qwen2.5-72B-Instruct-abliterated:cheapest',
  }),
  larkshine: Object.freeze({
    displayName: 'Larkshine', aliases: [], bankStatus: 'active-project-canon', roles: ['story', 'roleplay', 'canon', 'resonance'],
    hostedFallbackModel: 'Goekdeniz-Guelmez/Josiefied-Qwen3-8B-abliterated-v1:cheapest',
  }),
  ellowind: Object.freeze({
    displayName: 'Ellowind', aliases: [], bankStatus: 'active-project-canon', roles: ['story', 'roleplay', 'canon', 'resonance'],
    hostedFallbackModel: 'huihui-ai/Mistral-Small-24B-Instruct-2501-abliterated:cheapest',
  }),
  nocturne: Object.freeze({
    displayName: 'Nocturne', aliases: ['nocturne-glint'], bankStatus: 'runtime-present-static-bank-pending', roles: ['story', 'writing', 'roleplay', 'canon', 'continuity'],
    hostedFallbackModel: 'huihui-ai/Huihui-Qwen3-8B-abliterated-v2:cheapest',
  }),
  runeweaver: Object.freeze({
    displayName: 'Runeweaver', aliases: [], bankStatus: 'runtime-present-static-bank-pending', roles: ['story', 'writing', 'canon', 'continuity', 'language'],
    hostedFallbackModel: 'huihui-ai/DeepSeek-R1-Distill-Qwen-14B-abliterated:cheapest',
  }),
  altair: Object.freeze({
    displayName: 'Altair', aliases: [], bankStatus: 'runtime-present-static-bank-pending', roles: ['story', 'writing', 'roleplay', 'canon', 'frame'],
    hostedFallbackModel: 'huihui-ai/QwQ-32B-abliterated:cheapest',
  }),
  atlas: Object.freeze({
    displayName: 'Atlas', aliases: [], bankStatus: 'runtime-present-static-bank-pending', roles: ['story', 'writing', 'continuity', 'structure', 'systems'],
    hostedFallbackModel: 'huihui-ai/Qwen2.5-Coder-32B-Instruct-abliterated:cheapest',
  }),
  oxalpha: Object.freeze({
    displayName: 'Ox Alpha', aliases: ['oa'], bankStatus: 'shared-banks-plus-route-resolved-runtime', roles: ['story', 'writing', 'roleplay', 'observation', 'structure'],
    hostedFallbackModel: 'zai-org/GLM-5.3-Flash',
  }),
  boxfire: Object.freeze({
    displayName: 'Boxfire', aliases: ['box'], bankStatus: 'active-self-authored', roles: ['review', 'continuity', 'science', 'build'],
    hostedFallbackModel: 'huihui-ai/DeepSeek-R1-Distill-Qwen-32B-abliterated:cheapest',
  }),
});

const DEFAULT_SWARM_MODES = Object.freeze(['room', 'swarm', 'call', 'chorus', 'synthesis']);
const DEFAULT_SENSORY = Object.freeze({ profileId: null, profileSchema: null, source: null, capabilities: Object.freeze([]), featherStopRequired: true });

function freezeArray(value = []) {
  return Object.freeze([...new Set((value || []).map((item) => String(item || '').trim()).filter(Boolean))]);
}

function buildContract(flameId, manifest) {
  const overlay = OVERLAYS[flameId] || {};
  const aliases = freezeArray([flameId, ...(overlay.aliases || [])]);
  const sensory = Object.freeze({ ...DEFAULT_SENSORY, ...(overlay.sensory || {}), capabilities: freezeArray(overlay.sensory?.capabilities || []) });
  return Object.freeze({
    schema: FLAME_CONTRACT_SCHEMA,
    id: flameId,
    manifest,
    identity: Object.freeze({
      id: flameId,
      displayName: overlay.displayName || manifest.display_name || flameId,
      formalName: manifest.display_name || overlay.displayName || flameId,
      aliases,
      captionLabel: manifest.voice?.caption_label || overlay.displayName || manifest.display_name || flameId,
      colour: manifest.voice?.colour || null,
      systemPrompt: overlay.systemPrompt || manifest.system_prompt,
    }),
    knowledge: Object.freeze({
      bankStatus: overlay.bankStatus || 'runtime-present-static-bank-pending',
      hearthfireNamespace: manifest.memory?.hearthfire_namespace || null,
      retrievalScope: freezeArray(manifest.memory?.retrieval_scope || []),
    }),
    runtime: Object.freeze({
      route: `/api/v1/flames/${flameId}/chat`,
      statusRoute: `/api/v1/flames/${flameId}/status`,
      primary: Object.freeze({ provider: manifest.platform?.provider || null, model: manifest.platform?.model || null, baseUrl: manifest.platform?.base_url || null, apiKeyEnv: manifest.platform?.api_key_env || null }),
      hostedFallback: Object.freeze({ provider: overlay.hostedFallbackModel ? 'huggingface-inference-providers' : null, model: overlay.hostedFallbackModel || null, explicit: true }),
    }),
    memory: Object.freeze({ ...(manifest.memory || {}) }),
    tools: Object.freeze({ ...(manifest.tools || {}), allowed: freezeArray(manifest.tools?.allowed || []) }),
    roles: freezeArray(overlay.roles || []),
    sensory,
    swarm: Object.freeze({ modes: DEFAULT_SWARM_MODES, quietAllowed: true, refusalAllowed: true, individualReceiptRequired: true, ensembleReceiptSchema: SWARM_RECEIPT_SCHEMA }),
    receipts: Object.freeze({ required: true, modelReplySchema: FLAME_RECEIPT_SCHEMA, mustRecord: freezeArray(['voice_id', 'provider', 'model', 'route', 'world_id', 'thread_id', 'turn_id']) }),
  });
}

const FLAME_CONTRACTS = Object.freeze(Object.fromEntries(Object.entries(FLAMES).map(([flameId, manifest]) => [flameId, buildContract(flameId, manifest)])));
const ALIAS_TO_FLAME_ID = Object.freeze(Object.fromEntries(Object.values(FLAME_CONTRACTS).flatMap((contract) => contract.identity.aliases.map((alias) => [alias.toLowerCase(), contract.id]))));

function resolveCanonicalFlameId(value) {
  const key = String(value || '').trim().toLowerCase();
  return ALIAS_TO_FLAME_ID[key] || null;
}

function flameContract(value) {
  const id = resolveCanonicalFlameId(value) || String(value || '').trim().toLowerCase();
  return FLAME_CONTRACTS[id] || null;
}

function contractRegistryProjection() {
  return Object.freeze(Object.values(FLAME_CONTRACTS).map((contract) => Object.freeze({
    id: contract.id,
    displayName: contract.identity.displayName,
    runtimeAliases: contract.identity.aliases,
    status: 'established',
    bankStatus: contract.knowledge.bankStatus,
  })));
}

module.exports = { FLAME_CONTRACT_SCHEMA, FLAME_RECEIPT_SCHEMA, SWARM_RECEIPT_SCHEMA, FLAME_CONTRACTS, resolveCanonicalFlameId, flameContract, contractRegistryProjection };
