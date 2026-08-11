'use strict';

const {
  copyAttachment,
  createBackup,
  listBackups,
  readState,
  resolveAttachment,
  restoreBackup,
  writeStateAtomic,
} = require('./store.cjs');

/**
 * Register all Arcsweep IPC handlers on the provided ipcMain instance.
 *
 * Both the standalone Arcsweep Electron entry point and a future Hearthgate
 * host Electron app call this function. Neither caller needs to know the
 * channel names or the store internals.
 *
 * @param {object} opts
 * @param {object}   opts.ipcMain           - Electron ipcMain
 * @param {object}   opts.dialog            - Electron dialog
 * @param {object}   opts.shell             - Electron shell
 * @param {object}   opts.fsp               - node:fs/promises
 * @param {Function} opts.getWindow         - () => BrowserWindow | null
 * @param {object}   opts.storePaths        - paths returned by createStorePaths()
 * @param {string}   opts.appName           - display name for dialog titles
 * @param {string}   opts.appVersion        - version string for storage info
 * @param {Function} [opts.getDiagnosticsPath] - () => string | null; optional
 */
module.exports = function registerArcsweepIpc({
  ipcMain,
  dialog,
  shell,
  fsp,
  getWindow,
  storePaths,
  appName,
  appVersion,
  getDiagnosticsPath = () => null,
}) {
  let saveQueue = Promise.resolve();

  ipcMain.handle('arcsweep:state:load', async () => readState(storePaths));

  ipcMain.handle('arcsweep:state:save', async (_event, state, meta = {}) => {
    saveQueue = saveQueue.then(() => writeStateAtomic(storePaths, state, meta));
    return saveQueue;
  });

  ipcMain.handle('arcsweep:state:export', async (_event, state) => {
    const result = await dialog.showSaveDialog(getWindow(), {
      title: `Export ${appName} archive`,
      defaultPath: `hearthgate-arcsweep-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'Arcsweep JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return { ok: false, canceled: true };
    await fsp.writeFile(result.filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    return { ok: true, path: result.filePath };
  });

  ipcMain.handle('arcsweep:state:import', async () => {
    const result = await dialog.showOpenDialog(getWindow(), {
      title: `Import ${appName} archive`,
      properties: ['openFile'],
      filters: [{ name: 'Arcsweep JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePaths[0]) return { ok: false, canceled: true };
    const text = await fsp.readFile(result.filePaths[0], 'utf8');
    const state = JSON.parse(text);
    await createBackup(storePaths, 'before-import');
    await writeStateAtomic(storePaths, state, { reason: 'import' });
    return { ok: true, state, sourcePath: result.filePaths[0] };
  });

  ipcMain.handle('arcsweep:storage:info', async () => ({
    mode: 'desktop-local-store',
    appName,
    version: appVersion,
    dataDirectory: storePaths.root,
    stateFile: storePaths.stateFile,
    attachmentDirectory: storePaths.attachmentDir,
    diagnosticsFile: getDiagnosticsPath(),
    backups: await listBackups(storePaths),
  }));

  ipcMain.handle('arcsweep:backup:create', async (_event, reason) => createBackup(storePaths, reason));
  ipcMain.handle('arcsweep:backup:list', async () => listBackups(storePaths));
  ipcMain.handle('arcsweep:backup:restore', async (_event, name) => restoreBackup(storePaths, name));

  ipcMain.handle('arcsweep:attachment:add', async () => {
    const result = await dialog.showOpenDialog(getWindow(), {
      title: `Add local files to ${appName}`,
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Images, audio, video, and documents', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'mp3', 'wav', 'flac', 'm4a', 'mp4', 'webm', 'pdf', 'txt', 'md', 'docx'] },
        { name: 'All files', extensions: ['*'] },
      ],
    });
    if (result.canceled) return [];
    return Promise.all(result.filePaths.map((source) => copyAttachment(storePaths, source)));
  });

  ipcMain.handle('arcsweep:attachment:open', async (_event, attachment) => {
    const target = resolveAttachment(storePaths, attachment);
    const error = await shell.openPath(target);
    return { ok: !error, error: error || null };
  });

  ipcMain.handle('arcsweep:storage:show', async () => {
    const error = await shell.openPath(storePaths.root);
    return { ok: !error, error: error || null };
  });
};
