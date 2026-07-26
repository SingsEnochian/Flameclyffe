import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

const localHost = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
const API_ROOT = window.location.port === '5173'
  ? '/api/observer-scoop'
  : 'http://127.0.0.1:3001/api/observer-scoop';

const METRICS = [
  { key: 'solar_wind_bt_nt', label: 'Bt', unit: 'nT', digits: 2 },
  { key: 'solar_wind_bz_gsm_nt', label: 'Bz', unit: 'nT', digits: 2 },
  { key: 'solar_wind_speed_km_s', label: 'Solar Wind', unit: 'km/s', digits: 0 },
  { key: 'planetary_kp', label: 'Kp', unit: '', digits: 2 },
  { key: 'goes_xray_flux_w_m2:', label: 'X-Ray', unit: 'W/m²', digits: 2, prefix: true, exponential: true },
];

function emptySnapshot() {
  return {
    generated_at: null,
    storage: 'unavailable',
    mechanism_claim: 'unknown_not_overclaimed',
    runtime: {
      mode: 'OFF',
      polling: false,
      interval_ms: 300000,
      last_execution_time_ms: null,
      last_status: null,
      consecutive_faults: 0,
      last_error: null,
      locked: false,
    },
    feeds: [],
    latest: [],
    timeline: [],
    anomalies: [],
    recent_runs: [],
  };
}

function findMetric(rows, config) {
  return rows.find((row) => config.prefix
    ? String(row.metric_key || '').startsWith(config.key)
    : row.metric_key === config.key) || null;
}

function formatValue(row, config) {
  if (!row) return '—';
  if (row.numeric_value === null || row.numeric_value === undefined) return 'MISSING';
  const value = Number(row.numeric_value);
  if (!Number.isFinite(value)) return String(row.numeric_value);
  if (config.exponential) return value.toExponential(config.digits);
  return value.toFixed(config.digits);
}

function formatAge(seconds) {
  if (seconds === null || seconds === undefined) return '—';
  const value = Number(seconds);
  if (value < 60) return `${value}s`;
  if (value < 3600) return `${Math.round(value / 60)}m`;
  return `${(value / 3600).toFixed(1)}h`;
}

function formatTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

