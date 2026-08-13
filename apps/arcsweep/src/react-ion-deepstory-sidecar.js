import {
  createReactionDeepStoryEvent,
  createResponseDeepStoryEvent,
} from './react-ion-deepstory.js';

const STORE_KEY = 'hearthgate.arcsweep.react-ion-helm.v1';
let running = false;

function readStore() {
  try {
    const value = JSON.parse(globalThis.localStorage?.getItem(STORE_KEY) || 'null');
    if (value?.version === 1 && Array.isArray(value.receipts)) return value;
  } catch {}
  return { version: 1, receipts: [] };
}

function writeStore(store) {
  try { globalThis.localStorage?.setItem(STORE_KEY, JSON.stringify(store)); } catch {}
}

async function enrich() {
  if (running) return;
  const store = readStore();
  const receipt = store.receipts.at(-1);
  if (!receipt?.ask || !receipt?.navigation) return;
  running = true;
  try {
    let changed = false;
    if (!receipt.deep_story_event) {
      receipt.deep_story_event = await createReactionDeepStoryEvent({
        helmReceipt: receipt,
        narrativeContext: receipt.route
          ? 'The React-ion Helm compiled an admitted software projection route.'
          : `The React-ion Helm did not compile a route: ${receipt.route_error || 'route gate closed'}.`,
        recordedAt: receipt.created_at,
      });
      changed = true;
    }
    for (const exchange of receipt.protocol_responses || []) {
      if (exchange.deep_story_event) continue;
      exchange.deep_story_event = await createResponseDeepStoryEvent({
        helmReceipt: receipt,
        exchange,
        narrativeContext: `A ${exchange.response?.code || 'UNKNOWN'} semantic response was explicitly recorded; return transport ${exchange.return_receipt?.transport_code || 'unrecorded'}.`,
        recordedAt: exchange.recorded_at || new Date().toISOString(),
      });
      changed = true;
    }
    if (changed) writeStore(store);
  } finally {
    running = false;
  }
}

const observer = new MutationObserver(() => { void enrich(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { void enrich(); }, { once: true });
else void enrich();
