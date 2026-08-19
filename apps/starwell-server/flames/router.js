'use strict';

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { FLAMES } = require('./manifests');
const { getModelCandidate, listModelCandidates } = require('./model-candidates');

const router = express.Router();

// ── Provider adapters ────────────────────────────────────────────────────────

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
  return res.content[0]?.text ?? '';
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
  return data.choices?.[0]?.message?.content ?? '';
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
  return data.choices?.[0]?.message?.content ?? '';
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
  return data.message?.content ?? '';
}

async function callOpenAICompatibleCandidate(candidate, systemPrompt, userMessage, requestedEffort) {
  const runtime = candidate.runtime || {};
  const key = process.env[runtime.api_key_env];
  if (!key) throw new Error(`Env var ${runtime.api_key_env} not set`);

  const baseUrl = process.env[runtime.base_url_env];
  if (!baseUrl) throw new Error(`Env var ${runtime.base_url_env} not set`);

  const reasoningEffort = requestedEffort || process.env[runtime.reasoning_effort_env] || runtime.default_reasoning_effort;
  const body = {
    model: candidate.model_id,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    max_tokens: runtime.max_tokens || 1200,
  };

  if (candidate.capabilities.reasoning_effort && reasoningEffort) {
    body.reasoning_effort = reasoningEffort;
  }

  const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`OpenAI-compatible candidate ${res.status}${detail ? `: ${detail.slice(0, 240)}` : ''}`);
  }

  const data = await res.json();
  return {
    message: data.choices?.[0]?.message?.content ?? '',
    reasoning_effort: reasoningEffort ?? null,
    usage: data.usage ?? null,
  };
}

async function dispatchToProvider(manifest, systemPrompt, userMessage) {
  switch (manifest.platform.provider) {
    case 'anthropic': return callAnthropic(manifest, systemPrompt, userMessage);
    case 'deepseek':  return callDeepSeek(manifest, systemPrompt, userMessage);
    case 'openai':    return callOpenAI(manifest, systemPrompt, userMessage);
    case 'ollama':    return callOllama(manifest, systemPrompt, userMessage);
    default: throw new Error(`Provider "${manifest.platform.provider}" not implemented`);
  }
}

// ── Hearthfire / HydraDB ────────────────────────────────────────────────────

const HYDRADB_BASE  = 'https://api.hydradb.com';
const HYDRADB_DB    = 'default-tenant';

async function queryHearthfire(namespace, scope, query) {
  const key = process.env.HYDRADB_API_KEY;
  if (!key) {
    console.warn('[hearthfire] HYDRADB_API_KEY not set');
    return { snippets: [], source: 'hearthfire-no-key' };
  }
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
    const snippets = chunks.slice(0, 6).map(c => ({
      id: c.id ?? c.chunk_id ?? 'unknown',
      text: c.text ?? c.content ?? '',
      score: c.score ?? null,
    }));
    console.log(`[hearthfire] ${snippets.length} chunks for namespace:${namespace}`);
    return { snippets, source: 'hydradb' };
  } catch (err) {
    console.warn('[hearthfire] query failed:', err.message);
    return { snippets: [], source: 'hearthfire-error' };
  }
}

async function ingestToHearthfire(texts, namespace) {
  const key = process.env.HYDRADB_API_KEY;
  if (!key) return { ok: false, error: 'no key' };
  try {
    const memories = JSON.stringify(texts.map(t => ({ text: t, metadata: { namespace } })));
    const form = new FormData();
    form.append('type', 'memory');
    form.append('database', HYDRADB_DB);
    form.append('memories', memories);
    const res = await fetch(`${HYDRADB_BASE}/context/ingest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'API-Version': '2' },
      body: form,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HydraDB ingest ${res.status}`);
    const data = await res.json();
    return { ok: true, count: data.data?.success_count ?? 0, ids: data.data?.results?.map(r => r.id) ?? [] };
  } catch (err) {
    console.warn('[hearthfire] ingest failed:', err.message);
    return { ok: false, error: err.message };
  }
}

