'use strict';

const express = require('express');
const {
  DEFAULT_MODEL,
  PLAN_SCHEMA,
  STATUS_SCHEMA,
  RESPONSE_SCHEMA,
  ALLOWED_ACTIONS,
  SYSTEM_PROMPT,
} = require('./contract');

const router = express.Router();

function config() {
  return {
    model: process.env.MODEL_ARCSWEEP_CARETAKER || DEFAULT_MODEL,
    endpoint: String(process.env.OLLAMA_URL_CARETAKER || process.env.OLLAMA_ENDPOINT || 'http://127.0.0.1:11434').replace(/\/$/, ''),
  };
}

async function status() {
  const { model, endpoint } = config();
  try {
    const response = await fetch(`${endpoint}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`Ollama ${response.status}`);
    const body = await response.json();
    const installed = (body.models || []).flatMap((item) => [item.name, item.model]).filter(Boolean);
    return {
      model,
      runtime_reachable: true,
      model_available: installed.includes(model),
      installed_count: installed.length,
      missing: installed.includes(model) ? [] : [`OLLAMA_MODEL:${model}`],
      runtime_error: null,
    };
  } catch (error) {
    return {
      model,
      runtime_reachable: false,
      model_available: false,
      installed_count: null,
      missing: ['OLLAMA_REACHABLE'],
      runtime_error: error?.message || String(error),
    };
  }
}

async function invoke(message) {
  const { model, endpoint } = config();
  const response = await fetch(`${endpoint}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      format: 'json',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message },
      ],
      options: { temperature: 0.35 },
    }),
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Caretaker Ollama ${response.status}${detail ? `: ${detail.slice(0, 240)}` : ''}`);
  }
  const body = await response.json();
  return { model, message: String(body.message?.content || '').trim() };
}

router.get('/house/caretaker/status', async (_req, res) => {
  const state = await status();
  res.json({
    schema: STATUS_SCHEMA,
    role: 'house-intelligence',
    provider: 'ollama',
    source_model: 'DavidAU/Gemma-The-Writer-Mighty-Sword-9B-GGUF',
    action_schema: PLAN_SCHEMA,
    allowed_actions: [...ALLOWED_ACTIONS],
    ...state,
  });
});

router.post('/house/caretaker/chat', async (req, res) => {
  const message = String(req.body?.message || '').trim();
  if (!message) return res.status(400).json({ error: 'message required' });
  if (message.length > 24000) return res.status(413).json({ error: 'Caretaker request is too large.' });
  try {
    const started = Date.now();
    const result = await invoke(message);
    return res.json({
      schema: RESPONSE_SCHEMA,
      role: 'house-intelligence',
      provider: 'ollama',
      model: result.model,
      action_schema: PLAN_SCHEMA,
      message: result.message,
      latency_ms: Date.now() - started,
      runtime_braid: null,
    });
  } catch (error) {
    const { model } = config();
    return res.status(502).json({
      schema: RESPONSE_SCHEMA,
      role: 'house-intelligence',
      provider: 'ollama',
      model,
      error: error?.message || String(error),
    });
  }
});

module.exports = router;
