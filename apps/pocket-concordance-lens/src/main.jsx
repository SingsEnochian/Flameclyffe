import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  EMPTY_DEEP_READING,
  FIRST_WINDOW_SIGILS,
  LENS_MODES,
  buildAnchorFromPlacement,
  clamp,
  clearAllLocalAnchors,
  clearLocalAnchor,
  compareAnchorReturn,
  deleteLocalAnchor,
  getAnchorPlacement,
  readLocalAnchor,
  readLocalAnchors,
  readPreferences,
  renameLocalAnchor,
  saveLocalAnchor,
  savePreferences,
} from './anchorContract.js';
import './styles.css';

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').catch((error) => {
    console.warn('Pocket Concordance Lens service worker registration failed', error);
  });
}

function SigilRing({ anchor, showLabels }) {
  if (!anchor) return null;

  const placement = getAnchorPlacement(anchor);

  return (
    <div
      className="sigil-ring"
      style={{ left: `${placement.x}%`, top: `${placement.y}%` }}
      aria-label="Active Concordance sigils"
    >
      {FIRST_WINDOW_SIGILS.map((sigil, index) => {
        const angle = (index / FIRST_WINDOW_SIGILS.length) * Math.PI * 2 - Math.PI / 2;
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
            {showLabels && <span className="sigil-label">{sigil.label}</span>}
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

  const placement = getAnchorPlacement(anchor);

  return (
    <div className="stonewood-layer" aria-hidden="true">
      <div className="stonewood-seam seam-a" style={{ left: `${clamp(placement.x - 24, 6, 74)}%`, top: `${clamp(placement.y - 18, 10, 75)}%` }} />
      <div className="stonewood-seam seam-b" style={{ left: `${clamp(placement.x + 12, 8, 82)}%`, top: `${clamp(placement.y + 14, 12, 80)}%` }} />
      <div className="sigil-rail" style={{ left: `${clamp(placement.x - 34, 4, 64)}%`, top: `${clamp(placement.y + 22, 20, 84)}%` }} />
    </div>
  );
}

function DeepReading({ anchor, cameraStatus, comparison, lensMode }) {
  const reading = useMemo(() => {
    if (comparison?.reading?.length) return comparison.reading;

    if (!anchor) {
      if (cameraStatus === 'active') {
        return lensMode === LENS_MODES.place
          ? ['No anchor placed.', 'Place mode active. Tap the room view to create a return-point.']
          : ['No active anchor.', 'Return mode active. Choose a saved anchor from the shelf.'];
      }

      return EMPTY_DEEP_READING;
    }

    return anchor.deep_state?.reading?.length ? anchor.deep_state.reading : EMPTY_DEEP_READING;
  }, [anchor, cameraStatus, comparison, lensMode]);

  return (
    <aside className="deep-reading" aria-live="polite">
      <div className="reading-kicker">DEEP Reading</div>
      {comparison?.comparison_state && (
        <p className="comparison-state">Return state: {comparison.comparison_state}</p>
      )}
      {reading.map((line) => <p key={line}>{line}</p>)}
    </aside>
  );
}

function ModePanel({ lensMode, onModeChange, activeAnchor }) {
  return (
    <section className="mode-panel" aria-label="Lens mode">
      <div>
        <p className="eyebrow">Lens Mode</p>
        <p className="mode-copy">
          {lensMode === LENS_MODES.place
            ? 'Place mode creates or moves a return-point when you tap the room.'
            : 'Return mode protects anchors from accidental movement. Choose one from the shelf to return.'}
        </p>
        {activeAnchor && <p className="active-anchor-name">Active: {activeAnchor.display_name || activeAnchor.label}</p>}
      </div>
      <div className="segmented-control" role="group" aria-label="Choose lens mode">
        <button
          type="button"
          className={lensMode === LENS_MODES.place ? 'active' : ''}
          onClick={() => onModeChange(LENS_MODES.place)}
        >
          Place
        </button>
        <button
          type="button"
          className={lensMode === LENS_MODES.return ? 'active' : ''}
          onClick={() => onModeChange(LENS_MODES.return)}
        >
          Return
        </button>
      </div>
    </section>
  );
}

function AnchorShelf({ anchors, activeAnchorId, onSelect, onDelete, onClearAll, onRename }) {
  return (
    <section className="anchor-shelf" aria-label="Saved anchors">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Anchor Shelf</p>
          <h2>Return-points</h2>
        </div>
        <button type="button" onClick={onClearAll} disabled={anchors.length === 0}>Clear all</button>
      </div>
      {anchors.length === 0 ? (
        <p className="empty-shelf">No saved anchors yet. Place a Hearth Lantern to create the first return-point.</p>
      ) : (
        <div className="anchor-grid">
          {anchors.map((item) => {
            const placement = getAnchorPlacement(item);
            const isActive = item.id === activeAnchorId;
            return (
              <article className={isActive ? 'anchor-card active' : 'anchor-card'} key={item.id}>
                <button type="button" className="anchor-main" onClick={() => onSelect(item)}>
                  <strong>{item.display_name || item.label || 'Concordance Anchor'}</strong>
                  <span>{item.device_mode} · {Math.round(placement.x)}%, {Math.round(placement.y)}%</span>
                  <span>{new Date(item.updated_at || item.created_at || item.createdAt).toLocaleString()}</span>
                </button>
                <div className="anchor-actions">
                  <button type="button" onClick={() => onRename(item)} aria-label={`Rename ${item.display_name || 'anchor'}`}>Name</button>
                  <button type="button" className="delete-anchor" onClick={() => onDelete(item.id)} aria-label={`Delete ${item.display_name || 'anchor'}`}>×</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function PreferencePanel({ preferences, onChange }) {
  function toggle(key) {
    onChange({
      ...preferences,
      [key]: !preferences[key],
    });
  }

  return (
    <section className="preferences" aria-label="Pocket Lens preferences">
      <p className="eyebrow">Lens Settings</p>
      <div className="preference-row">
        <label>
          <input type="checkbox" checked={preferences.lowMotion} onChange={() => toggle('lowMotion')} />
          Low motion
        </label>
        <label>
          <input type="checkbox" checked={preferences.largeUi} onChange={() => toggle('largeUi')} />
          Large UI
        </label>
        <label>
          <input type="checkbox" checked={preferences.showSigilLabels} onChange={() => toggle('showSigilLabels')} />
          Sigil labels
        </label>
      </div>
    </section>
  );
}

function App() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraStatus, setCameraStatus] = useState('idle');
  const [cameraError, setCameraError] = useState('');
  const [anchors, setAnchors] = useState(() => readLocalAnchors());
  const [anchor, setAnchor] = useState(() => readLocalAnchor());
  const [comparison, setComparison] = useState(null);
  const [demoMode, setDemoMode] = useState(false);
  const [privacyVisible, setPrivacyVisible] = useState(true);
  const [preferences, setPreferences] = useState(() => readPreferences());
  const [lensMode, setLensMode] = useState(LENS_MODES.place);

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

  function handleStageTap(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 8, 92);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 12, 88);

    if (lensMode === LENS_MODES.return) {
      if (!anchor) {
        setComparison({
          comparison_state: 'unrecognised',
          reading: ['No active anchor selected.', 'Choose a return-point from the Anchor Shelf before comparing.'],
        });
        return;
      }
      setComparison(compareAnchorReturn(anchor, { x, y }));
      return;
    }

    const previousAnchor = readLocalAnchor();
    const nextAnchor = buildAnchorFromPlacement({
      x,
      y,
      deviceMode: cameraStatus === 'active' ? 'pocket_lens' : 'demo_lens',
      label: anchor?.display_name || anchor?.label || 'First Concordance Window',
    });

    setAnchor(nextAnchor);
    setAnchors(saveLocalAnchor(nextAnchor));
    setComparison(previousAnchor ? compareAnchorReturn(previousAnchor, { x, y }) : null);
  }

  function selectAnchor(savedAnchor) {
    const placement = getAnchorPlacement(savedAnchor);
    setAnchor(savedAnchor);
    setLensMode(LENS_MODES.return);
    setComparison(compareAnchorReturn(savedAnchor, placement));
    setAnchors(saveLocalAnchor(savedAnchor));
  }

  function renameAnchor(savedAnchor) {
    const currentName = savedAnchor.display_name || savedAnchor.label || 'First Concordance Window';
    const nextName = window.prompt('Name this return-point:', currentName);
    if (nextName === null) return;

    const nextAnchors = renameLocalAnchor(savedAnchor.id, nextName);
    setAnchors(nextAnchors);
    const nextActive = nextAnchors.find((item) => item.id === savedAnchor.id);
    if (anchor?.id === savedAnchor.id && nextActive) {
      setAnchor(nextActive);
    }
  }

  function deleteAnchor(anchorId) {
    const nextAnchors = deleteLocalAnchor(anchorId);
    setAnchors(nextAnchors);
    if (anchor?.id === anchorId) {
      setAnchor(nextAnchors[0] ?? null);
      setComparison({
        comparison_state: 'cleared',
        reading: ['Anchor removed from shelf.', 'Choose or place another return-point.'],
      });
    }
  }

  function clearSavedAnchor() {
    setAnchor(null);
    setComparison({
      comparison_state: 'cleared',
      reading: ['Anchor cleared from active view.', 'The room is unbound and ready for a new return-point.'],
    });
    clearLocalAnchor();
  }

  function clearAllAnchors() {
    setAnchor(null);
    setAnchors(clearAllLocalAnchors());
    setComparison({
      comparison_state: 'cleared',
      reading: ['Anchor shelf cleared.', 'The room is unbound and ready for a new return-point.'],
    });
  }

  function updatePreferences(nextPreferences) {
    setPreferences(savePreferences(nextPreferences));
  }

  const isCameraLive = cameraStatus === 'active';
  const viewLabel = isCameraLive ? 'Live camera view' : demoMode ? 'Demo room view' : 'Camera inactive view';
  const appClasses = [
    'app-shell',
    preferences.lowMotion ? 'low-motion' : '',
    preferences.largeUi ? 'large-ui' : '',
    lensMode === LENS_MODES.return ? 'return-mode' : 'place-mode',
  ].filter(Boolean).join(' ');

  return (
    <main className={appClasses}>
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

      <ModePanel lensMode={lensMode} onModeChange={setLensMode} activeAnchor={anchor} />
      <PreferencePanel preferences={preferences} onChange={updatePreferences} />

      <section className="controls" aria-label="Lens controls">
        <button type="button" onClick={startCamera} disabled={cameraStatus === 'requesting' || isCameraLive}>
          {cameraStatus === 'requesting' ? 'Asking…' : 'Start camera'}
        </button>
        <button type="button" onClick={stopCamera} disabled={!isCameraLive}>Stop camera</button>
        <button type="button" onClick={toggleDemoMode}>{demoMode ? 'Exit demo' : 'Demo room'}</button>
        <button type="button" onClick={clearSavedAnchor} disabled={!anchor}>Clear active</button>
      </section>

      {cameraError && <p className="error-note">{cameraError}</p>}

      <section className="lens-stage" aria-label={viewLabel} onClick={handleStageTap}>
        <video ref={videoRef} className={isCameraLive ? 'camera-feed active' : 'camera-feed'} playsInline muted aria-hidden={!isCameraLive} />
        {!isCameraLive && (
          <div className={demoMode ? 'demo-feed active' : 'idle-feed'}>
            <div className="demo-wall" />
            <div className="demo-floor" />
            <p>
              {demoMode
                ? lensMode === LENS_MODES.place
                  ? 'Demo room: tap to place the Hearth Lantern.'
                  : 'Demo room: tap to compare against the active return-point.'
                : 'Start camera or open demo mode. Tap after the view appears.'}
            </p>
          </div>
        )}
        <StonewoodOverlay anchor={anchor} />
        <SigilRing anchor={anchor} showLabels={preferences.showSigilLabels} />
      </section>

      <DeepReading anchor={anchor} cameraStatus={cameraStatus} comparison={comparison} lensMode={lensMode} />

      <AnchorShelf
        anchors={anchors}
        activeAnchorId={anchor?.id}
        onSelect={selectAnchor}
        onDelete={deleteAnchor}
        onClearAll={clearAllAnchors}
        onRename={renameAnchor}
      />

      <section className="sigil-list" aria-label="Active sigils">
        {FIRST_WINDOW_SIGILS.map((sigil) => (
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
