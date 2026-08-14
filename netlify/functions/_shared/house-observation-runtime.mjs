import { buildRuntimeObservationLiveRead } from '../../../apps/arcsweep/src/runtime-observation-snapshot.js';
import { authoriseHouseRequest } from './house-session.mjs';

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

function limitFrom(url) {
  const requested = Number(new URL(url).searchParams.get('limit')) || 100;
  return Math.max(1, Math.min(Math.trunc(requested), 200));
}

function worldFrom(url) {
  const value = new URL(url).searchParams.get('world_id');
  return value ? value.trim().slice(0, 240) : null;
}

async function readRows(fetchImpl, env, table, { worldId, limit, order = 'created_at.desc' }) {
  const params = new URLSearchParams({ select: '*', order, limit: String(limit) });
  if (worldId) params.set('world_id', `eq.${worldId}`);
  const response = await fetchImpl(`${env.get('SUPABASE_URL')}/rest/v1/${table}?${params}`, {
    headers: {
      apikey: env.get('SUPABASE_SERVICE_ROLE_KEY'),
      authorization: `Bearer ${env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      accept: 'application/json',
    },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`${table} live read failed: ${response.status} ${await response.text()}`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error(`${table} live read returned a non-array payload.`);
  return rows;
}

export function createHouseObservationRuntimeHandler({ env, fetchImpl = fetch, clock = () => new Date() } = {}) {
  return async function handle(request) {
    if (!authoriseHouseRequest(request, env)) return json(401, { error: 'Valid House Runtime session required.' });
    if (request.method !== 'GET') return json(405, { error: 'GET required.' });
    if (!env.get('SUPABASE_URL') || !env.get('SUPABASE_SERVICE_ROLE_KEY')) {
      return json(503, { error: 'House observation ledgers are not configured.' });
    }
    try {
      const worldId = worldFrom(request.url);
      const limit = limitFrom(request.url);
      const [cycles, reviews, deepTimeRecords] = await Promise.all([
        readRows(fetchImpl, env, 'arcsweep_feedback_cycles', { worldId, limit }),
        readRows(fetchImpl, env, 'arcsweep_feedback_reviews', { worldId, limit, order: 'reviewed_at.desc' }),
        readRows(fetchImpl, env, 'arcsweep_deep_time_records', { worldId, limit, order: 'observed_at.desc' }),
      ]);
      return json(200, buildRuntimeObservationLiveRead({
        cycles,
        reviews,
        deepTimeRecords,
        worldId,
        generatedAt: clock().toISOString(),
      }));
    } catch (error) {
      return json(502, { error: error.message || 'House observation live read failed.' });
    }
  };
}
