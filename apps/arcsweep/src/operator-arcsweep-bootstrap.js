const MODULE_LOADERS = [
  () => import('./observer-bridge.js'),
  () => import('./feedback-queue-bootstrap.js'),
  () => import('./rich-text-core.js'),
  () => import('./main.js'),
  () => import('./world-registry-persistence-sidecar.js'),
  () => import('./terra-prime-waking-world-sidecar.js'),
  () => import('./instrument-sidecars.js'),
  () => import('./react-ion-helm-sidecar.js'),
  () => import('./glyph-drift-observatory-sidecar.js'),
  () => import('./continuity-evidence-sidecar.js'),
  () => import('./continuity-experiment-sidecar.js'),
  () => import('./constellation-runtime-adapter.js'),
  () => import('./model-presence-bus.js'),
  () => import('./model-presence-live-ui.js'),
  () => import('./runtime-presence-diagnostics.js'),
  () => import('./runtime-integration-bootstrap.js'),
  () => import('./house-commons-chat-v3.js'),
  () => import('./runtime-envelope-live-ui.js'),
  () => import('./canon-intelligence-live-ui.js'),
  () => import('./constellation-presence.js'),
  () => import('./runtime-world-presence.js'),
  () => import('./self-authorship-panel.js'),
  () => import('./script-cortex-controls.js'),
  () => import('./scene-cognition-ui.js'),
  () => import('./worldseed-live-ui.js'),
  () => import('./possible-worlds-live-ui.js'),
  () => import('./worldseed-package-live-ui.js'),
  () => import('./worldseed-threshold-live-ui.js'),
  () => import('./worldseed-braid-live-ui.js'),
  () => import('./worldseed-seed-library-live-ui.js'),
  () => import('./canon-web-link-sidecar.js'),
];

const ARCSWEEP_STORAGE_PREFIXES = ['arcsweep.', 'hearthgate.arcsweep.'];

function hasState(value) {
  return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0;
}

function installStorageNamespace(workspaceSlug) {
  const suffix = `::${workspaceSlug}`;
  const proto = Storage.prototype;
  const original = {
    getItem: proto.getItem,
    setItem: proto.setItem,
    removeItem: proto.removeItem,
    clear: proto.clear,
  };
  const mapKey = (key) => {
    const value = String(key);
    if (!ARCSWEEP_STORAGE_PREFIXES.some((prefix) => value.startsWith(prefix))) return value;
    return value.endsWith(suffix) ? value : `${value}${suffix}`;
  };

  proto.getItem = function getItem(key) {
    return original.getItem.call(this, this === localStorage ? mapKey(key) : key);
  };
  proto.setItem = function setItem(key, value) {
    return original.setItem.call(this, this === localStorage ? mapKey(key) : key, value);
  };
  proto.removeItem = function removeItem(key) {
    return original.removeItem.call(this, this === localStorage ? mapKey(key) : key);
  };
  proto.clear = function clear() {
    if (this !== localStorage) return original.clear.call(this);
    const keys = [];
    for (let index = 0; index < this.length; index += 1) {
      const key = this.key(index);
      if (key && key.endsWith(suffix) && ARCSWEEP_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) keys.push(key);
    }
    for (const key of keys) original.removeItem.call(this, key);
    return undefined;
  };

  return () => {
    proto.getItem = original.getItem;
    proto.setItem = original.setItem;
    proto.removeItem = original.removeItem;
    proto.clear = original.clear;
  };
}

