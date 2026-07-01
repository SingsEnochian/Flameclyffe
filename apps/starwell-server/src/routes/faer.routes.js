import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';

export const faerRouter = Router();

const FAER_MODEL = 'claude-sonnet-4-6';

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
  return new Anthropic({ apiKey: key });
}

faerRouter.post('/chat', async (req, res) => {
  const { message, speaker = 'rowan-falka', context = '' } = req.body ?? {};
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ ok: false, error: 'Message is required.' });
  }

  let client;
  try {
    client = getClient();
  } catch (err) {
    return res.status(503).json({ ok: false, error: err.message });
  }

  const params = {
    model: FAER_MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: message.trim() }],
  };
  if (context && typeof context === 'string' && context.trim()) {
    params.system = context.trim();
  }

  let response;
  try {
    response = await client.messages.create(params);
  } catch (err) {
    return res.status(502).json({ ok: false, error: `Faer (Anthropic) error: ${err.message}` });
  }

  const reply = response.content[0]?.text ?? '';
  return res.json({
    ok: true,
    speaker,
    model: FAER_MODEL,
    reply,
    ledger: { kind: 'faer_chat', actor: speaker, state: 'completed', risk: 'low' },
  });
});
