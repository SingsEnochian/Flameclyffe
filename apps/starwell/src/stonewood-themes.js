const STORAGE_KEY = 'flameclyffe.stonewood-theme.v1';
const MODE_KEY = 'flameclyffe.stonewood-theme-mode.v1';
const PANEL_ID = 'stonewood-theme-panel';
const OBSERVATORY_TIME_ZONE = 'America/New_York';

const THEMES = Object.freeze([
  {
    id: 'stonewood-obsidian',
    name: 'Stonewood Obsidian',
    short: 'Obsidian',
    glyph: '◆',
    description: 'Green-black stonewood, silver instruments, and restrained gold pinlight.',
    swatch: ['#020a08', '#081a16', '#b9c7c2', '#d0aa54'],
  },
  {
    id: 'stonewood-twilight',
    name: 'Stonewood Twilight',
    short: 'Twilight',
    glyph: '◐',
    description: 'Velvety sapphire shadow, burl wood, copper, and soft amber lanternlight.',
    swatch: ['#0c1024', '#241d37', '#7b412d', '#e0aa61'],
  },
  {
    id: 'stonewood-copper',
    name: 'Stonewood Copper',
    short: 'Copper',
    glyph: '◉',
    description: 'Smoked walnut, dark moss, oxidised copper, and warm workbench glow.',
    swatch: ['#17110e', '#263126', '#9b5435', '#e0b36d'],
  },
  {
    id: 'stonewood-moonstone',
    name: 'Stonewood Moonstone',
    short: 'Moonstone',
    glyph: '○',
    description: 'Pearl stonewood, misted silver, cool blue, and soft lunar interfaces.',
    swatch: ['#dbe4e1', '#aebfc2', '#667e8f', '#f4e7c1'],
  },
  {
    id: 'stonewood-verdigris',
    name: 'Stonewood Verdigris',
    short: 'Verdigris',
    glyph: '◇',
    description: 'Ancient copper, turquoise oxidation, archive green, and precursor depth.',
    swatch: ['#061b17', '#17463f', '#3f8f82', '#c69a4b'],
  },
  {
    id: 'stonewood-starless',
    name: 'Stonewood Starless',
    short: 'Starless',
    glyph: '●',
    description: 'Maximum darkness, minimal glare, and only the smallest instrument lights.',
    swatch: ['#010302', '#050807', '#293532', '#8f7a47'],
  },
  {
    id: 'emerald-reliquary',
    name: 'Emerald Reliquary',
    short: 'Reliquary',
    glyph: '✦',
    description: 'Ceremonial emerald velvet, metallic gold, ivory, and celestial filigree.',
    swatch: ['#03110d', '#0d3b2e', '#d6b55a', '#f3ebdd'],
  },
]);

const THEME_IDS = new Set(THEMES.map((theme) => theme.id));

function safeStorageGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private or embedded contexts. The theme still works for the session.
  }
}

function getObservatoryHour(date = new Date()) {
  const hourPart = new Intl.DateTimeFormat('en-US', {
    timeZone: OBSERVATORY_TIME_ZONE,
    hour: '2-digit',
    hour12: false,
  })
    .formatToParts(date)
    .find((part) => part.type === 'hour')?.value;

  const hour = Number(hourPart === '24' ? '00' : hourPart || 0);
  return Number.isFinite(hour) ? hour : 0;
}

function getAutoTheme(date = new Date()) {
  const hour = getObservatoryHour(date);

  if (hour >= 5 && hour < 9) return 'stonewood-moonstone';
  if (hour >= 9 && hour < 17) return 'stonewood-copper';
  if (hour >= 17 && hour < 21) return 'stonewood-twilight';
  if (hour >= 21 || hour < 1) return 'stonewood-obsidian';
  return 'stonewood-starless';
}

function getTheme(themeId) {
  return THEMES.find((theme) => theme.id === themeId) || THEMES[1];
}

