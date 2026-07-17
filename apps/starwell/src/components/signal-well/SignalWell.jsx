import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  EPISTEMIC_STATUSES,
  SIGNAL_CLASSIFICATIONS,
  buildSignalSessionExport,
  candidatesToCsv,
  makeCandidate,
  makeDemoSignalPoints,
  parseSignalFileText,
  signalBounds,
  updateCandidate,
} from './signalWellModel.js';

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 620;

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function hex(buffer) {
  return [...new Uint8Array(buffer)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

async function sha256(file) {
  if (!globalThis.crypto?.subtle) return null;
  return hex(await globalThis.crypto.subtle.digest('SHA-256', await file.arrayBuffer()));
}

function dataFromCanvas(x, y, bounds) {
  const timeSpan = Math.max(1e-9, bounds.timeMax - bounds.timeMin);
  const frequencySpan = Math.max(1e-9, bounds.frequencyMax - bounds.frequencyMin);
  return {
    time: bounds.timeMin + (x / CANVAS_WIDTH) * timeSpan,
    frequency: bounds.frequencyMax - (y / CANVAS_HEIGHT) * frequencySpan,
  };
}

function canvasPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(CANVAS_WIDTH, ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH)),
    y: Math.max(0, Math.min(CANVAS_HEIGHT, ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT)),
  };
}

function colourForIntensity(intensity, min, max) {
  const span = Math.max(1e-9, max - min);
  const value = Math.max(0, Math.min(1, (intensity - min) / span));
  const hue = 235 - value * 205;
  const lightness = 11 + value * 62;
  return `hsl(${hue} 88% ${lightness}%)`;
}

function fmt(value, digits = 3) {
  return Number.isFinite(value) ? Number(value).toFixed(digits) : '—';
}

function CandidateEditor({ candidate, onChange, onDelete }) {
  if (!candidate) {
    return (
      <section className="signal-panel candidate-editor empty">
        <p className="eyebrow">Candidate ledger</p>
        <h2>Select a region</h2>
        <p>Drag over the waterfall to create a source-linked candidate. Classification remains separate from the raw observation.</p>
      </section>
    );
  }

  const patch = (nextPatch) => onChange(updateCandidate(candidate, nextPatch));
  return (
    <section className="signal-panel candidate-editor">
      <p className="eyebrow">Candidate ledger</p>
      <div className="candidate-title-row">
        <h2>{candidate.id}</h2>
        <button className="danger-button" type="button" onClick={() => onDelete(candidate.id)}>Delete</button>
      </div>

      <div className="bounds-grid" aria-label="Candidate bounds">
        <span><small>Time</small>{fmt(candidate.timeStart)} – {fmt(candidate.timeEnd)}</span>
        <span><small>Frequency MHz</small>{fmt(candidate.frequencyStart, 5)} – {fmt(candidate.frequencyEnd, 5)}</span>
      </div>

      <label>
        Classification
        <select value={candidate.classification} onChange={(event) => patch({ classification: event.target.value })}>
          {SIGNAL_CLASSIFICATIONS.map((classification) => <option key={classification}>{classification}</option>)}
        </select>
      </label>

      <label>
        Epistemic status
        <select value={candidate.epistemicStatus} onChange={(event) => patch({ epistemicStatus: event.target.value })}>
          {EPISTEMIC_STATUSES.map((status) => <option key={status}>{status}</option>)}
        </select>
      </label>

      <label>
        Confidence <output>{Math.round(candidate.confidence * 100)}%</output>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={candidate.confidence}
          onChange={(event) => patch({ confidence: Number(event.target.value) })}
        />
      </label>

      <label>
        Sifting note
        <textarea
          rows="5"
          value={candidate.note}
          onChange={(event) => patch({ note: event.target.value })}
          placeholder="What is visible? What has been ruled out? What remains unknown?"
        />
      </label>

      <label>
        Cross-checks
        <input
          type="text"
          value={(candidate.crossChecks || []).join('; ')}
          onChange={(event) => patch({
            crossChecks: event.target.value.split(';').map((value) => value.trim()).filter(Boolean),
          })}
          placeholder="second station; solar report; on/off target cadence"
        />
      </label>
    </section>
  );
}

