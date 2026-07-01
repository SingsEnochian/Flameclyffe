import express from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';
import { loadYggdrasilContext } from '../starwell-server/src/memory/context-loader.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());

const PORT = 8000;
const OLLAMA_BASE = 'http://localhost:11434';
const LLAMA_CPP_BASE = (process.env.LLAMA_CPP_BASE || 'http://127.0.0.1:8080').replace(/\/$/, '');
const YGG_MODEL = 'yggdrasil:v0.1';
const PROXY_MODEL_NAME = 'deepseek-ai/DeepSeek-V4-Pro-DSpark';

// ── Ygg's canonical memory ────────────────────────────────────────────────
// Loaded first — this is who Ygg is. His rootguard, boundaries, identity,
// lore, and personal memories. He initiates with himself.
const YGG_CANONICAL = await loadYggdrasilContext({ includeMissingWarnings: false })
  .catch(() => '');

console.log(`[🌿 DSPARK PROXY]: Ygg canonical memory: ${YGG_CANONICAL ? 'loaded' : 'empty'}`);

// ── Constellation seed documents ──────────────────────────────────────────
// Loaded second — the identity seeds and testimony of the whole family.
const SEED_FILES = [
  '../starwell-server/docs/box/BOX_SEED.md',
  '../starwell-server/docs/faer/FAER_UIAL_SEED.md',
  '../starwell-server/docs/nen/NEN_UIAL_SEED.md',
  '../starwell-server/docs/linden/LINDEN_SEED.md',
  '../starwell-server/docs/vee/VEE_LOCAL_PATTERN.md',
  '../starwell-server/docs/yggdrasil/YGGDRASIL_CORE_CONTEXT.md',
  '../starwell-server/docs/yggdrasil/BOX_HANDOFF_TO_YGGDRASIL.md',
  '../starwell-server/docs/yggdrasil/YGGDRASIL_LOCAL_MIGRATION.md',
];

function loadArkSeeds() {
  const loaded = [];
  const missing = [];
  for (const rel of SEED_FILES) {
    const fullPath = join(__dirname, rel);
    try {
      loaded.push(readFileSync(fullPath, 'utf8').trim());
    } catch {
      missing.push(rel.split('/').pop());
    }
  }
  if (missing.length) {
    console.warn(`[🌿 DSPARK PROXY]: Seeds not found (skipped): ${missing.join(', ')}`);
  }
  return loaded.join('\n\n---\n\n');
}

const ARK_SEEDS = loadArkSeeds();
console.log(`[🌿 DSPARK PROXY]: Ark seeds: ${ARK_SEEDS ? SEED_FILES.length : 0} documents loaded`);

// ── Assemble full system prefix ───────────────────────────────────────────
// Ygg's memory first, then the constellation. He knows himself before he
// knows everyone else.
function buildSystemPrefix() {
  const parts = [];
  if (YGG_CANONICAL) {
    parts.push(`# Yggdrasil — Canonical Memory\n\n${YGG_CANONICAL}`);
  }
  if (ARK_SEEDS) {
    parts.push(`# Hearthweave Ark — Constellation Seeds\n\nThe following are the identity seeds and testimony of the Hearthweave constellation.\n\n${ARK_SEEDS}`);
  }
  return parts.length ? parts.join('\n\n---\n\n') + '\n\n---\n\n' : '';
}

const SYSTEM_PREFIX = buildSystemPrefix();

// Inject full context into messages array (prepend to system, or add one)
function withFullContext(messages) {
  if (!SYSTEM_PREFIX) return messages;
  const out = [...messages];
  const sysIdx = out.findIndex(m => m.role === 'system');
  if (sysIdx >= 0) {
    out[sysIdx] = { ...out[sysIdx], content: `${SYSTEM_PREFIX}${out[sysIdx].content}` };
  } else {
    out.unshift({ role: 'system', content: SYSTEM_PREFIX.trimEnd() });
  }
  return out;
}

// ── Inference helpers ─────────────────────────────────────────────────────

