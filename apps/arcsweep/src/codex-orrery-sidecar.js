import './codex-orrery.css';

import {
  CODEX_ORRERY_STATE_SCHEMA,
  codexOrreryBody,
  createCodexOrreryState,
} from './codex/codex-orrery-model.js';

export const CODEX_ORRERY_SIDECAR_SCHEMA = 'hearthweave.codex-orrery-sidecar/v0.1';

const ROOT_ID = 'arcsweep-magic-book';
const PANEL_ID = 'codex-orrery-panel';
let observer = null;
let booted = false;
let lastState = null;
let focusedBodyId = 'earth';

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

function panelMarkup() {
  return [
    `<section id="${PANEL_ID}" class="codex-orrery" data-schema="${CODEX_ORRERY_SIDECAR_SCHEMA}" aria-labelledby="codex-orrery-title" hidden>`,
      '<header class="codex-orrery-heading">',
        '<div>',
          '<p class="magic-book-kicker">Orrery · heliocentric plate v0.1</p>',
          '<h2 id="codex-orrery-title">Hold the Solar System at an Instant</h2>',
          '<p>VSOP87 planetary positions. Time advances only when you ask it to.</p>',
        '</div>',
        '<button type="button" data-codex-orrery-close>Close</button>',
      '</header>',
      '<div class="codex-orrery-body">',
        '<form class="codex-orrery-controls" data-codex-orrery-form>',
          `<label>Selected time <input name="selectedAt" type="datetime-local" step="60" value="${localInputValue()}" required></label>`,
          '<div class="codex-orrery-actions">',
            '<button type="button" data-codex-orrery-shift="-1">−1 day</button>',
            '<button type="button" data-codex-orrery-now>Now</button>',
            '<button type="button" data-codex-orrery-shift="1">+1 day</button>',
            '<button type="submit">Set Orrery</button>',
          '</div>',
          '<p class="codex-orrery-status" data-codex-orrery-status>The mechanism is quiet. Set a time to compute planetary positions.</p>',
          '<small>Orbital positions are heliocentric. Ring spacing is compressed for the page; numeric AU values are not.</small>',
        '</form>',
        '<div class="codex-orrery-instrument">',
          '<div class="codex-orrery-stage" data-codex-orrery-stage aria-label="Solar System orrery plate">',
            '<div class="codex-orrery-orbits" data-codex-orrery-orbits aria-hidden="true"></div>',
            '<div class="codex-orrery-bodies" data-codex-orrery-bodies></div>',
            '<button type="button" class="codex-orrery-sun" data-codex-orrery-body="sun" aria-label="Focus Sun">☉</button>',
          '</div>',
          '<aside class="codex-orrery-focus" aria-live="polite">',
            '<p class="magic-book-kicker">Focus</p>',
            '<h3 data-codex-orrery-focus-name>—</h3>',
            '<dl data-codex-orrery-focus-reading>',
              '<div><dt>Range</dt><dd>—</dd></div>',
              '<div><dt>Longitude</dt><dd>—</dd></div>',
              '<div><dt>Latitude</dt><dd>—</dd></div>',
              '<div><dt>X</dt><dd>—</dd></div>',
              '<div><dt>Y</dt><dd>—</dd></div>',
              '<div><dt>Z</dt><dd>—</dd></div>',
            '</dl>',
          '</aside>',
        '</div>',
      '</div>',
      '<footer><small>The displayed plate is an interaction view, not a single-scale mechanical reconstruction. No orbit advances autonomously.</small></footer>',
    '</section>',
  ].join('');
}

function publish(name, detail = {}) {
  const payload = Object.freeze({ schema: CODEX_ORRERY_SIDECAR_SCHEMA, ...detail });
  try { globalThis.__arcsweepOS?.bus?.publish?.(name, payload, { source: 'codex-orrery' }); } catch {}
  globalThis.dispatchEvent?.(new CustomEvent(name, { detail: payload }));
}

function ensureMounted() {
  const root = document.getElementById(ROOT_ID);
  if (!root) return false;
  if (!root.querySelector(`#${PANEL_ID}`)) root.insertAdjacentHTML('beforeend', panelMarkup());

  const card = root.querySelector('[data-codex-instrument="orrery"]');
  if (card && !card.querySelector('[data-codex-orrery-open]')) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.codexOrreryOpen = 'true';
    button.textContent = 'Open Orrery';
    card.append(button);
  }
  return true;
}

function setStatus(message, state = 'quiet') {
  const status = document.querySelector('[data-codex-orrery-status]');
  if (!status) return;
  status.textContent = String(message || '');
  status.dataset.state = state;
}

function bodyMarkup(body) {
  const left = 50 + body.display.x * 42;
  const top = 50 - body.display.y * 42;
  return `<button type="button" class="codex-orrery-body-marker codex-orrery-${esc(body.id)}" data-codex-orrery-body="${esc(body.id)}" style="--orrery-x:${left.toFixed(3)}%;--orrery-y:${top.toFixed(3)}%" aria-label="Focus ${esc(body.label)}"><span>${esc(body.label)}</span></button>`;
}

function orbitMarkup(body) {
  const diameter = Math.max(8, body.display.radius * 84);
  return `<span class="codex-orrery-orbit" style="--orrery-orbit:${diameter.toFixed(3)}%"></span>`;
}

