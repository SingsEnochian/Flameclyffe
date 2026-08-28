import { createLanternbridgeMessageHandler } from '../../../netlify/functions/_shared/lanternbridge-message-runtime.mjs';
import { vercelEnv as env } from '../../_shared/vercel-env.mjs';

let indexStorePromise;
let commonsStorePromise;

async function indexStore() {
  if (!indexStorePromise) {
    indexStorePromise = import('../../_shared/supabase-lanternbridge-store.mjs')
      .then(({ createSupabaseLanternbridgeStore }) => createSupabaseLanternbridgeStore(env));
  }
  return indexStorePromise;
}

async function commonsStore() {
  if (!commonsStorePromise) {
    commonsStorePromise = import('../../_shared/supabase-commons-store.mjs')
      .then(({ createSupabaseCommonsLedgerStore }) => createSupabaseCommonsLedgerStore(env));
  }
  return commonsStorePromise;
}

const lazyIndexStore = Object.freeze({
  async getByCursor(...args) { return (await indexStore()).getByCursor(...args); },
  async getByBridgeId(...args) { return (await indexStore()).getByBridgeId(...args); },
  async list(...args) { return (await indexStore()).list(...args); },
  async insertNew(...args) { return (await indexStore()).insertNew(...args); },
  async markProcessed(...args) { return (await indexStore()).markProcessed(...args); },
  async markBridgeStatus(...args) { return (await indexStore()).markBridgeStatus(...args); },
});

const lazyCommonsStore = Object.freeze({
  async setJSON(...args) { return (await commonsStore()).setJSON(...args); },
});

const handle = createLanternbridgeMessageHandler({ env, indexStore: lazyIndexStore, commonsStore: lazyCommonsStore });

export function classifyLanternbridgeRuntimeFailure(error) {
  const message = String(error?.message || error || '');
  if (/Supabase Lanternbridge storage is not configured/i.test(message)) return 'supabase_index_config_missing';
  if (/Lanternbridge cursor read failed|Lanternbridge bridge-id read failed|Lanternbridge index list failed/i.test(message)) return 'supabase_index_read_failed';
  if (/Lanternbridge index insert failed|Lanternbridge processed-state update failed|Lanternbridge .* update failed/i.test(message)) return 'supabase_index_write_failed';
  if (/Supabase House Runtime storage is not configured/i.test(message)) return 'commons_storage_config_missing';
  if (/House Commons ledger write failed/i.test(message)) return 'commons_storage_write_failed';
  return 'internal_error';
}

export default {
  async fetch(request) {
    try {
      return await handle(request);
    } catch (error) {
      const code = classifyLanternbridgeRuntimeFailure(error);
      console.error('Lanternbridge message-index failure', { code, error });
      return new Response(JSON.stringify({
        error: 'Lanternbridge message index unavailable.',
        code,
      }), {
        status: 503,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
      });
    }
  },
};
