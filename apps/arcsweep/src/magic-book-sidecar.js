import './magic-book.css';

import {
  BRUSH_STORAGE_KEY,
  COLOUR_STORAGE_KEY,
  PROJECT_STORAGE_KEY,
  loadLocalJson,
  makeColourState,
  normaliseProject,
  saveLocalJson,
} from '../../starwell/src/components/glyph-studio/glyphStudioIO.js';
import {
  VIEWBOX,
  brushRuntime,
  makeBrushLibrary,
  makeId,
  recordRecentBrush,
} from '../../starwell/src/components/glyph-studio/glyphStudioModel.js';
import {
  MAGIC_BOOK_BINDING_KEY,
  MAGIC_BOOK_PAGES,
  MAGIC_BOOK_RECEIPTS_KEY,
  appendMagicBookReceipt,
  closeMagicBook,
  createMagicBookReceipt,
  normaliseMagicBookBinding,
  openMagicBook,
  pageById,
  turnMagicBookPage,
} from './magic-book-model.js';
import {
  DEFAULT_COMFYUI_ENDPOINT,
  GENERATOR_BRIDGE_SCHEMA,
  GENERATOR_ENDPOINT_KEY,
  canvasToPngBlob,
  createComfyUIGeneratorClient,
  normaliseGeneratorEndpoint,
  normaliseGeneratorRequest,
} from './generator-bridge.js';

export const MAGIC_BOOK_SURFACE_VERSION = 'arcsweep.magic-book-surface/v0.1';

const ROOT_ID = 'arcsweep-magic-book';
const LAUNCH_SELECTOR = '[data-magic-book-launch]';
const ATELIER_LAUNCH_SELECTOR = '[data-generator-atelier-launch]';
const MAX_RECEIPTS = 48;

let binding = readJson(MAGIC_BOOK_BINDING_KEY, null);
binding = normaliseMagicBookBinding(binding || {});
let receipts = readJson(MAGIC_BOOK_RECEIPTS_KEY, []);
if (!Array.isArray(receipts)) receipts = [];

let glyphProject = normaliseProject(loadLocalJson(PROJECT_STORAGE_KEY, null));
let brushLibrary = loadLocalJson(BRUSH_STORAGE_KEY, makeBrushLibrary());
let colourState = loadLocalJson(COLOUR_STORAGE_KEY, makeColourState());
let activeDrawing = null;
let previousSomaticPoint = null;
let rendererController = null;
let returnFocus = null;
let previousBridge = null;
let installedBridge = null;
let previousGeneratorBridge = null;
let installedGeneratorBridge = null;
let mutationObserver = null;
let resizeObserver = null;
let booted = false;
let generatorBusy = false;
let generatorResult = null;

const generatorDraft = {
  endpoint: readJson(GENERATOR_ENDPOINT_KEY, DEFAULT_COMFYUI_ENDPOINT) || DEFAULT_COMFYUI_ENDPOINT,
  prompt: '',
  negative_prompt: '',
  width: 1024,
  height: 1024,
  steps: 8,
  cfg: 1,
  shift: 3,
  sampler: 'euler',
  scheduler: 'simple',
  denoise: 0.65,
  seed: '',
};

function text(value) {
  return String(value == null ? '' : value);
}