function renderFocus() {
  if (!lastState) return;
  const body = codexOrreryBody(lastState, focusedBodyId) || codexOrreryBody(lastState, 'earth');
  if (!body) return;
  focusedBodyId = body.id;

  document.querySelectorAll('[data-codex-orrery-body]').forEach((node) => {
    node.dataset.focused = String(node.dataset.codexOrreryBody === body.id);
  });

  const name = document.querySelector('[data-codex-orrery-focus-name]');
  const list = document.querySelector('[data-codex-orrery-focus-reading]');
  if (name) name.textContent = body.label;
  if (!list) return;

  const values = body.id === 'sun'
    ? ['0 AU', '—', '—', '0 AU', '0 AU', '0 AU']
    : [
        `${body.rangeAU.toFixed(6)} AU`,
        `${body.longitudeDegrees.toFixed(3)}°`,
        `${body.latitudeDegrees.toFixed(3)}°`,
        `${body.xAU.toFixed(6)} AU`,
        `${body.yAU.toFixed(6)} AU`,
        `${body.zAU.toFixed(6)} AU`,
      ];
  [...list.querySelectorAll('dd')].forEach((node, index) => { node.textContent = values[index] || '—'; });
}

function renderState(state) {
  const orbits = document.querySelector('[data-codex-orrery-orbits]');
  const bodies = document.querySelector('[data-codex-orrery-bodies]');
  if (!orbits || !bodies) return;
  orbits.innerHTML = state.bodies.map(orbitMarkup).join('');
  bodies.innerHTML = state.bodies.map(bodyMarkup).join('');
  renderFocus();
  setStatus(`Held at ${state.selectedAt} · ${state.source.theory}`, 'read');
}

async function computeFromForm(form) {
  try {
    setStatus('Computing heliocentric positions…', 'working');
    const selectedAt = new Date(form.elements.selectedAt.value);
    const state = await createCodexOrreryState({ at: selectedAt });
    lastState = state;
    renderState(state);
    publish('codex:orrery-time-change', { state });
  } catch (error) {
    setStatus(error?.message || 'Unable to compute this orrery state.', 'error');
  }
}

function focusBody(bodyId) {
  if (!lastState) return false;
  const body = codexOrreryBody(lastState, bodyId);
  if (!body) return false;
  focusedBodyId = body.id;
  renderFocus();
  publish('codex:orrery-focus', { body, selectedAt: lastState.selectedAt });
  return true;
}

function shiftSelectedTime(form, days) {
  const current = new Date(form.elements.selectedAt.value);
  const base = Number.isFinite(current.getTime()) ? current : new Date();
  base.setDate(base.getDate() + Number(days || 0));
  form.elements.selectedAt.value = localInputValue(base);
  void computeFromForm(form);
}

function openPanel() {
  if (!ensureMounted()) return false;
  const panel = document.getElementById(PANEL_ID);
  if (!panel) return false;
  panel.hidden = false;
  if (lastState) renderState(lastState);
  panel.querySelector('input[name="selectedAt"]')?.focus?.();
  return true;
}

function closePanel() {
  const panel = document.getElementById(PANEL_ID);
  if (!panel || panel.hidden) return false;
  panel.hidden = true;
  return true;
}

function onClick(event) {
  if (event.target?.closest?.('[data-codex-orrery-open]')) {
    event.preventDefault();
    openPanel();
    return;
  }
  if (event.target?.closest?.('[data-codex-orrery-close]')) {
    event.preventDefault();
    closePanel();
    return;
  }
  const body = event.target?.closest?.('[data-codex-orrery-body]');
  if (body) {
    event.preventDefault();
    focusBody(body.dataset.codexOrreryBody);
    return;
  }
  const form = event.target?.closest?.('[data-codex-orrery-form]');
  if (!form) return;
  const shift = event.target?.closest?.('[data-codex-orrery-shift]');
  if (shift) {
    event.preventDefault();
    shiftSelectedTime(form, Number(shift.dataset.codexOrreryShift));
    return;
  }
  if (event.target?.closest?.('[data-codex-orrery-now]')) {
    event.preventDefault();
    form.elements.selectedAt.value = localInputValue(new Date());
    void computeFromForm(form);
  }
}

function onSubmit(event) {
  const form = event.target?.closest?.('[data-codex-orrery-form]');
  if (!form) return;
  event.preventDefault();
  void computeFromForm(form);
}

function onKeydown(event) {
  if (event.key === 'Escape' && !document.getElementById(PANEL_ID)?.hidden) closePanel();
}

export function codexOrrerySnapshot() {
  return Object.freeze({
    schema: CODEX_ORRERY_SIDECAR_SCHEMA,
    stateSchema: CODEX_ORRERY_STATE_SCHEMA,
    selectedAt: lastState?.selectedAt || null,
    focusedBodyId,
    autonomousTime: false,
    autonomousMotion: false,
    networkRequired: false,
  });
}

export function bootCodexOrrery() {
  if (booted) return true;
  booted = true;
  ensureMounted();
  document.addEventListener('click', onClick);
  document.addEventListener('submit', onSubmit);
  document.addEventListener('keydown', onKeydown);
  observer = new MutationObserver(() => ensureMounted());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  return true;
}

export function teardownCodexOrrery() {
  if (!booted) return;
  booted = false;
  observer?.disconnect?.();
  observer = null;
  document.removeEventListener('click', onClick);
  document.removeEventListener('submit', onSubmit);
  document.removeEventListener('keydown', onKeydown);
}

if (typeof document !== 'undefined') bootCodexOrrery();
