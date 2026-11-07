// Browser-native spelling suggestions. No text leaves Wayglass for this feature.
// Ritual glyph/code editors opt out; named language expressions are never rewritten.
export function applyWayglassSpelling(root, enabled = true) {
  if (!root?.querySelectorAll) return 0;
  let count = 0;
  for (const node of root.querySelectorAll('textarea, [contenteditable="true"]')) {
    if (node.hasAttribute?.('data-wtl-code') || node.closest?.('[data-wtl-code]')) {
      node.spellcheck = false;
      continue;
    }
    node.spellcheck = Boolean(enabled);
    node.setAttribute('spellcheck',String(Boolean(enabled)));
    if (!node.getAttribute('lang')) node.setAttribute('lang','en');
    if (!node.getAttribute('autocapitalize')) node.setAttribute('autocapitalize','sentences');
    count++;
  }
  return count;
}

export function createWayglassSpellingController({ document: doc = globalThis.document } = {}) {
  let enabled = true, observer = null;
  const listeners = new Set();
  function apply(root = doc) { return applyWayglassSpelling(root,enabled); }
  function setEnabled(value) {
    enabled = Boolean(value);
    apply();
    for (const listener of listeners) listener(enabled);
    return enabled;
  }
  if (typeof globalThis.MutationObserver === 'function' && doc?.documentElement) {
    observer = new globalThis.MutationObserver(() => apply());
    observer.observe(doc.documentElement,{subtree:true,childList:true});
  }
  apply();
  return Object.freeze({
    get enabled(){return enabled;},apply,setEnabled,
    onChange(listener){listeners.add(listener);return ()=>listeners.delete(listener);},
    destroy(){observer?.disconnect();listeners.clear();}
  });
}
