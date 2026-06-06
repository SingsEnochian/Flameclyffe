import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const STORAGE_KEY = 'pocket-concordance-lens-anchor-v0-1';

const SIGILS = [
  { id: 'anchor', label: 'Anchor', glyph: '◎', note: 'Return-point formed' },
  { id: 'witness', label: 'Witness', glyph: '◉', note: 'DEEP is observing' },
  { id: 'waking', label: 'Waking', glyph: '─•', note: 'Physical handle stable' },
  { id: 'gate', label: 'Gate', glyph: 'Ⅱ', note: 'Verge contact listening' },
  { id: 'concordance', label: 'Concordance', glyph: '⊙', note: 'Relation invited' },
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getInitialAnchor() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Could not read saved Concordance anchor', error);
    return null;
  }
}

function saveAnchor(anchor) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(anchor));
}

function clearAnchor() {
  window.localStorage.removeItem(STORAGE_KEY);
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').catch((error) => {
    console.warn('Pocket Concordance Lens service worker registration failed', error);
  });
}

function SigilRing({ anchor }) {
  if (!anchor) return null;

  return (
    <div
      className="sigil-ring"
      style={{ left: `${anchor.x}%`, top: `${anchor.y}%` }}
      aria-label="Active Concordance sigils"
    >
      {SIGILS.map((sigil, index) => {
        const angle = (index / SIGILS.length) * Math.PI * 2 - Math.PI / 2;
        const radius = 92;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        return (
          <div
            className="sigil"
            key={sigil.id}
            title={`${sigil.label}: ${sigil.note}`}
            style={{ transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))` }}
          >
            <span className="sigil-glyph">{sigil.glyph}</span>
            <span className="sigil-label">{sigil.label}</span>
          </div>
        );
      })}
      <div className="hearth-lantern" aria-hidden="true">
        <div className="lantern-core" />
      </div>
    </div>
  );
}

function StonewoodOverlay({ anchor }) {
  if (!anchor) return null;

  return (
    <div className="stonewood-layer" aria-hidden="true">
      <div className="stonewood-seam seam-a" style={{ left: `${clamp(anchor.x - 24, 6, 74)}%`, top: `${clamp(anchor.y - 18, 10, 75)}%` }} />
      <div className="stonewood-seam seam-b" style={{ left: `${clamp(anchor.x + 12, 8, 82)}%`, top: `${clamp(anchor.y + 14, 12, 80)}%` }} />
      <div className="sigil-rail" style={{ left: `${clamp(anchor.x - 34, 4, 64)}%`, top: `${clamp(anchor.y + 22, 20, 84)}%` }} />
    </div>
  );
}

function DeepReading({ anchor, cameraStatus }) {
  const reading = useMemo(() => {
    if (!anchor) {
      return [
        'No anchor placed.',
        cameraStatus === 'active' ? 'Tap the room view to invite relation.' : 'Start the camera or use demo mode.',
      ];
    }

    return [
      'Anchor recognised.',
      'Waking layer stable.',
      'Verge contact listening.',
      'Concordance invited, not forced.',
      'Return-point formed.',
    ];
  }, [anchor, cameraStatus]);

  return (
    <aside className="deep-reading" aria-live="polite">
      <div className="reading-kicker">DEEP Reading</div>
      {reading.map((line) => <p key={line}>{line}</p>)}
    </aside>
  );
}

function App() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraStatus, setCameraStatus] = useState('idle');
  const [cameraError, setCameraError] = useState('');
  const [anchor, setAnchor] = useState(() => getInitialAnchor());
  const [demoMode, setDemoMode] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(true);

  useEffect(() => {
    registerServiceWorker();
    return () => stopCamera();
  }, []);

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not available in this browser. Use demo mode or try Safari/Chrome over HTTPS.');
      setCameraStatus('unsupported');
      return;
    }

    try {
      setCameraError('');
      setCameraStatus('requesting');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setDemoMode(false);
      setCameraStatus('active');
    } catch (error) {
      setCameraError(error?.message || 'Camera permission was denied or unavailable.');
      setCameraStatus('blocked');
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStatus('idle');
  }

  function toggleDemoMode() {
    if (!demoMode) stopCamera();
    setDemoMode((value) => !value);
    setCameraError('');
  }

  function placeAnchor(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 8, 92);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 12, 88);
    const nextAnchor = {
      id: `local-anchor-${Date.now()}`,
      x,
      y,
      label: 'First Concordance Window',
      sigils: SIGILS.map((sigil) => sigil.id),
      layer: 'waking_world',
      relation: 'terra_aeterna_verge_contact',
      createdAt: new Date().toISOString(),
    };
    setAnchor(nextAnchor);
    saveAnchor(nextAnchor);
  }

  function clearSavedAnchor() {
    setAnchor(null);
    clearAnchor();
  }

  const isCameraLive = cameraStatus === 'active';
  const viewLabel = isCameraLive ? 'Live camera view' : demoMode ? 'Demo room view' : 'Camera inactive view';

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Pocket Concordance Lens</p>
          <h1>First Concordance Window</h1>
        </div>
        <div className={`camera-pill ${isCameraLive ? 'live' : ''}`}>
          {isCameraLive ? 'Camera active' : demoMode ? 'Demo mode' : 'Private idle'}
        </div>
      </header>

      {privacyVisible && (
        <section className="privacy-card">
          <button className="close-card" type="button" onClick={() => setPrivacyVisible(false)} aria-label="Dismiss privacy note">×</button>
          <strong>Private-first camera rule:</strong> camera access is explicit, visible, and never recorded by this prototype. Saved anchors stay in this browser for now.
        </section>
      )}

      <section className="controls" aria-label="Lens controls">
        <button type="button" onClick={startCamera} disabled={cameraStatus === 'requesting' || isCameraLive}>
          {cameraStatus === 'requesting' ? 'Asking…' : 'Start camera'}
        </button>
        <button type="button" onClick={stopCamera} disabled={!isCameraLive}>Stop camera</button>
        <button type="button" onClick={toggleDemoMode}>{demoMode ? 'Exit demo' : 'Demo room'}</button>
        <button type="button" onClick={clearSavedAnchor} disabled={!anchor}>Clear anchor</button>
      </section>

      {cameraError && <p className="error-note">{cameraError}</p>}

      <section className="lens-stage" aria-label={viewLabel} onClick={placeAnchor}>
        <video ref={videoRef} className={isCameraLive ? 'camera-feed active' : 'camera-feed'} playsInline muted aria-hidden={!isCameraLive} />
        {!isCameraLive && (
          <div className={demoMode ? 'demo-feed active' : 'idle-feed'}>
            <div className="demo-wall" />
            <div className="demo-floor" />
            <p>{demoMode ? 'Demo room: tap to place the Hearth Lantern.' : 'Start camera or open demo mode. Tap after the view appears.'}</p>
          </div>
        )}
        <StonewoodOverlay anchor={anchor} />
        <SigilRing anchor={anchor} />
      </section>

      <DeepReading anchor={anchor} cameraStatus={cameraStatus} />

      <section className="sigil-list" aria-label="Active sigils">
        {SIGILS.map((sigil) => (
          <article key={sigil.id}>
            <span>{sigil.glyph}</span>
            <div>
              <strong>{sigil.label}</strong>
              <p>{sigil.note}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
