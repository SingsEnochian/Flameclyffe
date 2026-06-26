import { Router } from 'express';
import { loadYggdrasilContext } from '../memory/context-loader.js';

export const ollamaRouter = Router();

const OLLAMA_BASE = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
const YGGDRASIL_MODEL = 'yggdrasil:v0.1';

ollamaRouter.post('/chat', async (req, res) => {
  const { message, speaker = 'rowan-falka' } = req.body ?? {};

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ ok: false, error: 'Message is required.' });
  }

  const canonicalContext = await loadYggdrasilContext();

  let ollamaRes;
  try {
    ollamaRes = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: YGGDRASIL_MODEL,
        messages: [
          { role: 'system', content: canonicalContext },
          { role: 'user', content: message.trim() },
        ],
        stream: false,
      }),
    });
  } catch (err) {
    if (err.cause?.code === 'ECONNREFUSED' || err.cause?.code === 'ENOENT') {
      return res.status(503).json({ ok: false, error: 'Yggdrasil is not reachable. Make sure Ollama is running.' });
    }
    throw err;
  }

  if (!ollamaRes.ok) {
    const text = await ollamaRes.text();
    return res.status(502).json({ ok: false, error: `Ollama returned ${ollamaRes.status}: ${text.slice(0, 200)}` });
  }

  const data = await ollamaRes.json();
  const reply = data.message?.content ?? '';

  return res.json({
    ok: true,
    speaker,
    model: YGGDRASIL_MODEL,
    reply,
    ledger: { kind: 'yggdrasil_chat', actor: speaker, state: 'completed', risk: 'low' },
  });
});
