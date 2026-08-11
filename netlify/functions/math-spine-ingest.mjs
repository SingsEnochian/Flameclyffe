import { timingSafeEqual } from 'node:crypto';

import {
  createMathSpinePacket,
  replayMathSpinePacket,
} from '../../apps/starwell/src/math-spine/math-spine-packet.js';

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  },
  body: JSON.stringify(body),
});

function authorized(header, expected) {
  if (!expected || typeof header !== 'string' || !header.startsWith('Bearer ')) return false;
  const actual = Buffer.from(header.slice(7));
  const wanted = Buffer.from(expected);
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}

function rowFromPacket(packet) {
  return {
    packet_id: packet.packet_id,
    world_id: packet.world_id,
    schema_version: packet.schema_version,
    spine_version: packet.spine_version,
    engine_version: packet.engine_version,
    source_premaq_id: packet.source.premaq_id,
    source_sequence: packet.source.premaq_sequence,
    source_fingerprint: packet.source_fingerprint,
    packet_fingerprint: packet.packet_fingerprint,
    observed_at: packet.source.observed_at,
    status: 'accepted',
    payload: packet,
    provenance: {
      source: 'math-spine-ingest',
      refs: packet.source.provenance_refs,
      replay_verified: true,
    },
  };
}

export function createHandler({ env = process.env, fetchImpl = fetch } = {}) {
  return async function handler(event) {
    if (event.httpMethod === 'OPTIONS') return json(204, {});
    if (event.httpMethod !== 'POST') return json(405, { error: 'POST required.' });
    if (!authorized(event.headers?.authorization || event.headers?.Authorization, env.MATH_SPINE_INGEST_TOKEN)) {
      return json(401, { error: 'Valid Math Spine bearer token required.' });
    }
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return json(503, { error: 'Math Spine persistence is not configured.' });
    }

    let input;
    try {
      input = JSON.parse(event.body || '{}');
    } catch {
      return json(400, { error: 'Invalid JSON body.' });
    }

    try {
      const packet = await createMathSpinePacket(input);
      const replay = await replayMathSpinePacket(packet);
      if (!replay.matched) return json(422, { error: 'Deterministic replay failed.' });

      const response = await fetchImpl(`${env.SUPABASE_URL}/rest/v1/math_spine_packets?on_conflict=packet_id`, {
        method: 'POST',
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'content-type': 'application/json',
          prefer: 'resolution=ignore-duplicates,return=representation',
        },
        body: JSON.stringify(rowFromPacket(packet)),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) return json(502, { error: 'Math Spine ledger rejected the packet.', detail: data });

      return json(202, {
        accepted: true,
        duplicate: Array.isArray(data) && data.length === 0,
        packet_id: packet.packet_id,
        packet_fingerprint: packet.packet_fingerprint,
        replay_fingerprint: replay.replay_fingerprint,
      });
    } catch (error) {
      return json(422, { error: error.message || 'Math Spine compilation failed.' });
    }
  };
}

export const handler = createHandler();
