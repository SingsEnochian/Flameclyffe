import { GLYPH_PROJECT_SCHEMA, VIEWBOX, makeId, makeProject } from './glyphStudioModel.js';

export const PROJECT_STORAGE_KEY = 'starwell.glyphStudio.project.v0.1';
export const BRUSH_STORAGE_KEY = 'starwell.glyphStudio.brushLibrary.v0.1';
export const COLOUR_STORAGE_KEY = 'starwell.glyphStudio.colour.v0.1';
export const FONT_STORAGE_KEY = 'starwell.glyphStudio.fontLibrary.v0.1';

export function makeColourState() {
  return {
    primary: '#e6c67a',
    secondary: '#183a34',
    history: ['#e6c67a', '#183a34', '#f1e7cb', '#7f3712', '#3d6d63'],
    profile: 'srgb',
    activePalette: 0,
    palettes: [
      {
        id: 'palette-hearthgate',
        name: 'Hearthgate Foundation',
        colours: ['#e6c67a', '#f1e7cb', '#7f3712', '#3d6d63', '#18202d', '#090b12'],
      },
    ],
  };
}

export function normaliseLayer(layer = {}, index = 0) {
  return {
    id: layer.id || makeId('layer'),
    name: layer.name || `Layer ${index + 1}`,
    kind: layer.kind || 'vector',
    parentId: layer.parentId || null,
    visible: layer.visible !== false,
    locked: Boolean(layer.locked),
    solo: Boolean(layer.solo),
    selected: Boolean(layer.selected),
    opacity: Number.isFinite(layer.opacity) ? layer.opacity : 1,
    blendMode: layer.blendMode || 'normal',
    alphaLock: Boolean(layer.alphaLock),
    clippingMask: Boolean(layer.clippingMask),
    reference: Boolean(layer.reference),
    private: Boolean(layer.private),
    maskOf: layer.maskOf || null,
    ...(layer.text ? { text: { ...layer.text } } : {}),
  };
}

export function normaliseGlyph(glyph = {}) {
  const layers = Array.isArray(glyph.layers) && glyph.layers.length
    ? glyph.layers.map(normaliseLayer)
    : [normaliseLayer({ name: 'Ink', kind: 'vector' })];
  return {
    id: glyph.id || makeId('glyph'),
    name: glyph.name || 'Untitled Glyph',
    character: glyph.character || '◇',
    codepoint: glyph.codepoint || 'E000',
    advanceWidth: Number(glyph.advanceWidth || 1000),
    leftBearing: Number(glyph.leftBearing || 80),
    rightBearing: Number(glyph.rightBearing || 80),
    notes: glyph.notes || '',
    layers,
    activeLayerId: layers.some((layer) => layer.id === glyph.activeLayerId) ? glyph.activeLayerId : layers[0].id,
    strokes: Array.isArray(glyph.strokes) ? glyph.strokes : [],
  };
}

export function normaliseProject(project) {
  const fallback = makeProject();
  const source = project && typeof project === 'object' ? project : fallback;
  const glyphs = Array.isArray(source.glyphs) && source.glyphs.length
    ? source.glyphs.map(normaliseGlyph)
    : fallback.glyphs.map(normaliseGlyph);
  return {
    ...fallback,
    ...source,
    schemaVersion: GLYPH_PROJECT_SCHEMA,
    glyphs,
    activeGlyphId: glyphs.some((glyph) => glyph.id === source.activeGlyphId) ? source.activeGlyphId : glyphs[0].id,
    updatedAt: new Date().toISOString(),
  };
}

export function loadLocalJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn(`Unable to load ${key}`, error);
    return fallback;
  }
}