function announce(message) {
  let liveRegion = document.querySelector('.stonewood-live-region');
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.className = 'stonewood-live-region';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    document.body.append(liveRegion);
  }

  liveRegion.textContent = '';
  window.requestAnimationFrame(() => {
    liveRegion.textContent = message;
  });
}

function dispatchThemeChange(theme, mode) {
  window.dispatchEvent(new CustomEvent('stonewood:themechange', {
    detail: { theme: theme.id, name: theme.name, mode },
  }));
}

function setPressedState(activeThemeId, mode) {
  document.querySelectorAll('[data-stonewood-choice]').forEach((button) => {
    const isActive = mode === 'manual' && button.dataset.stonewoodChoice === activeThemeId;
    button.setAttribute('aria-pressed', String(isActive));
  });

  const autoButton = document.querySelector('[data-stonewood-auto]');
  if (autoButton) autoButton.setAttribute('aria-pressed', String(mode === 'auto'));
}

function applyTheme(themeId, { mode = 'manual', persist = true, announceChange = true } = {}) {
  const resolvedThemeId = mode === 'auto' ? getAutoTheme() : themeId;
  const theme = getTheme(THEME_IDS.has(resolvedThemeId) ? resolvedThemeId : 'stonewood-twilight');

  document.documentElement.dataset.stonewoodTheme = theme.id;
  document.documentElement.dataset.stonewoodMode = mode;
  document.documentElement.style.colorScheme = theme.id === 'stonewood-moonstone' ? 'light' : 'dark';

  if (persist) {
    safeStorageSet(MODE_KEY, mode);
    if (mode === 'manual') safeStorageSet(STORAGE_KEY, theme.id);
  }

  const dial = document.querySelector('.stonewood-dial');
  const label = document.querySelector('.stonewood-current-theme');
  if (dial) {
    dial.dataset.theme = theme.id;
    dial.setAttribute('aria-label', `Open theme instrument. Current theme: ${theme.name}`);
    dial.title = `${theme.name} · Alt+T`;
  }
  if (label) label.textContent = mode === 'auto' ? `${theme.short} · Local time` : theme.short;

  setPressedState(theme.id, mode);
  dispatchThemeChange(theme, mode);
  if (announceChange) announce(`${theme.name} applied${mode === 'auto' ? ' by local time' : ''}.`);

  return theme;
}

function closePanel({ restoreFocus = true } = {}) {
  const panel = document.getElementById(PANEL_ID);
  const dial = document.querySelector('.stonewood-dial');
  if (!panel || !dial) return;

  panel.hidden = true;
  dial.setAttribute('aria-expanded', 'false');
  document.documentElement.classList.remove('stonewood-panel-open');
  if (restoreFocus) dial.focus();
}

function openPanel() {
  const panel = document.getElementById(PANEL_ID);
  const dial = document.querySelector('.stonewood-dial');
  if (!panel || !dial) return;

  panel.hidden = false;
  dial.setAttribute('aria-expanded', 'true');
  document.documentElement.classList.add('stonewood-panel-open');
  panel.querySelector('button')?.focus();
}

function togglePanel() {
  const panel = document.getElementById(PANEL_ID);
  if (!panel) return;
  if (panel.hidden) openPanel();
  else closePanel();
}

function makeSwatches(theme) {
  return theme.swatch
    .map((colour) => `<span style="--stonewood-swatch:${colour}" aria-hidden="true"></span>`)
    .join('');
}

