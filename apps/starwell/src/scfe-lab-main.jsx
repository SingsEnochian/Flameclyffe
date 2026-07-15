import React from 'react';
import { createRoot } from 'react-dom/client';
import { SCFELab } from './components/scfe/SCFELab.jsx';
import { useSecondTicker } from './live-glyph.js';
import './starwell.css';
import './starwell-room.css';
import './grove-state.css';
import './starwell-scale-pass.css';
import './deep-observer-boundary.css';
import './starwell-living-rooms.css';

const OBSERVATORY_TIME_ZONE = 'America/New_York';

function getTimeParts(date = new Date(), timeZone = OBSERVATORY_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const hour = parts.find((part) => part.type === 'hour')?.value || '00';
  const safeHour = hour === '24' ? '00' : hour;
  return { display: `${safeHour}:${parts.find((part) => part.type === 'minute')?.value || '00'}`, hour: Number(safeHour) };
}

function getSkyPhase(hour) {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

function SCFELabApp() {
  const now = useSecondTicker();
  const timeParts = getTimeParts(now);
  const phase = getSkyPhase(timeParts.hour);

  return (
    <main className={`starwell sky-${phase}`}>
      <div className="stars" />
      <section className="observatory-shell">
        <section className="dome">
          <div className="dome-inner">
            <p className="eyebrow">Hearthweave Observatory · SCFE Lab · STARWELL Time {timeParts.display}</p>
            <h1>SCFE</h1>
            <p className="subtitle">A read-only concurrent field lab for Barbault maths, DEEP, somatics, Hearthfire, sacred geometry, and Terra Aeterna.</p>
            <p className="inscription">One moment, many grammars, agency at the throne.</p>
            <p>
              <a
                href="./wardenclyffe-mobius/"
                style={{
                  display: 'inline-block',
                  marginTop: '0.75rem',
                  padding: '0.65rem 1rem',
                  border: '1px solid rgba(231,196,119,.55)',
                  borderRadius: '999px',
                  color: 'inherit',
                  textDecoration: 'none',
                  letterSpacing: '0.08em',
                }}
              >
                Open Wardenclyffe × Möbius Patch Bay
              </a>
            </p>
          </div>
        </section>
        <SCFELab />
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<SCFELabApp />);
