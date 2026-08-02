'use strict';

const {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  Menu,
  session,
  safeStorage,
} = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { fork } = require('node:child_process');
const net = require('node:net');
const { fileURLToPath, pathToFileURL } = require('node:url');
const {
  redactHearthgateConfig,
  sanitiseHearthgateConfig,
} = require('../security/local-boundary');

app.enableSandbox();

const CONFIG_SCHEMA = 'hearthgate.secure-config/v1';
const CONFIG_PATH = path.join(app.getPath('userData'), 'hearthgate-config.json');
const DATA_DIR = path.join(app.getPath('userData'), 'hearthgate-data');
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

function runtimeRoot() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked')
    : app.getAppPath();
}

function encodeConfig(config) {
  const payload = JSON.stringify(config);
  if (safeStorage.isEncryptionAvailable()) {
    return {
      schema: CONFIG_SCHEMA,
      encrypted: true,
      protection: process.platform === 'win32' ? 'os-key-store' : 'electron-safe-storage',
      payload: safeStorage.encryptString(payload).toString('base64'),
    };
  }
  return {
    schema: CONFIG_SCHEMA,
    encrypted: false,
    protection: 'filesystem-only',
    payload: config,
  };
}

function decodeConfig(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (raw.schema !== CONFIG_SCHEMA) return sanitiseHearthgateConfig(raw);
  if (raw.encrypted === true) {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('The operating-system key store is unavailable for this encrypted Hearthgate configuration.');
    }
    const plaintext = safeStorage.decryptString(Buffer.from(String(raw.payload || ''), 'base64'));
    return sanitiseHearthgateConfig(JSON.parse(plaintext));
  }
  return sanitiseHearthgateConfig(raw.payload);
}