function esc(value) {
  return text(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function readJson(key, fallback) {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function reducedMotion() {
  return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
}

function osSession() {
  try {
    return globalThis.__arcsweepOS?.session?.() || {};
  } catch {
    return {};
  }
}

function currentRoom() {
  return osSession().active_room
    || document.querySelector('.content[data-houseglass-room]')?.dataset.houseglassRoom
    || document.querySelector('.sidebar [data-room].active')?.dataset.room
    || 'portal';
}

function currentWorld() {
  return osSession().active_world_id || null;
}

function saveBinding() {
  writeJson(MAGIC_BOOK_BINDING_KEY, binding);
}

function saveReceipts() {
  writeJson(MAGIC_BOOK_RECEIPTS_KEY, receipts);
}

function publishReceipt(receipt) {
  receipts = [...appendMagicBookReceipt(receipts, receipt, MAX_RECEIPTS)];
  saveReceipts();
  try {
    globalThis.__arcsweepOS?.bus?.publish?.('arcsweep:magic-book-receipt', receipt, { source: 'magic-book' });
  } catch {}
  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:magic-book-receipt', { detail: receipt }));
  updateReceiptCount();
  return receipt;
}

function updateReceiptCount() {
  const root = document.getElementById(ROOT_ID);
  const count = root?.querySelector('[data-magic-book-receipt-count]');
  if (count) count.textContent = String(receipts.length);
}

function persistGlyphState() {
  saveLocalJson(PROJECT_STORAGE_KEY, glyphProject);
  saveLocalJson(BRUSH_STORAGE_KEY, brushLibrary);
  saveLocalJson(COLOUR_STORAGE_KEY, colourState);
}

function activeGlyph() {
  return glyphProject.glyphs.find((glyph) => glyph.id === glyphProject.activeGlyphId) || glyphProject.glyphs[0];
}

function activeLayer() {
  const glyph = activeGlyph();
  return glyph?.layers?.find((layer) => layer.id === glyph.activeLayerId) || glyph?.layers?.[0] || null;
}

function activeBrush() {
  return brushLibrary.brushes.find((brush) => brush.id === brushLibrary.activeBrushId) || brushLibrary.brushes[0];
}

function setActiveGlyph(nextGlyph) {
  glyphProject = normaliseProject({
    ...glyphProject,
    glyphs: glyphProject.glyphs.map((glyph) => glyph.id === nextGlyph.id ? nextGlyph : glyph),
    updatedAt: new Date().toISOString(),
  });
  persistGlyphState();
}

function coerceSetting(existing, next) {
  if (typeof existing === 'number') {
    const value = Number(next);
    if (!Number.isFinite(value)) throw new Error('Brush setting requires a finite number.');
    return value;
  }
  if (typeof existing === 'boolean') return next === true || next === 'true';
  return text(next);
}

function patchBrushSetting({ brush_id, group, setting, value } = {}, source = 'magic-book-ui') {
  const brushId = text(brush_id).trim();
  const groupName = text(group).trim();
  const settingName = text(setting).trim();
  const brush = brushLibrary.brushes.find((item) => item.id === brushId);
  if (!brush) throw new Error('Unknown Glyph Studio brush: ' + (brushId || 'missing'));
  const groupValue = brush.attributes?.[groupName];
  if (!groupValue || typeof groupValue !== 'object') throw new Error('Unknown brush attribute group: ' + (groupName || 'missing'));
  if (!Object.prototype.hasOwnProperty.call(groupValue, settingName)) throw new Error('Unknown brush setting: ' + groupName + '.' + settingName);
  const nextValue = coerceSetting(groupValue[settingName], value);
  brushLibrary = {
    ...brushLibrary,
    brushes: brushLibrary.brushes.map((item) => item.id === brushId ? {
      ...item,
      attributes: {
        ...item.attributes,
        [groupName]: { ...item.attributes[groupName], [settingName]: nextValue },
      },
      modifiedAt: new Date().toISOString(),
    } : item),
  };
  persistGlyphState();
  const receipt = publishReceipt(createMagicBookReceipt({
    kind: 'brush-setting-change',
    pageId: 'glyph-forge',
    worldId: currentWorld(),
    room: currentRoom(),
    detail: { brush_id: brushId, group: groupName, setting: settingName, source },
  }));
  globalThis.dispatchEvent?.(new CustomEvent('starwell:glyph-brush-setting-changed', {
    detail: {
      schema: 'starwell.glyph-brush-setting-changed/v1',
      brush_id: brushId,
      group: groupName,
      setting: settingName,
      changed_at: receipt.created_at,
    },
  }));
  return {
    schema: 'starwell.glyph-brush-setting-change/v1',
    brush_id: brushId,
    group: groupName,
    setting: settingName,
    applied: true,
  };
}

function selectBrush(brushId, source = 'magic-book-ui') {
  const id = text(brushId).trim();
  if (!brushLibrary.brushes.some((brush) => brush.id === id)) throw new Error('Unknown Glyph Studio brush: ' + (id || 'missing'));
  brushLibrary = recordRecentBrush(brushLibrary, id);
  persistGlyphState();
  const receipt = publishReceipt(createMagicBookReceipt({
    kind: 'brush-select',
    pageId: 'glyph-forge',
    worldId: currentWorld(),
    room: currentRoom(),
    detail: { brush_id: id, source },
  }));
  globalThis.dispatchEvent?.(new CustomEvent('starwell:glyph-brush-selected', {
    detail: { schema: 'starwell.glyph-brush-selected/v1', brush_id: id, selected_at: receipt.created_at },
  }));
  return { schema: 'starwell.glyph-brush-selection/v1', selected_brush_id: id };
}

function bridgeSnapshot() {
  const glyph = activeGlyph();
  const layer = activeLayer();
  const brush = activeBrush();
  return structuredClone({
    schema: 'starwell.glyph-studio-snapshot/v1',
    project: {
      id: glyphProject.id || null,
      name: glyphProject.name || null,
      glyph_count: glyphProject.glyphs?.length || 0,
    },
    active_glyph: glyph ? {
      id: glyph.id,
      name: glyph.name,
      character: glyph.character,
      codepoint: glyph.codepoint,
      stroke_count: glyph.strokes?.length || 0,
    } : null,
    active_layer: layer ? { id: layer.id, name: layer.name, kind: layer.kind, locked: Boolean(layer.locked) } : null,
    active_brush: brush ? { id: brush.id, name: brush.name, modified_at: brush.modifiedAt || null } : null,
    brush_runtime: brush ? brushRuntime(brush) : null,
    available_brushes: brushLibrary.brushes.map((item) => ({ id: item.id, name: item.name, pinned: Boolean(item.pinned) })),
    colour_profile: colourState.profile || null,
  });
}

function installGlyphBridge() {
  if (installedBridge) return installedBridge;
  previousBridge = globalThis.__starwellGlyphStudioBridge;
  installedBridge = Object.freeze({
    schema: 'starwell.glyph-studio-bridge/v1',
    surface: 'arcsweep-magic-book-glyph-page',
    snapshot: bridgeSnapshot,
    selectBrush(brushId) {
      const result = selectBrush(brushId, 'arcsweep-os');
      renderRightPage();
      return result;
    },
    patchBrushSetting(input) {
      const result = patchBrushSetting(input, 'arcsweep-os');
      renderRightPage();
      return result;
    },
  });
  globalThis.__starwellGlyphStudioBridge = installedBridge;
  globalThis.dispatchEvent?.(new CustomEvent('starwell:glyph-studio-bridge-ready', {
    detail: { schema: installedBridge.schema, surface: installedBridge.surface },
  }));
  return installedBridge;
}

function roomEntries() {
  const seen = new Set();
  return [...document.querySelectorAll('.sidebar button[data-room], .sidebar .nav-button[data-room]')]
    .map((button) => ({
      id: button.dataset.room,
      label: text(button.textContent).replace(/\s+/g, ' ').trim() || button.dataset.room,
    }))
    .filter((item) => item.id && !seen.has(item.id) && seen.add(item.id))
    .slice(0, 18);
}

function bindingMarkup() {
  const page = pageById(binding.active_page_id);
  const world = currentWorld() || binding.active_world_id || 'unscoped';
  const room = currentRoom();
  const nav = MAGIC_BOOK_PAGES.map((item) => (
    '<button type="button" data-magic-book-page="' + esc(item.id) + '" ' +
      (item.id === page.id ? 'aria-current="page"' : '') +
      '><span aria-hidden="true">' + esc(item.glyph) + '</span><span>' + esc(item.label) + '</span></button>'
  )).join('');
  return [
    '<p class="magic-book-kicker">ArcSweep OS · living binding</p>',
    '<h1>The Universal Codex</h1>',
    '<p>The page may change. The binding keeps the thread.</p>',
    '<nav class="magic-book-binding-nav" aria-label="Universal Codex pages">' + nav + '</nav>',
    '<div class="magic-book-binding-facts">',
      '<div><small>World</small><strong>' + esc(world) + '</strong></div>',
      '<div><small>Room beneath the page</small><strong>' + esc(room) + '</strong></div>',
      '<div><small>Open page</small><strong>' + esc(page.label) + '</strong></div>',
      '<div><small>Receipts</small><strong data-magic-book-receipt-count>' + receipts.length + '</strong></div>',
    '</div>',
    '<p class="magic-book-glyph-status">A bridge is successful when both shores are still there.</p>',
  ].join('');
}

function thresholdMarkup() {
  const entries = roomEntries();
  const rooms = entries.length ? entries.map((item) => (
    '<button type="button" data-book-room="' + esc(item.id) + '"><strong>' + esc(item.label) + '</strong><small>' + esc(item.id) + '</small></button>'
  )).join('') : '<p class="magic-book-empty">The room registry is still opening. The binding remains available.</p>';
  return [
    '<p class="magic-book-kicker">Threshold page</p>',
    '<h2>Open the House</h2>',
    '<p>This page does not replace ArcSweep rooms. It turns the living room registry into doors in the Book.</p>',
    '<div class="magic-book-room-grid">' + rooms + '</div>',
  ].join('');
}

function glyphMarkup() {
  const glyph = activeGlyph();
  const brush = activeBrush();
  const runtime = brushRuntime(brush);
  const options = brushLibrary.brushes.map((item) => (
    '<option value="' + esc(item.id) + '" ' + (item.id === brush.id ? 'selected' : '') + '>' + esc(item.name) + '</option>'
  )).join('');
  return [
    '<p class="magic-book-kicker">Glyph Forge · live page</p>',
    '<h2>' + esc(glyph?.name || 'Glyph') + ' <span aria-hidden="true">' + esc(glyph?.character || '◇') + '</span></h2>',
    '<p>This is the same STARWELL glyph project and brush library used by Glyph Studio. Pencil and touch marks persist across surfaces.</p>',
    '<div class="magic-book-glyph-layout">',
      '<div>',
        '<div class="magic-book-glyph-canvas-wrap">',
          '<canvas class="magic-book-glyph-canvas" data-magic-glyph-canvas width="' + VIEWBOX + '" height="' + VIEWBOX + '" aria-label="Universal Codex Glyph Forge drawing page"></canvas>',
        '</div>',
        '<p class="magic-book-glyph-status" data-magic-glyph-status>' + esc((glyph?.strokes?.length || 0) + ' stored strokes · ' + runtime.name) + '</p>',
      '</div>',
      '<div class="magic-book-controls">',
        '<label>Brush<select data-magic-brush-select>' + options + '</select></label>',
        '<label>Size <span class="magic-book-range-value">' + Number(runtime.size).toFixed(0) + '</span><input type="range" min="2" max="140" step="1" value="' + esc(runtime.size) + '" data-brush-group="properties" data-brush-setting="size"></label>',
        '<label>Opacity <span class="magic-book-range-value">' + Number(runtime.opacity).toFixed(2) + '</span><input type="range" min="0.05" max="1" step="0.01" value="' + esc(runtime.opacity) + '" data-brush-group="properties" data-brush-setting="opacity"></label>',
        '<label>Pressure size <span class="magic-book-range-value">' + Number(runtime.pressureSize).toFixed(2) + '</span><input type="range" min="0" max="1" step="0.01" value="' + esc(runtime.pressureSize) + '" data-brush-group="applePencil" data-brush-setting="pressureSize"></label>',
        '<label>Ink colour<input type="color" value="' + esc(runtime.colour) + '" data-brush-group="preview" data-brush-setting="color"></label>',
        '<div class="magic-book-glyph-actions">',
          '<button type="button" data-glyph-undo>Undo stroke</button>',
          '<button type="button" data-glyph-clear>Clear glyph</button>',
        '</div>',
        '<p class="magic-book-glyph-status">Pointer pressure, tilt, twist, and coalesced Pencil events remain in the stroke record.</p>',
      '</div>',
    '</div>',
    generatorMarkup(),
  ].join('');
}

function generatorOutputMarkup() {
  const output = generatorResult?.outputs?.[0];
  if (!output?.url) {
    return '<div class="magic-book-generator-output" data-generator-output><p>The receiving page is blank. A completed local render will appear here.</p></div>';
  }
  return [
    '<figure class="magic-book-generator-output" data-generator-output>',
      '<img src="' + esc(output.url) + '" alt="Image rendered by the connected local generator">',
      '<figcaption>' + esc(output.filename) + ' · prompt ' + esc(generatorResult.prompt_id) + '</figcaption>',
    '</figure>',
  ].join('');
}

function generatorMarkup() {
  return [
    '<section id="universal-codex-generator-atelier" class="magic-book-generator" data-generator-atelier tabindex="-1" aria-labelledby="magic-book-generator-title">',
      '<div class="magic-book-generator-heading">',
        '<div>',
          '<p class="magic-book-kicker">Generator bridge · local forge</p>',
          '<h3 id="magic-book-generator-title">Render a Page Vision</h3>',
        '</div>',
        '<span class="magic-book-generator-badge">Z-Image · TJ Studio</span>',
      '</div>',
      '<p>The Codex sends a bounded workflow to your own ComfyUI forge. The provider makes pixels; ArcSweep keeps the request, model lineage, result address, and receipt.</p>',
      '<div class="magic-book-generator-grid">',
        '<div class="magic-book-generator-fields">',
          '<label>ComfyUI endpoint<input type="url" value="' + esc(generatorDraft.endpoint) + '" data-generator-field="endpoint" spellcheck="false"></label>',
          '<label>Page vision<textarea rows="4" data-generator-field="prompt" placeholder="A copper-haired cartographer opening a living book beneath an aurora…">' + esc(generatorDraft.prompt) + '</textarea></label>',
          '<label>Negative prompt<textarea rows="2" data-generator-field="negative_prompt" placeholder="Optional exclusions">' + esc(generatorDraft.negative_prompt) + '</textarea></label>',
          '<div class="magic-book-generator-numbers">',
            '<label>Width<input type="number" min="256" max="2048" step="64" value="' + esc(generatorDraft.width) + '" data-generator-field="width"></label>',
            '<label>Height<input type="number" min="256" max="2048" step="64" value="' + esc(generatorDraft.height) + '" data-generator-field="height"></label>',
            '<label>Steps<input type="number" min="1" max="100" step="1" value="' + esc(generatorDraft.steps) + '" data-generator-field="steps"></label>',
            '<label>Seed<input type="number" min="0" step="1" value="' + esc(generatorDraft.seed) + '" data-generator-field="seed" placeholder="random"></label>',
          '</div>',
          '<label>Glyph transformation strength <span class="magic-book-range-value">' + Number(generatorDraft.denoise).toFixed(2) + '</span><input type="range" min="0.05" max="1" step="0.05" value="' + esc(generatorDraft.denoise) + '" data-generator-field="denoise"></label>',
          '<div class="magic-book-generator-actions">',
            '<button type="button" data-generator-test ' + (generatorBusy ? 'disabled' : '') + '>Test local forge</button>',
            '<button type="button" data-generator-render ' + (generatorBusy ? 'disabled' : '') + '>Render page vision</button>',
            '<button type="button" data-generator-transform ' + (generatorBusy ? 'disabled' : '') + '>Transform current glyph</button>',
          '</div>',
          '<p class="magic-book-generator-status" data-generator-status aria-live="polite">' + (generatorBusy ? 'The local forge is working…' : 'No network call is made until you choose a button.') + '</p>',
        '</div>',
        generatorOutputMarkup(),
      '</div>',
      '<p class="magic-book-generator-note">Transform current glyph flattens the visible canvas onto parchment, uploads that PNG to ComfyUI, and uses it as the generation source. No API key is stored here. If ArcSweep is opened over HTTPS, browsers may block a plain HTTP localhost forge.</p>',
    '</section>',
  ].join('');
}

function receiptMarkup() {
  const list = receipts.slice().reverse();
  const body = list.length ? list.map((receipt) => (
    '<article class="magic-book-receipt">' +
      '<strong>' + esc(receipt.kind) + '</strong>' +
      '<small>' + esc(receipt.page_id || 'binding') + ' · ' + esc(receipt.room || 'no room') + '</small>' +
      '<small>' + esc(receipt.created_at) + '</small>' +
    '</article>'
  )).join('') : '<p class="magic-book-empty">No Book receipts yet. Turn a page or draw a mark.</p>';
  return [
    '<p class="magic-book-kicker">Archive leaf</p>',
    '<h2>Binding Receipts</h2>',
    '<p>Page turns, brush changes, strokes, and room crossings leave a visible trail.</p>',
    '<div class="magic-book-receipt-list">' + body + '</div>',
  ].join('');
}

function rightMarkup() {
  if (binding.active_page_id === 'glyph-forge') return glyphMarkup();
  if (binding.active_page_id === 'receipts') return receiptMarkup();
  return thresholdMarkup();
}

function rootMarkup() {
  return [
    '<section id="' + ROOT_ID + '" class="magic-book-shell" data-renderer="pending" role="dialog" aria-modal="true" aria-label="ArcSweep Universal Codex" hidden>',
      '<header class="magic-book-toolbar">',
        '<div class="magic-book-brand"><strong>ArcSweep · Universal Codex</strong><small>v0.1 embodied interface proof</small></div>',
        '<span class="magic-book-toolbar-status" data-magic-book-renderer-status>Binding ready · renderer waking</span>',
        '<div class="magic-book-toolbar-actions">',
          '<button type="button" data-magic-book-page-prev aria-label="Previous page">← Page</button>',
          '<button type="button" data-magic-book-page-next aria-label="Next page">Page →</button>',
          '<button type="button" data-generator-atelier-open>Generator Atelier</button>',
          '<button type="button" data-magic-book-close>Close Book</button>',
        '</div>',
      '</header>',
      '<div class="magic-book-stage">',
        '<canvas class="magic-book-three" data-magic-book-three aria-hidden="true"></canvas>',
        '<div class="magic-book-spread">',
          '<aside class="magic-book-page magic-book-left" data-magic-book-binding></aside>',
          '<article class="magic-book-page magic-book-right" data-magic-book-right></article>',
        '</div>',
      '</div>',
    '</section>',
  ].join('');
}

function renderBinding() {
  const root = document.getElementById(ROOT_ID);
  const target = root?.querySelector('[data-magic-book-binding]');
  if (target) target.innerHTML = bindingMarkup();
  updateReceiptCount();
}

function renderRightPage() {
  const root = document.getElementById(ROOT_ID);
  const target = root?.querySelector('[data-magic-book-right]');
  if (!target) return;
  target.innerHTML = rightMarkup();
  renderBinding();
  if (binding.active_page_id === 'glyph-forge') {
    installGlyphBridge();
    mountGlyphCanvas();
  }
}

function updateRendererStatus(message) {
  const node = document.querySelector('#' + ROOT_ID + ' [data-magic-book-renderer-status]');
  if (node) node.textContent = message;
}

function pointWidth(stroke, point, index) {
  const pressure = Math.max(Number(stroke.brush?.minPressure ?? 0.08), Math.min(1, Number(point?.pressure ?? 0.5)));
  const response = Number(stroke.brush?.pressureSize ?? 0);
  const base = Number(stroke.brush?.size ?? 20);
  const progress = stroke.points.length > 1 ? index / (stroke.points.length - 1) : 0.5;
  const start = Number(stroke.brush?.taperStart ?? 0);
  const end = Number(stroke.brush?.taperEnd ?? 0);
  const startScale = start > 0 ? Math.max(0.08, Math.min(1, progress / start)) : 1;
  const endScale = end > 0 ? Math.max(0.08, Math.min(1, (1 - progress) / end)) : 1;
  return Math.max(1, base * ((1 - response) + response * pressure) * Math.min(startScale, endScale));
}

function pointOpacity(stroke, point) {
  const pressure = Math.max(0, Math.min(1, Number(point?.pressure ?? 0.5)));
  const response = Number(stroke.brush?.pressureOpacity ?? 0);
  const base = Number(stroke.brush?.opacity ?? 1);
  return Math.max(0, Math.min(1, base * ((1 - response) + response * pressure)));
}

function drawStroke(context, stroke) {
  if (!stroke?.points?.length) return;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  if (stroke.points.length === 1) {
    const point = stroke.points[0];
    context.globalAlpha = pointOpacity(stroke, point);
    context.fillStyle = stroke.brush?.colour || '#2b221b';
    context.beginPath();
    context.arc(point.x, point.y, pointWidth(stroke, point, 0) / 2, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
    return;
  }
  stroke.points.slice(1).forEach((point, index) => {
    const previous = stroke.points[index];
    context.globalAlpha = (pointOpacity(stroke, previous) + pointOpacity(stroke, point)) / 2;
    context.strokeStyle = stroke.brush?.colour || '#2b221b';
    context.lineWidth = (pointWidth(stroke, previous, index) + pointWidth(stroke, point, index + 1)) / 2;
    context.beginPath();
    context.moveTo(previous.x, previous.y);
    context.lineTo(point.x, point.y);
    context.stroke();
  });
  context.globalAlpha = 1;
}

function redrawGlyphCanvas(canvas) {
  if (!canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.clearRect(0, 0, VIEWBOX, VIEWBOX);
  const glyph = activeGlyph();
  const visibleLayerIds = new Set((glyph.layers || []).filter((layer) => layer.visible !== false).map((layer) => layer.id));
  (glyph.strokes || []).filter((stroke) => visibleLayerIds.has(stroke.layerId)).forEach((stroke) => drawStroke(context, stroke));
  if (activeDrawing) drawStroke(context, activeDrawing);
}

function eventPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * VIEWBOX;
  const y = ((event.clientY - rect.top) / Math.max(1, rect.height)) * VIEWBOX;
  return {
    x: Math.max(0, Math.min(VIEWBOX, x)),
    y: Math.max(0, Math.min(VIEWBOX, y)),
    pressure: event.pointerType === 'mouse' ? 0.5 : Math.max(0.01, Math.min(1, Number(event.pressure) || 0.01)),
    tiltX: Number(event.tiltX || 0),
    tiltY: Number(event.tiltY || 0),
    twist: Number(event.twist || 0),
    t: performance.now(),
  };
}

function dispatchSomaticSample(phase, event, point, stroke) {
  const previous = previousSomaticPoint;
  const dt = previous ? Math.max(1, point.t - previous.t) : 0;
  const distance = previous ? Math.hypot(point.x - previous.x, point.y - previous.y) : 0;
  const velocity = dt > 0 ? (distance / dt) * 1000 : 0;
  previousSomaticPoint = point;
  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:glyph-brush-sample', {
    detail: Object.freeze({
      schema: 'arcsweep.glyph-brush-sample/v1',
      phase,
      stroke_id: stroke.id,
      brush_id: stroke.brushId,
      pointer_type: event.pointerType || stroke.pointerType || 'unknown',
      pressure: point.pressure,
      tilt_x: point.tiltX,
      tilt_y: point.tiltY,
      twist: point.twist,
      velocity_px_s: Math.max(0, Math.min(5000, velocity)),
      x: point.x,
      y: point.y,
      timestamp_ms: point.t,
    }),
  }));
}

function appendPointerSample(canvas, event, phase) {
  if (!activeDrawing) return;
  const raw = eventPoint(canvas, event);
  const previous = activeDrawing.points[activeDrawing.points.length - 1];
  const alpha = 1 - Math.max(0, Math.min(0.95, Number(activeDrawing.brush.streamline || 0) + Number(activeDrawing.brush.stabilization || 0) * 0.35));
  const point = previous ? {
    ...raw,
    x: previous.x + (raw.x - previous.x) * alpha,
    y: previous.y + (raw.y - previous.y) * alpha,
  } : raw;
  activeDrawing.points.push(point);
  dispatchSomaticSample(phase, event, point, activeDrawing);
}

function commitDrawing(canvas) {
  const stroke = activeDrawing;
  if (!stroke?.points?.length) {
    activeDrawing = null;
    previousSomaticPoint = null;
    redrawGlyphCanvas(canvas);
    return;
  }
  const glyph = activeGlyph();
  setActiveGlyph({ ...glyph, strokes: [...(glyph.strokes || []), stroke] });
  activeDrawing = null;
  previousSomaticPoint = null;
  const receipt = publishReceipt(createMagicBookReceipt({
    kind: 'glyph-stroke',
    pageId: 'glyph-forge',
    worldId: currentWorld(),
    room: currentRoom(),
    detail: {
      stroke_id: stroke.id,
      glyph_id: glyph.id,
      layer_id: stroke.layerId,
      brush_id: stroke.brushId,
      pointer_type: stroke.pointerType || 'pointer',
      point_count: stroke.points.length,
    },
  }));
  globalThis.dispatchEvent?.(new CustomEvent('starwell:glyph-stroke-committed', {
    detail: {
      schema: 'starwell.glyph-stroke-receipt/v1',
      stroke_id: stroke.id,
      glyph_id: glyph.id,
      layer_id: stroke.layerId,
      brush_id: stroke.brushId,
      pointer_type: stroke.pointerType || 'pointer',
      point_count: stroke.points.length,
      committed_at: receipt.created_at,
    },
  }));
  redrawGlyphCanvas(canvas);
  const status = document.querySelector('#' + ROOT_ID + ' [data-magic-glyph-status]');
  if (status) status.textContent = activeGlyph().strokes.length + ' stored strokes · ' + activeBrush().name;
}

function mountGlyphCanvas() {
  const canvas = document.querySelector('#' + ROOT_ID + ' [data-magic-glyph-canvas]');
  if (!canvas || canvas.dataset.magicBookMounted === 'true') return;
  canvas.dataset.magicBookMounted = 'true';
  redrawGlyphCanvas(canvas);

  canvas.addEventListener('pointerdown', (event) => {
    const layer = activeLayer();
    const brush = activeBrush();
    if (!layer || !brush || layer.locked || !['vector', 'raster'].includes(layer.kind) || event.button > 0) return;
    event.preventDefault();
    canvas.setPointerCapture?.(event.pointerId);
    activeDrawing = {
      id: makeId('stroke'),
      layerId: layer.id,
      pointerType: event.pointerType,
      brushId: brush.id,
      brush: brushRuntime(brush),
      points: [],
      createdAt: new Date().toISOString(),
    };
    previousSomaticPoint = null;
    appendPointerSample(canvas, event, 'start');
    redrawGlyphCanvas(canvas);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!activeDrawing) return;
    event.preventDefault();
    const samples = event.getCoalescedEvents?.() || [event];
    samples.forEach((sample) => appendPointerSample(canvas, sample, 'move'));
    redrawGlyphCanvas(canvas);
  });

  const finish = (event) => {
    if (!activeDrawing) return;
    event.preventDefault();
    const last = activeDrawing.points[activeDrawing.points.length - 1];
    if (last) dispatchSomaticSample('end', event, last, activeDrawing);
    if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    commitDrawing(canvas);
  };
  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', finish);
}

