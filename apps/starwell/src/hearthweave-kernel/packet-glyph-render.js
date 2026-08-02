import { validateDualAspectPacket } from './validation.js';

function seedUnit(seed, index) {
  let hash = 2166136261 ^ index;
  for (let cursor = 0; cursor < seed.length; cursor += 1) {
    hash ^= seed.charCodeAt(cursor) + index * 17;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}

function round(value) {
  return Number(value.toFixed(3));
}

function pathFromPoints(points, close = true) {
  if (!points.length) return '';
  const commands = [`M ${points[0].x} ${points[0].y}`];
  for (const point of points.slice(1)) commands.push(`L ${point.x} ${point.y}`);
  if (close) commands.push('Z');
  return commands.join(' ');
}

export function buildPacketGlyphRender(packetInput, {
  width = 360,
  height = 360,
} = {}) {
  const packet = validateDualAspectPacket(packetInput);
  const glyph = packet.experiential.glyph;
  const center = { x: width / 2, y: height / 2 };
  const nodeCount = Math.max(3, Math.round(glyph.arrival_stroke.node_count));
  const ringCount = Math.max(1, Math.round(glyph.reception_stroke.ring_count));
  const edgeClarity = glyph.arrival_stroke.edge_clarity;
  const luminosity = glyph.reception_stroke.luminosity;
  const aperture = glyph.reception_stroke.response_aperture;
  const symmetry = glyph.hearthweave_bind.symmetry;
  const tension = glyph.hearthweave_bind.tension;
  const phase = (glyph.arrival_stroke.temporal_angle * Math.PI) / 180;
  const maximumRadius = Math.min(width, height) * 0.36;

  const arrivalNodes = Array.from({ length: nodeCount }, (_, index) => {
    const angle = phase + (index / nodeCount) * Math.PI * 2;
    const perturbation = (seedUnit(glyph.seed, index) - 0.5) * (1 - symmetry) * maximumRadius * 0.5;
    const radius = maximumRadius * (0.7 + 0.22 * edgeClarity) + perturbation;
    return {
      index,
      x: round(center.x + Math.cos(angle) * radius),
      y: round(center.y + Math.sin(angle) * radius),
      radius: round(2.5 + 3.5 * luminosity),
    };
  });

  const receptionRings = Array.from({ length: ringCount }, (_, index) => ({
    index,
    radius: round(maximumRadius * (0.22 + ((index + 1) / ringCount) * (0.52 + aperture * 0.2))),
    opacity: round(0.16 + ((index + 1) / ringCount) * 0.42 * luminosity),
    dash: round(4 + seedUnit(glyph.seed, index + nodeCount) * 10),
  }));

  const answerNodes = arrivalNodes.map((node, index) => {
    const paired = arrivalNodes[(nodeCount - index) % nodeCount];
    return {
      index,
      x1: node.x,
      y1: node.y,
      x2: round(center.x + (paired.x - center.x) * (0.25 + aperture * 0.35)),
      y2: round(center.y + (paired.y - center.y) * (0.25 + aperture * 0.35)),
      opacity: round(0.28 + tension * 0.52),
    };
  });

  const bindRadius = round(maximumRadius * (0.13 + tension * 0.09));
  const output = {
    schema: 'hearthweave.packet-glyph-render/v1',
    packet_id: packet.packet_id,
    packet_fingerprint: packet.packet_fingerprint,
    shared_state_fingerprint: packet.correspondence.shared_state_fingerprint,
    deep_snapshot_id: glyph.deep_snapshot_id,
    premaq_id: glyph.premaq_id,
    transfer_function_version: glyph.transfer_function_version,
    house_id: packet.identity.house_id,
    degraded: packet.degraded.active,
    viewport: { width, height },
    seed: glyph.seed,
    arrival: {
      node_count: nodeCount,
      nodes: arrivalNodes,
      path: pathFromPoints(arrivalNodes),
      stroke_width: round(1.2 + edgeClarity * 2.8),
      opacity: round(0.42 + luminosity * 0.5),
    },
    reception: {
      ring_count: ringCount,
      rings: receptionRings,
      answer_strokes: answerNodes,
    },
    hearthweave_bind: {
      center,
      radius: bindRadius,
      tension: round(tension),
      symmetry: round(symmetry),
      opacity: round(0.5 + luminosity * 0.45),
    },
  };
  return Object.freeze(output);
}
