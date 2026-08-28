import manifestsModule from '../../../apps/starwell-server/flames/manifests.js';
import { authoriseHouseRequest } from './house-session.mjs';
import { HOSTED_FLAME_FALLBACKS } from './hosted-flame-fallback.mjs';

const { FLAMES } = manifestsModule;
const HF_ROUTER = 'https://router.huggingface.co/v1';
export const FLAME_CHAT_STREAM_SCHEMA = 'hearthgate.flame-chat-stream/v1';

const text = (value) => String(value ?? '').trim();
const nowIso = () => new Date().toISOString();

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export function normaliseFlameConversationContext(value, limit = 24) {
  if (!Array.isArray(value)) return [];
  return value.slice(-limit).map((item) => ({
    speaker: text(item?.speaker || item?.author || 'House').slice(0, 120),
    text: text(item?.text || item?.content).slice(0, 6000),
  })).filter((item) => item.text);
}

export function providerMessages(manifest, message, context = []) {
  const conversation = normaliseFlameConversationContext(context);
  return [
    { role: 'system', content: manifest.system_prompt },
    ...conversation.map((item) => ({
      role: [manifest.flame_id, manifest.display_name].some((value) => text(value).toLowerCase() === item.speaker.toLowerCase()) ? 'assistant' : 'user',
      content: `[${item.speaker}]\n${item.text}`,
    })),
    { role: 'user', content: message },
  ];
}

function hostedCredential(env) {
  return text(env.get('HF_TOKEN') || env.get('HFTOKEN'));
}

function primaryConfigured(manifest, env) {
  if (manifest.platform.provider === 'ollama') return Boolean(env.get('HEARTHGATE_GATEWAY_URL') && env.get('HEARTHGATE_GATEWAY_TOKEN'));
  return Boolean(env.get(manifest.platform.api_key_env));
}

function planFor(manifest, env, { forceHostedFallback = false } = {}) {
  const fallbackModel = HOSTED_FLAME_FALLBACKS[manifest.flame_id] || null;
  if ((forceHostedFallback || !primaryConfigured(manifest, env)) && fallbackModel && hostedCredential(env)) {
    return {
      provider: 'huggingface-inference-providers',
      model: fallbackModel,
      mode: 'hosted-fallback',
      url: `${HF_ROUTER}/chat/completions`,
      headers: { authorization: `Bearer ${hostedCredential(env)}` },
      kind: 'openai-compatible',
    };
  }
  if (manifest.platform.provider === 'ollama') {
    const base = text(env.get('HEARTHGATE_GATEWAY_URL')).replace(/\/$/, '');
    return {
      provider: 'hearthgate-gateway',
      model: manifest.platform.model,
      mode: 'primary',
      url: `${base}/api/v1/flames/${manifest.flame_id}/chat`,
      headers: { authorization: `Bearer ${env.get('HEARTHGATE_GATEWAY_TOKEN')}` },
      kind: 'gateway',
    };
  }
  if (manifest.platform.provider === 'anthropic') {
    return {
      provider: 'anthropic',
      model: manifest.platform.model,
      mode: 'primary',
      url: 'https://api.anthropic.com/v1/messages',
      headers: {
        'x-api-key': env.get(manifest.platform.api_key_env),
        'anthropic-version': '2023-06-01',
      },
      kind: 'anthropic',
    };
  }
  const base = manifest.platform.base_url || (manifest.platform.provider === 'deepseek' ? 'https://api.deepseek.com' : 'https://api.openai.com');
  const suffix = manifest.platform.provider === 'openai' ? '/v1' : '';
  return {
    provider: manifest.platform.provider,
    model: manifest.platform.model,
    mode: 'primary',
    url: `${base}${suffix}/chat/completions`,
    headers: { authorization: `Bearer ${env.get(manifest.platform.api_key_env)}` },
    kind: 'openai-compatible',
  };
}

function upstreamBody(plan, manifest, message, context, body) {
  const messages = providerMessages(manifest, message, context);
  if (plan.kind === 'gateway') return { ...body, message, context: normaliseFlameConversationContext(context), stream: true };
  if (plan.kind === 'anthropic') {
    return {
      model: plan.model,
      max_tokens: 700,
      stream: true,
      system: manifest.system_prompt,
      messages: messages.filter((item) => item.role !== 'system'),
    };
  }
  return { model: plan.model, max_tokens: 700, stream: true, messages };
}

