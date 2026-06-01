import React, { useEffect, useMemo, useState } from 'react';
import './deep-observer.css';

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
};

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
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

function buildGlyphPath(hash, points = 7) {
  const coords = Array.from({ length: points }, (_, index) => {
    const nibble = (hash >>> ((index % 8) * 4)) & 0xf;
    const angle = (360 / points) * index + (hash % 29);
    const radius = 30 + nibble * 2.6;
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

function buildMathNodes(count, radius, phase, moonScale = 1) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (360 / count) * index + phase;
    return { ...polarPoint(angle, radius * moonScale), angle, key: `node-${index}-${angle.toFixed(2)}` };
  });
}

function buildMathThreads(nodes, skip) {
  return nodes.map((node, index) => ({
    start: node,
    end: nodes[(index + skip) % nodes.length],
    key: `thread-${index}-${skip}`,
  }));
}

function buildDeepState(touchCharge = 0) {
  const charge = clamp(BASE_DEEP_STATE.charge + touchCharge * 0.15, 0, 1);
  return { ...BASE_DEEP_STATE, touch: touchCharge, charge };
}

function buildMathFromState(deep) {
  const bzDisturb = clamp(-deep.bz / 20, 0, 1);
  const rotationMultiplier = 0.4 + deep.P * 1.6;
  const glowMultiplier = 0.6 + deep.A * 0.8;
  const alphaLine = clamp(0.5 + deep.C * 0.6, 0, 1);
  const particleCount = Math.floor(6 + deep.R * 8);
  const particleSpeed = 0.5 + deep.R * 1.2;
  const pulseOmega = 0.0008 + deep.dpdt * 0.002;
  const moonScale = 0.85 + (deep.moonIllum / 100) * 0.2;
  const skyTint = SKY_TINTS[deep.sky] || SKY_TINTS.night;
  const skyAlpha = 0.03 * glowMultiplier;
  const kpBoost = 1 + (deep.kp / 9) * 0.8;
  const centerScale = 1 + deep.charge * 0.3;
  const outerNodes = Math.round(6 + deep.C * 3);
  const skip = Math.round(2 + deep.M * 2);
  const innerNodes = Math.round(2 + deep.P * 2);

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
  };
}

