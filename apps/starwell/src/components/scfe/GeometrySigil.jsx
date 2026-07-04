import React from 'react';

const NODE_POSITIONS = {
  jupiter: { x: 50, y: 10 },
  saturn: { x: 77, y: 28 },
  uranus: { x: 69, y: 70 },
  neptune: { x: 31, y: 70 },
  pluto: { x: 23, y: 28 },
};

const ASPECT_CLASSES = {
  conjunction: 'seed',
  opposition: 'axis',
  trine: 'flow',
  sextile: 'gate',
  square: 'pressure',
  quincunx: 'hinge',
};

export function GeometrySigil({ snapshot }) {
  const aspects = snapshot?.barbault?.aspects || [];
  const configurations = snapshot?.barbault?.configurations || [];
  const hasVessel = configurations.some((configuration) => configuration.configuration_type === 'basket_cradle_candidate');

  return (
    <figure className={`geometry-sigil ${hasVessel ? 'geometry-sigil-vessel' : ''}`} aria-label="Sacred geometry aspect sigil">
      <svg viewBox="0 0 100 100" role="img" aria-labelledby="geometry-sigil-title geometry-sigil-desc">
        <title id="geometry-sigil-title">SCFE sacred geometry sigil</title>
        <desc id="geometry-sigil-desc">
          A symbolic read-only visualization of the currently detected slow-planet aspect geometry.
        </desc>

        <circle className="sigil-ring outer" cx="50" cy="50" r="41" />
        <circle className="sigil-ring inner" cx="50" cy="50" r="27" />

        {hasVessel && <path className="sigil-vessel" d="M22 34 C28 82, 72 82, 78 34" />}

        {aspects.map((aspect) => {
          const start = NODE_POSITIONS[aspect.body_a];
          const end = NODE_POSITIONS[aspect.body_b];
          if (!start || !end) return null;
          return (
            <line
              key={`${aspect.body_a}-${aspect.body_b}-${aspect.aspect_type}`}
              className={`sigil-aspect ${ASPECT_CLASSES[aspect.aspect_type] || 'unknown'}`}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
            />
          );
        })}

        {Object.entries(NODE_POSITIONS).map(([body, point]) => (
          <g key={body} className="sigil-node">
            <circle cx={point.x} cy={point.y} r="3.3" />
            <text x={point.x} y={point.y - 5.6}>{body.slice(0, 2).toUpperCase()}</text>
          </g>
        ))}
      </svg>
      <figcaption>
        <strong>{snapshot?.sacred_geometry?.primary_form || 'field_seed'}</strong>
        <span>Visual guide only. The JSON remains the source of truth.</span>
      </figcaption>
    </figure>
  );
}
