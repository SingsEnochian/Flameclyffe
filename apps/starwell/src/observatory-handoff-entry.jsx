import React from 'react';
import { createRoot } from 'react-dom/client';
import { ObservatoryHandoff } from './components/ObservatoryHandoff.jsx';
import './observatory-handoff.css';

const THREAD_KEY = 'starwell:last-thread:v1';
const fallback = {
  key: 'writing',
  title: 'Writing Room',
  text: 'Active manuscript chamber with drafting, local backup, DEEP Observer metadata, and Publish to Study flow.',
};

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

function continueInto(roomKey) {
  const roomButton = [...document.querySelectorAll('.room-card, button')]
    .find((button) => button.textContent?.toLowerCase().includes(readHeldRoom().title.toLowerCase()));

  if (roomButton) {
    roomButton.click();
    roomButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  window.dispatchEvent(new CustomEvent('starwell:continue-thread', { detail: { roomKey } }));
  document.querySelector('.observatory-shell')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    createRoot(host).render(
      <ObservatoryHandoff
        now={new Date()}
        selected={readHeldRoom()}
        onContinue={continueInto}
      />,
    );
    return true;
  };

  if (!mount()) {
    const observer = new MutationObserver(() => {
      if (mount()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}
