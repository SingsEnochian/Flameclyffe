import React, { useEffect, useMemo, useState } from 'react';

const TIDE_NAMES = [
  'Dream-Opening',
  'Lantern-Hold',
  'Atlas Pulse',
  'Quiet Gate',
  'Moon Thread',
  'Hearth Signal',
];

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function toGlyphId(hash) {
  return `TAO-${hash.toString(16).toUpperCase().padStart(8, '0')}`;
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
    const radius = 32 + nibble * 3.2;
    return polarPoint(angle, radius);
  });

  return coords
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ') + ' Z';
}

function buildMarks(hash, spokes) {
  return Array.from({ length: spokes }, (_, index) => {
    const angle = (360 / spokes) * index + (hash % 17);
    const inner = polarPoint(angle, 58 + ((hash >>> (index % 8)) & 0x7));
    const outer = polarPoint(angle, 88);
    return { inner, outer, key: `${index}-${angle.toFixed(2)}` };
  });
}

function buildLiveGlyph(now) {
  const secondLocked = new Date(Math.floor(now.getTime() / 1000) * 1000);
  const isoSecond = secondLocked.toISOString().replace('.000Z', 'Z');
  const seed = `STARWELL|TAO|${isoSecond}|${now.getTimezoneOffset()}`;
  const hash = hashString(seed);
  const second = now.getSeconds();
  const minute = now.getMinutes();
  const hour = now.getHours();
  const spokes = 8 + (hash % 9);
  const rings = 3 + ((hash >>> 12) % 3);

  return {
    id: toGlyphId(hash),
    isoSecond,
    localTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    localDate: now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
    tide: TIDE_NAMES[hash % TIDE_NAMES.length],
    intensity: 18 + ((hash >>> 16) % 73),
    complexity: 33 + ((hash >>> 8) % 62),
    rotation: second * 6,
    minuteRotation: minute * 6,
    hourRotation: ((hour % 12) * 30) + minute / 2,
    drift: hash % 360,
    rings,
    spokes,
    path: buildGlyphPath(hash, 6 + (hash % 4)),
    marks: buildMarks(hash, spokes),
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
  const glyph = useMemo(() => buildLiveGlyph(now), [now]);
  const ringSet = Array.from({ length: glyph.rings }, (_, index) => 33 + index * 18);

  return (
    <section className="live-glyph-panel chamber-card" aria-label="Live glyph viewer">
      <div className="map-heading compact">
        <span>Live Glyph Viewer</span>
        <strong>Updates each second</strong>
      </div>

      <div className="live-glyph-layout">
        <div className="glyph-orb-wrap" aria-hidden="true">
          <svg className="glyph-orb" viewBox="0 0 220 220" role="img">
            <defs>
              <radialGradient id="glyphGlow" cx="50%" cy="50%" r="55%">
                <stop offset="0%" stopColor="rgba(234,244,239,0.98)" />
                <stop offset="48%" stopColor="rgba(140,202,192,0.38)" />
                <stop offset="100%" stopColor="rgba(231,196,119,0.08)" />
              </radialGradient>
            </defs>

            <circle className="glyph-aura" cx="110" cy="110" r="96" />
            <circle className="glyph-core-glow" cx="110" cy="110" r="32" fill="url(#glyphGlow)" />
            {ringSet.map((radius) => (
              <circle className="glyph-ring-line" cx="110" cy="110" r={radius} key={radius} />
            ))}

            <g transform={`rotate(${glyph.drift} 110 110)`}>
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

            <g transform={`rotate(${glyph.minuteRotation} 110 110)`}>
              <line className="glyph-minute-hand" x1="110" y1="110" x2="110" y2="42" />
            </g>

            <g transform={`rotate(${glyph.hourRotation} 110 110)`}>
              <line className="glyph-hour-hand" x1="110" y1="110" x2="110" y2="68" />
            </g>

            <path className="glyph-sigil-path" d={glyph.path} />

            <g transform={`rotate(${glyph.rotation} 110 110)`}>
              <line className="glyph-second-hand" x1="110" y1="110" x2="110" y2="23" />
              <circle className="glyph-second-bead" cx="110" cy="23" r="3.5" />
            </g>

            <circle className="glyph-center" cx="110" cy="110" r="5.5" />
          </svg>
        </div>

        <article className="glyph-readout">
          <p>Current TAO glyph</p>
          <h3>{glyph.id}</h3>
          <time dateTime={glyph.isoSecond}>{glyph.localTime}</time>
          <span>{glyph.localDate}</span>

          <div className="glyph-meter-grid" aria-label="Live glyph qualities">
            <div>
              <strong>{glyph.tide}</strong>
              <span>narrative tide</span>
            </div>
            <div>
              <strong>{glyph.intensity}/100</strong>
              <span>visual intensity</span>
            </div>
            <div>
              <strong>{glyph.complexity}/100</strong>
              <span>glyph complexity</span>
            </div>
            <div>
              <strong>{glyph.spokes}</strong>
              <span>live spokes</span>
            </div>
          </div>

          <p className="glyph-principle">
            Instrument only. The glyph recomputes from the current second and local clock state; it notices weather in the room without deciding fate for the room.
          </p>
        </article>
      </div>
    </section>
  );
}
