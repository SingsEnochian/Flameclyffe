/* DEEP Observer Interface Cloak v0.3 */
'use strict';

(() => {
  const POSITION_REASON = 'cloak-anchor';

  function emitCloakState(cloaked) {
    window.dispatchEvent(new CustomEvent('deep-observer:cloak', {
      detail: { cloaked }
    }));
  }

  function positionButton() {
    const button = document.getElementById('interfaceCloakToggle');
    if (!button) return;

    const rect = button.getBoundingClientRect();
    let point = null;
    if (window.DEEP_OBSERVER_HUD?.defaultPanelPosition) {
      point = window.DEEP_OBSERVER_HUD.defaultPanelPosition(rect.width || 108, rect.height || 44, 'right');
    } else {
      point = {
        x: window.innerWidth - (rect.width || 108) - 16,
        y: Math.max(16, Math.round(window.innerHeight * 0.42))
      };
    }

    button.style.left = `${point.x}px`;
    button.style.top = `${point.y}px`;
    button.style.right = 'auto';
    button.style.bottom = 'auto';
    button.dataset.anchorReason = POSITION_REASON;
  }

  function ensureButton() {
    if (document.getElementById('interfaceCloakToggle')) return;
    const button = document.createElement('button');
    button.id = 'interfaceCloakToggle';
    button.className = 'interface-cloak-toggle';
    button.type = 'button';
    button.textContent = 'Hide UI';
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', 'Hide or show DEEP Observer interface');
    document.body.appendChild(button);
    window.requestAnimationFrame(positionButton);

    button.addEventListener('click', () => {
      const cloaked = document.body.classList.toggle('interface-cloaked');
      button.textContent = cloaked ? 'Show UI' : 'Hide UI';
      button.setAttribute('aria-pressed', String(cloaked));
      window.requestAnimationFrame(positionButton);
      emitCloakState(cloaked);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    ensureButton();
    emitCloakState(document.body.classList.contains('interface-cloaked'));
    window.addEventListener('resize', positionButton, { passive: true });
    window.addEventListener('orientationchange', () => window.setTimeout(positionButton, 180), { passive: true });
    window.addEventListener('deep-observer:hud-bounds', positionButton, { passive: true });
  });
})();
