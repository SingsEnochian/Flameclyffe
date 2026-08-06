import React, { useReducer, useState, useMemo } from 'react';
import ArcsweepShell from './shell/ArcsweepShell.jsx';
import { createRoot } from 'react-dom/client';

// Two-track law: source-canon and project-overlay are ALWAYS separate.
// They share no store. They are never merged. Source entries are never overwritten.
// Overlay entries MAY reference source entries by ID (supporting_refs), never by copying content.

const CANON_ENTRY_SCHEMA = 'arcsweep.canon-entry/v1';
const SOURCE_STORE_KEY = 'arcsweep:canon-studio:source-canon:v1';
const OVERLAY_STORE_KEY = 'arcsweep:canon-studio:project-overlay:v1';
const CANON_RECEIPT_KEY = 'arcsweep:canon-studio:receipts:v1';

// ─── Seed data ───────────────────────────────────────────────────────────────

const SOURCE_CANON_SEEDS = [
  {
    schema: CANON_ENTRY_SCHEMA,
    entry_id: 'sc:taveren-vaen:world',
    track: 'source-canon',
    type: 'world',
    name: "T'averen Vaen",
    world_slug: 'taveren-vaen',
    canonical_source: 'The Wheel of Time — Robert Jordan & Brandon Sanderson',
    content: "The Wheel of Time turns and Ages come and pass. Ta'veren are individuals around whom the Pattern distorts — events that might happen in decades occur in days or hours. The world is ancient; the Dark One exists outside the Pattern and seeks to stop the Wheel.",
    created_at: '2026-08-06T00:00:00.000Z',
    receipt_id: 'sc-receipt-001',
  },
  {
    schema: CANON_ENTRY_SCHEMA,
    entry_id: 'sc:taveren-vaen:pattern',
    track: 'source-canon',
    type: 'concept',
    name: 'The Pattern',
    world_slug: 'taveren-vaen',
    canonical_source: 'The Wheel of Time — Robert Jordan',
    content: 'The Pattern of an Age is woven from the threads of lives, with the Wheel as the loom. Ta\'veren are knots in the Pattern — the Wheel creates them when the Pattern needs correcting. The Dark One seeks to remake the Pattern or break the Wheel entirely.',
    created_at: '2026-08-06T00:00:00.000Z',
    receipt_id: 'sc-receipt-002',
  },
  {
    schema: CANON_ENTRY_SCHEMA,
    entry_id: 'sc:starsong:world',
    track: 'source-canon',
    type: 'world',
    name: 'Equestria',
    world_slug: 'starsong-friendship-is-magic',
    canonical_source: 'My Little Pony: Friendship Is Magic — Lauren Faust',
    content: 'A world in which the Elements of Harmony are literal structural forces. Friendship is not metaphor — it powers magic directly. Celestia and Luna govern sun and moon. The Everfree Forest operates outside pony control as a reminder that nature has its own will.',
    created_at: '2026-08-06T00:00:00.000Z',
    receipt_id: 'sc-receipt-003',
  },
  {
    schema: CANON_ENTRY_SCHEMA,
    entry_id: 'sc:starsong:elements-of-harmony',
    track: 'source-canon',
    type: 'concept',
    name: 'Elements of Harmony',
    world_slug: 'starsong-friendship-is-magic',
    canonical_source: 'My Little Pony: Friendship Is Magic — Lauren Faust',
    content: 'Six Elements: Honesty, Kindness, Laughter, Generosity, Loyalty, Magic. Magic is the seventh Element that emerges when the other five are expressed between friends. Not symbols — active forces. They respond to genuine relationship.',
    created_at: '2026-08-06T00:00:00.000Z',
    receipt_id: 'sc-receipt-004',
  },
];