async function openProviderStream(plan, manifest, message, context, body, fetchImpl, signal = null) {
  const timeout = AbortSignal.timeout(plan.kind === 'gateway' ? 120_000 : 90_000);
  const combinedSignal = signal && typeof AbortSignal.any === 'function' ? AbortSignal.any([signal, timeout]) : signal || timeout;
  return fetchImpl(plan.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'text/event-stream, application/json', ...plan.headers },
    body: JSON.stringify(upstreamBody(plan, manifest, message, context, body)),
    signal: combinedSignal,
  });
}

function parseSseBlocks(buffer) {
  const blocks = buffer.split(/\r?\n\r?\n/);
  return { blocks: blocks.slice(0, -1), rest: blocks.at(-1) || '' };
}

function dataLines(block) {
  return block.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).replace(/^ /, '')).join('\n');
}

function openAiDelta(block) {
  const data = dataLines(block);
  if (!data || data === '[DONE]') return { done: data === '[DONE]', text: '', usage: null };
  try {
    const parsed = JSON.parse(data);
    return { done: false, text: String(parsed.choices?.[0]?.delta?.content || ''), usage: parsed.usage || null };
  } catch { return { done: false, text: '', usage: null }; }
}

function anthropicDelta(block) {
  const event = block.split(/\r?\n/).find((line) => line.startsWith('event:'))?.slice(6).trim() || '';
  const data = dataLines(block);
  if (event === 'message_stop') return { done: true, text: '', usage: null };
  if (!data) return { done: false, text: '', usage: null };
  try {
    const parsed = JSON.parse(data);
    return {
      done: false,
      text: event === 'content_block_delta' && parsed.delta?.type === 'text_delta' ? String(parsed.delta.text || '') : '',
      usage: parsed.usage || parsed.message?.usage || null,
    };
  } catch { return { done: false, text: '', usage: null }; }
}

function eventBlock(event, payload, id = null) {
  const lines = [];
  if (id != null) lines.push(`id: ${id}`);
  lines.push(`event: ${event}`);
  for (const line of JSON.stringify(payload).split('\n')) lines.push(`data: ${line}`);
  return `${lines.join('\n')}\n\n`;
}

function streamHeaders() {
  return {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-store, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  };
}

async function bufferedGatewayPayload(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || `Hearthgate gateway ${response.status}`), { status: response.status });
  return {
    message: String(data.message || ''),
    provider: data.provider || 'ollama',
    model: data.model || null,
    cited_sources: data.cited_sources || [],
    usage: data.usage || null,
  };
}

