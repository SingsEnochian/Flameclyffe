import './codex-astrolabe.css';

import {
  buildCodexAstrolabeReading,
  CODEX_ASTROLABE_READING_SCHEMA,
} from './codex/codex-astrolabe-model.js';

export const CODEX_ASTROLABE_SIDECAR_SCHEMA = 'hearthweave.codex-astrolabe-sidecar/v0.1';

const ROOT_ID = 'arcsweep-magic-book';
const PANEL_ID = 'codex-astrolabe-panel';
let observer = null;
let booted = false;
let lastReading = null;

function esc(value) {
  return String(value == null ? '' : value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function localInputValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function signed(value, suffix = '°') {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return `${number >= 0 ? '+' : ''}${number.toFixed(2)}${suffix}`;
}

function angle(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(2)}°` : '—';
}

function panelMarkup() {
  return [
    `<section id="${PANEL_ID}" class="codex-astrolabe" data-schema="${CODEX_ASTROLABE_SIDECAR_SCHEMA}" aria-labelledby="codex-astrolabe-title" hidden>`,
      '<header class="codex-astrolabe-heading">',
        '<div>',
          '<p class="magic-book-kicker">Astrolabe · observing plate v0.1</p>',
          '<h2 id="codex-astrolabe-title">Read the Sun</h2>',
          '<p>Independent approximate astronomy. The dial moves only when you request a reading.</p>',
        '</div>',
        '<button type="button" data-codex-astrolabe-close>Close</button>',
      '</header>',
      '<div class="codex-astrolabe-body">',
        '<form class="codex-astrolabe-controls" data-codex-astrolabe-form>',
          '<label>Latitude <input name="latitude" inputmode="decimal" type="number" min="-90" max="90" step="0.0001" required placeholder="29.9000"></label>',
          '<label>Longitude <input name="longitude" inputmode="decimal" type="number" min="-180" max="180" step="0.0001" required placeholder="-81.3000"></label>',
          `<label>Observation time <input name="observedAt" type="datetime-local" step="60" value="${localInputValue()}" required></label>`,
          '<div class="codex-astrolabe-actions">',
            '<button type="button" data-codex-astrolabe-position>Use Device Position</button>',
            '<button type="button" data-codex-astrolabe-now>Now</button>',
            '<button type="submit">Read Sky</button>',
          '</div>',
          '<p class="codex-astrolabe-status" data-codex-astrolabe-status>Enter an observer position or request it explicitly from this device.</p>',
          '<small>Device position is never requested automatically. This sidecar does not persist coordinates.</small>',
        '</form>',
        '<div class="codex-astrolabe-instrument" aria-label="Astrolabe reading dial">',
          '<div class="codex-astrolabe-dial" data-codex-astrolabe-dial>',
            '<div class="codex-astrolabe-cardinals" aria-hidden="true"><span>N</span><span>E</span><span>S</span><span>W</span></div>',
            '<div class="codex-astrolabe-sidereal" aria-hidden="true"></div>',
            '<div class="codex-astrolabe-sun-hand" aria-hidden="true"><span>☉</span></div>',
            '<div class="codex-astrolabe-pin" aria-hidden="true"></div>',
          '</div>',
          '<dl class="codex-astrolabe-reading" data-codex-astrolabe-reading>',
            '<div><dt>Local sidereal</dt><dd>—</dd></div>',
            '<div><dt>Sun RA</dt><dd>—</dd></div>',
            '<div><dt>Sun Dec</dt><dd>—</dd></div>',
            '<div><dt>Altitude</dt><dd>—</dd></div>',
            '<div><dt>Azimuth</dt><dd>—</dd></div>',
            '<div><dt>Horizon</dt><dd>—</dd></div>',
          '</dl>',
        '</div>',
      '</div>',
      '<footer><small>v0.1 is an observing plate, not a full historical stereographic reconstruction and not navigation-grade ephemeris software.</small></footer>',
    '</section>',
  ].join('');
}

function publish(reading) {
  const detail = Object.freeze({
    schema: CODEX_ASTROLABE_SIDECAR_SCHEMA,
    reading,
  });
  try {
    globalThis.__arcsweepOS?.bus?.publish?.('codex:astrolabe-reading', detail, { source: 'codex-astrolabe' });
  } catch {}
  globalThis.dispatchEvent?.(new CustomEvent('codex:astrolabe-reading', { detail }));
}

function ensureMounted() {
  const root = document.getElementById(ROOT_ID);
  if (!root) return false;
  if (!root.querySelector(`#${PANEL_ID}`)) root.insertAdjacentHTML('beforeend', panelMarkup());

  const card = root.querySelector('[data-codex-instrument="astrolabe"]');
  if (card && !card.querySelector('[data-codex-astrolabe-open]')) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.codexAstrolabeOpen = 'true';
    button.textContent = 'Open Observing Plate';
    card.append(button);
  }
  return true;
}