function stateClass(value) {
  return String(value || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function SkyPanel({ latest, onSelect }) {
  return (
    <section className="observatory-panel sky-panel" aria-labelledby="current-sky-title">
      <header className="panel-heading">
        <span>Panel 1</span>
        <h2 id="current-sky-title">Current Sky</h2>
      </header>
      <div className="sky-metrics">
        {METRICS.map((config) => {
          const row = findMetric(latest, config);
          return (
            <button
              className={`metric-card quality-${stateClass(row?.quality_state)}`}
              key={config.key}
              type="button"
              onClick={() => row && onSelect(row)}
              disabled={!row}
            >
              <span>{config.label}</span>
              <strong>{formatValue(row, config)}</strong>
              <em>{row?.unit || config.unit}</em>
              <small>{row ? formatTime(row.measured_at) : 'Awaiting first packet'}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function FeedHealthPanel({ snapshot, onSelect }) {
  const runFaults = useMemo(() => {
    const map = new Map();
    for (const run of snapshot.recent_runs || []) {
      const sourceId = run.source_id;
      map.set(sourceId, (map.get(sourceId) || 0) + Number(run.error_count || 0));
    }
    return map;
  }, [snapshot.recent_runs]);

  return (
    <section className="observatory-panel health-panel" aria-labelledby="feed-health-title">
      <header className="panel-heading split-heading">
        <div>
          <span>Panel 2</span>
          <h2 id="feed-health-title">Feed Health</h2>
        </div>
        <div className={`runtime-badge mode-${stateClass(snapshot.runtime.mode)}`}>
          <i aria-hidden="true" />
          <strong>{snapshot.runtime.mode}</strong>
          <small>{snapshot.runtime.polling ? 'polling' : snapshot.runtime.last_status || 'idle'}</small>
        </div>
      </header>

      <div className="runtime-strip">
        <span>Latency <strong>{snapshot.runtime.last_execution_time_ms ?? '—'} ms</strong></span>
        <span>Faults <strong>{snapshot.runtime.consecutive_faults || 0}</strong></span>
        <span>Storage <strong>{snapshot.storage}</strong></span>
        <span>Next poll <strong>{formatTime(snapshot.runtime.next_poll_at)}</strong></span>
      </div>

      <div className="health-table-wrap">
        <table className="health-table">
          <thead>
            <tr>
              <th>Feed</th>
              <th>Instrument</th>
              <th>State</th>
              <th>Packet age</th>
              <th>Stale after</th>
              <th>Faults</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.feeds.length === 0 && (
              <tr><td colSpan="6" className="empty-cell">No feed registry visible yet.</td></tr>
            )}
            {snapshot.feeds.map((feed) => {
              const latest = snapshot.timeline.find((row) => row.source_id === feed.id);
              return (
                <tr key={feed.id || feed.source_key}>
                  <td>{feed.display_name || feed.source_key}</td>
                  <td>{feed.instrument_name || '—'}</td>
                  <td><span className={`feed-state state-${stateClass(feed.state)}`}>{feed.state}</span></td>
                  <td>{formatAge(feed.packet_age_seconds)}</td>
                  <td>{formatAge(feed.stale_after_seconds)}</td>
                  <td>
                    <button className="text-button" type="button" onClick={() => latest && onSelect(latest)} disabled={!latest}>
                      {runFaults.get(feed.id) || 0}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TimelinePanel({ snapshot, onSelect }) {
  const rows = snapshot.timeline.slice(0, 24);
  return (
    <section className="observatory-panel timeline-panel" aria-labelledby="timeline-title">
      <header className="panel-heading split-heading">
        <div>
          <span>Panel 3</span>
          <h2 id="timeline-title">Timeline Layer</h2>
        </div>
        <small>{snapshot.anomalies.length} anomaly windows</small>
      </header>

      <div className="timeline-track" aria-label="Recent telemetry packets">
        {rows.length === 0 && <p className="empty-message">The timeline is quiet. Poll when ready.</p>}
        {rows.map((row) => (
          <button className="timeline-event" key={row.id || row.payload_hash} type="button" onClick={() => onSelect(row)}>
            <time>{formatTime(row.measured_at)}</time>
            <span>{row.metric_key}</span>
            <strong>{row.numeric_value ?? row.text_value ?? 'MISSING'} {row.unit || ''}</strong>
            <em>{String(row.quality_state || 'unknown').toUpperCase()}</em>
          </button>
        ))}
      </div>

      <div className="anomaly-lane">
        {snapshot.anomalies.length === 0
          ? <span>No anomaly window marked. Baseline collection remains unforced.</span>
          : snapshot.anomalies.map((window) => (
              <article key={window.id}>
                <strong>{window.window_key || window.detector_name}</strong>
                <span>{formatTime(window.started_at)} → {formatTime(window.ended_at)}</span>
                <em>{window.severity} · {window.mechanism_claim}</em>
              </article>
            ))}
      </div>
    </section>
  );
}

function InspectorPanel({ selected }) {
  return (
    <section className="observatory-panel inspector-panel" aria-labelledby="packet-inspector-title">
      <header className="panel-heading split-heading">
        <div>
          <span>Panel 4</span>
          <h2 id="packet-inspector-title">Packet Inspector</h2>
        </div>
        <small>{selected?.payload_hash ? selected.payload_hash.slice(0, 12) : 'no packet selected'}</small>
      </header>
      {selected ? (
        <>
          <div className="packet-summary">
            <span>{selected.metric_key}</span>
            <strong>{selected.numeric_value ?? selected.text_value ?? 'MISSING'} {selected.unit || ''}</strong>
            <em>{String(selected.quality_state || 'unknown').toUpperCase()}</em>
          </div>
          <pre>{JSON.stringify(selected, null, 2)}</pre>
        </>
      ) : (
        <p className="empty-message">Select a current metric or timeline packet to inspect its provenance and raw source record.</p>
      )}
    </section>
  );
}

function ActionDeck({ snapshot, busy, intervalSeconds, setIntervalSeconds, onCommand }) {
  const locked = snapshot.runtime.locked;
  return (
    <section className="observatory-panel action-panel" aria-labelledby="action-deck-title">
      <header className="panel-heading">
        <span>Panel 5</span>
        <h2 id="action-deck-title">Manual Action Deck</h2>
      </header>
      <div className="action-grid">
        <button type="button" onClick={() => onCommand('poll')} disabled={busy || locked}>Poll Now</button>
        <label>
          <span>Interval</span>
          <select value={intervalSeconds} onChange={(event) => setIntervalSeconds(Number(event.target.value))} disabled={busy || locked}>
            <option value="60">60 seconds</option>
            <option value="300">5 minutes</option>
            <option value="900">15 minutes</option>
          </select>
        </label>
        <button type="button" onClick={() => onCommand('interval', { interval_seconds: intervalSeconds })} disabled={busy || locked}>Start Interval</button>
        <button type="button" onClick={() => onCommand('pause')} disabled={busy}>Pause</button>
        <button type="button" onClick={() => onCommand('off')} disabled={busy}>Off</button>
        {locked && <button className="danger-button" type="button" onClick={() => onCommand('reset')} disabled={busy}>Reset Error Lock</button>}
        <a href={`${API_ROOT}/export?format=json`}>Export JSON</a>
        <a href={`${API_ROOT}/export?format=md`}>Export Markdown</a>
        <button type="button" disabled title="Ring 4">Attach Witness · Ring 4</button>
        <button type="button" disabled title="Ring 5">Send to Lanternwire · Ring 5</button>
        <button type="button" disabled title="Ring 6">Route to Audio · Ring 6</button>
      </div>
    </section>
  );
}

function App() {
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [intervalSeconds, setIntervalSeconds] = useState(300);

  async function loadSnapshot({ quiet = false } = {}) {
    if (!localHost) {
      setError('The Veil Observatory requires the local STARWELL bridge.');
      return;
    }
    try {
      const response = await fetch(`${API_ROOT}/latest`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || `Observer API ${response.status}`);
      setSnapshot((current) => ({ ...emptySnapshot(), ...payload, runtime: { ...emptySnapshot().runtime, ...payload.runtime } }));
      setSelected((current) => {
        if (current?.id) return payload.timeline?.find((row) => row.id === current.id) || current;
        return payload.latest?.[0] || null;
      });
      setError(null);
    } catch (nextError) {
      if (!quiet) setError(nextError.message);
    }
  }

  async function command(name, body) {
    setBusy(true);
    try {
      const response = await fetch(`${API_ROOT}/${name}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body || {}),
      });
      const payload = await response.json();
      if (!response.ok && response.status !== 207) throw new Error(payload.error || `Observer API ${response.status}`);
      await loadSnapshot();
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadSnapshot();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadSnapshot({ quiet: true });
    }, 15000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="veil-observatory">
      <div className="starfield" aria-hidden="true" />
      <header className="observatory-masthead">
        <a href="../">← STARWELL</a>
        <div>
          <p>Hearthweave Observatory · Local Instrument</p>
          <h1>Veil Observatory</h1>
          <span>Measured source → normalized packet → private archive → visible chamber</span>
        </div>
        <button type="button" onClick={() => loadSnapshot()} disabled={busy}>Refresh View</button>
      </header>

      <aside className="boundary-notice" role="note">
        <strong>Temporal correspondence recorded. Mechanism unresolved.</strong>
        <span>Telemetry, witness records, annotations, and interpretations remain distinct layers.</span>
      </aside>

      {error && <div className="error-banner" role="alert">{error}</div>}

      <div className="observatory-grid">
        <SkyPanel latest={snapshot.latest} onSelect={setSelected} />
        <FeedHealthPanel snapshot={snapshot} onSelect={setSelected} />
        <TimelinePanel snapshot={snapshot} onSelect={setSelected} />
        <InspectorPanel selected={selected} />
        <ActionDeck
          snapshot={snapshot}
          busy={busy}
          intervalSeconds={intervalSeconds}
          setIntervalSeconds={setIntervalSeconds}
          onCommand={command}
        />
      </div>

      <footer>
        <span>Generated {formatTime(snapshot.generated_at)}</span>
        <span>Mechanism state: {snapshot.mechanism_claim}</span>
        <span>No automatic interpretation · no automatic sound</span>
      </footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
