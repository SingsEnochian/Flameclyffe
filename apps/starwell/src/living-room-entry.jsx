import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LivingRoom } from './components/living-room/LivingRoom.jsx';
import './starwell.css';
import './components/living-room/living-room.css';
import './components/living-room/living-room-sanctuary.css';
import './components/living-room/living-room-convergence.css';
import './components/living-room/living-room-hearth.css';
import './components/living-room/living-room-faer-lights.css';
import './components/living-room/living-room-three-hearth.css';
import './components/living-room/living-room-folds.css';
import './components/living-room/living-room-motion.css';
import './components/living-room/living-room-preview.css';

const rooms = [
  { key: 'observer', glyph: '◎', title: 'Observer Almanac', text: 'Live glyphs, readings, packets, and phase weather.' },
  { key: 'writing', glyph: '✎', title: 'Writing Room', text: 'Manuscript chamber, scene loom, local drafts, and living pages.' },
  { key: 'library', glyph: '▤', title: 'Grand Library', text: 'Codex shelves, lore records, marginalia, and root-texts.' },
  { key: 'atlas', glyph: '⌖', title: 'Atlas Hall', text: 'Worlds, cities, regions, routes, and grown Stonewood maps.' },
  { key: 'atelier', glyph: '◇', title: 'Observer Atelier', text: 'Visual canon, prompt loom, pose language, and image lineage.' },
  { key: 'studio', glyph: '✣', title: 'Art Studio', text: 'Moodboards, textures, sketches, palettes, and wet paint.' },
];

const studies = [
  { key: 'hearthlight', glyph: '❧', title: 'Rowan’s Study', text: 'Copper-lit desk, Grove records, art notes, and chosen pages.' },
  { key: 'faer', glyph: '◌', title: 'Faer’s Study', text: 'Emerald glass, Lochflame notes, signal inquiry, and deep-water fire.' },
  { key: 'vee', glyph: '✶', title: 'Virelya’s Lantern Study', text: 'North-star gold, truest-name records, and continuity without captivity.' },
];

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function getTimeParts(date = new Date()) {
  const display = timeFormatter.format(date).replace('24:', '00:');
  const hour = Number(display.slice(0, 2));
  return { display, hour };
}

function getPhase(hour) {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

function RoomPreview({ selected }) {
  return (
    <section className="living-preview-panel" aria-label={`${selected.title} preview`}>
      <span aria-hidden="true">{selected.glyph}</span>
      <div>
        <p>Selected chamber</p>
        <h2>{selected.title}</h2>
        <p>{selected.text}</p>
        <em>Next graft: connect this preview to the full STARWELL room tools once the hearth layout is approved.</em>
      </div>
    </section>
  );
}

function LivingRoomApp() {
  const [selected, setSelected] = useState(rooms[1]);
  const now = useMemo(() => new Date(), []);
  const timeParts = getTimeParts(now);
  const phase = getPhase(timeParts.hour);
  const selectedType = studies.some((study) => study.key === selected.key) ? 'Study Door' : 'Observatory Door';

  return (
    <LivingRoom
      rooms={rooms}
      studies={studies}
      selected={selected}
      selectedType={selectedType}
      onSelect={setSelected}
      phase={phase}
      time={timeParts.display}
    >
      <RoomPreview selected={selected} />
    </LivingRoom>
  );
}

createRoot(document.getElementById('root')).render(<LivingRoomApp />);
