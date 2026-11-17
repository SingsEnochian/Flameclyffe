import * as legacy from './premaq-song.js';
import {
  PREMAQC_DYNAMIC_AXES,
  PREMAQC_AXIS_NAMES,
  PREMAQC_FULL_SONG_PLAN_SCHEMA,
  PREMAQC_FULL_SONG_RECEIPT_SCHEMA,
  PREMAQC_NAMING_LAW,
  canonicalisePremaqcEnvelope,
} from '../src/premaqc-contract.js';

export const PREMAQC_SONG_CYCLES_PER_AXIS = legacy.PREMAQ_SONG_CYCLES_PER_AXIS;
export const PREMAQC_SONG_AXIS_CYCLES = PREMAQC_DYNAMIC_AXES.length * PREMAQC_SONG_CYCLES_PER_AXIS;
export const PREMAQC_SONG_NOTE_COUNT = PREMAQC_SONG_AXIS_CYCLES * 2;

export function buildPremaqcSongPlan(options = {}) {
  const plan = legacy.buildPremaqSongPlan(options);
  const cycles = plan.cycles.map((cycle) => Object.freeze({
    ...cycle,
    voices: Object.freeze(cycle.voices.map((voice) => Object.freeze({
      ...voice,
      axis_name: PREMAQC_AXIS_NAMES[voice.axis] || voice.axis_name,
    }))),
  }));
  return canonicalisePremaqcEnvelope({
    ...plan,
    schema: PREMAQC_FULL_SONG_PLAN_SCHEMA,
    axes: [...PREMAQC_DYNAMIC_AXES],
    axis_names: Object.freeze({ ...PREMAQC_AXIS_NAMES }),
    context_only_axes: ['Q'],
    qualia_sonified: false,
    cycles: Object.freeze(cycles),
    legacy_schema: plan.schema,
  }, { schema: PREMAQC_FULL_SONG_PLAN_SCHEMA });
}

export const PREMAQC_SONG_RECEIPT_SCHEMA = PREMAQC_FULL_SONG_RECEIPT_SCHEMA;

function canonicaliseVisibleSongVocabulary() {
  if (typeof document === 'undefined') return;
  const legacyTerm = PREMAQC_NAMING_LAW.legacy_term;
  const canonicalTerm = PREMAQC_NAMING_LAW.canonical;
  for (const id of ['premaq-song-status', 'premaq-song-voices']) {
    const root = document.getElementById(id);
    if (!root) continue;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const value = walker.currentNode.nodeValue || '';
      const next = value
        .replaceAll(legacyTerm, canonicalTerm)
        .replace(/\bEntropy\b/g, PREMAQC_AXIS_NAMES.E);
      if (next !== value) walker.currentNode.nodeValue = next;
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