const OVERLAY_SEEDS = [
  {
    schema: CANON_ENTRY_SCHEMA,
    entry_id: 'po:terra-aeterna:world',
    track: 'project-overlay',
    type: 'world',
    name: 'Terra Aeterna',
    world_slug: 'terra-aeterna',
    supporting_refs: [],
    content: 'Original world. Hearthweave is the protocol name. has_return: true — every cycle comes back. The compression is followed by release and the release includes return. Civilisational continuity is architectural in the tone itself.',
    created_at: '2026-08-06T00:00:00.000Z',
    receipt_id: 'po-receipt-001',
  },
  {
    schema: CANON_ENTRY_SCHEMA,
    entry_id: 'po:luna-mooncalled:world',
    track: 'project-overlay',
    type: 'world',
    name: 'The Luna Who Called Down the Moon',
    world_slug: 'luna-mooncalled',
    supporting_refs: [],
    content: 'Original world. Named after the founding act: Luna called three moons and all three came. The world exists in the aftermath. Three moons — Mawr (bass/deep mauve), Aurel (mid/pale gold), Glaswren (high/green agate) — create a quasiperiodic interference pattern that is the world\'s acoustic signature.',
    created_at: '2026-08-06T00:00:00.000Z',
    receipt_id: 'po-receipt-002',
  },
  {
    schema: CANON_ENTRY_SCHEMA,
    entry_id: 'po:feather-and-flame:world',
    track: 'project-overlay',
    type: 'world',
    name: 'Feather & Flame',
    world_slug: 'feather-and-flame',
    supporting_refs: [],
    content: 'Original world. Post-Rupture War (2030) Earth. Russia\'s space-time tear let monsters and mythic phenomena into reality. Marine civilisations by 2100. Soul-chip bond encodes love at the quantum level — survives death. The Crownfire at Home Deep\'s spire has burned since the world half-drowned.',
    created_at: '2026-08-06T00:00:00.000Z',
    receipt_id: 'po-receipt-003',
  },
  {
    schema: CANON_ENTRY_SCHEMA,
    entry_id: 'po:taveren-vaen:project-reception',
    track: 'project-overlay',
    type: 'concept',
    name: "T'averen Vaen: Project Reception Profile",
    world_slug: 'taveren-vaen',
    supporting_refs: ['sc:taveren-vaen:world', 'sc:taveren-vaen:pattern'],
    content: 'Project reception interpretation: the Pattern does not command PREMAQ. It converses with it. PREMAQ mapping — P: day_phase, C: pattern_coherence from Kp index, R: lunar clarity, E: solar_wind_speed, M: reading_position in series, A: ta\'veren_events_recent_count, Q: seasonal_position. Data sets atmosphere, not fate.',
    created_at: '2026-08-06T00:00:00.000Z',
    receipt_id: 'po-receipt-004',
  },
];

// ─── Storage ─────────────────────────────────────────────────────────────────

function readStore(key, seeds) {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.entries && parsed.entries.length > 0) return parsed;
    }
  } catch { /* fall through */ }
  const init = { entries: seeds, seeded_at: new Date().toISOString() };
  sessionStorage.setItem(key, JSON.stringify(init));
  return init;
}

function writeStore(key, store) {
  sessionStorage.setItem(key, JSON.stringify(store));
}

