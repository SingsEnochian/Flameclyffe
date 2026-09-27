import './codex-celestial-sphere.css';

import {
  CODEX_CELESTIAL_SPHERE_SCHEMA,
  codexCelestialBody,
  createCodexCelestialSphereState,
  projectCelestialVector,
} from './codex/codex-celestial-sphere-model.js';

export const CODEX_CELESTIAL_SPHERE_SIDECAR_SCHEMA = 'hearthweave.codex-celestial-sphere-sidecar/v0.1';

const ROOT_ID = 'arcsweep-magic-book';
const PANEL_ID = 'codex-celestial-sphere-panel';
const CANVAS_SIZE = 640;
let observer = null;
let booted = false;
let lastState = null;
let focusedBodyId = 'sun';
let orientation = { yawDegrees: 0, pitchDegrees: 0 };
let drag = null;

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
    `<section id="${PANEL_ID}" class="codex-celestial-sphere" data-schema="${CODEX_CELESTIAL_SPHERE_SIDECAR_SCHEMA}" aria-labelledby="codex-celestial-title" hidden>`,
      '<header class="codex-celestial-heading">',
        '<div>',
          '<p class="magic-book-kicker">Celestial Sphere · geocentric equatorial v0.1</p>',
          '<h2 id="codex-celestial-title">Turn the Sky</h2>',
          '<p>Earth-centred apparent RA/Dec for the Sun and seven planets. Drag rotates the sphere; time changes only on request.</p>',
        '</div>',
        '<button type="button" data-codex-celestial-close>Close</button>',
      '</header>',
      '<div class="codex-celestial-body">',
        '<form class="codex-celestial-controls" data-codex-celestial-form>',
          `<label>Selected time <input name="selectedAt" type="datetime-local" step="60" value="${localInputValue()}" required></label>`,
          '<div class="codex-celestial-actions">',
            '<button type="button" data-codex-celestial-now>Now</button>',
            '<button type="button" data-codex-celestial-reset>Reset View</button>',
            '<button type="submit">Set Sky</button>',
          '</div>',
          '<p class="codex-celestial-status" data-codex-celestial-status>The sphere is quiet. Set a time to compute the sky.</p>',
          '<small>v0.1 is geocentric and intentionally contains no star catalogue yet.</small>',
        '</form>',
        '<div class="codex-celestial-instrument">',
          `<canvas width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" class="codex-celestial-canvas" data-codex-celestial-canvas aria-label="Rotatable celestial sphere"></canvas>`,
          '<aside class="codex-celestial-focus" aria-live="polite">',
            '<p class="magic-book-kicker">Focus</p>',
            '<h3 data-codex-celestial-focus-name>—</h3>',
            '<dl>',
              '<div><dt>RA</dt><dd data-codex-celestial-ra>—</dd></div>',
              '<div><dt>Dec</dt><dd data-codex-celestial-dec>—</dd></div>',
              '<div><dt>Frame</dt><dd>Geocentric equatorial</dd></div>',
            '</dl>',
            '<div class="codex-celestial-body-list" data-codex-celestial-body-list></div>',
          '</aside>',
        '</div>',
      '</div>',
      '<footer><small>The sphere redraws only for requested time, focus, or user-driven orientation changes. No autonomous rotation.</small></footer>',
    '</section>',
  ].join('');
}

function publish(name, detail = {}) {
  const payload = Object.freeze({ schema: CODEX_CELESTIAL_SPHERE_SIDECAR_SCHEMA, ...detail });
  try { globalThis.__arcsweepOS?.bus?.publish?.(name, payload, { source: 'codex-celestial-sphere' }); } catch {}
  globalThis.dispatchEvent?.(new CustomEvent(name, { detail: payload }));
}

function ensureMounted() {
  const root = document.getElementById(ROOT_ID);
  if (!root) return false;
  if (!root.querySelector(`#${PANEL_ID}`)) root.insertAdjacentHTML('beforeend', panelMarkup());

  const card = root.querySelector('[data-codex-instrument="celestial-sphere"]');
  if (card && !card.querySelector('[data-codex-celestial-open]')) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.codexCelestialOpen = 'true';
    button.textContent = 'Open Celestial Sphere';
    card.append(button);
  }
  return true;
}

function setStatus(message, state = 'quiet') {
  const status = document.querySelector('[data-codex-celestial-status]');
  if (!status) return;
  status.textContent = String(message || '');
  status.dataset.state = state;
}

