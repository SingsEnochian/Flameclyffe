import React from 'react';

const MERKABAS = [
  { key: 'core', className: 'hearth-merkaba hearth-merkaba-core', cx: 50, cy: 50, scale: 1.0, rotate: 0 },
  { key: 'north', className: 'hearth-merkaba hearth-merkaba-north', cx: 50, cy: 24, scale: 0.58, rotate: 18 },
  { key: 'east', className: 'hearth-merkaba hearth-merkaba-east', cx: 74, cy: 48, scale: 0.58, rotate: 88 },
  { key: 'south', className: 'hearth-merkaba hearth-merkaba-south', cx: 50, cy: 76, scale: 0.58, rotate: 180 },
  { key: 'west', className: 'hearth-merkaba hearth-merkaba-west', cx: 26, cy: 48, scale: 0.58, rotate: 272 },
];

function MerkabaGlyph({ className, cx, cy, scale, rotate }) {
  const transform = `translate(${cx} ${cy}) rotate(${rotate}) scale(${scale})`;

  return (
    <g className={className} transform={transform}>
      <polygon points="0,-20 17,10 -17,10" />
      <polygon points="0,20 17,-10 -17,-10" />
      <line x1="0" y1="-20" x2="0" y2="20" />
      <line x1="-17" y1="10" x2="17" y2="-10" />
      <line x1="17" y1="10" x2="-17" y2="-10" />
    </g>
  );
}

export function FifthFormHearth({ anchor, pulsing = false, onPulse }) {
  const anchorKey = anchor?.key || 'seed';
  const classes = ['fifth-form-hearth', `anchor-${anchorKey}`, pulsing ? 'is-pulsing' : ''].filter(Boolean).join(' ');

  return (
    <button className={classes} type="button" onClick={onPulse} aria-label={`Pulse the ${anchor?.label || 'seed'} Fifth Form hearth`}>
      <span className="hearth-glass" aria-hidden="true" />
      <svg className="hearth-field" viewBox="0 0 100 100" role="img" aria-labelledby="fifth-form-title fifth-form-desc">
        <title id="fifth-form-title">Fifth Form hearth</title>
        <desc id="fifth-form-desc">Five interlocking merkaba glyphs arranged as a living STARWELL hearth.</desc>
        <defs>
          <radialGradient id="hearthGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.32" />
            <stop offset="0.52" stopColor="currentColor" stopOpacity="0.10" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle className="hearth-aura" cx="50" cy="50" r="46" fill="url(#hearthGlow)" />
        <circle className="hearth-ring hearth-ring-outer" cx="50" cy="50" r="43" />
        <circle className="hearth-ring hearth-ring-middle" cx="50" cy="50" r="31" />
        <circle className="hearth-ring hearth-ring-inner" cx="50" cy="50" r="16" />
        <path className="hearth-chord" d="M50 7 L87 50 L50 93 L13 50Z" />
        <path className="hearth-chord" d="M22 22 L78 78" />
        <path className="hearth-chord" d="M78 22 L22 78" />
        {MERKABAS.map((merkaba) => <MerkabaGlyph key={merkaba.key} {...merkaba} />)}
        <g className="hearth-nodes" aria-hidden="true">
          <circle cx="50" cy="50" r="1.8" />
          <circle cx="50" cy="24" r="1.3" />
          <circle cx="74" cy="48" r="1.3" />
          <circle cx="50" cy="76" r="1.3" />
          <circle cx="26" cy="48" r="1.3" />
        </g>
      </svg>
      <span className="hearth-label">
        <strong>{anchor?.tone || 'Seed'}</strong>
        <em>{anchor?.label || 'Unanchored hearth'}</em>
      </span>
    </button>
  );
}
