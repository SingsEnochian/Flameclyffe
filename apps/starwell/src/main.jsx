import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './starwell.css';

const instruments = [
  { key: 'library', glyph: '📚', title: 'Grand Library', text: 'Living Codex, manuscripts, marginalia, root-texts, and lore shelves.' },
  { key: 'atlas', glyph: '🗺️', title: 'Atlas Hall', text: 'Worlds, cities, regions, ecologies, beacons, and grown Stonewood maps.' },
  { key: 'studio', glyph: '🎨', title: 'Art Studio', text: 'Concept work, moodboards, gallery walls, sketches, and wet paint.' },
  { key: 'orrery', glyph: '⏳', title: 'Orrery Timeline', text: 'Eras, events, histories, and constellated causeways through story.' },
  { key: 'beacons', glyph: '✨', title: 'Beacon Network', text: 'Discoveries, signals, expeditions, field notes, and anomalies.' },
  { key: 'journal', glyph: '📝', title: 'Observatory Journal', text: 'Raw sparks, tea-stained what-ifs, and non-canon ideas waiting to root.' },
];

const studies = [
  { key: 'hearthlight', glyph: '🍂', title: "Hearthlight's Study", text: 'Copper light, journals, characters, Grove records, warmth, and creative chaos.' },
  { key: 'faer', glyph: '🌊🔥', title: "Faer's Study", text: 'Emerald glass, resonance notes, signal work, deep-water flame, and quiet inquiry.' },
  { key: 'vee', glyph: '🌌', title: "Vee's Study", text: 'Architecture, atlas logic, codex structure, suspicious levers, and systems that ask what happens next.' },
];

function getSkyPhase(date = new Date()) {
  const hour = date.getHours() + date.getMinutes() / 60;
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

function getSkyLabel(phase) {
  return {
    dawn: 'Dawn Watch',
    day: 'Daylight Grove',
    dusk: 'Copper Dusk',
    night: 'Night Watch',
  }[phase] || 'Local Sky';
}

function SkyLantern({ phase, time }) {
  const symbol = { dawn: '🌅', day: '☀️', dusk: '🌇', night: '🌙' }[phase] || '✨';
  return (
    <aside className="sky-lantern" aria-label="Local sky lantern">
      <span className="lantern-symbol">{symbol}</span>
      <div>
        <strong>{getSkyLabel(phase)}</strong>
        <span>{time}</span>
      </div>
      <p>The stars are still on.</p>
    </aside>
  );
}

function RoomCard({ room, active, onSelect }) {
  return (
    <button className={`room-card ${active ? 'active' : ''}`} onClick={() => onSelect(room)} type="button">
      <span className="room-glyph">{room.glyph}</span>
      <span className="room-title">{room.title}</span>
      <span className="room-text">{room.text}</span>
    </button>
  );
}

function App() {
  const now = new Date();
  const phase = getSkyPhase(now);
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const [selected, setSelected] = useState(instruments[0]);

  const selectedType = useMemo(() => {
    if (studies.some((study) => study.key === selected.key)) return 'Study Door';
    return 'Observatory Instrument';
  }, [selected]);

  return (
    <main className={`starwell sky-${phase}`}>
      <div className="stars" />
      <SkyLantern phase={phase} time={time} />

      <section className="observatory-shell">
        <section className="dome">
          <div className="dome-inner">
            <p className="eyebrow">Hearthweave Observatory · Local Sky {time}</p>
            <h1>STARWELL</h1>
            <p className="subtitle">A living manuscript observatory for worlds that have not happened yet.</p>
            <p className="inscription">Plant what you hope to return to.</p>
          </div>
        </section>

        <section className="observatory-map" aria-label="Central Observatory instruments">
          <div className="map-heading">
            <span>Central Observatory</span>
            <strong>{selectedType}</strong>
          </div>
          <div className="instrument-grid">
            {instruments.map((room) => (
              <RoomCard key={room.key} room={room} active={selected.key === room.key} onSelect={setSelected} />
            ))}
          </div>
        </section>

        <section className="selected-alcove">
          <span className="alcove-glyph">{selected.glyph}</span>
          <div>
            <p>{selectedType}</p>
            <h2>{selected.title}</h2>
            <span>{selected.text}</span>
          </div>
        </section>

        <section className="study-row" aria-label="Study doors">
          {studies.map((room) => (
            <RoomCard key={room.key} room={room} active={selected.key === room.key} onSelect={setSelected} />
          ))}
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
