import { createHouseCommonsHandler } from '../../../netlify/functions/_shared/house-commons-runtime.mjs';
import { createTelegramHouseBridgeHandler } from '../../../netlify/functions/_shared/telegram-house-bridge-runtime.mjs';
import { createHouseAgentChatterHandler } from '../../_shared/house-agent-chatter-endpoint.mjs';
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
const handleHouseAgentChatterRequest = createHouseAgentChatterHandler({ env, store: lazyStore });

function isTelegramTransport(request) {
  const url = new URL(request.url);
  return url.searchParams.get('transport') === 'telegram'
    || request.headers.has('x-telegram-bot-api-secret-token');
}

function isAgentChatterTransport(request) {
  return new URL(request.url).searchParams.get('transport') === 'agent-chatter';
}

export default {
  async fetch(request) {
    const agentChatter = isAgentChatterTransport(request);
    const telegram = !agentChatter && isTelegramTransport(request);
    try {
      if (agentChatter) return await handleHouseAgentChatterRequest(request);
      return await (telegram ? telegramHouse : houseCommons)(request);
    } catch (error) {
      const label = agentChatter ? 'House agent chatter' : telegram ? 'Telegram House bridge' : 'House Commons storage';
      console.error(`${label} failure`, error);
      return new Response(JSON.stringify({ error: `${label} unavailable.` }), {
        status: 503,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
      });
    }
  },
};
