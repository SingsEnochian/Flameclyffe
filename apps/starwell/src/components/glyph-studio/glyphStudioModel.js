export const GLYPH_PROJECT_SCHEMA = 'starwell.glyph.project.v0.1';
export const BRUSH_LIBRARY_SCHEMA = 'starwell.brush.library.v0.1';
export const VIEWBOX = 1000;

export const BRUSH_ATTRIBUTE_GROUPS = [
  'Stroke Path',
  'Stabilization',
  'Taper',
  'Shape',
  'Grain',
  'Rendering',
  'Wet Mix',
  'Color Dynamics',
  'Dynamics',
  'Apple Pencil',
  'Properties',
  'Materials',
  'Preview',
  'About this Brush',
];

export function makeId(prefix) {
  const token = globalThis.crypto?.randomUUID?.()
    || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${token}`;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value)));
}

export function safeFileName(value, fallback = 'starwell-asset') {
  return String(value || fallback)
    .trim()
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/^-+|-+$/g, '') || fallback;
}

export function downloadText(name, type, content) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function makeBrush(overrides = {}) {
  return {
    id: makeId('brush'),
    name: 'Stonewood Ink',
    setId: 'set-foundation',
    pinned: true,
    modifiedAt: new Date().toISOString(),
    attributes: {
      strokePath: {
        spacing: 0.02,
        spacingJitter: 0,
        lateralJitter: 0,
        linearJitter: 0,
        fallOff: 0,
      },
      stabilization: {
        streamlineAmount: 0.42,
        streamlinePressure: 0.2,
        stabilizationAmount: 0.18,
        motionFiltering: 0,
        motionFilteringExpression: 0.5,
      },
      taper: {
        pressureStart: 0.1,
        pressureEnd: 0.2,
        touchStart: 0,
        touchEnd: 0.12,
        size: 0.7,
        opacity: 0.1,
      },
      shape: {
        sourceName: 'Round',
        scatter: 0,
        count: 1,
        countJitter: 0,
        rotation: 1,
        inputStyle: 'azimuth',
      },
      grain: {
        sourceName: 'Clear',
        mode: 'moving',
        movement: 1,
        scale: 0.5,
        rotation: 0,
        depth: 0,
      },
      rendering: {
        mode: 'uniform-glaze',
        flow: 1,
        wetEdges: 0,
        burnedEdges: 0,
      },
      wetMix: {
        dilution: 0,
        charge: 0.5,
        attack: 0.5,
        pull: 0,
        grade: 0,
      },
      colorDynamics: {
        stampHue: 0,
        stampSaturation: 0,
        stampBrightness: 0,
        strokeHue: 0,
        pressureSecondary: 0,
        tiltSecondary: 0,
      },
      dynamics: {
        speedSize: 0,
        speedOpacity: 0,
        jitterSize: 0,
        jitterOpacity: 0,
      },
      applePencil: {
        pressureSize: 0.82,
        pressureOpacity: 0.12,
        pressureFlow: 0,
        tiltAngle: 45,
        tiltSize: 0,
        tiltOpacity: 0,
        barrelRollRotation: 1,
      },
      properties: {
        size: 34,
        opacity: 0.92,
        minSize: 2,
        maxSize: 140,
        minOpacity: 0.05,
        maxOpacity: 1,
        smudgePull: 0.5,
        orientToScreen: false,
      },
      materials: {
        metallic: 0,
        roughness: 0.5,
      },
      preview: {
        mode: 'stroke',
        size: 0.52,
        color: '#e6c67a',
      },
      about: {
        author: 'STARWELL',
        signature: '',
        notes: 'Foundation brush. Local-first STARWELL format.',
        resetPoint: null,
      },
    },
    ...overrides,
  };
}

export function makeBrushLibrary() {
  const primary = makeBrush();
  const pencil = makeBrush({
    name: 'Moon Graphite',
    pinned: false,
    attributes: {
      ...makeBrush().attributes,
      properties: {
        ...makeBrush().attributes.properties,
        size: 18,
        opacity: 0.64,
      },
      stabilization: {
        ...makeBrush().attributes.stabilization,
        streamlineAmount: 0.18,
      },
      preview: {
        mode: 'stroke',
        size: 0.38,
        color: '#c8c3b7',
      },
    },
  });

  return {
    schemaVersion: BRUSH_LIBRARY_SCHEMA,
    id: makeId('brush-library'),
    name: 'STARWELL Foundation',
    sets: [
      { id: 'set-recent', name: 'Recent', virtual: true },
      { id: 'set-pinned', name: 'Pinned', virtual: true },
      { id: 'set-foundation', name: 'Foundation Inks', virtual: false },
    ],
    brushes: [primary, pencil],
    recentBrushIds: [primary.id, pencil.id],
    activeBrushId: primary.id,
    importReceipts: [],
  };
}

export function makeLayer(name = 'Ink') {
  return { id: makeId('layer'), name, visible: true, locked: false };
}

export function makeGlyph(name = 'Untitled Glyph', character = '◇') {
  const layer = makeLayer();
  return {
    id: makeId('glyph'),
    name,
    character,
    codepoint: 'E000',
    advanceWidth: 1000,
    leftBearing: 80,
    rightBearing: 80,
    notes: '',
    layers: [layer],
    activeLayerId: layer.id,
    strokes: [],
  };
}

export function makeProject() {
  const glyph = makeGlyph('Bridge Seed', '◇');
  return {
    schemaVersion: GLYPH_PROJECT_SCHEMA,
    id: makeId('project'),
    name: 'STARWELL Script Seed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    activeGlyphId: glyph.id,
    glyphs: [glyph],
  };
}

export function brushRuntime(brush) {
  const attributes = brush.attributes;
  return {
    name: brush.name,
    size: attributes.properties.size,
    opacity: attributes.properties.opacity,
    streamline: attributes.stabilization.streamlineAmount,
    stabilization: attributes.stabilization.stabilizationAmount,
    pressureSize: attributes.applePencil.pressureSize,
    pressureOpacity: attributes.applePencil.pressureOpacity,
    minPressure: 0.08,
    colour: attributes.preview.color,
    taperStart: attributes.taper.pressureStart,
    taperEnd: attributes.taper.pressureEnd,
  };
}

export function recordRecentBrush(library, brushId) {
  const recent = [brushId, ...library.recentBrushIds.filter((id) => id !== brushId)].slice(0, 8);
  return { ...library, activeBrushId: brushId, recentBrushIds: recent };
}

export function importReceipt(file, status, detail) {
  return {
    id: makeId('import'),
    fileName: file.name,
    size: file.size,
    type: file.type || 'unknown',
    status,
    detail,
    importedAt: new Date().toISOString(),
  };
}
