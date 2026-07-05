import React, { useMemo, useState } from 'react';
import {
  clearLocalArchive,
  readLocalArchive,
  saveSnapshotToLocalArchive,
} from '../../scfe/local-archive.js';
import { DEFAULT_SCFE_INPUT, createFieldSnapshot, exportSnapshot } from '../../scfe/orchestrator.js';
import { GeometrySigil } from './GeometrySigil.jsx';
import './scfe-lab.css';

const BARBAULT_BODIES = ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
const LEVELS = ['low', 'moderate', 'high'];

const FORM_PRESETS = [
  {
    key: 'july-2026-threshold',
    label: 'July 2026 threshold',
    description: 'Default Barbault basket/cradle candidate with gentle-body framing.',
    patch: {},
  },
  {
    key: 'body-no-pause',
    label: 'Body-no pause',
    description: 'Tests the consent/somatic veto path. Sound is suppressed and agency becomes rest-only.',
    patch: {
      somatic: {
        activation: 'high',
        fatigue: 'high',
        pain: 'moderate',
        migraine: false,
        tinnitus: 'watchful',
        body_yes: '',
        body_no: 'not today',
      },
    },
  },
  {
    key: 'migraine-low-light',
    label: 'Migraine low-light',
    description: 'Tests low-light silent mode. No frequency protocol should be recommended.',
    patch: {
      somatic: {
        activation: 'moderate',
        fatigue: 'high',
        pain: 'moderate',
        migraine: true,
        tinnitus: 'sensitive',
        body_yes: 'dark quiet',
        body_no: '',
      },
    },
  },
  {
    key: 'stable-alpha-work',
    label: 'Stable alpha work',
    description: 'Tests an available-body state that can receive alpha grounding guidance.',
    patch: {
      somatic: {
        activation: 'low',
        fatigue: 'low',
        pain: 'low',
        migraine: false,
        tinnitus: 'stable',
        body_yes: 'stable work',
        body_no: '',
      },
    },
  },
];

const SWITCHBOARD_FAQ = {
  nope_lever: {
    label: 'Nope Lever',
    use: 'Use this when your body, attention, or consent says no. You do not need a full reason.',
    plain_pass: 'Stop here. No more interpretation. No sound. No next step required.',
    function: 'It closes the active inquiry, keeps the field from asking for more, and leaves only an optional local log.',
    not_for: 'Not for pushing through, explaining yourself, or finishing the scene because it was already open.',
  },
  change_channel: {
    label: 'Change Channel',
    use: 'Use this when the current frame is wrong but you do not want to lose the thread.',
    plain_pass: 'Same thread, safer scene. Shift the tone, task, or sensory channel.',
    function: 'It redirects the lab away from the current intensity while preserving continuity for later work.',
    not_for: 'Not for forcing deeper analysis. It changes the path instead of proving the old one was bad.',
  },
  soft_landing: {
    label: 'Soft Landing',
    use: 'Use this when the system needs to get quieter: migraine, low-light need, dizziness, pain, or too much input.',
    plain_pass: 'Dim the room. Keep it quiet. Make the next step tiny or none.',
    function: 'It lowers sensory demand, suppresses sound guidance, and favours orientation over interpretation.',
    not_for: 'Not for productivity. This is the cushion, not the launchpad.',
  },
  log_only: {
    label: 'Log Only Basket',
    use: 'Use this when something matters enough to keep but not enough to open right now.',
    plain_pass: 'Record it. Hold it. Do not analyse it yet.',
    function: 'It keeps the signal local and non-canon so the lab can remember without escalating.',
    not_for: 'Not for turning a note into a task, omen, protocol, or required story beat.',
  },
  standard: {
    label: 'Standard Exploration',
    use: 'Use this when capacity and consent are present and the field is safe to inspect.',
    plain_pass: 'Continue gently. Read the field and choose one next action.',
    function: 'It allows normal read-only exploration with the existing agency and archive controls.',
    not_for: 'Not for ignoring fatigue, pain, body-no, or sensory warning signs.',
  },
};

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

function formatToken(value) {
  return String(value || 'none').replaceAll('_', ' ');
}

