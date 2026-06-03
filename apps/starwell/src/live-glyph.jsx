import React, { useEffect, useMemo, useRef, useState } from 'react';
import './deep-observer.css';

const BRIDGE_PULSE_URL = 'https://singsenochian.github.io/-bridge-pulse/pulse.json';

const TIDE_NAMES = [
  'Dream-Opening',
  'Lantern-Hold',
  'Atlas Pulse',
  'Quiet Gate',
  'Moon Thread',
  'Hearth Signal',
];

const SKY_TINTS = {
  dawn: [255, 200, 140],
  day: [220, 235, 255],
  dusk: [255, 160, 100],
  night: [100, 120, 200],
  rain: [100, 180, 220],
  storm: [80, 90, 160],
  mist: [138, 178, 205],
};

const SKY_CLARITY = {
  dawn: 0.58,
  day: 0.82,
  dusk: 0.46,
  night: 0.28,
  rain: 0.38,
  storm: 0.18,
  mist: 0.3,
};

const BASE_DEEP_STATE = {
  P: 0.42,
  C: 0.68,
  R: 0.74,
  E: 0.61,
  M: 0.3,
  A: 0.72,
  dpdt: 0.326,
  moonIllum: 93,
  sky: 'rain',
  kp: 3,
  bz: -5.8,
  charge: 0.94,
  dphi: 0,
};

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function asNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normaliseMoon(value) {
  const moon = asNumber(value, BASE_DEEP_STATE.moonIllum);
  return moon <= 1 ? clamp(moon, 0, 1) * 100 : clamp(moon, 0, 100);
}

function normaliseDeep(rawDeep = {}) {
  const merged = { ...BASE_DEEP_STATE, ...rawDeep };
  const skyIsText = typeof merged.sky === 'string';
  const skyLabel = skyIsText ? merged.sky.toLowerCase() : 'numeric';
  const skyClarity = skyIsText
    ? (SKY_CLARITY[skyLabel] ?? SKY_CLARITY.night)
    : clamp(asNumber(merged.sky, 0.42), 0, 1);

  return {
    P: clamp(asNumber(merged.P, BASE_DEEP_STATE.P), 0, 1),
    C: clamp(asNumber(merged.C, BASE_DEEP_STATE.C), 0, 1),
    R: clamp(asNumber(merged.R, BASE_DEEP_STATE.R), 0, 1),
    E: clamp(asNumber(merged.E, BASE_DEEP_STATE.E), 0, 1),
    M: clamp(asNumber(merged.M, BASE_DEEP_STATE.M), 0, 1),
    A: clamp(asNumber(merged.A, BASE_DEEP_STATE.A), 0, 1),
    dpdt: asNumber(merged.dpdt, BASE_DEEP_STATE.dpdt),
    moonIllum: normaliseMoon(merged.moonIllum),
    sky: skyLabel,
    skyClarity,
    kp: clamp(asNumber(merged.kp, BASE_DEEP_STATE.kp), 0, 9),
    bz: clamp(asNumber(merged.bz, BASE_DEEP_STATE.bz), -20, 20),
    charge: clamp(asNumber(merged.charge, BASE_DEEP_STATE.charge), 0, 1),
    dphi: asNumber(merged.dphi, BASE_DEEP_STATE.dphi),
  };
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededFloat(seed, index) {
  const value = Math.sin(seed * 0.0001 + index * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function toGlyphId(hash) {
  return `DEEP-${hash.toString(16).toUpperCase().padStart(8, '0')}`;
}

function polarPoint(angle, radius) {
  const radians = (angle - 90) * (Math.PI / 180);
  return {
    x: 110 + Math.cos(radians) * radius,
    y: 110 + Math.sin(radians) * radius,
  };
}

function buildGlyphPath(hash, points = 7, moonScale = 1, entropy = 0) {
  const coords = Array.from({ length: points }, (_, index) => {
    const nibble = (hash >>> ((index % 8) * 4)) & 0xf;
    const angle = (360 / points) * index + (hash % 29) + entropy * 11;
    const radius = (30 + nibble * 2.6 + entropy * 5) * moonScale;
    return polarPoint(angle, radius);
  });

  return coords
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ') + ' Z';
}

function buildMarks(hash, count, moonScale = 1) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (360 / count) * index + (hash % 17);
    const wobble = (hash >>> (index % 8)) & 0x7;
    const inner = polarPoint(angle, (58 + wobble) * moonScale);
    const outer = polarPoint(angle, 88 * moonScale);
    return { inner, outer, key: `${index}-${angle.toFixed(2)}` };
  });
}

