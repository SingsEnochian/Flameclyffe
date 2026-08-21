'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (cfg) => ipcRenderer.invoke('save-config', cfg),
  openWizard: () => ipcRenderer.invoke('open-wizard'),
  selectAssetWatchDirectory: () => ipcRenderer.invoke('asset-watch-select'),
  startAssetWatch: (watchId) => ipcRenderer.invoke('asset-watch-start', { watch_id: String(watchId || '') }),
  stopAssetWatch: (watchId) => ipcRenderer.invoke('asset-watch-stop', { watch_id: String(watchId || '') }),
  onAssetWatchEvent: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('asset-watch:event', handler);
    return () => ipcRenderer.removeListener('asset-watch:event', handler);
  },
});