function generateId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function appendReceipt(entry) {
  try {
    const raw = sessionStorage.getItem(CANON_RECEIPT_KEY);
    const store = raw ? JSON.parse(raw) : { receipts: [] };
    store.receipts.push({
      receipt_id: entry.receipt_id,
      entry_id: entry.entry_id,
      track: entry.track,
      type: entry.type,
      name: entry.name,
      world_slug: entry.world_slug,
      created_at: entry.created_at,
    });
    sessionStorage.setItem(CANON_RECEIPT_KEY, JSON.stringify(store));
  } catch { /* storage may be unavailable */ }
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

function canonReducer(state, action) {
  switch (action.type) {
    case 'ADD_OVERLAY': {
      const entry = action.payload;
      const next = { ...state.overlay, entries: [...state.overlay.entries, entry] };
      writeStore(OVERLAY_STORE_KEY, next);
      appendReceipt(entry);
      return { ...state, overlay: next };
    }
    default:
      return state;
  }
}

function initState() {
  const source = readStore(SOURCE_STORE_KEY, SOURCE_CANON_SEEDS);
  const overlay = readStore(OVERLAY_STORE_KEY, OVERLAY_SEEDS);
  return { source, overlay };
}

// ─── Components ──────────────────────────────────────────────────────────────

const mono = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

const TRACK_COLORS = {
  'source-canon': { accent: '#7a6e9e', dim: '#3a3462', label: 'SOURCE CANON', badge: '#9a8ebe' },
  'project-overlay': { accent: '#5a8a6e', dim: '#2a4432', label: 'PROJECT OVERLAY', badge: '#7aba9e' },
};

function TrackBadge({ track }) {
  const c = TRACK_COLORS[track];
  return (
    <span style={{
      fontSize: '.6rem', letterSpacing: '.08em', padding: '.12rem .45rem',
      borderRadius: 3, background: c.dim + '80', border: `1px solid ${c.accent}44`,
      color: c.badge, fontFamily: mono,
    }}>
      {c.label}
    </span>
  );
}

function TypeChip({ type }) {
  const c = { world: '#3a6e55', character: '#5a5e7a', location: '#3a5e6e', concept: '#6e5a3a', event: '#5a6e3a' };
  const col = c[type] || '#567060';
  return (
    <span style={{
      fontSize: '.58rem', letterSpacing: '.08em', padding: '.1rem .35rem',
      borderRadius: 3, background: col + '30', color: col, border: `1px solid ${col}44`,
    }}>
      {type.toUpperCase()}
    </span>
  );
}

function EntryRow({ entry, selected, onSelect }) {
  const c = TRACK_COLORS[entry.track];
  return (
    <button
      onClick={() => onSelect(entry)}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: '.55rem .85rem', borderRadius: 6, border: 'none',
        background: selected ? `${c.dim}60` : 'transparent',
        outline: selected ? `1px solid ${c.accent}44` : undefined,
        cursor: 'pointer',
        transition: 'background .14s',
      }}
    >
      <div style={{ display: 'flex', gap: '.4rem', marginBottom: '.18rem' }}>
        <TypeChip type={entry.type} />
      </div>
      <div style={{ fontSize: '.78rem', color: '#c8ddd4', fontWeight: 600 }}>{entry.name}</div>
      {entry.world_slug && <div style={{ fontSize: '.64rem', color: '#3a5045', marginTop: '.1rem' }}>{entry.world_slug}</div>}
    </button>
  );
}

function EntryDetail({ entry, sourceEntries }) {
  if (!entry) {
    return (
      <div style={{ color: '#2a3830', fontSize: '.78rem', padding: '2rem', fontStyle: 'italic', fontFamily: mono }}>
        Select an entry to view.
      </div>
    );
  }

  const c = TRACK_COLORS[entry.track];

  const refEntries = (entry.supporting_refs || [])
    .map((id) => sourceEntries.find((e) => e.entry_id === id))
    .filter(Boolean);

  return (
    <div style={{ padding: '1.5rem', fontFamily: mono }}>
      <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', marginBottom: '.5rem' }}>
        <TrackBadge track={entry.track} />
        <TypeChip type={entry.type} />
      </div>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#d7e4dc', margin: '.3rem 0 .1rem' }}>{entry.name}</h2>
      {entry.world_slug && <p style={{ fontSize: '.7rem', color: '#3a5045', marginBottom: '1rem' }}>{entry.world_slug}</p>}

      {entry.canonical_source && (
        <div style={{ padding: '.5rem .8rem', background: `${c.dim}40`, border: `1px solid ${c.accent}30`, borderRadius: 5, marginBottom: '1rem' }}>
          <p style={{ fontSize: '.6rem', color: c.badge, letterSpacing: '.06em', marginBottom: '.2rem' }}>CANONICAL SOURCE</p>
          <p style={{ fontSize: '.74rem', color: '#8aaa96' }}>{entry.canonical_source}</p>
        </div>
      )}

      <div style={{ borderTop: `1px solid rgba(114,204,166,.1)`, paddingTop: '.75rem', marginBottom: '1rem' }}>
        <p style={{ fontSize: '.6rem', color: '#3a5045', letterSpacing: '.08em', marginBottom: '.4rem' }}>CONTENT</p>
        <p style={{ fontSize: '.76rem', color: '#6a9e80', lineHeight: 1.65 }}>{entry.content}</p>
      </div>

      {refEntries.length > 0 && (
        <div style={{ borderTop: `1px solid rgba(114,204,166,.08)`, paddingTop: '.75rem', marginBottom: '1rem' }}>
          <p style={{ fontSize: '.6rem', color: '#3a5045', letterSpacing: '.08em', marginBottom: '.5rem' }}>
            SOURCE REFERENCES — IDs only, content not copied
          </p>
          {refEntries.map((ref) => (
            <div key={ref.entry_id} style={{ padding: '.4rem .7rem', border: `1px solid ${TRACK_COLORS['source-canon'].accent}30`, borderRadius: 4, marginBottom: '.3rem', background: `${TRACK_COLORS['source-canon'].dim}30` }}>
              <p style={{ fontSize: '.68rem', color: TRACK_COLORS['source-canon'].badge }}>{ref.name}</p>
              <p style={{ fontSize: '.62rem', color: '#2a3830' }}>{ref.entry_id}</p>
            </div>
          ))}
        </div>
      )}

      <p style={{ fontSize: '.58rem', color: '#1a2820', marginTop: '1.5rem', letterSpacing: '.05em' }}>
        {entry.schema} · {entry.entry_id} · receipt: {entry.receipt_id}
      </p>
    </div>
  );
}

