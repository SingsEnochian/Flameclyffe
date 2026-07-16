'use strict';
const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path  = require('path');
const fs    = require('fs');
const { fork } = require('child_process');
const net   = require('net');

const CONFIG_PATH = path.join(app.getPath('userData'), 'hearthgate-config.json');
const DATA_DIR    = path.join(app.getPath('userData'), 'hearthgate-data');
const PORT = 3841;
const FONTFORGE_PORT = 3842;

let win = null;
let serverProc = null;
let fontForgeProc = null;

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

function isLocalApplicationUrl(url) {
  return [
    `http://localhost:${PORT}`,
    `http://127.0.0.1:${PORT}`,
    `http://localhost:${FONTFORGE_PORT}`,
    `http://127.0.0.1:${FONTFORGE_PORT}`,
    'file://',
  ].some((prefix) => url.startsWith(prefix));
}

// ── Server ────────────────────────────────────────────────────────────────────
function stopServers() {
  if (serverProc) { serverProc.kill(); serverProc = null; }
  if (fontForgeProc) { fontForgeProc.kill(); fontForgeProc = null; }
}

function startServer(cfg) {
  stopServers();

  const serverPath = path.join(app.getAppPath(), 'server.js');
  const fontForgeServerPath = path.join(app.getAppPath(), 'fontforge', 'server.js');
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

  serverProc = fork(serverPath, [], { env, silent: false });
  serverProc.on('error', err => console.error('[Hearthgate] Server error:', err));

  fontForgeProc = fork(fontForgeServerPath, [], { env, silent: false });
  fontForgeProc.on('error', err => console.error('[Hearthgate] FontForge worker error:', err));
  fontForgeProc.on('exit', (code, signal) => {
    if (code || signal) console.warn(`[Hearthgate] FontForge worker stopped (${signal || code}).`);
  });
}

// ── Wait for server ready ─────────────────────────────────────────────────────
function waitForServer(port, retries = 25, interval = 300) {
  return new Promise((resolve, reject) => {
    let n = 0;
    const attempt = () => {
      const sock = new net.Socket();
      sock.once('connect', () => { sock.destroy(); resolve(); });
      sock.once('error', () => {
        sock.destroy();
        if (++n >= retries) return reject(new Error('Server did not start'));
        setTimeout(attempt, interval);
      });
      sock.connect(port, '127.0.0.1');
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
    shell.openExternal(targetUrl);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, navigationUrl) => {
    if (!isLocalApplicationUrl(navigationUrl)) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  win.on('closed', () => { win = null; });
}

// ── IPC handlers ─────────────────────────────────────────────────────────────
ipcMain.handle('get-config', () => loadConfig());

ipcMain.handle('save-config', async (_e, cfg) => {
  saveConfig(cfg);
  startServer(cfg);
  try {
    await waitForServer(PORT);
    win?.loadURL(primaryApplicationUrl());
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

ipcMain.handle('open-wizard', () => {
  win?.loadURL(`file://${path.join(__dirname, '..', 'public', 'setup-wizard.html')}`);
});

// ── Boot ──────────────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const cfg = loadConfig();
  if (!cfg) {
    createWindow(`file://${path.join(__dirname, '..', 'public', 'setup-wizard.html')}`);
    return;
  }

  startServer(cfg);
  try {
    await waitForServer(PORT);
    createWindow(primaryApplicationUrl());
  } catch {
    createWindow(`file://${path.join(__dirname, '..', 'public', 'setup-wizard.html')}`);
  }
});

app.on('window-all-closed', () => { stopServers(); app.quit(); });
app.on('will-quit', () => stopServers());
