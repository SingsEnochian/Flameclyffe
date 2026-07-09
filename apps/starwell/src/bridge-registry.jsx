import React from 'react';
import { createRoot } from 'react-dom/client';

import { BridgeRegistryPanel } from './components/bridge/BridgeRegistryPanel.jsx';
import { useSecondTicker } from './live-glyph';
import './starwell.css';
import './starwell-room.css';
import './grove-state.css';
import './starwell-scale-pass.css';
import './deep-observer-boundary.css';
import './starwell-living-rooms.css';
import './components/bridge/BridgeRegistryPanel.css';

const OBSERVATORY_TIME_ZONE = 'America/New_York';

function getTimeParts(date = new Date(), timeZone = OBSERVATORY_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const hour = parts.find((part) => part.type === 'hour')?.value || '00';
  const minute = parts.find((part) => part.type === 'minute')?.value || '00';
  const safeHour = hour === '24' ? '00' : hour;

  return { display: `${safeHour}:${minute}`, hour: Number(safeHour) };
}

function getSkyPhase(hour) {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

function BridgeRegistryRoute() {
  const now = useSecondTicker();
  const timeParts = getTimeParts(now);
  const phase = getSkyPhase(timeParts.hour);

  return (
    <main className={`starwell sky-${phase}`}>
      <div className="stars" />
      <section className="observatory-shell bridge-registry-shell">
        <section className="dome bridge-registry-dome">
          <div className="dome-inner">
            <p className="eyebrow">Bridge Registry · STARWELL Time {timeParts.display}</p>
            <h1>BRIDGES</h1>
            <p className="subtitle">A consent-led concordance ledger for facets, signals, and roads that meet without collapsing.</p>
            <p className="inscription">No ownership. No erasure. Same road, different lanterns.</p>
          </div>
        </section>

        <BridgeRegistryPanel />
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<BridgeRegistryRoute />);