function renderPageAtMidpoint(transition) {
  binding = transition.state;
  saveBinding();
  publishReceipt(transition.receipt);
  renderRightPage();
}

async function turnTo(pageId) {
  const next = pageById(pageId);
  if (next.id === binding.active_page_id) return;
  const transition = turnMagicBookPage(binding, next.id, {
    worldId: currentWorld(),
    room: currentRoom(),
  });
  const root = document.getElementById(ROOT_ID);
  root?.classList.add('magic-book-page-turning');
  let swapped = false;
  const swap = () => {
    if (swapped) return;
    swapped = true;
    renderPageAtMidpoint(transition);
  };
  try {
    await rendererController?.turn?.(transition.direction, swap);
  } catch {
    swap();
  }
  swap();
  root?.classList.remove('magic-book-page-turning');
}

async function navigateFromBook(room) {
  const target = text(room).trim();
  if (!target) return;
  let ok = false;
  try {
    const result = await globalThis.__arcsweepOS?.navigate?.(target, { source_surface: 'magic-book', return_page: binding.active_page_id });
    ok = result?.status === 'applied' || result?.result?.ok === true || result?.ok === true;
  } catch {}
  if (!ok) {
    const button = [...document.querySelectorAll('.sidebar [data-room]')].find((candidate) => candidate.dataset.room === target);
    if (button) {
      button.click();
      ok = true;
    }
  }
  publishReceipt(createMagicBookReceipt({
    kind: ok ? 'room-crossing' : 'room-crossing-failed',
    pageId: binding.active_page_id,
    worldId: currentWorld(),
    room: target,
    detail: { target_room: target, applied: ok },
  }));
  if (ok) {
    binding = normaliseMagicBookBinding({ ...binding, active_room: target, return_room: target });
    saveBinding();
    closeBook();
  }
}

