import './two-shore-premaq.js';
import {
  PREMAQC_NAMING_LAW,
  TWO_SHORE_PREMAQC_GATE_SCHEMA,
} from '../src/premaqc-contract.js';

export const TWO_SHORE_PREMAQC_PANEL_SCHEMA = 'bifrost.two-shore-premaqc-panel/v1';
export const TWO_SHORE_PREMAQC_GATE_CONTRACT = Object.freeze({
  schema: TWO_SHORE_PREMAQC_GATE_SCHEMA,
  panel_schema: TWO_SHORE_PREMAQC_PANEL_SCHEMA,
  vocabulary: PREMAQC_NAMING_LAW.canonical,
  dynamic_axes: ['P', 'C', 'R', 'E', 'M', 'A'],
  context_only_axes: ['Q'],
  qualia_sonified: false,
  qualia_compression_focus_allowed: false,
});

function canonicalisePanelVocabulary() {
  if (typeof document === 'undefined') return;
  const panel = document.getElementById('two-shore-premaq-panel');
  if (!panel) return;
  const legacyTerm = PREMAQC_NAMING_LAW.legacy_term;
  const canonicalTerm = PREMAQC_NAMING_LAW.canonical;
  const walker = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    if (walker.currentNode.nodeValue?.includes(legacyTerm)) {
      walker.currentNode.nodeValue = walker.currentNode.nodeValue.replaceAll(legacyTerm, canonicalTerm);
    }
  }
}

if (typeof document !== 'undefined') {
  const apply = () => canonicalisePanelVocabulary();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
  else apply();
  const observer = new MutationObserver(apply);
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
}