export function saveLocalJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Unable to save ${key}`, error);
    return false;
  }
}

function escapeXml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function strokeOpacity(stroke, point) {
  const pressure = Math.max(0, Math.min(1, Number(point?.pressure ?? 0.5)));
  const response = Number(stroke.brush?.pressureOpacity ?? 0);
  const base = Number(stroke.brush?.opacity ?? 1);
  return Math.max(0, Math.min(1, base * ((1 - response) + response * pressure)));
}

function strokeWidth(stroke, point, index) {
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

function blendModeCss(mode) {
  const supported = new Set(['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference']);
  return supported.has(mode) ? mode : 'normal';
}

export function glyphToSvg(glyph, colourProfile = 'srgb') {
  const safeGlyph = normaliseGlyph(glyph);
  const layers = safeGlyph.layers.filter((layer) => layer.visible && !layer.private);
  const layerById = new Map(layers.map((layer) => [layer.id, layer]));
  const body = [];

  for (const layer of layers) {
    const style = `opacity:${layer.opacity};mix-blend-mode:${blendModeCss(layer.blendMode)}`;
    body.push(`<g id="${escapeXml(layer.id)}" data-layer-name="${escapeXml(layer.name)}" data-layer-kind="${escapeXml(layer.kind)}" style="${style}">`);
    if (layer.kind === 'text' && layer.text) {
      const text = layer.text;
      const content = text.capitals ? String(text.content || '').toUpperCase() : String(text.content || '');
      const transform = text.orientation === 'vertical' ? ` transform="rotate(90 ${text.x} ${text.y})"` : '';
      body.push(`<text x="${Number(text.x)}" y="${Number(text.y) + Number(text.baseline || 0)}" font-family="${escapeXml(text.family)}" font-size="${Number(text.size)}" font-style="${escapeXml(text.style)}" font-weight="${Number(text.weight)}" letter-spacing="${Number(text.tracking || 0)}" text-anchor="${text.alignment === 'center' ? 'middle' : text.alignment === 'right' ? 'end' : 'start'}" fill="${escapeXml(text.colour)}"${transform}>${escapeXml(content)}</text>`);
    }
    const strokes = safeGlyph.strokes.filter((stroke) => stroke.layerId === layer.id && stroke.points?.length);
    for (const stroke of strokes) {
      if (stroke.points.length === 1) {
        const point = stroke.points[0];
        body.push(`<circle cx="${point.x}" cy="${point.y}" r="${strokeWidth(stroke, point, 0) / 2}" fill="${escapeXml(stroke.brush?.colour || '#000000')}" opacity="${strokeOpacity(stroke, point)}" />`);
        continue;
      }
      stroke.points.slice(1).forEach((point, index) => {
        const previous = stroke.points[index];
        const width = (strokeWidth(stroke, previous, index) + strokeWidth(stroke, point, index + 1)) / 2;
        const opacity = (strokeOpacity(stroke, previous) + strokeOpacity(stroke, point)) / 2;
        body.push(`<line x1="${previous.x}" y1="${previous.y}" x2="${point.x}" y2="${point.y}" stroke="${escapeXml(stroke.brush?.colour || '#000000')}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}" />`);
      });
    }
    body.push('</g>');
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX} ${VIEWBOX}" width="${VIEWBOX}" height="${VIEWBOX}" data-starwell-schema="${GLYPH_PROJECT_SCHEMA}" data-colour-profile="${escapeXml(colourProfile)}">\n  <title>${escapeXml(safeGlyph.name)}</title>\n  <metadata>${escapeXml(JSON.stringify({ codepoint: safeGlyph.codepoint, character: safeGlyph.character, advanceWidth: safeGlyph.advanceWidth, leftBearing: safeGlyph.leftBearing, rightBearing: safeGlyph.rightBearing }))}</metadata>\n  ${body.join('\n  ')}\n</svg>\n`;
}

export function projectReceipt(project, library, colourState) {
  return {
    schemaVersion: 'starwell.glyph.receipt.v0.1',
    projectId: project.id,
    projectName: project.name,
    glyphCount: project.glyphs.length,
    brushLibraryId: library.id,
    brushCount: library.brushes.length,
    colourProfile: colourState.profile,
    exportedAt: new Date().toISOString(),
    fontForge: {
      status: 'not-compiled',
      boundary: 'SVG and STARWELL project data are authoring outputs. OTF/TTF/WOFF compilation requires the future local FontForge worker.',
    },
  };
}

export function importProjectText(text) {
  const parsed = JSON.parse(text);
  if (!parsed || !Array.isArray(parsed.glyphs)) throw new Error('This file does not contain a STARWELL glyph project.');
  return normaliseProject(parsed);
}
