import { GALLERY_CANON_DIMENSIONS } from '../../configs/resonance/gallery-canon.js';
import { makeVectorFromRecord, mergeVectorRecords } from '../../math-kernels/unit-resonance/index.js';

function scoreTokenBag(tokens = [], dimensions = GALLERY_CANON_DIMENSIONS, scoring = {}) {
  const safeTokens = new Set(tokens.filter(Boolean));

  return dimensions.reduce((record, dimension) => {
    const matches = scoring[dimension] || [];
    record[dimension] = matches.reduce((score, token) => score + (safeTokens.has(token) ? 1 : 0), 0);
    return record;
  }, {});
}

export function nodeFromGalleryItem(item = {}, options = {}) {
  const dimensions = options.dimensions || GALLERY_CANON_DIMENSIONS;
  const tokenRecord = scoreTokenBag(item.tags || [], dimensions, options.scoring || {});
  const resonance = mergeVectorRecords(tokenRecord, item.resonance);

  return {
    id: item.id || item.slug || `${options.idPrefix || 'gallery-item'}-${options.index ?? 0}`,
    kind: options.kind || item.kind || 'gallery-item',
    vector: makeVectorFromRecord(resonance, dimensions),
    meta: {
      label: item.title || item.label || item.slug || 'Gallery Item',
      visible: item.visible ?? true,
      consent: item.consent ?? true,
      image: item.image,
      position: item.position,
      raw: item,
    },
  };
}

export function nodesFromGalleryItems(items = [], options = {}) {
  return items.map((item, index) => nodeFromGalleryItem(item, { ...options, index }));
}