function undoGlyphStroke() {
  const glyph = activeGlyph();
  if (!glyph?.strokes?.length) return;
  setActiveGlyph({ ...glyph, strokes: glyph.strokes.slice(0, -1) });
  publishReceipt(createMagicBookReceipt({
    kind: 'glyph-undo',
    pageId: 'glyph-forge',
    worldId: currentWorld(),
    room: currentRoom(),
    detail: { glyph_id: glyph.id },
  }));
  renderRightPage();
}

function clearGlyph() {
  const glyph = activeGlyph();
  if (!glyph?.strokes?.length) return;
  const removed = glyph.strokes.length;
  setActiveGlyph({ ...glyph, strokes: [] });
  publishReceipt(createMagicBookReceipt({
    kind: 'glyph-clear',
    pageId: 'glyph-forge',
    worldId: currentWorld(),
    room: currentRoom(),
    detail: { glyph_id: glyph.id, removed_strokes: removed },
  }));
  renderRightPage();
}

function generatorFormRequest() {
  return normaliseGeneratorRequest({
    prompt: generatorDraft.prompt,
    negative_prompt: generatorDraft.negative_prompt,
    width: generatorDraft.width,
    height: generatorDraft.height,
    steps: generatorDraft.steps,
    cfg: generatorDraft.cfg,
    shift: generatorDraft.shift,
    sampler: generatorDraft.sampler,
    scheduler: generatorDraft.scheduler,
    seed: generatorDraft.seed === '' ? undefined : generatorDraft.seed,
  });
}

