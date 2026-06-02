import React from 'react';
import { SCIENCE_CONSTANTS, planckScaleSummary } from '../lib/scienceConstants.js';
import '../starwell-sigil.css';
import '../starwell-instrumentation-panel.css';

const baselineConstants = [SCIENCE_CONSTANTS.h, SCIENCE_CONSTANTS.c, SCIENCE_CONSTANTS.kB, SCIENCE_CONSTANTS.G];
const baselineEquations = ['E = h × f', 'λ × f = c', 'Eₜ = k_B × T'];

function getNodeAngle(index, total) {
  return `${(index * 360) / total - 90}deg`;
}

function formatConstantValue(constant) {
  const value = constant.value >= 1 ? constant.value.toLocaleString('en-US') : constant.value.toExponential(6);
  return `${value} ${constant.unit}`;
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

function TerraAeternaInstrumentPanel({ selected }) {
  const planck = planckScaleSummary();

  return (
    <aside className="terra-instrument-panel" aria-label="Terra Aeterna instrumentation baseline">
      <div className="terra-instrument-heading">
        <span>Terra Aeterna Instrumentation</span>
        <strong>Established science baseline</strong>
      </div>

      <div className="terra-instrument-equations" aria-label="Core equations">
        {baselineEquations.map((equation) => (
          <code key={equation}>{equation}</code>
        ))}
      </div>

      <div className="terra-instrument-grid" aria-label="Core constants">
        {baselineConstants.map((constant) => (
          <article className="terra-instrument-chip" key={constant.slug}>
            <span>{constant.symbol}</span>
            <strong>{constant.name}</strong>
            <em>{formatConstantValue(constant)}</em>
            <small>{constant.exact ? 'exact SI constant' : 'measured constant'}</small>
          </article>
        ))}
      </div>

      <div className="terra-planck-ribbon" aria-label="Planck scale summary">
        <span>Planck scale marker</span>
        <strong>ℓ_P {planck.planckLengthM} m · t_P {planck.planckTimeS} s</strong>
        <p>{planck.caution}</p>
      </div>

      <p className="terra-instrument-note">
        Selected chamber: <strong>{selected.title}</strong>. These values calibrate STARWELL sliders, labels, and readouts; speculative or mythic overlays must stay visibly labelled.
      </p>
    </aside>
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

        <TerraAeternaInstrumentPanel selected={selected} />
        <p className="sigil-instruction">Touch a chamber glyph. The map answers softly.</p>
      </div>
    </section>
  );
}
