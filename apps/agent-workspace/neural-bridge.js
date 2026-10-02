function emit(input) {
  return globalThis.HouseBrain?.emit?.(input) || null;
}

function updateNode(id, update) {
  return globalThis.HouseBrain?.setNode?.(id, update) || null;
}

function selectedTargetLabel() {
  return document.querySelector('[data-nest-target-label]')?.textContent?.trim() || 'unknown';
}

function syncCrowSnapshot() {
  const snap = globalThis.HouseCrowNest?.snapshot?.();
  if (!snap) return;
  updateNode('crow', {
    kind: 'agent',
    state: snap.crow?.runtime || 'unknown',
    metadata: {
      route: snap.crow?.route || null,
      role: snap.crow?.role || null,
      session: snap.session?.state || 'unknown',
    },
  });
  for (const nestling of snap.nestlings || []) {
    updateNode(nestling.id, {
      kind: 'agent',
      state: nestling.route ? 'bound' : 'configured',
      metadata: { name: nestling.name, role: nestling.role, route: nestling.route || null },
    });
  }
  updateNode('house-session', {
    kind: 'session',
    state: snap.session?.state || 'unknown',
    metadata: { detail: snap.session?.detail || null },
  });
}

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  if (form.matches('[data-nest-form]')) {
    const message = String(new FormData(form).get('message') || '').trim();
    emit({
      lane: 'sensory',
      kind: 'text-intent',
      source: 'crow-nest-composer',
      target: selectedTargetLabel(),
      epistemicClass: 'UNKNOWN',
      payload: { characters: message.length },
    });
  }
  if (form.matches('[data-crow-bind], [data-add-nestling]')) {
    queueMicrotask(syncCrowSnapshot);
  }
}, true);

document.addEventListener('click', (event) => {
  const target = event.target?.closest?.('[data-nest-target], [data-refresh-nest], [data-open-house-line], [data-nest-launch], [data-nest-close]');
  if (!target) return;
  const kind = target.hasAttribute('data-nest-target') ? 'agent-selected'
    : target.hasAttribute('data-refresh-nest') ? 'runtime-refresh-requested'
      : target.hasAttribute('data-open-house-line') ? 'session-open-requested'
        : target.hasAttribute('data-nest-launch') ? 'nest-opened'
          : 'nest-closed';
  emit({ lane: 'ui', kind, source: 'crow-nest', target: target.dataset.nestTarget || null, payload: null });
  queueMicrotask(syncCrowSnapshot);
}, true);

document.addEventListener('house:astra-bridge-state', () => queueMicrotask(syncCrowSnapshot));
document.addEventListener('house:brain-signal', (event) => {
  const signal = event.detail;
  if (!signal || signal.source === 'neural-bridge') return;
  if (signal.kind === 'witness-receipt') {
    document.dispatchEvent(new CustomEvent('house:sensory-feedback', { detail: { kind: 'success' } }));
  }
});

const observer = new MutationObserver(() => syncCrowSnapshot());
observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-state'] });
queueMicrotask(() => {
  syncCrowSnapshot();
  emit({ lane: 'ui', kind: 'neural-bridge-online', source: 'neural-bridge', payload: { surfaces: ['crow-nest', 'astra', 'sensory-feedback'] } });
});
