import { ATLAS_LAYERS, EPRA_ATLAS_SAMPLE } from './epra-atlas-components.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const VIEWBOX = Object.freeze({ width: 1000, height: 560 });
const STYLE_ID = 'starwell-atlas-hall-interface-style';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function svg(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}

function button(label, onClick, className = '') {
  const node = el('button', className, label);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}

function mapPoint(point) {
  return { x: point.x * VIEWBOX.width, y: point.y * VIEWBOX.height };
}

function routePath(waypoints) {
  return waypoints.map((point, index) => {
    const mapped = mapPoint(point);
    return `${index ? 'L' : 'M'} ${mapped.x.toFixed(1)} ${mapped.y.toFixed(1)}`;
  }).join(' ');
}

function pointAtProgress(waypoints, progress) {
  const bounded = Math.max(0, Math.min(1, progress));
  const scaled = bounded * (waypoints.length - 1);
  const index = Math.min(waypoints.length - 2, Math.floor(scaled));
  const local = scaled - index;
  const a = mapPoint(waypoints[index]);
  const b = mapPoint(waypoints[index + 1]);
  return { x: a.x + (b.x - a.x) * local, y: a.y + (b.y - a.y) * local };
}

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const link = document.createElement('link');
  link.id = STYLE_ID;
  link.rel = 'stylesheet';
  link.href = new URL('./atlas-hall-bridge.css', import.meta.url).href;
  document.head.append(link);
}

function visibleForLayers(layerNames, enabledLayers) {
  if (!layerNames.length) return true;
  return layerNames.some((layer) => enabledLayers.has(layer));
}