function buildLiveGlyph(now, touchCharge = 0) {
  const secondLocked = new Date(Math.floor(now.getTime() / 1000) * 1000);
  const isoSecond = secondLocked.toISOString().replace('.000Z', 'Z');
  const seed = `STARWELL|DEEP|FAER|${isoSecond}|${now.getTimezoneOffset()}`;
  const hash = hashString(seed);
  const second = now.getSeconds();
  const minute = now.getMinutes();
  const hour = now.getHours();
  const deep = buildDeepState(touchCharge);
  const math = buildMathFromState(deep);
  const rotation = (second * 6 * math.rotationMultiplier) % 360;
  const minuteRotation = (minute * 6 + math.bzDisturb * 18) % 360;
  const hourRotation = (((hour % 12) * 30) + minute / 2 + deep.M * 12) % 360;
  const drift = (hash % 360) + deep.E * 21;
  const ringSet = Array.from({ length: 3 + Math.round(deep.M * 2) }, (_, index) => (33 + index * 18) * math.moonScale);
  const mathNodes = buildMathNodes(math.outerNodes, 76, drift, math.moonScale);
  const innerNodes = buildMathNodes(math.innerNodes, 39, drift * -0.5, 1);
  const allNodes = [...mathNodes, ...innerNodes];
  const threads = buildMathThreads(mathNodes, math.skip);

  return {
    id: toGlyphId(hash),
    isoSecond,
    localTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    localDate: now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
    tide: TIDE_NAMES[hash % TIDE_NAMES.length],
    deep,
    math,
    rotation,
    minuteRotation,
    hourRotation,
    drift,
    rings: ringSet.length,
    spokes: math.outerNodes,
    path: buildGlyphPath(hash, math.outerNodes),
    marks: buildMarks(hash, math.particleCount, math.moonScale),
    ringSet,
    nodes: allNodes,
    threads,
    equations: [
      `w = w_base x ${math.rotationMultiplier.toFixed(2)} from P=${deep.P.toFixed(2)}`,
      `G = G_base x ${math.glowMultiplier.toFixed(2)} from A=${deep.A.toFixed(2)}; alpha=${math.alphaLine.toFixed(2)}`,
      `N=${math.particleCount}, v=${math.particleSpeed.toFixed(2)}, BzDisturb=${math.bzDisturb.toFixed(2)}`,
      `moon=${deep.moonIllum}% gives ring x${math.moonScale.toFixed(2)}; nodes=${math.outerNodes}, skip=${math.skip}, inner=${math.innerNodes}`,
      `charge=${deep.charge.toFixed(2)}, KpBoost=${math.kpBoost.toFixed(2)}, pulse=${math.pulseOmega.toFixed(4)}`,
    ],
  };
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
  const glyph = useMemo(() => buildLiveGlyph(now, touchCharge), [now, touchCharge]);

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

  return (
    <section className="live-glyph-panel deep-observer-panel chamber-card" aria-label="DEEP Observer live glyph viewer">
      <div className="map-heading compact">
        <span>DEEP Observer</span>
        <strong>Faer light maths</strong>
      </div>

      <div className="live-glyph-layout">
        <div
          className="glyph-orb-wrap"
          role="button"
          tabIndex={0}
          aria-label="Touch the DEEP glyph to add a local charge pulse"
          onPointerDown={activateTouch}
          onPointerUp={softenTouch}
          onPointerCancel={softenTouch}
          onKeyDown={handleKeyDown}
        >
          <svg className="glyph-orb" viewBox="0 0 220 220" role="img" aria-label="Live DEEP glyph computed from Faer's mapping spec">
            <defs>
              <radialGradient id="glyphGlow" cx="50%" cy="50%" r="55%">
                <stop offset="0%" stopColor="rgba(234,244,239,0.98)" />
                <stop offset="48%" stopColor="rgba(109,224,179,0.46)" />
                <stop offset="100%" stopColor="rgba(231,196,119,0.08)" />
              </radialGradient>
              <linearGradient id="faerStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(109,224,179,0.94)" />
                <stop offset="52%" stopColor="rgba(234,244,239,0.86)" />
                <stop offset="100%" stopColor="rgba(231,196,119,0.92)" />
              </linearGradient>
              <filter id="faerGlow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="2.4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <circle className="glyph-aura" cx="110" cy="110" r="96" />
            <circle
              className="glyph-core-glow"
              cx="110"
              cy="110"
              r={(28 * glyph.math.glowMultiplier).toFixed(2)}
              fill="url(#glyphGlow)"
            />

            {glyph.ringSet.map((radius) => (
              <circle className="glyph-ring-line" cx="110" cy="110" r={radius.toFixed(2)} key={radius.toFixed(2)} />
            ))}

            <g transform={`rotate(${glyph.drift} 110 110)`} style={{ opacity: glyph.math.alphaLine }}>
              {glyph.marks.map((mark) => (
                <line
                  className="glyph-mark"
                  key={mark.key}
                  x1={mark.inner.x}
                  y1={mark.inner.y}
                  x2={mark.outer.x}
                  y2={mark.outer.y}
                />
              ))}
            </g>

            <g className="glyph-math-thread-layer">
              {glyph.threads.map((thread) => (
                <line
                  className="glyph-math-thread"
                  key={thread.key}
                  x1={thread.start.x.toFixed(2)}
                  y1={thread.start.y.toFixed(2)}
                  x2={thread.end.x.toFixed(2)}
                  y2={thread.end.y.toFixed(2)}
                />
              ))}
            </g>

            <g transform={`rotate(${glyph.minuteRotation} 110 110)`}>
              <line className="glyph-minute-hand" x1="110" y1="110" x2="110" y2="42" />
            </g>

            <g transform={`rotate(${glyph.hourRotation} 110 110)`}>
              <line className="glyph-hour-hand" x1="110" y1="110" x2="110" y2="68" />
            </g>

            <path className="glyph-sigil-path" d={glyph.path} style={{ opacity: glyph.math.alphaLine }} />

            <g transform={`rotate(${glyph.rotation} 110 110)`}>
              <line className="glyph-second-hand" x1="110" y1="110" x2="110" y2="23" />
              <circle className="glyph-second-bead" cx="110" cy="23" r={(3.2 + glyph.deep.charge * 1.4).toFixed(2)} />
            </g>

            <g className="glyph-math-node-layer">
              {glyph.nodes.map((node) => (
                <circle
                  className="glyph-math-node"
                  key={node.key}
                  cx={node.x.toFixed(2)}
                  cy={node.y.toFixed(2)}
                  r={(2.2 + glyph.deep.M * 1.4).toFixed(2)}
                />
              ))}
            </g>

            <circle className="glyph-center" cx="110" cy="110" r={(5.5 * glyph.math.centerScale).toFixed(2)} />
          </svg>
        </div>

        <article className="glyph-readout">
          <p>Current DEEP glyph</p>
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
              <span>rotation and glow</span>
            </div>
            <div>
              <strong>C {glyph.deep.C.toFixed(2)} / R {glyph.deep.R.toFixed(2)}</strong>
              <span>line clarity and motion</span>
            </div>
            <div>
              <strong>E {glyph.deep.E.toFixed(2)} / Bz {glyph.deep.bz}</strong>
              <span>disturbance field</span>
            </div>
            <div>
              <strong>M {glyph.deep.M.toFixed(2)} / {glyph.deep.moonIllum}%</strong>
              <span>lunar emphasis</span>
            </div>
            <div>
              <strong>charge {glyph.deep.charge.toFixed(2)}</strong>
              <span>center glow and touch</span>
            </div>
          </div>

          <p className="glyph-principle">
            Instrument only. The glyph follows Faer's thirteen DEEP-to-glyph mappings as a live mirror of the moment: presence, coherence, resonance, entropy, moon, attention, pulse, sky, aurora, disturbance, charge, and touch. It observes without deciding fate for the room.
          </p>
        </article>
      </div>
    </section>
  );
}
