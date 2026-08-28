export const SIGILLUM_DEI_AEMETH_GEOMETRY_VERSION = 'sloane-3188-geometry-v1';

export const SIGILLUM_DEI_AEMETH_WITNESS = Object.freeze({
  id: 'sloane-ms-3188-sigillum-dei-aemeth-1582',
  title: 'Sigillum Dei Aemeth',
  author: 'John Dee',
  date: '1582',
  source: 'British Museum / British Library, Sloane MS 3188',
  publicReference: 'https://commons.wikimedia.org/wiki/File:Sloane3188-john_dee.png',
  rightsState: 'public-domain',
  geometryAuthority: 'primary-manuscript witness',
  geometryVersion: SIGILLUM_DEI_AEMETH_GEOMETRY_VERSION,
  transcriptionState: 'pending-manuscript-and-derived-name verification',
  comparisonWitness: Object.freeze({
    title: 'Enochian Magick Reference · Appendix A',
    location: 'private archive · PDF page 37 / printed page 33',
    rightsState: 'restricted',
    publicAssetAllowed: false,
    use: 'private structural comparison only; no traced raster or modern typesetting committed',
  }),
});

const TAU = Math.PI * 2;
const fmt = (value) => Number(value.toFixed(3));

export function polarPoint(radius, index, count, rotation = -Math.PI / 2, center = 500) {
  const angle = rotation + (TAU * index / count);
  return Object.freeze({
    x: fmt(center + radius * Math.cos(angle)),
    y: fmt(center + radius * Math.sin(angle)),
  });
}

export function regularPolygonPoints(count, radius, rotation = -Math.PI / 2) {
  return Array.from({ length: count }, (_, index) => polarPoint(radius, index, count, rotation));
}

export function steppedStarPoints(count, step, radius, rotation = -Math.PI / 2) {
  if (!Number.isInteger(count) || count < 3) throw new Error('Star count must be an integer >= 3.');
  if (!Number.isInteger(step) || step < 1 || step >= count) throw new Error('Star step must be between 1 and count - 1.');
  const points = regularPolygonPoints(count, radius, rotation);
  const ordered = [];
  const visited = new Set();
  let index = 0;
  while (!visited.has(index)) {
    visited.add(index);
    ordered.push(points[index]);
    index = (index + step) % count;
  }
  return ordered;
}

const pointsAttr = (points) => points.map(({ x, y }) => `${x},${y}`).join(' ');

function annulusSectorLines({ count = 40, innerRadius = 402, outerRadius = 474, rotation = -Math.PI / 2 } = {}) {
  return Array.from({ length: count }, (_, index) => {
    const inner = polarPoint(innerRadius, index, count, rotation);
    const outer = polarPoint(outerRadius, index, count, rotation);
    return `<line data-aemeth-sigil-sector="${index + 1}" x1="${inner.x}" y1="${inner.y}" x2="${outer.x}" y2="${outer.y}" />`;
  }).join('');
}

function radialSevenfoldLines({ innerRadius, outerRadius, rotation = -Math.PI / 2, className = '' }) {
  return Array.from({ length: 7 }, (_, index) => {
    const inner = polarPoint(innerRadius, index, 7, rotation);
    const outer = polarPoint(outerRadius, index, 7, rotation);
    return `<line class="${className}" data-aemeth-sevenfold-ray="${index + 1}" x1="${inner.x}" y1="${inner.y}" x2="${outer.x}" y2="${outer.y}" />`;
  }).join('');
}

