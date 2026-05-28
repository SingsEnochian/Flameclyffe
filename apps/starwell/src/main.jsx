import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { hasSupabaseConfig, supabase } from './lib/supabase';
import { LiveGlyphViewer, useSecondTicker } from './live-glyph';
import { ObservatoryInstrument } from './components/ObservatoryInstrument.jsx';
import { VarutoraLeaf } from './components/living/VarutoraLeaf.jsx';
import { WriterRoom } from './components/writer/WriterRoom.jsx';
import './starwell.css';
import './starwell-room.css';

const instruments = [
  { key: 'observer', glyph: '🜂', title: 'Observer Almanac', text: 'Live glyph viewer, quanta packets, consent-aware observations, Kelyran leaves, and per-second TAO signal work.' },
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

const atlasSeeds = [
  {
    glyph: '🌍',
    title: 'Terra Aeterna',
    type: 'World Seed',
    text: 'Primary STARWELL anchor world for Rowan and Vee scope.',
    status: 'Active',
    children: [
      { glyph: '🔭', title: 'Hearthweave Observatory', type: 'Location Seed', status: 'Rooted' },
    ],
  },
  {
    glyph: '🌳',
    title: 'Stonewood Principle',
    type: 'Civic Seed',
    text: 'Cities are cultivated, shaped, tended, and inherited rather than manufactured.',
    status: 'Spark',
    children: [],
  },
];

const fallbackCodexEntries = [
  {
    id: 'stonewood-principle-fallback',
    slug: 'stonewood-principle',
    title: 'Stonewood Principle',
    entry_type: 'note',
    excerpt: 'Cities are cultivated, shaped, tended, and inherited rather than manufactured.',
    visibility: 'private',
    tags: ['starwell', 'fallback'],
    body_md: 'Cities are cultivated, shaped, tended, and inherited rather than manufactured.',
    metadata: {},
  },
];

const fallbackCounts = {
  world: 1,
  location: 1,
  character: 0,
  artifact: 0,
  discovery: 0,
  note: 1,
};

const codexShelves = [
  { key: 'world', label: 'Worlds', glyph: '🌍', table: 'starwell_worlds' },
  { key: 'location', label: 'Locations', glyph: '🔭', table: 'starwell_locations' },
  { key: 'character', label: 'Characters', glyph: '🧭', table: 'starwell_characters' },
  { key: 'artifact', label: 'Artifacts', glyph: '🏺', table: 'starwell_artifacts' },
  { key: 'discovery', label: 'Discoveries', glyph: '✨', table: 'starwell_discovery_logs' },
  { key: 'note', label: 'Notes', glyph: '📝', table: 'starwell_codex_entries' },
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

function mapAtlasRows(worlds, locations) {
  return worlds.map((world) => {
    const children = locations
      .filter((location) => location.world_id === world.id)
      .map((location) => ({
        glyph: '🔭',
        title: location.name,
        type: `${location.location_type || 'Location'} · ${location.status || 'draft'}`,
        status: location.status || 'draft',
      }));

    return {
      glyph: '🌍',
      title: world.name,
      type: `${world.world_type || 'World'} · ${world.status || 'draft'}`,
      text: world.summary || 'A STARWELL world seed awaiting its first notes.',
      status: world.status || 'draft',
      children,
    };
  });
}

function AtlasSeedPanel() {
  const [atlasRows, setAtlasRows] = useState([]);
  const [atlasState, setAtlasState] = useState(hasSupabaseConfig ? 'loading' : 'fallback');

  useEffect(() => {
    let cancelled = false;

    async function loadAtlas() {
      if (!supabase) return;

      const [{ data: worlds, error: worldError }, { data: locations, error: locationError }] = await Promise.all([
        supabase
          .from('starwell_worlds')
          .select('id, slug, name, world_type, status, summary, visibility, metadata, created_at')
          .order('created_at', { ascending: true }),
        supabase
          .from('starwell_locations')
          .select('id, world_id, slug, name, location_type, status, summary, visibility, metadata, created_at')
          .order('created_at', { ascending: true }),
      ]);

      if (cancelled) return;

      if (worldError || locationError) {
        setAtlasState('fallback');
        return;
      }

      const mappedRows = mapAtlasRows(worlds || [], locations || []);
      setAtlasRows(mappedRows);
      setAtlasState(mappedRows.length ? 'live' : 'empty');
    }

    loadAtlas();

    return () => {
      cancelled = true;
    };
  }, []);

  const displayRows = atlasRows.length ? atlasRows : atlasSeeds;
  const statusLabel = {
    loading: 'Listening for roots',
    live: 'Live Supabase Atlas',
    empty: 'Awaiting first world',
    fallback: 'Local seed fallback',
  }[atlasState];

  return (
    <section className="atlas-seed-panel chamber-card" aria-label="First living atlas seeds">
      <div className="map-heading compact">
        <span>World Seeds</span>
        <strong>{statusLabel}</strong>
      </div>
      <div className="seed-grid">
        {displayRows.map((seed) => (
          <article className="seed-card" key={seed.title}>
            <span className="seed-glyph">{seed.glyph}</span>
            <div>
              <p>{seed.type} · {seed.status}</p>
              <h3>{seed.title}</h3>
              <span>{seed.text}</span>
              {seed.children?.length > 0 && (
                <ul className="seed-children" aria-label={`${seed.title} linked locations`}>
                  {seed.children.map((child) => (
                    <li key={child.title}>
                      <span>{child.glyph}</span>
                      <strong>{child.title}</strong>
                      <em>{child.type}</em>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function getEntryPreview(entry) {
  return entry.excerpt || entry.body_md || entry.body_html || 'This codex page is awake, but still waiting for its first full note.';
}

function createLocalEntry() {
  return {
    id: `local-new-${Date.now()}`,
    slug: '',
    title: 'Untitled leaf',
    entry_type: 'note',
    excerpt: '',
    body_md: 'Begin where the signal warms.',
    body_html: null,
    body_json: {},
    font_theme: {},
    tags: ['starwell', 'draft'],
    visibility: 'private',
    metadata: {
      local_only: true,
      source: 'starwell-grand-library-new-leaf',
    },
    local_only: true,
  };
}

function CodexShelf({ now }) {
  const [entries, setEntries] = useState([]);
  const [counts, setCounts] = useState({});
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [codexState, setCodexState] = useState(hasSupabaseConfig ? 'loading' : 'fallback');
  const [mode, setMode] = useState('read');

  useEffect(() => {
    let cancelled = false;

    async function loadCodex() {
      if (!supabase) return;

      const entryRequest = supabase
        .from('starwell_codex_entries')
        .select('id, slug, title, entry_type, excerpt, body_md, body_html, body_json, font_theme, tags, visibility, metadata, created_at, updated_at')
        .order('created_at', { ascending: true });

      const countRequests = codexShelves.map((shelf) =>
        supabase.from(shelf.table).select('id', { count: 'exact', head: true })
      );

      const [entryResult, ...countResults] = await Promise.all([entryRequest, ...countRequests]);

      if (cancelled) return;

      if (entryResult.error || countResults.some((result) => result.error)) {
        setEntries(fallbackCodexEntries);
        setCounts(fallbackCounts);
        setSelectedEntry(fallbackCodexEntries[0]);
        setCodexState('fallback');
        return;
      }

      const liveCounts = codexShelves.reduce((nextCounts, shelf, index) => {
        nextCounts[shelf.key] = countResults[index]?.count || 0;
        return nextCounts;
      }, {});

      const liveEntries = entryResult.data || [];
      setCounts(liveCounts);
      setEntries(liveEntries);
      setSelectedEntry(liveEntries[0] || null);
      setCodexState(liveEntries.length ? 'live' : 'empty');
    }

    loadCodex();

    return () => {
      cancelled = true;
    };
  }, []);

  const displayEntries = entries.length ? entries : fallbackCodexEntries;
  const displayCounts = codexState === 'fallback' ? fallbackCounts : counts;
  const activeEntry = selectedEntry || displayEntries[0];
  const statusLabel = {
    loading: 'Listening for pages',
    live: 'Live Supabase Codex',
    empty: 'Shelves awaiting pages',
    fallback: 'Local codex fallback',
  }[codexState];

  function selectEntry(entry) {
    setSelectedEntry(entry);
    setMode('read');
  }

  function startNewLeaf() {
    const nextEntry = createLocalEntry();
    setEntries((current) => [nextEntry, ...current.filter((item) => !item.local_only)]);
    setSelectedEntry(nextEntry);
    setMode('write');
  }

  function handleSaved(savedEntry) {
    setEntries((current) => {
      const withoutLocal = current.filter((entry) => !entry.local_only);
      const exists = withoutLocal.some((entry) => entry.id === savedEntry.id);
      return exists
        ? withoutLocal.map((entry) => (entry.id === savedEntry.id ? savedEntry : entry))
        : [savedEntry, ...withoutLocal];
    });
    setSelectedEntry(savedEntry);
    setCounts((current) => ({ ...current, note: Math.max(current.note || 0, entries.length + 1) }));
    setCodexState('live');
  }

  return (
    <section className="codex-shelf chamber-card" aria-label="STARWELL codex shelf">
      <div className="map-heading compact">
        <span>Codex Shelf</span>
        <div className="codex-heading-actions">
          <strong>{statusLabel}</strong>
          <button className={`codex-action ${mode === 'read' ? 'active' : ''}`} type="button" onClick={() => setMode('read')}>Read Shelf</button>
          <button className={`codex-action ${mode === 'write' ? 'active' : ''}`} type="button" onClick={() => setMode('write')}>Write Room</button>
          <button className="codex-action" type="button" onClick={startNewLeaf}>New Leaf</button>
        </div>
      </div>

      {mode === 'write' ? (
        <WriterRoom entry={activeEntry} now={now} onSaved={handleSaved} />
      ) : (
        <div className="codex-grid">
          <div className="shelf-stack" aria-label="Codex shelf counts">
            {codexShelves.map((shelf) => (
              <article className="shelf-card" key={shelf.key}>
                <span>{shelf.glyph}</span>
                <strong>{shelf.label}</strong>
                <em>{displayCounts[shelf.key] ?? 0} records</em>
              </article>
            ))}
          </div>

          <div className="entry-stack" aria-label="Codex entries">
            {displayEntries.map((entry) => (
              <button
                className={`entry-tab ${activeEntry?.id === entry.id ? 'active' : ''}`}
                key={entry.id}
                onClick={() => selectEntry(entry)}
                type="button"
              >
                <span>{entry.entry_type || 'entry'}</span>
                <strong>{entry.title}</strong>
              </button>
            ))}
          </div>

          {activeEntry && (
            <article className="codex-reader" aria-live="polite">
              <p>{activeEntry.entry_type || 'entry'} · {activeEntry.visibility || 'private'}</p>
              <h3>{activeEntry.title}</h3>
              <span>{getEntryPreview(activeEntry)}</span>
              <button className="codex-action" type="button" onClick={() => setMode('write')}>Edit in Writing Room</button>
            </article>
          )}
        </div>
      )}
    </section>
  );
}

function ComingSoonPanel({ selected }) {
  return (
    <section className="coming-soon chamber-card" aria-label={`${selected.title} chamber preview`}>
      <div className="map-heading compact">
        <span>{selected.title}</span>
        <strong>Chamber seed</strong>
      </div>
      <div className="coming-soon-body">
        <span className="seed-glyph">{selected.glyph}</span>
        <div>
          <h3>This room is marked on the map.</h3>
          <p>{selected.text}</p>
          <p>Next pass: give this chamber its own shelves, records, and tools.</p>
        </div>
      </div>
    </section>
  );
}

function ObserverAlmanacPanel({ now }) {
  return (
    <>
      <LiveGlyphViewer now={now} />
      <section className="chamber-card living-manuscript-chamber" aria-label="Living manuscript prototype">
        <div className="map-heading compact">
          <span>Living Manuscript</span>
          <strong>Varutóra prototype</strong>
        </div>
        <VarutoraLeaf />
      </section>
    </>
  );
}

function ActiveChamber({ selected, now }) {
  if (selected.key === 'observer') return <ObserverAlmanacPanel now={now} />;
  if (selected.key === 'atlas') return <AtlasSeedPanel />;
  if (selected.key === 'library') return <CodexShelf now={now} />;
  return <ComingSoonPanel selected={selected} />;
}

function App() {
  const now = useSecondTicker();
  const phase = getSkyPhase(now);
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const [selected, setSelected] = useState(() => instruments.find((room) => room.key === 'observer') || instruments[1]);

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

        <ObservatoryInstrument
          rooms={instruments}
          selected={selected}
          onSelect={setSelected}
          selectedType={selectedType}
        />

        <ActiveChamber selected={selected} now={now} />

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