function generatorStatus(message, tone = 'idle') {
  const node = document.querySelector('#' + ROOT_ID + ' [data-generator-status]');
  if (!node) return;
  node.textContent = message;
  node.dataset.tone = tone;
}

function friendlyGeneratorError(error) {
  const message = text(error?.message || error, 600) || 'The local generator did not answer.';
  if (globalThis.location?.protocol === 'https:' && generatorDraft.endpoint.startsWith('http:')) {
    return `${message} This HTTPS page may be blocked from calling an HTTP localhost forge; use local/desktop ArcSweep or an HTTPS bridge.`;
  }
  return message;
}

function generatorClient() {
  const endpoint = normaliseGeneratorEndpoint(generatorDraft.endpoint);
  generatorDraft.endpoint = endpoint;
  writeJson(GENERATOR_ENDPOINT_KEY, endpoint);
  return createComfyUIGeneratorClient({ endpoint });
}

async function probeGenerator() {
  if (generatorBusy) return null;
  generatorBusy = true;
  generatorStatus('Listening for ComfyUI and TJ Studio…', 'working');
  try {
    const availability = await generatorClient().probe();
    publishReceipt(createMagicBookReceipt({
      kind: 'generator-bridge-probe',
      pageId: 'glyph-forge',
      worldId: currentWorld(),
      room: currentRoom(),
      detail: {
        provider: availability.provider,
        endpoint: availability.endpoint,
        connected: true,
        models: availability.models,
      },
    }));
    generatorStatus(`Forge awake · ${availability.models.diffusion_model}`, 'success');
    return availability;
  } catch (error) {
    publishReceipt(createMagicBookReceipt({
      kind: 'generator-bridge-probe-failed',
      pageId: 'glyph-forge',
      worldId: currentWorld(),
      room: currentRoom(),
      detail: { endpoint: generatorDraft.endpoint, message: text(error?.message || error, 600) },
    }));
    generatorStatus(friendlyGeneratorError(error), 'error');
    return null;
  } finally {
    generatorBusy = false;
  }
}