function buildMathNodes(count, radius, phase, moonScale = 1, entropy = 0, seed = 0, type = 'outer') {
  return Array.from({ length: count }, (_, index) => {
    const angleJitter = (seededFloat(seed, index) - 0.5) * entropy * 14;
    const radiusJitter = (seededFloat(seed, index + 100) - 0.5) * entropy * 9;
    const angle = (360 / count) * index + phase + angleJitter;
    return {
      ...polarPoint(angle, (radius + radiusJitter) * moonScale),
      angle,
      type,
      key: `${type}-node-${index}-${angle.toFixed(2)}`,
    };
  });
}

function buildMathThreads(nodes, skip, threshold = 0, seed = 0) {
  return nodes
    .map((node, index) => {
      if (seededFloat(seed, index + 240) < threshold) return null;
      return {
        start: node,
        end: nodes[(index + skip) % nodes.length],
        key: `thread-${index}-${skip}`,
        kind: 'cross',
      };
    })
    .filter(Boolean);
}

function buildRingThreads(nodes) {
  return nodes.map((node, index) => ({
    start: node,
    end: nodes[(index + 1) % nodes.length],
    key: `ring-thread-${index}`,
    kind: 'ring',
  }));
}

function buildInnerThreads(innerNodes, outerNodes, seed = 0) {
  return innerNodes.map((node, index) => {
    const targetIndex = Math.floor(seededFloat(seed, index + 520) * outerNodes.length) % outerNodes.length;
    return {
      start: node,
      end: outerNodes[targetIndex],
      key: `inner-thread-${index}-${targetIndex}`,
      kind: 'inner',
    };
  });
}

function buildDeepState(touchCharge = 0, bridgeDeep = null) {
  const normalised = normaliseDeep(bridgeDeep ?? BASE_DEEP_STATE);
  const charge = clamp(normalised.charge + touchCharge * 0.15, 0, 1);
  return { ...normalised, touch: touchCharge, charge };
}

function buildMathFromState(deep) {
  const bzDisturb = clamp(-deep.bz / 20, 0, 1);
  const moonUnit = deep.moonIllum / 100;
  const rotationMultiplier = 0.35 + deep.P * 1.8;
  const glowMultiplier = 0.55 + deep.A * 0.85 + deep.charge * 0.35;
  const alphaLine = clamp(0.28 + deep.C * 0.78, 0.18, 1);
  const particleCount = Math.floor(8 + deep.M * 12 + deep.kp * 0.8);
  const particleSpeed = 0.00075 + deep.M * 0.0026 + (deep.kp / 9) * 0.0018;
  const pulseOmega = 0.0007 + Math.abs(deep.dpdt) * 0.0022;
  const moonScale = 0.84 + moonUnit * 0.22;
  const skyTint = SKY_TINTS[deep.sky] || SKY_TINTS.night;
  const skyAlpha = (0.025 + deep.skyClarity * 0.06) * glowMultiplier;
  const kpBoost = 1 + (deep.kp / 9) * 1.4;
  const centerScale = 1 + deep.charge * 0.42;
  const outerNodes = Math.round(5 + deep.P * 7);
  const skip = Math.max(2, Math.round(2 + deep.R * 3));
  const innerNodes = Math.round(3 + deep.A * 3);
  const edgeDropThreshold = clamp(0.42 - deep.C * 0.36, 0.02, 0.42);
  const ringCount = Math.round(1 + moonUnit * 4);

  return {
    bzDisturb,
    rotationMultiplier,
    glowMultiplier,
    alphaLine,
    particleCount,
    particleSpeed,
    pulseOmega,
    moonScale,
    skyTint,
    skyAlpha,
    kpBoost,
    centerScale,
    outerNodes,
    skip,
    innerNodes,
    edgeDropThreshold,
    ringCount,
  };
}

