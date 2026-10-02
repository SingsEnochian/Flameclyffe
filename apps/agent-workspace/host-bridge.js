const HOST_NODE = 'workspace-host';

function emit(input) {
  return globalThis.HouseBrain?.emit?.(input) || null;
}

function setNode(state, metadata = {}) {
  return globalThis.HouseBrain?.setNode?.(HOST_NODE, {
    kind: 'surface',
    state,
    metadata,
  });
}

function tauriInvoke() {
  return globalThis.__TAURI__?.core?.invoke || null;
}

async function detectHost() {
  const invoke = tauriInvoke();
  if (!invoke) {
    const descriptor = Object.freeze({
      mode: 'web',
      privileged: false,
      platform: navigator.platform || 'browser',
      touchPoints: navigator.maxTouchPoints || 0,
    });
    setNode('web', descriptor);
    emit({ lane: 'runtime', kind: 'host-detected', source: 'host-bridge', target: HOST_NODE, payload: descriptor });
    return descriptor;
  }

  try {
    const descriptor = Object.freeze(await invoke('host_capabilities'));
    setNode('tauri', descriptor);
    emit({ lane: 'runtime', kind: 'host-detected', source: 'host-bridge', target: HOST_NODE, payload: descriptor });
    return descriptor;
  } catch (error) {
    const descriptor = Object.freeze({ mode: 'tauri', privileged: false, error: String(error?.message || error) });
    setNode('degraded', descriptor);
    emit({ lane: 'runtime', kind: 'host-detection-failed', source: 'host-bridge', target: HOST_NODE, payload: descriptor });
    return descriptor;
  }
}

async function invokeBounded(command, args = {}) {
  const invoke = tauriInvoke();
  if (!invoke) throw new Error('Tauri host bridge is not available on this surface.');
  const requestId = globalThis.crypto?.randomUUID?.() || `host-${Date.now()}`;
  emit({ lane: 'capability', kind: 'host-command-requested', source: 'workspace', target: command, requestId, payload: { command } });
  try {
    const result = await invoke(command, args);
    emit({ lane: 'capability', kind: 'host-command-completed', source: command, target: 'workspace', requestId, payload: { command, result } });
    return result;
  } catch (error) {
    emit({ lane: 'capability', kind: 'host-command-failed', source: command, target: 'workspace', requestId, payload: { command, error: String(error?.message || error) } });
    throw error;
  }
}

globalThis.HouseHostBridge = Object.freeze({
  detectHost,
  invoke: invokeBounded,
  isTauri: () => Boolean(tauriInvoke()),
});

queueMicrotask(detectHost);
