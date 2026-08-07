const STORAGE_THEME = 'flameclyffe.stonewood-theme.v1';
const STORAGE_MODE = 'flameclyffe.stonewood-theme-mode.v1';
const RECEPTION_KEY = 'hearthgate.activeReception';

const SHELL_ROOT = new URL('../', import.meta.url);
const urlFor = (path = '') => new URL(String(path).replace(/^\/+/, ''), SHELL_ROOT).href;

const THEMES = Object.freeze([
  { id: 'stonewood-obsidian', name: 'Obsidian', glyph: '◆', note: 'green-black · restrained gold' },
  { id: 'stonewood-twilight', name: 'Twilight', glyph: '◐', note: 'sapphire · copper · amber' },
  { id: 'stonewood-copper', name: 'Copper', glyph: '◉', note: 'walnut · moss · workbench glow' },
  { id: 'stonewood-moonstone', name: 'Moonstone', glyph: '○', note: 'pearl · silver · cool blue' },
  { id: 'stonewood-verdigris', name: 'Verdigris', glyph: '◇', note: 'oxidised copper · archive green' },
  { id: 'stonewood-starless', name: 'Starless', glyph: '●', note: 'maximum dark · pinlight only' },
  { id: 'emerald-reliquary', name: 'Reliquary', glyph: '✦', note: 'emerald · gold · ivory' },
]);

const WORLD_NAMES = Object.freeze({
  reality: 'Current Reality',
  terra: 'Terra Aeterna',
  luna: 'Luna · Windmere',
  taveren: 'Ta’veren Vaen',
  starsong: 'Starsong',
  supernatural: 'Supernatural',
  wheel: 'Wheel of Time',
  evil: 'Evil',
});

const NAV = Object.freeze([
  ['Foyer', 'hearthgate/'],
  ['Arcsweep', ''],
  ['Bifröst', 'bifrost/'],
  ['Continuity', 'arcsweep-continuity/'],
  ['Hearth', 'living-room.html'],
  ['Foundry', 'glyph-studio/'],
  ['Signal Well', 'signal-well/'],
  ['Observatory', 'deep-observer/'],
]);

function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* session-only fallback */ }
}

function currentRelativePath() {
  const basePath = new URL(SHELL_ROOT).pathname.replace(/\/+$/, '/');
  const here = window.location.pathname;
  if (here.startsWith(basePath)) return here.slice(basePath.length).replace(/^\/+/, '');
  return here.replace(/^\/+/, '');
}

function routeIsActive(route) {
  const current = currentRelativePath().replace(/index\.html$/, '').replace(/\/+$/, '');
  const target = String(route).replace(/index\.html$/, '').replace(/\/+$/, '');
  if (!target) return current === '';
  if (target.endsWith('.html')) return current === target;
  return current === target || current.startsWith(`${target}/`);
}

function applyTheme(themeId, { persist = true } = {}) {
  const theme = THEMES.find((candidate) => candidate.id === themeId) || THEMES[1];
  document.documentElement.dataset.stonewoodTheme = theme.id;
  document.documentElement.dataset.stonewoodMode = 'manual';
  document.documentElement.style.colorScheme = theme.id === 'stonewood-moonstone' ? 'light' : 'dark';
  if (persist) {
    safeSet(STORAGE_THEME, theme.id);
    safeSet(STORAGE_MODE, 'manual');
  }

  document.querySelectorAll('[data-arcsweep-theme-choice]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.arcsweepThemeChoice === theme.id));
  });

  const themeButton = document.querySelector('.arcsweep-theme-button');
  if (themeButton) {
    themeButton.textContent = theme.glyph;
    themeButton.title = `Stonewood theme · ${theme.name}`;
    themeButton.setAttribute('aria-label', `Choose Stonewood theme. Current: ${theme.name}`);
  }

  window.dispatchEvent(new CustomEvent('stonewood:themechange', {
    detail: { theme: theme.id, name: theme.name, mode: 'manual', source: 'arcsweep-shell' },
  }));

  return theme;
}

