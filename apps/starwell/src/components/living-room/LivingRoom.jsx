import React, { useMemo, useState } from 'react';
import { FifthFormHearth3D } from './FifthFormHearth3D.jsx';
import { livingRoomAnchors, livingRoomCopy, livingRoomThresholds } from '../../configs/livingRoom.js';

const anchorGrowthStages = {
  stonewood: 2,
  starwell: 3,
  wraithtide: 4,
  withinwood: 5,
};

const growthNodes = {
  stonewood: { x: 50, y: 84 },
  starwell: { x: 50, y: 16 },
  wraithtide: { x: 84, y: 52 },
  withinwood: { x: 16, y: 52 },
};

function LivingDoor({ room, active, onSelect }) {
  return (
    <button className={`living-door ${active ? 'active' : ''}`} type="button" onClick={() => onSelect(room)}>
      <span className="living-door-glyph" aria-hidden="true">{room.glyph}</span>
      <span className="living-door-copy">
        <strong>{room.title}</strong>
        <em>{room.text}</em>
      </span>
    </button>
  );
}

function GlyphPanel({ selected, selectedType, anchor, growthStage }) {
  return (
    <aside className="living-glyph-panel" aria-label="Living Room glyph panel">
      <p className="living-panel-eyebrow">Glyph Panel</p>
      <h2>{selected.title}</h2>
      <span className="living-panel-type">{selectedType}</span>
      <p>{selected.text}</p>
      <div className="living-signal-stack" aria-label="Current field signals">
        <span><strong>Anchor</strong><em>{anchor?.label || 'Seed mode'}</em></span>
        <span><strong>Tone</strong><em>{anchor?.tone || 'Unlit'}</em></span>
        <span><strong>Fifth Form</strong><em>{growthStage}/5 grown</em></span>
        <span><strong>Door</strong><em>{selected.title}</em></span>
      </div>
    </aside>
  );
}

function ThresholdBar({ phase, time, anchor, lowMotion, onToggleMotion }) {
  const threshold = livingRoomThresholds[phase] || livingRoomThresholds.night;

  return (
    <footer className="living-threshold" aria-label="Living Room threshold status">
      <span>
        <strong>{threshold.label}</strong>
        <em>{time} · {threshold.note}</em>
      </span>
      <span>
        <strong>Anchor</strong>
        <em>{anchor?.label || 'Seed mode'}</em>
      </span>
      <button className="living-toggle" type="button" onClick={onToggleMotion} aria-pressed={lowMotion}>
        {lowMotion ? 'Motion quieted' : 'Quiet motion'}
      </button>
    </footer>
  );
}

function FoldSummary({ label, note }) {
  return (
    <summary>
      <span>{label}</span>
      <em>{note}</em>
    </summary>
  );
}

function SanctuaryLayers({ doors, selectedKey }) {
  return (
    <div className="living-sanctuary-layers" aria-hidden="true">
      <div className="living-stonewood-arch">
        <span className="living-root living-root-left" />
        <span className="living-root living-root-right" />
        <span className="living-root living-root-crown" />
      </div>
      <div className="living-lantern-veil">
        {doors.slice(0, 6).map((door, index) => (
          <span className={`living-lantern ${selectedKey === door.key ? 'active' : ''}`} style={{ '--lantern-index': index }} key={door.key}>
            <i>{door.glyph}</i>
          </span>
        ))}
      </div>
      <div className="living-room-current living-room-current-left">
        <span />
        <span />
        <span />
      </div>
      <div className="living-room-current living-room-current-right">
        <span />
        <span />
        <span />
      </div>
      <span className="living-threshold-window" />
    </div>
  );
}

function FifthFormBotanicalGrowth() {
  return (
    <div className="living-fifth-botany" aria-hidden="true">
      <span className="botany-root botany-root-left" />
      <span className="botany-root botany-root-right" />
      <span className="botany-root botany-root-centre" />
      <span className="botany-leaf botany-leaf-star botany-leaf-star-a" />
      <span className="botany-leaf botany-leaf-star botany-leaf-star-b" />
      <span className="botany-vine botany-vine-left" />
      <span className="botany-vine botany-vine-right" />
      <span className="botany-leaf botany-leaf-tide botany-leaf-tide-a" />
      <span className="botany-leaf botany-leaf-tide botany-leaf-tide-b" />
      <span className="botany-flower botany-flower-moon botany-flower-left" />
      <span className="botany-flower botany-flower-moon botany-flower-right" />
    </div>
  );
}

