'use strict';

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { FLAMES } = require('./manifests');
const { MODEL_PROFILES, publicModelProfile } = require('../bifrost/model-profiles');
const ignitionRouter = require('../bifrost/ignition-routes');
const {
  modelReceipt,
  expectedProfileMismatch,
  actualModelMismatch,
  inspectManifestRuntime,
} = require('../bifrost/runtime-attestation');

const router = express.Router();

async function callAnthropic(manifest, systemPrompt, userMessage) {
  const key = process.env[manifest.platform.api_key_env];
  if (!key) throw new Error(`Env var ${manifest.platform.api_key_env} not set`);
  const client = new Anthropic({ apiKey: key });
  const res = await client.messages.create({
    model: manifest.platform.model,
    max_tokens: 600,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });
  return { text: res.content[0]?.text ?? '', model: res.model || manifest.platform.model, provider: 'anthropic' };
}

async function callDeepSeek(manifest, systemPrompt, userMessage) {
  const key = process.env[manifest.platform.api_key_env];
  if (!key) throw new Error(`Env var ${manifest.platform.api_key_env} not set`);
  const res = await fetch(`${manifest.platform.base_url}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: manifest.platform.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 600,
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`DeepSeek ${res.status}`);
  const data = await res.json();
  return { text: data.choices?.[0]?.message?.content ?? '', model: data.model || manifest.platform.model, provider: 'deepseek' };
}

async function callOpenAI(manifest, systemPrompt, userMessage) {
  const key = process.env[manifest.platform.api_key_env];
  if (!key) throw new Error(`Env var ${manifest.platform.api_key_env} not set`);
  const baseUrl = manifest.platform.base_url || 'https://api.openai.com';
  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: manifest.platform.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 600,
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = await res.json();
  return { text: data.choices?.[0]?.message?.content ?? '', model: data.model || manifest.platform.model, provider: 'openai' };
}

async function callOllama(manifest, systemPrompt, userMessage) {
  const endpoint = manifest.platform.base_url || process.env.OLLAMA_ENDPOINT || 'http://127.0.0.1:11434';
  const res = await fetch(`${endpoint}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: manifest.platform.model,
      stream: false,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}`);
  const data = await res.json();
  return { text: data.message?.content ?? '', model: data.model || manifest.platform.model, provider: 'ollama' };
}

async function dispatchToProvider(manifest, systemPrompt, userMessage) {
  switch (manifest.platform.provider) {
    case 'anthropic': return callAnthropic(manifest, systemPrompt, userMessage);
    case 'deepseek': return callDeepSeek(manifest, systemPrompt, userMessage);
    case 'openai': return callOpenAI(manifest, systemPrompt, userMessage);
    case 'ollama': return callOllama(manifest, systemPrompt, userMessage);
    default: throw new Error(`Provider "${manifest.platform.provider}" not implemented`);
  }
}

const HYDRADB_BASE = 'https://api.hydradb.com';
const HYDRADB_DB = 'default-tenant';

async function queryHearthfire(namespace, scope, query) {
  const key = process.env.HYDRADB_API_KEY;
  if (!key) return { snippets: [], source: 'hearthfire-no-key' };
  try {
    const form = new URLSearchParams();
    form.append('query', query);
    form.append('database', HYDRADB_DB);
    const res = await fetch(`${HYDRADB_BASE}/context/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'API-Version': '2', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HydraDB ${res.status}`);
    const data = await res.json();
    const chunks = data.data?.results ?? data.data?.chunks ?? [];
    return {
      snippets: chunks.slice(0, 6).map((chunk) => ({
        id: chunk.id ?? chunk.chunk_id ?? 'unknown',
        text: chunk.text ?? chunk.content ?? '',
        score: chunk.score ?? null,
      })),
      source: 'hydradb',
    };
  } catch (error) {
    console.warn('[hearthfire] query failed:', error.message);
    return { snippets: [], source: 'hearthfire-error' };
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://frqrxmshxftpylwdtsdm.supabase.co';
const SUPABASE_KEY_ENV = 'SUPABASE_SERVICE_KEY';

async function supabaseInsert(table, record) {
  const key = process.env[SUPABASE_KEY_ENV];
  if (!key) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(record),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch (error) {
    console.warn(`[supabase] insert ${table} failed:`, error.message);
    return false;
  }
}

async function logRouteInvocation(record) {
  const ok = await supabaseInsert('flame_route_logs', { ...record, logged_at: new Date().toISOString() });
  if (!ok) console.log('[supabase] route log (no-op):', record.flame_id, record.response_mode);
}

async function logMemoryProposal(record) {
  const ok = await supabaseInsert('flame_memory_proposals', { ...record, created_at: new Date().toISOString() });
  if (!ok) console.log('[supabase] memory proposal (no-op):', record.flame_id, record.status);
}

function resolveFlame(req, res, next) {
  const manifest = FLAMES[req.params.flame_id];
  if (!manifest) return res.status(404).json({ error: `Unknown flame: ${req.params.flame_id}` });
  req.flame = manifest;
  next();
}

router.get('/bifrost/model-profiles', (_req, res) => {
  const profiles = Object.keys(MODEL_PROFILES).map((profileId) => publicModelProfile(profileId));
  res.json({
    contract: 'bifrost.model-profile-registry/v1',
    profiles,
    rules: {
      profileRegistryOwnsVesselDefinitions: true,
      noSilentFallback: true,
      deepReasonerOptInOnly: true,
    },
  });
});

router.use('/bifrost/ignition', ignitionRouter);

router.post('/flames/:flame_id/chat', resolveFlame, async (req, res) => {
  const manifest = req.flame;
  const { message, session_id, context = [], metadata = {} } = req.body || {};
  if (!message) return res.status(400).json({ error: 'message required' });

  const profileMismatch = expectedProfileMismatch(manifest, metadata);
  if (profileMismatch) {
    return res.status(409).json({
      error: profileMismatch.code,
      ...profileMismatch,
      runtime: modelReceipt(manifest),
    });
  }

  const hearthCtx = await queryHearthfire(
    manifest.memory.hearthfire_namespace,
    manifest.memory.retrieval_scope,
    message
  );
  const contextBlock = context.length
    ? `Recent conversation:\n${context.map((item) => `${item.speaker}: ${item.text}`).join('\n')}\n\n`
    : '';
  const hearthBlock = hearthCtx.snippets.length
    ? `Hearthfire context:\n${hearthCtx.snippets.map((item) => item.text).join('\n')}\n\n`
    : '';
  const userMessage = `${hearthBlock}${contextBlock}${message}`;

  let providerResult;
  let error;
  try {
    providerResult = await dispatchToProvider(manifest, manifest.system_prompt, userMessage);
    const mismatch = actualModelMismatch(manifest, providerResult.model);
    if (mismatch) {
      return res.status(502).json({
        error: mismatch.code,
        ...mismatch,
        runtime: modelReceipt(manifest, providerResult),
      });
    }
  } catch (err) {
    error = err.message;
  }

  const receipt = modelReceipt(manifest, providerResult || {});
  await logRouteInvocation({
    flame_id: manifest.flame_id,
    provider: receipt.provider,
    model: receipt.model,
    model_profile_id: receipt.profile_id,
    session_id: session_id ?? null,
    message_hash: Buffer.from(message).toString('base64').slice(0, 16),
    retrieved_source_ids: hearthCtx.snippets.map((item) => item.id ?? 'unknown'),
    response_mode: error ? 'error' : 'success',
    memory_write_recommendation: false,
  });

  if (error) return res.status(502).json({ ...receipt, error });

  res.json({
    ...receipt,
    display_name: manifest.display_name,
    message: providerResult.text,
    cited_sources: hearthCtx.snippets.map((item) => item.id ?? 'hearthfire'),
    suggested_actions: [],
    memory_write_recommendation: false,
    runtime_verified: true,
  });
});

router.get('/flames/:flame_id/status', resolveFlame, async (req, res) => {
  const manifest = req.flame;
  const runtime = await inspectManifestRuntime(manifest);
  res.json({
    ...runtime,
    display_name: manifest.display_name,
    hearthfire_namespace: manifest.memory.hearthfire_namespace,
    retrieval_scope: manifest.memory.retrieval_scope,
    can_write_memory: manifest.memory.can_write_memory,
    requires_consent_for_write: manifest.memory.requires_consent_for_write,
    tools_allowed: manifest.tools.allowed,
    voice: manifest.voice ?? null,
  });
});

router.post('/flames/:flame_id/query-context', resolveFlame, async (req, res) => {
  const manifest = req.flame;
  const { query } = req.body || {};
  if (!query) return res.status(400).json({ error: 'query required' });
  const result = await queryHearthfire(
    manifest.memory.hearthfire_namespace,
    manifest.memory.retrieval_scope,
    query
  );
  res.json({ ...modelReceipt(manifest), ...result });
});

router.post('/flames/:flame_id/memory-proposal', resolveFlame, async (req, res) => {
  const manifest = req.flame;
  const { content, metadata = {} } = req.body || {};
  if (!content) return res.status(400).json({ error: 'content required' });

  if (manifest.memory.requires_consent_for_write) {
    const proposal = {
      flame_id: manifest.flame_id,
      model_profile_id: manifest.model_profile_id || null,
      proposed_content: content,
      proposed_metadata: metadata,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    await logMemoryProposal(proposal);
    return res.status(202).json({ status: 'pending', message: 'Consent required; proposal queued for review.', proposal });
  }

  await logMemoryProposal({
    flame_id: manifest.flame_id,
    model_profile_id: manifest.model_profile_id || null,
    proposed_content: content,
    proposed_metadata: metadata,
    status: 'approved_routine',
  });
  res.json({ status: 'written', ...modelReceipt(manifest) });
});

module.exports = router;
