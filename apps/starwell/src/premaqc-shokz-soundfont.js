import * as legacy from './premaq-shokz-soundfont.js';
import {
  PREMAQC_CONTEXT_ONLY_AXES,
  PREMAQC_DYNAMIC_AXES,
  PREMAQC_NAMING_LAW,
  PREMAQC_SHOKZ_PLAN_SCHEMA,
  canonicalisePremaqcEnvelope,
} from './premaqc-contract.js';

export const PREMAQC_SHOKZ_CYCLES_PER_AXIS = legacy.PREMAQ_SHOKZ_CYCLES_PER_AXIS;
export const PREMAQC_SHOKZ_AXIS_CYCLES = PREMAQC_DYNAMIC_AXES.length * PREMAQC_SHOKZ_CYCLES_PER_AXIS;
export const PREMAQC_SHOKZ_TONE_EVENTS = PREMAQC_SHOKZ_AXIS_CYCLES * 2;
export const PREMAQC_SHOKZ_MIN_HZ = legacy.PREMAQ_SHOKZ_MIN_HZ;
export const PREMAQC_SHOKZ_MAX_HZ = legacy.PREMAQ_SHOKZ_MAX_HZ;
export const PREMAQC_SHOKZ_MASTER_GAIN_CEILING = legacy.PREMAQ_SHOKZ_MASTER_GAIN_CEILING;

export function buildPremaqcShokzSoundfontPlan(options = {}) {
  const legacyPlan = legacy.buildPremaqShokzSoundfontPlan(options);
  return canonicalisePremaqcEnvelope({
    ...legacyPlan,
    schema: PREMAQC_SHOKZ_PLAN_SCHEMA,
    axes: [...PREMAQC_DYNAMIC_AXES],
    dynamic_axes: [...PREMAQC_DYNAMIC_AXES],
    context_only_axes: [...PREMAQC_CONTEXT_ONLY_AXES],
    qualia_sonified: false,
    legacy_schema: legacyPlan.schema,
  }, { schema: PREMAQC_SHOKZ_PLAN_SCHEMA });
}

export const axisForInteractionToken = legacy.axisForInteractionToken;
export const featherStop = (...args) => legacy.featherStop(...args);
export const installPremaqcShokzSoundfont = () => legacy.installPremaqShokzSoundfont();

function canonicaliseVisibleText(root = document) {
  const targets = [
    '#premaq-shokz-soundfont-dock',
    '#premaq-shokz-status',
    '#premaq-shokz-source',
  ];
  const legacyTerm = PREMAQC_NAMING_LAW.legacy_term;
  const canonicalTerm = PREMAQC_NAMING_LAW.canonical;
  for (const selector of targets) {
    const node = root.querySelector?.(selector);
    if (!node) continue;
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    for (const textNode of textNodes) {
      if (textNode.nodeValue?.includes(legacyTerm)) {
        textNode.nodeValue = textNode.nodeValue.replaceAll(legacyTerm, canonicalTerm);
      }
    }
  }
}

function installVocabularyGuard() {
  if (typeof document === 'undefined') return;
  const apply = () => canonicaliseVisibleText(document);
  apply();
  const observer = new MutationObserver(apply);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installVocabularyGuard, { once: true });
  } else {
    installVocabularyGuard();
  }
}
