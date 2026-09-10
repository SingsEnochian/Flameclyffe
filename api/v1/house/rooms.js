import { createHouseRoomsHandler } from '../../../netlify/functions/_shared/house-rooms-runtime.mjs';
import { createHouseCaretakerHandler } from '../../_shared/house-caretaker-runtime.mjs';
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
const handleRooms = createHouseRoomsHandler({ env, store: lazyStore });
const handleCaretaker = createHouseCaretakerHandler({ env });

export function requestTargetsCaretaker(request) {
  const url = new URL(request.url);
  if (url.searchParams.get('house_action') === 'caretaker') return true;

  // Vercel rewrites /api/v1/house/caretaker onto this function while preserving
  // the browser-facing source URL. Do not rely only on a destination query
  // parameter being visible inside the serverless Request object.
  const pathname = url.pathname.replace(/\/+$/, '');
  return pathname === '/api/v1/house/caretaker';
}

export default {
  async fetch(request) {
    if (requestTargetsCaretaker(request)) return handleCaretaker(request);
    try { return await handleRooms(request); }
    catch (error) {
      console.error('House room storage failure', error);
      return new Response(JSON.stringify({ error: 'House room storage unavailable.' }), {
        status: 503,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
      });
    }
  },
};
