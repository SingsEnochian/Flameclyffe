/* DEEP Observer Resonance Adapter v1
   Bridges the existing Sensory Engine panel to the shared DeepResonanceBus. */
'use strict';

(() => {
  const ready = fn => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn();

  function statusText(busState) {
    const source = busState?.source || 'fallback';
    return busState?.active
      ? `Resonance Bus layered · ${busState.soft ? 'soft' : 'full'} · source ${source}`
      : `Gem clicks ready · Resonance Bus idle · source ${source}`;
  }

  function syncStatus() {
    const status = document.getElementById('sensoryStatus');
    const bus = window.DeepResonanceBus;
    if (!status || !bus) return;
    status.textContent = statusText(bus.getState());
  }

  function decoratePanel() {
    const panel = document.getElementById('sensoryPanel');
    if (!panel || panel.dataset.resonanceAdapter === 'true') return false;
    panel.dataset.resonanceAdapter = 'true';

    const title = panel.querySelector('.sensory-title span');
    if (title) title.textContent = 'Resonance Bus';

    const hum = document.getElementById('sensoryHum');
    if (hum) {
      hum.textContent = 'Field';
      hum.setAttribute('title', 'Start the layered DEEP-driven resonance field.');
    }

    const details = panel.querySelector('.sensory-details');
    if (details && !document.getElementById('resonanceHint')) {
      const hint = document.createElement('small');
      hint.id = 'resonanceHint';
      hint.className = 'resonance-hint';
      hint.textContent = 'Field maps P/C/R/E/M/A, H, charge, moon, Kp, and Bz into layered panning sound.';
      details.appendChild(hint);
    }
    syncStatus();
    return true;
  }

  async function toggleField(event) {
    const bus = window.DeepResonanceBus;
    if (!bus) return;
    const button = document.getElementById('sensoryHum');
    const low = document.getElementById('sensoryLow')?.getAttribute('aria-pressed') === 'true';

    if (bus.isActive()) {
      bus.stop();
      if (button) {
        button.textContent = 'Field';
        button.setAttribute('aria-pressed', 'false');
      }
    } else {
      await bus.start({ packetSelector: '#packet', soft: low });
      if (button) {
        button.textContent = 'Field On';
        button.setAttribute('aria-pressed', 'true');
      }
      bus.ping('field', { intensity: .72 });
    }
    syncStatus();
    event?.stopImmediatePropagation?.();
  }

  function bind() {
    if (!window.DeepResonanceBus) return;
    const hum = document.getElementById('sensoryHum');
    const low = document.getElementById('sensoryLow');
    const enable = document.getElementById('sensoryEnable');

    if (hum && hum.dataset.resonanceBound !== 'true') {
      hum.dataset.resonanceBound = 'true';
      hum.addEventListener('click', toggleField, true);
    }

    if (low && low.dataset.resonanceBound !== 'true') {
      low.dataset.resonanceBound = 'true';
      low.addEventListener('click', () => {
        window.setTimeout(() => {
          const soft = low.getAttribute('aria-pressed') === 'true';
          window.DeepResonanceBus?.setSoft(soft);
          syncStatus();
        }, 0);
      });
    }

    if (enable && enable.dataset.resonanceBound !== 'true') {
      enable.dataset.resonanceBound = 'true';
      enable.addEventListener('click', () => {
        window.setTimeout(() => {
          const enabled = enable.getAttribute('aria-pressed') === 'true';
          if (!enabled && window.DeepResonanceBus?.isActive()) window.DeepResonanceBus.stop();
          syncStatus();
        }, 0);
      });
    }

    document.addEventListener('pointerdown', event => {
      const bus = window.DeepResonanceBus;
      if (!bus?.isActive?.()) return;
      if (event.target.closest?.('#sensoryPanel')) return;
      const kind = event.target.closest?.('[data-reading="time"], [data-meter="time"]') ? 'time'
        : event.target.closest?.('#copyPacket, #saveLocal, .action') ? 'packet'
        : event.target.closest?.('canvas') ? 'canvas'
        : event.target.closest?.('[data-filter], .filter, #themeBtn, #toyBtn, #stimBtn, .interface-cloak-toggle') ? 'toggle'
        : event.target.closest?.('[data-reading], .sensor-node, [data-meter], .meter') ? 'gem'
        : null;
      if (!kind) return;
      bus.ping(kind, { intensity: kind === 'time' ? .9 : .55 });
    }, { passive: true });

    window.addEventListener('deep-resonance:state', syncStatus);
  }

  ready(() => {
    const timer = window.setInterval(() => {
      const decorated = decoratePanel();
      bind();
      if (decorated && document.getElementById('sensoryHum')) window.clearInterval(timer);
    }, 160);
    window.setTimeout(() => window.clearInterval(timer), 5000);
  });
})();
