import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './room-state-instrument.css';

const VISIT_KEY = 'starwell:room-visits:v1';

function readVisits() {
  try {
    return JSON.parse(window.localStorage.getItem(VISIT_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeVisits(visits) {
  try {
    window.localStorage.setItem(VISIT_KEY, JSON.stringify(visits));
  } catch {
    // Instrument remains observational when storage is unavailable.
  }
}

function activeRoomFromDom() {
  const active = document.querySelector('.room-card.active');
  if (!active) return null;

  const title = active.querySelector('.room-title')?.textContent?.trim();
  const text = active.querySelector('.room-text')?.textContent?.trim();
  if (!title) return null;

  return {
    key: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    title,
    text: text || 'A STARWELL chamber is open.',
  };
}

function relativeTime(iso) {
  if (!iso) return 'Not yet visited';
  const delta = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.floor(delta / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function classifyRoom(title) {
  const lower = title.toLowerCase();
  if (lower.includes('writing')) return { state: 'occupied', waiting: 'Drafting chamber active' };
  if (lower.includes('library')) return { state: 'listening', waiting: 'Codex shelves available' };
  if (lower.includes('atlas')) return { state: 'surveying', waiting: 'World registry available' };
  if (lower.includes('observer')) return { state: 'observing', waiting: 'Live instruments awake' };
  if (lower.includes('study')) return { state: 'held', waiting: 'Private continuity shelf' };
  return { state: 'quiet', waiting: 'No urgent thread detected' };
}

function RoomStateInstrument() {
  const [room, setRoom] = useState(() => activeRoomFromDom());
  const [visits, setVisits] = useState(() => readVisits());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const update = () => {
      const next = activeRoomFromDom();
      if (!next) return;

      setRoom((current) => {
        if (current?.title === next.title) return current;
        const updatedVisits = {
          ...readVisits(),
          [next.key]: {
            title: next.title,
            lastVisitedAt: new Date().toISOString(),
            visitCount: (readVisits()[next.key]?.visitCount || 0) + 1,
          },
        };
        writeVisits(updatedVisits);
        setVisits(updatedVisits);
        return next;
      });
    };

    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'], childList: true });
    const interval = window.setInterval(() => setTick((value) => value + 1), 60000);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  const state = useMemo(() => room ? classifyRoom(room.title) : null, [room]);
  const visit = room ? visits[room.key] : null;
  void tick;

  if (!room || !state) return null;

  return (
    <section className="room-state-instrument chamber-card" aria-label="Active room state">
      <div>
        <p className="eyebrow">Room State</p>
        <h2>{room.title}</h2>
        <p>{room.text}</p>
      </div>
      <dl>
        <div><dt>Status</dt><dd>{state.state}</dd></div>
        <div><dt>Waiting</dt><dd>{state.waiting}</dd></div>
        <div><dt>Last visited</dt><dd>{relativeTime(visit?.lastVisitedAt)}</dd></div>
        <div><dt>Visits</dt><dd>{visit?.visitCount || 1}</dd></div>
      </dl>
    </section>
  );
}

function place(host) {
  const shell = document.querySelector('.observatory-shell');
  const handoff = document.querySelector('#observatory-handoff-root');
  if (!shell) return false;

  if (handoff?.parentElement === shell) {
    handoff.insertAdjacentElement('afterend', host);
  } else {
    shell.prepend(host);
  }
  return true;
}

const host = document.getElementById('room-state-instrument-root');
if (host) {
  const mount = () => {
    if (!place(host)) return false;
    createRoot(host).render(<RoomStateInstrument />);
    return true;
  };

  if (!mount()) {
    const observer = new MutationObserver(() => {
      if (mount()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}