function buildThemeInstrument() {
  if (document.querySelector('.stonewood-theme-instrument')) return;

  const instrument = document.createElement('aside');
  instrument.className = 'stonewood-theme-instrument';
  instrument.setAttribute('aria-label', 'Stonewood theme instrument');
  instrument.innerHTML = `
    <button class="stonewood-dial" type="button" aria-controls="${PANEL_ID}" aria-expanded="false">
      <span class="stonewood-dial-rings" aria-hidden="true"></span>
      <span class="stonewood-dial-star" aria-hidden="true">✦</span>
      <span class="stonewood-current-theme">Twilight</span>
    </button>

    <section class="stonewood-theme-panel" id="${PANEL_ID}" hidden>
      <header class="stonewood-theme-header">
        <div>
          <span>Atmospheric instrument</span>
          <h2>Stonewood States</h2>
        </div>
        <button class="stonewood-close" type="button" aria-label="Close theme instrument">×</button>
      </header>

      <p class="stonewood-theme-intro">Material stays Stonewood. Light, metal, and weather change.</p>

      <button class="stonewood-auto" type="button" data-stonewood-auto aria-pressed="false">
        <span class="stonewood-auto-orbit" aria-hidden="true">◌</span>
        <span><strong>Follow observatory time</strong><small>Moonstone · Copper · Twilight · Obsidian · Starless</small></span>
      </button>

      <div class="stonewood-theme-grid" role="group" aria-label="Choose a Stonewood state">
        ${THEMES.map((theme) => `
          <button class="stonewood-theme-choice" type="button" data-stonewood-choice="${theme.id}" aria-pressed="false">
            <span class="stonewood-choice-glyph" aria-hidden="true">${theme.glyph}</span>
            <span class="stonewood-choice-copy">
              <strong>${theme.name}</strong>
              <small>${theme.description}</small>
              <span class="stonewood-swatches" aria-hidden="true">${makeSwatches(theme)}</span>
            </span>
          </button>
        `).join('')}
      </div>

      <footer class="stonewood-theme-footer">
        <span>Alt+T opens the instrument</span>
        <span>Preference remains on this device</span>
      </footer>
    </section>
  `;

  document.body.append(instrument);

  const dial = instrument.querySelector('.stonewood-dial');
  const closeButton = instrument.querySelector('.stonewood-close');
  const autoButton = instrument.querySelector('[data-stonewood-auto]');

  dial.addEventListener('click', togglePanel);
  closeButton.addEventListener('click', () => closePanel());

  autoButton.addEventListener('click', () => {
    applyTheme(getAutoTheme(), { mode: 'auto' });
    if ('vibrate' in navigator) navigator.vibrate(8);
  });

  instrument.querySelectorAll('[data-stonewood-choice]').forEach((button) => {
    button.addEventListener('click', () => {
      applyTheme(button.dataset.stonewoodChoice, { mode: 'manual' });
      if ('vibrate' in navigator) navigator.vibrate(8);
    });
  });

  document.addEventListener('pointerdown', (event) => {
    const panel = document.getElementById(PANEL_ID);
    if (!panel || panel.hidden || instrument.contains(event.target)) return;
    closePanel({ restoreFocus: false });
  });

  document.addEventListener('keydown', (event) => {
    if (event.altKey && event.key.toLowerCase() === 't') {
      event.preventDefault();
      togglePanel();
      return;
    }

    if (event.key === 'Escape' && !document.getElementById(PANEL_ID)?.hidden) {
      event.stopPropagation();
      closePanel();
    }
  }, true);
}

function initialiseStonewood() {
  buildThemeInstrument();

  const savedMode = safeStorageGet(MODE_KEY) === 'auto' ? 'auto' : 'manual';
  const savedTheme = safeStorageGet(STORAGE_KEY);
  const initialTheme = THEME_IDS.has(savedTheme) ? savedTheme : 'stonewood-twilight';
  applyTheme(initialTheme, { mode: savedMode, persist: false, announceChange: false });

  window.setInterval(() => {
    if (document.documentElement.dataset.stonewoodMode === 'auto') {
      applyTheme(getAutoTheme(), { mode: 'auto', persist: false, announceChange: false });
    }
  }, 60_000);
}

window.STONEWOOD_THEMES = Object.freeze({
  themes: THEMES,
  apply: (themeId) => applyTheme(themeId, { mode: 'manual' }),
  followTime: () => applyTheme(getAutoTheme(), { mode: 'auto' }),
  current: () => ({
    theme: document.documentElement.dataset.stonewoodTheme,
    mode: document.documentElement.dataset.stonewoodMode,
  }),
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialiseStonewood, { once: true });
} else {
  initialiseStonewood();
}
