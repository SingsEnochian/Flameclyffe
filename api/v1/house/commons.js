import { createHouseCommonsHandler } from '../../../netlify/functions/_shared/house-commons-runtime.mjs';
import { createTelegramHouseBridgeHandler } from '../../../netlify/functions/_shared/telegram-house-bridge-runtime.mjs';
import { handleHouseAgentChatterRequest } from '../../_shared/house-agent-chatter-endpoint.mjs';
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

function transport(request) {
  const url = new URL(request.url);
  if (url.searchParams.get('transport') === 'agent-chatter') return 'agent-chatter';
  if (url.searchParams.get('transport') === 'telegram' || request.headers.has('x-telegram-bot-api-secret-token')) return 'telegram';
  return 'commons';
}

export const config = { maxDuration: 60 };

export default {
  async fetch(request) {
    const selected = transport(request);
    try {
      if (selected === 'agent-chatter') {
        return await handleHouseAgentChatterRequest(request, { env, store: lazyStore, commonsHandler: houseCommons });
      }
      return await (selected === 'telegram' ? telegramHouse : houseCommons)(request);
    } catch (error) {
      const label = selected === 'telegram'
        ? 'Telegram House bridge'
        : selected === 'agent-chatter'
          ? 'House agent chatter'
          : 'House Commons storage';
      console.error(`${label} failure`, error);
      return new Response(JSON.stringify({ error: `${label} unavailable.` }), {
        status: 503,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
      });
    }
  },
};
