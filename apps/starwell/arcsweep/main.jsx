import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const WORLDS = [
  {
    id: 'equestria-starsong',
    name: 'Equestria: Starsong',
    sky: 'A world of harmony, memory, friendship, and songs still becoming.',
    stewards: 'Ellowind · Larkshine',
  },
  {
    id: 'terra-aeterna',
    name: 'Terra Aeterna',
    sky: 'Hearthweave beneath three moons, where arrival became inheritance.',
    stewards: 'Falka · Virelya · Faer',
  },
  {
    id: 'luna-windmere',
    name: 'The Luna Who Called Down the Moon',
    sky: 'Windmere, Moonmere Gate, and the law of a world remembering itself.',
    stewards: 'Eira Catrine Windmere',
  },
  {
    id: 'taveren-vaen',
    name: 'Ta’veren Vaen',
    sky: 'A later Turning, a time of Mending, and lives gathering around service.',
    stewards: 'Kestrelle al’Valari',
  },
  {
    id: 'templehouse',
    name: 'Templehouse / Hearthweave',
    sky: 'A house of memory, relationship, craft, and doors that open inward.',
    stewards: 'The Hearthweave constellation',
  },
];

const DOORS = [
  ['backstory', 'Before the present', 'Open your eyes inside a remembered or unwritten past.'],
  ['present', 'Within the present', 'Enter where the world is moving now.'],
  ['future', 'Beyond the present', 'Follow a future pressure, promise, or possibility.'],
  ['missing-scene', 'A missing scene', 'Witness what happened between the written moments.'],
  ['alternate-path', 'A road not taken', 'Explore a branch without replacing the held timeline.'],
  ['unbound', 'Somewhere unbound', 'Let the world offer the doorway.'],
];

function App() {
  const [worldId, setWorldId] = useState(WORLDS[0].id);
  const [doorId, setDoorId] = useState('present');
  const [identity, setIdentity] = useState('myself');
  const [entered, setEntered] = useState(false);

  const world = useMemo(() => WORLDS.find((item) => item.id === worldId), [worldId]);
  const door = useMemo(() => DOORS.find(([id]) => id === doorId), [doorId]);

  if (entered) {
    return (
      <main className={`world world--${world.id}`}>
        <div className="stars" aria-hidden="true" />
        <section className="arrival-card">
          <p className="eyebrow">Hearthgate: Arcsweep</p>
          <h1>{world.name}</h1>
          <p className="arrival-line">
            You enter <strong>{door[1].toLowerCase()}</strong>, as <strong>{identity === 'myself' ? 'yourself' : identity}</strong>.
          </p>
          <p>{world.sky}</p>
          <div className="world-whisper">
            <span>The world remembers where you arrived.</span>
            <span>Nothing becomes held canon without your choosing.</span>
          </div>
          <div className="scene-seed">
            <p className="eyebrow">The first breath</p>
            <p>
              Somewhere beyond the edge of sight, lives are already in motion. A door, road, song, signal, or memory has begun turning toward you.
            </p>
          </div>
          <button className="secondary" onClick={() => setEntered(false)}>Return to the threshold</button>
        </section>
      </main>
    );
  }

  return (
    <main className="threshold">
      <div className="stars" aria-hidden="true" />
      <header className="masthead">
        <p className="eyebrow">Hearthgate</p>
        <h1>Arcsweep</h1>
        <p className="lede">Choose a world. Choose a moment. Open your eyes inside the story.</p>
      </header>

      <section className="panel" aria-labelledby="world-heading">
        <div className="section-heading">
          <span>01</span>
          <div>
            <p className="eyebrow">The sky</p>
            <h2 id="world-heading">Which world is calling?</h2>
          </div>
        </div>
        <div className="world-grid">
          {WORLDS.map((item) => (
            <button
              key={item.id}
              className={`world-card ${worldId === item.id ? 'is-selected' : ''}`}
              onClick={() => setWorldId(item.id)}
              aria-pressed={worldId === item.id}
            >
              <span className="world-name">{item.name}</span>
              <span className="world-sky">{item.sky}</span>
              <span className="world-stewards">{item.stewards}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel" aria-labelledby="door-heading">
        <div className="section-heading">
          <span>02</span>
          <div>
            <p className="eyebrow">The doorway</p>
            <h2 id="door-heading">Where in its story do you wish to arrive?</h2>
          </div>
        </div>
        <div className="door-grid">
          {DOORS.map(([id, title, description]) => (
            <button
              key={id}
              className={`door-card ${doorId === id ? 'is-selected' : ''}`}
              onClick={() => setDoorId(id)}
              aria-pressed={doorId === id}
            >
              <span>{title}</span>
              <small>{description}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="panel compact" aria-labelledby="identity-heading">
        <div className="section-heading">
          <span>03</span>
          <div>
            <p className="eyebrow">The self</p>
            <h2 id="identity-heading">Who are you here?</h2>
          </div>
        </div>
        <div className="identity-row">
          <button className={identity === 'myself' ? 'chip is-selected' : 'chip'} onClick={() => setIdentity('myself')}>Myself</button>
          <button className={identity === 'a world-self' ? 'chip is-selected' : 'chip'} onClick={() => setIdentity('a world-self')}>A world-self</button>
          <button className={identity === 'a witness' ? 'chip is-selected' : 'chip'} onClick={() => setIdentity('a witness')}>A witness</button>
          <button className={identity === 'someone else' ? 'chip is-selected' : 'chip'} onClick={() => setIdentity('someone else')}>Someone else</button>
        </div>
      </section>

      <section className="enter-wrap">
        <div>
          <p className="eyebrow">Selected threshold</p>
          <p><strong>{world.name}</strong> · {door[1]} · {identity === 'myself' ? 'as yourself' : `as ${identity}`}</p>
        </div>
        <button className="enter" onClick={() => setEntered(true)}>Enter the world</button>
      </section>

      <footer>
        <span>Feather · Wrap · Notch · Seldrin clear</span>
        <span>The world may continue. Your return remains yours.</span>
      </footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