function loadConfig() {
  try {
    return decodeConfig(JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')));
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('[Hearthgate] Configuration load failed:', error.message);
    return null;
  }
}

function saveConfig(input) {
  const config = sanitiseHearthgateConfig(input);
  const envelope = encodeConfig(config);
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  const temporaryPath = `${CONFIG_PATH}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(envelope, null, 2), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(temporaryPath, CONFIG_PATH);
  try { fs.chmodSync(CONFIG_PATH, 0o600); } catch { /* Windows ACLs are managed by the user profile. */ }
  return config;
}

function primaryApplicationUrl() {
  const starwellEntry = path.join(runtimeRoot(), 'public', 'starwell', 'index.html');
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
    const appRoot = path.resolve(runtimeRoot());
    return isPathInside(candidate, path.join(appRoot, 'public'))
      || isPathInside(candidate, path.join(appRoot, 'electron'));
  } catch {
    return false;
  }
}

function isWriterPrintPopup(targetUrl, openerUrl) {
  return targetUrl === 'about:blank' && isLocalApplicationUrl(openerUrl);
}

function hardenedWebPreferences({ preload = false } = {}) {
  return {
    ...(preload ? { preload: path.join(__dirname, 'preload.js') } : {}),
    nodeIntegration: false,
    nodeIntegrationInWorker: false,
    nodeIntegrationInSubFrames: false,
    contextIsolation: true,
    sandbox: true,
    webSecurity: true,
    allowRunningInsecureContent: false,
    spellcheck: false,
  };
}

function stopServers() {
  if (serverProc) { serverProc.kill(); serverProc = null; }
  if (fontForgeProc) { fontForgeProc.kill(); fontForgeProc = null; }
}

function startServer(configInput) {
  stopServers();
  const cfg = sanitiseHearthgateConfig(configInput);
  const root = runtimeRoot();
  const serverPath = path.join(root, 'server-secure.js');
  const fontForgeServerPath = path.join(root, 'fontforge', 'server.js');
  const env = {
    ...process.env,
    PORT: String(PORT),
    FONTFORGE_PORT: String(FONTFORGE_PORT),
    HEARTHGATE_DATA_DIR: DATA_DIR,
  };

  const keys = cfg.keys;
  if (keys.anthropic) { env.ANTHROPIC_API_KEY = keys.anthropic; env.UIAL_API_KEY = keys.anthropic; }
  if (keys.openai) { env.OPENAI_API_KEY = keys.openai; env.LIOREAL_API_KEY = keys.openai; }
  if (keys.exa) env.EXA_API_KEY = keys.exa;
  if (keys.deepseek_blue) env.BLUEBIRD_DEEPSEEK_API_KEY = keys.deepseek_blue;
  if (keys.deepseek_veth) env.VETHRLAUF_DEEPSEEK_API_KEY = keys.deepseek_veth;
  if (keys.ollama) env.OLLAMA_HOST = keys.ollama;
  for (const { name, value } of keys.custom) env[name] = value;
  env.HEARTHGATE_HOUSE_NAME = cfg.name;

  serverProc = fork(serverPath, [], { env, silent: false });
  serverProc.on('error', (error) => console.error('[Hearthgate] Server error:', error));
  serverProc.on('exit', (code, signal) => {
    if (code || signal) console.warn(`[Hearthgate] Core server stopped (${signal || code}).`);
  });

  fontForgeProc = fork(fontForgeServerPath, [], { env, silent: false });
  fontForgeProc.on('error', (error) => console.error('[Hearthgate] FontForge worker error:', error));
  fontForgeProc.on('exit', (code, signal) => {
    if (code || signal) console.warn(`[Hearthgate] FontForge worker stopped (${signal || code}).`);
  });
}

function waitForServer(port, retries = 25, interval = 300) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const attempt = () => {
      const socket = new net.Socket();
      socket.once('connect', () => { socket.destroy(); resolve(); });
      socket.once('error', () => {
        socket.destroy();
        if (++attempts >= retries) return reject(new Error('Server did not start'));
        setTimeout(attempt, interval);
      });
      socket.connect(port, '127.0.0.1');
    };
    attempt();
  });
}

function createWindow(url) {
  const iconPath = path.join(runtimeRoot(), 'build', 'hearthgate.png');
  win = new BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 820,
    minHeight: 620,
    backgroundColor: '#070908',
    title: 'STARWELL · Hearthgate',
    ...(fs.existsSync(iconPath) ? { icon: iconPath } : {}),
    autoHideMenuBar: true,
    webPreferences: hardenedWebPreferences({ preload: true }),
  });

  Menu.setApplicationMenu(null);
  win.loadURL(url);

  win.webContents.on('will-attach-webview', (event) => event.preventDefault());
  win.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    if (isLocalApplicationUrl(targetUrl)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true,
          webPreferences: hardenedWebPreferences(),
        },
      };
    }

    if (isWriterPrintPopup(targetUrl, win.webContents.getURL())) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true,
          webPreferences: hardenedWebPreferences(),
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

ipcMain.handle('get-config', () => redactHearthgateConfig(loadConfig()));

ipcMain.handle('save-config', async (_event, input) => {
  try {
    const cfg = saveConfig(input);
    startServer(cfg);
    await waitForServer(PORT);
    win?.loadURL(primaryApplicationUrl());
    return { ok: true };
  } catch (error) {
    console.error('[Hearthgate] Configuration save failed:', error.message);
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('open-wizard', () => {
  const wizardPath = path.join(runtimeRoot(), 'public', 'setup-wizard.html');
  win?.loadURL(pathToFileURL(wizardPath).href);
});

app.whenReady().then(async () => {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);

  const cfg = loadConfig();
  if (!cfg) {
    const wizardPath = path.join(runtimeRoot(), 'public', 'setup-wizard.html');
    createWindow(pathToFileURL(wizardPath).href);
    return;
  }

  startServer(cfg);
  try {
    await waitForServer(PORT);
    createWindow(primaryApplicationUrl());
  } catch {
    const wizardPath = path.join(runtimeRoot(), 'public', 'setup-wizard.html');
    createWindow(pathToFileURL(wizardPath).href);
  }
});

app.on('window-all-closed', () => { stopServers(); app.quit(); });
app.on('will-quit', () => stopServers());
