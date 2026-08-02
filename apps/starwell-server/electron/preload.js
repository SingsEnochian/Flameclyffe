'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig:              ()        => ipcRenderer.invoke('get-config'),
  saveConfig:             (cfg)     => ipcRenderer.invoke('save-config', cfg),
  openWizard:             ()        => ipcRenderer.invoke('open-wizard'),
  launchBifrostTerminal:  ()        => ipcRenderer.invoke('launch-bifrost-terminal'),
  launchMathSpine:        (payload) => ipcRenderer.invoke('launch-math-spine', payload),
});