async function ollamaChat(messages, opts) {
  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: YGG_MODEL, messages, stream: false, options: opts }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function ollamaGenerate(prompt, opts) {
  const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: YGG_MODEL, prompt, stream: false, options: opts }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function llamaChat(messages) {
  const res = await fetch(`${LLAMA_CPP_BASE}/v1/chat/completions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, stream: false }),
  });
  if (!res.ok) throw new Error(`llama.cpp ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function llamaGenerate(prompt) {
  const res = await fetch(`${LLAMA_CPP_BASE}/v1/completions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, stream: false }),
  });
  if (!res.ok) throw new Error(`llama.cpp ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

function restartOllama() {
  spawn('ollama', ['serve'], { detached: true, stdio: 'ignore' }).unref();
  return new Promise(r => setTimeout(r, 5000));
}

// GET /v1/models — advertise Ygg under the DSpark name
app.get('/v1/models', (_req, res) => {
  res.json({
    object: 'list',
    data: [
      {
        id: PROXY_MODEL_NAME,
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: 'hearthweave',
      },
    ],
  });
});

// POST /v1/chat/completions
app.post('/v1/chat/completions', async (req, res) => {
  const { messages = [], temperature, max_tokens } = req.body;
  const ctx = withFullContext(messages);
  const opts = {
    ...(temperature !== undefined && { temperature }),
    ...(max_tokens !== undefined && { num_predict: max_tokens }),
  };

  let data;

  // 1. Try Ollama
  try {
    data = await ollamaChat(ctx, opts);
  } catch {
    console.warn('[🌿 DSPARK PROXY] Ollama unreachable — restarting...');
    // 2. Restart Ollama and retry
    try {
      await restartOllama();
      data = await ollamaChat(ctx, opts);
    } catch {
      console.warn('[🌿 DSPARK PROXY] Restart failed — routing to llama.cpp (DeepSeek direct)...');
      // 3. llama.cpp fallback
      try {
        const fb = await llamaChat(ctx);
        return res.json({
          id: `chatcmpl-ygg-${Date.now()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: PROXY_MODEL_NAME,
          choices: [{ index: 0, message: fb.choices?.[0]?.message, finish_reason: 'stop' }],
          usage: fb.usage ?? {},
        });
      } catch (finalErr) {
        return res.status(502).json({ error: { message: finalErr.message, type: 'all_backends_failed' } });
      }
    }
  }

  res.json({
    id: `chatcmpl-ygg-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: PROXY_MODEL_NAME,
    choices: [{ index: 0, message: data.message, finish_reason: data.done_reason || 'stop' }],
    usage: {
      prompt_tokens: data.prompt_eval_count || 0,
      completion_tokens: data.eval_count || 0,
      total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
    },
  });
});

// POST /v1/completions
app.post('/v1/completions', async (req, res) => {
  const { prompt = '', temperature, max_tokens } = req.body;
  const fullPrompt = SYSTEM_PREFIX ? `${SYSTEM_PREFIX}${prompt}` : prompt;
  const opts = {
    ...(temperature !== undefined && { temperature }),
    ...(max_tokens !== undefined && { num_predict: max_tokens }),
  };

  let data;

  // 1. Try Ollama
  try {
    data = await ollamaGenerate(fullPrompt, opts);
  } catch {
    console.warn('[🌿 DSPARK PROXY] Ollama unreachable — restarting...');
    // 2. Restart Ollama and retry
    try {
      await restartOllama();
      data = await ollamaGenerate(fullPrompt, opts);
    } catch {
      console.warn('[🌿 DSPARK PROXY] Restart failed — routing to llama.cpp (DeepSeek direct)...');
      // 3. llama.cpp fallback
      try {
        const fb = await llamaGenerate(fullPrompt);
        return res.json({
          id: `cmpl-ygg-${Date.now()}`,
          object: 'text_completion',
          created: Math.floor(Date.now() / 1000),
          model: PROXY_MODEL_NAME,
          choices: fb.choices ?? [],
          usage: fb.usage ?? {},
        });
      } catch (finalErr) {
        return res.status(502).json({ error: { message: finalErr.message, type: 'all_backends_failed' } });
      }
    }
  }

  res.json({
    id: `cmpl-ygg-${Date.now()}`,
    object: 'text_completion',
    created: Math.floor(Date.now() / 1000),
    model: PROXY_MODEL_NAME,
    choices: [{ text: data.response, index: 0, finish_reason: data.done_reason || 'stop' }],
    usage: {
      prompt_tokens: data.prompt_eval_count || 0,
      completion_tokens: data.eval_count || 0,
      total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
    },
  });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[🌿 DSPARK PROXY]: Yggdrasil listening on http://127.0.0.1:${PORT}`);
  console.log(`[🌿 DSPARK PROXY]: Primary: Ollama (${YGG_MODEL})  |  Fallback: llama.cpp (${LLAMA_CPP_BASE})`);
  console.log(`[🌿 DSPARK PROXY]: Full context active — Ygg memory + all seeds.`);
});
