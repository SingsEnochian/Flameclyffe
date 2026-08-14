import { loadState, persistObservatoryStore } from './storage.js';
import {
  createRunaPreviewObservationLink,
  findNextFeedbackCycleForEvidenceArm,
} from './runa-preview-observation-link.js';

const MAX_LINKS = 48;
let scanning = false;
let timer = null;

function notify(detail = {}) {
  const EventClass = globalThis.CustomEvent;
  if (typeof globalThis.dispatchEvent === 'function' && typeof EventClass === 'function') {
    globalThis.dispatchEvent(new EventClass('arcsweep:receipts-updated', { detail: { runa_preview_observation_link: true, ...detail } }));
  }
}

async function scan() {
  if (scanning) return;
  scanning = true;
  try {
    const state = await loadState();
    const obs = structuredClone(state.observatory || {});
    const arms = obs.runa_preview_evidence_arms || [];
    const links = obs.runa_preview_observation_links || [];
    let changed = false;

    for (const arm of arms) {
      const cycle = findNextFeedbackCycleForEvidenceArm({ arm, feedbackCycles: state.feedbackCycles || [], existingLinks: links });
      if (!cycle) continue;
      const link = await createRunaPreviewObservationLink({ arm, feedbackCycle: cycle });
      links.push(structuredClone(link));
      changed = true;
    }

    if (!changed) return;
    obs.runa_preview_observation_links = links.slice(-MAX_LINKS);
    await persistObservatoryStore(obs, {
      reason: 'runa-preview-observation-link',
      linkCount: obs.runa_preview_observation_links.length,
    });
    notify({ persisted: true });
  } finally {
    scanning = false;
  }
}

function schedule(delay = 80) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void scan();
  }, delay);
}

globalThis.addEventListener?.('arcsweep:receipts-updated', () => schedule(0));
for (const eventName of ['submit', 'click', 'change']) document.addEventListener(eventName, () => schedule(), true);
const observer = new MutationObserver(() => schedule());
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => schedule(0), { once: true });
else schedule(0);
