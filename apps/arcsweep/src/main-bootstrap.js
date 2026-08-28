const app = document.querySelector('#app');
const params = new URLSearchParams(location.search);
const safeBoot = params.get('safe') === '1';
const normalBootRequested = params.get('open') === '1';
const mobileViewport = window.matchMedia?.('(max-width: 820px)')?.matches ?? false;
const mobileLauncher = mobileViewport && !safeBoot && !normalBootRequested;

const actionStyle = 'min-height:48px;min-width:12rem;padding:.78rem 1rem;border:1px solid #d8b56a;border-radius:.75rem;background:#1a211e;color:#f3d48e;font:700 1rem/1.2 system-ui,sans-serif;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;touch-action:manipulation;-webkit-tap-highlight-color:rgba(216,181,106,.18)';
const quietActionStyle = `${actionStyle};border-color:#53635d;color:#d8e2dc;background:#111816`;

const safeBootLink = () => `<a id="arcsweep-safe-boot" href="./?safe=1" style="${actionStyle}">Open with Safe Boot →</a>`;
const normalBootLink = () => `<a id="arcsweep-normal-boot" href="./?open=1" style="${actionStyle}">Open Arcsweep →</a>`;

function renderMobileLauncher() {
  if (!app) return;
  app.innerHTML = `
    <main data-arcsweep-recovery="launcher" style="min-height:100vh;min-height:100dvh;display:grid;place-items:center;padding:2rem;background:#0b0f0e;color:#f0eadb;font-family:system-ui,sans-serif;position:relative;z-index:1;pointer-events:auto">
      <section style="max-width:42rem;width:100%">
        <p style="letter-spacing:.12em;text-transform:uppercase;opacity:.72">Hearthgate · Arcsweep</p>
        <h1 style="font-size:clamp(2rem,10vw,3.4rem);margin:.25rem 0 1rem">Open the house</h1>
        <p style="line-height:1.6;opacity:.86">Choose how Arcsweep should start on this phone. Nothing heavy loads until you tap.</p>
        <div style="margin-top:1.25rem;display:grid;gap:.75rem;justify-items:stretch">
          ${normalBootLink()}
          ${safeBootLink()}
        </div>
        <p style="margin-top:1rem;line-height:1.5;opacity:.7;font-size:.9rem">Normal boot uses your saved local state. Safe Boot leaves it untouched and starts core-only with temporary in-memory state.</p>
      </section>
    </main>`;
}

const safeBootMarkup = () => safeBoot ? '' : `
  <div style="margin-top:1.25rem;display:grid;gap:.55rem;justify-items:start">
    ${safeBootLink()}
    <small style="opacity:.72;line-height:1.45">Safe Boot leaves your existing local state untouched and starts core-only.</small>
  </div>`;

function renderOpening() {
  if (!app || app.hasChildNodes()) return;
  app.innerHTML = `
    <main data-arcsweep-recovery="boot" style="min-height:100vh;min-height:100dvh;display:grid;place-items:center;padding:2rem;background:#0b0f0e;color:#f0eadb;font-family:system-ui,sans-serif;position:relative;z-index:1;pointer-events:auto">
      <section style="max-width:42rem;width:100%">
        <p style="letter-spacing:.12em;text-transform:uppercase;opacity:.72">Hearthgate · Arcsweep</p>
        <h1 style="font-size:clamp(2rem,6vw,4rem);margin:.25rem 0 1rem">Opening the house…</h1>
        <p id="arcsweep-boot-status" style="line-height:1.6;opacity:.86">${safeBoot ? 'Safe Boot active. Opening core Arcsweep only; saved state and sidecars are isolated.' : 'Loading core state. Runtime services will join only after the interface is ready.'}</p>
        ${safeBootMarkup()}
      </section>
    </main>`;
}

const status = (message) => {
  const node = document.querySelector('#arcsweep-boot-status');
  if (node) node.textContent = message;
};

function prepareHostedBoundary() {
  if (!/^https?:$/.test(location.protocol)) return;
  try { window.arcsweepDesktop = null; } catch {}
  try {
    if (window.arcsweep && typeof window.arcsweep.loadState === 'function') {
      window.__arcsweepHostedNamespace = window.arcsweep;
      window.arcsweep = null;
    }
  } catch {}
}

