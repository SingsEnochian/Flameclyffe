'use strict';
const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path  = require('path');
const fs    = require('fs');
const { fork } = require('child_process');
const net   = require('net');

const CONFIG_PATH = path.join(app.getPath('userData'), 'hearthgate-config.json');
const DATA_DIR    = path.join(app.getPath('userData'), 'hearthgate-data');
const PORT = 3841;

let win = null;
let serverProc = null;

// ── Config ────────────────────────────────────────────────────────────────────
function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); }
  catch { return null; }
}
function saveConfig(cfg) {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

// ── Server ────────────────────────────────────────────────────────────────────
function startServer(cfg) {
  if (serverProc) { serverProc.kill(); serverProc = null; }

  const serverPath = path.join(app.getAppPath(), 'server.js');
  const env = { ...process.env, PORT: String(PORT), HEARTHGATE_DATA_DIR: DATA_DIR };

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
    title: 'Hearthgate',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  Menu.setApplicationMenu(null);
  win.loadURL(url);

  // Open external links in default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, navUrl) => {
    if (!navUrl.startsWith(`http://localhost:${PORT}`) && !navUrl.startsWith('file://')) {
      e.preventDefault();
      shell.openExternal(navUrl);
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
    win?.loadURL(`http://localhost:${PORT}/hearthgate.html`);
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
    createWindow(`http://localhost:${PORT}/hearthgate.html`);
  } catch {
    createWindow(`file://${path.join(__dirname, '..', 'public', 'setup-wizard.html')}`);
  }
});

app.on('window-all-closed', () => { serverProc?.kill(); app.quit(); });
app.on('will-quit', () => serverProc?.kill());