function setReception(worldKey) {
  const key = worldKey || safeGet(RECEPTION_KEY) || 'terra';
  const label = WORLD_NAMES[key] || key;
  const reception = document.querySelector('.arcsweep-reception');
  if (reception) reception.textContent = `Reception · ${label}`;
}

async function refreshReception() {
  setReception();
  try {
    const response = await fetch(urlFor('api/reception'), { headers: { Accept: 'application/json' } });
    if (!response.ok) return;
    const data = await response.json();
    if (data?.ok && data.activeReception) {
      safeSet(RECEPTION_KEY, data.activeReception);
      setReception(data.activeReception);
    }
  } catch {
    // Static previews may not have the local reception API. Stored reception remains authoritative for the shell.
  }
}

function buildThemeMenu() {
  return `
    <div class="arcsweep-theme-wrap">
      <button class="arcsweep-theme-button" type="button" aria-expanded="false" aria-controls="arcsweep-theme-menu">◐</button>
      <section class="arcsweep-theme-menu" id="arcsweep-theme-menu" hidden>
        <header><span>Stonewood vestment</span><span>Faer → Arcsweep</span></header>
        <div class="arcsweep-theme-grid">
          ${THEMES.map((theme) => `
            <button class="arcsweep-theme-choice" type="button" data-arcsweep-theme-choice="${theme.id}" aria-pressed="false">
              <span aria-hidden="true">${theme.glyph}</span>
              <span><strong>${theme.name}</strong><small>${theme.note}</small></span>
            </button>
          `).join('')}
        </div>
      </section>
    </div>
  `;
}

function buildShell() {
  if (document.querySelector('.arcsweep-shellbar')) return document.querySelector('.arcsweep-shellbar');

  const skip = document.createElement('a');
  skip.className = 'arcsweep-skip';
  skip.href = '#arcsweep-main-content';
  skip.textContent = 'Skip to room';

  const shell = document.createElement('header');
  shell.className = 'arcsweep-shellbar';
  shell.innerHTML = `
    <a class="arcsweep-nameplate" href="${urlFor('hearthgate/')}" aria-label="Hearthgate foyer">
      <span class="arcsweep-mark" aria-hidden="true">✦</span>
      <strong>HEARTHGATE · ARCSWEEP</strong>
      <span>A House of Many Worlds</span>
    </a>
    <nav class="arcsweep-rail" aria-label="Hearthgate rooms">
      ${NAV.map(([label, route]) => `<a href="${urlFor(route)}" ${routeIsActive(route) ? 'aria-current="page"' : ''}>${label}</a>`).join('')}
    </nav>
    <div class="arcsweep-status-cluster">
      <span class="arcsweep-reception">Reception · Terra Aeterna</span>
      ${buildThemeMenu()}
    </div>
  `;

  document.body.prepend(shell);
  document.body.prepend(skip);

  const mainTarget = document.querySelector('main, #root, [role="main"]');
  if (mainTarget && !mainTarget.id) mainTarget.id = 'arcsweep-main-content';
  else if (mainTarget && mainTarget.id !== 'arcsweep-main-content') {
    const anchor = document.createElement('span');
    anchor.id = 'arcsweep-main-content';
    anchor.hidden = true;
    mainTarget.before(anchor);
  }

  return shell;
}

function bindThemeMenu(shell) {
  const button = shell.querySelector('.arcsweep-theme-button');
  const menu = shell.querySelector('.arcsweep-theme-menu');
  if (!button || !menu) return;

  const setOpen = (open) => {
    menu.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  };

  button.addEventListener('click', () => setOpen(menu.hidden));
  shell.querySelectorAll('[data-arcsweep-theme-choice]').forEach((choice) => {
    choice.addEventListener('click', () => {
      applyTheme(choice.dataset.arcsweepThemeChoice);
      setOpen(false);
    });
  });

  document.addEventListener('pointerdown', (event) => {
    if (!menu.hidden && !shell.querySelector('.arcsweep-theme-wrap')?.contains(event.target)) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) {
      setOpen(false);
      button.focus();
    }
  });
}

