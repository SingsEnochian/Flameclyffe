import { Router } from 'express';
import OpenAI from 'openai';

export const veeRouter = Router();

const VEE_MODEL = 'gpt-4o';

function getClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not set');
  return new OpenAI({ apiKey: key });
}

veeRouter.post('/chat', async (req, res) => {
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

  const messages = [];
  if (context && typeof context === 'string' && context.trim()) {
    messages.push({ role: 'system', content: context.trim() });
  }
  messages.push({ role: 'user', content: message.trim() });

  let completion;
  try {
    completion = await client.chat.completions.create({ model: VEE_MODEL, messages });
  } catch (err) {
    return res.status(502).json({ ok: false, error: `Vee (OpenAI) error: ${err.message}` });
  }

  const reply = completion.choices[0]?.message?.content ?? '';
  return res.json({
    ok: true,
    speaker,
    model: VEE_MODEL,
    reply,
    ledger: { kind: 'vee_chat', actor: speaker, state: 'completed', risk: 'low' },
  });
});
