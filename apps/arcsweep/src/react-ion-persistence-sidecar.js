import { persistReactionSidecars } from './storage.js';

const KEYS = [
  'hearthgate.arcsweep.react-ion-registry.v1',
  'hearthgate.arcsweep.react-ion-helm.v1',
];

let lastSignature = '';
let syncing = false;
let queued = false;

function signature() {
  try {
    return KEYS.map((key) => globalThis.localStorage?.getItem(key) || '').join('\n---reaction-store---\n');
  } catch {
    return '';
  }
}

async function syncIfChanged() {
  if (syncing) {
    queued = true;
    return;
  }
  const current = signature();
  if (!current || current === lastSignature) return;
  syncing = true;
  try {
    await persistReactionSidecars({ source: 'react-ion-persistence-bridge' });
    lastSignature = signature();
  } catch (error) {
    console.warn('React-ion persistence bridge could not sync:', error);
  } finally {
    syncing = false;
    if (queued) {
      queued = false;
      void syncIfChanged();
    }
  }
}

const observer = new MutationObserver(() => { void syncIfChanged(); });
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { void syncIfChanged(); }, { once: true });
} else {
  void syncIfChanged();
}