function exitArcsweepHome() {
  if (document.documentElement.dataset.arcsweepHome !== 'true') return;
  document.documentElement.dataset.arcsweepHome = 'false';
  document.querySelector('.arcsweep-home-panel')?.remove();
  document.querySelector('.arcsweep-home-core')?.remove();
}

function clickRoomByName(name) {
  const candidates = [...document.querySelectorAll('.sigil-node, .room-card')];
  const target = candidates.find((button) => button.textContent?.toLowerCase().includes(name.toLowerCase()));
  if (target) {
    exitArcsweepHome();
    target.click();
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function mountArcsweepHome() {
  const current = currentRelativePath().replace(/index\.html$/, '').replace(/\/+$/, '');
  if (current !== '') return true;

  document.documentElement.dataset.arcsweepHome = 'true';
  const map = document.querySelector('.observatory-map');
  const core = document.querySelector('.sigil-core');
  const host = document.querySelector('.observatory-shell');
  if (!map || !core || !host) return false;

  if (!core.querySelector('.arcsweep-home-core')) {
    const homeCore = document.createElement('div');
    homeCore.className = 'arcsweep-home-core';
    homeCore.innerHTML = '<span aria-hidden="true">✦</span><strong>ARCSWEEP</strong><small>Choose a chamber. Nothing opens by force.</small>';
    core.append(homeCore);
  }

  if (!host.querySelector('.arcsweep-home-panel')) {
    const panel = document.createElement('section');
    panel.className = 'arcsweep-home-panel';
    panel.setAttribute('aria-label', 'Arcsweep House Map landing');
    panel.innerHTML = `
      <p class="arcsweep-home-kicker">House Map · neutral threshold</p>
      <h2>Choose where the house opens.</h2>
      <p class="arcsweep-home-copy">STARWELL should not throw you into Writing Room, DEEP, or any other organ on arrival. Arcsweep is the threshold: reception, navigation, atmosphere, and continuity first; rooms answer only when chosen.</p>
      <div class="arcsweep-home-actions">
        <button type="button" data-room-jump="Observer Almanac">Open Observer</button>
        <button type="button" data-room-jump="Writing Room">Open Writing</button>
        <button type="button" data-room-jump="Grand Library">Open Library</button>
        <button type="button" data-room-jump="Atlas Hall">Open Atlas</button>
        <a href="${urlFor('bifrost/')}">Open Bifröst</a>
        <a href="${urlFor('glyph-studio/')}">Open Foundry</a>
      </div>
    `;
    map.after(panel);
    panel.querySelectorAll('[data-room-jump]').forEach((button) => {
      button.addEventListener('click', () => clickRoomByName(button.dataset.roomJump));
    });
  }

  return true;
}

function bindHomeExit() {
  document.addEventListener('click', (event) => {
    if (document.documentElement.dataset.arcsweepHome !== 'true') return;
    const roomButton = event.target.closest('.sigil-node, .room-card');
    if (roomButton) exitArcsweepHome();
  }, true);

  const arcsweepLink = [...document.querySelectorAll('.arcsweep-rail a')].find((link) => link.textContent.trim() === 'Arcsweep');
  if (arcsweepLink && routeIsActive('')) {
    arcsweepLink.addEventListener('click', (event) => {
      event.preventDefault();
      document.documentElement.dataset.arcsweepHome = 'true';
      mountArcsweepHome();
      document.querySelector('.observatory-map')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

function initialise() {
  document.documentElement.dataset.arcsweepShell = 'ready';
  const savedTheme = safeGet(STORAGE_THEME) || 'stonewood-twilight';
  applyTheme(savedTheme, { persist: false });

  const shell = buildShell();
  bindThemeMenu(shell);
  bindHomeExit();
  refreshReception();

  window.addEventListener('storage', (event) => {
    if (event.key === RECEPTION_KEY) setReception(event.newValue);
    if (event.key === STORAGE_THEME && event.newValue) applyTheme(event.newValue, { persist: false });
  });

  if (!mountArcsweepHome()) {
    const observer = new MutationObserver(() => {
      if (mountArcsweepHome()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 8000);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialise, { once: true });
} else {
  initialise();
}
