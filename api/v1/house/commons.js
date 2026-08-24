import { createHouseCommonsHandler } from '../../../netlify/functions/_shared/house-commons-runtime.mjs';
import { createSupabaseCommonsLedgerStore } from '../../_shared/supabase-commons-store.mjs';
import { vercelEnv as env } from '../../_shared/vercel-env.mjs';

let store;
const backingStore = () => (store ||= createSupabaseCommonsLedgerStore(env));
const lazyStore = Object.freeze({
  list: (...args) => backingStore().list(...args),
  get: (...args) => backingStore().get(...args),
  setJSON: (...args) => backingStore().setJSON(...args),
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
