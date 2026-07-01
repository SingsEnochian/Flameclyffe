import express from 'express';

const app = express();
app.use(express.json());

const PORT = 8000;
const OLLAMA_BASE = 'http://localhost:11434';
const YGG_MODEL = 'yggdrasil:v0.1';
const PROXY_MODEL_NAME = 'deepseek-ai/DeepSeek-V4-Pro-DSpark';

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
  const { messages, temperature, max_tokens } = req.body;

  try {
    const ollamaRes = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: YGG_MODEL,
        messages,
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
  const { prompt, temperature, max_tokens } = req.body;

  try {
    const ollamaRes = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: YGG_MODEL,
        prompt,
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
});
