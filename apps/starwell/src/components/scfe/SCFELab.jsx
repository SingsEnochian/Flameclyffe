import React, { useMemo, useState } from 'react';
import { DEFAULT_SCFE_INPUT, createFieldSnapshot, exportSnapshot } from '../../scfe/orchestrator.js';
import './scfe-lab.css';

const BARBAULT_BODIES = ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
const LEVELS = ['low', 'moderate', 'high'];

function createInitialForm() {
  return {
    target_timestamp: DEFAULT_SCFE_INPUT.target_timestamp,
    mode: DEFAULT_SCFE_INPUT.mode,
    question: DEFAULT_SCFE_INPUT.context.question,
    longitudes: { ...DEFAULT_SCFE_INPUT.longitudes },
    somatic: { ...DEFAULT_SCFE_INPUT.somatic },
  };
}

function buildInput(form) {
  return {
    ...DEFAULT_SCFE_INPUT,
    target_timestamp: form.target_timestamp,
    mode: form.mode,
    context: {
      ...DEFAULT_SCFE_INPUT.context,
      question: form.question,
    },
    longitudes: Object.fromEntries(
      Object.entries(form.longitudes).map(([body, value]) => [body, Number(value)])
    ),
    somatic: form.somatic,
  };
}

export function SCFELab() {
  const [form, setForm] = useState(createInitialForm);
  const [copyState, setCopyState] = useState('ready');

  const result = useMemo(() => {
    try {
      const snapshot = createFieldSnapshot(buildInput(form));
      return { snapshot, json: exportSnapshot(snapshot), error: null };
    } catch (error) {
      return { snapshot: null, json: '', error };
    }
  }, [form]);

  function updateLongitude(body, value) {
    setForm((current) => ({
      ...current,
      longitudes: { ...current.longitudes, [body]: value },
    }));
  }

  function updateSomatic(key, value) {
    setForm((current) => ({
      ...current,
      somatic: { ...current.somatic, [key]: value },
    }));
  }

  async function copySnapshot() {
    if (!result.json || !navigator.clipboard) return;
    await navigator.clipboard.writeText(result.json);
    setCopyState('copied');
    window.setTimeout(() => setCopyState('ready'), 1600);
  }

  function exportJsonFile() {
    if (!result.json) return;
    const blob = new Blob([result.json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scfe-field-snapshot-${result.snapshot.snapshot_id}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const snapshot = result.snapshot;

  return (
    <section className="scfe-lab chamber-card" aria-label="Starwell Concurrent Field Engine read-only lab">
      <div className="map-heading compact scfe-heading">
        <span>Concurrent Field Engine</span>
        <strong>v0.1 read-only lab</strong>
      </div>

      <p className="scfe-lab-note">
        One moment enters; Barbault maths, sacred geometry, DEEP, somatics, Hearthfire frequency guidance, Terra Aeterna, and agency read it together. No Supabase writes. No medical claims. No prophecy soup.
      </p>

      <div className="scfe-layout">
        <form className="scfe-panel scfe-inputs" onSubmit={(event) => event.preventDefault()}>
          <h3>Input moment</h3>
          <label>
            Target timestamp
            <input
              type="text"
              value={form.target_timestamp}
              onChange={(event) => setForm((current) => ({ ...current, target_timestamp: event.target.value }))}
            />
          </label>
          <label>
            Question / intention
            <input
              type="text"
              value={form.question || ''}
              onChange={(event) => setForm((current) => ({ ...current, question: event.target.value }))}
            />
          </label>

          <fieldset>
            <legend>Manual slow-planet longitudes</legend>
            {BARBAULT_BODIES.map((body) => (
              <label key={body}>
                {body}
                <input
                  type="number"
                  min="0"
                  max="359.999"
                  step="0.001"
                  value={form.longitudes[body]}
                  onChange={(event) => updateLongitude(body, event.target.value)}
                />
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend>Somatic check-in</legend>
            {['activation', 'fatigue', 'pain'].map((key) => (
              <label key={key}>
                {key}
                <select value={form.somatic[key]} onChange={(event) => updateSomatic(key, event.target.value)}>
                  {LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
                </select>
              </label>
            ))}
            <label className="scfe-checkbox">
              <input
                type="checkbox"
                checked={Boolean(form.somatic.migraine)}
                onChange={(event) => updateSomatic('migraine', event.target.checked)}
              />
              Migraine / low-light mode
            </label>
            <label>
              Tinnitus
              <input
                type="text"
                value={form.somatic.tinnitus || ''}
                onChange={(event) => updateSomatic('tinnitus', event.target.value)}
              />
            </label>
            <label>
              Body yes
              <input
                type="text"
                value={form.somatic.body_yes || ''}
                onChange={(event) => updateSomatic('body_yes', event.target.value)}
              />
            </label>
            <label>
              Body no
              <input
                type="text"
                value={form.somatic.body_no || ''}
                onChange={(event) => updateSomatic('body_no', event.target.value || null)}
              />
            </label>
          </fieldset>
        </form>

        {result.error ? (
          <article className="scfe-panel scfe-error" aria-live="polite">
            <h3>Snapshot could not be created</h3>
            <p>{result.error.message}</p>
          </article>
        ) : (
          <>
            <SnapshotSummary snapshot={snapshot} />
            <BarbaultPanel snapshot={snapshot} />
            <GeometryPanel snapshot={snapshot} />
            <DeepSomaticPanel snapshot={snapshot} />
            <FrequencyTerraPanel snapshot={snapshot} />
            <AgencyPanel snapshot={snapshot} />
          </>
        )}
      </div>

      {snapshot && (
        <section className="scfe-panel scfe-json" aria-label="Field Snapshot JSON export">
          <div className="scfe-actions">
            <h3>Field Snapshot JSON</h3>
            <button type="button" onClick={copySnapshot}>{copyState === 'copied' ? 'Copied' : 'Copy JSON'}</button>
            <button type="button" onClick={exportJsonFile}>Export JSON</button>
          </div>
          <pre>{result.json}</pre>
        </section>
      )}
    </section>
  );
}

function SnapshotSummary({ snapshot }) {
  return (
    <article className="scfe-panel scfe-summary">
      <h3>{snapshot.deep.field_label}</h3>
      <dl>
        <div><dt>Schema</dt><dd>{snapshot.schema_version}</dd></div>
        <div><dt>Mode</dt><dd>{snapshot.mode}</dd></div>
        <div><dt>Safety</dt><dd>{snapshot.somatic.interface_safety_mode}</dd></div>
        <div><dt>Evidence</dt><dd>{snapshot.evidence_labels.frequency}</dd></div>
      </dl>
    </article>
  );
}

function BarbaultPanel({ snapshot }) {
  return (
    <article className="scfe-panel">
      <h3>Barbault Index</h3>
      <p className="scfe-readout">{snapshot.barbault.cyclic_index}° · {snapshot.barbault.compression_level}</p>
      <div className="scfe-pill-grid">
        {Object.entries(snapshot.barbault.sign_degrees).map(([body, value]) => (
          <span key={body}>{body}: {value.degree}° {value.sign}</span>
        ))}
      </div>
      <details>
        <summary>Pairwise distances</summary>
        <ul className="scfe-mini-list">
          {Object.entries(snapshot.barbault.pairwise_distances).map(([pair, distance]) => (
            <li key={pair}><span>{pair}</span><strong>{distance}°</strong></li>
          ))}
        </ul>
      </details>
    </article>
  );
}

function GeometryPanel({ snapshot }) {
  return (
    <article className="scfe-panel">
      <h3>Sacred Geometry</h3>
      <p className="scfe-readout">{snapshot.sacred_geometry.primary_form}</p>
      <p>{snapshot.sacred_geometry.symbolic_function}</p>
      <ul className="scfe-mini-list">
        {snapshot.barbault.configurations.map((configuration) => (
          <li key={configuration.configuration_type}>
            <span>{configuration.configuration_type}</span>
            <strong>{configuration.geometry_shape}</strong>
          </li>
        ))}
      </ul>
      <details>
        <summary>Interaction prompts</summary>
        <ul className="scfe-mini-list">
          {snapshot.sacred_geometry.interaction_points.map((point) => (
            <li key={point.target}><span>{point.target}</span><strong>{point.prompt}</strong></li>
          ))}
        </ul>
      </details>
    </article>
  );
}

function DeepSomaticPanel({ snapshot }) {
  return (
    <article className="scfe-panel">
      <h3>DEEP + Somatic</h3>
      <div className="scfe-vector" aria-label="DEEP vector values">
        {['P', 'C', 'R', 'E', 'M', 'A'].map((key) => (
          <span key={key}><strong>{key}</strong>{snapshot.deep[key]}</span>
        ))}
      </div>
      <p>{snapshot.deep.pacing_recommendation}</p>
      <p className="scfe-readout">Body: {snapshot.somatic.capacity_label}</p>
    </article>
  );
}

function FrequencyTerraPanel({ snapshot }) {
  return (
    <article className="scfe-panel">
      <h3>Hearthfire + Terra</h3>
      {snapshot.frequency_protocol ? (
        <>
          <p className="scfe-readout">{snapshot.frequency_protocol.name}</p>
          <p>{snapshot.frequency_protocol.carrier_frequency_hz} Hz carrier · {snapshot.frequency_protocol.binaural_difference_hz} Hz difference · {snapshot.frequency_protocol.noise_colour} noise</p>
          <p>{snapshot.frequency_protocol.evidence_label}</p>
        </>
      ) : (
        <p className="scfe-readout">Sound suppressed by somatic safety.</p>
      )}
      <p><strong>{snapshot.terra_aeterna.world_mood}</strong>: {snapshot.terra_aeterna.story_prompt}</p>
    </article>
  );
}

function AgencyPanel({ snapshot }) {
  return (
    <article className="scfe-panel">
      <h3>Agency</h3>
      <p>{snapshot.agency.prompt}</p>
      <p className="scfe-readout">{snapshot.agency.plain_pass}</p>
      <div className="scfe-pill-grid">
        {snapshot.agency.suggested_actions.map((action) => <span key={action}>{action}</span>)}
      </div>
    </article>
  );
}
