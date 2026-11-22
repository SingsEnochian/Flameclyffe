import { ATLAS_LAYERS, EPRA_ATLAS_SAMPLE } from './epra-atlas-components.js';

const VIEWBOX = Object.freeze({ width: 1000, height: 600 });
const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(label, onClick, className = '') {
  const node = el('button', className, label);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}

function svg(tag, attributes = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

function viewPoint(point) {
  return { x: point.x * VIEWBOX.width, y: point.y * VIEWBOX.height };
}

function routePath(waypoints) {
  return waypoints.map((point, index) => {
    const mapped = viewPoint(point);
    return `${index ? 'L' : 'M'} ${mapped.x.toFixed(1)} ${mapped.y.toFixed(1)}`;
  }).join(' ');
}

function pointAtProgress(waypoints, progress) {
  if (waypoints.length === 1) return viewPoint(waypoints[0]);
  const scaled = Math.max(0, Math.min(1, progress)) * (waypoints.length - 1);
  const index = Math.min(waypoints.length - 2, Math.floor(scaled));
  const local = scaled - index;
  const a = viewPoint(waypoints[index]);
  const b = viewPoint(waypoints[index + 1]);
  return { x: a.x + (b.x - a.x) * local, y: a.y + (b.y - a.y) * local };
}

function layerVisible(layers, enabled) {
  if (!layers?.length) return true;
  return layers.some((layer) => enabled.has(layer));
}

function mountAtlasLab() {
  const root = document.querySelector('#interface-foundry-root');
  if (!root || root.querySelector('.epa-lab')) return;

  const projection = EPRA_ATLAS_SAMPLE;
  const region = projection.regions[0];
  const flightPath = projection.flight_paths[0];
  const enabledLayers = new Set(projection.enabled_layers);
  let selected = { type: 'flight-path', value: flightPath };
  let progress = 0;
  let animationFrame = null;
  let animationStarted = null;

  const section = el('section', 'epa-lab');
  section.innerHTML = `
    <header class="epa-header">
      <div><span class="if-kicker">Epra Atlas · component set</span><h2>Map objects that can actually be touched</h2><p>Marker, region, layer and cinematic flight-path projections. The demo geography is explicitly non-canon.</p></div>
      <span class="epa-demo-badge">NON-CANON DEMO</span>
    </header>`;

  const layout = el('div', 'epa-layout');
  const controls = el('aside', 'epa-controls');
  controls.append(el('h3', '', 'Layers'), el('p', '', 'Toggle the information field without deleting the underlying objects.'));

  const layerList = el('div', 'epa-layer-list');
  for (const layer of ATLAS_LAYERS) {
    const label = el('label', 'epa-layer');
    const input = document.createElement('input');
    input.type = 'checkbox'; input.checked = true; input.value = layer.id;
    input.addEventListener('change', () => {
      if (input.checked) enabledLayers.add(layer.id); else enabledLayers.delete(layer.id);
      refreshVisibility();
    });
    const copy = el('span'); copy.innerHTML = `<strong>${layer.label}</strong><small>${layer.description}</small>`;
    label.append(input, copy); layerList.append(label);
  }
  controls.append(layerList);

  const stageColumn = el('div', 'epa-stage-column');
  const stage = el('div', 'epa-map');
  stage.setAttribute('aria-label', 'Non-canon Epra Atlas interaction study');

  const mapSvg = svg('svg', { viewBox: `0 0 ${VIEWBOX.width} ${VIEWBOX.height}`, role: 'img', 'aria-label': 'Draft canyon region with a cinematic flight route' });
  mapSvg.classList.add('epa-map-svg');

  const terrain = svg('path', { d: 'M 0 470 C 140 380 160 190 315 250 C 430 295 465 95 610 160 C 715 208 770 110 1000 175 L 1000 600 L 0 600 Z' });
  terrain.classList.add('epa-terrain'); terrain.dataset.layers = 'geography';
  const canyon = svg('path', { d: 'M 75 510 C 245 415 245 310 380 300 C 520 288 585 395 760 330 C 875 286 925 230 1000 250' });
  canyon.classList.add('epa-canyon'); canyon.dataset.layers = 'geography';

  const polygonPoints = region.points.map((point) => { const mapped = viewPoint(point); return `${mapped.x},${mapped.y}`; }).join(' ');
  const regionNode = svg('polygon', { points: polygonPoints, tabindex: '0', role: 'button', 'aria-label': `${region.label}, ${region.kind} region` });
  regionNode.classList.add('epa-region'); regionNode.dataset.layers = region.layers.join(' ');
  regionNode.addEventListener('click', () => select('region', region));
  regionNode.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select('region', region); } });

  const routeNode = svg('path', { d: routePath(flightPath.waypoints), tabindex: '0', role: 'button', 'aria-label': `${flightPath.label}, cinematic flight path` });
  routeNode.classList.add('epa-route'); routeNode.dataset.layers = 'cinematic';
  routeNode.addEventListener('click', () => select('flight-path', flightPath));
  routeNode.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select('flight-path', flightPath); } });

  const camera = svg('g', { 'aria-hidden': 'true' });
  camera.classList.add('epa-camera'); camera.dataset.layers = 'cinematic';
  camera.append(svg('circle', { r: 11 }), svg('path', { d: 'M -18 0 L -34 -8 L -34 8 Z' }));

  mapSvg.append(terrain, canyon, regionNode, routeNode, camera);
  stage.append(mapSvg);

  const markerNodes = projection.markers.map((marker) => {
    const node = button('✦', () => select('marker', marker), `epa-marker epa-marker-${marker.kind}`);
    node.style.left = `${marker.coordinate.x * 100}%`;
    node.style.top = `${marker.coordinate.y * 100}%`;
    node.dataset.layers = marker.layers.join(' ');
    node.title = marker.label;
    node.setAttribute('aria-label', `${marker.label}, ${marker.kind}`);
    stage.append(node);
    return node;
  });

  const flightControls = el('div', 'epa-flight-controls');
  const play = button('▶ Fly route', () => startFlight(), 'epa-play');
  const scrubber = document.createElement('input');
  scrubber.type = 'range'; scrubber.min = 0; scrubber.max = 1000; scrubber.value = 0;
  scrubber.setAttribute('aria-label', 'Scrub cinematic flight path');
  scrubber.addEventListener('input', () => { stopFlight(); progress = Number(scrubber.value) / 1000; renderCamera(); });
  const flightReadout = el('output', 'epa-flight-readout');
  flightControls.append(play, scrubber, flightReadout);
  stageColumn.append(stage, flightControls);

  const inspector = el('aside', 'epa-inspector');
  const inspectorBody = el('div');
  const contract = document.createElement('pre'); contract.className = 'epa-contract';
  inspector.append(el('span', 'if-kicker', 'Inspect'), inspectorBody, contract);

  layout.append(controls, stageColumn, inspector);
  section.append(layout);
  root.append(section);

  function select(type, value) {
    selected = { type, value };
    renderInspector();
  }

  function renderInspector() {
    const value = selected.value;
    inspectorBody.replaceChildren();
    inspectorBody.append(el('h3', '', value.label || value.id));
    const state = el('p', 'epa-state', `${selected.type} · ${value.semantic_state || 'known'}`);
    inspectorBody.append(state);
    if (value.summary) inspectorBody.append(el('p', '', value.summary));
    if (value.entity_ref) inspectorBody.append(el('p', 'epa-ref', `Entity ref: ${value.entity_ref}`));
    if (selected.type === 'flight-path') {
      inspectorBody.append(el('p', '', `${value.waypoints.length} waypoints · ${value.cinematic.time_of_day || 'time unset'} · ${value.cinematic.weather || 'weather unset'}`));
      inspectorBody.append(button('Reset route', () => { stopFlight(); progress = 0; scrubber.value = 0; renderCamera(); }, 'epa-inspector-action'));
    }
    contract.textContent = JSON.stringify(value, null, 2);
  }

  function refreshVisibility() {
    [...stage.querySelectorAll('[data-layers]')].forEach((node) => {
      const layers = node.dataset.layers.split(/\s+/).filter(Boolean);
      node.classList.toggle('epa-layer-hidden', !layerVisible(layers, enabledLayers));
    });
    const active = [...enabledLayers].join(', ') || 'none';
    const live = document.querySelector('#if-live-status');
    if (live) live.textContent = `Epra Atlas layers visible: ${active}.`;
  }

  function renderCamera() {
    const point = pointAtProgress(flightPath.waypoints, progress);
    camera.setAttribute('transform', `translate(${point.x.toFixed(1)} ${point.y.toFixed(1)})`);
    scrubber.value = String(Math.round(progress * 1000));
    const segment = Math.min(flightPath.waypoints.length - 1, Math.floor(progress * flightPath.waypoints.length));
    const waypoint = flightPath.waypoints[segment] || flightPath.waypoints.at(-1);
    flightReadout.textContent = `${Math.round(progress * 100)}% · alt ${waypoint.altitude ?? '—'} · speed ${waypoint.speed ?? '—'}`;
  }

  function stopFlight() {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = null; animationStarted = null; play.textContent = '▶ Fly route';
  }

  function startFlight() {
    if (animationFrame) { stopFlight(); return; }
    if (progress >= 1) progress = 0;
    play.textContent = '❚❚ Pause';
    const initial = progress;
    const duration = 7000 * (1 - initial);
    const tick = (now) => {
      if (animationStarted === null) animationStarted = now;
      const elapsed = now - animationStarted;
      progress = Math.min(1, initial + (elapsed / Math.max(1, duration)) * (1 - initial));
      renderCamera();
      if (progress < 1) animationFrame = requestAnimationFrame(tick); else stopFlight();
    };
    animationFrame = requestAnimationFrame(tick);
  }

  renderInspector(); refreshVisibility(); renderCamera();

  globalThis.__epraAtlasFoundry = Object.freeze({
    schema: 'starwell.epra-atlas-foundry-bridge/v1',
    snapshot: () => EPRA_ATLAS_SAMPLE,
    enabledLayers: () => [...enabledLayers],
    selectMarker: (id) => {
      const marker = projection.markers.find((item) => item.id === id);
      if (!marker) throw new Error(`Unknown Epra Atlas marker: ${id}`);
      select('marker', marker);
      return marker;
    },
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAtlasLab, { once: true });
  else mountAtlasLab();
}