// ── Supabase logging ─────────────────────────────────────────────────────────

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
  } catch (err) {
    console.warn(`[supabase] insert ${table} failed:`, err.message);
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

// ── Middleware: resolve flame ────────────────────────────────────────────────

function resolveFlame(req, res, next) {
  const manifest = FLAMES[req.params.flame_id];
  if (!manifest) return res.status(404).json({ error: `Unknown flame: ${req.params.flame_id}` });
  req.flame = manifest;
  next();
}

// ── POST /api/v1/flames/:flame_id/chat ──────────────────────────────────────

router.post('/flames/:flame_id/chat', resolveFlame, async (req, res) => {
  const manifest = req.flame;
  const { message, session_id, context = [] } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });

  const hearthCtx = await queryHearthfire(
    manifest.memory.hearthfire_namespace,
    manifest.memory.retrieval_scope,
    message
  );

  const contextBlock = context.length
    ? `Recent conversation:\n${context.map(m => `${m.speaker}: ${m.text}`).join('\n')}\n\n`
    : '';
  const hearthBlock = hearthCtx.snippets.length
    ? `Hearthfire context:\n${hearthCtx.snippets.map(s => s.text).join('\n')}\n\n`
    : '';
  const userMessage = `${hearthBlock}${contextBlock}${message}`;

  let reply, error;
  try {
    reply = await dispatchToProvider(manifest, manifest.system_prompt, userMessage);
  } catch (err) {
    error = err.message;
  }

  await logRouteInvocation({
    flame_id: manifest.flame_id,
    provider: manifest.platform.provider,
    model: manifest.platform.model,
    session_id: session_id ?? null,
    message_hash: Buffer.from(message).toString('base64').slice(0, 16),
    retrieved_source_ids: hearthCtx.snippets.map(s => s.id ?? 'unknown'),
    response_mode: error ? 'error' : 'success',
    memory_write_recommendation: false,
  });

  if (error) return res.status(502).json({ flame_id: manifest.flame_id, error });

  res.json({
    flame_id: manifest.flame_id,
    display_name: manifest.display_name,
    provider: manifest.platform.provider,
    model: manifest.platform.model,
    message: reply,
    cited_sources: hearthCtx.snippets.map(s => s.id ?? 'hearthfire'),
    suggested_actions: [],
    memory_write_recommendation: false,
  });
});

// ── Bifröst model audition routes ────────────────────────────────────────────

router.get('/model-candidates', (req, res) => {
  res.json({ candidates: listModelCandidates() });
});

router.post('/flames/:flame_id/audition/:candidate_id', resolveFlame, async (req, res) => {
  const manifest = req.flame;
  const candidate = getModelCandidate(req.params.candidate_id);
  const { message, session_id, context = [], reasoning_effort } = req.body;

  if (!candidate) return res.status(404).json({ error: `Unknown model candidate: ${req.params.candidate_id}` });
  if (!candidate.deployment?.audition_route) return res.status(409).json({ error: 'Candidate audition route is not armed' });
  if (!candidate.candidate_for.includes(manifest.flame_id)) {
    return res.status(403).json({ error: `${candidate.candidate_id} is not registered for ${manifest.flame_id}` });
  }
  if (!message) return res.status(400).json({ error: 'message required' });

  const hearthCtx = await queryHearthfire(
    manifest.memory.hearthfire_namespace,
    manifest.memory.retrieval_scope,
    message
  );

  const contextBlock = context.length
    ? `Recent conversation:\n${context.map(m => `${m.speaker}: ${m.text}`).join('\n')}\n\n`
    : '';
  const hearthBlock = hearthCtx.snippets.length
    ? `Hearthfire context:\n${hearthCtx.snippets.map(s => s.text).join('\n')}\n\n`
    : '';
  const userMessage = `${hearthBlock}${contextBlock}${message}`;

  let result, error;
  try {
    if (candidate.runtime?.provider !== 'openai-compatible') {
      throw new Error(`Candidate provider "${candidate.runtime?.provider}" not implemented`);
    }
    result = await callOpenAICompatibleCandidate(candidate, manifest.system_prompt, userMessage, reasoning_effort);
  } catch (err) {
    error = err.message;
  }

  await logRouteInvocation({
    flame_id: manifest.flame_id,
    provider: candidate.runtime?.provider || 'candidate',
    model: candidate.model_id,
    session_id: session_id ?? null,
    message_hash: Buffer.from(message).toString('base64').slice(0, 16),
    retrieved_source_ids: hearthCtx.snippets.map(s => s.id ?? 'unknown'),
    response_mode: error ? 'audition_error' : 'audition_success',
    memory_write_recommendation: false,
  });

  if (error) {
    return res.status(502).json({
      flame_id: manifest.flame_id,
      candidate_id: candidate.candidate_id,
      model: candidate.model_id,
      audition: true,
      primary_route_unchanged: true,
      error,
    });
  }

  res.json({
    flame_id: manifest.flame_id,
    display_name: manifest.display_name,
    candidate_id: candidate.candidate_id,
    provider: candidate.runtime.provider,
    model: candidate.model_id,
    audition: true,
    primary_route_unchanged: true,
    reasoning_effort: result.reasoning_effort,
    message: result.message,
    usage: result.usage,
    cited_sources: hearthCtx.snippets.map(s => s.id ?? 'hearthfire'),
  });
});

