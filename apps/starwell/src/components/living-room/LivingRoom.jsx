import React, { useMemo, useState } from 'react';
import { FifthFormHearth } from './FifthFormHearth.jsx';
import { livingRoomAnchors, livingRoomCopy, livingRoomThresholds } from '../../configs/livingRoom.js';

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

function GlyphPanel({ selected, selectedType, anchor }) {
  return (
    <aside className="living-glyph-panel" aria-label="Living Room glyph panel">
      <p className="living-panel-eyebrow">Glyph Panel</p>
      <h2>{selected.title}</h2>
      <span className="living-panel-type">{selectedType}</span>
      <p>{selected.text}</p>
      <div className="living-signal-stack" aria-label="Current field signals">
        <span><strong>Anchor</strong><em>{anchor?.label || 'Seed mode'}</em></span>
        <span><strong>Tone</strong><em>{anchor?.tone || 'Unlit'}</em></span>
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

export function LivingRoom({ rooms, studies, selected, selectedType, onSelect, phase, time, children }) {
  const [activeAnchor, setActiveAnchor] = useState(livingRoomAnchors[0]);
  const [pulseCount, setPulseCount] = useState(0);
  const [lowMotion, setLowMotion] = useState(false);

  const chamberDoors = useMemo(() => [...rooms.slice(0, 6), ...studies], [rooms, studies]);
  const pulseActive = pulseCount % 2 === 1;
  const classes = [
    'living-room',
    `living-anchor-${activeAnchor.key}`,
    `living-selected-${selected.key}`,
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
          <nav className="living-door-ring" aria-label="Chamber doors">
            {chamberDoors.map((room) => (
              <LivingDoor key={room.key} room={room} active={selected.key === room.key} onSelect={onSelect} />
            ))}
          </nav>

          <section className="living-hearth" aria-label="Fifth Form hearth">
            <FifthFormHearth anchor={activeAnchor} pulsing={pulseActive} onPulse={() => setPulseCount((count) => count + 1)} />
            <div className="living-anchor-strip" aria-label="Anchor choices">
              {livingRoomAnchors.map((anchor) => (
                <button
                  className={`living-anchor-button ${activeAnchor.key === anchor.key ? 'active' : ''}`}
                  key={anchor.key}
                  type="button"
                  onClick={() => setActiveAnchor(anchor)}
                >
                  <span aria-hidden="true">{anchor.glyph}</span>
                  <strong>{anchor.label}</strong>
                </button>
              ))}
            </div>
            <p className="living-anchor-note" aria-live="polite">{activeAnchor.note}</p>
          </section>

          <GlyphPanel selected={selected} selectedType={selectedType} anchor={activeAnchor} />
        </section>

        <section className="living-active-chamber" aria-label="Selected chamber">
          {children}
        </section>

        <ThresholdBar phase={phase} time={time} anchor={activeAnchor} lowMotion={lowMotion} onToggleMotion={() => setLowMotion((value) => !value)} />
      </section>
    </main>
  );
}