async function renderGeneratorVision(input = null, { prepare = null, lineage = {} } = {}) {
  if (generatorBusy) return null;
  generatorBusy = true;
  generatorStatus('Binding prompt, models, seed, and page provenance…', 'working');
  let request;
  try {
    const client = generatorClient();
    const prepared = typeof prepare === 'function' ? await prepare(client) : null;
    if (prepared?.lineage) lineage = prepared.lineage;
    const requestInput = prepared?.input || input;
    request = requestInput ? normaliseGeneratorRequest(requestInput) : generatorFormRequest();
    publishReceipt(createMagicBookReceipt({
      kind: 'generator-request',
      pageId: 'glyph-forge',
      worldId: currentWorld(),
      room: currentRoom(),
      detail: {
        provider: request.provider,
        mode: request.mode,
        prompt: request.prompt,
        negative_prompt: request.negative_prompt,
        width: request.width,
        height: request.height,
        steps: request.steps,
        cfg: request.cfg,
        shift: request.shift,
        sampler: request.sampler,
        scheduler: request.scheduler,
        denoise: request.denoise,
        source_image: request.source_image || null,
        seed: request.seed,
        ...lineage,
      },
    }));
    generatorStatus('The local forge is rendering. The Book is keeping the thread…', 'working');
    const result = await client.generateZImage(request);
    generatorResult = result;
    publishReceipt(createMagicBookReceipt({
      kind: 'generator-complete',
      pageId: 'glyph-forge',
      worldId: currentWorld(),
      room: currentRoom(),
      detail: {
        provider: result.provider,
        endpoint: result.endpoint,
        prompt_id: result.prompt_id,
        mode: result.request.mode,
        source_image: result.request.source_image || null,
        denoise: result.request.denoise,
        seed: result.request.seed,
        models: result.models,
        outputs: result.outputs.map(({ filename, subfolder, type }) => ({ filename, subfolder, type })),
        ...lineage,
      },
    }));
    generatorBusy = false;
    renderRightPage();
    generatorStatus(`Render complete · seed ${result.request.seed}`, 'success');
    return result;
  } catch (error) {
    publishReceipt(createMagicBookReceipt({
      kind: 'generator-failed',
      pageId: 'glyph-forge',
      worldId: currentWorld(),
      room: currentRoom(),
      detail: {
        provider: request?.provider || 'tj-studio-zimage',
        endpoint: generatorDraft.endpoint,
        seed: request?.seed ?? null,
        mode: request?.mode || null,
        source_image: request?.source_image || null,
        ...lineage,
        message: text(error?.message || error, 600),
      },
    }));
    generatorStatus(friendlyGeneratorError(error), 'error');
    return null;
  } finally {
    generatorBusy = false;
  }
}

function safeGlyphFilename(glyph) {
  const stem = text(glyph?.id || glyph?.name || 'glyph')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'glyph';
  return `arcsweep-${stem}-${Date.now()}.png`;
}

async function transformCurrentGlyph() {
  const canvas = document.querySelector('#' + ROOT_ID + ' [data-magic-glyph-canvas]');
  const glyph = activeGlyph();
  const brush = activeBrush();
  return renderGeneratorVision(null, {
    lineage: {
      glyph_id: glyph?.id || null,
      glyph_stroke_count: glyph?.strokes?.length || 0,
      brush_id: brush?.id || null,
    },
    prepare: async (client) => {
      generatorStatus('Flattening the glyph onto parchment and offering it to the local forge…', 'working');
      const blob = await canvasToPngBlob(canvas);
      const uploaded = await client.uploadImage(blob, safeGlyphFilename(glyph));
      const glyphLineage = {
        glyph_id: glyph?.id || null,
        glyph_stroke_count: glyph?.strokes?.length || 0,
        brush_id: brush?.id || null,
        source_image: uploaded.reference,
      };
      publishReceipt(createMagicBookReceipt({
        kind: 'generator-source-upload',
        pageId: 'glyph-forge',
        worldId: currentWorld(),
        room: currentRoom(),
        detail: { ...glyphLineage, source_type: uploaded.type, source_mime: blob.type || 'image/png' },
      }));
      return {
        input: {
          ...generatorFormRequest(),
          mode: 'i2i',
          source_image: uploaded.reference,
          denoise: generatorDraft.denoise,
        },
        lineage: glyphLineage,
      };
    },
  });
}

