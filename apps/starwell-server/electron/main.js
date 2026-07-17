'use strict';
const { app, BrowserWindow, ipcMain, shell, Menu, utilityProcess } = require('electron');
const path  = require('path');
const fs    = require('fs');
const net   = require('net');
const { fileURLToPath } = require('url');

const CONFIG_PATH = path.join(app.getPath('userData'), 'hearthgate-config.json');
const DATA_DIR = path.join(app.getPath('userData'), 'hearthgate-data');
const STARTUP_LOG_PATH = path.join(app.getPath('userData'), 'hearthgate-startup.log');
const PORT = 3841;
const FONTFORGE_PORT = 3842;
const LOCAL_HTTP_ORIGINS = new Set([
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
  `http://localhost:${FONTFORGE_PORT}`,
  `http://127.0.0.1:${FONTFORGE_PORT}`,
]);

let win = null;
let serverProc = null;
let fontForgeProc = null;
let lastServerFailure = '';

// ── Diagnostics ────────────────────────────────────────────────────────────────
function writeStartupLog(message) {
  try {
    fs.mkdirSync(path.dirname(STARTUP_LOG_PATH), { recursive: true });
    fs.appendFileSync(STARTUP_LOG_PATH, `[${new Date().toISOString()}] ${message}\n`, 'utf8');
  } catch (error) {
    console.error('[Hearthgate] Could not write startup log:', error);
  }
}

function resetStartupLog() {
  try {
    fs.mkdirSync(path.dirname(STARTUP_LOG_PATH), { recursive: true });
    fs.writeFileSync(
      STARTUP_LOG_PATH,
      `[${new Date().toISOString()}] Hearthgate startup diagnostics\n`,
      'utf8'
    );
  } catch (error) {
    console.error('[Hearthgate] Could not reset startup log:', error);
  }
}

function normaliseChunk(chunk) {
  return String(chunk || '').replace(/\r?\n$/, '');
}

function wireUtilityProcess(child, label, { core = false } = {}) {
  child.on('spawn', () => {
    writeStartupLog(`${label} spawned (pid ${child.pid ?? 'unknown'}).`);
  });

  child.stdout?.on('data', (chunk) => {
    const text = normaliseChunk(chunk);
    if (!text) return;
    writeStartupLog(`${label} stdout: ${text}`);
    console.log(`[Hearthgate:${label}] ${text}`);
  });

  child.stderr?.on('data', (chunk) => {
    const text = normaliseChunk(chunk);
    if (!text) return;
    writeStartupLog(`${label} stderr: ${text}`);
    console.error(`[Hearthgate:${label}] ${text}`);
  });

  child.on('error', (type, location, report) => {
    const detail = [type, location, report].filter(Boolean).join(' · ') || 'unknown utility-process error';
    if (core) lastServerFailure = `${label} error: ${detail}`;
    writeStartupLog(`${label} error: ${detail}`);
    console.error(`[Hearthgate] ${label} error:`, detail);
  });

  child.on('exit', (code) => {
    const detail = `${label} exited with code ${code}.`;
    if (core && code !== 0) lastServerFailure = detail;
    writeStartupLog(detail);
    console.warn(`[Hearthgate] ${detail}`);
    if (child === serverProc) serverProc = null;
    if (child === fontForgeProc) fontForgeProc = null;
  });

  return child;
}

// ── Config ────────────────────────────────────────────────────────────────────
function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); }
  catch { return null; }
}

function saveConfig(cfg) {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

function primaryApplicationUrl() {
  const starwellEntry = path.join(app.getAppPath(), 'public', 'starwell', 'index.html');
  return fs.existsSync(starwellEntry)
    ? `http://localhost:${PORT}/starwell/`
    : `http://localhost:${PORT}/hearthgate.html`;
}

function isPathInside(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function isLocalApplicationUrl(value) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'http:') return LOCAL_HTTP_ORIGINS.has(parsed.origin);
    if (parsed.protocol !== 'file:') return false;

    const candidate = path.resolve(fileURLToPath(parsed));
    const appRoot = path.resolve(app.getAppPath());
    return isPathInside(candidate, path.join(appRoot, 'public'))
      || isPathInside(candidate, path.join(appRoot, 'electron'));
  } catch {
    return false;
  }
}

function isWriterPrintPopup(targetUrl, openerUrl) {
  return targetUrl === 'about:blank' && isLocalApplicationUrl(openerUrl);
}

// ── Server ────────────────────────────────────────────────────────────────────
function stopServers() {
  if (serverProc) {
    try { serverProc.kill(); } catch (error) { writeStartupLog(`Core stop error: ${error.message}`); }
    serverProc = null;
  }
  if (fontForgeProc) {
    try { fontForgeProc.kill(); } catch (error) { writeStartupLog(`FontForge stop error: ${error.message}`); }
    fontForgeProc = null;
  }
}

function launchUtility(modulePath, label, env, options = {}) {
  const child = utilityProcess.fork(modulePath, [], {
    env,
    cwd: app.getAppPath(),
    stdio: 'pipe',
    serviceName: `Hearthgate ${label}`,
  });
  return wireUtilityProcess(child, label, options);
}

