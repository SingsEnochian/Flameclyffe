import React from 'react';
import { SCIENCE_CONSTANTS, planckScaleSummary } from '../lib/scienceConstants.js';
import { calculateSheetConvergence, normaliseLocationState } from '../lib/sheetConvergence.js';
import '../starwell-sigil.css';
import '../starwell-instrumentation-panel.css';
import '../starwell-sigil-repair.css';

const baselineConstants = [SCIENCE_CONSTANTS.h, SCIENCE_CONSTANTS.c, SCIENCE_CONSTANTS.kB, SCIENCE_CONSTANTS.G];
const baselineEquations = ['E = h × f', 'λ × f = c', 'Eₜ = k_B × T'];
const observerSecurityTables = [
  'public.deep_observer_events',
  'public.deep_observer_event_relations',
  'public.deep_observer_event_links',
  'public.observer_handoff_queue',
];
const observatoryReferenceLocation = Object.freeze({
  name: 'St. Augustine · KSGJ reference',
  latitude: 29.95917,
  longitude: -81.33972,
  altitudeM: 3,
});

function getNodeAngle(index, total) {
  return `${(index * 360) / total - 90}deg`;
}

function formatConstantValue(constant) {
  const value = constant.value >= 1 ? constant.value.toLocaleString('en-US') : constant.value.toExponential(6);
  return `${value} ${constant.unit}`;
}

function formatNumber(value, digits = 4) {
  if (!Number.isFinite(value)) return 'unavailable';
  return value.toFixed(digits);
}

function SigilMedallion({ room, className = '' }) {
  const classes = `sigil-medallion ${room.glyph ? 'has-glyph' : ''} ${className}`.trim();

  if (room.image) {
    return (
      <span className={classes} aria-hidden="true">
        <img src={room.image} alt="" />
        {room.glyph && <span className="sigil-medallion-glyph">{room.glyph}</span>}
      </span>
    );
  }

  return (
    <span className={classes} aria-hidden="true">
      <span className="sigil-medallion-fallback">{room.glyph}</span>
    </span>
  );
}

function SheetConvergenceModuleHost() {
  const timestamp = new Date();
  const state = normaliseLocationState({ ...observatoryReferenceLocation, timestamp });
  const result = calculateSheetConvergence(state);

  const readings = [
    ['Normalised state', state.map((value) => formatNumber(value)).join(', ')],
    ['Mapped coordinate', result.mapped.map((value) => formatNumber(value)).join(', ')],
    ['Jacobian determinant', formatNumber(result.determinant, 2)],
    ['Local volume scale', formatNumber(result.volumeScale, 2)],
    ['Minimum singular value', formatNumber(result.minimumSingularValue)],
    ['Condition number', formatNumber(result.conditionNumber)],
    ['Fold susceptibility', formatNumber(result.susceptibility)],
    ['Sheet convergence score', formatNumber(result.convergenceScore)],
    ['Target residual', formatNumber(result.targetResidual)],
  ];

  return (
    <section
      className="terra-data-safety sheet-convergence-panel"
      aria-label="Local sheet convergence and fold susceptibility"
      data-module-id="sheet-convergence"
      data-module-version="0.1.0"
    >
      <span>Installable module · mathematical derivation</span>
      <strong>Local Sheet-Convergence and Fold Susceptibility</strong>
      <p>
        Location input: {observatoryReferenceLocation.name} · {observatoryReferenceLocation.latitude.toFixed(5)}°, {observatoryReferenceLocation.longitude.toFixed(5)}° · {timestamp.toISOString()}
      </p>
      <ul>
        {readings.map(([label, value]) => (
          <li key={label}><strong>{label}</strong>: {value}</li>
        ))}
      </ul>
      <p>
        Local fold probability: <strong>0</strong> for this map. Singularity: <strong>false</strong>. Orientation: <strong>{result.orientation}</strong>.
      </p>
      <p>
        Physical fold probability: <strong>unavailable until a named physical model and empirical calibration exist.</strong>
      </p>
    </section>
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

      <SheetConvergenceModuleHost />

      <div className="terra-data-safety" aria-label="Observer data safety notice">
        <span>Observer Data Safety</span>
        <strong>RLS enabled · policies still matter</strong>
        <p>
          Supabase currently reports these Observer and DEEP tables with row-level security enabled. Keep policy reviews active before widening public client reads or writes.
        </p>
        <ul>
          {observerSecurityTables.map((tableName) => (
            <li key={tableName}>{tableName}</li>
          ))}
        </ul>
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
