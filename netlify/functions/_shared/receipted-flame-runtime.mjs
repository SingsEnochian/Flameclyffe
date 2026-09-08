import contractsModule from '../../../apps/starwell-server/flames/contracts.js';
import { createFlameChatStreamHandler, FLAME_CHAT_STREAM_SCHEMA } from './flame-chat-stream-runtime.mjs';
import { receiptModelReplyAtServerBoundary } from './model-reply-runtime-receipt.mjs';

const { FLAME_CONTRACTS } = contractsModule;

function parseSseBlock(block) {
  if (!block || block.startsWith(':')) return null;
  const parsed = { event: 'message', id: null, data: '', payload: null };
  for (const line of block.split(/\r?\n/)) {
    const split = line.indexOf(':');
    const field = split < 0 ? line : line.slice(0, split);
    const value = split < 0 ? '' : line.slice(split + 1).replace(/^ /, '');
    if (field === 'event') parsed.event = value;
    if (field === 'id') parsed.id = value;
    if (field === 'data') parsed.data += `${value}\n`;
  }
  parsed.data = parsed.data.replace(/\n$/, '');
  try { parsed.payload = parsed.data ? JSON.parse(parsed.data) : null; } catch {}
  return parsed;
}

function eventBlock({ event = 'message', id = null, payload = null, data = '' } = {}) {
  const lines = [];
  if (id != null) lines.push(`id: ${id}`);
  if (event) lines.push(`event: ${event}`);
  const encoded = payload == null ? data : JSON.stringify(payload);
  for (const line of String(encoded || '').split('\n')) lines.push(`data: ${line}`);
  return `${lines.join('\n')}\n\n`;
}

export function createReceiptedFlameChatStreamHandler({ env, fetchImpl = fetch, clock } = {}) {
  const baseHandler = createFlameChatStreamHandler({ env, fetchImpl, clock });
  return async function handle(request, params = {}) {
    const bodyPromise = request.clone().json().catch(() => null);
    const response = await baseHandler(request, params);
    const body = await bodyPromise;
    const contract = FLAME_CONTRACTS[params.flame_id];
    const contentType = response.headers.get('content-type') || '';
    if (!body || !contract || !response.ok || !response.body || !contentType.includes('text/event-stream')) return response;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        let buffer = '';
        try {
          while (true) {
            const next = await reader.read();
            buffer += decoder.decode(next.value || new Uint8Array(), { stream: !next.done });
            const blocks = buffer.split(/\r?\n\r?\n/);
            buffer = blocks.pop() || '';
            for (const rawBlock of blocks) {
              const parsed = parseSseBlock(rawBlock);
              if (parsed?.event === 'completed' && parsed.payload?.schema === FLAME_CHAT_STREAM_SCHEMA) {
                const runtimeBraid = await receiptModelReplyAtServerBoundary({
                  contract,
                  body,
                  result: {
                    provider: parsed.payload.provider,
                    model: parsed.payload.model,
                    message: parsed.payload.message,
                  },
                  env,
                  fetchImpl,
                  route: contract.runtime.route,
                  occurredAt: parsed.payload.completed_at || new Date().toISOString(),
                });
                controller.enqueue(encoder.encode(eventBlock({
                  ...parsed,
                  payload: { ...parsed.payload, runtime_braid: runtimeBraid },
                })));
              } else {
                controller.enqueue(encoder.encode(`${rawBlock}\n\n`));
              }
            }
            if (next.done) break;
          }
          if (buffer) controller.enqueue(encoder.encode(buffer));
          controller.close();
        } catch (error) {
          try { controller.error(error); } catch {}
        }
      },
      cancel(reason) {
        void reader.cancel(reason).catch(() => {});
      },
    });
    return new Response(readable, { status: response.status, statusText: response.statusText, headers: response.headers });
  };
}

export async function receiptBufferedFlameResponse({ response, body, flameId, env, fetchImpl = fetch } = {}) {
  const contract = FLAME_CONTRACTS[flameId];
  if (!contract || !body || !response?.ok) return response;
  const payload = await response.clone().json().catch(() => null);
  if (!payload || !String(payload.message || '').trim() || !String(payload.provider || '').trim() || !String(payload.model || '').trim()) return response;
  if (payload.runtime_braid?.persisted === true) return response;
  const runtimeBraid = await receiptModelReplyAtServerBoundary({
    contract,
    body,
    result: payload,
    env,
    fetchImpl,
    route: contract.runtime.route,
    occurredAt: new Date().toISOString(),
  });
  const headers = new Headers(response.headers);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  return new Response(JSON.stringify({ ...payload, runtime_braid: runtimeBraid }), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
