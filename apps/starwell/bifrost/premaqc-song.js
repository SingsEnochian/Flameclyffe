import * as legacy from './premaq-song.js';
import {
  PREMAQC_DYNAMIC_AXES,
  PREMAQC_FULL_SONG_PLAN_SCHEMA,
  PREMAQC_FULL_SONG_RECEIPT_SCHEMA,
  canonicalisePremaqcEnvelope,
} from '../src/premaqc-contract.js';

export const PREMAQC_SONG_CYCLES_PER_AXIS = legacy.PREMAQ_SONG_CYCLES_PER_AXIS;
export const PREMAQC_SONG_AXIS_CYCLES = PREMAQC_DYNAMIC_AXES.length * PREMAQC_SONG_CYCLES_PER_AXIS;
export const PREMAQC_SONG_NOTE_COUNT = PREMAQC_SONG_AXIS_CYCLES * 2;

export function buildPremaqcSongPlan(options = {}) {
  const plan = legacy.buildPremaqSongPlan(options);
  return canonicalisePremaqcEnvelope({
    ...plan,
    schema: PREMAQC_FULL_SONG_PLAN_SCHEMA,
    axes: [...PREMAQC_DYNAMIC_AXES],
    context_only_axes: ['Q'],
    qualia_sonified: false,
    legacy_schema: plan.schema,
  }, { schema: PREMAQC_FULL_SONG_PLAN_SCHEMA });
}

export const PREMAQC_SONG_RECEIPT_SCHEMA = PREMAQC_FULL_SONG_RECEIPT_SCHEMA;

function canonicaliseVisibleSongVocabulary() {
  if (typeof document === 'undefined') return;
  for (const id of ['premaq-song-status', 'premaq-song-voices']) {
    const root = document.getElementById(id);
    if (!root) continue;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (walker.currentNode.nodeValue?.includes('PREMAQ')) {
        walker.currentNode.nodeValue = walker.currentNode.nodeValue.replaceAll('PREMAQ', 'PREMAQC');
      }
    }
  }
}

if (typeof document !== 'undefined') {
  const apply = () => canonicaliseVisibleSongVocabulary();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
  const observer = new MutationObserver(apply);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
}
