import React from 'react';
import { createRoot } from 'react-dom/client';
import './starwell.css';

const instruments = [
  ['Atlas Telescope', 'Worlds, cities, stations, and regions.'],
  ['Living Codex', 'Lore entries, manuscripts, and wiki pages.'],
  ['Orrery Timeline', 'Eras, events, and story chronology.'],
  ['Beacon Network', 'Discoveries, signals, and anomalies.'],
  ['Observatory Journal', 'Raw sparks, notes, and what-if pages.'],
];

function getSkyPhase(date = new Date()) {
  const hour = date.getHours() + date.getMinutes() / 60;
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

function App() {
  const now = new Date();
  const phase = getSkyPhase(now);
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <main className={`starwell sky-${phase}`}>
      <section className="observatory-shell">
        <p className="eyebrow">Hearthweave Observatory · Local Sky {time}</p>
        <h1>STARWELL</h1>
        <p className="subtitle">A manuscript observatory for worlds that have not happened yet.</p>
        <div className="instrument-grid">
          {instruments.map(([title, text]) => (
            <article className="instrument-card" key={title}>
              <span className="glyph">✦</span>
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