function startServer(cfg) {
  stopServers();
  resetStartupLog();
  lastServerFailure = '';

  const appRoot = app.getAppPath();
  const serverPath = path.join(appRoot, 'server.js');
  const fontForgeServerPath = path.join(appRoot, 'fontforge', 'server.js');
  const env = {
    ...process.env,
    PORT: String(PORT),
    FONTFORGE_PORT: String(FONTFORGE_PORT),
    HEARTHGATE_DATA_DIR: DATA_DIR,
  };

  if (cfg?.keys) {
    const k = cfg.keys;
    if (k.anthropic)     { env.ANTHROPIC_API_KEY = k.anthropic; env.UIAL_API_KEY = k.anthropic; }
    if (k.openai)        { env.OPENAI_API_KEY = k.openai; env.LIOREAL_API_KEY = k.openai; }
    if (k.exa)             env.EXA_API_KEY = k.exa;
    if (k.deepseek_blue)   env.BLUEBIRD_DEEPSEEK_API_KEY = k.deepseek_blue;
    if (k.deepseek_veth)   env.VETHRLAUF_DEEPSEEK_API_KEY = k.deepseek_veth;
    if (k.ollama)          env.OLLAMA_HOST = k.ollama;
    if (Array.isArray(k.custom)) {
      for (const { name, value } of k.custom) {
        if (name && value) env[name] = value;
      }
    }
  }
  if (cfg?.name) env.HEARTHGATE_HOUSE_NAME = cfg.name;

  writeStartupLog(`Application root: ${appRoot}`);
  writeStartupLog(`Data directory: ${DATA_DIR}`);
  writeStartupLog(`Launching core service from ${serverPath}`);

  try {
    serverProc = launchUtility(serverPath, 'Core', env, { core: true });
  } catch (error) {
    lastServerFailure = `Core launch failed: ${error.message}`;
    writeStartupLog(lastServerFailure);
    console.error('[Hearthgate]', lastServerFailure);
  }

  try {
    fontForgeProc = launchUtility(fontForgeServerPath, 'FontForge', env);
  } catch (error) {
    writeStartupLog(`FontForge launch failed: ${error.message}`);
    console.error('[Hearthgate] FontForge launch failed:', error);
  }
}

// ── Wait for server ready ─────────────────────────────────────────────────────
function waitForServer(port, retries = 60, interval = 500) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const attempt = () => {
      const socket = new net.Socket();
      let settled = false;

      const finish = (callback) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        callback();
      };

      socket.once('connect', () => finish(() => {
        writeStartupLog(`Core service ready on 127.0.0.1:${port}.`);
        resolve();
      }));

      socket.once('error', () => finish(() => {
        attempts += 1;
        if (lastServerFailure || attempts >= retries) {
          const reason = lastServerFailure || `Core service did not open port ${port} within ${Math.round(retries * interval / 1000)} seconds.`;
          writeStartupLog(`Startup failed: ${reason}`);
          reject(new Error(`${reason} Startup log: ${STARTUP_LOG_PATH}`));
          return;
        }
        setTimeout(attempt, interval);
      }));

      socket.setTimeout(interval, () => finish(() => {
        attempts += 1;
        if (attempts >= retries) {
          const reason = `Core service did not open port ${port} within ${Math.round(retries * interval / 1000)} seconds.`;
          writeStartupLog(`Startup failed: ${reason}`);
          reject(new Error(`${reason} Startup log: ${STARTUP_LOG_PATH}`));
          return;
        }
        setTimeout(attempt, interval);
      }));

      socket.connect(port, '127.0.0.1');
    };

    attempt();
  });
}

// ── Window ────────────────────────────────────────────────────────────────────
function createWindow(url) {
  win = new BrowserWindow({
    width: 1380, height: 880,
    minWidth: 820, minHeight: 620,
    backgroundColor: '#070908',
    title: 'STARWELL · Hearthgate',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  Menu.setApplicationMenu(null);
  win.loadURL(url);

  // Keep Hearthgate and its local workers inside the application boundary.
  win.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    if (isLocalApplicationUrl(targetUrl)) return { action: 'allow' };

    // Writer Room creates a blank, same-application document and writes the
    // printable sheet into it before invoking the system print dialog.
    if (isWriterPrintPopup(targetUrl, win.webContents.getURL())) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
          },
        },
      };
    }

    if (/^https?:/i.test(targetUrl)) shell.openExternal(targetUrl);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, navigationUrl) => {
    if (!isLocalApplicationUrl(navigationUrl)) {
      event.preventDefault();
      if (/^https?:/i.test(navigationUrl)) shell.openExternal(navigationUrl);
    }
  });

  win.on('closed', () => { win = null; });
}

// ── IPC handlers ─────────────────────────────────────────────────────────────
ipcMain.handle('get-config', () => loadConfig());

ipcMain.handle('save-config', async (_event, cfg) => {
  saveConfig(cfg);
  startServer(cfg);
  try {
    await waitForServer(PORT);
    win?.loadURL(primaryApplicationUrl());
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message, logPath: STARTUP_LOG_PATH };
  }
});

ipcMain.handle('open-wizard', () => {
  win?.loadURL(`file://${path.join(__dirname, '..', 'public', 'setup-wizard.html')}`);
});

// ── Boot ──────────────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  app.on('child-process-gone', (_event, details) => {
    if (details.type !== 'Utility') return;
    writeStartupLog(`Utility process gone: ${details.serviceName || details.name || 'unknown'} · ${details.reason} · exit ${details.exitCode}`);
  });

  const cfg = loadConfig();
  if (!cfg) {
    createWindow(`file://${path.join(__dirname, '..', 'public', 'setup-wizard.html')}`);
    return;
  }

  startServer(cfg);
  try {
    await waitForServer(PORT);
    createWindow(primaryApplicationUrl());
  } catch (error) {
    writeStartupLog(`Boot returned to setup wizard: ${error.message}`);
    createWindow(`file://${path.join(__dirname, '..', 'public', 'setup-wizard.html')}`);
  }
});

app.on('window-all-closed', () => { stopServers(); app.quit(); });
app.on('will-quit', () => stopServers());