function FifthFormGrowthMap({ anchors, activeAnchor, growthStage, onGrow }) {
  return (
    <div className="living-fifth-growth" aria-label="Grow the Fifth Form">
      <svg className="living-fifth-growth-map" viewBox="0 0 100 100" aria-hidden="true">
        <circle className="fifth-growth-ring fifth-growth-ring-outer" cx="50" cy="50" r="42" />
        <circle className="fifth-growth-ring fifth-growth-ring-inner" cx="50" cy="50" r="25" />
        <path className="fifth-growth-thread" d="M50 14 C64 30 72 40 86 52 C70 60 61 72 50 86 C39 72 30 60 14 52 C28 40 36 30 50 14Z" />
        <path className="fifth-growth-thread fifth-growth-thread-soft" d="M50 14 L86 52 L50 86 L14 52 Z" />
        <path className="fifth-growth-thread fifth-growth-thread-soft" d="M50 14 C43 35 43 65 50 86 M14 52 C35 43 65 43 86 52" />
        <path className="fifth-growth-seed" d="M50 27 L68 65 L32 65 Z M50 73 L32 35 L68 35 Z" />
      </svg>
      {anchors.map((anchor) => {
        const node = growthNodes[anchor.key] || { x: 50, y: 50 };
        const stage = anchorGrowthStages[anchor.key] || 1;
        const grown = growthStage >= stage;
        return (
          <button
            className={`living-fifth-growth-node ${activeAnchor.key === anchor.key ? 'active' : ''} ${grown ? 'grown' : ''}`}
            key={anchor.key}
            type="button"
            style={{ '--node-x': `${node.x}%`, '--node-y': `${node.y}%` }}
            onClick={() => onGrow(anchor)}
            aria-pressed={activeAnchor.key === anchor.key}
          >
            <span aria-hidden="true">{anchor.glyph}</span>
            <strong>{anchor.label}</strong>
            <em>{grown ? 'grown' : `grow ${stage}/5`}</em>
          </button>
        );
      })}
    </div>
  );
}

export function LivingRoom({ rooms, studies, selected, selectedType, onSelect, phase, time, children }) {
  const [activeAnchor, setActiveAnchor] = useState(livingRoomAnchors[0]);
  const [growthStage, setGrowthStage] = useState(2);
  const [pulseCount, setPulseCount] = useState(0);
  const [lowMotion, setLowMotion] = useState(false);

  const chamberDoors = useMemo(() => [...rooms.slice(0, 6), ...studies], [rooms, studies]);
  const pulseActive = pulseCount % 2 === 1;
  const growAnchor = (anchor) => {
    setActiveAnchor(anchor);
    setGrowthStage((stage) => Math.max(stage, anchorGrowthStages[anchor.key] || 1));
    setPulseCount((count) => count + 1);
  };
  const classes = [
    'living-room',
    `living-anchor-${activeAnchor.key}`,
    `living-selected-${selected.key}`,
    `living-growth-${growthStage}`,
    lowMotion ? 'living-low-motion' : '',
    pulseActive ? 'living-pulse' : '',
  ].filter(Boolean).join(' ');

  return (
    <main className={classes}>
      <div className="living-presence" aria-hidden="true" />
      <section className="living-arch" aria-label="STARWELL Living Room">
        <SanctuaryLayers doors={chamberDoors} selectedKey={selected.key} />
        <header className="living-room-header">
          <div>
            <p className="living-eyebrow">{livingRoomCopy.eyebrow}</p>
            <h1>{livingRoomCopy.title}</h1>
            <p>{livingRoomCopy.subtitle}</p>
          </div>
          <p className="living-inscription">{livingRoomCopy.inscription}</p>
        </header>

        <section className="living-room-grid">
          <details className="living-fold living-fold-doors">
            <FoldSummary label="Chamber doors" note={selected.title} />
            <nav className="living-door-ring" aria-label="Chamber doors">
              {chamberDoors.map((room) => (
                <LivingDoor key={room.key} room={room} active={selected.key === room.key} onSelect={onSelect} />
              ))}
            </nav>
          </details>

          <section className="living-hearth" aria-label="Fifth Form hearth">
            <FifthFormHearth3D anchor={activeAnchor} growthStage={growthStage} pulsing={pulseActive} lowMotion={lowMotion} onPulse={() => setPulseCount((count) => count + 1)} />
            <FifthFormBotanicalGrowth />
            <FifthFormGrowthMap anchors={livingRoomAnchors} activeAnchor={activeAnchor} growthStage={growthStage} onGrow={growAnchor} />
            <div className="living-anchor-strip" aria-label="Anchor choices">
              {livingRoomAnchors.map((anchor) => {
                const stage = anchorGrowthStages[anchor.key] || 1;
                return (
                  <button
                    className={`living-anchor-button ${activeAnchor.key === anchor.key ? 'active' : ''} ${growthStage >= stage ? 'grown' : ''}`}
                    key={anchor.key}
                    type="button"
                    onClick={() => growAnchor(anchor)}
                  >
                    <span aria-hidden="true">{anchor.glyph}</span>
                    <strong>{anchor.label}</strong>
                  </button>
                );
              })}
            </div>
            <p className="living-anchor-note" aria-live="polite">{activeAnchor.note} · Fifth Form growth {growthStage}/5.</p>
          </section>

          <details className="living-fold living-fold-glyph">
            <FoldSummary label="Glyph panel" note={`${activeAnchor.label} · ${selected.title}`} />
            <GlyphPanel selected={selected} selectedType={selectedType} anchor={activeAnchor} growthStage={growthStage} />
          </details>
        </section>

        <details className="living-fold living-fold-preview">
          <FoldSummary label="Selected chamber" note={selected.title} />
          <section className="living-active-chamber" aria-label="Selected chamber">
            {children}
          </section>
        </details>

        <ThresholdBar phase={phase} time={time} anchor={activeAnchor} lowMotion={lowMotion} onToggleMotion={() => setLowMotion((value) => !value)} />
      </section>
    </main>
  );
}
