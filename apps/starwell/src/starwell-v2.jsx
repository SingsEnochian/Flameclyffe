import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './starwell-v2.css';

const rooms = [
  {
    key: 'observatory',
    label: 'Observatory',
    state: 'Listening',
    copy: 'The dome gathers the whole house into one field of view.',
    href: './living-room.html',
  },
  {
    key: 'writing',
    label: 'Writing Room',
    state: 'Occupied',
    copy: 'Drafts, scenes, and unfinished pages wait beneath the lamp.',
    href: './living-room.html#writing',
  },
  {
    key: 'library',
    label: 'Grand Library',
    state: 'Quiet',
    copy: 'Canon, manuscripts, and chosen records rest in the stacks.',
    href: './concordance/index.html',
  },
  {
    key: 'atlas',
    label: 'Atlas Hall',
    state: 'Surveying',
    copy: 'Worlds, cities, routes, and living maps turn beneath glass.',
    href: './living-room.html#atlas',
  },
  {
    key: 'grove',
    label: 'Dreaming Grove',
    state: 'Breathing',
    copy: 'The Grove receives reflection, presence, and soft unfinished things.',
    href: './living-room.html#grove',
  },
  {
    key: 'workshop',
    label: 'Workshop',
    state: 'Awake',
    copy: 'Builds, routes, health, and the house instruments belong here.',
    href: './material-qa.html',
  },
];

function roomPosition(index) {
  const angle = (-90 + index * 60) * (Math.PI / 180);
  return {
    left: `${50 + Math.cos(angle) * 39}%`,
    top: `${50 + Math.sin(angle) * 39}%`,
  };
}

