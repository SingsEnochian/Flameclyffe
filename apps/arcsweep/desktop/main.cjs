'use strict';

const { app, BrowserWindow, dialog, ipcMain, screen, shell } = require('electron');
const path = require('node:path');
const fsp = require('node:fs/promises');
const {
  createStorePaths,
  ensureStore,
} = require('./store.cjs');
const registerArcsweepIpc = require('./register-arcsweep-ipc.cjs');

const APP_NAME = 'Hearthgate: Arcsweep';
const APP_VERSION = '0.2.1';
const FALLBACK_SHOW_MS = 2500;
const RENDERER_HEALTH_MS = 1800;
let mainWindow = null;
let storePaths = null;
let showFallback = null;
let rendererHealthCheck = null;
let showingFailureDocument = false;

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
  const width = Math.min(1440, Math.max(720, work.width - margin * 2));
  const height = Math.min(920, Math.max(520, work.height - margin * 2));
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
  mainWindow.setAlwaysOnTop(true, 'normal');
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setAlwaysOnTop(false);
  }, 350);
  if (typeof mainWindow.moveTop === 'function') mainWindow.moveTop();
  void logDesktop('window-shown', { reason, bounds: mainWindow.getBounds() });
}

function escapeFailureHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function showRendererFailure(title, details) {
  if (!mainWindow || mainWindow.isDestroyed() || showingFailureDocument) return;
  showingFailureDocument = true;
  const diagnosticPath = diagnosticsFile();
  const html = `<!doctype html>
  <html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeFailureHtml(APP_NAME)}</title>
  <style>
    :root{color-scheme:dark;font-family:Segoe UI,system-ui,sans-serif;background:#0b0f0e;color:#f0eadb}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:32px;background:radial-gradient(circle at 70% 10%,#3a3020,transparent 42rem),#0b0f0e}
    main{width:min(760px,100%);border:1px solid #d8b56a;border-radius:18px;padding:28px;background:#18221f;box-shadow:0 28px 90px #0009}
    h1{font-family:Georgia,serif;margin:0 0 16px;color:#f6e2ad}p{line-height:1.6}.path{padding:12px;border:1px solid #385047;border-radius:10px;background:#0e1513;overflow-wrap:anywhere;color:#b9ddcc}.detail{white-space:pre-wrap;color:#d7c7aa}.seal{margin-top:22px;color:#8ebca6;font-size:13px;letter-spacing:.08em;text-transform:uppercase}
  </style></head><body><main>
    <h1>${escapeFailureHtml(title)}</h1>
    <p>Arcsweep opened its Windows shell, but the interface did not initialise. The failure is visible rather than hidden, and no world data has been discarded.</p>
    <p class="detail">${escapeFailureHtml(details)}</p>
    <p>Desktop diagnostics:</p><p class="path">${escapeFailureHtml(diagnosticPath)}</p>
    <p class="seal">Hearthgate: Arcsweep ${escapeFailureHtml(APP_VERSION)}</p>
  </main></body></html>`;

  void logDesktop('renderer-failure-document', { title, details });
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    .catch((error) => void logDesktop('failure-document-load-rejected', { message: error.message }))
    .finally(() => forceWindowVisible('renderer-failure-document'));
}

function scheduleRendererHealthCheck() {
  if (rendererHealthCheck) clearTimeout(rendererHealthCheck);
  rendererHealthCheck = setTimeout(async () => {
    if (!mainWindow || mainWindow.isDestroyed() || showingFailureDocument) return;
    try {
      const health = await mainWindow.webContents.executeJavaScript(`(() => ({
        title: document.title,
        readyState: document.readyState,
        appExists: Boolean(document.querySelector('#app')),
        appChildren: document.querySelector('#app')?.childElementCount || 0,
        bodyTextLength: document.body?.innerText?.trim().length || 0
      }))()`, true);
      void logDesktop('renderer-health', health);
      if (!health.appExists || health.appChildren === 0) {
        showRendererFailure('Arcsweep interface did not initialise', `Document state: ${health.readyState}. App children: ${health.appChildren}.`);
      }
    } catch (error) {
      void logDesktop('renderer-health-failed', { message: error.message });
      showRendererFailure('Arcsweep interface could not be inspected', error.message);
    }
  }, RENDERER_HEALTH_MS);
}

function createWindow() {
  const initialBounds = fitBoundsToDisplay(screen.getPrimaryDisplay());
  mainWindow = new BrowserWindow({
    ...initialBounds,
    minWidth: Math.min(900, initialBounds.width),
    minHeight: Math.min(650, initialBounds.height),
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
    if (showingFailureDocument && url.startsWith('data:text/html')) return;
    if (url !== mainWindow.webContents.getURL()) event.preventDefault();
  });

  mainWindow.webContents.on('page-title-updated', (event) => {
    event.preventDefault();
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setTitle(APP_NAME);
  });

  mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
    void logDesktop('preload-error', { preloadPath, message: error.message, stack: error.stack });
    showRendererFailure('Arcsweep preload bridge failed', error.message);
  });

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level >= 2) void logDesktop('renderer-console', { level, message, line, sourceId });
  });

  mainWindow.webContents.on('dom-ready', () => scheduleRendererHealthCheck());
  mainWindow.webContents.on('did-finish-load', () => forceWindowVisible('did-finish-load'));
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    void logDesktop('renderer-load-failed', { errorCode, errorDescription, validatedURL, isMainFrame });
    if (isMainFrame && errorCode !== -3 && !showingFailureDocument) {
      showRendererFailure('Arcsweep renderer failed to load', `${errorDescription} (${errorCode})\n${validatedURL}`);
    } else {
      forceWindowVisible('did-fail-load');
    }
  });
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    void logDesktop('renderer-process-gone', details);
    showRendererFailure('Arcsweep renderer stopped', `${details.reason || 'unknown reason'} · exit code ${details.exitCode ?? 'unknown'}`);
  });
  mainWindow.on('unresponsive', () => void logDesktop('window-unresponsive', { bounds: mainWindow?.getBounds() }));
  mainWindow.on('responsive', () => void logDesktop('window-responsive', { bounds: mainWindow?.getBounds() }));
  mainWindow.once('ready-to-show', () => forceWindowVisible('ready-to-show'));

  showFallback = setTimeout(() => forceWindowVisible('fallback-timeout'), FALLBACK_SHOW_MS);

  mainWindow.loadFile(rendererEntry()).catch((error) => {
    void logDesktop('load-file-rejected', { message: error.message, stack: error.stack });
    showRendererFailure('Arcsweep application file could not open', error.message);
  });

  mainWindow.on('closed', () => {
    if (showFallback) clearTimeout(showFallback);
    if (rendererHealthCheck) clearTimeout(rendererHealthCheck);
    showFallback = null;
    rendererHealthCheck = null;
    showingFailureDocument = false;
    mainWindow = null;
  });
}

function registerIpc() {
  registerArcsweepIpc({
    ipcMain,
    dialog,
    shell,
    fsp,
    getWindow: () => mainWindow,
    storePaths,
    appName: APP_NAME,
    appVersion: APP_VERSION,
    getDiagnosticsPath: () => diagnosticsFile(),
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