function installStorageBoundary() {
  if (safeBoot) {
    try {
      const nativeGetItem = Storage.prototype.getItem;
      const nativeSetItem = Storage.prototype.setItem;
      const hiddenKeys = (key) => String(key) === 'hearthgate.arcsweep.local.v0.1' || String(key).startsWith('hearthgate.arcsweep.');
      Storage.prototype.getItem = function arcsweepSafeBootGetItem(key) {
        if (hiddenKeys(key)) return null;
        return nativeGetItem.call(this, key);
      };
      Storage.prototype.setItem = function arcsweepSafeBootSetItem(key, value) {
        if (hiddenKeys(key)) return undefined;
        return nativeSetItem.call(this, key, value);
      };
      window.__arcsweepSafeBoot = true;
    } catch (error) {
      console.warn('[Arcsweep] Safe Boot storage isolation could not be installed.', error);
    }
    return;
  }

  try {
    const nativeSetItem = Storage.prototype.setItem;
    if (!Storage.prototype.__arcsweepFailSoftInstalled) {
      Storage.prototype.setItem = function arcsweepFailSoftSetItem(key, value) {
        try {
          return nativeSetItem.call(this, key, value);
        } catch (error) {
          if (String(key) === 'hearthgate.arcsweep.local.v0.1' || String(key).startsWith('hearthgate.arcsweep.')) {
            console.warn('[Arcsweep] local persistence unavailable; continuing in memory.', error);
            window.dispatchEvent(new CustomEvent('arcsweep:persistence-degraded', { detail: { key: String(key), message: error?.message || String(error) } }));
            return undefined;
          }
          throw error;
        }
      };
      Object.defineProperty(Storage.prototype, '__arcsweepFailSoftInstalled', { value: true, configurable: true });
    }
  } catch {}
}

function renderFailure(error) {
  if (!app) return;
  app.innerHTML = `
    <main data-arcsweep-recovery="error" style="min-height:100vh;min-height:100dvh;display:grid;place-items:center;padding:2rem;background:#0b0f0e;color:#f0eadb;font-family:system-ui,sans-serif;position:relative;z-index:1;pointer-events:auto">
      <section style="max-width:46rem;width:100%">
        <p style="letter-spacing:.12em;text-transform:uppercase;opacity:.72">Hearthgate · Arcsweep</p>
        <h1 style="font-size:clamp(2rem,6vw,4rem);margin:.25rem 0 1rem">The house did not finish opening.</h1>
        <p style="line-height:1.6">Startup failed visibly instead of spinning forever. ${safeBoot ? 'Safe Boot isolated saved state and sidecars, so this fault is in core initialisation.' : 'Try Safe Boot to isolate saved state and sidecars without deleting anything.'}</p>
        ${safeBootMarkup()}
        <pre style="white-space:pre-wrap;overflow-wrap:anywhere;padding:1rem;background:#111816;border:1px solid #34443e;border-radius:.75rem">${String(error?.message || error).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}</pre>
      </section>
    </main>`;
}

async function openCore() {
  renderOpening();
  prepareHostedBoundary();
  installStorageBoundary();

  let finished = false;
  const slowTimer = setTimeout(() => {
    if (!finished) status(safeBoot
      ? 'Safe Boot core is still taking longer than expected. The remaining fault is in core state initialisation.'
      : 'Core state hydration is taking longer than expected. Safe Boot isolates state and sidecars.');
  }, 3500);

  try {
    // Allow the recovery surface to paint and remain tappable before core evaluation begins.
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
    if (!safeBoot) {
      status('Checking the durable House copy before local state opens…');
      const { installDurableWorkspaceState } = await import('./durable-workspace-state.js');
      const durable = await installDurableWorkspaceState({ safeBoot: false });
      if (durable.state === 'restored-cloud') status('Recovered the saved House workspace. Opening Arcsweep…');
      else if (durable.state === 'mirrored-local' || durable.state === 'in-sync') status('Saved workspace verified. Opening Arcsweep…');
      else if (durable.state === 'deferred' || durable.state === 'degraded') status('Cloud recovery is temporarily unavailable. Opening the local copy without replacing it…');
    }
    await import('./qualia-ui-preload.js');
    await import('./main.js');
    finished = true;
    clearTimeout(slowTimer);
    window.dispatchEvent(new CustomEvent('arcsweep:core-ready', { detail: { safeBoot } }));

    if (!safeBoot) {
      setTimeout(() => {
        import('./sidecar-bootstrap.js')
          .then(({ mountArcsweepSidecars }) => mountArcsweepSidecars())
          .catch((error) => console.error('[Arcsweep] sidecar bootstrap failed', error));
      }, 0);
    }
  } catch (error) {
    finished = true;
    clearTimeout(slowTimer);
    console.error('[Arcsweep] bootstrap failed', error);
    renderFailure(error);
  }
}

if (mobileLauncher) {
  renderMobileLauncher();
} else {
  await openCore();
}