import { authoriseHouseRequest } from './house-session.mjs';

export const RUNTIME_BRAID_STREAM_SCHEMA = 'hearthgate.runtime-braid-stream/v1';
export const RUNTIME_BRAID_LIVE_EVENT_SCHEMA = 'hearthgate.runtime-braid-live-event/v1';

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

function streamWorld(url) {
  const value = new URL(url).searchParams.get('world_id');
  if (!value) return null;
  const worldId = value.trim().slice(0, 240);
  if (!/^[a-zA-Z0-9:_-]+$/.test(worldId)) throw new Error('Runtime Braid world_id contains unsupported characters.');
  return worldId;
}

function streamCursor(request) {
  const urlValue = new URL(request.url).searchParams.get('cursor');
  const headerValue = request.headers.get('last-event-id');
  const value = Number(urlValue || headerValue || 0);
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function restHeaders(env) {
  return {
    apikey: env.get('SUPABASE_SERVICE_ROLE_KEY'),
    authorization: `Bearer ${env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    accept: 'application/json',
  };
}

async function readBacklog(fetchImpl, env, { worldId, cursor }) {
  const params = new URLSearchParams({
    select: '*',
    event_sequence: `gt.${cursor}`,
    order: 'event_sequence.asc',
    limit: '200',
  });
  if (worldId) params.set('world_id', `eq.${worldId}`);
  const response = await fetchImpl(`${env.get('SUPABASE_URL')}/rest/v1/house_runtime_events?${params}`, {
    headers: restHeaders(env),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Runtime Braid cursor replay failed: ${response.status} ${await response.text()}`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('Runtime Braid cursor replay returned a non-array payload.');
  return rows;
}

function sse({ event, data, id = null, retry = null }) {
  const lines = [];
  if (id != null) lines.push(`id: ${id}`);
  if (event) lines.push(`event: ${event}`);
  if (retry != null) lines.push(`retry: ${retry}`);
  for (const line of JSON.stringify(data).split('\n')) lines.push(`data: ${line}`);
  return `${lines.join('\n')}\n\n`;
}

export function createHouseBraidStreamHandler({
  env,
  subscribe,
  fetchImpl = fetch,
  clock = () => new Date(),
  streamLifetimeMs = 50_000,
  heartbeatMs = 15_000,
  setTimeoutImpl = setTimeout,
  clearTimeoutImpl = clearTimeout,
  setIntervalImpl = setInterval,
  clearIntervalImpl = clearInterval,
} = {}) {
  return async function handle(request) {
    if (!authoriseHouseRequest(request, env)) return json(401, { error: 'Valid House Runtime session required.' });
    if (request.method !== 'GET') return json(405, { error: 'GET required.' });
    if (!env.get('SUPABASE_URL') || !env.get('SUPABASE_SERVICE_ROLE_KEY')) return json(503, { error: 'Runtime Braid stream is not configured.' });
    if (typeof subscribe !== 'function') return json(503, { error: 'Runtime Braid Realtime subscriber is unavailable.' });

    let worldId;
    let cursor;
    try {
      worldId = streamWorld(request.url);
      cursor = streamCursor(request);
    } catch (error) {
      return json(400, { error: error.message });
    }

    const encoder = new TextEncoder();
    let cleanup = async () => {};
    let heartbeat = null;
    let lifetime = null;
    let closed = false;
    let priming = true;
    const liveBuffer = [];
    const seen = new Set();

    const body = new ReadableStream({
      start(controller) {
        const enqueue = (value) => {
          if (!closed) controller.enqueue(encoder.encode(value));
        };
        const close = async () => {
          if (closed) return;
          closed = true;
          if (heartbeat) clearIntervalImpl(heartbeat);
          if (lifetime) clearTimeoutImpl(lifetime);
          try { await cleanup(); } catch {}
          try { controller.close(); } catch {}
        };
        const publish = (row) => {
          const sequence = Number(row?.event_sequence);
          if (!Number.isSafeInteger(sequence) || sequence <= cursor || seen.has(sequence)) return;
          if (worldId && row.world_id !== worldId) return;
          seen.add(sequence);
          cursor = Math.max(cursor, sequence);
          enqueue(sse({
            id: sequence,
            event: 'braid',
            data: {
              schema: RUNTIME_BRAID_LIVE_EVENT_SCHEMA,
              cursor: sequence,
              event: row,
            },
          }));
        };

        enqueue(sse({
          event: 'ready',
          retry: 1_500,
          data: {
            schema: RUNTIME_BRAID_STREAM_SCHEMA,
            connected_at: clock().toISOString(),
            world_id: worldId,
            cursor,
            private: true,
          },
        }));

        void (async () => {
          try {
            cleanup = await subscribe({
              worldId,
              onEvent: (row) => {
                if (priming) liveBuffer.push(row);
                else publish(row);
              },
            });
            const backlog = await readBacklog(fetchImpl, env, { worldId, cursor });
            for (const row of backlog) publish(row);
            priming = false;
            for (const row of liveBuffer.sort((left, right) => Number(left.event_sequence) - Number(right.event_sequence))) publish(row);
            liveBuffer.length = 0;
            heartbeat = setIntervalImpl(() => enqueue(`: heartbeat ${clock().toISOString()}\n\n`), heartbeatMs);
            lifetime = setTimeoutImpl(() => {
              enqueue(sse({ event: 'reconnect', data: { schema: RUNTIME_BRAID_STREAM_SCHEMA, cursor } }));
              void close();
            }, streamLifetimeMs);
          } catch (error) {
            enqueue(sse({ event: 'error', data: { schema: RUNTIME_BRAID_STREAM_SCHEMA, error: error.message || 'Runtime Braid stream failed.', cursor } }));
            await close();
          }
        })();
      },
      async cancel() {
        closed = true;
        if (heartbeat) clearIntervalImpl(heartbeat);
        if (lifetime) clearTimeoutImpl(lifetime);
        try { await cleanup(); } catch {}
      },
    });

    return new Response(body, {
      status: 200,
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-store, no-transform',
        connection: 'keep-alive',
        'x-accel-buffering': 'no',
      },
    });
  };
}
