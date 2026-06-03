/* DEEP Observer Interface Cloak v0.2 */
'use strict';

(() => {
  function emitCloakState(cloaked) {
    window.dispatchEvent(new CustomEvent('deep-observer:cloak', {
      detail: { cloaked }
    }));
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

    button.addEventListener('click', () => {
      const cloaked = document.body.classList.toggle('interface-cloaked');
      button.textContent = cloaked ? 'Show UI' : 'Hide UI';
      button.setAttribute('aria-pressed', String(cloaked));
      emitCloakState(cloaked);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    ensureButton();
    emitCloakState(document.body.classList.contains('interface-cloaked'));
  });
})();
