import { loadState } from './storage.js';
import { getKelyranSupabase } from './kelyran-supabase.js';

export const ECHO_LIVE_ADAPTERS_SCHEMA = 'arcsweep.echo-live-adapters/v1';
export const RUNTIME_RECEIPT_EDGE = 'https://rufrmjyusalnifpegllj.supabase.co/functions/v1/arcsweep-runtime-receipt';

function row(kind, store, raw, authority_class, provenance = null) {
  return { kind, store, raw, authority_class, provenance };
}

function flattenRecordRooms(records = {}) {
  return Object.entries(records || {}).flatMap(([roomId, items]) => (Array.isArray(items) ? items : []).map((item) => ({ ...item, echo_room_id: roomId })));
}

export function localEchoAdapterEntries(state = {}) {
  const entries = [];
  (state.worlds || []).forEach((item) => entries.push(row('world', 'world-registry/live', item, 'world-registry')));
  (state.scripts || []).forEach((item) => entries.push(row('script', 'canon-studio/live', item, item?.status?.toLowerCase?.().includes('canon') ? 'canon-candidate' : 'authored-draft')));
  flattenRecordRooms(state.records).forEach((item) => entries.push(row('record', 'records-room/live', item, item?.canonCarry ? 'canon-carry' : 'record')));
  (state.ingests || state.nonCanonIngests || []).forEach((item) => entries.push(row('source', 'source-library/live', item, 'source-evidence')));
  (state.observatory?.deep_time_records || []).forEach((item) => entries.push(row('deep-time', 'deep-time/live', item, 'reviewed-temporal-evidence')));
  (state.math_spine_packets || state.mathSpinePackets || []).forEach((item) => entries.push(row('math-spine', 'math-spine/live', item, 'derived-mathematical-receipt')));
  (state.worldHydrationReceipts || []).forEach((item) => entries.push(row('world-hydration', 'world-registry/hydration-receipts', item, 'migration-receipt')));
  return entries;
}

async function runtimeReceiptEntries(fetchImpl = fetch) {
  try {
    const client = await getKelyranSupabase();
    const { data } = await client.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return [];
    const response = await fetchImpl(RUNTIME_RECEIPT_EDGE, { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (!response.ok) return [];
    const body = await response.json().catch(() => ({}));
    return (Array.isArray(body.events) ? body.events : [])
      .filter((item) => item?.event_type === 'model-reply-receipted')
      .map((item) => row('runtime-receipt', 'runtime-braid/live', item, 'runtime-attestation'));
  } catch {
    return [];
  }
}

export async function buildLiveEchoEntries({ state = null, fetchImpl = fetch } = {}) {
  const current = state || await loadState();
  const [runtime] = await Promise.all([runtimeReceiptEntries(fetchImpl)]);
  return [...localEchoAdapterEntries(current), ...runtime];
}

export function installEchoLiveAdapters() {
  globalThis.__arcsweepEchoIndexSources = () => buildLiveEchoEntries();
  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:echo-live-adapters-ready', { detail: { schema: ECHO_LIVE_ADAPTERS_SCHEMA } }));
  return true;
}