export default function SignalWell() {
  const demoPoints = useMemo(() => makeDemoSignalPoints(), []);
  const [points, setPoints] = useState(demoPoints);
  const [source, setSource] = useState({
    name: 'signal-well-demo.csv',
    kind: 'generated-demo',
    byteLength: null,
    sha256: null,
    importedAt: new Date().toISOString(),
  });
  const [candidates, setCandidates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [drag, setDrag] = useState(null);
  const [message, setMessage] = useState('Demo observation loaded. Import a local CSV or JSON file when ready.');
  const [sessionNote, setSessionNote] = useState('');
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  const bounds = useMemo(() => signalBounds(points), [points]);
  const selectedCandidate = candidates.find((candidate) => candidate.id === selectedId) || null;
  const rasterMeta = useMemo(() => ({
    timeBins: new Set(points.map((point) => point.time)).size,
    frequencyBins: new Set(points.map((point) => point.frequency)).size,
  }), [points]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.fillStyle = '#020609';
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const timeSpan = Math.max(1e-9, bounds.timeMax - bounds.timeMin);
    const frequencySpan = Math.max(1e-9, bounds.frequencyMax - bounds.frequencyMin);
    const cellWidth = Math.max(1, CANVAS_WIDTH / Math.max(1, rasterMeta.timeBins));
    const cellHeight = Math.max(1, CANVAS_HEIGHT / Math.max(1, rasterMeta.frequencyBins));

    points.forEach(({ time, frequency, intensity }) => {
      const x = ((time - bounds.timeMin) / timeSpan) * CANVAS_WIDTH;
      const y = ((bounds.frequencyMax - frequency) / frequencySpan) * CANVAS_HEIGHT;
      context.fillStyle = colourForIntensity(intensity, bounds.intensityMin, bounds.intensityMax);
      context.fillRect(x, y, cellWidth + 0.6, cellHeight + 0.6);
    });

    candidates.forEach((candidate) => {
      const x1 = ((candidate.timeStart - bounds.timeMin) / timeSpan) * CANVAS_WIDTH;
      const x2 = ((candidate.timeEnd - bounds.timeMin) / timeSpan) * CANVAS_WIDTH;
      const y1 = ((bounds.frequencyMax - candidate.frequencyEnd) / frequencySpan) * CANVAS_HEIGHT;
      const y2 = ((bounds.frequencyMax - candidate.frequencyStart) / frequencySpan) * CANVAS_HEIGHT;
      context.save();
      context.strokeStyle = candidate.id === selectedId ? '#fff2a8' : '#f7d277';
      context.lineWidth = candidate.id === selectedId ? 4 : 2;
      context.setLineDash(candidate.classification === 'unclassified' ? [10, 7] : []);
      context.strokeRect(x1, y1, Math.max(2, x2 - x1), Math.max(2, y2 - y1));
      context.fillStyle = 'rgba(0, 0, 0, 0.72)';
      context.fillRect(x1, Math.max(0, y1 - 24), 126, 24);
      context.fillStyle = '#fff2b8';
      context.font = '600 15px ui-monospace, monospace';
      context.fillText(candidate.id, x1 + 7, Math.max(17, y1 - 7));
      context.restore();
    });

    if (drag) {
      context.save();
      context.strokeStyle = '#ffffff';
      context.fillStyle = 'rgba(255,255,255,.1)';
      context.lineWidth = 2;
      context.setLineDash([8, 6]);
      const x = Math.min(drag.start.x, drag.current.x);
      const y = Math.min(drag.start.y, drag.current.y);
      const width = Math.abs(drag.current.x - drag.start.x);
      const height = Math.abs(drag.current.y - drag.start.y);
      context.fillRect(x, y, width, height);
      context.strokeRect(x, y, width, height);
      context.restore();
    }
  }, [bounds, candidates, drag, points, rasterMeta, selectedId]);

  const importFile = async (file) => {
    try {
      setMessage(`Reading ${file.name} locally…`);
      const text = await file.text();
      const importedPoints = parseSignalFileText(text, file.name);
      const digest = await sha256(file);
      setPoints(importedPoints);
      setSource({
        name: file.name,
        kind: 'local-file',
        byteLength: file.size,
        sha256: digest,
        importedAt: new Date().toISOString(),
      });
      setCandidates([]);
      setSelectedId(null);
      setMessage(`${importedPoints.length.toLocaleString()} points loaded. The file stayed on this device.`);
    } catch (error) {
      setMessage(`Import failed: ${error.message}`);
    }
  };

  const finishSelection = (event) => {
    const canvas = canvasRef.current;
    if (!canvas || !drag) return;
    const end = canvasPoint(event, canvas);
    const width = Math.abs(end.x - drag.start.x);
    const height = Math.abs(end.y - drag.start.y);
    setDrag(null);
    if (width < 5 || height < 5) return;

    const startData = dataFromCanvas(drag.start.x, drag.start.y, bounds);
    const endData = dataFromCanvas(end.x, end.y, bounds);
    const candidate = makeCandidate({
      timeStart: startData.time,
      timeEnd: endData.time,
      frequencyStart: startData.frequency,
      frequencyEnd: endData.frequency,
    }, candidates.length);
    setCandidates((current) => [...current, candidate]);
    setSelectedId(candidate.id);
  };

  const replaceCandidate = (updated) => {
    setCandidates((current) => current.map((candidate) => candidate.id === updated.id ? updated : candidate));
  };

  const deleteCandidate = (id) => {
    setCandidates((current) => current.filter((candidate) => candidate.id !== id));
    setSelectedId(null);
  };

  const exportSession = () => {
    const record = buildSignalSessionExport({ source, points, candidates, sessionNote });
    downloadText(
      `${source.name.replace(/\.[^.]+$/, '') || 'signal'}-signal-well.json`,
      JSON.stringify(record, null, 2),
      'application/json',
    );
  };

  const exportCandidates = () => {
    downloadText(
      `${source.name.replace(/\.[^.]+$/, '') || 'signal'}-candidates.csv`,
      candidatesToCsv(candidates),
      'text/csv',
    );
  };

  return (
    <main className="signal-well-shell">
      <header className="signal-header">
        <div>
          <a className="back-link" href="../">← STARWELL</a>
          <p className="eyebrow">Local-first radio astronomy workbench</p>
          <h1>Signal Well</h1>
          <p className="lede">Raw recording first. Human-led sifting. RFI is marked, not erased. Meaning never overwrites measurement.</p>
        </div>
        <div className="header-actions">
          <button type="button" onClick={() => fileInputRef.current?.click()}>Import CSV / JSON</button>
          <input
            ref={fileInputRef}
            hidden
            type="file"
            accept=".csv,.json,text/csv,application/json"
            onChange={(event) => event.target.files?.[0] && importFile(event.target.files[0])}
          />
          <button type="button" onClick={exportSession}>Export session JSON</button>
          <button type="button" onClick={exportCandidates} disabled={candidates.length === 0}>Export candidates CSV</button>
        </div>
      </header>

      <section className="protocol-strip" aria-label="Signal Well protocol">
        <strong>Observe</strong><span>→</span><strong>Preserve</strong><span>→</span><strong>Mark</strong><span>→</span><strong>Cross-check</strong><span>→</span><strong>Interpret</strong>
      </section>

      <section className="source-card">
        <div><small>Source</small><strong>{source.name}</strong></div>
        <div><small>Points</small><strong>{points.length.toLocaleString()}</strong></div>
        <div><small>Time range</small><strong>{fmt(bounds.timeMin)} – {fmt(bounds.timeMax)}</strong></div>
        <div><small>Frequency MHz</small><strong>{fmt(bounds.frequencyMin, 5)} – {fmt(bounds.frequencyMax, 5)}</strong></div>
        <div><small>SHA-256</small><strong className="hash">{source.sha256 || 'demo / not hashed'}</strong></div>
      </section>

      <section className="workbench">
        <div className="waterfall-panel signal-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Waterfall</p>
              <h2>Drag to mark a region</h2>
            </div>
            <span className="message" role="status">{message}</span>
          </div>
          <div className="canvas-frame">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              aria-label="Time-frequency intensity waterfall. Drag to create a candidate region."
              onPointerDown={(event) => {
                const canvas = canvasRef.current;
                if (!canvas) return;
                canvas.setPointerCapture(event.pointerId);
                const point = canvasPoint(event, canvas);
                setDrag({ start: point, current: point });
              }}
              onPointerMove={(event) => {
                const canvas = canvasRef.current;
                if (!canvas || !drag) return;
                setDrag((current) => current ? { ...current, current: canvasPoint(event, canvas) } : null);
              }}
              onPointerUp={finishSelection}
              onPointerCancel={() => setDrag(null)}
            />
            <span className="axis-label axis-time">time →</span>
            <span className="axis-label axis-frequency">frequency MHz →</span>
          </div>
        </div>

        <CandidateEditor candidate={selectedCandidate} onChange={replaceCandidate} onDelete={deleteCandidate} />
      </section>

      <section className="ledger signal-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Sifting queue</p>
            <h2>{candidates.length} marked region{candidates.length === 1 ? '' : 's'}</h2>
          </div>
        </div>
        {candidates.length === 0 ? (
          <p className="empty-copy">Nothing has been classified. The raw observation remains untouched.</p>
        ) : (
          <div className="candidate-list">
            {candidates.map((candidate) => (
              <button
                type="button"
                key={candidate.id}
                className={candidate.id === selectedId ? 'candidate-row selected' : 'candidate-row'}
                onClick={() => setSelectedId(candidate.id)}
              >
                <strong>{candidate.id}</strong>
                <span>{candidate.classification}</span>
                <span>{candidate.epistemicStatus}</span>
                <span>{Math.round(candidate.confidence * 100)}%</span>
                <span>{fmt(candidate.frequencyStart, 4)}–{fmt(candidate.frequencyEnd, 4)} MHz</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="signal-panel session-notes">
        <p className="eyebrow">Observation notebook</p>
        <h2>Session note</h2>
        <textarea
          rows="5"
          value={sessionNote}
          onChange={(event) => setSessionNote(event.target.value)}
          placeholder="Instrument state, antenna, gain, weather, local interference, target, on/off cadence, companion stations…"
        />
      </section>

      <footer>
        <strong>Open wonder. Steady hearth. Careful witness.</strong>
        <span>This first slice accepts normalised CSV/JSON points. Native .fil, .h5 and live SDR ingestion belong to the next instrument layer.</span>
      </footer>
    </main>
  );
}
