'use strict';

/*
  Elara Codex Bootstrap v0.1
  Loads the canonical source manifest, chapter provenance, shared temporal
  renderer, harmonic layers, chord adapter, and source-to-sound bridge into
  the existing Möbius Tone Lab without duplicating the laboratory shell.
*/

(function () {
  const current = document.currentScript?.src || '';
  const assetBase = current ? new URL('./', current) : new URL('../assets/', window.location.href);

  const sources = [
    'mobius-temporal-projection.js?v=0.1.0',
    'elara-chord-temporal-adapter.js?v=0.1.0',
    'elara-codex-source.js?v=1.0.0',
    'elara-codex-chapters-01.js?v=1.0.0',
    'elara-codex-chapters-02.js?v=1.0.0',
    'elara-codex-chapters-03.js?v=1.0.0',
    'elara-codex-chapters-04.js?v=1.0.0',
    'elara-codex-chapters-05.js?v=1.0.0',
    'elara-codex-chapters-06.js?v=1.0.0',
    'elara-codex-bridge.js?v=0.1.0'
  ];

  function normalized(url) {
    try {
      const parsed = new URL(url, window.location.href);
      parsed.search = '';
      parsed.hash = '';
      return parsed.href;
    } catch (error) {
      return String(url || '').split(/[?#]/)[0];
    }
  }

  function alreadyLoaded(url) {
    const target = normalized(url);
    return [...document.scripts].some((script) => normalized(script.src) === target);
  }

  function loadScript(relative) {
    const url = new URL(relative, assetBase).href;
    if (alreadyLoaded(url)) return Promise.resolve(url);
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = false;
      script.dataset.elaraBootstrap = 'true';
      script.addEventListener('load', () => resolve(url), { once: true });
      script.addEventListener('error', () => reject(new Error(`Could not load ${relative}`)), { once: true });
      document.head.appendChild(script);
    });
  }

  function addCodexNavigation() {
    const nav = document.querySelector('.nav');
    if (!nav || nav.querySelector('[data-elara-codex-nav]')) return;
    const link = document.createElement('a');
    link.className = 'btn';
    link.href = './elara-codex.html';
    link.textContent = 'Elara Codex';
    link.dataset.elaraCodexNav = 'true';
    const groundwire = [...nav.querySelectorAll('a')].find((item) => item.textContent.includes('DEEP + Groundwire'));
    if (groundwire) nav.insertBefore(link, groundwire);
    else nav.appendChild(link);
  }

  function updateLabIdentity() {
    document.title = 'STARWELL Möbius Tone Lab v0.7';
    const brand = document.querySelector('.brand span');
    if (brand) brand.textContent = 'Möbius Tone Lab v0.7';
    const heading = document.querySelector('h1#title');
    if (heading) heading.textContent = 'Möbius Tone Lab';
    const subtitle = document.querySelector('.hero .subtitle');
    if (subtitle) {
      subtitle.textContent = 'A controlled laboratory for canonical Elara source chapters, two temporal versions of every twist, harmonic layers, narrative chord progressions, Sanctuary focus layers, and bounded DEEP/Groundwire audio mapping.';
    }
  }

  function updateToneMap() {
    const heading = [...document.querySelectorAll('.card h2')].find((node) => node.textContent.trim() === 'Tone map');
    const list = heading?.closest('.card')?.querySelector('.tone-list');
    if (!list || list.querySelector('[data-elara-temporal-note]')) return;

    const temporal = document.createElement('li');
    temporal.dataset.elaraTemporalNote = 'true';
    temporal.innerHTML = '<strong>Temporal renderer:</strong> every tonal path runs as Canonical 2025 <code>×1.00</code> or First Spiral Return 2026 <code>×1.15</code>, with optional <code>2×–5×</code> harmonic layers.';

    const source = document.createElement('li');
    source.dataset.elaraSourceNote = 'true';
    source.innerHTML = '<strong>Elara source chapter:</strong> the original Codex supplies the written tone order, narrative roles, mathematical transformation, and playback receipt.';

    list.append(temporal, source);
  }

  function setStatus(text) {
    const status = document.getElementById('mobius-status');
    if (status) status.textContent = text;
  }

  async function boot() {
    try {
      for (const source of sources) await loadScript(source);
      addCodexNavigation();
      updateLabIdentity();
      updateToneMap();
      setStatus('Elara Codex connected. Source text, narrative order, temporal mathematics, and harmonic sound paths are ready. Sound still requires a tap.');
      window.dispatchEvent(new CustomEvent('elara-codex:connected', {
        detail: {
          sourceSha256: window.ElaraCodexSource?.source?.textSha256 || null,
          chapters: window.ElaraCodexSource?.chapters?.length || 0,
          projection: window.MobiusTemporalProjection?.getState?.() || null
        }
      }));
    } catch (error) {
      console.error('[Elara Codex Bootstrap]', error);
      setStatus(`Elara connection error: ${error.message}`);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
