function relaxManualFallbackValidation(root = document) {
  for (const form of root.querySelectorAll?.('[data-reaction-helm-form]') || []) {
    for (const name of ['sourceAddress', 'targetAddress']) {
      const field = form.elements?.[name];
      if (field) field.required = false;
    }
  }
}

const observer = new MutationObserver(() => relaxManualFallbackValidation());
observer.observe(document.documentElement, { childList: true, subtree: true });
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => relaxManualFallbackValidation(), { once: true });
} else {
  relaxManualFallbackValidation();
}
