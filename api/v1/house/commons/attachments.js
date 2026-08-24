import { createHouseCommonsAttachmentHandler } from '../../../../netlify/functions/_shared/house-commons-attachments-runtime.mjs';
import { vercelEnv as env } from '../../../_shared/vercel-env.mjs';

let storePromise;
async function backingStore() {
  if (!storePromise) {
    storePromise = import('../../../_shared/supabase-commons-store.mjs')
      .then(({ createSupabaseCommonsAttachmentStore }) => createSupabaseCommonsAttachmentStore(env));
  }
  return storePromise;
}
const lazyStore = Object.freeze({
  async get(...args) { return (await backingStore()).get(...args); },
  async set(...args) { return (await backingStore()).set(...args); },
  async setJSON(...args) { return (await backingStore()).setJSON(...args); },
});
const handle = createHouseCommonsAttachmentHandler({ env, store: lazyStore });

export default {
  async fetch(request) {
    try {
      return await handle(request);
    } catch (error) {
      console.error('House Commons attachment storage failure', error);
      return new Response(JSON.stringify({ error: 'House Commons attachment storage unavailable.' }), {
        status: 503,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
      });
    }
  },
};
