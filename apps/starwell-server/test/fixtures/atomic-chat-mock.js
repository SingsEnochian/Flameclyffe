'use strict';

const http = require('node:http');

const host = '127.0.0.1';
const port = Number(process.env.ATOMIC_MOCK_PORT || 1337);
const model = process.env.ATOMIC_MOCK_MODEL || 'atomic-test-model';

function writeJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 512 * 1024) throw new Error('request too large');
    chunks.push(chunk);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/v1/models') {
      return writeJson(res, 200, {
        object: 'list',
        data: [{ id: model, object: 'model', owned_by: 'atomic-mock' }],
      });
    }

    if (req.method === 'POST' && req.url === '/v1/chat/completions') {
      const body = await readBody(req);
      if (body.model !== model) {
        return writeJson(res, 404, {
          error: { message: `model ${body.model || '<missing>'} is not loaded` },
        });
      }
      if (!Array.isArray(body.messages) || body.messages.length === 0) {
        return writeJson(res, 400, {
          error: { message: 'messages are required' },
        });
      }
      const last = body.messages.at(-1)?.content || '';
      return writeJson(res, 200, {
        id: 'chatcmpl-atomic-mock',
        object: 'chat.completion',
        model,
        choices: [{
          index: 0,
          finish_reason: 'stop',
          message: {
            role: 'assistant',
            content: `Atomic current complete: ${last}`,
          },
        }],
        usage: {
          prompt_tokens: 12,
          completion_tokens: 6,
          total_tokens: 18,
        },
      });
    }

    return writeJson(res, 404, { error: { message: 'not found' } });
  } catch (error) {
    return writeJson(res, 400, { error: { message: error.message } });
  }
});

server.listen(port, host, () => {
  console.log(`[atomic-mock] listening on http://${host}:${port}/v1`);
});

function shutdown() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 3000).unref();
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
