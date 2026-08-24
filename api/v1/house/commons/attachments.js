import { createHouseCommonsAttachmentHandler } from '../../../../netlify/functions/_shared/house-commons-attachments-runtime.mjs';
import { createSupabaseCommonsAttachmentStore } from '../../../_shared/supabase-commons-store.mjs';
import { vercelEnv as env } from '../../../_shared/vercel-env.mjs';

let store;
const backingStore = () => (store ||= createSupabaseCommonsAttachmentStore(env));
const lazyStore = Object.freeze({
  get: (...args) => backingStore().get(...args),
  set: (...args) => backingStore().set(...args),
  setJSON: (...args) => backingStore().setJSON(...args),
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
