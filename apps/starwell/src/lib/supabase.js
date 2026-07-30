import { createClient } from '@supabase/supabase-js';

const fallbackUrl = 'https://rufrmjyusalnifpegllj.supabase.co';
const fallbackPublishableKey = 'sb_publishable_z69-aAbQvzFFDRk4SHDYrQ_FuqirkLD';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fallbackUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || fallbackPublishableKey;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;

let contractPromise;

export async function getLiveContract({ refresh = false } = {}) {
  if (!supabase) throw new Error('Observatory data connection is not configured.');
  if (!contractPromise || refresh) {
    contractPromise = supabase
      .from('observatory_live_contract')
      .select('*')
      .then(({ data, error }) => {
        if (error) throw error;
        return new Map(data.map((row) => [row.source_key, row]));
      });
  }
  return contractPromise;
}

function applyContract(query, contract) {
  for (const [column, value] of Object.entries(contract.active_filter || {})) {
    query = query.eq(column, value);
  }
  if (contract.default_order) {
    const [column, direction = 'asc'] = contract.default_order.split('.');
    query = query.order(column, { ascending: direction !== 'desc' });
  }
  return query;
}

export async function readLive(sourceKey, { select = '*', limit, filters = {} } = {}) {
  const contract = (await getLiveContract()).get(sourceKey);
  if (!contract) throw new Error(`Unknown Observatory source: ${sourceKey}`);

  let query = supabase.from(contract.table_name).select(select);
  query = applyContract(query, contract);
  for (const [column, value] of Object.entries(filters)) query = query.eq(column, value);
  if (Number.isInteger(limit)) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return { data, contract };
}

export async function watchLive(sourceKey, onChange, { event = '*', schema = 'public' } = {}) {
  const contract = (await getLiveContract()).get(sourceKey);
  if (!contract) throw new Error(`Unknown Observatory source: ${sourceKey}`);

  const channel = supabase
    .channel(`observatory:${sourceKey}`)
    .on('postgres_changes', { event, schema, table: contract.table_name }, onChange)
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export async function readAndWatchLive(sourceKey, onData, options = {}) {
  const load = async () => onData(await readLive(sourceKey, options));
  await load();
  const stop = await watchLive(sourceKey, load);
  return stop;
}
