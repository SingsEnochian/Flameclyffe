export const DEFAULT_HUD_SELECTORS = {
  root: '.starwell',
  shell: '.live-glyph-panel.deep-observer-panel',
  stage: '.glyph-orb-wrap',
  readout: '.glyph-readout',
  hudLayer: '.deep-observer-hud-layer',
};

export const DEFAULT_HUD_BREAKPOINTS = {
  mobile: 720,
  compact: 430,
  narrow: 360,
  tablet: 1120,
};

export const DEFAULT_HUD_INSETS = {
  wide: 16,
  tablet: 12,
  mobile: 8,
  compact: 8,
  narrow: 6,
};

export const DEFAULT_PANEL_SIZE = {
  width: 280,
  height: 180,
};

export const DEFAULT_PANEL_POSITIONS = {
  sensory: 'bottom-right',
  time: 'top-right',
  status: 'bottom-left',
  controls: 'bottom-rail',
};

function hasDomRectShape(value) {
  return value && ['left', 'top', 'right', 'bottom', 'width', 'height'].every((key) => Number.isFinite(Number(value[key])));
}

export function toHudRect(value, fallback = null) {
  if (!value) return fallback;

  if (typeof value.getBoundingClientRect === 'function') {
    return toHudRect(value.getBoundingClientRect(), fallback);
  }

  if (!hasDomRectShape(value)) return fallback;

  return {
    left: Number(value.left),
    top: Number(value.top),
    right: Number(value.right),
    bottom: Number(value.bottom),
    width: Number(value.width),
    height: Number(value.height),
  };
}

export function makeRect(left = 0, top = 0, width = 0, height = 0) {
  const safeLeft = Number(left) || 0;
  const safeTop = Number(top) || 0;
  const safeWidth = Math.max(0, Number(width) || 0);
  const safeHeight = Math.max(0, Number(height) || 0);

  return {
    left: safeLeft,
    top: safeTop,
    right: safeLeft + safeWidth,
    bottom: safeTop + safeHeight,
    width: safeWidth,
    height: safeHeight,
  };
}

export function insetRect(rect, inset = 0) {
  const source = toHudRect(rect, makeRect());
  const safeInset = Math.max(0, Number(inset) || 0);
  const width = Math.max(0, source.width - safeInset * 2);
  const height = Math.max(0, source.height - safeInset * 2);

  return makeRect(source.left + safeInset, source.top + safeInset, width, height);
}

export function getHudViewportClass(width, breakpoints = DEFAULT_HUD_BREAKPOINTS) {
  const safeWidth = Number(width) || 0;

  if (safeWidth <= breakpoints.narrow) return 'narrow';
  if (safeWidth <= breakpoints.compact) return 'compact';
  if (safeWidth <= breakpoints.mobile) return 'mobile';
  if (safeWidth <= breakpoints.tablet) return 'tablet';
  return 'wide';
}

export function getHudInset(viewportClass, insets = DEFAULT_HUD_INSETS) {
  return Number(insets[viewportClass] ?? insets.wide ?? 12) || 0;
}

export function resolveHudElements(root = globalThis.document, selectors = DEFAULT_HUD_SELECTORS) {
  const queryRoot = root?.querySelector ? root : globalThis.document;

  if (!queryRoot?.querySelector) {
    return { root: null, shell: null, stage: null, readout: null, hudLayer: null };
  }

  return {
    root: queryRoot.querySelector(selectors.root),
    shell: queryRoot.querySelector(selectors.shell),
    stage: queryRoot.querySelector(selectors.stage),
    readout: queryRoot.querySelector(selectors.readout),
    hudLayer: queryRoot.querySelector(selectors.hudLayer),
  };
}

export function getViewportRect(viewport = {}) {
  const width = viewport.width ?? globalThis.innerWidth ?? globalThis.document?.documentElement?.clientWidth ?? 0;
  const height = viewport.height ?? globalThis.innerHeight ?? globalThis.document?.documentElement?.clientHeight ?? 0;
  return makeRect(0, 0, width, height);
}

export function getAvoidRects({ stageRect = null, extraAvoidRects = [] } = {}) {
  return [stageRect, ...extraAvoidRects]
    .map((rect) => toHudRect(rect))
    .filter(Boolean);
}

export function measureHudBounds({
  root = globalThis.document,
  selectors = DEFAULT_HUD_SELECTORS,
  viewport = {},
  shell = null,
  stage = null,
  readout = null,
  extraAvoidRects = [],
  breakpoints = DEFAULT_HUD_BREAKPOINTS,
  insets = DEFAULT_HUD_INSETS,
} = {}) {
  const elements = resolveHudElements(root, selectors);
  const viewportRect = getViewportRect(viewport);
  const shellRect = toHudRect(shell, toHudRect(elements.shell, viewportRect));
  const stageRect = toHudRect(stage, toHudRect(elements.stage));
  const readoutRect = toHudRect(readout, toHudRect(elements.readout));
  const viewportClass = getHudViewportClass(shellRect.width || viewportRect.width, breakpoints);
  const inset = getHudInset(viewportClass, insets);
  const safeRect = insetRect(shellRect, inset);
  const avoidRects = getAvoidRects({ stageRect, extraAvoidRects });

  return {
    viewportClass,
    inset,
    viewportRect,
    shellRect,
    stageRect,
    readoutRect,
    safeRect,
    avoidRects,
    snapZones: makeHudSnapZones(safeRect),
  };
}