export function SCFELab() {
  const [form, setForm] = useState(createInitialForm);
  const [copyState, setCopyState] = useState('ready');
  const [archiveEntries, setArchiveEntries] = useState(() => readLocalArchive());

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

  function applyPreset(preset) {
    const base = createInitialForm();
    setForm({
      ...base,
      ...preset.patch,
      longitudes: {
        ...base.longitudes,
        ...(preset.patch.longitudes || {}),
      },
      somatic: {
        ...base.somatic,
        ...(preset.patch.somatic || {}),
      },
    });
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

  function saveLocalSnapshot() {
    if (!result.snapshot) return;
    setArchiveEntries(saveSnapshotToLocalArchive(result.snapshot));
  }

  function clearLocalSnapshots() {
    setArchiveEntries(clearLocalArchive());
  }

  const snapshot = result.snapshot;

  return (
    <section className="scfe-lab chamber-card" aria-label="Starwell Concurrent Field Engine read-only lab">
      <div className="map-heading compact scfe-heading">
        <span>Concurrent Field Engine</span>
        <strong>v0.2 seed lab</strong>
      </div>

      <p className="scfe-lab-note">
        One moment enters; Barbault maths, sacred geometry, DEEP, somatics, Hearthfire frequency guidance, Terra Aeterna, and agency read it together. No Supabase writes. No medical claims. No prophecy soup.
      </p>

      <div className="scfe-layout">
        <form className="scfe-panel scfe-inputs" onSubmit={(event) => event.preventDefault()}>
          <h3>Input moment</h3>

          <div className="scfe-preset-row" aria-label="SCFE test presets">
            {FORM_PRESETS.map((preset) => (
              <button key={preset.key} type="button" title={preset.description} onClick={() => applyPreset(preset)}>
                {preset.label}
              </button>
            ))}
          </div>

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
            <EphemerisPanel snapshot={snapshot} />
            <EphemerisComparisonPanel snapshot={snapshot} />
            <BarbaultPanel snapshot={snapshot} />
            <GeometryPanel snapshot={snapshot} />
            <DeepSomaticPanel snapshot={snapshot} />
            <FrequencyTerraPanel snapshot={snapshot} />
            <AgencyPanel snapshot={snapshot} />
            <AgencySwitchboardPanel snapshot={snapshot} />
            <LocalArchivePanel entries={archiveEntries} onSave={saveLocalSnapshot} onClear={clearLocalSnapshots} />
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

function EphemerisPanel({ snapshot }) {
  return (
    <article className="scfe-panel">
      <h3>Ephemeris Adapter</h3>
      <p className="scfe-readout">{snapshot.ephemeris.provider} · {snapshot.ephemeris.calculation_status}</p>
      <p>{snapshot.ephemeris.source_note}</p>
      <ul className="scfe-mini-list">
        {snapshot.ephemeris.warnings.map((warning) => (
          <li key={warning}><span>warning</span><strong>{warning}</strong></li>
        ))}
      </ul>
    </article>
  );
}

function EphemerisComparisonPanel({ snapshot }) {
  const comparison = snapshot.ephemeris_comparison;
  const deltas = Object.entries(comparison.body_deltas || {});

  return (
    <article className="scfe-panel">
      <h3>Ephemeris Comparison</h3>
      <p className="scfe-readout">{comparison.status} · worst delta {comparison.worst_delta_degrees ?? 'n/a'}°</p>
      <p>{comparison.note}</p>
      <dl className="scfe-compact-dl">
        <div><dt>Reference</dt><dd>{comparison.reference_source || 'none'}</dd></div>
        <div><dt>Tolerance</dt><dd>{comparison.tolerance_degrees ?? 'n/a'}°</dd></div>
      </dl>
      {deltas.length > 0 && (
        <details>
          <summary>Body deltas</summary>
          <ul className="scfe-mini-list">
            {deltas.map(([body, delta]) => (
              <li key={body}>
                <span>{body} · {delta.status}</span>
                <strong>{delta.delta_degrees ?? 'n/a'}°</strong>
              </li>
            ))}
          </ul>
        </details>
      )}
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
      <details open>
        <summary>Configuration review</summary>
        <p className="scfe-readout">{snapshot.barbault.configuration_review.status} · {snapshot.barbault.configuration_review.confidence}</p>
        <div className="scfe-pill-grid">
          {snapshot.barbault.configuration_review.flags.map((flag) => <span key={flag}>{flag}</span>)}
        </div>
        <ul className="scfe-mini-list">
          {snapshot.barbault.configuration_review.notes.map((note) => (
            <li key={note}><span>note</span><strong>{note}</strong></li>
          ))}
        </ul>
      </details>
    </article>
  );
}

function GeometryPanel({ snapshot }) {
  return (
    <article className="scfe-panel scfe-geometry-panel">
      <h3>Sacred Geometry</h3>
      <GeometrySigil snapshot={snapshot} />
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
        <summary>Detected aspects</summary>
        <ul className="scfe-mini-list">
          {snapshot.barbault.aspects.map((aspect) => (
            <li key={`${aspect.body_a}-${aspect.body_b}-${aspect.aspect_type}`}>
              <span>{aspect.body_a} ↔ {aspect.body_b}</span>
              <strong>{aspect.aspect_type} · orb {aspect.orb}°</strong>
            </li>
          ))}
        </ul>
      </details>
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

function AgencySwitchboardPanel({ snapshot }) {
  const switchboard = snapshot.agency_switchboard;
  if (!switchboard) return null;

  const reasons = switchboard.reasons?.length ? switchboard.reasons : ['standard_available'];
  const channels = switchboard.available_channels || [];

  return (
    <article className={`scfe-panel scfe-switchboard is-${switchboard.active_channel}`} aria-labelledby="scfe-switchboard-title">
      <header className="scfe-switchboard-header">
        <div>
          <h3 id="scfe-switchboard-title">Agency Switchboard</h3>
          <p>Visible lever state for local, read-only regulation.</p>
        </div>
        <strong className="scfe-switchboard-badge">{switchboard.active_label}</strong>
      </header>

      <p className="scfe-readout">Say: {switchboard.recommended_command}</p>
      <p>{switchboard.plain_language}</p>
      <p className="scfe-consent-anchor">{switchboard.consent_anchor}</p>

      <dl className="scfe-compact-dl scfe-switchboard-dl">
        <div><dt>Field context</dt><dd>{formatToken(switchboard.field_context)}</dd></div>
        <div><dt>Processing</dt><dd>{formatToken(switchboard.lab_behaviour?.processing)}</dd></div>
        <div><dt>Sound</dt><dd>{formatToken(switchboard.lab_behaviour?.sound)}</dd></div>
        <div><dt>Archive</dt><dd>{formatToken(switchboard.lab_behaviour?.archive)}</dd></div>
      </dl>

      <section className="scfe-switchboard-section" aria-labelledby="scfe-switchboard-reasons">
        <h4 id="scfe-switchboard-reasons">Why this channel</h4>
        <ul className="scfe-mini-list">
          {reasons.map((reason) => (
            <li key={reason}><span>reason</span><strong>{formatToken(reason)}</strong></li>
          ))}
        </ul>
      </section>

      <section className="scfe-switchboard-section" aria-labelledby="scfe-switchboard-levers">
        <h4 id="scfe-switchboard-levers">Available levers</h4>
        <div className="scfe-command-grid" role="list">
          {channels.map((channel) => (
            <span
              key={channel.id}
              className={channel.id === switchboard.active_channel ? 'active' : ''}
              role="listitem"
              aria-current={channel.id === switchboard.active_channel ? 'true' : undefined}
              title={channel.purpose}
            >
              <strong>{channel.label}</strong>
              <small>{channel.invocation}</small>
            </span>
          ))}
        </div>
      </section>

      <section className="scfe-switchboard-section" aria-labelledby="scfe-switchboard-faq">
        <h4 id="scfe-switchboard-faq">Plain-pass FAQ</h4>
        <div className="scfe-faq-stack">
          {channels.map((channel) => {
            const faq = SWITCHBOARD_FAQ[channel.id];
            if (!faq) return null;

            return (
              <details key={channel.id} className="scfe-faq-card" open={channel.id === switchboard.active_channel}>
                <summary>{faq.label}</summary>
                <dl className="scfe-faq-dl">
                  <div><dt>Use when</dt><dd>{faq.use}</dd></div>
                  <div><dt>Plain pass</dt><dd>{faq.plain_pass}</dd></div>
                  <div><dt>Function</dt><dd>{faq.function}</dd></div>
                  <div><dt>Not for</dt><dd>{faq.not_for}</dd></div>
                </dl>
              </details>
            );
          })}
        </div>
      </section>

      <p className="scfe-switchboard-note">Display-only in this pass. The JSON export carries the same switchboard state; future controls can make these levers interactive without changing the packet shape.</p>
    </article>
  );
}

function LocalArchivePanel({ entries, onSave, onClear }) {
  return (
    <article className="scfe-panel scfe-local-archive">
      <h3>Local Archive Queue</h3>
      <p>Browser-local only. Nothing syncs, writes to Supabase, or becomes canon.</p>
      <div className="scfe-actions compact-actions">
        <button type="button" onClick={onSave}>Save local snapshot</button>
        <button type="button" onClick={onClear}>Clear local queue</button>
      </div>
      <p className="scfe-readout">{entries.length} local snapshots</p>
      <ul className="scfe-mini-list">
        {entries.slice(0, 5).map((entry) => (
          <li key={entry.id}>
            <span>{entry.field_label} · {entry.safety_mode}</span>
            <strong>{new Date(entry.saved_at).toLocaleString()}</strong>
          </li>
        ))}
      </ul>
    </article>
  );
}
