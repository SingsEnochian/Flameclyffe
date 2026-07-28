'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('arcsweepDesktop', Object.freeze({
  loadState: () => ipcRenderer.invoke('arcsweep:state:load'),
  saveState: (state, meta = {}) => ipcRenderer.invoke('arcsweep:state:save', state, meta),
  exportState: (state) => ipcRenderer.invoke('arcsweep:state:export', state),
  importState: () => ipcRenderer.invoke('arcsweep:state:import'),
  getStorageInfo: () => ipcRenderer.invoke('arcsweep:storage:info'),
  createBackup: (reason = 'manual') => ipcRenderer.invoke('arcsweep:backup:create', reason),
  listBackups: () => ipcRenderer.invoke('arcsweep:backup:list'),
  restoreBackup: (name) => ipcRenderer.invoke('arcsweep:backup:restore', name),
  addAttachments: () => ipcRenderer.invoke('arcsweep:attachment:add'),
  openAttachment: (attachment) => ipcRenderer.invoke('arcsweep:attachment:open', attachment),
  listCanons: () => ipcRenderer.invoke('arcsweep:canon:list'),
  readCanon: (canonId) => ipcRenderer.invoke('arcsweep:canon:read', canonId),
  uploadCanonFiles: (options) => ipcRenderer.invoke('arcsweep:canon:upload-files', options),
  uploadCanonFolder: (options) => ipcRenderer.invoke('arcsweep:canon:upload-folder', options),
  downloadCanonJson: (canonId) => ipcRenderer.invoke('arcsweep:canon:export-json', canonId),
  downloadCanonFolder: (canonId) => ipcRenderer.invoke('arcsweep:canon:export-folder', canonId),
  showDataFolder: () => ipcRenderer.invoke('arcsweep:storage:show'),
  runtime: Object.freeze({ desktop: true, platform: process.platform }),
}));
