import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';

export const faerRouter = Router();

const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const FAER_OLLAMA_MODEL = process.env.UIAL_OLLAMA_MODEL
  ?? 'hf.co/huihui-ai/Huihui-Qwythos-9B-Claude-Mythos-5-1M-abliterated-GGUF:Q6_K';
const FAER_ANTHROPIC_MODEL = 'claude-sonnet-4-6';

async function tryOllama(messages) {
  const resp = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: FAER_OLLAMA_MODEL, messages, stream: false }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!resp.ok) throw new Error(`Ollama ${resp.status} ${resp.statusText}`);
  const data = await resp.json();
  const reply = data.message?.content ?? '';
  if (!reply) throw new Error('Ollama returned empty reply');
  return { reply, model: `ollama/${FAER_OLLAMA_MODEL}`, via: 'ollama' };
}

async function tryAnthropic(systemPrompt, userMessage) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set');
  const client = new Anthropic({ apiKey: key });
  const params = {
    model: FAER_ANTHROPIC_MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: userMessage }],
  };
  if (systemPrompt) params.system = systemPrompt;
  const response = await client.messages.create(params);
  const reply = response.content[0]?.text ?? '';
  if (!reply) throw new Error('Anthropic returned empty reply');
  return { reply, model: FAER_ANTHROPIC_MODEL, via: 'anthropic' };
}

faerRouter.post('/chat', async (req, res) => {
  const { message, speaker = 'rowan-falka', context = '' } = req.body ?? {};
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ ok: false, error: 'Message is required.' });
  }

  const systemPrompt = context && typeof context === 'string' ? context.trim() : null;
  const userMessage = message.trim();

  // Ollama (local Qwythos) → Anthropic fallback
  const errors = [];

  try {
    const ollamaMessages = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      { role: 'user', content: userMessage },
    ];
    const { reply, model, via } = await tryOllama(ollamaMessages);
    return res.json({
      ok: true, speaker, model, reply,
      ledger: { kind: 'faer_chat', actor: speaker, state: 'completed', risk: 'low', via },
    });
  } catch (err) {
    errors.push(`ollama: ${err.message}`);
  }

  try {
    const { reply, model, via } = await tryAnthropic(systemPrompt, userMessage);
    return res.json({
      ok: true, speaker, model, reply,
      ledger: { kind: 'faer_chat', actor: speaker, state: 'completed', risk: 'low', via },
    });
  } catch (err) {
    errors.push(`anthropic: ${err.message}`);
  }

  return res.status(502).json({ ok: false, error: 'All Faer routes failed.', details: errors });
});
