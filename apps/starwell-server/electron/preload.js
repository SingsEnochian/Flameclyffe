'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const KEEP_EXISTING_SECRET = '__HEARTHGATE_KEEP_EXISTING_SECRET__';

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig:  ()    => ipcRenderer.invoke('get-config'),
  saveConfig: (cfg) => ipcRenderer.invoke('save-config', cfg),
  openWizard: ()    => ipcRenderer.invoke('open-wizard'),
});

const SECRET_FIELD_MAP = Object.freeze({
  runtime: 'key-runtime',
  anthropic: 'key-anthropic',
  openai: 'key-openai',
  exa: 'key-exa',
  deepseek_blue: 'key-deepseek-blue',
  deepseek_veth: 'key-deepseek-veth',
});

const THEME_TITLES = Object.freeze({
  grove: 'Grove',
  'dreaming-grove': 'Dreaming Grove',
  hearthfire: 'Hearthfire',
  lochflame: 'Lochflame',
  stonewood: 'Stonewood',
  'terra-aeterna': 'Terra Aeterna',
  starfall: 'Starfall',
  moonwater: 'Moonwater',
  'void-lilac': 'Void Lilac',
  obsidian: 'Obsidian',
  'ember-and-ink': 'Ember & Ink',
  'salt-and-iron': 'Salt & Iron',
  'dark-academia': 'Dark Academia',
  'electric-forest': 'Electric Forest',
  'tropical-noir': 'Tropical Noir',
  'cherry-kettle': 'Cherry Kettle',
});

function setValue(id, value) {
  const input = document.getElementById(id);
  if (input && value != null) input.value = String(value);
}

function configuredSecretInputs(config) {
  return Object.entries(SECRET_FIELD_MAP)
    .filter(([key]) => config?.keys?.[key] === true)
    .map(([key, id]) => ({ key, input: document.getElementById(id) }))
    .filter((entry) => entry.input);
}

function markConfiguredSecrets(config) {
  for (const { input } of configuredSecretInputs(config)) {
    input.dataset.configuredSecret = 'true';
    input.placeholder = 'configured · leave blank to keep';
  }
}

function injectPreserveMarkers(config) {
  const touched = [];
  for (const { input } of configuredSecretInputs(config)) {
    if (!input.value.trim()) {
      input.value = KEEP_EXISTING_SECRET;
      touched.push(input);
    }
  }
  return () => {
    for (const input of touched) {
      if (input.value === KEEP_EXISTING_SECRET) input.value = '';
    }
  };
}

function showConfiguredCustomFields(config) {
  const configured = config?.keys?.custom || [];
  const list = document.getElementById('custom-api-list');
  if (!list || !configured.length) return;
  const note = document.createElement('div');
  note.className = 'hint';
  note.dataset.secureConfiguredCustom = 'true';
  note.textContent = `Already configured and preserved unless replaced: ${configured.map((item) => item.name).join(', ')}`;
  list.before(note);
}

function selectConfiguredTheme(themeId) {
  const title = THEME_TITLES[themeId];
  if (!title) return;
  const swatch = [...document.querySelectorAll('.theme-swatch')]
    .find((node) => node.getAttribute('title') === title);
  swatch?.click();
}

async function hydrateSetupWizard() {
  if (!document.getElementById('key-runtime')) return;
  let config = null;
  try {
    config = await ipcRenderer.invoke('get-config');
  } catch {
    return;
  }
  if (!config) return;

  setValue('house-name', config.name);
  setValue('steward-name', config.steward);
  setValue('key-ollama', config.keys?.ollama || '');
  markConfiguredSecrets(config);
  showConfiguredCustomFields(config);
  selectConfiguredTheme(config.theme);

  const next = document.getElementById('next-1');
  next?.addEventListener('click', () => {
    const runtime = document.getElementById('key-runtime');
    if (!runtime?.value.trim() && config.keys?.runtime === true) {
      runtime.value = KEEP_EXISTING_SECRET;
      queueMicrotask(() => {
        if (runtime.value === KEEP_EXISTING_SECRET) runtime.value = '';
      });
    }
  }, true);

  const launch = document.getElementById('btn-launch');
  launch?.addEventListener('click', () => {
    const cleanup = injectPreserveMarkers(config);
    queueMicrotask(cleanup);
  }, true);
}

window.addEventListener('DOMContentLoaded', () => {
  void hydrateSetupWizard();
});