export function mountAtlasHallProjection(host, projection = EPRA_ATLAS_SAMPLE) {
  if (!host || host.querySelector(':scope > .atlas-hall-interface')) return host?.querySelector(':scope > .atlas-hall-interface') || null;
  ensureStyle();

  const enabledLayers = new Set(projection.enabled_layers);
  const flightPath = projection.flight_paths[0] || null;
  let selected = flightPath ? { type: 'flight-path', value: flightPath } : null;
  let progress = 0;
  let animationFrame = null;
  let animationStarted = null;

  const root = el('section', 'atlas-hall-interface');
  root.dataset.projectionSchema = projection.schema;
  root.dataset.demoOnly = String(Boolean(projection.demo_only));
  root.innerHTML = `
    <header class="ahi-header">
      <div>
        <span class="ahi-kicker">Epra Atlas · interactive projection</span>
        <h3>Atlas Hall map instrument</h3>
        <p>STARWELL world/location records remain the semantic source above. This surface renders map layers and cinematic routes without becoming canon itself.</p>
      </div>
      <span class="ahi-boundary">${projection.demo_only ? 'NON-CANON DEMO' : 'PROJECTION'}</span>
    </header>`;

  const layout = el('div', 'ahi-layout');
  const controls = el('aside', 'ahi-controls');
  controls.append(el('h4', '', 'Layers'));
  const layerList = el('div', 'ahi-layer-list');
  for (const layer of ATLAS_LAYERS) {
    const label = el('label', 'ahi-layer');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = enabledLayers.has(layer.id);
    input.value = layer.id;
    const copy = el('span');
    copy.innerHTML = `<strong>${layer.label}</strong><small>${layer.description}</small>`;
    input.addEventListener('change', () => {
      if (input.checked) enabledLayers.add(layer.id);
      else enabledLayers.delete(layer.id);
      refreshVisibility();
    });
    label.append(input, copy);
    layerList.append(label);
  }
  controls.append(layerList);

  const stageColumn = el('div', 'ahi-stage-column');
  const stage = el('div', 'ahi-map');
  stage.setAttribute('aria-label', 'Epra Atlas interactive projection');
  const mapSvg = svg('svg', { viewBox: `0 0 ${VIEWBOX.width} ${VIEWBOX.height}`, role: 'img', 'aria-label': 'Epra Atlas draft map with selectable region and cinematic route' });
  mapSvg.classList.add('ahi-map-svg');

  const terrain = svg('path', { d: 'M 0 455 C 120 390 160 200 310 245 C 420 280 470 95 610 155 C 730 205 790 110 1000 170 L 1000 560 L 0 560 Z' });
  terrain.classList.add('ahi-terrain');
  terrain.dataset.layers = 'geography';
  const canyon = svg('path', { d: 'M 65 495 C 220 430 245 315 380 295 C 530 275 600 390 755 322 C 855 280 930 230 1000 245' });
  canyon.classList.add('ahi-canyon');
  canyon.dataset.layers = 'geography';
  mapSvg.append(terrain, canyon);

  for (const region of projection.regions) {
    const points = region.points.map((point) => {
      const mapped = mapPoint(point);
      return `${mapped.x},${mapped.y}`;
    }).join(' ');
    const node = svg('polygon', { points, tabindex: 0, role: 'button', 'aria-label': `${region.label}, ${region.kind}` });
    node.classList.add('ahi-region');
    node.dataset.layers = region.layers.join(' ');
    node.addEventListener('click', () => select('region', region));
    node.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select('region', region);
      }
    });
    mapSvg.append(node);
  }

  if (flightPath) {
    const route = svg('path', { d: routePath(flightPath.waypoints), tabindex: 0, role: 'button', 'aria-label': `${flightPath.label}, cinematic flight path` });
    route.classList.add('ahi-route');
    route.dataset.layers = 'cinematic';
    route.addEventListener('click', () => select('flight-path', flightPath));
    route.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select('flight-path', flightPath);
      }
    });
    mapSvg.append(route);
  }

  const camera = svg('g', { 'aria-hidden': 'true' });
  camera.classList.add('ahi-camera');
  camera.dataset.layers = 'cinematic';
  camera.append(svg('circle', { r: 10 }), svg('path', { d: 'M -16 0 L -31 -7 L -31 7 Z' }));
  mapSvg.append(camera);
  stage.append(mapSvg);

  for (const marker of projection.markers) {
    const markerButton = button('✦', () => select('marker', marker), `ahi-marker ahi-marker-${marker.kind}`);
    markerButton.style.left = `${marker.coordinate.x * 100}%`;
    markerButton.style.top = `${marker.coordinate.y * 100}%`;
    markerButton.dataset.layers = marker.layers.join(' ');
    markerButton.title = marker.label;
    markerButton.setAttribute('aria-label', `${marker.label}, ${marker.kind}`);
    stage.append(markerButton);
  }

  const flightControls = el('div', 'ahi-flight-controls');
  const play = button('▶ Fly route', () => startFlight(), 'ahi-play');
  const scrubber = document.createElement('input');
  scrubber.type = 'range';
  scrubber.min = 0;
  scrubber.max = 1000;
  scrubber.value = 0;
  scrubber.disabled = !flightPath;
  scrubber.setAttribute('aria-label', 'Scrub Atlas cinematic flight path');
  scrubber.addEventListener('input', () => {
    stopFlight();
    progress = Number(scrubber.value) / 1000;
    renderCamera();
  });
  const readout = el('output', 'ahi-flight-readout');
  flightControls.append(play, scrubber, readout);
  stageColumn.append(stage, flightControls);

  const inspector = el('aside', 'ahi-inspector');
  inspector.append(el('span', 'ahi-kicker', 'Inspect'));
  const inspectorBody = el('div', 'ahi-inspector-body');
  const contract = document.createElement('pre');
  contract.className = 'ahi-contract';
  inspector.append(inspectorBody, contract);

  layout.append(controls, stageColumn, inspector);
  root.append(layout);
  host.append(root);

  function select(type, value) {
    selected = { type, value };
    renderInspector();
  }

  function renderInspector() {
    inspectorBody.replaceChildren();
    if (!selected) {
      inspectorBody.append(el('p', '', 'No Atlas object selected.'));
      contract.textContent = '';
      return;
    }
    const value = selected.value;
    inspectorBody.append(el('h4', '', value.label || value.id));
    inspectorBody.append(el('p', 'ahi-state', `${selected.type} · ${value.semantic_state || 'known'}`));
    if (value.summary) inspectorBody.append(el('p', '', value.summary));
    if (value.entity_ref) inspectorBody.append(el('p', 'ahi-ref', `Entity ref: ${value.entity_ref}`));
    if (selected.type === 'flight-path') {
      inspectorBody.append(el('p', '', `${value.waypoints.length} waypoints · ${value.cinematic.time_of_day || 'time unset'} · ${value.cinematic.weather || 'weather unset'}`));
    }
    contract.textContent = JSON.stringify(value, null, 2);
  }

  function refreshVisibility() {
    root.querySelectorAll('[data-layers]').forEach((node) => {
      const layers = node.dataset.layers.split(/\s+/).filter(Boolean);
      node.classList.toggle('ahi-hidden-layer', !visibleForLayers(layers, enabledLayers));
    });
  }

  function renderCamera() {
    if (!flightPath) {
      camera.setAttribute('visibility', 'hidden');
      play.disabled = true;
      readout.textContent = 'No cinematic route loaded';
      return;
    }
    const point = pointAtProgress(flightPath.waypoints, progress);
    camera.setAttribute('transform', `translate(${point.x.toFixed(1)} ${point.y.toFixed(1)})`);
    scrubber.value = String(Math.round(progress * 1000));
    const waypointIndex = Math.min(flightPath.waypoints.length - 1, Math.floor(progress * flightPath.waypoints.length));
    const waypoint = flightPath.waypoints[waypointIndex] || flightPath.waypoints.at(-1);
    readout.textContent = `${Math.round(progress * 100)}% · altitude ${waypoint.altitude ?? '—'} · speed ${waypoint.speed ?? '—'}`;
  }

  function stopFlight() {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = null;
    animationStarted = null;
    play.textContent = '▶ Fly route';
  }

  function startFlight() {
    if (!flightPath) return;
    if (animationFrame) {
      stopFlight();
      return;
    }
    if (progress >= 1) progress = 0;
    play.textContent = '❚❚ Pause';
    const initial = progress;
    const duration = 7000 * (1 - initial);
    const tick = (now) => {
      if (animationStarted === null) animationStarted = now;
      const elapsed = now - animationStarted;
      progress = Math.min(1, initial + (elapsed / Math.max(1, duration)) * (1 - initial));
      renderCamera();
      if (progress < 1) animationFrame = requestAnimationFrame(tick);
      else stopFlight();
    };
    animationFrame = requestAnimationFrame(tick);
  }

  renderInspector();
  refreshVisibility();
  renderCamera();

  return root;
}

function mountWhenAtlasAppears() {
  const panel = document.querySelector('.atlas-seed-panel');
  if (!panel) return false;
  mountAtlasHallProjection(panel, EPRA_ATLAS_SAMPLE);
  return true;
}

function installAtlasHallBridge() {
  ensureStyle();
  mountWhenAtlasAppears();
  const observer = new MutationObserver(() => mountWhenAtlasAppears());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  globalThis.__starwellAtlasHallBridge = Object.freeze({
    schema: 'starwell.atlas-hall-interface-bridge/v1',
    source: 'interface-foundry',
    snapshot: () => EPRA_ATLAS_SAMPLE,
    mount: () => mountWhenAtlasAppears(),
    canonical_truth_owned_elsewhere: true,
    execution_authority: false,
  });
  window.dispatchEvent(new CustomEvent('starwell:atlas-hall-interface-ready', {
    detail: { schema: 'starwell.atlas-hall-interface-bridge/v1', source: 'interface-foundry' },
  }));
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installAtlasHallBridge, { once: true });
  else installAtlasHallBridge();
}
