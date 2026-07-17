import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  SIGNAL_SOURCE_ARRAY,
  selectedSources as resolveSelectedSources,
  sourceArrayCoverage,
} from './signalSourceRegistry.js';
import {
  buildRecordingReceipt,
  buildSnapshotRecord,
  chooseRecorderMimeType,
  makeRecordingSessionId,
} from './signalRecorderModel.js';
import './signal-source-array.css';

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function downloadJson(filename, value) {
  downloadBlob(filename, new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
}

async function sha256Blob(blob) {
  if (!globalThis.crypto?.subtle) return null;
  const digest = await globalThis.crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

function safeFilename(value) {
  return String(value || 'signal-recording').replace(/[^a-z0-9._-]+/gi, '-').replace(/-+/g, '-');
}

function SourceCard({ source, selected, onToggle }) {
  return (
    <article className={selected ? 'array-source-card selected' : 'array-source-card'}>
      <div className="array-source-heading">
        <label className="array-source-choice">
          <input type="checkbox" checked={selected} onChange={() => onToggle(source.id)} />
          <span>{source.name}</span>
        </label>
        <span className={`availability availability-${source.availability}`}>{source.availability}</span>
      </div>
      <p className="array-provider">{source.provider}</p>
      <p className="array-description">{source.description}</p>
      <div className="array-source-facts">
        <span><small>Band</small>{source.frequencyLabel}</span>
        <span><small>Cadence</small>{source.cadence}</span>
      </div>
      <div className="array-tags" aria-label={`${source.name} signal families`}>
        {source.families.map((family) => <span key={family}>{family}</span>)}
      </div>
      <div className="array-card-actions">
        <a href={source.openUrl} target="_blank" rel="noreferrer">Open source</a>
        <a href={source.officialUrl} target="_blank" rel="noreferrer">Source notes</a>
      </div>
    </article>
  );
}

export default function SignalSourceArray() {
  const [selectedIds, setSelectedIds] = useState(() => SIGNAL_SOURCE_ARRAY.map((source) => source.id));
  const [recording, setRecording] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [message, setMessage] = useState('All available source families are selected.');
  const [recordingBlob, setRecordingBlob] = useState(null);
  const [recordingReceipt, setRecordingReceipt] = useState(null);
  const [snapshotCount, setSnapshotCount] = useState(0);
  const [notes, setNotes] = useState('');

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const snapshotTimerRef = useRef(null);
  const snapshotsRef = useRef([]);
  const sessionRef = useRef(null);

  const selectedSources = useMemo(() => resolveSelectedSources(selectedIds), [selectedIds]);
  const coverage = useMemo(() => sourceArrayCoverage(selectedSources), [selectedSources]);
  const machineFeedCount = selectedSources.filter((source) => source.dataEndpoints?.length).length;

  const toggleSource = (sourceId) => {
    setSelectedIds((current) => current.includes(sourceId)
      ? current.filter((id) => id !== sourceId)
      : [...current, sourceId]);
  };

  const captureMachineSnapshots = async (sources = selectedSources) => {
    const targets = sources.flatMap((source) => (source.dataEndpoints || []).map((endpoint) => ({ source, endpoint })));
    if (targets.length === 0) return [];

    const captured = await Promise.all(targets.map(async ({ source, endpoint }) => {
      const capturedAt = new Date().toISOString();
      try {
        const response = await fetch(endpoint, { cache: 'no-store' });
        const body = await response.text();
        return buildSnapshotRecord({
          sourceId: source.id,
          endpoint,
          capturedAt,
          status: response.status,
          body,
          error: response.ok ? null : `HTTP ${response.status}`,
        });
      } catch (error) {
        return buildSnapshotRecord({
          sourceId: source.id,
          endpoint,
          capturedAt,
          status: 0,
          body: '',
          error: error.message,
        });
      }
    }));

    snapshotsRef.current = [...snapshotsRef.current, ...captured];
    setSnapshotCount(snapshotsRef.current.length);
    return captured;
  };

  const saveSnapshotBundle = async () => {
    const sources = selectedSources;
    setMessage('Capturing machine-readable feeds…');
    snapshotsRef.current = [];
    const snapshots = await captureMachineSnapshots(sources);
    const bundle = {
      schemaVersion: '0.1.0',
      datasetKind: 'signal_well_source_array_snapshot',
      capturedAt: new Date().toISOString(),
      selectedSources: sources.map(({ id, name, provider, officialUrl }) => ({ id, name, provider, officialUrl })),
      snapshots,
    };
    downloadJson(`signal-well-array-snapshot-${Date.now()}.json`, bundle);
    setMessage(`${snapshots.length} machine-feed snapshot${snapshots.length === 1 ? '' : 's'} saved.`);
  };

  const stopRecording = () => {
    if (!recording) return;
    clearInterval(timerRef.current);
    clearInterval(snapshotTimerRef.current);
    timerRef.current = null;
    snapshotTimerRef.current = null;
    if (recorderRef.current?.state !== 'inactive') recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    setRecording(false);
  };

  const startRecording = async () => {
    if (selectedSources.length === 0) {
      setMessage('Select at least one source before recording.');
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia || !globalThis.MediaRecorder) {
      setMessage('This browser does not expose display-media recording.');
      return;
    }

    try {
      setRecordingBlob(null);
      setRecordingReceipt(null);
      snapshotsRef.current = [];
      setSnapshotCount(0);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30, max: 60 } },
        audio: true,
      });
      const mimeType = chooseRecorderMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const startedAt = new Date();
      const sessionId = makeRecordingSessionId(startedAt);
      const sourcesAtStart = selectedSources.map((source) => ({ ...source }));

      streamRef.current = stream;
      recorderRef.current = recorder;
      sessionRef.current = { sessionId, startedAt, sourcesAtStart, mimeType: recorder.mimeType || mimeType || 'video/webm' };

      recorder.addEventListener('dataavailable', (event) => {
        if (event.data?.size) chunksRef.current.push(event.data);
      });

      recorder.addEventListener('stop', async () => {
        const endedAt = new Date();
        const session = sessionRef.current;
        const blob = new Blob(chunksRef.current, { type: session.mimeType || 'video/webm' });
        const digest = await sha256Blob(blob);
        const duration = Math.max(0, endedAt.getTime() - session.startedAt.getTime());
        const filename = `${safeFilename(session.sessionId)}.webm`;
        const receipt = buildRecordingReceipt({
          sessionId: session.sessionId,
          selectedSources: session.sourcesAtStart,
          startedAt: session.startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          durationMs: duration,
          media: {
            filename,
            mimeType: blob.type || session.mimeType,
            byteLength: blob.size,
            sha256: digest,
            captureMode: 'display-media-with-audio-requested',
          },
          snapshots: snapshotsRef.current,
          notes,
        });
        setDurationMs(duration);
        setRecordingBlob({ blob, filename });
        setRecordingReceipt(receipt);
        setMessage(`Recording held locally: ${(blob.size / 1024 / 1024).toFixed(2)} MB, ${snapshotsRef.current.length} data snapshots.`);
      });

      stream.getTracks().forEach((track) => track.addEventListener('ended', stopRecording, { once: true }));
      recorder.start(5000);
      setRecording(true);
      setDurationMs(0);
      setMessage('Recording the selected display surface and polling machine feeds every 60 seconds.');

      await captureMachineSnapshots(sourcesAtStart);
      timerRef.current = setInterval(() => {
        setDurationMs(Date.now() - startedAt.getTime());
      }, 1000);
      snapshotTimerRef.current = setInterval(() => {
        captureMachineSnapshots(sourcesAtStart);
      }, 60000);
    } catch (error) {
      setRecording(false);
      setMessage(`Recording did not start: ${error.message}`);
    }
  };

  useEffect(() => () => {
    clearInterval(timerRef.current);
    clearInterval(snapshotTimerRef.current);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  return (
    <section className="signal-panel source-array-panel" aria-labelledby="source-array-title">
      <div className="array-title-row">
        <div>
          <p className="eyebrow">Signal source array</p>
          <h2 id="source-array-title">Listen across the whole field</h2>
          <p className="array-intro">{selectedSources.length} sources selected · {coverage.length} signal families · {machineFeedCount} machine-readable live feed{machineFeedCount === 1 ? '' : 's'}.</p>
        </div>
        <div className="array-master-actions">
          <button type="button" onClick={() => setSelectedIds(SIGNAL_SOURCE_ARRAY.map((source) => source.id))}>Select all</button>
          <button type="button" onClick={() => setSelectedIds([])}>Clear</button>
          <button type="button" onClick={saveSnapshotBundle} disabled={machineFeedCount === 0 || recording}>Snapshot data feeds</button>
        </div>
      </div>

      <div className="array-recorder">
        <div className={recording ? 'record-lamp recording' : 'record-lamp'} aria-hidden="true" />
        <div className="recorder-status">
          <strong>{recording ? 'Recording' : recordingBlob ? 'Recording complete' : 'Recorder ready'}</strong>
          <span>{formatDuration(durationMs)} · {snapshotCount} data snapshots</span>
          <small>{message}</small>
        </div>
        <div className="recorder-actions">
          {!recording ? (
            <button className="record-button" type="button" onClick={startRecording}>Start whole-array recording</button>
          ) : (
            <button className="stop-button" type="button" onClick={stopRecording}>Stop recording</button>
          )}
          <button type="button" disabled={!recordingBlob} onClick={() => downloadBlob(recordingBlob.filename, recordingBlob.blob)}>Save WebM</button>
          <button type="button" disabled={!recordingReceipt} onClick={() => downloadJson(`${safeFilename(recordingReceipt?.sessionId)}-receipt.json`, recordingReceipt)}>Save receipt</button>
        </div>
      </div>

      <label className="array-notes">
        Recording note
        <textarea rows="3" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Targets, expected events, antenna state, local conditions, comparisons, timing…" />
      </label>

      <div className="source-array-grid">
        {SIGNAL_SOURCE_ARRAY.map((source) => (
          <SourceCard key={source.id} source={source} selected={selectedIds.includes(source.id)} onToggle={toggleSource} />
        ))}
      </div>
    </section>
  );
}