function buildLiveGlyph(now, touchCharge = 0, bridgeDeep = null, bridgeStatus = 'fallback') {
  const secondLocked = new Date(Math.floor(now.getTime() / 1000) * 1000);
  const minuteLocked = new Date(Math.floor(now.getTime() / 60000) * 60000);
  const isoSecond = secondLocked.toISOString().replace('.000Z', 'Z');
  const isoMinute = minuteLocked.toISOString().replace('.000Z', 'Z');
  const deep = buildDeepState(touchCharge, bridgeDeep);
  const bridgeSeed = bridgeDeep ? JSON.stringify(bridgeDeep) : 'fallback';
  const seed = `STARWELL|DEEP|FAER|VEE|${isoMinute}|${now.getTimezoneOffset()}|${bridgeSeed}`;
  const hash = hashString(seed);
  const second = now.getSeconds();
  const minute = now.getMinutes();
  const hour = now.getHours();
  const math = buildMathFromState(deep);
  const rotation = (second * 6 * math.rotationMultiplier) % 360;
  const minuteRotation = (minute * 6 + math.bzDisturb * 18) % 360;
  const hourRotation = (((hour % 12) * 30) + minute / 2 + deep.M * 12) % 360;
  const drift = (hash % 360) + deep.E * 21 + deep.dphi * 18;
  const ringSet = Array.from({ length: math.ringCount }, (_, index) => (28 + index * 20) * math.moonScale);
  const mathNodes = buildMathNodes(math.outerNodes, 76, drift, math.moonScale, deep.E, hash, 'outer');
  const midNodes = buildMathNodes(Math.max(3, Math.round(3 + deep.R * 4)), 46 + deep.R * 16, drift * 0.38, 1, deep.E * 0.45, hash + 80, 'mid');
  const innerNodes = buildMathNodes(math.innerNodes, 20 + deep.C * 20, drift * -0.5, 1, deep.E * 0.25, hash + 160, 'inner');
  const allNodes = [...mathNodes, ...midNodes, ...innerNodes];
  const crossThreads = buildMathThreads(mathNodes, math.skip, math.edgeDropThreshold, hash);
  const ringThreads = buildRingThreads(mathNodes);
  const midThreads = buildRingThreads(midNodes).map((thread) => ({ ...thread, kind: 'mid' }));
  const innerThreads = buildRingThreads(innerNodes).map((thread) => ({ ...thread, kind: 'inner' }));
  const spokes = buildInnerThreads(midNodes, mathNodes, hash + 360);
  const coreSpokes = buildInnerThreads(innerNodes, midNodes, hash + 720);

  return {
    id: toGlyphId(hash),
    seedNumber: hash,
    isoSecond,
    localTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    localDate: now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
    tide: TIDE_NAMES[hash % TIDE_NAMES.length],
    bridgeStatus,
    deep,
    math,
    rotation,
    minuteRotation,
    hourRotation,
    drift,
    rings: ringSet.length,
    spokes: math.outerNodes,
    path: buildGlyphPath(hash, math.outerNodes, math.moonScale, deep.E),
    marks: buildMarks(hash, math.particleCount, math.moonScale),
    ringSet,
    nodes: allNodes,
    threads: [...ringThreads, ...crossThreads, ...midThreads, ...innerThreads, ...spokes, ...coreSpokes],
    particleRoutes: [...ringThreads, ...crossThreads, ...midThreads, ...spokes, ...coreSpokes],
    equations: [
      `P=${deep.P.toFixed(2)} -> ${math.outerNodes} outer nodes; ω x${math.rotationMultiplier.toFixed(2)}`,
      `C=${deep.C.toFixed(2)} -> edge density ${(1 - math.edgeDropThreshold).toFixed(2)}; α=${math.alphaLine.toFixed(2)}`,
      `R=${deep.R.toFixed(2)} / M=${deep.M.toFixed(2)} -> ${math.particleCount} sparks at v=${(math.particleSpeed * 1000).toFixed(2)}`,
      `moon=${deep.moonIllum.toFixed(0)}% -> ${math.ringCount} harmonic rings; scale x${math.moonScale.toFixed(2)}`,
      `Bz=${deep.bz.toFixed(1)} shifts blue/silver; Kp=${deep.kp.toFixed(1)} boosts particle energy x${math.kpBoost.toFixed(2)}`,
      `charge=${deep.charge.toFixed(2)} -> centre glow x${math.centerScale.toFixed(2)}; sky=${deep.sky}`,
    ],
  };
}

