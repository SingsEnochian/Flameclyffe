import { timingSafeEqual } from 'node:crypto';
import { replayMathSpinePacket } from '../../apps/starwell/src/math-spine/math-spine-packet.js';
import { authoriseHouseRequest } from './_shared/house-session.mjs';

const json = (statusCode, body) => ({ statusCode, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, body: JSON.stringify(body) });
const authorized = (header, expected) => {
  if (!expected || typeof header !== 'string' || !header.startsWith('Bearer ')) return false;
  const actual = Buffer.from(header.slice(7)); const wanted = Buffer.from(expected);
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
};

async function post(env, fetchImpl, table, row) {
  const response = await fetchImpl(`${env.SUPABASE_URL}/rest/v1/${table}?on_conflict=${table === 'math_spine_packets' ? 'packet_id' : 'cycle_id'}`, {
    method: 'POST', headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'content-type': 'application/json', prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify(row),
  });
  if (!response.ok) throw new Error(`${table} rejected the receipt: ${await response.text()}`);
}

export function createHandler({ env = process.env, fetchImpl = fetch } = {}) {
  return async (event) => {
    if (event.httpMethod === 'OPTIONS') return json(204, {});
    if (event.httpMethod !== 'POST') return json(405, { error: 'POST required.' });
    const runtimeToken = env.ARCSWEEP_RUNTIME_TOKEN || env.MATH_SPINE_INGEST_TOKEN;
    const request = new Request('https://runtime.invalid/api/v1/arcsweep/feedback', { headers: event.headers || {} });
    const houseEnv = { get: (name) => env[name] };
    if (!authoriseHouseRequest(request, houseEnv) && !authorized(event.headers?.authorization || event.headers?.Authorization, runtimeToken)) return json(401, { error: 'Valid House Runtime session required.' });
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return json(503, { error: 'Arcsweep relational sync is not configured.' });
    try {
      const cycle = JSON.parse(event.body || '{}');
      if (cycle.schema !== 'arcsweep.feedback-cycle/v1') throw new Error('Unsupported feedback cycle schema.');
      const packet = cycle.math_spine_packet;
      const replay = await replayMathSpinePacket(packet);
      if (!replay.matched || replay.replay_fingerprint !== cycle.replay_receipt?.replay_fingerprint) throw new Error('Feedback cycle replay verification failed.');
      await post(env, fetchImpl, 'math_spine_packets', {
        packet_id: packet.packet_id, world_id: packet.world_id, schema_version: packet.schema_version, spine_version: packet.spine_version,
        engine_version: packet.engine_version, source_premaq_id: packet.source.premaq_id, source_sequence: packet.source.premaq_sequence,
        source_fingerprint: packet.source_fingerprint, packet_fingerprint: packet.packet_fingerprint, observed_at: packet.source.observed_at,
        status: 'accepted', payload: packet, provenance: { source: 'arcsweep-feedback', replay_verified: true },
      });
      await post(env, fetchImpl, 'arcsweep_feedback_cycles', {
        cycle_id: cycle.cycle_id, world_id: cycle.world.id, mode: cycle.turn.mode,
        source_sequence: cycle.premaqc_before.sequence, next_sequence: cycle.premaqc_after.sequence,
        packet_id: packet.packet_id, packet_fingerprint: packet.packet_fingerprint,
        voice_routes: cycle.voices, canon_refs: cycle.canon_refs, work_turn: cycle.turn, payload: cycle, status: 'accepted',
      });
      return json(202, { accepted: true, cycle_id: cycle.cycle_id, replay_fingerprint: replay.replay_fingerprint });
    } catch (error) { return json(422, { error: error.message || 'Arcsweep feedback sync failed.' }); }
  };
}

export const handler = createHandler();