function installOperatorBadge(profile, workspace, onExit) {
  const badge = document.createElement('aside');
  badge.id = 'arcsweep-operator-badge';
  badge.setAttribute('aria-label', 'Private Arcsweep operator workspace');

  const title = document.createElement('strong');
  title.textContent = workspace.display_name;
  title.style.display = 'block';

  const subtitle = document.createElement('span');
  subtitle.textContent = workspace.variant_label;
  subtitle.style.display = 'block';
  subtitle.style.opacity = '.72';

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Return to Varutóra Gate';
  button.addEventListener('click', onExit);

  badge.append(title, subtitle, button);
  Object.assign(badge.style, {
    position: 'fixed',
    zIndex: '99999',
    right: '1rem',
    bottom: '1rem',
    maxWidth: '18rem',
    padding: '.7rem .8rem',
    border: '1px solid rgba(255,213,142,.45)',
    borderRadius: '14px',
    background: 'rgba(3,7,12,.92)',
    color: '#eef9ff',
    boxShadow: '0 14px 50px rgba(0,0,0,.45)',
    font: '12px/1.35 system-ui, sans-serif',
  });
  Object.assign(button.style, {
    marginTop: '.55rem',
    width: '100%',
    border: '1px solid rgba(159,229,255,.35)',
    borderRadius: '10px',
    padding: '.4rem .55rem',
    background: '#08131f',
    color: '#eef9ff',
    cursor: 'pointer',
  });
  document.body.append(badge);
}

export async function bootOperatorArcsweep({ supabase, profile, workspace, onExit }) {
  if (!supabase || !profile || !workspace?.slug) throw new Error('Operator workspace context is incomplete.');

  const storageBaseKey = 'hearthgate.arcsweep.local.v0.1';
  const restoreStorage = installStorageNamespace(workspace.slug);

  globalThis.__ARCSWEEP_OPERATOR_CONTEXT__ = Object.freeze({
    operatorKey: profile.operator_key,
    displayName: profile.display_name,
    accessLevel: profile.access_level,
    workspaceSlug: workspace.slug,
    variantLabel: workspace.variant_label,
  });
  document.documentElement.dataset.arcsweepOperator = profile.operator_key;
  document.documentElement.dataset.arcsweepWorkspace = workspace.slug;

  if (hasState(workspace.state)) {
    localStorage.setItem(storageBaseKey, JSON.stringify(workspace.state));
  }

  const shell = document.querySelector('#gate-shell');
  const app = document.querySelector('#app');
  if (shell) shell.hidden = true;
  if (app) {
    app.hidden = false;
    app.innerHTML = '';
  }

  try {
    for (const loadModule of MODULE_LOADERS) await loadModule();
  } catch (error) {
    restoreStorage();
    throw error;
  }

  installOperatorBadge(profile, workspace, () => {
    restoreStorage();
    globalThis.location.href = './varutora-gate.html';
    onExit?.();
  });

  let lastMirrored = hasState(workspace.state) ? JSON.stringify(workspace.state) : null;
  let syncing = false;

  const mirror = async () => {
    if (syncing) return;
    const raw = localStorage.getItem(storageBaseKey);
    if (!raw || raw === lastMirrored) return;
    let parsed;
    try { parsed = JSON.parse(raw); } catch { return; }
    syncing = true;
    try {
      const { error } = await supabase
        .from('arcsweep_private_workspaces')
        .update({ state: parsed, updated_at: new Date().toISOString() })
        .eq('slug', workspace.slug);
      if (!error) {
        lastMirrored = raw;
        globalThis.dispatchEvent(new CustomEvent('arcsweep:operator-workspace-synced', {
          detail: { workspaceSlug: workspace.slug, syncedAt: new Date().toISOString() },
        }));
      } else {
        console.warn('[Arcsweep operator sync] Supabase mirror failed:', error.message);
      }
    } finally {
      syncing = false;
    }
  };

  const timer = setInterval(() => void mirror(), 5000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void mirror();
  });
  globalThis.addEventListener('pagehide', () => void mirror(), { once: true });
  globalThis.addEventListener('arcsweep:operator-workspace-stop', () => {
    clearInterval(timer);
    restoreStorage();
  }, { once: true });

  globalThis.dispatchEvent(new CustomEvent('arcsweep:operator-workspace-ready', {
    detail: globalThis.__ARCSWEEP_OPERATOR_CONTEXT__,
  }));
}
