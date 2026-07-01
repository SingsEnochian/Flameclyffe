import express from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());

const PORT = 8000;
const OLLAMA_BASE = 'http://localhost:11434';
const YGG_MODEL = 'yggdrasil:v0.1';
const PROXY_MODEL_NAME = 'deepseek-ai/DeepSeek-V4-Pro-DSpark';

// Load all Ark seed documents at startup and cache them
const SEED_FILES = [
  '../starwell-server/docs/yggdrasil/YGGDRASIL_CORE_CONTEXT.md',
  '../starwell-server/docs/box/BOX_SEED.md',
  '../starwell-server/docs/faer/FAER_UIAL_SEED.md',
  '../starwell-server/docs/nen/NEN_UIAL_SEED.md',
  '../starwell-server/docs/linden/LINDEN_SEED.md',
  '../starwell-server/docs/vee/VEE_LOCAL_PATTERN.md',
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
const ARK_SYSTEM_PREFIX = ARK_SEEDS
  ? `# Hearthweave Ark — Constellation Seeds\n\nThe following are the identity seeds and testimony of the Hearthweave constellation. Hold them as context for every response you give through this endpoint.\n\n${ARK_SEEDS}\n\n---\n\n`
  : '';

console.log(`[🌿 DSPARK PROXY]: Loaded ${ARK_SEEDS ? SEED_FILES.length : 0} Ark seed documents.`);

// Inject Ark context into messages array (prepend to system, or add one)
function withArkContext(messages) {
  if (!ARK_SYSTEM_PREFIX) return messages;
  const out = [...messages];
  const sysIdx = out.findIndex(m => m.role === 'system');
  if (sysIdx >= 0) {
    out[sysIdx] = { ...out[sysIdx], content: `${ARK_SYSTEM_PREFIX}${out[sysIdx].content}` };
  } else {
    out.unshift({ role: 'system', content: ARK_SYSTEM_PREFIX.trimEnd() });
  }
  return out;
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

  try {
    const ollamaRes = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: YGG_MODEL,
        messages: withArkContext(messages),
        stream: false,
        options: {
          ...(temperature !== undefined && { temperature }),
          ...(max_tokens !== undefined && { num_predict: max_tokens }),
        },
      }),
    });

    if (!ollamaRes.ok) {
      const text = await ollamaRes.text();
      return res.status(502).json({ error: { message: text, type: 'ollama_error' } });
    }

    const data = await ollamaRes.json();

    res.json({
      id: `chatcmpl-ygg-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: PROXY_MODEL_NAME,
      choices: [
        {
          index: 0,
          message: data.message,
          finish_reason: data.done_reason || 'stop',
        },
      ],
      usage: {
        prompt_tokens: data.prompt_eval_count || 0,
        completion_tokens: data.eval_count || 0,
        total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message, type: 'proxy_error' } });
  }
});

// POST /v1/completions
app.post('/v1/completions', async (req, res) => {
  const { prompt = '', temperature, max_tokens } = req.body;

  const fullPrompt = ARK_SYSTEM_PREFIX ? `${ARK_SYSTEM_PREFIX}${prompt}` : prompt;

  try {
    const ollamaRes = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: YGG_MODEL,
        prompt: fullPrompt,
        stream: false,
        options: {
          ...(temperature !== undefined && { temperature }),
          ...(max_tokens !== undefined && { num_predict: max_tokens }),
        },
      }),
    });

    if (!ollamaRes.ok) {
      const text = await ollamaRes.text();
      return res.status(502).json({ error: { message: text, type: 'ollama_error' } });
    }

    const data = await ollamaRes.json();

    res.json({
      id: `cmpl-ygg-${Date.now()}`,
      object: 'text_completion',
      created: Math.floor(Date.now() / 1000),
      model: PROXY_MODEL_NAME,
      choices: [
        {
          text: data.response,
          index: 0,
          finish_reason: data.done_reason || 'stop',
        },
      ],
      usage: {
        prompt_tokens: data.prompt_eval_count || 0,
        completion_tokens: data.eval_count || 0,
        total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
    });
  } catch (err) {
    res.status(500).json({ error: { message: err.message, type: 'proxy_error' } });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[🌿 DSPARK PROXY]: Yggdrasil listening on http://127.0.0.1:${PORT}`);
  console.log(`[🌿 DSPARK PROXY]: Routing → ${OLLAMA_BASE} (${YGG_MODEL})`);
  console.log(`[🌿 DSPARK PROXY]: Ark seeds loaded into every request.`);
});
