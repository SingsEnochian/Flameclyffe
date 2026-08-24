import { createClient } from '@supabase/supabase-js';
import { createHouseBraidStreamHandler } from '../../../../netlify/functions/_shared/house-braid-stream-runtime.mjs';
import { vercelEnv as env } from '../../../_shared/vercel-env.mjs';

function createSubscriber() {
  return async ({ worldId, onEvent }) => {
    const client = createClient(env.get('SUPABASE_URL'), env.get('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      realtime: { params: { eventsPerSecond: 20 } },
    });
    const channelName = `house-runtime-braid-${crypto.randomUUID()}`;
    const filter = worldId
      ? { event: 'INSERT', schema: 'public', table: 'house_runtime_events', filter: `world_id=eq.${worldId}` }
      : { event: 'INSERT', schema: 'public', table: 'house_runtime_events' };
    const channel = client.channel(channelName).on('postgres_changes', filter, (payload) => onEvent(payload.new));
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Runtime Braid Realtime subscription timed out.')), 8_000);
      channel.subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout);
          resolve();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          clearTimeout(timeout);
          reject(error || new Error(`Runtime Braid Realtime ${status.toLowerCase()}.`));
        }
      });
    });
    return async () => { await client.removeChannel(channel); };
  };
}

const handle = createHouseBraidStreamHandler({ env, subscribe: createSubscriber() });

export const config = { maxDuration: 60 };
export default { fetch: handle };