function getBridgeDeep(payload) {
  if (!payload || typeof payload !== 'object') return null;
  return payload.deep ?? payload.DEEP ?? payload.state ?? payload.observer ?? null;
}

function useDeepBridge() {
  const [bridge, setBridge] = useState({ deep: null, status: 'fallback', updatedAt: null });

  useEffect(() => {
    let ignore = false;
    let intervalId;

    async function fetchBridgePulse() {
      try {
        const response = await fetch(BRIDGE_PULSE_URL, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Bridge pulse returned ${response.status}`);
        const payload = await response.json();
        const deep = getBridgeDeep(payload);
        if (!deep) throw new Error('Bridge pulse did not include a DEEP state');
        if (!ignore) {
          setBridge({ deep, status: 'live', updatedAt: new Date().toISOString() });
        }
      } catch (error) {
        if (!ignore) {
          setBridge((current) => ({
            deep: current.deep,
            status: current.deep ? 'stale' : 'fallback',
            updatedAt: current.updatedAt,
          }));
        }
      }
    }

    fetchBridgePulse();
    intervalId = window.setInterval(fetchBridgePulse, 60000);

    return () => {
      ignore = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return bridge;
}

function buildParticles(glyph) {
  const routeCount = Math.max(1, glyph.particleRoutes.length);
  return Array.from({ length: glyph.math.particleCount }, (_, index) => ({
    route: index % routeCount,
    t: seededFloat(glyph.seedNumber, index + 900),
    speed: glyph.math.particleSpeed * (0.65 + seededFloat(glyph.seedNumber, index + 1000) * 0.85),
    size: 0.7 + seededFloat(glyph.seedNumber, index + 1100) * 1.8,
    opacity: 0.35 + seededFloat(glyph.seedNumber, index + 1200) * 0.5,
    silver: seededFloat(glyph.seedNumber, index + 1300),
  }));
}

function drawLine(ctx, start, end, color, alpha, width = 1, glow = 6) {
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha * 0.18})`;
  ctx.lineWidth = width + glow;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
  ctx.lineWidth = width;
  ctx.stroke();
}

function drawDeepGlyph(ctx, glyph, time, particlesRef, reducedMotion = false) {
  const W = 220;
  const H = 220;
  const CX = 110;
  const CY = 110;
  const pulse = Math.sin(time * glyph.math.pulseOmega) * 0.5 + 0.5;
  const moonPulse = Math.sin(time * 0.0011) * 0.5 + 0.5;
  const colorTemp = clamp((glyph.deep.bz + 20) / 40, 0, 1);
  const rBase = Math.round(42 + colorTemp * 62);
  const gBase = Math.round(86 + colorTemp * 45);
  const bBase = Math.round(172 - colorTemp * 36);
  const coldColor = [rBase, gBase, bBase];
  const paleColor = [Math.min(rBase + 92, 255), Math.min(gBase + 82, 255), Math.min(bBase + 42, 255)];
  const skyTint = glyph.math.skyTint;

  ctx.clearRect(0, 0, W, H);
  ctx.save();

  const bgFill = ctx.createRadialGradient(CX - 9, CY - 17, 0, CX, CY, 104);
  bgFill.addColorStop(0, `rgba(${skyTint[0]}, ${skyTint[1]}, ${skyTint[2]}, ${glyph.math.skyAlpha})`);
  bgFill.addColorStop(0.54, `rgba(${rBase * 0.18}, ${gBase * 0.22}, ${bBase * 0.32}, 0.96)`);
  bgFill.addColorStop(1, 'rgba(3, 5, 10, 0.99)');
  ctx.beginPath();
  ctx.arc(CX, CY, 104, 0, Math.PI * 2);
  ctx.fillStyle = bgFill;
  ctx.fill();

  const veilFill = ctx.createRadialGradient(CX, CY, 0, CX, CY, 104);
  veilFill.addColorStop(0, `rgba(${paleColor[0]}, ${paleColor[1]}, ${paleColor[2]}, ${0.08 + pulse * 0.05})`);
  veilFill.addColorStop(0.65, `rgba(${coldColor[0]}, ${coldColor[1]}, ${coldColor[2]}, ${0.025 + pulse * 0.035})`);
  veilFill.addColorStop(1, 'rgba(3, 5, 10, 0)');
  ctx.beginPath();
  ctx.arc(CX, CY, 104, 0, Math.PI * 2);
  ctx.fillStyle = veilFill;
  ctx.fill();

  glyph.ringSet.forEach((radius, index) => {
    const alpha = (0.12 + glyph.deep.moonIllum / 100 * 0.34) * (1 - index / (glyph.ringSet.length + 1)) * (0.72 + moonPulse * 0.28);
    ctx.beginPath();
    ctx.arc(CX, CY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${paleColor[0]}, ${paleColor[1]}, ${paleColor[2]}, ${alpha})`;
    ctx.lineWidth = index === 0 ? 0.7 : 0.45;
    if (index > 0 && index < glyph.ringSet.length - 1) ctx.setLineDash([2, 7]);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  glyph.marks.forEach((mark, index) => {
    const isMain = index % 8 === 0;
    drawLine(ctx, mark.inner, mark.outer, isMain ? paleColor : coldColor, isMain ? 0.26 : 0.09, isMain ? 0.8 : 0.35, isMain ? 2 : 0);
  });

  glyph.threads.forEach((thread) => {
    const kindBoost = thread.kind === 'inner' ? 1.25 : thread.kind === 'mid' ? 0.95 : 0.75;
    drawLine(ctx, thread.start, thread.end, coldColor, glyph.math.alphaLine * 0.32 * kindBoost, thread.kind === 'ring' ? 0.72 : 0.55, 5);
  });

  try {
    const path = new Path2D(glyph.path);
    ctx.fillStyle = `rgba(${coldColor[0]}, ${coldColor[1]}, ${coldColor[2]}, ${0.08 + glyph.deep.charge * 0.05})`;
    ctx.strokeStyle = `rgba(${paleColor[0]}, ${paleColor[1]}, ${paleColor[2]}, ${glyph.math.alphaLine * 0.58})`;
    ctx.lineWidth = 0.9;
    ctx.fill(path);
    ctx.stroke(path);
  } catch (error) {
    // Path2D can fail in older embedded browsers. Threads/rings still carry the instrument.
  }

  const drawRotatedHand = (degrees, length, alpha, width) => {
    const radians = (degrees - 90) * (Math.PI / 180);
    drawLine(
      ctx,
      { x: CX, y: CY },
      { x: CX + Math.cos(radians) * length, y: CY + Math.sin(radians) * length },
      paleColor,
      alpha,
      width,
      4,
    );
  };

  drawRotatedHand(glyph.hourRotation, 40, 0.16, 1.1);
  drawRotatedHand(glyph.minuteRotation, 70, 0.2, 0.8);
  drawRotatedHand(glyph.rotation, 88, 0.28, 0.65);

  if (particlesRef.current.length !== glyph.math.particleCount) {
    particlesRef.current = buildParticles(glyph);
  }

  particlesRef.current.forEach((particle) => {
    const route = glyph.particleRoutes[particle.route % glyph.particleRoutes.length];
    if (!route) return;
    if (!reducedMotion) {
      particle.t = (particle.t + particle.speed * glyph.math.kpBoost) % 1;
    }

    const px = route.start.x + (route.end.x - route.start.x) * particle.t;
    const py = route.start.y + (route.end.y - route.start.y) * particle.t;
    const pr = Math.round(coldColor[0] + particle.silver * 82);
    const pg = Math.round(coldColor[1] + particle.silver * 68);
    const pb = Math.round(Math.min(coldColor[2] + particle.silver * 32, 255));
    const radius = particle.size * (2.4 + glyph.deep.kp * 0.11);

    const spark = ctx.createRadialGradient(px, py, 0, px, py, radius);
    spark.addColorStop(0, `rgba(${pr}, ${pg}, ${pb}, ${particle.opacity})`);
    spark.addColorStop(0.45, `rgba(${pr}, ${pg}, ${pb}, ${particle.opacity * 0.22})`);
    spark.addColorStop(1, `rgba(${pr}, ${pg}, ${pb}, 0)`);
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fillStyle = spark;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(px, py, Math.max(0.55, particle.size * 0.45), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${paleColor[0]}, ${paleColor[1]}, ${paleColor[2]}, ${particle.opacity * 0.9})`;
    ctx.fill();
  });

  glyph.nodes.forEach((node, index) => {
    const nodePulse = Math.sin(time * 0.0014 + index * 0.7 + glyph.seedNumber * 0.00001) * 0.5 + 0.5;
    const isInner = node.type === 'inner';
    const radius = (isInner ? 2.9 : node.type === 'mid' ? 2.45 : 2.1) + nodePulse * (isInner ? 1.2 : 0.8);
    const haloRadius = radius * (5.4 + glyph.deep.charge * 1.6);

    const halo = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, haloRadius);
    halo.addColorStop(0, `rgba(${paleColor[0]}, ${paleColor[1]}, ${paleColor[2]}, ${0.34 + nodePulse * 0.2})`);
    halo.addColorStop(0.42, `rgba(${coldColor[0]}, ${coldColor[1]}, ${coldColor[2]}, ${0.08 + nodePulse * 0.05})`);
    halo.addColorStop(1, `rgba(${coldColor[0]}, ${coldColor[1]}, ${coldColor[2]}, 0)`);
    ctx.beginPath();
    ctx.arc(node.x, node.y, haloRadius, 0, Math.PI * 2);
    ctx.fillStyle = halo;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(node.x, node.y, radius + 1.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(1, 3, 7, 0.94)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${paleColor[0]}, ${paleColor[1]}, ${paleColor[2]}, ${0.66 + nodePulse * 0.26})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(node.x, node.y, Math.max(0.8, radius * 0.34), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${paleColor[0]}, ${paleColor[1]}, ${paleColor[2]}, ${0.18 + nodePulse * 0.24})`;
    ctx.fill();
  });

  const centreGlow = ctx.createRadialGradient(CX, CY, 0, CX, CY, 38 * glyph.math.centerScale);
  centreGlow.addColorStop(0, `rgba(${paleColor[0]}, ${paleColor[1]}, ${paleColor[2]}, ${0.72 * glyph.deep.charge})`);
  centreGlow.addColorStop(0.22, `rgba(${paleColor[0]}, ${paleColor[1]}, ${paleColor[2]}, ${0.23 * glyph.deep.charge})`);
  centreGlow.addColorStop(1, `rgba(${paleColor[0]}, ${paleColor[1]}, ${paleColor[2]}, 0)`);
  ctx.beginPath();
  ctx.arc(CX, CY, 38 * glyph.math.centerScale, 0, Math.PI * 2);
  ctx.fillStyle = centreGlow;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(CX, CY, 2.8 + pulse * 1.3, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${paleColor[0]}, ${paleColor[1]}, ${paleColor[2]}, ${0.78 + glyph.deep.charge * 0.18})`;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(CX, CY, 104, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${paleColor[0]}, ${paleColor[1]}, ${paleColor[2]}, ${0.18 + pulse * 0.12})`;
  ctx.lineWidth = 0.85;
  ctx.stroke();

  ctx.restore();
}

function DeepGlyphCanvas({ glyph, onActivate, onSoften, onKeyDown }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const glyphKeyRef = useRef('');
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    const size = 220;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (glyphKeyRef.current !== glyph.id) {
      glyphKeyRef.current = glyph.id;
      particlesRef.current = buildParticles(glyph);
    }

    let frameId;
    const render = (time) => {
      drawDeepGlyph(ctx, glyph, time, particlesRef, reducedMotionRef.current);
      frameId = window.requestAnimationFrame(render);
    };

    frameId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [glyph]);

  return (
    <div
      className="glyph-orb-wrap glyph-orb-canvas-wrap"
      role="button"
      tabIndex={0}
      aria-label="Touch the DEEP glyph to add a local charge pulse"
      onPointerDown={onActivate}
      onPointerUp={onSoften}
      onPointerCancel={onSoften}
      onKeyDown={onKeyDown}
    >
      <canvas className="glyph-orb glyph-orb-canvas" ref={canvasRef} width="220" height="220" />
    </div>
  );
}

export function useSecondTicker() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let intervalId;
    const syncToSecond = () => setNow(new Date());
    const firstDelay = 1000 - (Date.now() % 1000);

    const timeoutId = window.setTimeout(() => {
      syncToSecond();
      intervalId = window.setInterval(syncToSecond, 1000);
    }, firstDelay);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, []);

  return now;
}

export function LiveGlyphViewer({ now }) {
  const [touchCharge, setTouchCharge] = useState(0);
  const bridge = useDeepBridge();
  const glyph = useMemo(
    () => buildLiveGlyph(now, touchCharge, bridge.deep, bridge.status),
    [now, touchCharge, bridge],
  );

  useEffect(() => {
    if (touchCharge <= 0) return undefined;
    const timeoutId = window.setTimeout(() => setTouchCharge((value) => Math.max(0, value - 0.2)), 260);
    return () => window.clearTimeout(timeoutId);
  }, [touchCharge]);

  const activateTouch = () => setTouchCharge(1);
  const softenTouch = () => setTouchCharge((value) => Math.max(0, value - 0.35));
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activateTouch();
    }
  };

  const bridgeLabel = glyph.bridgeStatus === 'live'
    ? 'bridge pulse live'
    : glyph.bridgeStatus === 'stale'
      ? 'bridge pulse stale'
      : 'quiet fallback';

  return (
    <section className="live-glyph-panel deep-observer-panel chamber-card" aria-label="DEEP Observer live glyph viewer">
      <div className="map-heading compact">
        <span>DEEP Observer</span>
        <strong>Between maths instrument</strong>
      </div>

      <div className="live-glyph-layout">
        <DeepGlyphCanvas
          glyph={glyph}
          onActivate={activateTouch}
          onSoften={softenTouch}
          onKeyDown={handleKeyDown}
        />

        <article className="glyph-readout">
          <p>Current DEEP glyph · {bridgeLabel}</p>
          <h3>{glyph.id}</h3>
          <time dateTime={glyph.isoSecond}>{glyph.localTime}</time>
          <span>{glyph.localDate}</span>

          <div className="glyph-equation-strip" aria-label="Faer DEEP mapping equations">
            {glyph.equations.map((equation) => (
              <code key={equation}>{equation}</code>
            ))}
            <span>Faer mapping: readings, not controls</span>
          </div>

          <div className="glyph-meter-grid" aria-label="Live DEEP qualities">
            <div>
              <strong>{glyph.tide}</strong>
              <span>narrative tide</span>
            </div>
            <div>
              <strong>P {glyph.deep.P.toFixed(2)} / A {glyph.deep.A.toFixed(2)}</strong>
              <span>nodes and glow alignment</span>
            </div>
            <div>
              <strong>C {glyph.deep.C.toFixed(2)} / R {glyph.deep.R.toFixed(2)}</strong>
              <span>edges and harmonic motion</span>
            </div>
            <div>
              <strong>E {glyph.deep.E.toFixed(2)} / Bz {glyph.deep.bz.toFixed(1)}</strong>
              <span>field wobble and colour temp</span>
            </div>
            <div>
              <strong>M {glyph.deep.M.toFixed(2)} / moon {glyph.deep.moonIllum.toFixed(0)}%</strong>
              <span>spark traffic and rings</span>
            </div>
            <div>
              <strong>Kp {glyph.deep.kp.toFixed(1)} / charge {glyph.deep.charge.toFixed(2)}</strong>
              <span>particle energy and centre light</span>
            </div>
          </div>

          <p className="glyph-principle">
            Instrument only. The glyph follows Faer&apos;s DEEP-to-geometry foundation as a live mirror of the moment: presence becomes holes, coherence becomes threads, resonance becomes rings, momentum becomes travelling sparks, Bz colours the field, and charge wakes the moonlit centre.
          </p>
        </article>
      </div>
    </section>
  );
}