function drawGrid(ctx, radius) {
  const centre = CANVAS_SIZE / 2;
  ctx.save();
  ctx.translate(centre, centre);
  ctx.strokeStyle = 'rgba(216, 188, 134, 0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  for (const declination of [-60, -30, 0, 30, 60]) {
    drawCoordinateCurve(ctx, radius, Array.from({ length: 145 }, (_, index) => ({
      rightAscensionDegrees: index * 2.5,
      declinationDegrees: declination,
    })));
  }
  for (const rightAscensionDegrees of [0, 45, 90, 135, 180, 225, 270, 315]) {
    drawCoordinateCurve(ctx, radius, Array.from({ length: 73 }, (_, index) => ({
      rightAscensionDegrees,
      declinationDegrees: -90 + index * 2.5,
    })));
  }
  ctx.restore();
}

function vectorFromEquatorial(rightAscensionDegrees, declinationDegrees) {
  const ra = rightAscensionDegrees * Math.PI / 180;
  const dec = declinationDegrees * Math.PI / 180;
  const cosDec = Math.cos(dec);
  return { x: cosDec * Math.cos(ra), y: Math.sin(dec), z: cosDec * Math.sin(ra) };
}

function drawCoordinateCurve(ctx, radius, points) {
  let drawing = false;
  ctx.beginPath();
  for (const point of points) {
    const projected = projectCelestialVector(vectorFromEquatorial(point.rightAscensionDegrees, point.declinationDegrees), orientation);
    if (!projected.visible) {
      drawing = false;
      continue;
    }
    const x = projected.x * radius;
    const y = -projected.y * radius;
    if (!drawing) {
      ctx.moveTo(x, y);
      drawing = true;
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}

function drawSphere() {
  const canvas = document.querySelector('[data-codex-celestial-canvas]');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const centre = CANVAS_SIZE / 2;
  const radius = CANVAS_SIZE * 0.42;

  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  ctx.fillStyle = 'rgba(8, 10, 15, 0.92)';
  ctx.beginPath();
  ctx.arc(centre, centre, radius, 0, Math.PI * 2);
  ctx.fill();
  drawGrid(ctx, radius);

  if (!lastState) return;
  for (const body of lastState.bodies) {
    const projected = projectCelestialVector(body.vector, orientation);
    if (!projected.visible) continue;
    const x = centre + projected.x * radius;
    const y = centre - projected.y * radius;
    const focused = body.id === focusedBodyId;
    ctx.beginPath();
    ctx.fillStyle = focused ? 'rgba(255, 238, 181, 1)' : 'rgba(223, 199, 151, 0.82)';
    ctx.arc(x, y, focused ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = focused ? 'rgba(255, 241, 204, 0.98)' : 'rgba(231, 218, 190, 0.68)';
    ctx.fillText(body.label, x + 9, y - 7);
  }
}

function renderBodyList() {
  const list = document.querySelector('[data-codex-celestial-body-list]');
  if (!list || !lastState) return;
  list.innerHTML = lastState.bodies.map((body) => (
    `<button type="button" data-codex-celestial-body="${esc(body.id)}" data-focused="${body.id === focusedBodyId}">${esc(body.label)}</button>`
  )).join('');
}

function renderFocus() {
  if (!lastState) return;
  const body = codexCelestialBody(lastState, focusedBodyId) || lastState.bodies[0];
  if (!body) return;
  focusedBodyId = body.id;
  const name = document.querySelector('[data-codex-celestial-focus-name]');
  const ra = document.querySelector('[data-codex-celestial-ra]');
  const dec = document.querySelector('[data-codex-celestial-dec]');
  if (name) name.textContent = body.label;
  if (ra) ra.textContent = `${body.rightAscensionDegrees.toFixed(3)}°`;
  if (dec) dec.textContent = `${body.declinationDegrees >= 0 ? '+' : ''}${body.declinationDegrees.toFixed(3)}°`;
  renderBodyList();
  drawSphere();
}

async function computeFromForm(form) {
  try {
    setStatus('Computing apparent geocentric coordinates…', 'working');
    const state = await createCodexCelestialSphereState({ at: new Date(form.elements.selectedAt.value) });
    lastState = state;
    if (!codexCelestialBody(state, focusedBodyId)) focusedBodyId = 'sun';
    renderFocus();
    setStatus(`Sky held at ${state.selectedAt} · ${state.source.planetMethod}`, 'read');
    publish('codex:celestial-time-change', { state });
  } catch (error) {
    setStatus(error?.message || 'Unable to compute this celestial sphere.', 'error');
  }
}

function focusBody(bodyId) {
  if (!lastState) return false;
  const body = codexCelestialBody(lastState, bodyId);
  if (!body) return false;
  focusedBodyId = body.id;
  renderFocus();
  publish('codex:celestial-focus', { body, selectedAt: lastState.selectedAt });
  return true;
}

function resetOrientation() {
  orientation = { yawDegrees: 0, pitchDegrees: 0 };
  drawSphere();
  publish('codex:celestial-orientation-change', { orientation: Object.freeze({ ...orientation }) });
}

function beginDrag(event) {
  const canvas = event.target?.closest?.('[data-codex-celestial-canvas]');
  if (!canvas) return;
  drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  canvas.setPointerCapture?.(event.pointerId);
}

function moveDrag(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  drag.x = event.clientX;
  drag.y = event.clientY;
  orientation = {
    yawDegrees: orientation.yawDegrees + dx * 0.35,
    pitchDegrees: Math.max(-80, Math.min(80, orientation.pitchDegrees - dy * 0.35)),
  };
  drawSphere();
}

function endDrag(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  drag = null;
  publish('codex:celestial-orientation-change', { orientation: Object.freeze({ ...orientation }) });
}

function openPanel() {
  if (!ensureMounted()) return false;
  const panel = document.getElementById(PANEL_ID);
  if (!panel) return false;
  panel.hidden = false;
  drawSphere();
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
  if (event.target?.closest?.('[data-codex-celestial-open]')) {
    event.preventDefault();
    openPanel();
    return;
  }
  if (event.target?.closest?.('[data-codex-celestial-close]')) {
    event.preventDefault();
    closePanel();
    return;
  }
  const body = event.target?.closest?.('[data-codex-celestial-body]');
  if (body) {
    event.preventDefault();
    focusBody(body.dataset.codexCelestialBody);
    return;
  }
  const form = event.target?.closest?.('[data-codex-celestial-form]');
  if (!form) return;
  if (event.target?.closest?.('[data-codex-celestial-now]')) {
    event.preventDefault();
    form.elements.selectedAt.value = localInputValue(new Date());
    void computeFromForm(form);
    return;
  }
  if (event.target?.closest?.('[data-codex-celestial-reset]')) {
    event.preventDefault();
    resetOrientation();
  }
}

function onSubmit(event) {
  const form = event.target?.closest?.('[data-codex-celestial-form]');
  if (!form) return;
  event.preventDefault();
  void computeFromForm(form);
}

function onKeydown(event) {
  if (event.key === 'Escape' && !document.getElementById(PANEL_ID)?.hidden) closePanel();
}

export function codexCelestialSphereSnapshot() {
  return Object.freeze({
    schema: CODEX_CELESTIAL_SPHERE_SIDECAR_SCHEMA,
    stateSchema: CODEX_CELESTIAL_SPHERE_SCHEMA,
    selectedAt: lastState?.selectedAt || null,
    focusedBodyId,
    orientation: Object.freeze({ ...orientation }),
    autonomousTime: false,
    autonomousMotion: false,
    starCatalogue: null,
  });
}

export function bootCodexCelestialSphere() {
  if (booted) return true;
  booted = true;
  ensureMounted();
  document.addEventListener('click', onClick);
  document.addEventListener('submit', onSubmit);
  document.addEventListener('keydown', onKeydown);
  document.addEventListener('pointerdown', beginDrag);
  document.addEventListener('pointermove', moveDrag);
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);
  observer = new MutationObserver(() => ensureMounted());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  return true;
}

export function teardownCodexCelestialSphere() {
  if (!booted) return;
  booted = false;
  observer?.disconnect?.();
  observer = null;
  drag = null;
  document.removeEventListener('click', onClick);
  document.removeEventListener('submit', onSubmit);
  document.removeEventListener('keydown', onKeydown);
  document.removeEventListener('pointerdown', beginDrag);
  document.removeEventListener('pointermove', moveDrag);
  document.removeEventListener('pointerup', endDrag);
  document.removeEventListener('pointercancel', endDrag);
}

if (typeof document !== 'undefined') bootCodexCelestialSphere();