export function clampPanelPosition(position = {}, panelSize = DEFAULT_PANEL_SIZE, bounds = {}) {
  const safeRect = toHudRect(bounds.safeRect ?? bounds, getViewportRect());
  const width = Math.max(0, Number(panelSize.width ?? DEFAULT_PANEL_SIZE.width) || DEFAULT_PANEL_SIZE.width);
  const height = Math.max(0, Number(panelSize.height ?? DEFAULT_PANEL_SIZE.height) || DEFAULT_PANEL_SIZE.height);
  const minX = safeRect.left;
  const minY = safeRect.top;
  const maxX = Math.max(minX, safeRect.right - width);
  const maxY = Math.max(minY, safeRect.bottom - height);
  const x = Number(position.x ?? position.left ?? minX) || minX;
  const y = Number(position.y ?? position.top ?? minY) || minY;

  return {
    x: Math.min(maxX, Math.max(minX, x)),
    y: Math.min(maxY, Math.max(minY, y)),
    width,
    height,
  };
}

export function makeHudSnapZones(safeRect = getViewportRect()) {
  const rect = toHudRect(safeRect, getViewportRect());
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  return {
    'top-left': { x: rect.left, y: rect.top, anchor: 'top-left' },
    'top-right': { x: rect.right, y: rect.top, anchor: 'top-right' },
    'bottom-left': { x: rect.left, y: rect.bottom, anchor: 'bottom-left' },
    'bottom-right': { x: rect.right, y: rect.bottom, anchor: 'bottom-right' },
    'left-rail': { x: rect.left, y: centerY, anchor: 'left-center' },
    'right-rail': { x: rect.right, y: centerY, anchor: 'right-center' },
    'bottom-rail': { x: centerX, y: rect.bottom, anchor: 'bottom-center' },
  };
}

export function getDefaultPanelZone(panelKey = 'status', viewportClass = 'wide', positions = DEFAULT_PANEL_POSITIONS) {
  if (viewportClass === 'narrow' || viewportClass === 'compact') return 'bottom-rail';
  if (viewportClass === 'mobile') return panelKey === 'time' ? 'top-right' : 'bottom-rail';
  return positions[panelKey] || positions.status || 'bottom-left';
}

export function positionPanelInZone(zoneName, panelSize = DEFAULT_PANEL_SIZE, bounds = {}) {
  const safeRect = toHudRect(bounds.safeRect ?? bounds, getViewportRect());
  const zones = bounds.snapZones || makeHudSnapZones(safeRect);
  const zone = zones[zoneName] || zones['bottom-left'];
  const width = Math.max(0, Number(panelSize.width ?? DEFAULT_PANEL_SIZE.width) || DEFAULT_PANEL_SIZE.width);
  const height = Math.max(0, Number(panelSize.height ?? DEFAULT_PANEL_SIZE.height) || DEFAULT_PANEL_SIZE.height);

  const anchorOffsets = {
    'top-left': { x: 0, y: 0 },
    'top-right': { x: -width, y: 0 },
    'bottom-left': { x: 0, y: -height },
    'bottom-right': { x: -width, y: -height },
    'left-center': { x: 0, y: -height / 2 },
    'right-center': { x: -width, y: -height / 2 },
    'bottom-center': { x: -width / 2, y: -height },
  };

  const offset = anchorOffsets[zone.anchor] || anchorOffsets['bottom-left'];

  return clampPanelPosition({ x: zone.x + offset.x, y: zone.y + offset.y }, { width, height }, { safeRect });
}

export function getDefaultPanelPosition(panelKey = 'status', panelSize = DEFAULT_PANEL_SIZE, bounds = {}) {
  const zoneName = getDefaultPanelZone(panelKey, bounds.viewportClass, bounds.defaultPositions || DEFAULT_PANEL_POSITIONS);
  return {
    zone: zoneName,
    ...positionPanelInZone(zoneName, panelSize, bounds),
  };
}

export function panelIntersectsRect(panelPosition = {}, panelSize = DEFAULT_PANEL_SIZE, rect = null) {
  const target = toHudRect(rect);
  if (!target) return false;

  const panel = makeRect(
    panelPosition.x ?? panelPosition.left ?? 0,
    panelPosition.y ?? panelPosition.top ?? 0,
    panelSize.width ?? panelPosition.width ?? DEFAULT_PANEL_SIZE.width,
    panelSize.height ?? panelPosition.height ?? DEFAULT_PANEL_SIZE.height,
  );

  return !(panel.right <= target.left || panel.left >= target.right || panel.bottom <= target.top || panel.top >= target.bottom);
}

export function avoidRectsForDefaultPosition(panelKey, panelSize, bounds = {}, fallbackZone = 'bottom-rail') {
  const initial = getDefaultPanelPosition(panelKey, panelSize, bounds);
  const intersects = (bounds.avoidRects || []).some((rect) => panelIntersectsRect(initial, panelSize, rect));

  if (!intersects) return initial;
  return {
    zone: fallbackZone,
    ...positionPanelInZone(fallbackZone, panelSize, bounds),
  };
}
