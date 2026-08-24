import { hasSupabaseConfig, supabase } from '../lib/supabase.js';
import { validateMathSpinePacket } from './math-spine-packet.js';

export const MATH_SPINE_TABLE = 'math_spine_packets';

function rowToPacket(row) {
  const packet = validateMathSpinePacket(row.payload);
  if (packet.packet_fingerprint !== row.packet_fingerprint) {
    throw new Error('MATH_SPINE_LIVE: row fingerprint does not match its payload');
  }
  return packet;
}

export async function readLatestMathSpinePacket(worldId) {
  if (!hasSupabaseConfig || !supabase) throw new Error('Math Spine live connection is not configured.');
  let query = supabase
    .from(MATH_SPINE_TABLE)
    .select('packet_id, world_id, packet_fingerprint, source_sequence, payload, created_at')
    .eq('status', 'accepted')
    .order('source_sequence', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1);
  if (worldId) query = query.eq('world_id', worldId);
  const { data, error } = await query;
  if (error) throw error;
  return data?.[0] ? rowToPacket(data[0]) : null;
}

export async function subscribeMathSpine({ worldId, onPacket, onStatus = () => {} } = {}) {
  if (!hasSupabaseConfig || !supabase) {
    onStatus('offline');
    return () => {};
  }
  const filter = worldId ? `world_id=eq.${worldId}` : undefined;
  const channel = supabase
    .channel(`math-spine:${worldId || 'all'}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: MATH_SPINE_TABLE,
      ...(filter ? { filter } : {}),
    }, (change) => {
      try {
        if (change.new.status === 'accepted') onPacket(rowToPacket(change.new));
      } catch (error) {
        onStatus('invalid', error);
      }
    })
    .subscribe((status) => onStatus(status.toLowerCase()));
  return () => supabase.removeChannel(channel);
}

export async function loadAndSubscribeMathSpine(options = {}) {
  const latest = await readLatestMathSpinePacket(options.worldId);
  if (latest) options.onPacket?.(latest);
  return subscribeMathSpine(options);
}
