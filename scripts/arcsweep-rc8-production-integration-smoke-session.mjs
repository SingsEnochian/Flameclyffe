const nativeFetch = globalThis.fetch.bind(globalThis);
const base = String(process.env.BASE_URL || 'https://flameclyffe.vercel.app').replace(/\/$/, '');

// The rc.8 browser proof needs a trusted sealed House session, but it does not
// need Caretaker/Ollama health. Redirect only the bootstrap request used by the
// existing integration driver to the model-independent OIDC session endpoint.
globalThis.fetch = async (input, init) => {
  const raw = typeof input === 'string' || input instanceof URL ? String(input) : String(input?.url || '');
  try {
    const url = new URL(raw, base);
    if (url.origin === new URL(base).origin
      && url.pathname === '/api/v1/house/smoke'
      && url.searchParams.get('target') === 'caretaker') {
      return nativeFetch(`${base}/api/v1/house/smoke-session`, init);
    }
  } catch {
    // Non-URL inputs fall through unchanged.
  }
  return nativeFetch(input, init);
};

await import('./arcsweep-rc8-production-integration-smoke.mjs');
