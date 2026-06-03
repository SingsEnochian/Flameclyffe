/* DEEP Observer Interface Cloak v0.1 */
'use strict';

(() => {
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
    });
  }

  document.addEventListener('DOMContentLoaded', ensureButton);
})();
