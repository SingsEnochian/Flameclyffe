import React, { useEffect, useState } from 'react';

const API_BASE = 'http://127.0.0.1:4000/api/v1/kernel';

export function PortalKernelPanel() {
  const [seedInput, setSeedInput] = useState('Stonewood_Core');
  const [activeRoom, setActiveRoom] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function fetchActiveRoom() {
    try {
      const res = await fetch(`${API_BASE}/active-room`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not fetch active kernel workspace.');
      if (data.chamberActive) setActiveRoom(data.data || data.roomCard);
      setSyncError(null);
    } catch (err) {
      setSyncError(err.message);
    }
  }

  async function loadSeedCard(event) {
    event.preventDefault();
    const seedToken = seedInput.trim();
    if (!seedToken) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/load-seed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seedToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kernel rejected seed signature.');
      setActiveRoom(data.roomCard);
      setSyncError(null);
    } catch (err) {
      setSyncError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchActiveRoom();
  }, []);

  return (
    <section className="workbench-card portal-kernel-panel">
      <h2>Portal Kernel Module — Seed Preview</h2>

      <form onSubmit={loadSeedCard} className="seed-input-form">
        <label htmlFor="portal-kernel-seed" className="sr-only">Room seed token</label>
        <input
          id="portal-kernel-seed"
          type="text"
          placeholder="Enter room seed, e.g. Stonewood_Core"
          value={seedInput}
          onChange={(event) => setSeedInput(event.target.value)}
          className="mono-input"
          maxLength={80}
        />
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Loading…' : 'Load Chamber Seed'}
        </button>
      </form>

      {syncError && <div className="panel-error-alert">🚨 {syncError}</div>}

      {activeRoom ? (
        <div className="room-seed-card-display">
          <div className="room-card-header">
            <h3>Chamber Card: <code className="text-highlight">{activeRoom.derivedCoordinates}</code></h3>
            <span className="seed-badge-pill">Seed: “{activeRoom.seed}”</span>
          </div>

          <div className="card-metrics-grid">
            <div className="metric-row">
              <span>Scene Weather</span>
              <strong>{activeRoom.environment.weatherScene}</strong>
            </div>
            <div className="metric-row">
              <span>Topology Structure</span>
              <strong>{activeRoom.environment.topologyDensity}</strong>
            </div>
            <div className="metric-row">
              <span>Structural Stability</span>
              <strong className="text-green">{activeRoom.environment.structuralStability}</strong>
            </div>
          </div>

          <div className="audio-driver-control-tray audio-driver-inert">
            <div className="audio-meta">
              <span>Target Audio Tone: <code>{activeRoom.audioProfile.baseFrequency}</code></span>
              <small className="mono-text">Path: {activeRoom.audioProfile.loopAssetPath}</small>
              <small className="mono-text">Playback: {activeRoom.audioProfile.playbackMode}</small>
            </div>
            <span className="status-tag status-metadata-only">Audio metadata only</span>
          </div>
        </div>
      ) : (
        <p className="empty-msg-notice">No environmental seed card active inside the workbench core.</p>
      )}
    </section>
  );
}
