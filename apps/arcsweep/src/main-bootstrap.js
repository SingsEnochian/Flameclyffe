const app = document.querySelector('#app');
const params = new URLSearchParams(location.search);
const safeBoot = params.get('safe') === '1';

if (app && !app.hasChildNodes()) {
  app.innerHTML = `
    <main style="min-height:100vh;display:grid;place-items:center;padding:2rem;background:#0b0f0e;color:#f0eadb;font-family:system-ui,sans-serif">
      <section style="max-width:42rem">
        <p style="letter-spacing:.12em;text-transform:uppercase;opacity:.72">Hearthgate · Arcsweep</p>
        <h1 style="font-size:clamp(2rem,6vw,4rem);margin:.25rem 0 1rem">Opening the house…</h1>
        <p id="arcsweep-boot-status" style="line-height:1.6;opacity:.86">${safeBoot ? 'Safe Boot active. Opening without reading or overwriting saved local state.' : 'Loading local state. Runtime services may join after the interface is ready.'}</p>
        ${safeBoot ? '' : '<p style="margin-top:1.25rem"><a href="?safe=1" style="color:#d8b56a;font-weight:700">Open with Safe Boot →</a><br><small style="opacity:.72">Safe Boot leaves your existing local state untouched and starts with a temporary in-memory state.</small></p>'}
      </section>
    </main>`;
}

const status = (message) => {
  const node = document.querySelector('#arcsweep-boot-status');
  if (node) node.textContent = message;
};

// Hosted Arcsweep is a browser programme. Never let an unrelated global namespace
// masquerade as the Electron persistence bridge during module initialisation.
if (/^https?:$/.test(location.protocol)) {
  try { window.arcsweepDesktop = null; } catch {}
  try {
    if (window.arcsweep && typeof window.arcsweep.loadState === 'function') {
      window.__arcsweepHostedNamespace = window.arcsweep;
      window.arcsweep = null;
    }
  } catch {}
}

// Safe Boot is deliberately non-destructive. It hides Arcsweep's persisted browser
// state from this boot only and prevents this temporary session from overwriting it.
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
} else {
  // Local persistence failure must not veto first render. Keep the in-memory state alive
  // and let Settings report persistence trouble instead of crashing the whole programme.
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

let finished = false;
const slowTimer = setTimeout(() => {
  if (!finished) status(safeBoot
    ? 'Safe Boot is still taking longer than expected. The remaining fault is outside saved local state.'
    : 'Local-state hydration is taking longer than expected. Use Safe Boot below to open without touching the saved payload.');
}, 3500);

try {
  await import('./main.js');
  finished = true;
  clearTimeout(slowTimer);
} catch (error) {
  finished = true;
  clearTimeout(slowTimer);
  console.error('[Arcsweep] bootstrap failed', error);
  if (app) {
    app.innerHTML = `
      <main style="min-height:100vh;display:grid;place-items:center;padding:2rem;background:#0b0f0e;color:#f0eadb;font-family:system-ui,sans-serif">
        <section style="max-width:46rem">
          <p style="letter-spacing:.12em;text-transform:uppercase;opacity:.72">Hearthgate · Arcsweep</p>
          <h1 style="font-size:clamp(2rem,6vw,4rem);margin:.25rem 0 1rem">The house did not finish opening.</h1>
          <p style="line-height:1.6">Startup failed visibly instead of spinning forever. ${safeBoot ? 'Safe Boot was active, so saved local state was not involved.' : 'Try Safe Boot to isolate the saved local state without deleting it.'}</p>
          ${safeBoot ? '' : '<p><a href="?safe=1" style="color:#d8b56a;font-weight:700">Open with Safe Boot →</a></p>'}
          <pre style="white-space:pre-wrap;overflow-wrap:anywhere;padding:1rem;background:#111816;border:1px solid #34443e;border-radius:.75rem">${String(error?.message || error).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}</pre>
        </section>
      </main>`;
  }
}
