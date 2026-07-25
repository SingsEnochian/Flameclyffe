'use strict';

const { app, BrowserWindow, dialog, ipcMain, screen, shell } = require('electron');
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
const APP_VERSION = '0.2.1';
const FALLBACK_SHOW_MS = 2500;
let mainWindow = null;
let storePaths = null;
let saveQueue = Promise.resolve();
let showFallback = null;

function dataRoot() {
  return path.join(app.getPath('appData'), 'Hearthgate', 'Arcsweep');
}

function rendererEntry() {
  return path.join(__dirname, 'app', 'index.html');
}

function diagnosticsFile() {
  return path.join(dataRoot(), 'logs', 'desktop.log');
}

async function logDesktop(event, details = {}) {
  try {
    const file = diagnosticsFile();
    await fsp.mkdir(path.dirname(file), { recursive: true });
    await fsp.appendFile(file, `${JSON.stringify({
      at: new Date().toISOString(),
      event,
      version: APP_VERSION,
      platform: process.platform,
      packaged: app.isPackaged,
      ...details,
    })}\n`, 'utf8');
  } catch {
    // Diagnostics must never prevent the application from opening.
  }
}

function fitBoundsToDisplay(display = screen.getPrimaryDisplay()) {
  const work = display.workArea;
  const margin = 36;
  const width = Math.max(900, Math.min(1440, work.width - margin * 2));
  const height = Math.max(650, Math.min(920, work.height - margin * 2));
  return {
    width,
    height,
    x: Math.round(work.x + (work.width - width) / 2),
    y: Math.round(work.y + (work.height - height) / 2),
  };
}

function intersectionArea(a, b) {
  const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return width * height;
}

function windowTouchesLiveDisplay(window) {
  const bounds = window.getBounds();
  return screen.getAllDisplays().some((display) => intersectionArea(bounds, display.workArea) >= 160 * 120);
}

function forceWindowVisible(reason = 'show') {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  if (!windowTouchesLiveDisplay(mainWindow)) {
    const target = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()) || screen.getPrimaryDisplay();
    const bounds = fitBoundsToDisplay(target);
    mainWindow.setBounds(bounds, false);
    void logDesktop('window-repositioned', { reason, bounds, displayId: target.id });
  }

  mainWindow.setTitle(APP_NAME);
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  mainWindow.moveTop();
  void logDesktop('window-shown', { reason, bounds: mainWindow.getBounds() });
}

function createWindow() {
  const initialBounds = fitBoundsToDisplay(screen.getPrimaryDisplay());
  mainWindow = new BrowserWindow({
    ...initialBounds,
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
      backgroundThrottling: false,
    },
  });

  void logDesktop('window-created', {
    bounds: initialBounds,
    renderer: rendererEntry(),
    displays: screen.getAllDisplays().map((display) => ({ id: display.id, bounds: display.bounds, workArea: display.workArea })),
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow.webContents.getURL()) event.preventDefault();
  });

  mainWindow.webContents.on('page-title-updated', (event) => {
    event.preventDefault();
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setTitle(APP_NAME);
  });

  mainWindow.webContents.on('did-finish-load', () => forceWindowVisible('did-finish-load'));
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    void logDesktop('renderer-load-failed', { errorCode, errorDescription, validatedURL, isMainFrame });
    if (isMainFrame) forceWindowVisible('did-fail-load');
  });
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    void logDesktop('renderer-process-gone', details);
    forceWindowVisible('render-process-gone');
  });
  mainWindow.on('unresponsive', () => void logDesktop('window-unresponsive', { bounds: mainWindow?.getBounds() }));
  mainWindow.on('responsive', () => void logDesktop('window-responsive', { bounds: mainWindow?.getBounds() }));
  mainWindow.once('ready-to-show', () => forceWindowVisible('ready-to-show'));

  showFallback = setTimeout(() => forceWindowVisible('fallback-timeout'), FALLBACK_SHOW_MS);

  mainWindow.loadFile(rendererEntry()).catch((error) => {
    void logDesktop('load-file-rejected', { message: error.message, stack: error.stack });
    forceWindowVisible('load-file-rejected');
  });

  mainWindow.on('closed', () => {
    if (showFallback) clearTimeout(showFallback);
    showFallback = null;
    mainWindow = null;
  });
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
    diagnosticsFile: diagnosticsFile(),
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

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => forceWindowVisible('second-instance'));

  app.setName(APP_NAME);
  app.whenReady().then(async () => {
    storePaths = createStorePaths(dataRoot());
    await ensureStore(storePaths);
    registerIpc();
    createWindow();

    screen.on('display-added', () => forceWindowVisible('display-added'));
    screen.on('display-removed', () => forceWindowVisible('display-removed'));
    screen.on('display-metrics-changed', () => forceWindowVisible('display-metrics-changed'));

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
      else forceWindowVisible('activate');
    });
  }).catch((error) => {
    void logDesktop('startup-failed', { message: error.message, stack: error.stack });
    dialog.showErrorBox(APP_NAME, `Arcsweep could not start. Diagnostics were written to:\n${diagnosticsFile()}\n\n${error.message}`);
    app.quit();
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