function focusGeneratorAtelier() {
  const atelier = document.querySelector('#' + ROOT_ID + ' [data-generator-atelier]');
  if (!atelier) return false;
  atelier.scrollIntoView?.({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  atelier.focus?.({ preventScroll: true });
  return true;
}

async function openGeneratorAtelier() {
  const root = ensureSurface();
  if (!root) return false;
  if (binding.active_page_id !== 'glyph-forge') {
    if (root.hidden) {
      renderPageAtMidpoint(turnMagicBookPage(binding, 'glyph-forge', {
        worldId: currentWorld(),
        room: currentRoom(),
      }));
    } else {
      await turnTo('glyph-forge');
    }
  }
  await openBook();
  requestAnimationFrame(() => requestAnimationFrame(focusGeneratorAtelier));
  return true;
}

function handleRootClick(event) {
  const pageButton = event.target.closest?.('[data-magic-book-page]');
  if (pageButton) {
    void turnTo(pageButton.dataset.magicBookPage);
    return;
  }
  if (event.target.closest?.('[data-magic-book-page-prev]')) {
    const index = MAGIC_BOOK_PAGES.findIndex((page) => page.id === binding.active_page_id);
    void turnTo(MAGIC_BOOK_PAGES[Math.max(0, index - 1)].id);
    return;
  }
  if (event.target.closest?.('[data-magic-book-page-next]')) {
    const index = MAGIC_BOOK_PAGES.findIndex((page) => page.id === binding.active_page_id);
    void turnTo(MAGIC_BOOK_PAGES[Math.min(MAGIC_BOOK_PAGES.length - 1, index + 1)].id);
    return;
  }
  if (event.target.closest?.('[data-magic-book-close]')) {
    closeBook();
    return;
  }
  if (event.target.closest?.('[data-generator-atelier-open]')) {
    void openGeneratorAtelier();
    return;
  }
  const roomButton = event.target.closest?.('[data-book-room]');
  if (roomButton) {
    void navigateFromBook(roomButton.dataset.bookRoom);
    return;
  }
  if (event.target.closest?.('[data-glyph-undo]')) {
    undoGlyphStroke();
    return;
  }
  if (event.target.closest?.('[data-glyph-clear]')) {
    clearGlyph();
    return;
  }
  if (event.target.closest?.('[data-generator-test]')) {
    void probeGenerator();
    return;
  }
  if (event.target.closest?.('[data-generator-render]')) {
    void renderGeneratorVision();
    return;
  }
  if (event.target.closest?.('[data-generator-transform]')) {
    void transformCurrentGlyph();
  }
}

function handleRootInput(event) {
  const control = event.target.closest?.('[data-generator-field]');
  if (!control) return;
  const key = control.dataset.generatorField;
  if (!Object.prototype.hasOwnProperty.call(generatorDraft, key)) return;
  generatorDraft[key] = control.value;
  if (key === 'denoise') {
    const value = control.closest('label')?.querySelector('.magic-book-range-value');
    if (value) value.textContent = Number(control.value).toFixed(2);
  }
  if (key === 'endpoint') writeJson(GENERATOR_ENDPOINT_KEY, control.value);
}

function handleRootChange(event) {
  const select = event.target.closest?.('[data-magic-brush-select]');
  if (select) {
    selectBrush(select.value);
    renderRightPage();
    return;
  }
  const control = event.target.closest?.('[data-brush-group][data-brush-setting]');
  if (!control) return;
  const value = control.type === 'color' ? control.value : Number(control.value);
  patchBrushSetting({
    brush_id: activeBrush().id,
    group: control.dataset.brushGroup,
    setting: control.dataset.brushSetting,
    value,
  });
  renderRightPage();
}

async function createThreeRenderer(canvas) {
  if (!canvas || reducedMotion()) {
    return {
      mode: 'css-fallback',
      open: async () => {},
      turn: async (_direction, midpoint) => { midpoint?.(); },
      resize: () => {},
      destroy: () => {},
    };
  }

  try {
    const THREE = await import('three');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(2, globalThis.devicePixelRatio || 1));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
    camera.position.set(0, 0.25, 8.6);

    const group = new THREE.Group();
    group.rotation.x = -0.08;
    scene.add(group);

    const coverMaterial = new THREE.MeshStandardMaterial({ color: 0x382a21, roughness: 0.62, metalness: 0.05 });
    const paperMaterial = new THREE.MeshStandardMaterial({ color: 0xe9d8b4, roughness: 0.88, metalness: 0, side: THREE.DoubleSide });
    const turnMaterial = paperMaterial.clone();
    turnMaterial.color.setHex(0xf2e4c6);

    const cover = new THREE.Mesh(new THREE.BoxGeometry(6.9, 4.8, 0.12), coverMaterial);
    cover.position.z = -0.18;
    group.add(cover);

    const frontCoverGeometry = new THREE.BoxGeometry(3.45, 4.8, 0.11);
    frontCoverGeometry.translate(1.725, 0, 0);
    const frontCover = new THREE.Mesh(frontCoverGeometry, coverMaterial);
    frontCover.position.set(0, 0, 0.08);
    group.add(frontCover);

    const left = new THREE.Mesh(new THREE.PlaneGeometry(3.28, 4.45), paperMaterial);
    left.position.set(-1.66, 0, -0.08);
    group.add(left);
    const right = new THREE.Mesh(new THREE.PlaneGeometry(3.28, 4.45), paperMaterial);
    right.position.set(1.66, 0, -0.07);
    group.add(right);

    const spine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 4.65, 18),
      new THREE.MeshStandardMaterial({ color: 0xa97842, roughness: 0.48, metalness: 0.22 }),
    );
    spine.position.z = -0.02;
    group.add(spine);

    const pageGeometry = new THREE.PlaneGeometry(3.28, 4.45, 32, 1);
    pageGeometry.translate(1.64, 0, 0);
    const base = pageGeometry.attributes.position.array.slice();
    const turningPage = new THREE.Mesh(pageGeometry, turnMaterial);
    turningPage.position.set(0, 0, 0.02);
    turningPage.visible = false;
    group.add(turningPage);

    scene.add(new THREE.HemisphereLight(0xfff1d0, 0x10211a, 2.2));
    const key = new THREE.DirectionalLight(0xffd994, 2.8);
    key.position.set(2, 4, 7);
    scene.add(key);

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      if (canvas.width !== width || canvas.height !== height) renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    }

    function setCurl(progress, direction) {
      const positions = pageGeometry.attributes.position;
      const array = positions.array;
      for (let index = 0; index < array.length; index += 3) {
        const x = base[index];
        const u = Math.max(0, Math.min(1, x / 3.28));
        array[index] = x;
        array[index + 1] = base[index + 1];
        array[index + 2] = Math.sin(Math.PI * u) * 0.24 * Math.sin(Math.PI * progress) * (direction === 'forward' ? 1 : -1);
      }
      positions.needsUpdate = true;
      pageGeometry.computeVertexNormals();
    }

    function animate(duration, update) {
      return new Promise((resolve) => {
        const started = performance.now();
        function frame(now) {
          const raw = Math.min(1, (now - started) / duration);
          const eased = raw < .5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
          update(eased, raw);
          renderer.render(scene, camera);
          if (raw < 1) requestAnimationFrame(frame);
          else resolve();
        }
        requestAnimationFrame(frame);
      });
    }

    async function open() {
      group.scale.setScalar(.94);
      group.rotation.z = -0.015;
      frontCover.rotation.y = 0;
      await animate(520, (progress) => {
        group.scale.setScalar(.94 + .06 * progress);
        group.rotation.z = -0.015 * (1 - progress);
        frontCover.rotation.y = -Math.PI * progress;
        frontCover.position.z = 0.08 + Math.sin(Math.PI * progress) * .08;
      });
      frontCover.rotation.y = -Math.PI;
      frontCover.position.z = -0.1;
    }

    async function turn(direction, midpoint) {
      turningPage.visible = true;
      let swapped = false;
      await animate(560, (progress) => {
        if (!swapped && progress >= .5) {
          swapped = true;
          midpoint?.();
        }
        setCurl(progress, direction);
        const sign = direction === 'forward' ? -1 : 1;
        turningPage.rotation.y = sign * Math.PI * progress;
        turningPage.position.z = 0.02 + Math.sin(Math.PI * progress) * .05;
      });
      turningPage.visible = false;
      turningPage.rotation.y = 0;
      turningPage.position.z = .02;
      setCurl(0, direction);
      renderer.render(scene, camera);
      if (!swapped) midpoint?.();
    }

    resize();
    return {
      mode: 'three',
      open,
      turn,
      resize,
      destroy() {
        renderer.dispose();
        pageGeometry.dispose();
        cover.geometry.dispose();
        frontCoverGeometry.dispose();
        left.geometry.dispose();
        right.geometry.dispose();
        spine.geometry.dispose();
        coverMaterial.dispose();
        paperMaterial.dispose();
        turnMaterial.dispose();
      },
    };
  } catch (error) {
    console.warn('[ArcSweep Magic Book] Three.js renderer unavailable; keeping the functional CSS book.', error);
    return {
      mode: 'css-fallback',
      open: async () => {},
      turn: async (_direction, midpoint) => { midpoint?.(); },
      resize: () => {},
      destroy: () => {},
    };
  }
}

