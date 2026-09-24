import { createHouseCommonsHandler } from '../../../netlify/functions/_shared/house-commons-runtime.mjs';
import { createTelegramHouseBridgeHandler } from '../../../netlify/functions/_shared/telegram-house-bridge-runtime.mjs';
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

const houseCommons = createHouseCommonsHandler({ env, store: lazyStore });
const telegramHouse = createTelegramHouseBridgeHandler({ env, store: lazyStore });

function isTelegramTransport(request) {
  const url = new URL(request.url);
  return url.searchParams.get('transport') === 'telegram'
    || request.headers.has('x-telegram-bot-api-secret-token');
}

export default {
  async fetch(request) {
    const telegram = isTelegramTransport(request);
    try {
      return await (telegram ? telegramHouse : houseCommons)(request);
    } catch (error) {
      console.error(telegram ? 'Telegram House bridge failure' : 'House Commons storage failure', error);
      return new Response(JSON.stringify({ error: telegram ? 'Telegram House bridge unavailable.' : 'House Commons storage unavailable.' }), {
        status: 503,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
      });
    }
  },
};
