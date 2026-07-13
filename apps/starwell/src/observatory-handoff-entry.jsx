import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ObservatoryHandoff } from './components/ObservatoryHandoff.jsx';
import './observatory-handoff.css';

const THREAD_KEY = 'starwell:last-thread:v1';
const fallback = {
  key: 'writing',
  title: 'Writing Room',
  text: 'Active manuscript chamber with drafting, local backup, DEEP Observer metadata, and Publish to Study flow.',
};

const ROOM_KEYS = new Map([
  ['Observer Almanac', 'observer'],
  ['Writing Room', 'writing'],
  ['Grand Library', 'library'],
  ['Atlas Hall', 'atlas'],
  ['Art Studio', 'studio'],
  ['Observer Atelier', 'atelier'],
  ['Orrery Timeline', 'orrery'],
  ['Beacon Network', 'beacons'],
  ['Rowan’s Study', 'hearthlight'],
  ['Faer’s Study', 'faer'],
  ['Virelya’s Lantern Study', 'vee'],
]);

function readHeldRoom() {
  try {
    const held = JSON.parse(window.localStorage.getItem(THREAD_KEY) || 'null');
    return held?.roomKey
      ? { key: held.roomKey, title: held.roomTitle || held.roomKey, text: held.note || '' }
      : fallback;
  } catch {
    return fallback;
  }
}

function roomFromButton(button) {
  const title = button.querySelector('.room-title')?.textContent?.trim();
  if (!title) return null;

  return {
    key: ROOM_KEYS.get(title) || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    title,
    text: button.querySelector('.room-text')?.textContent?.trim() || `Continue in ${title}.`,
  };
}

function findRoomButton(roomKey) {
  return [...document.querySelectorAll('.room-card')].find((button) => {
    const room = roomFromButton(button);
    return room?.key === roomKey;
  });
}

function continueInto(roomKey) {
  const roomButton = findRoomButton(roomKey);

  if (roomButton) {
    roomButton.click();
    roomButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  window.dispatchEvent(new CustomEvent('starwell:continue-thread', { detail: { roomKey } }));
  document.querySelector('.observatory-shell')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function HandoffBridge() {
  const [selected, setSelected] = useState(readHeldRoom);

  useEffect(() => {
    function hearRoomSelection(event) {
      const button = event.target.closest?.('.room-card');
      if (!button) return;
      const room = roomFromButton(button);
      if (room) setSelected(room);
    }

    document.addEventListener('click', hearRoomSelection, true);
    return () => document.removeEventListener('click', hearRoomSelection, true);
  }, []);

  return (
    <ObservatoryHandoff
      now={new Date()}
      selected={selected}
      onContinue={continueInto}
    />
  );
}

function placeInstrument(host) {
  const shell = document.querySelector('.observatory-shell');
  const dome = shell?.querySelector('.dome');
  if (!shell || !dome) return false;

  dome.insertAdjacentElement('afterend', host);
  return true;
}

const host = document.getElementById('observatory-handoff-root');

if (host) {
  const mount = () => {
    if (!placeInstrument(host)) return false;
    createRoot(host).render(<HandoffBridge />);
    return true;
  };

  if (!mount()) {
    const observer = new MutationObserver(() => {
      if (mount()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}
