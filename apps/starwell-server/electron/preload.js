'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig:  ()    => ipcRenderer.invoke('get-config'),
  saveConfig: (cfg) => ipcRenderer.invoke('save-config', cfg),
  openWizard: ()    => ipcRenderer.invoke('open-wizard'),
});

contextBridge.exposeInMainWorld('arcsweep', Object.freeze({
  loadState:      ()           => ipcRenderer.invoke('arcsweep:state:load'),
  saveState:      (state, meta) => ipcRenderer.invoke('arcsweep:state:save', state, meta ?? {}),
  exportState:    (state)      => ipcRenderer.invoke('arcsweep:state:export', state),
  importState:    ()           => ipcRenderer.invoke('arcsweep:state:import'),
  getStorageInfo: ()           => ipcRenderer.invoke('arcsweep:storage:info'),
  createBackup:   (reason)     => ipcRenderer.invoke('arcsweep:backup:create', reason ?? 'manual'),
  listBackups:    ()           => ipcRenderer.invoke('arcsweep:backup:list'),
  restoreBackup:  (name)       => ipcRenderer.invoke('arcsweep:backup:restore', name),
  addAttachments: ()           => ipcRenderer.invoke('arcsweep:attachment:add'),
  openAttachment: (attachment) => ipcRenderer.invoke('arcsweep:attachment:open', attachment),
  showDataFolder: ()           => ipcRenderer.invoke('arcsweep:storage:show'),
  runtime: Object.freeze({ host: 'hearthgate', mode: 'electron-hosted', platform: process.platform }),
}));
