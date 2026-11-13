// The Foundry owns brush definitions; this adapter only projects pigment behaviour.
import { BRUSH_LIBRARY_SCHEMA, makeBrushLibrary, brushRuntime } from '../../starwell/src/components/glyph-studio/glyphStudioModel.js';

export const FOUNDRY_BRUSH_STORAGE_KEY = 'starwell.glyphStudio.brushLibrary.v0.1';
const bounded = (value, fallback, min = 0, max = 1) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;

export function projectFoundryBrush(brush) {
  if (!brush || typeof brush.id !== 'string' || !brush.id || typeof brush.name !== 'string') {
    throw new TypeError('A named Foundry brush with an id is required');
  }
  const a = brush.attributes;
  if (!a || !['properties', 'stabilization', 'applePencil', 'preview', 'taper'].every(key => a[key] && typeof a[key] === 'object')) {
    throw new TypeError('Incomplete Foundry brush attributes');
  }
  const runtime = brushRuntime(brush);
  return Object.freeze({
    id: brush.id, name: brush.name,
    source: 'starwell:glyph-studio', modifiedAt: brush.modifiedAt || null,
    size: bounded(runtime.size, 34, 1, 300),
    opacity: bounded(runtime.opacity, .92),
    pressureSize: bounded(runtime.pressureSize, .82),
    pressureOpacity: bounded(runtime.pressureOpacity, .12),
    // Native shape/grain/taper remain in the source; fluid projection is explicit.
    projection: 'size-opacity-pressure',
  });
}

export function loadFoundryBrushes(storage) {
  const fallback = () => ({ brushes: makeBrushLibrary().brushes.map(projectFoundryBrush), source: 'foundation', warning: null });
  try {
    const raw = storage?.getItem(FOUNDRY_BRUSH_STORAGE_KEY);
    if (!raw) return fallback();
    const library = JSON.parse(raw);
    if (library.schemaVersion !== BRUSH_LIBRARY_SCHEMA || !Array.isArray(library.brushes) || !library.brushes.length) {
      throw new TypeError('Unsupported or empty Foundry brush library');
    }
    const ids = new Set();
    const brushes = library.brushes.map(brush => {
      const projected = projectFoundryBrush(brush);
      if (ids.has(projected.id)) throw new TypeError('Duplicate Foundry brush id');
      ids.add(projected.id);
      return projected;
    });
    return { brushes, source: 'saved-foundry', warning: null };
  } catch (error) {
    return { ...fallback(), warning: `Saved brushes could not be read: ${error.message}. Originals preserved.` };
  }
}

export function foundryPigmentSample(brush, { pressure = .5, width = .52, saturation = .7 } = {}) {
  const force = bounded(pressure, .5);
  const sizeResponse = 1 - brush.pressureSize + brush.pressureSize * force;
  const opacityResponse = 1 - brush.pressureOpacity + brush.pressureOpacity * force;
  return Object.freeze({
    radius: Math.max(.002, Math.min(.2, (.012 + bounded(width, .52) * .085) * (brush.size / 34) * sizeResponse)),
    amount: bounded(saturation, .7) * 1.65 * brush.opacity * opacityResponse,
    brush_id: brush.id, source: brush.source, projection: brush.projection,
  });
}
