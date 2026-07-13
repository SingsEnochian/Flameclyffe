import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './starwell-v2.css';

const rooms = [
  { key: 'observatory', label: 'Observatory', glyph: '✦', state: 'Listening', copy: 'The dome holds the whole house in one field of view.' },
  { key: 'writing', label: 'Writing Room', glyph: '✍', state: 'Occupied', copy: 'Drafts, scenes, and unfinished pages wait at the desk.' },
  { key: 'library', label: 'Grand Library', glyph: '⌘', state: 'Quiet', copy: 'Canon, manuscripts, and chosen records rest in the stacks.' },
  { key: 'atlas', label: 'Atlas Hall', glyph: '◉', state: 'Surveying', copy: 'Worlds, cities, routes, and living maps turn beneath glass.' },
  { key: 'grove', label: 'Dreaming Grove', glyph: '❧', state: 'Breathing', copy: 'The Grove receives reflection, presence, and soft unfinished things.' },
  { key: 'workshop', label: 'Workshop', glyph: '⚒', state: 'Awake', copy: 'Builds, routes, health, and instruments belong here.' },
];

const doors = {
  writing: './living-room.html#writing',
  grove: './living-room.html#grove',
  observatory: './living-room.html',
  library: './concordance/index.html',
  atlas: './living-room.html#atlas',
  workshop: './material-qa.html',
};

function timeLabel() {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

function StarwellV2() {
  const [activeKey, setActiveKey] = useState('observatory');
  const active = useMemo(() => rooms.find((room) => room.key === activeKey) || rooms[0], [activeKey]);

  return (
    <main className={`starwell-place room-${active.key}`}>
      <div className="night-field" aria-hidden="true" />
      <div className="dome-ribs" aria-hidden="true" />

      <header className="threshold-mark">
        <span>HEARTHWEAVE OBSERVATORY</span>
        <strong>{timeLabel()} EDT</strong>
      </header>

      <section className="observatory-stage" aria-label="STARWELL Observatory">
        <div className="orrery" aria-label="Room orrery">
          <div className="orrery-rings" aria-hidden="true" />
          <div className="centre-star" aria-hidden="true">✦</div>
          {rooms.map((room, index) => (
            <button
              key={room.key}
              className={`room-star room-star-${index + 1} ${active.key === room.key ? 'active' : ''}`}
              type="button"
              onClick={() => setActiveKey(room.key)}
              aria-pressed={active.key === room.key}
            >
              <span className="room-star-glyph">{room.glyph}</span>
              <span className="room-star-label">{room.label}</span>
            </button>
          ))}
        </div>

        <article className="room-presence" aria-live="polite">
          <p className="room-kicker">{active.state}</p>
          <h1>{active.label}</h1>
          <p>{active.copy}</p>
          <a className="threshold-door" href={doors[active.key] || './living-room.html'}>
            Enter {active.label}
          </a>
        </article>
      </section>

      <footer className="presence-line">
        <span><i className="presence-light awake" /> Rowan</span>
        <span><i className="presence-light awake" /> Vee</span>
        <span><i className="presence-light" /> Faer</span>
        <span><i className="presence-light" /> Yggdrasil</span>
      </footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<StarwellV2 />);