export function createFlameChatStreamHandler({ env, fetchImpl = fetch, clock = nowIso } = {}) {
  return async function handle(request, params = {}) {
    if (!authoriseHouseRequest(request, env)) return json(401, { error: 'Valid House Runtime session required.' });
    if (request.method !== 'POST' || params.action !== 'chat') return json(405, { error: 'POST chat required.' });
    const manifest = FLAMES[params.flame_id];
    if (!manifest) return json(404, { error: `Unknown Constellation voice: ${params.flame_id}` });
    let body;
    try { body = await request.json(); } catch { return json(400, { error: 'Valid JSON body required.' }); }
    const message = text(body?.message);
    if (!message) return json(400, { error: 'message required.' });
    if (message.length > 24000) return json(413, { error: 'message exceeds 24,000 characters.' });
    const context = normaliseFlameConversationContext(body?.context);
    const encoder = new TextEncoder();
    const startedAt = Date.now();
    const requestId = text(body?.metadata?.request_id || body?.metadata?.commons_turn_id || body?.session_id || crypto.randomUUID());
    const upstreamController = new AbortController();
    const abortUpstream = () => {
      if (!upstreamController.signal.aborted) upstreamController.abort(request.signal?.reason || new DOMException('Client stream closed.', 'AbortError'));
    };
    if (request.signal?.aborted) abortUpstream();
    else request.signal?.addEventListener?.('abort', abortUpstream, { once: true });

    const readable = new ReadableStream({
      async start(controller) {
        let sequence = 0;
        let completeText = '';
        let usage = null;
        let firstTokenMs = null;
        let closed = false;
        let plan = planFor(manifest, env);
        const emit = (event, payload) => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(eventBlock(event, {
              schema: FLAME_CHAT_STREAM_SCHEMA,
              request_id: requestId,
              flame_id: manifest.flame_id,
              display_name: manifest.display_name,
              ...payload,
            }, ++sequence)));
          } catch {
            closed = true;
            abortUpstream();
          }
        };
        const close = () => {
          if (closed) return;
          closed = true;
          try { controller.close(); } catch {}
        };
        const startPlan = () => emit('started', {
          provider: plan.provider,
          model: plan.model,
          execution_mode: plan.mode,
          started_at: clock(),
          runtime_world_context_id: body?.metadata?.world_context?.context_id || null,
        });
        try {
          let response;
          try {
            response = await openProviderStream(plan, manifest, message, context, body, fetchImpl, upstreamController.signal);
            if (!response.ok) throw Object.assign(new Error(`${plan.provider} ${response.status}: ${await response.text().catch(() => '')}`), { status: response.status });
          } catch (primaryError) {
            if (upstreamController.signal.aborted) throw primaryError;
            const fallbackPlan = plan.mode === 'primary' ? planFor(manifest, env, { forceHostedFallback: true }) : null;
            if (!fallbackPlan || fallbackPlan.mode !== 'hosted-fallback' || fallbackPlan.model === plan.model && fallbackPlan.provider === plan.provider) throw primaryError;
            plan = fallbackPlan;
            response = await openProviderStream(plan, manifest, message, context, body, fetchImpl, upstreamController.signal);
            if (!response.ok) throw Object.assign(new Error(`${plan.provider} ${response.status}: ${await response.text().catch(() => '')}`), { status: response.status });
          }
          startPlan();
          const contentType = response.headers.get('content-type') || '';
          if (!contentType.includes('text/event-stream') || !response.body) {
            const buffered = plan.kind === 'gateway' ? await bufferedGatewayPayload(response) : await response.json().then((data) => ({
              message: data.choices?.[0]?.message?.content || data.content?.find?.((item) => item.type === 'text')?.text || data.message || '',
              provider: plan.provider,
              model: plan.model,
              cited_sources: data.cited_sources || [],
              usage: data.usage || null,
            }));
            completeText = buffered.message;
            usage = buffered.usage;
            if (completeText) {
              firstTokenMs = Date.now() - startedAt;
              emit('delta', { text: completeText, index: 0, buffered_compatibility: true, first_token_ms: firstTokenMs });
            }
            emit('completed', {
              message: completeText,
              provider: buffered.provider || plan.provider,
              model: buffered.model || plan.model,
              cited_sources: buffered.cited_sources || [],
              usage,
              latency_ms: Date.now() - startedAt,
              first_token_ms: firstTokenMs,
              completed_at: clock(),
              buffered_compatibility: true,
            });
            close();
            return;
          }
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let deltaIndex = 0;
          let done = false;
          while (!done && !upstreamController.signal.aborted) {
            const next = await reader.read();
            buffer += decoder.decode(next.value || new Uint8Array(), { stream: !next.done });
            const parsed = parseSseBlocks(buffer);
            buffer = parsed.rest;
            for (const block of parsed.blocks) {
              const delta = plan.kind === 'anthropic' ? anthropicDelta(block) : openAiDelta(block);
              if (delta.usage) usage = delta.usage;
              if (delta.text) {
                if (firstTokenMs == null) firstTokenMs = Date.now() - startedAt;
                completeText += delta.text;
                emit('delta', { text: delta.text, index: deltaIndex++, buffered_compatibility: false, first_token_ms: firstTokenMs });
              }
              if (delta.done) { done = true; break; }
            }
            if (next.done) break;
          }
          if (upstreamController.signal.aborted) throw upstreamController.signal.reason || new DOMException('Client stream closed.', 'AbortError');
          emit('completed', {
            message: completeText,
            provider: plan.provider,
            model: plan.model,
            cited_sources: [],
            usage,
            latency_ms: Date.now() - startedAt,
            first_token_ms: firstTokenMs,
            completed_at: clock(),
            buffered_compatibility: false,
          });
          close();
        } catch (error) {
          if (!closed && !upstreamController.signal.aborted) {
            emit('error', {
              provider: plan.provider,
              model: plan.model,
              error: error?.message || 'Flame stream failed.',
              latency_ms: Date.now() - startedAt,
              first_token_ms: firstTokenMs,
            });
          }
          close();
        }
      },
      cancel(reason) {
        if (!upstreamController.signal.aborted) upstreamController.abort(reason || new DOMException('Client cancelled stream.', 'AbortError'));
      },
    });
    return new Response(readable, { status: 200, headers: streamHeaders() });
  };
}
