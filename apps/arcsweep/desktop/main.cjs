'use strict';

const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('node:path');
const fsp = require('node:fs/promises');
const {
  copyAttachment,
  createBackup,
  createStorePaths,
  ensureStore,
  listBackups,
  readState,
  resolveAttachment,
  restoreBackup,
  writeStateAtomic,
} = require('./store.cjs');

const APP_NAME = 'Hearthgate: Arcsweep';
const APP_VERSION = '0.2.0';
let mainWindow = null;
let storePaths = null;
let saveQueue = Promise.resolve();

function dataRoot() {
  return path.join(app.getPath('appData'), 'Hearthgate', 'Arcsweep');
}

function rendererEntry() {
  return path.join(__dirname, 'app', 'index.html');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 900,
    minHeight: 650,
    backgroundColor: '#0b0f0e',
    title: APP_NAME,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !app.isPackaged,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow.webContents.getURL()) event.preventDefault();
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.loadFile(rendererEntry());
  mainWindow.on('closed', () => { mainWindow = null; });
}

function registerIpc() {
  ipcMain.handle('arcsweep:state:load', async () => readState(storePaths));

  ipcMain.handle('arcsweep:state:save', async (_event, state, meta = {}) => {
    saveQueue = saveQueue.then(() => writeStateAtomic(storePaths, state, meta));
    return saveQueue;
  });

  ipcMain.handle('arcsweep:state:export', async (_event, state) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Arcsweep archive',
      defaultPath: `hearthgate-arcsweep-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'Arcsweep JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return { ok: false, canceled: true };
    await fsp.writeFile(result.filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    return { ok: true, path: result.filePath };
  });

  ipcMain.handle('arcsweep:state:import', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Arcsweep archive',
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
    appName: APP_NAME,
    version: APP_VERSION,
    dataDirectory: storePaths.root,
    stateFile: storePaths.stateFile,
    attachmentDirectory: storePaths.attachmentDir,
    backups: await listBackups(storePaths),
  }));

  ipcMain.handle('arcsweep:backup:create', async (_event, reason) => createBackup(storePaths, reason));
  ipcMain.handle('arcsweep:backup:list', async () => listBackups(storePaths));
  ipcMain.handle('arcsweep:backup:restore', async (_event, name) => restoreBackup(storePaths, name));

  ipcMain.handle('arcsweep:attachment:add', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Add local files to Arcsweep',
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
}

app.setName(APP_NAME);
app.whenReady().then(async () => {
  storePaths = createStorePaths(dataRoot());
  await ensureStore(storePaths);
  registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
