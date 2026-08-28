import { createLanternbridgeMailboxSyncHandler } from '../../../../netlify/functions/_shared/lanternbridge-mailbox-sync-runtime.mjs';
import { vercelEnv as env } from '../../../_shared/vercel-env.mjs';

let indexStorePromise;
let commonsStorePromise;

async function indexStore() {
  if (!indexStorePromise) {
    indexStorePromise = import('../../../_shared/supabase-lanternbridge-store.mjs')
      .then(({ createSupabaseLanternbridgeStore }) => createSupabaseLanternbridgeStore(env));
  }
  return indexStorePromise;
}

async function commonsStore() {
  if (!commonsStorePromise) {
    commonsStorePromise = import('../../../_shared/supabase-commons-store.mjs')
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

const handle = createLanternbridgeMailboxSyncHandler({ env, indexStore: lazyIndexStore, commonsStore: lazyCommonsStore });

export default {
  async fetch(request) {
    try {
      return await handle(request);
    } catch (error) {
      console.error('Lanternbridge mailbox sync failure', error);
      return new Response(JSON.stringify({ error: 'Lanternbridge mailbox sync unavailable.' }), {
        status: 503,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
      });
    }
  },
};