function setStatus(message, state = 'quiet') {
  const status = document.querySelector('[data-codex-astrolabe-status]');
  if (!status) return;
  status.textContent = String(message || '');
  status.dataset.state = state;
}

function renderReading(reading) {
  const dial = document.querySelector('[data-codex-astrolabe-dial]');
  const list = document.querySelector('[data-codex-astrolabe-reading]');
  if (!dial || !list) return;

  dial.style.setProperty('--astrolabe-sidereal-angle', `${reading.time.localSiderealDegrees}deg`);
  dial.style.setProperty('--astrolabe-sun-azimuth', `${reading.sun.azimuthDegrees}deg`);
  dial.dataset.aboveHorizon = String(reading.sun.aboveHorizon);

  const values = [
    angle(reading.time.localSiderealDegrees),
    angle(reading.sun.rightAscensionDegrees),
    signed(reading.sun.declinationDegrees),
    signed(reading.sun.altitudeDegrees),
    angle(reading.sun.azimuthDegrees),
    reading.sun.aboveHorizon ? 'Above' : 'Below',
  ];
  [...list.querySelectorAll('dd')].forEach((node, index) => { node.textContent = values[index] || '—'; });
  setStatus(`Reading ${reading.observedAt} · ${reading.schema}`, 'read');
}

function openPanel() {
  if (!ensureMounted()) return false;
  const panel = document.getElementById(PANEL_ID);
  if (!panel) return false;
  panel.hidden = false;
  if (lastReading) renderReading(lastReading);
  panel.querySelector('input[name="latitude"]')?.focus?.();
  return true;
}

function closePanel() {
  const panel = document.getElementById(PANEL_ID);
  if (!panel || panel.hidden) return false;
  panel.hidden = true;
  return true;
}

function useDevicePosition() {
  if (!globalThis.navigator?.geolocation) {
    setStatus('Device geolocation is not available here.', 'error');
    return;
  }
  setStatus('Requesting device position…', 'working');
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      const form = document.querySelector('[data-codex-astrolabe-form]');
      if (!form) return;
      form.elements.latitude.value = Number(coords.latitude).toFixed(6);
      form.elements.longitude.value = Number(coords.longitude).toFixed(6);
      setStatus('Device position loaded. Press Read Sky to compute.', 'quiet');
    },
    () => setStatus('Device position was not provided.', 'error'),
    { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 },
  );
}

function onSubmit(form) {
  try {
    const observedAt = new Date(form.elements.observedAt.value);
    const reading = buildCodexAstrolabeReading({
      at: observedAt,
      latitudeDegrees: Number(form.elements.latitude.value),
      longitudeDegrees: Number(form.elements.longitude.value),
    });
    lastReading = reading;
    renderReading(reading);
    publish(reading);
  } catch (error) {
    setStatus(error?.message || 'Unable to compute this reading.', 'error');
  }
}

function onClick(event) {
  if (event.target?.closest?.('[data-codex-astrolabe-open]')) {
    event.preventDefault();
    openPanel();
    return;
  }
  if (event.target?.closest?.('[data-codex-astrolabe-close]')) {
    event.preventDefault();
    closePanel();
    return;
  }
  if (event.target?.closest?.('[data-codex-astrolabe-position]')) {
    event.preventDefault();
    useDevicePosition();
    return;
  }
  if (event.target?.closest?.('[data-codex-astrolabe-now]')) {
    event.preventDefault();
    const input = document.querySelector('[data-codex-astrolabe-form] input[name="observedAt"]');
    if (input) input.value = localInputValue(new Date());
  }
}

function onFormSubmit(event) {
  const form = event.target?.closest?.('[data-codex-astrolabe-form]');
  if (!form) return;
  event.preventDefault();
  onSubmit(form);
}

function onKeydown(event) {
  if (event.key === 'Escape' && !document.getElementById(PANEL_ID)?.hidden) closePanel();
}

export function codexAstrolabeSnapshot() {
  return Object.freeze({
    schema: CODEX_ASTROLABE_SIDECAR_SCHEMA,
    readingSchema: CODEX_ASTROLABE_READING_SCHEMA,
    reading: lastReading,
    persistsCoordinates: false,
    automaticLocation: false,
    autonomousMotion: false,
  });
}

export function bootCodexAstrolabe() {
  if (booted) return true;
  booted = true;
  ensureMounted();
  document.addEventListener('click', onClick);
  document.addEventListener('submit', onFormSubmit);
  document.addEventListener('keydown', onKeydown);
  observer = new MutationObserver(() => ensureMounted());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  return true;
}

export function teardownCodexAstrolabe() {
  if (!booted) return;
  booted = false;
  observer?.disconnect?.();
  observer = null;
  document.removeEventListener('click', onClick);
  document.removeEventListener('submit', onFormSubmit);
  document.removeEventListener('keydown', onKeydown);
}

if (typeof document !== 'undefined') bootCodexAstrolabe();
