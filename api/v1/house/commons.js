import { createHouseCommonsHandler } from '../../../netlify/functions/_shared/house-commons-runtime.mjs';
import { vercelEnv as env } from '../../_shared/vercel-env.mjs';

let storePromise;
async function backingStore() {
  if (!storePromise) {
    storePromise = import('../../_shared/supabase-commons-store.mjs')
      .then(({ createSupabaseCommonsLedgerStore }) => createSupabaseCommonsLedgerStore(env));
  }
  return storePromise;
}
const lazyStore = Object.freeze({
  async list(...args) { return (await backingStore()).list(...args); },
  async get(...args) { return (await backingStore()).get(...args); },
  async setJSON(...args) { return (await backingStore()).setJSON(...args); },
});
const handle = createHouseCommonsHandler({ env, store: lazyStore });

export default {
  async fetch(request) {
    try {
      return await handle(request);
    } catch (error) {
      console.error('House Commons storage failure', error);
      return new Response(JSON.stringify({ error: 'House Commons storage unavailable.' }), {
        status: 503,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
      });
    }
  },
};
