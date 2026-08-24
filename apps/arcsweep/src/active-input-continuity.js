const APP_SELECTOR = '#app';
const EDITABLE_SELECTOR = 'input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]), textarea, select, [contenteditable="true"]';

let activeSnapshot = null;
let observer = null;

function fieldKey(node) {
  if (!(node instanceof Element)) return null;
  const form = node.closest('form');
  const formKey = form?.id || form?.getAttribute('data-room-id') || '';
  const nodeKey = node.id || node.getAttribute('name') || node.getAttribute('data-rich-text') || node.getAttribute('aria-label');
  return nodeKey ? { formKey, nodeKey, tag: node.tagName.toLowerCase() } : null;
}

function snapshotField(node) {
  if (!(node instanceof Element) || !node.matches(EDITABLE_SELECTOR)) return null;
  const key = fieldKey(node);
  if (!key) return null;
  const isText = node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement;
  return {
    ...key,
    value: node instanceof HTMLSelectElement ? node.value : isText ? node.value : node.textContent || '',
    selectionStart: isText ? node.selectionStart : null,
    selectionEnd: isText ? node.selectionEnd : null,
    selectionDirection: isText ? node.selectionDirection : null,
    hadFocus: document.activeElement === node,
    capturedAt: Date.now(),
  };
}

function selectorFor(snapshot) {
  const escaped = globalThis.CSS?.escape ? CSS.escape(snapshot.nodeKey) : snapshot.nodeKey.replace(/["\\]/g, '\\$&');
  const candidates = [
    `#${escaped}`,
    `[name="${escaped}"]`,
    `[data-rich-text="${escaped}"]`,
    `[aria-label="${escaped}"]`,
  ];
  const form = snapshot.formKey
    ? document.getElementById(snapshot.formKey) || document.querySelector(`form[data-room-id="${snapshot.formKey}"]`)
    : null;
  for (const candidate of candidates) {
    const node = form?.querySelector(candidate) || document.querySelector(`${APP_SELECTOR} ${candidate}`);
    if (node?.matches?.(EDITABLE_SELECTOR)) return node;
  }
  return null;
}

function restoreSnapshot(snapshot) {
  if (!snapshot || Date.now() - snapshot.capturedAt > 5000) return false;
  const node = selectorFor(snapshot);
  if (!node) return false;

  if (node instanceof HTMLSelectElement) {
    if (node.value !== snapshot.value) node.value = snapshot.value;
  } else if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
    if (node.value !== snapshot.value) {
      node.value = snapshot.value;
      node.dispatchEvent(new Event('input', { bubbles: true }));
    }
  } else if (node.isContentEditable && node.textContent !== snapshot.value) {
    node.textContent = snapshot.value;
    node.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: null }));
  }

  if (snapshot.hadFocus) {
    node.focus({ preventScroll: true });
    if ((node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) && snapshot.selectionStart != null) {
      try { node.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd ?? snapshot.selectionStart, snapshot.selectionDirection || 'none'); } catch {}
    }
  }
  return true;
}

function captureFromFocus(event) {
  const node = event.target;
  if (node instanceof Element && node.closest(APP_SELECTOR) && node.matches(EDITABLE_SELECTOR)) {
    activeSnapshot = snapshotField(node);
  }
}

function captureFromInput(event) {
  const node = event.target;
  if (node instanceof Element && node.closest(APP_SELECTOR) && node.matches(EDITABLE_SELECTOR)) {
    activeSnapshot = snapshotField(node);
  }
}

function onMutations(mutations) {
  if (!activeSnapshot?.hadFocus) return;
  const appChanged = mutations.some((mutation) => mutation.target?.id === 'app' || mutation.target?.closest?.(APP_SELECTOR));
  if (!appChanged) return;
  queueMicrotask(() => {
    if (restoreSnapshot(activeSnapshot)) activeSnapshot = snapshotField(document.activeElement) || activeSnapshot;
  });
}

export function installActiveInputContinuity() {
  if (typeof document === 'undefined' || observer) return;
  document.addEventListener('focusin', captureFromFocus, true);
  document.addEventListener('input', captureFromInput, true);
  document.addEventListener('change', captureFromInput, true);
  const app = document.querySelector(APP_SELECTOR);
  if (!app) return;
  observer = new MutationObserver(onMutations);
  observer.observe(app, { childList: true, subtree: true });
}

if (typeof document !== 'undefined') installActiveInputContinuity();
