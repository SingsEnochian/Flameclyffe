'use strict';

const express = require('express');
const { AtomicChatError, createAtomicChatClient } = require('../providers/atomic-chat');

const MAX_MESSAGES = 64;
const MAX_MESSAGE_CHARS = 100000;

function sanitizeMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new AtomicChatError('messages must be a non-empty array.', {
      code: 'ATOMIC_CHAT_MESSAGES_REQUIRED',
    });
  }
  if (messages.length > MAX_MESSAGES) {
    throw new AtomicChatError(`messages may contain at most ${MAX_MESSAGES} entries.`, {
      code: 'ATOMIC_CHAT_MESSAGE_LIMIT',
    });
  }
  return messages.map((message, index) => {
    const role = String(message?.role || '').trim();
    const content = typeof message?.content === 'string' ? message.content : '';
    if (!role || !content) {
      throw new AtomicChatError(`message ${index} requires role and text content.`, {
        code: 'ATOMIC_CHAT_INVALID_MESSAGE',
      });
    }
    if (content.length > MAX_MESSAGE_CHARS) {
      throw new AtomicChatError(`message ${index} exceeds ${MAX_MESSAGE_CHARS} characters.`, {
        code: 'ATOMIC_CHAT_MESSAGE_TOO_LARGE',
      });
    }
    return { role, content };
  });
}

function statusForError(error) {
  if (error?.code?.includes('REQUIRED') || error?.code?.includes('INVALID') || error?.code?.includes('LIMIT')) {
    return 400;
  }
  if (error?.status && error.status >= 400 && error.status < 500) return 502;
  if (error?.code === 'ATOMIC_CHAT_TIMEOUT') return 504;
  return 503;
}

function publicError(error) {
  return {
    code: error?.code || 'ATOMIC_CHAT_ERROR',
    message: error?.message || 'Atomic Chat request failed.',
    upstreamStatus: error?.status || null,
  };
}

function registerAtomicEngineRoutes(app, options = {}) {
  const router = express.Router();
  const client = options.client || createAtomicChatClient(options);

  router.get('/status', async (_req, res) => {
    const status = await client.health();
    res.status(status.ok ? 200 : 503).json(status);
  });

  router.get('/models', async (_req, res) => {
    try {
      const models = await client.listModels();
      res.json({
        ok: true,
        provider: 'atomic-chat',
        baseUrl: client.baseUrl,
        modelCount: models.length,
        models,
      });
    } catch (error) {
      res.status(statusForError(error)).json({ ok: false, error: publicError(error) });
    }
  });

  router.post('/chat', async (req, res) => {
    try {
      const model = String(req.body?.model || '').trim();
      const messages = sanitizeMessages(req.body?.messages);
      const result = await client.chat({
        model,
        messages,
        maxTokens: req.body?.max_tokens ?? req.body?.maxTokens,
        temperature: req.body?.temperature,
        tools: req.body?.tools,
        toolChoice: req.body?.tool_choice ?? req.body?.toolChoice,
        timeoutMs: req.body?.timeout_ms ?? req.body?.timeoutMs,
      });
      res.json({ ok: true, engine: 'atomic-chat', ...result });
    } catch (error) {
      res.status(statusForError(error)).json({ ok: false, error: publicError(error) });
    }
  });

  app.use('/api/v1/engines/atomic', router);
  return { client, router };
}

module.exports = registerAtomicEngineRoutes;
module.exports.sanitizeMessages = sanitizeMessages;