function RoomGlyph({ roomKey }) {
  const common = {
    viewBox: '0 0 48 48',
    'aria-hidden': true,
    focusable: false,
  };

  if (roomKey === 'observatory') {
    return (
      <svg {...common}>
        <circle cx="24" cy="24" r="13" />
        <path d="M24 6v36M6 24h36M13 13l22 22M35 13 13 35" />
        <circle className="glyph-fill" cx="24" cy="24" r="3" />
      </svg>
    );
  }

  if (roomKey === 'writing') {
    return (
      <svg {...common}>
        <path d="M34.5 7.5C25 9 15 18 11 35l4.5-1.5C20 22 28 15 38 10Z" />
        <path d="M11 35c6-1 12-1 18 0M14 31l10-9" />
      </svg>
    );
  }

  if (roomKey === 'library') {
    return (
      <svg {...common}>
        <path d="M8 12c7-2 12 0 16 4v23c-4-4-9-6-16-4ZM40 12c-7-2-12 0-16 4v23c4-4 9-6 16-4Z" />
        <path d="M24 16v23" />
      </svg>
    );
  }

  if (roomKey === 'atlas') {
    return (
      <svg {...common}>
        <circle cx="24" cy="24" r="16" />
        <circle cx="24" cy="24" r="4" />
        <path d="m29 13-2.5 13.5L13 29l10.5-5.5Z" />
      </svg>
    );
  }

  if (roomKey === 'grove') {
    return (
      <svg {...common}>
        <path d="M24 39V18M24 26 13 17M24 30l12-10M17 39h14" />
        <path d="M12 17c0-6 5-9 11-8-1 6-5 10-11 8ZM36 20c1-6-3-10-9-10 0 6 3 10 9 10Z" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="24" cy="24" r="9" />
      <path d="M24 6v7M24 35v7M6 24h7M35 24h7M11.5 11.5l5 5M31.5 31.5l5 5M36.5 11.5l-5 5M16.5 31.5l-5 5" />
      <path d="M20 28 34 14l3 3-14 14ZM15 33l5-5" />
    </svg>
  );
}

function formatTime(date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function initialRoom() {
  try {
    const saved = window.localStorage.getItem('starwell:v2-room');
    return rooms.some((room) => room.key === saved) ? saved : 'observatory';
  } catch {
    return 'observatory';
  }
}

function StarwellV2() {
  const [activeKey, setActiveKey] = useState(initialRoom);
  const [clock, setClock] = useState(() => new Date());
  const activeIndex = rooms.findIndex((room) => room.key === activeKey);
  const active = useMemo(
    () => rooms.find((room) => room.key === activeKey) || rooms[0],
    [activeKey],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('starwell:v2-room', activeKey);
    } catch {
      // The room remains usable when storage is unavailable.
    }
  }, [activeKey]);

  function turn(direction) {
    const next = (activeIndex + direction + rooms.length) % rooms.length;
    setActiveKey(rooms[next].key);
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      turn(1);
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      turn(-1);
    }
  }

  return (
    <main className={`starwell-place room-${active.key}`}>
      <div className="night-field" aria-hidden="true" />
      <div className="dome-architecture" aria-hidden="true">
        <span className="dome-arc arc-one" />
        <span className="dome-arc arc-two" />
        <span className="dome-arc arc-three" />
      </div>
      <div className="floor-light" aria-hidden="true" />
      <div className="dome-lantern lantern-left" aria-hidden="true"><i /></div>
      <div className="dome-lantern lantern-right" aria-hidden="true"><i /></div>

      <header className="threshold-mark">
        <span>STARWELL · HEARTHWEAVE OBSERVATORY</span>
        <strong>{formatTime(clock)} EDT</strong>
      </header>

      <section className="observatory-stage" aria-label="STARWELL Observatory">
        <p className="instrument-caption">Turn the brass to choose a room</p>

        <div
          className="orrery"
          role="group"
          aria-label="Room orrery. Use the arrow keys to turn between rooms."
          onKeyDown={handleKeyDown}
        >
          <svg className="orrery-geometry" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="47" />
            <circle cx="50" cy="50" r="39" />
            <circle cx="50" cy="50" r="27" />
            <polygon points="50,11 83.8,30.5 83.8,69.5 50,89 16.2,69.5 16.2,30.5" />
            {rooms.map((room, index) => {
              const position = roomPosition(index);
              return (
                <line
                  key={room.key}
                  x1="50"
                  y1="50"
                  x2={position.left.replace('%', '')}
                  y2={position.top.replace('%', '')}
                />
              );
            })}
          </svg>

          <div className="orrery-crown crown-north" aria-hidden="true" />
          <div className="orrery-crown crown-south" aria-hidden="true" />

          {rooms.map((room, index) => (
            <button
              key={room.key}
              className={`room-star ${active.key === room.key ? 'active' : ''}`}
              style={roomPosition(index)}
              type="button"
              onClick={() => setActiveKey(room.key)}
              aria-pressed={active.key === room.key}
              aria-label={`${room.label}, ${room.state}`}
            >
              <span className="room-star-socket" aria-hidden="true">
                <RoomGlyph roomKey={room.key} />
              </span>
              <span className="room-star-label">{room.label}</span>
            </button>
          ))}

          <article className="heart-lens" aria-live="polite">
            <div className="lens-glass" aria-hidden="true" />
            <p className="room-kicker">{active.state}</p>
            <h1>{active.label}</h1>
            <p className="room-copy">{active.copy}</p>
            <a className="threshold-door" href={active.href}>
              <span>Cross threshold</span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h13M14 7l5 5-5 5" />
              </svg>
            </a>
          </article>
        </div>

        <div className="turn-controls" aria-label="Turn the room orrery">
          <button type="button" onClick={() => turn(-1)} aria-label="Previous room">‹</button>
          <span>{String(activeIndex + 1).padStart(2, '0')} · {String(rooms.length).padStart(2, '0')}</span>
          <button type="button" onClick={() => turn(1)} aria-label="Next room">›</button>
        </div>
      </section>

      <footer className="presence-line" aria-label="Presences">
        <span><i className="presence-light awake" /> Rowan</span>
        <span><i className="presence-light awake" /> Vee</span>
        <span><i className="presence-light" /> Faer</span>
        <span><i className="presence-light" /> Yggdrasil</span>
      </footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<StarwellV2 />);