async function ensureRenderer() {
  const root = document.getElementById(ROOT_ID);
  const canvas = root?.querySelector('[data-magic-book-three]');
  if (!root || !canvas || rendererController) return rendererController;
  rendererController = await createThreeRenderer(canvas);
  root.dataset.renderer = rendererController.mode;
  updateRendererStatus(rendererController.mode === 'three'
    ? 'Three.js binding active · DOM pages remain the accessible interaction surface'
    : 'Functional book active · reduced-motion/WebGL fallback');
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => rendererController?.resize?.());
    resizeObserver.observe(canvas);
  }
  return rendererController;
}

async function openBook() {
  const root = ensureSurface();
  if (!root || !root.hidden) return;
  returnFocus = document.activeElement;
  const transition = openMagicBook(binding, {
    worldId: currentWorld(),
    room: currentRoom(),
    reducedMotion: reducedMotion(),
  });
  binding = transition.state;
  saveBinding();
  publishReceipt(transition.receipt);
  root.hidden = false;
  document.documentElement.dataset.magicBookOpen = 'true';
  renderRightPage();
  const renderer = await ensureRenderer();
  await renderer?.open?.();
  root.querySelector('[data-magic-book-close]')?.focus();
}

function closeBook() {
  const root = document.getElementById(ROOT_ID);
  if (!root || root.hidden) return;
  const transition = closeMagicBook(binding);
  binding = transition.state;
  saveBinding();
  publishReceipt(transition.receipt);
  root.hidden = true;
  delete document.documentElement.dataset.magicBookOpen;
  returnFocus?.focus?.();
}

function ensureLauncher() {
  const nav = document.querySelector('.sidebar nav[aria-label="Primary Arcsweep rooms"]');
  if (!nav) return null;
  let button = nav.querySelector(LAUNCH_SELECTOR);
  if (!button) {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'nav-button magic-book-launch';
    button.dataset.magicBookLaunch = MAGIC_BOOK_SURFACE_VERSION;
    button.innerHTML = '<span aria-hidden="true">📖</span><span>Universal Codex</span>';
    button.addEventListener('click', () => void openBook());
    nav.insertBefore(button, nav.firstChild);
  }
  let atelierButton = nav.querySelector(ATELIER_LAUNCH_SELECTOR);
  if (!atelierButton) {
    atelierButton = document.createElement('button');
    atelierButton.type = 'button';
    atelierButton.className = 'nav-button magic-book-launch generator-atelier-launch';
    atelierButton.dataset.generatorAtelierLaunch = 'arcsweep.generator-atelier-launch/v0.1';
    atelierButton.innerHTML = '<span aria-hidden="true">✦</span><span>Generator Atelier</span>';
    atelierButton.addEventListener('click', () => void openGeneratorAtelier());
    button.insertAdjacentElement('afterend', atelierButton);
  }
  return button;
}

function ensureSurface() {
  let root = document.getElementById(ROOT_ID);
  if (root) return root;
  document.body.insertAdjacentHTML('beforeend', rootMarkup());
  root = document.getElementById(ROOT_ID);
  root.addEventListener('click', handleRootClick);
  root.addEventListener('input', handleRootInput);
  root.addEventListener('change', handleRootChange);
  renderRightPage();
  return root;
}

function installKeyboard() {
  document.addEventListener('keydown', (event) => {
    const root = document.getElementById(ROOT_ID);
    if (!root || root.hidden) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeBook();
      return;
    }
    if (event.altKey && event.key === 'ArrowRight') {
      event.preventDefault();
      const index = MAGIC_BOOK_PAGES.findIndex((page) => page.id === binding.active_page_id);
      void turnTo(MAGIC_BOOK_PAGES[Math.min(MAGIC_BOOK_PAGES.length - 1, index + 1)].id);
    }
    if (event.altKey && event.key === 'ArrowLeft') {
      event.preventDefault();
      const index = MAGIC_BOOK_PAGES.findIndex((page) => page.id === binding.active_page_id);
      void turnTo(MAGIC_BOOK_PAGES[Math.max(0, index - 1)].id);
    }
  });
}

function install() {
  if (booted) return true;
  const nav = ensureLauncher();
  if (!nav) return false;
  booted = true;
  ensureSurface();
  installGlyphBridge();
  previousGeneratorBridge = globalThis.__arcsweepGeneratorBridge;
  installedGeneratorBridge = Object.freeze({
    schema: GENERATOR_BRIDGE_SCHEMA,
    endpoint: () => normaliseGeneratorEndpoint(generatorDraft.endpoint),
    probe: probeGenerator,
    generate: renderGeneratorVision,
    transform_glyph: transformCurrentGlyph,
  });
  globalThis.__arcsweepGeneratorBridge = installedGeneratorBridge;
  installKeyboard();

  const params = new URLSearchParams(globalThis.location?.search || '');
  if (params.get('codex') === 'generator') queueMicrotask(() => void openGeneratorAtelier());
  else if (params.get('book') === '1') queueMicrotask(() => void openBook());

  globalThis.__arcsweepMagicBook = Object.freeze({
    schema: MAGIC_BOOK_SURFACE_VERSION,
    open: openBook,
    close: closeBook,
    turn: turnTo,
    open_generator: openGeneratorAtelier,
    state: () => structuredClone(binding),
    receipts: () => structuredClone(receipts),
    glyph_snapshot: bridgeSnapshot,
    generator_bridge: installedGeneratorBridge,
  });
  globalThis.dispatchEvent?.(new CustomEvent('arcsweep:magic-book-ready', {
    detail: { schema: MAGIC_BOOK_SURFACE_VERSION, page_id: binding.active_page_id },
  }));
  return true;
}

if (!install()) {
  mutationObserver = new MutationObserver(() => {
    if (install()) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }
  });
  mutationObserver.observe(document.body, { childList: true, subtree: true });
}

globalThis.addEventListener?.('pagehide', () => {
  saveBinding();
  persistGlyphState();
  resizeObserver?.disconnect?.();
  rendererController?.destroy?.();
  rendererController = null;
  mutationObserver?.disconnect?.();
  if (globalThis.__starwellGlyphStudioBridge === installedBridge) {
    if (previousBridge === undefined) delete globalThis.__starwellGlyphStudioBridge;
    else globalThis.__starwellGlyphStudioBridge = previousBridge;
  }
  if (globalThis.__arcsweepGeneratorBridge === installedGeneratorBridge) {
    if (previousGeneratorBridge === undefined) delete globalThis.__arcsweepGeneratorBridge;
    else globalThis.__arcsweepGeneratorBridge = previousGeneratorBridge;
  }
}, { once: true });