// ── GET /api/v1/flames/:flame_id/status ─────────────────────────────────────

router.get('/flames/:flame_id/status', resolveFlame, async (req, res) => {
  const manifest = req.flame;
  const envVar = manifest.platform.api_key_env;
  const keyPresent = envVar ? !!process.env[envVar] : null;

  let modelAvailable = null;
  let runtimeReachable = null;
  let runtimeError = null;
  if (manifest.platform.provider === 'ollama') {
    const endpoint = manifest.platform.base_url || process.env.OLLAMA_ENDPOINT || 'http://127.0.0.1:11434';
    try {
      const response = await fetch(`${endpoint}/api/tags`, { signal: AbortSignal.timeout(4000) });
      if (!response.ok) throw new Error(`Ollama ${response.status}`);
      const data = await response.json();
      const installed = (data.models || []).flatMap((item) => [item.name, item.model]).filter(Boolean);
      runtimeReachable = true;
      modelAvailable = installed.includes(manifest.platform.model);
    } catch (error) {
      runtimeReachable = false;
      modelAvailable = false;
      runtimeError = error.message;
    }
  }

  res.json({
    flame_id: manifest.flame_id,
    display_name: manifest.display_name,
    provider: manifest.platform.provider,
    model: manifest.platform.model,
    base_url: manifest.platform.base_url ?? null,
    api_key_env: envVar,
    api_key_present: keyPresent,
    runtime_reachable: runtimeReachable,
    model_available: modelAvailable,
    runtime_error: runtimeError,
    hearthfire_namespace: manifest.memory.hearthfire_namespace,
    retrieval_scope: manifest.memory.retrieval_scope,
    can_write_memory: manifest.memory.can_write_memory,
    requires_consent_for_write: manifest.memory.requires_consent_for_write,
    tools_allowed: manifest.tools.allowed,
    voice: manifest.voice ?? null,
  });
});

// ── POST /api/v1/flames/:flame_id/query-context ──────────────────────────────

router.post('/flames/:flame_id/query-context', resolveFlame, async (req, res) => {
  const manifest = req.flame;
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'query required' });
  const result = await queryHearthfire(
    manifest.memory.hearthfire_namespace,
    manifest.memory.retrieval_scope,
    query
  );
  res.json({ flame_id: manifest.flame_id, ...result });
});

// ── POST /api/v1/flames/:flame_id/memory-proposal ────────────────────────────

router.post('/flames/:flame_id/memory-proposal', resolveFlame, async (req, res) => {
  const manifest = req.flame;
  const { content, metadata = {} } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });

  if (manifest.memory.requires_consent_for_write) {
    const proposal = {
      flame_id: manifest.flame_id,
      proposed_content: content,
      proposed_metadata: metadata,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    await logMemoryProposal(proposal);
    return res.status(202).json({ status: 'pending', message: 'Consent required — proposal queued for review.', proposal });
  }

  // Routine write (boxfire-class flames)
  await logMemoryProposal({ flame_id: manifest.flame_id, proposed_content: content, proposed_metadata: metadata, status: 'approved_routine' });
  res.json({ status: 'written', flame_id: manifest.flame_id });
});

module.exports = router;