const OVERLAY_FORM_TYPES = ['world', 'character', 'location', 'concept', 'event'];

function AddOverlayForm({ sourceEntries, onAdd, onClose }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('concept');
  const [worldSlug, setWorldSlug] = useState('');
  const [content, setContent] = useState('');
  const [refIds, setRefIds] = useState([]);
  const [error, setError] = useState('');

  function toggleRef(id) {
    setRefIds((prev) => prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]);
  }

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required.'); return; }
    if (!content.trim()) { setError('Content is required.'); return; }
    const entry = {
      schema: CANON_ENTRY_SCHEMA,
      entry_id: generateId('po'),
      track: 'project-overlay',
      type,
      name: name.trim(),
      world_slug: worldSlug.trim() || null,
      supporting_refs: refIds,
      content: content.trim(),
      created_at: new Date().toISOString(),
      receipt_id: generateId('po-receipt'),
    };
    onAdd(entry);
    onClose();
  }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '.38rem .65rem',
    background: 'rgba(0,0,0,.4)', border: '1px solid rgba(114,204,166,.15)',
    borderRadius: 5, color: '#d7e4dc', fontSize: '.76rem', fontFamily: mono, outline: 'none',
  };

  return (
    <div style={{ padding: '1.25rem', fontFamily: mono }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <p style={{ fontSize: '.6rem', letterSpacing: '.08em', color: '#3a5045', marginBottom: '.2rem' }}>NEW ENTRY</p>
          <TrackBadge track="project-overlay" />
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#3a5045', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
      </div>

      <div style={{
        padding: '.5rem .8rem', background: 'rgba(122,100,60,.1)', border: '1px solid rgba(200,160,80,.15)',
        borderRadius: 5, marginBottom: '1rem', fontSize: '.68rem', color: '#8a7050', lineHeight: 1.5,
      }}>
        Overlay entries extend or interpret source canon without modifying it.
        Reference source entries by ID only — content stays in its track.
        Every addition is receipted. No promotion without explicit approval.
      </div>

      <form onSubmit={submit} style={{ display: 'grid', gap: '.8rem' }}>
        <label style={{ fontSize: '.66rem', color: '#4d6e5d', letterSpacing: '.06em' }}>
          NAME
          <input style={{ ...inputStyle, marginTop: '.25rem', display: 'block' }} value={name} onChange={(e) => setName(e.target.value)} placeholder="Entry name" />
        </label>

        <label style={{ fontSize: '.66rem', color: '#4d6e5d', letterSpacing: '.06em' }}>
          TYPE
          <select style={{ ...inputStyle, marginTop: '.25rem', display: 'block' }} value={type} onChange={(e) => setType(e.target.value)}>
            {OVERLAY_FORM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        <label style={{ fontSize: '.66rem', color: '#4d6e5d', letterSpacing: '.06em' }}>
          WORLD SLUG (optional)
          <input style={{ ...inputStyle, marginTop: '.25rem', display: 'block' }} value={worldSlug} onChange={(e) => setWorldSlug(e.target.value)} placeholder="e.g. terra-aeterna" />
        </label>

        <label style={{ fontSize: '.66rem', color: '#4d6e5d', letterSpacing: '.06em' }}>
          CONTENT
          <textarea
            style={{ ...inputStyle, marginTop: '.25rem', display: 'block', resize: 'vertical', minHeight: '5rem' }}
            value={content} onChange={(e) => setContent(e.target.value)}
            placeholder="Interpretation, project note, or overlay content — not copied from source"
          />
        </label>

        {sourceEntries.length > 0 && (
          <div>
            <p style={{ fontSize: '.66rem', color: '#4d6e5d', letterSpacing: '.06em', marginBottom: '.4rem' }}>
              SOURCE REFERENCES (IDs — select entries this extends)
            </p>
            <div style={{ display: 'grid', gap: '.25rem', maxHeight: '8rem', overflowY: 'auto' }}>
              {sourceEntries.map((e) => (
                <label key={e.entry_id} style={{ display: 'flex', gap: '.5rem', alignItems: 'flex-start', fontSize: '.7rem', color: '#567060', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={refIds.includes(e.entry_id)}
                    onChange={() => toggleRef(e.entry_id)}
                    style={{ marginTop: '.15rem', accentColor: '#7a6e9e' }}
                  />
                  <span>
                    <span style={{ color: '#9a8ebe' }}>{e.name}</span>
                    <span style={{ color: '#2a3830' }}> · {e.entry_id}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {error && <p style={{ fontSize: '.7rem', color: '#9a4a4a' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '.75rem', marginTop: '.25rem' }}>
          <button
            type="submit"
            style={{ padding: '.45rem 1.1rem', background: 'rgba(90,138,110,.15)', border: '1px solid rgba(90,138,110,.35)', borderRadius: 5, color: '#7aba9e', fontSize: '.74rem', cursor: 'pointer' }}
          >
            Add overlay entry
          </button>
          <button
            type="button" onClick={onClose}
            style={{ padding: '.45rem .9rem', background: 'none', border: '1px solid rgba(114,204,166,.12)', borderRadius: 5, color: '#3a5045', fontSize: '.74rem', cursor: 'pointer' }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function CanonStudio() {
  const [state, dispatch] = useReducer(canonReducer, null, initState);
  const [activeTrack, setActiveTrack] = useState('source-canon');
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState('');

  const trackEntries = activeTrack === 'source-canon'
    ? state.source.entries
    : state.overlay.entries;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return trackEntries;
    return trackEntries.filter((e) =>
      e.name.toLowerCase().includes(q) ||
      (e.world_slug || '').includes(q) ||
      (e.content || '').toLowerCase().includes(q)
    );
  }, [trackEntries, query]);

  function handleAdd(entry) {
    dispatch({ type: 'ADD_OVERLAY', payload: entry });
    setSelected(entry);
    setActiveTrack('project-overlay');
  }

  const c = TRACK_COLORS[activeTrack];

  return (
    <div style={{ fontFamily: mono, color: '#d7e4dc', minHeight: '100vh' }}>
      <div style={{ padding: '1.25rem 1.5rem .6rem', borderBottom: '1px solid rgba(114,204,166,.1)' }}>
        <p style={{ fontSize: '.68rem', letterSpacing: '.1em', color: '#3a5045', marginBottom: '.3rem' }}>ARCSWEEP · CANON STUDIO</p>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#d7e4dc', margin: 0 }}>Canon Studio</h1>
        <p style={{ fontSize: '.74rem', color: '#567060', margin: '.3rem 0 0' }}>
          Two tracks. Never merged. Source canon is read. Project overlay extends it.
        </p>
      </div>

      {/* Track selector */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(114,204,166,.08)', background: 'rgba(0,0,0,.2)' }}>
        {Object.entries(TRACK_COLORS).map(([track, tc]) => (
          <button
            key={track}
            onClick={() => { setActiveTrack(track); setSelected(null); setQuery(''); setShowForm(false); }}
            style={{
              flex: 1, padding: '.6rem 1rem', border: 'none',
              background: activeTrack === track ? `${tc.dim}60` : 'transparent',
              borderBottom: activeTrack === track ? `2px solid ${tc.accent}` : '2px solid transparent',
              color: activeTrack === track ? tc.badge : '#3a5045',
              fontSize: '.7rem', letterSpacing: '.08em', cursor: 'pointer', fontFamily: mono,
            }}
          >
            {tc.label}
            <span style={{ marginLeft: '.5rem', fontSize: '.62rem', color: activeTrack === track ? tc.accent : '#2a3830' }}>
              ({activeTrack === track
                ? filtered.length
                : (track === 'source-canon' ? state.source.entries : state.overlay.entries).length})
            </span>
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '20rem 1fr', minHeight: 'calc(100vh - 190px)' }}>
        {/* List */}
        <div style={{ borderRight: '1px solid rgba(114,204,166,.07)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '.6rem .9rem', borderBottom: '1px solid rgba(114,204,166,.05)' }}>
            <input
              type="search"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '.35rem .6rem',
                background: 'rgba(0,0,0,.3)', border: '1px solid rgba(114,204,166,.13)',
                borderRadius: 4, color: '#d7e4dc', fontSize: '.72rem', fontFamily: mono, outline: 'none',
              }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '.4rem' }}>
            {filtered.length === 0 && (
              <p style={{ color: '#2a3830', fontSize: '.72rem', padding: '.5rem', fontStyle: 'italic' }}>No entries.</p>
            )}
            {filtered.map((e) => (
              <EntryRow key={e.entry_id} entry={e} selected={selected?.entry_id === e.entry_id} onSelect={setSelected} />
            ))}
          </div>
          {activeTrack === 'project-overlay' && (
            <div style={{ padding: '.6rem', borderTop: '1px solid rgba(114,204,166,.06)' }}>
              <button
                onClick={() => { setShowForm(true); setSelected(null); }}
                style={{
                  width: '100%', padding: '.45rem', background: 'rgba(90,138,110,.1)',
                  border: '1px solid rgba(90,138,110,.25)', borderRadius: 5,
                  color: '#5a8a6e', fontSize: '.72rem', letterSpacing: '.06em', cursor: 'pointer', fontFamily: mono,
                }}
              >
                + Add overlay entry
              </button>
            </div>
          )}
          {activeTrack === 'source-canon' && (
            <div style={{ padding: '.6rem .9rem', borderTop: '1px solid rgba(114,204,166,.06)', fontSize: '.6rem', color: '#2a3830', lineHeight: 1.5 }}>
              Source-canon is read-only in this session.
              Entries are seeded from canonical sources and are never modified here.
            </div>
          )}
          <div style={{ padding: '.4rem .9rem', borderTop: '1px solid rgba(114,204,166,.05)', fontSize: '.58rem', color: '#1a2820' }}>
            {filtered.length} / {trackEntries.length} · {activeTrack}
          </div>
        </div>

        {/* Detail / form */}
        <div style={{ background: 'rgba(9,13,11,.4)', overflowY: 'auto' }}>
          {showForm && activeTrack === 'project-overlay'
            ? <AddOverlayForm
                sourceEntries={state.source.entries}
                onAdd={handleAdd}
                onClose={() => setShowForm(false)}
              />
            : <EntryDetail entry={selected} sourceEntries={state.source.entries} />
          }
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <ArcsweepShell currentHref="/starwell/canon-studio/" title="Canon Studio">
    <CanonStudio />
  </ArcsweepShell>,
);
