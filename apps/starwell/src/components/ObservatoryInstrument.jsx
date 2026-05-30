import React from 'react';
import '../starwell-sigil.css';

function getNodeAngle(index, total) {
  return `${(index * 360) / total - 90}deg`;
}

function SigilMedallion({ room, className = '' }) {
  const classes = `sigil-medallion ${className}`.trim();

  if (room.image) {
    return (
      <span className={classes} aria-hidden="true">
        <img src={room.image} alt="" />
      </span>
    );
  }

  return (
    <span className={classes} aria-hidden="true">
      <span className="sigil-medallion-fallback">{room.glyph}</span>
    </span>
  );
}

export function ObservatoryInstrument({ rooms, selected, onSelect, selectedType }) {
  return (
    <section className="observatory-map sigil-map" aria-label="Central Observatory instruments">
      <div className="map-heading">
        <span>Central Observatory</span>
        <strong>{selectedType}</strong>
      </div>

      <div className="starwell-sigil-console">
        <div className="sigil-field" aria-label="STARWELL chamber sigil navigation">
          <div className="sigil-ring sigil-ring-one" aria-hidden="true" />
          <div className="sigil-ring sigil-ring-two" aria-hidden="true" />
          <div className="sigil-ring sigil-ring-three" aria-hidden="true" />
          <div className="sigil-axis sigil-axis-vertical" aria-hidden="true" />
          <div className="sigil-axis sigil-axis-horizontal" aria-hidden="true" />

          <div className="sigil-node-layer">
            {rooms.map((room, index) => {
              const active = selected.key === room.key;
              return (
                <button
                  className={`sigil-node ${active ? 'active' : ''}`}
                  key={room.key}
                  onClick={() => onSelect(room)}
                  style={{ '--angle': getNodeAngle(index, rooms.length), '--node-index': index }}
                  type="button"
                  aria-pressed={active}
                >
                  <SigilMedallion room={room} />
                  <strong>{room.title}</strong>
                </button>
              );
            })}
          </div>

          <article className="sigil-core" aria-live="polite">
            <SigilMedallion room={selected} className="sigil-core-medallion" />
            <p>{selectedType}</p>
            <h2>{selected.title}</h2>
            <span>{selected.text}</span>
          </article>
        </div>

        <p className="sigil-instruction">Touch a chamber glyph. The map answers softly.</p>
      </div>
    </section>
  );
}