export function sigillumDeiAemethGeometry() {
  const rotation = -Math.PI / 2;
  return Object.freeze({
    schema: 'arcsweep.aemeth-sigil-geometry/v1',
    id: 'sigillum-dei-aemeth',
    version: SIGILLUM_DEI_AEMETH_GEOMETRY_VERSION,
    viewBox: '0 0 1000 1000',
    witness: SIGILLUM_DEI_AEMETH_WITNESS,
    layers: Object.freeze([
      Object.freeze({ id: 'outer-boundary', kind: 'circle', radius: 474 }),
      Object.freeze({ id: 'outer-annulus-midline', kind: 'circle', radius: 438 }),
      Object.freeze({ id: 'outer-annulus-inner', kind: 'circle', radius: 402 }),
      Object.freeze({ id: 'outer-annulus-sectors', kind: 'radial-grid', count: 40, rotation }),
      Object.freeze({ id: 'outer-heptagon', kind: 'regular-polygon', count: 7, radius: 392, rotation }),
      Object.freeze({ id: 'great-heptagram', kind: 'star-polygon', count: 7, step: 2, radius: 382, rotation }),
      Object.freeze({ id: 'middle-heptagon', kind: 'regular-polygon', count: 7, radius: 288, rotation }),
      Object.freeze({ id: 'middle-heptagram', kind: 'star-polygon', count: 7, step: 2, radius: 276, rotation }),
      Object.freeze({ id: 'inner-heptagon', kind: 'regular-polygon', count: 7, radius: 202, rotation }),
      Object.freeze({ id: 'inner-sevenfold-rays', kind: 'radial-grid', count: 7, innerRadius: 118, outerRadius: 202, rotation }),
      Object.freeze({ id: 'central-heptagram', kind: 'star-polygon', count: 7, step: 2, radius: 136, rotation }),
      Object.freeze({ id: 'central-heptagon', kind: 'regular-polygon', count: 7, radius: 83, rotation }),
    ]),
    inscriptions: Object.freeze({ status: 'pending-verification', committed: false, reason: 'geometry is separated from manuscript/name transcription so modern private typesetting is never copied into the public vector' }),
  });
}

export function renderSigillumDeiAemethSvg({ className = 'aemeth-sigillum-svg', title = 'Sigillum Dei Aemeth · structural geometry' } = {}) {
  const geometry = sigillumDeiAemethGeometry();
  const rotation = -Math.PI / 2;
  const outerHeptagon = regularPolygonPoints(7, 392, rotation);
  const greatHeptagram = steppedStarPoints(7, 2, 382, rotation);
  const middleHeptagon = regularPolygonPoints(7, 288, rotation);
  const middleHeptagram = steppedStarPoints(7, 2, 276, rotation);
  const innerHeptagon = regularPolygonPoints(7, 202, rotation);
  const centralHeptagram = steppedStarPoints(7, 2, 136, rotation);
  const centralHeptagon = regularPolygonPoints(7, 83, rotation);
  return `<svg class="${className}" data-aemeth-sigillum="${geometry.version}" viewBox="${geometry.viewBox}" role="img" aria-label="${title}">
    <title>${title}</title>
    <g class="aemeth-sigil-layer aemeth-sigil-boundaries" data-aemeth-sigil-layer="outer-boundaries">
      <circle cx="500" cy="500" r="474" />
      <circle cx="500" cy="500" r="438" />
      <circle cx="500" cy="500" r="402" />
      ${annulusSectorLines({ count: 40, innerRadius: 402, outerRadius: 474, rotation })}
    </g>
    <g class="aemeth-sigil-layer aemeth-sigil-sevenfold" data-aemeth-sigil-layer="outer-sevenfold">
      <polygon data-aemeth-sigil-shape="outer-heptagon" points="${pointsAttr(outerHeptagon)}" />
      <polygon data-aemeth-sigil-shape="great-heptagram" points="${pointsAttr(greatHeptagram)}" />
    </g>
    <g class="aemeth-sigil-layer aemeth-sigil-middle" data-aemeth-sigil-layer="middle-sevenfold">
      <polygon data-aemeth-sigil-shape="middle-heptagon" points="${pointsAttr(middleHeptagon)}" />
      <polygon data-aemeth-sigil-shape="middle-heptagram" points="${pointsAttr(middleHeptagram)}" />
    </g>
    <g class="aemeth-sigil-layer aemeth-sigil-inner" data-aemeth-sigil-layer="inner-sevenfold">
      <polygon data-aemeth-sigil-shape="inner-heptagon" points="${pointsAttr(innerHeptagon)}" />
      ${radialSevenfoldLines({ innerRadius: 118, outerRadius: 202, rotation, className: 'aemeth-sigil-inner-ray' })}
      <polygon data-aemeth-sigil-shape="central-heptagram" points="${pointsAttr(centralHeptagram)}" />
      <polygon data-aemeth-sigil-shape="central-heptagon" points="${pointsAttr(centralHeptagon)}" />
      <circle data-aemeth-sigil-shape="central-point" cx="500" cy="500" r="8" />
    </g>
  </svg>`;
}
