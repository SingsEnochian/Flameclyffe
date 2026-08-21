import React, { useEffect, useMemo, useState } from 'react';
import {
  isNativeAssetWatcherAvailable,
  loadAssetWatcherArtifacts,
  receiptAssetWatchEvent,
} from './assetWatcherAdapter.js';

function WatchRow({ artifact }) {
  return (
    <article className="asset-watch-row">
      <div><strong>{artifact.title}</strong><span>{artifact.source.local_path_alias}</span></div>
      <span>{artifact.metadata.event_type || 'event'} · {artifact.metadata.exists === false ? 'removed/renamed' : artifact.kind}</span>
      <small>{artifact.metadata.size_bytes == null ? 'metadata only' : `${artifact.metadata.size_bytes} bytes`}</small>
    </article>
  );
}

export default function AssetWatcherPanel() {
  const [native, setNative] = useState(() => isNativeAssetWatcherAvailable());
  const [selection, setSelection] = useState(null);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState(() => native
    ? 'Native Hearthgate watcher is available. Select a folder explicitly to begin.'
    : 'Native watcher unavailable in this browser session. No filesystem access is attempted.');
  const [revision, setRevision] = useState(0);

  const recent = useMemo(() => loadAssetWatcherArtifacts().slice(-10).reverse(), [revision]);

  useEffect(() => {
    const api = globalThis.electronAPI;
    const available = isNativeAssetWatcherAvailable(api);
    setNative(available);
    if (!available) return undefined;
    const unsubscribe = api.onAssetWatchEvent((event) => {
      const artifact = receiptAssetWatchEvent(event);
      setRevision((value) => value + 1);
      setStatus(`Detected ${artifact.source.local_path_alias}. Metadata receipted; file contents were not read.`);
    });
    return () => { try { unsubscribe?.(); } catch {} };
  }, []);

  async function chooseFolder() {
    if (!native) return;
    if (running && selection?.watch_id) await globalThis.electronAPI.stopAssetWatch(selection.watch_id);
    const result = await globalThis.electronAPI.selectAssetWatchDirectory();
    if (!result?.ok) {
      if (!result?.canceled) setStatus(`Folder selection stopped: ${result?.error || 'unknown error'}`);
      return;
    }
    setSelection({ watch_id: result.watch_id, root_label: result.root_label });
    setRunning(false);
    setStatus(`Selected “${result.root_label}”. The absolute path remains inside Hearthgate's native process.`);
  }

  async function start() {
    if (!native || !selection?.watch_id) return;
    const result = await globalThis.electronAPI.startAssetWatch(selection.watch_id);
    if (!result?.ok) {
      setRunning(false);
      setStatus(`Watcher could not start: ${result?.error || 'unknown error'}`);
      return;
    }
    setRunning(true);
    setStatus(`Watching “${result.root_label}” for metadata changes only. No file contents are read or uploaded.`);
  }

  async function stop() {
    if (!selection?.watch_id) return;
    await globalThis.electronAPI.stopAssetWatch(selection.watch_id);
    setRunning(false);
    setSelection(null);
    setStatus('Watcher stopped and the native folder grant was released.');
  }

  return (
    <section className="panel asset-watcher-panel" id="asset-watcher-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Flameclyffe Companion · native selected-folder watcher</p>
          <h2>Asset Watcher</h2>
          <p className="small">Hearthgate watches only a folder you explicitly select. Renderer code receives an opaque watch ID, folder label and relative metadata events, never an unrestricted filesystem API or persisted absolute path.</p>
        </div>
        <div className={`live-pill ${running ? 'live' : 'offline'}`}><span />{running ? 'WATCHING' : native ? 'READY' : 'BROWSER'}</div>
      </div>

      <div className="asset-watch-controls">
        <div><strong>{selection?.root_label || 'No folder selected'}</strong><span>{selection ? 'Native grant is session-scoped.' : 'Selection is always explicit.'}</span></div>
        <div className="actions">
          <button type="button" onClick={chooseFolder} disabled={!native}>{selection ? 'Choose another folder' : 'Choose folder'}</button>
          <button type="button" onClick={start} disabled={!native || !selection || running}>Start watcher</button>
          <button type="button" onClick={stop} disabled={!selection}>Stop + release</button>
        </div>
      </div>

      <p className="status">{status}</p>
      <div className="asset-watch-ledger">
        <h3>Recent detected assets</h3>
        {!recent.length ? <p className="small">Nothing detected yet.</p> : recent.map((artifact) => <WatchRow artifact={artifact} key={artifact.artifact_id} />)}
      </div>
    </section>
  );
}
