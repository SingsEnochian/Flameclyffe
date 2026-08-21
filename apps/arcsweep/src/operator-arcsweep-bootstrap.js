const MODULES = [
  './observer-bridge.js',
  './feedback-queue-bootstrap.js',
  './rich-text-core.js',
  './main.js',
  './world-registry-persistence-sidecar.js',
  './terra-prime-waking-world-sidecar.js',
  './instrument-sidecars.js',
  './react-ion-helm-sidecar.js',
  './glyph-drift-observatory-sidecar.js',
  './continuity-evidence-sidecar.js',
  './continuity-experiment-sidecar.js',
  './constellation-runtime-adapter.js',
  './model-presence-bus.js',
  './model-presence-live-ui.js',
  './runtime-presence-diagnostics.js',
  './runtime-integration-bootstrap.js',
  './house-commons-chat-v3.js',
  './runtime-envelope-live-ui.js',
  './canon-intelligence-live-ui.js',
  './constellation-presence.js',
  './runtime-world-presence.js',
  './self-authorship-panel.js',
  './script-cortex-controls.js',
  './scene-cognition-ui.js',
  './worldseed-live-ui.js',
  './possible-worlds-live-ui.js',
  './worldseed-package-live-ui.js',
  './worldseed-threshold-live-ui.js',
  './worldseed-braid-live-ui.js',
  './worldseed-seed-library-live-ui.js',
  './canon-web-link-sidecar.js',
];

function hasState(value) {
  return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0;
}

function installOperatorBadge(profile, workspace, onExit) {
  const badge = document.createElement('aside');
  badge.id = 'arcsweep-operator-badge';
  badge.setAttribute('aria-label', 'Private Arcsweep operator workspace');
  badge.innerHTML = `
    <strong>${workspace.display_name}</strong>
    <span>${workspace.variant_label}</span>
    <button type="button">Return to Varutóra Gate</button>
  `;
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
  badge.querySelector('strong').style.display = 'block';
  badge.querySelector('span').style.display = 'block';
  badge.querySelector('span').style.opacity = '.72';
  const button = badge.querySelector('button');
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
  button.addEventListener('click', onExit);
  document.body.append(badge);
}

export async function bootOperatorArcsweep({ supabase, profile, workspace, onExit }) {
  if (!supabase || !profile || !workspace?.slug) throw new Error('Operator workspace context is incomplete.');

  const storageKey = `hearthgate.arcsweep.local.v0.1::${workspace.slug}`;
  const observatoryKey = `hearthgate.arcsweep.domain-control-bench.v1::${workspace.slug}`;
  const feedbackQueueKey = `arcsweep.feedback-cycle-queue/v1::${workspace.slug}`;

  globalThis.__ARCSWEEP_OPERATOR_CONTEXT__ = Object.freeze({
    operatorKey: profile.operator_key,
    displayName: profile.display_name,
    accessLevel: profile.access_level,
    workspaceSlug: workspace.slug,
    variantLabel: workspace.variant_label,
  });
  globalThis.__ARCSWEEP_STORAGE_KEY__ = storageKey;
  globalThis.__ARCSWEEP_OBSERVATORY_MIRROR_KEY__ = observatoryKey;
  globalThis.__ARCSWEEP_FEEDBACK_QUEUE_KEY__ = feedbackQueueKey;
  document.documentElement.dataset.arcsweepOperator = profile.operator_key;
  document.documentElement.dataset.arcsweepWorkspace = workspace.slug;

  if (hasState(workspace.state)) {
    localStorage.setItem(storageKey, JSON.stringify(workspace.state));
  }

  const shell = document.querySelector('#gate-shell');
  const app = document.querySelector('#app');
  if (shell) shell.hidden = true;
  if (app) {
    app.hidden = false;
    app.innerHTML = '';
  }

  for (const modulePath of MODULES) await import(modulePath);

  installOperatorBadge(profile, workspace, () => {
    globalThis.location.href = './varutora-gate.html';
    onExit?.();
  });

  let lastMirrored = hasState(workspace.state) ? JSON.stringify(workspace.state) : null;
  let syncing = false;

  const mirror = async () => {
    if (syncing) return;
    const raw = localStorage.getItem(storageKey);
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
  globalThis.addEventListener('arcsweep:operator-workspace-stop', () => clearInterval(timer), { once: true });

  globalThis.dispatchEvent(new CustomEvent('arcsweep:operator-workspace-ready', {
    detail: globalThis.__ARCSWEEP_OPERATOR_CONTEXT__,
  }));
}
