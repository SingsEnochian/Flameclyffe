'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig:    ()    => ipcRenderer.invoke('get-config'),
  saveConfig:   (cfg) => ipcRenderer.invoke('save-config', cfg),
  openWizard:   ()    => ipcRenderer.invoke('open-wizard'),
  goHome:       ()    => ipcRenderer.invoke('go-home'),
});

// Every packaged room gets an escape hatch, including legacy and imported
// surfaces that do not yet share Hearthgate's navigation component.
window.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('[data-hearthgate-home], .home[data-view="home"]')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.hearthgateHome = 'true';
  button.textContent = '⌂ Home';
  button.setAttribute('aria-label', 'Return to Hearthgate home');
  Object.assign(button.style, {
    position: 'fixed', top: '12px', right: '12px', zIndex: '2147483647',
    padding: '8px 12px', borderRadius: '7px', border: '1px solid rgba(120,220,175,.5)',
    background: 'rgba(5,12,9,.92)', color: '#8ff0bf', font: '700 12px system-ui', cursor: 'pointer',
  });
  button.addEventListener('click', () => ipcRenderer.invoke('go-home'));
  document.body.appendChild(button);
});
