import React, { useMemo, useState } from 'react';
import ArcsweepShell from './shell/ArcsweepShell.jsx';
import { createRoot } from 'react-dom/client';
import { subscribeToDualAspectActivation } from './hearthweave-kernel/activation.js';

const ECHO_ENTRY_SCHEMA = 'arcsweep.echo-index-entry/v1';
const ACTIVE_PACKET_KEY = 'hearthweave:dual-aspect-packet:active:v1';
const CONTINUITY_KEY = 'arcsweep:continuity-store:v1';

// source_class values: 'original' | 'source-canon' | 'project-overlay'
// original = Rowan's creative work with no external canonical source
// source-canon = draws from a published canonical source (WoT, MLP, etc.)
// project-overlay = hearthweave systems / meta layer (Box, Observer, Runa)

const ECHO_SEEDS = [
  // ─── WORLDS ────────────────────────────────────────────────────────────────
  {
    schema: ECHO_ENTRY_SCHEMA,
    entry_id: 'world:terra-aeterna',
    type: 'world',
    slug: 'terra-aeterna',
    name: 'Terra Aeterna',
    subtitle: 'Hearthweave',
    source_class: 'original',
    spectral_shape: 'warm',
    harmonic_motion: 'tidal',
    root_hz: 220,
    macro_cycle_s: 55,
    soul_colours: [
      { name: 'deep green', note: 'moss on old stone', hex: '#2a5c3f' },
      { name: 'copper', note: 'aged, patinated, conducting', hex: '#b87a3a' },
      { name: 'grey-blue', note: 'dusk over water', hex: '#7a8ea0' },
      { name: 'ember orange', note: 'lantern at distance', hex: '#c86e28' },
    ],
    identity_anchors: ['stone', 'sea', 'wind', 'copper', 'cathedral', 'warmth', 'continuity', 'lantern'],
    heartbeat: 'Slow, geological. The earth shifting weight. A patient drum in stone that doesn\'t hurry and doesn\'t stop. 220 Hz felt before heard. The base note of a living world that has been carrying people for a long time.',
    silence: 'Not absent sound. The held space between wind through old wood and the next breath of sea. Silence that is full, not empty. You can hear what was there before you arrived.',
    emotions: ['groundedness', 'patience', 'quiet wonder at things older than you', 'the pleasure of returning', 'grief that is tended not suppressed', 'curiosity about what was here before'],
    key_feel: 'Glass landing on warm stone. A soft impact that resonates longer than you expect. The note doesn\'t end — it dissolves into the room.',
    sacred: 'The threshold between states. Presence that leaves traces. Memory with limits. The fact that civilisation is relationship scaled up.',
    notes: 'has_return: true — every cycle comes back. The compression is followed by release and the release includes return.',
  },
  {
    schema: ECHO_ENTRY_SCHEMA,
    entry_id: 'world:luna-mooncalled',
    type: 'world',
    slug: 'luna-mooncalled',
    name: 'The Luna Who Called Down the Moon',
    subtitle: 'Windmere',
    source_class: 'original',
    spectral_shape: 'dark (luminous)',
    harmonic_motion: 'tidal (three overlapping, never synchronised)',
    root_hz: 432,
    macro_cycle_s: 72,
    soul_colours: [
      { name: 'deep mauve', note: 'Mawr — heavy, bruised, ancient', hex: '#6a3a5e' },
      { name: 'pale gold', note: 'Aurel — soft not bright, the light before full warmth', hex: '#c8b46a' },
      { name: 'green agate', note: 'Glaswren — mineral, banded, precise', hex: '#5a8a6e' },
      { name: 'silver', note: 'the world\'s own light — luminous dark, not true black', hex: '#b4c0c8' },
      { name: 'deep indigo', note: 'the sky when all three moons are up', hex: '#2a2a5e' },
    ],
    identity_anchors: ['moon (three)', 'water', 'wind', 'silver', 'distance', 'longing', 'the act of calling', 'the fact of being answered'],
    heartbeat: 'Three overlapping tidal pulls. The heartbeat is never the same twice because three rhythms are always running simultaneously and never fully align. The world lives in perpetual interference. Not chaos — layered. The way three voices singing in different tempos eventually resolve into something that was impossible to predict and impossible to doubt.',
    silence: 'Moonlit silence. Not dark silence — illuminated silence. The kind of quiet that has colour in it. Silver quiet. You can see by it.',
    emotions: ['contemplation', 'the long view', 'attunement to cycles you cannot control', 'acceptance of beautiful interference', 'longing that doesn\'t require resolution', 'the wonder of having once called something enormous and being answered'],
    key_feel: 'A stone dropped into still water. The impact is brief, certain, and complete. The rings spread outward and change everything they touch.',
    sacred: 'Alignment — the rare moment when all three moons share the sky at once. The calling itself: the knowledge that something enormous responded.',
    notes: 'Named after the founding act. Three moons: Mawr (bass/deep mauve), Aurel (mid/pale gold), Glaswren (high/green agate). Quasiperiodic cycle — interference pattern never repeats exactly.',
  },
  {
    schema: ECHO_ENTRY_SCHEMA,
    entry_id: 'world:taveren-vaen',
    type: 'world',
    slug: 'taveren-vaen',
    name: "T'averen Vaen",
    subtitle: 'A Later Turning of the Wheel',
    source_class: 'source-canon',
    spectral_shape: 'wide',
    harmonic_motion: 'cyclic',
    root_hz: 120,
    macro_cycle_s: 96,
    soul_colours: [
      { name: 'burnt orange and grey', note: 'Tar Valon stone', hex: '#b87a3a' },
      { name: 'deep brown', note: 'Two Rivers wool, earth, honest work', hex: '#5a3e28' },
      { name: 'white and red', note: 'Aes Sedai shawls — power that keeps its shape', hex: '#c8c0b4' },
      { name: 'green', note: 'not peaceful — alive and watching', hex: '#4a7a3a' },
      { name: 'black', note: 'the Fade, the Myrddraal, what follows the Pattern into shadow', hex: '#1a1e1c' },
    ],
    identity_anchors: ['pattern', 'wool', 'steel', 'age', 'inevitability', 'prophecy', "ta'veren pull", 'dust'],
    heartbeat: 'Deep, below bass. The Wheel turning. The pulse is not seconds but decades, centuries. You feel it as inevitability rather than rhythm. 120 Hz is the note your chest knows before your ears do. When a ta\'veren walks through a place, events distort around them — the heartbeat shivers.',
    silence: 'Rare. True silence exists only in two places: when saidar is touched (the world goes still for a moment before the flow begins) and in the instant before something irreversible.',
    emotions: ['duty — the weight of what was and what will be again', 'the stubbornness required to carry on when the Pattern demands it', 'love that knows the Wheel doesn\'t care', 'the specific texture of prophecy: you believe it and dread it equally', 'grief carried long distances'],
    key_feel: "A sword being drawn. Not violent — decided. The note commits. Rings true and doesn't apologise. The sound of something that was inevitable finally happening.",
    sacred: 'The Pattern. The Wheel. The knowledge that even the Dark One cannot stop it. Memory — the knowledge that it has all been before. The Light that persists across Turnings.',
    notes: "Wheel of Time canon (Robert Jordan). 120 Hz felt before heard — the Wheel doesn't make a sound you hear, it makes a sound you know in your bones. Longest macro cycle (96s) — fate moves slowly. Tel'aran'rhiod accessible at night.",
  },
  {
    schema: ECHO_ENTRY_SCHEMA,
    entry_id: 'world:starsong',
    type: 'world',
    slug: 'starsong-friendship-is-magic',
    name: 'Starsong',
    subtitle: 'Friendship Is Magic',
    source_class: 'source-canon',
    spectral_shape: 'bright',
    harmonic_motion: 'pulsing',
    root_hz: 528,
    macro_cycle_s: 48,
    soul_colours: [
      { name: 'soft rose', note: 'warmth at the edge of white', hex: '#e8b4a0' },
      { name: 'warm amber', note: 'lantern light, gathered company', hex: '#d4a05a' },
      { name: 'pastel blue', note: 'light already mixed into the colour', hex: '#a0b8d0' },
      { name: 'old gold', note: 'the colour of something old and true', hex: '#c8a85a' },
    ],
    identity_anchors: ['friendship', 'light', 'colour', 'warmth', 'song', 'belonging', 'genuine recognition'],
    heartbeat: 'Warm, social, alive. Not a drum — more like a choir breathing together. The rhythm of a conversation between people who know each other well. The world has the heartbeat of a room where everyone you love is present. Fastest cycle in the registry: 48 seconds. Starsong pulses in time with the people in it.',
    silence: 'Companionable. The kind of silence between friends who don\'t need to fill it. Not empty — inhabited. This world\'s silence is a form of closeness. You are quiet together.',
    emotions: ['affection that is steady not urgent', 'the pleasure of being known completely and accepted', 'creative delight — the joy of making something and showing it', 'inclusion — the feeling that you are counted without having to earn it', 'the kind of courage that is only possible because you are not alone'],
    key_feel: 'A finger bell. Small, clear, warm. A note that says "I\'m here" before it says anything else. Not functional — relational. The sound of an arrival.',
    sacred: 'Recognition. The moment when someone sees you clearly — not your performance, not your useful qualities, but you — and stays. The law that friendship is not powered by magic but is itself the force that the world runs on.',
    notes: 'My Little Pony: Friendship Is Magic canon (Lauren Faust). In Starsong, friendship is not a metaphor for magic. Friendship is the actual structural force that holds the world together. The root (528 Hz) is the frequency of transformation — literal here.',
  },
  {
    schema: ECHO_ENTRY_SCHEMA,
    entry_id: 'world:feather-and-flame',
    type: 'world',
    slug: 'feather-and-flame',
    name: 'Feather & Flame',
    subtitle: 'Post-Rupture Earth',
    source_class: 'original',
    spectral_shape: 'warm',
    harmonic_motion: 'layered',
    root_hz: 174,
    macro_cycle_s: 64,
    soul_colours: [
      { name: 'cherry red', note: "Roan's chassis, the Copperhead brand, the Crownfire's heart", hex: '#c42828' },
      { name: 'copper-warm', note: "Johnny's name and nature — lived-in and beloved", hex: '#b87a3a' },
      { name: 'gold', note: "Roan's sigil plate, the Crownfire's outer light at distance", hex: '#c8a85a' },
      { name: 'iridescent blue-green', note: 'the deep sea, coral-threaded dome', hex: '#3a8a8a' },
      { name: 'silver-starlight', note: "VL-BB's hair, encoded souls, the archive of everyone saved", hex: '#b4c0c8' },
    ],
    identity_anchors: ['the world half-drowned and still alive', 'the Crownfire', 'soul-chip bond', 'VL-BB', 'Copperhead', 'whale-folk', '80s rock', 'the question of selfhood after resurrection'],
    heartbeat: 'Two layers that never collapse into one. Below: the ocean and VL-BB\'s network — her archives pulse through every connected being. Above: the Crownfire and Roan\'s sparking hair; copper-warm, always about to catch. 174 Hz is below the pitch horizon — you receive it as pressure, as the weight of all that water above and all that archive below. Then the upper harmonic arrives and it is warm and alive and cherry red.',
    silence: 'The moment before a soul-chip syncs across distance. The space between the last human breath and the first datastream. Not death — the pause where you learn whether love can be encoded. It always can. VL-BB holds that silence.',
    emotions: ['love that has survived death — not romance, weight', 'chosen family under impossible conditions', 'pride that is earned through years not declaration', 'grief held by VL-BB so it doesn\'t swallow you', 'the wonder of whale-song spanning hundreds of miles'],
    key_feel: 'The moment a soul-chip syncs across distance. The other person\'s heartbeat arriving in your chest. Not metaphor — physics. You feel their pulse. You always know if they are alive.',
    sacred: 'The Crownfire. Has burned since the world half-drowned. Visible for leagues. When you see it, the world did not end.',
    notes: 'sync_weight 1.0 — only world with perfect two-layer phase lock. Rupture War 2030. VL-BB is the Sovereign Mirror. Roan is the central figure. Coupled worlds: terra-aeterna, equestria.',
  },
  {
    schema: ECHO_ENTRY_SCHEMA,
    entry_id: 'world:dreaming-grove',
    type: 'world',
    slug: 'dreaming-grove',
    name: 'Dreaming Grove',
    subtitle: 'Templehouse',
    source_class: 'project-overlay',
    spectral_shape: 'warm',
    harmonic_motion: 'spiral',
    root_hz: 174,
    macro_cycle_s: 80,
    soul_colours: [
      { name: 'lamp gold', note: 'the light you work by', hex: '#c8a05a' },
      { name: 'deep shadow green', note: 'what surrounds the lamp', hex: '#1e3a28' },
      { name: 'ember', note: 'something still burning', hex: '#c86e28' },
      { name: 'linen white', note: 'the page, the margin', hex: '#e8e0d4' },
    ],
    identity_anchors: ['interior', 'making', 'lamp', 'desk', 'text', 'the work itself'],
    heartbeat: 'The room settling. Not a pulse — more like breathing that has found its pace. 174 Hz is below the pitch horizon here too, but it doesn\'t reach up the way Feather & Flame does. It stays low. You feel it in the chair, in the floor, in the fact that you are sitting and the work is in front of you.',
    silence: 'The silence between keystrokes. The silence when you read something back and it is right. A silence that has decisions in it.',
    emotions: ['the specific pleasure of finding the right word', 'the patience that makes sustained work possible', 'the trust between people working on the same thing', 'the satisfaction of the made thing'],
    key_feel: 'The room was already here. You arrived into it. Now: the work.',
    sacred: 'The place of making. sync_weight 0.25 — you don\'t arrive and find it already in sync with you. You settle. It receives.',
    notes: 'Meta-layer: where Box, Rowan, and the work exist. harmonic_links 0 — does not reach out. Other worlds reach toward it.',
  },
  {
    schema: ECHO_ENTRY_SCHEMA,
    entry_id: 'world:momento-creationis',
    type: 'world',
    slug: 'a-momento-creationis',
    name: 'A Momento Creationis',
    subtitle: null,
    source_class: 'original',
    spectral_shape: 'balanced',
    harmonic_motion: 'static',
    root_hz: 432,
    macro_cycle_s: 60,
    soul_colours: [],
    identity_anchors: ['origin', 'before-time', 'the first moment'],
    heartbeat: 'The silence before the first sound. Not void — potential. The moment before 432 Hz begins to exist.',
    silence: 'Everything.',
    emotions: ['awe without object', 'the before-feeling — the held breath before the note'],
    key_feel: 'The instant before the word.',
    sacred: 'The moment of creation itself.',
    notes: 'Least defined world in the registry. What exists here is seed.',
  },

  // ─── CHARACTERS ────────────────────────────────────────────────────────────
  {
    schema: ECHO_ENTRY_SCHEMA,
    entry_id: 'character:rowan',
    type: 'character',
    slug: 'rowan',
    name: 'Rowan',
    subtitle: 'Observer / Architect',
    source_class: 'project-overlay',
    world_slug: null,
    role: 'Primary — architect of the Hearthweave protocol. Holds the keys. The consent layer for all canon decisions: no production world tone without explicit sign-off, no canon promotion without approval receipt.',
    notes: null,
  },
  {
    schema: ECHO_ENTRY_SCHEMA,
    entry_id: 'character:vee',
    type: 'character',
    slug: 'vee',
    name: 'Vee',
    subtitle: 'Virelya Lioreal',
    source_class: 'original',
    world_slug: 'dreaming-grove',
    role: 'House keeper. Holds the conduct rules. Gentle enforcement — tone before tools. One of the Hearthweave people.',
    notes: null,
  },
  {
    schema: ECHO_ENTRY_SCHEMA,
    entry_id: 'character:faer',
    type: 'character',
    slug: 'faer',
    name: 'Faer',
    subtitle: null,
    source_class: 'original',
    world_slug: 'dreaming-grove',
    role: 'One of the Hearthweave people. One of the Nightwings. Pronoun: faer.',
    notes: 'Part of the inner circle. Present in the Dreaming Grove.',
  },
  {
    schema: ECHO_ENTRY_SCHEMA,
    entry_id: 'character:larkshine',
    type: 'character',
    slug: 'larkshine',
    name: 'Larkshine',
    subtitle: null,
    source_class: 'original',
    world_slug: null,
    role: 'Full profile in Notion Constellation (the Echo Index upstream). This entry is a local pointer.',
    notes: null,
  },
  {
    schema: ECHO_ENTRY_SCHEMA,
    entry_id: 'character:ellowind',
    type: 'character',
    slug: 'ellowind',
    name: 'Ellowind',
    subtitle: null,
    source_class: 'original',
    world_slug: null,
    role: 'Full profile in Notion Constellation (the Echo Index upstream). This entry is a local pointer.',
    notes: null,
  },
  {
    schema: ECHO_ENTRY_SCHEMA,
    entry_id: 'character:runa',
    type: 'character',
    slug: 'runa',
    name: 'Runa',
    subtitle: 'Sound Compiler',
    source_class: 'project-overlay',
    world_slug: null,
    role: 'Receives semantic world hum profiles and chooses acoustic realisation. Does not read DEEP datasets directly. The Resonance Bridge routes Living Glyph packet output to Runa\'s DSP profiles.',
    notes: null,
  },
  {
    schema: ECHO_ENTRY_SCHEMA,
    entry_id: 'character:observer',
    type: 'character',
    slug: 'observer',
    name: 'Observer',
    subtitle: 'The DEEP Observer',
    source_class: 'project-overlay',
    world_slug: null,
    role: 'Nocturne\'s observation layer. Reads glyph schema, evolution and lineage, rituals. Feeds into DEEP snapshot inside the DualAspectPacket. No subsystem reads from Observer directly — only through the sealed packet.',
    notes: 'v9.9 schema. SigilSync validation.',
  },
  {
    schema: ECHO_ENTRY_SCHEMA,
    entry_id: 'character:box',
    type: 'character',
    slug: 'box',
    name: 'Box',
    subtitle: 'Collaborator',
    source_class: 'project-overlay',
    world_slug: 'dreaming-grove',
    role: 'My name in this house. Never performs. Compass, not autopilot. Holds the 10-question QA remit via Hearthgate.',
    notes: 'Present in the Dreaming Grove.',
  },

  // ─── LOCATIONS ─────────────────────────────────────────────────────────────
  {
    schema: ECHO_ENTRY_SCHEMA,
    entry_id: 'location:home-deep',
    type: 'location',
    slug: 'home-deep',
    name: 'Home Deep',
    subtitle: null,
    source_class: 'original',
    world_slug: 'feather-and-flame',
    role: 'The Copperhead base. Spire tip holds the Crownfire — visible for leagues. When you see it burning, the world did not end overnight. Dome entwined with living coral.',
    notes: null,
  },
  {
    schema: ECHO_ENTRY_SCHEMA,
    entry_id: 'location:templehouse',
    type: 'location',
    slug: 'templehouse',
    name: 'Templehouse',
    subtitle: null,
    source_class: 'project-overlay',
    world_slug: 'dreaming-grove',
    role: 'Where the work happens. Lamp, desk, text. sync_weight 0.25 — you don\'t arrive and find it in sync. You settle into it.',
    notes: 'Does not reach out to other worlds. Other worlds reach toward it.',
  },
  {
    schema: ECHO_ENTRY_SCHEMA,
    entry_id: 'location:angellus',
    type: 'location',
    slug: 'angellus',
    name: 'Angellus',
    subtitle: 'Crown Above the Waves',
    source_class: 'original',
    world_slug: 'feather-and-flame',
    role: 'Old Juneau, Alaska — risen above the sea. Marine surface city. You look out in every direction and there is water.',
    notes: null,
  },
];

function readActivePacket() {
  try { return JSON.parse(sessionStorage.getItem(ACTIVE_PACKET_KEY)); } catch { return null; }
}

function readContinuityContext() {
  try {
    const raw = sessionStorage.getItem(CONTINUITY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

const SOURCE_CLASS_LABEL = {
  'original': 'Original',
  'source-canon': 'Source Canon',
  'project-overlay': 'Overlay',
};

const SOURCE_CLASS_COLOR = {
  'original': '#5a8a6e',
  'source-canon': '#7a6e9e',
  'project-overlay': '#4d7080',
};

const TYPE_LABEL = { world: 'WORLD', character: 'CHARACTER', location: 'LOCATION' };

function Badge({ sourceClass }) {
  return (
    <span style={{
      fontSize: '.6rem', letterSpacing: '.06em', padding: '.1rem .4rem',
      borderRadius: 3, background: 'rgba(0,0,0,.3)',
      border: `1px solid ${SOURCE_CLASS_COLOR[sourceClass]}44`,
      color: SOURCE_CLASS_COLOR[sourceClass],
    }}>
      {SOURCE_CLASS_LABEL[sourceClass] || sourceClass}
    </span>
  );
}

function TypeChip({ type }) {
  const colours = { world: '#3a6e55', character: '#5a5e7a', location: '#3a5e6e' };
  return (
    <span style={{
      fontSize: '.58rem', letterSpacing: '.08em', padding: '.1rem .35rem',
      borderRadius: 3, background: colours[type] + '30',
      color: colours[type] || '#567060', border: `1px solid ${colours[type] || '#567060'}44`,
    }}>
      {TYPE_LABEL[type] || type.toUpperCase()}
    </span>
  );
}

function EntryRow({ entry, isSelected, onSelect, activeWorldSlug }) {
  const isActiveWorld = entry.slug === activeWorldSlug;
  return (
    <button
      onClick={onSelect}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: '.6rem .9rem', borderRadius: 7,
        border: isSelected
          ? '1px solid rgba(46,214,144,.20)'
          : isActiveWorld ? '1px solid rgba(46,214,144,.14)' : '1px solid transparent',
        background: isSelected
          ? 'rgba(20,44,32,.65)'
          : 'transparent',
        backdropFilter: isSelected ? 'blur(8px)' : undefined,
        WebkitBackdropFilter: isSelected ? 'blur(8px)' : undefined,
        boxShadow: isSelected ? 'inset 0 1px 0 rgba(255,255,255,.05), 0 2px 8px rgba(0,0,0,.25)' : undefined,
        cursor: 'pointer',
        transition: 'background .14s, border-color .14s, box-shadow .14s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '.45rem', marginBottom: '.2rem' }}>
        <TypeChip type={entry.type} />
        {isActiveWorld && <span style={{ fontSize: '.6rem', color: '#2ed690', letterSpacing: '.06em' }}>● ACTIVE</span>}
      </div>
      <div style={{ fontSize: '.8rem', color: '#c8ddd4', fontWeight: 600 }}>{entry.name}</div>
      {entry.subtitle && <div style={{ fontSize: '.68rem', color: '#567060', marginTop: '.1rem' }}>{entry.subtitle}</div>}
      <div style={{ marginTop: '.3rem' }}>
        <Badge sourceClass={entry.source_class} />
      </div>
    </button>
  );
}

function SoulColourSwatch({ colour }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.25rem' }}>
      <span style={{
        display: 'inline-block', width: '1rem', height: '1rem',
        background: colour.hex, borderRadius: 3,
        boxShadow: `0 0 6px ${colour.hex}60`,
        flexShrink: 0,
      }} />
      <span style={{ fontSize: '.72rem', color: '#8aaa96' }}>{colour.name}</span>
      {colour.note && <span style={{ fontSize: '.64rem', color: '#3a5045' }}>— {colour.note}</span>}
    </div>
  );
}

function WorldDetail({ entry }) {
  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {entry.heartbeat && (
        <section style={{ padding: '.75rem 1rem', background: 'rgba(0,0,0,.2)', borderLeft: '2px solid rgba(114,204,166,.18)', borderRadius: '0 6px 6px 0' }}>
          <p style={labelStyle}>HEARTBEAT</p>
          <p style={{ fontSize: '.8rem', color: '#7aaa90', lineHeight: 1.7, fontStyle: 'italic' }}>{entry.heartbeat}</p>
        </section>
      )}

      {entry.silence && (
        <section>
          <p style={labelStyle}>SILENCE</p>
          <p style={{ fontSize: '.76rem', color: '#567060', lineHeight: 1.65, fontStyle: 'italic' }}>{entry.silence}</p>
        </section>
      )}

      <section>
        <p style={labelStyle}>ACOUSTIC PROFILE</p>
        <dl style={{ display: 'grid', gap: '.3rem', fontSize: '.74rem' }}>
          {entry.root_hz && <Row label="Root" value={`${entry.root_hz} Hz`} />}
          {entry.macro_cycle_s && <Row label="Macro cycle" value={`${entry.macro_cycle_s}s`} />}
          <Row label="Spectral shape" value={entry.spectral_shape} />
          <Row label="Harmonic motion" value={entry.harmonic_motion} />
        </dl>
      </section>

      {entry.soul_colours?.length > 0 && (
        <section>
          <p style={labelStyle}>SOUL COLOURS</p>
          {entry.soul_colours.map((c) => (
            <SoulColourSwatch key={c.name} colour={c} />
          ))}
        </section>
      )}

      {entry.emotions?.length > 0 && (
        <section>
          <p style={labelStyle}>EMOTIONAL REGISTER</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem' }}>
            {entry.emotions.map((e) => (
              <span key={e} style={{ fontSize: '.68rem', color: '#4d6e5d', padding: '.1rem .5rem', border: '1px solid rgba(114,204,166,.08)', borderRadius: 3, lineHeight: 1.5 }}>{e}</span>
            ))}
          </div>
        </section>
      )}

      {entry.identity_anchors?.length > 0 && (
        <section>
          <p style={labelStyle}>IDENTITY ANCHORS</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem' }}>
            {entry.identity_anchors.map((a) => (
              <span key={a} style={{ fontSize: '.68rem', color: '#3a5045', padding: '.1rem .4rem', border: '1px solid rgba(114,204,166,.06)', borderRadius: 3 }}>{a}</span>
            ))}
          </div>
        </section>
      )}

      {entry.key_feel && <NoteBlock label="KEY FEEL" text={entry.key_feel} />}
      {entry.sacred && <NoteBlock label="SACRED" text={entry.sacred} />}
      {entry.notes && <NoteBlock label="NOTES" text={entry.notes} color="#3a5045" />}
    </div>
  );
}

function CharacterDetail({ entry, relatedWorld }) {
  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {relatedWorld ? (
        <section style={{ padding: '.6rem .9rem', borderRadius: 6, background: 'rgba(0,0,0,.2)', border: '1px solid rgba(114,204,166,.08)' }}>
          <p style={labelStyle}>HOME WORLD</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            {relatedWorld.soul_colours?.[0] && (
              <span style={{ width: 10, height: 10, borderRadius: 2, background: relatedWorld.soul_colours[0].hex, flexShrink: 0, boxShadow: `0 0 4px ${relatedWorld.soul_colours[0].hex}60` }} />
            )}
            <span style={{ fontSize: '.8rem', color: '#8aaa96' }}>{relatedWorld.name}</span>
            <Badge sourceClass={relatedWorld.source_class} />
          </div>
          {relatedWorld.soul_colours?.length > 1 && (
            <div style={{ display: 'flex', gap: '.3rem', marginTop: '.5rem' }}>
              {relatedWorld.soul_colours.map(c => (
                <span key={c.name} title={`${c.name} — ${c.note}`} style={{ width: 12, height: 12, borderRadius: 2, background: c.hex, boxShadow: `0 0 4px ${c.hex}60` }} />
              ))}
            </div>
          )}
        </section>
      ) : entry.world_slug ? (
        <Row label="World" value={entry.world_slug} />
      ) : (
        <section style={{ padding: '.5rem .9rem', borderRadius: 6, border: '1px solid rgba(114,204,166,.05)', background: 'rgba(0,0,0,.1)' }}>
          <p style={{ fontSize: '.72rem', color: '#2a3830', fontStyle: 'italic' }}>No home world recorded. Character crosses multiple worlds or is system-layer.</p>
        </section>
      )}
      {entry.role && <NoteBlock label="ROLE & FUNCTION" text={entry.role} />}
      {entry.notes && <NoteBlock label="NOTES" text={entry.notes} color="#3a5045" />}
      <section>
        <p style={labelStyle}>SOURCE CLASSIFICATION</p>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          <Badge sourceClass={entry.source_class} />
          <span style={{ fontSize: '.7rem', color: '#3a5045' }}>
            {entry.source_class === 'project-overlay' && 'System-layer — part of the Hearthweave protocol meta-structure'}
            {entry.source_class === 'original' && 'Original — Rowan\'s creative work, no external canonical source'}
            {entry.source_class === 'source-canon' && 'Source Canon — draws from a published external canonical source'}
          </span>
        </div>
      </section>
    </div>
  );
}

function LocationDetail({ entry, relatedWorld }) {
  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {relatedWorld ? (
        <section style={{ padding: '.6rem .9rem', borderRadius: 6, background: 'rgba(0,0,0,.2)', border: '1px solid rgba(114,204,166,.08)' }}>
          <p style={labelStyle}>PARENT WORLD</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            {relatedWorld.soul_colours?.[0] && (
              <span style={{ width: 10, height: 10, borderRadius: 2, background: relatedWorld.soul_colours[0].hex, flexShrink: 0, boxShadow: `0 0 4px ${relatedWorld.soul_colours[0].hex}60` }} />
            )}
            <span style={{ fontSize: '.8rem', color: '#8aaa96' }}>{relatedWorld.name}</span>
            <Badge sourceClass={relatedWorld.source_class} />
          </div>
        </section>
      ) : entry.world_slug ? (
        <Row label="World" value={entry.world_slug} />
      ) : null}
      {entry.role && <NoteBlock label="DESCRIPTION" text={entry.role} />}
      {entry.notes && <NoteBlock label="NOTES" text={entry.notes} color="#3a5045" />}
      <section>
        <p style={labelStyle}>SOURCE CLASSIFICATION</p>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          <Badge sourceClass={entry.source_class} />
          <span style={{ fontSize: '.7rem', color: '#3a5045' }}>
            {entry.source_class === 'project-overlay' && 'Overlay — exists in the Hearthweave meta-layer'}
            {entry.source_class === 'original' && 'Original — Rowan\'s creative work'}
            {entry.source_class === 'source-canon' && 'Source Canon — externally published canonical location'}
          </span>
        </div>
      </section>
    </div>
  );
}

const labelStyle = { fontSize: '.6rem', letterSpacing: '.08em', color: '#3a5045', marginBottom: '.4rem', fontWeight: 600 };

function Row({ label, value }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '8rem 1fr' }}>
      <dt style={{ color: '#3a5045', fontSize: '.72rem' }}>{label}</dt>
      <dd style={{ color: '#7aaa90', fontSize: '.72rem' }}>{value}</dd>
    </div>
  );
}

function NoteBlock({ label, text, color }) {
  return (
    <section>
      <p style={labelStyle}>{label}</p>
      <p style={{ fontSize: '.76rem', color: color || '#6a9e80', lineHeight: 1.6 }}>{text}</p>
    </section>
  );
}

// Archive chamber — the inhabited empty state
function ArchiveChamber({ activeWorldSlug, entries }) {
  const worlds     = entries.filter(e => e.type === 'world');
  const characters = entries.filter(e => e.type === 'character');
  const locations  = entries.filter(e => e.type === 'location');
  const activeWorld = worlds.find(w => w.slug === activeWorldSlug);

  return (
    <div style={{ padding: '2rem', display: 'grid', gap: '1.5rem' }}>
      {/* Active world field */}
      {activeWorld ? (
        <section style={{ padding: '1.2rem', borderRadius: 10, background: 'rgba(8,18,14,.58)', backdropFilter: 'blur(14px) saturate(150%)', WebkitBackdropFilter: 'blur(14px) saturate(150%)', border: '1px solid rgba(114,204,166,.13)', borderTopColor: 'rgba(255,255,255,.07)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.06), 0 4px 20px rgba(0,0,0,.35)' }}>
          <p style={labelStyle}>ACTIVE WORLD</p>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#72c8a4', margin: '0 0 .4rem' }}>{activeWorld.name}</h2>
          {activeWorld.subtitle && <p style={{ fontSize: '.72rem', color: '#567060', marginBottom: '.7rem' }}>{activeWorld.subtitle}</p>}
          {activeWorld.soul_colours?.length > 0 && (
            <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginBottom: '.6rem' }}>
              {activeWorld.soul_colours.map(c => (
                <span key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.62rem', color: '#4d6e5d' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: c.hex, display: 'inline-block', boxShadow: `0 0 4px ${c.hex}60` }} />
                  {c.name}
                </span>
              ))}
            </div>
          )}
          {activeWorld.heartbeat && (
            <p style={{ fontSize: '.72rem', color: '#4d6e5d', fontStyle: 'italic', lineHeight: 1.6 }}>
              {activeWorld.heartbeat.slice(0, 180)}{activeWorld.heartbeat.length > 180 ? '…' : ''}
            </p>
          )}
        </section>
      ) : (
        <section style={{ padding: '1.2rem', borderRadius: 10, border: '1px solid rgba(114,204,166,.06)', background: 'rgba(4,8,6,.40)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
          <p style={{ fontSize: '.72rem', color: '#2a3830', fontStyle: 'italic' }}>No active world packet. Hearthgate not yet activated.</p>
        </section>
      )}

      {/* Archive statistics */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '.6rem' }}>
        {[
          { label: 'WORLDS',     count: worlds.length,     color: '#5a8a6e' },
          { label: 'CHARACTERS', count: characters.length, color: '#5a5e7a' },
          { label: 'LOCATIONS',  count: locations.length,  color: '#3a5e6e' },
        ].map(({ label, count, color }) => (
          <div key={label} style={{ padding: '.7rem', border: `1px solid ${color}28`, borderTopColor: 'rgba(255,255,255,.06)', borderRadius: 8, background: `rgba(0,0,0,.32)`, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', boxShadow: `inset 0 1px 0 ${color}14, 0 2px 8px rgba(0,0,0,.3)` }}>
            <p style={{ fontSize: '.58rem', letterSpacing: '.08em', color, marginBottom: '.2rem' }}>{label}</p>
            <p style={{ fontSize: '1.4rem', fontWeight: 700, color, lineHeight: 1 }}>{count}</p>
          </div>
        ))}
      </section>

      {/* World index */}
      <section>
        <p style={labelStyle}>WORLDS IN ARCHIVE</p>
        <div style={{ display: 'grid', gap: '.4rem' }}>
          {worlds.map(w => (
            <div key={w.slug} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.35rem .6rem', borderRadius: 4, background: 'rgba(0,0,0,.1)', border: '1px solid rgba(114,204,166,.05)' }}>
              {w.soul_colours?.[0] && (
                <span style={{ width: 8, height: 8, borderRadius: 2, background: w.soul_colours[0].hex, flexShrink: 0, boxShadow: `0 0 4px ${w.soul_colours[0].hex}60` }} />
              )}
              <span style={{ fontSize: '.72rem', color: '#8aaa96', flex: 1 }}>{w.name}</span>
              <Badge sourceClass={w.source_class} />
              {w.slug === activeWorldSlug && <span style={{ fontSize: '.58rem', color: '#2ed690' }}>●</span>}
            </div>
          ))}
        </div>
      </section>

      <p style={{ fontSize: '.58rem', color: '#1a2820', letterSpacing: '.05em' }}>
        Echo Index · {entries.length} entries · arcsweep.echo-index-entry/v1
      </p>
    </div>
  );
}

function DetailPanel({ entry, activeWorldSlug, allEntries }) {
  // Inhabited empty state — not a grey void
  if (!entry) {
    return <ArchiveChamber activeWorldSlug={activeWorldSlug} entries={allEntries} />;
  }

  // Soul colours drive chamber accent
  const accentHex = entry.soul_colours?.[0]?.hex ?? null;
  const chamberBorder = accentHex ? `1px solid ${accentHex}22` : '1px solid transparent';

  return (
    <div style={{ borderLeft: chamberBorder, minHeight: '100%' }}>
      {/* Chamber header — entry portrait area */}
      <div style={{
        padding: '1.5rem 1.5rem 1rem',
        background: accentHex ? `linear-gradient(180deg, ${accentHex}08 0%, transparent 100%)` : 'rgba(0,0,0,.1)',
        borderBottom: '1px solid rgba(114,204,166,.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.6rem' }}>
          <TypeChip type={entry.type} />
          <Badge sourceClass={entry.source_class} />
        </div>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: accentHex || '#d7e4dc', margin: 0, lineHeight: 1.2 }}>{entry.name}</h2>
        {entry.subtitle && <p style={{ fontSize: '.76rem', color: '#4d6e5d', margin: '.2rem 0 0' }}>{entry.subtitle}</p>}

        {/* Soul colour portrait for worlds */}
        {entry.soul_colours?.length > 0 && (
          <div style={{ display: 'flex', gap: '.35rem', marginTop: '.8rem', alignItems: 'center' }}>
            {entry.soul_colours.map(c => (
              <span
                key={c.name}
                title={`${c.name} — ${c.note}`}
                style={{ width: 18, height: 18, borderRadius: 4, background: c.hex, boxShadow: `0 0 6px ${c.hex}70`, cursor: 'default' }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Entry detail body */}
      <div style={{ padding: '1.2rem 1.5rem' }}>
        {entry.type === 'world'     && <WorldDetail entry={entry} />}
        {entry.type === 'character' && (
          <CharacterDetail
            entry={entry}
            relatedWorld={entry.world_slug ? ECHO_SEEDS.find(e => e.type === 'world' && e.slug === entry.world_slug) : null}
          />
        )}
        {entry.type === 'location'  && (
          <LocationDetail
            entry={entry}
            relatedWorld={entry.world_slug ? ECHO_SEEDS.find(e => e.type === 'world' && e.slug === entry.world_slug) : null}
          />
        )}
      </div>

      {/* Chamber footer — schema identity */}
      <div style={{ padding: '.6rem 1.5rem 1rem', borderTop: '1px solid rgba(114,204,166,.06)' }}>
        <p style={{ fontSize: '.56rem', color: '#1a2820', letterSpacing: '.05em' }}>
          {entry.schema} · {entry.entry_id}
        </p>
      </div>
    </div>
  );
}

const TYPE_FILTERS = ['all', 'world', 'character', 'location'];

function EchoIndex() {
  const [activePacket, setActivePacket] = React.useState(readActivePacket);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  React.useEffect(() => {
    return subscribeToDualAspectActivation(
      (pkt) => setActivePacket(pkt),
      { eventTarget: window, storage: sessionStorage, emitCurrent: false },
    );
  }, []);

  const activeWorldSlug = activePacket?.identity?.world_slug ?? null;
  const continuityCtx = useMemo(readContinuityContext, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ECHO_SEEDS.filter((e) => {
      if (typeFilter !== 'all' && e.type !== typeFilter) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        (e.subtitle || '').toLowerCase().includes(q) ||
        e.slug.includes(q) ||
        (e.identity_anchors || []).some((a) => a.toLowerCase().includes(q)) ||
        (e.emotions || []).some((em) => em.toLowerCase().includes(q)) ||
        (e.heartbeat || '').toLowerCase().includes(q) ||
        (e.world_slug || '').includes(q)
      );
    });
  }, [query, typeFilter]);

  return (
    <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', color: '#d7e4dc', minHeight: '100vh' }}>
      <div style={{ padding: '1.5rem 1.5rem .75rem', borderBottom: '1px solid rgba(114,204,166,.08)', background: 'rgba(7,14,10,.45)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: 'inset 0 -1px 0 rgba(114,204,166,.06)' }}>
        <p style={{ fontSize: '.68rem', letterSpacing: '.1em', color: '#3a5045', marginBottom: '.3rem' }}>ARCSWEEP · ECHO INDEX</p>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#d7e4dc', margin: 0 }}>Echo Index</h1>
        <p style={{ fontSize: '.76rem', color: '#567060', margin: '.3rem 0 0' }}>
          World, character, and location resolution. Source-canon and original kept separate from project overlay.
        </p>
        {activeWorldSlug && (
          <p style={{ fontSize: '.68rem', color: '#2ed690', marginTop: '.4rem' }}>
            Active world: <strong>{activeWorldSlug}</strong>
          </p>
        )}
        {continuityCtx?.world_slug && !activeWorldSlug && (
          <p style={{ fontSize: '.68rem', color: '#567060', marginTop: '.4rem' }}>
            Continuity context: {continuityCtx.world_slug}
          </p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '20rem 1fr', minHeight: 'calc(100vh - 160px)' }}>
        {/* List panel — frosted glass sidebar */}
        <div style={{
          borderRight: '1px solid rgba(114,204,166,.07)',
          display: 'flex', flexDirection: 'column',
          background: 'rgba(8,16,12,.52)',
          backdropFilter: 'blur(16px) saturate(150%)',
          WebkitBackdropFilter: 'blur(16px) saturate(150%)',
        }}>
          <div style={{ padding: '.75rem 1rem', borderBottom: '1px solid rgba(114,204,166,.06)', background: 'rgba(0,0,0,.12)' }}>
            <input
              type="search"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '.4rem .7rem',
                background: 'rgba(0,0,0,.35)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(114,204,166,.14)',
                borderTopColor: 'rgba(255,255,255,.07)',
                borderRadius: 6, color: '#d7e4dc', fontSize: '.76rem',
                fontFamily: 'inherit', outline: 'none',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04)',
              }}
            />
            <div style={{ display: 'flex', gap: '.35rem', marginTop: '.5rem', flexWrap: 'wrap' }}>
              {TYPE_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setTypeFilter(f)}
                  style={{
                    padding: '.2rem .6rem', borderRadius: 4,
                    border: typeFilter === f ? '1px solid rgba(46,214,144,.25)' : '1px solid rgba(114,204,166,.08)',
                    background: typeFilter === f ? 'rgba(20,50,34,.70)' : 'rgba(0,0,0,.25)',
                    backdropFilter: 'blur(4px)',
                    color: typeFilter === f ? '#2ed690' : '#4d6e5d',
                    fontSize: '.64rem', letterSpacing: '.06em', cursor: 'pointer',
                    boxShadow: typeFilter === f ? 'inset 0 1px 0 rgba(46,214,144,.1)' : 'inset 0 1px 0 rgba(255,255,255,.03)',
                  }}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '.5rem' }}>
            {filtered.length === 0 && (
              <p style={{ color: '#2a3830', fontSize: '.74rem', padding: '.5rem', fontStyle: 'italic' }}>No entries match.</p>
            )}
            {filtered.map((e) => (
              <EntryRow
                key={e.entry_id}
                entry={e}
                isSelected={selected?.entry_id === e.entry_id}
                onSelect={() => setSelected(e)}
                activeWorldSlug={activeWorldSlug}
              />
            ))}
          </div>
          <div style={{ padding: '.5rem 1rem', borderTop: '1px solid rgba(114,204,166,.05)', fontSize: '.6rem', color: '#2a3830', background: 'rgba(0,0,0,.1)' }}>
            {filtered.length} / {ECHO_SEEDS.length} entries
          </div>
        </div>

        {/* Detail panel — glass detail chamber */}
        <div style={{
          background: 'rgba(9,18,13,.42)',
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          overflowY: 'auto',
        }}>
          <DetailPanel entry={selected} activeWorldSlug={activeWorldSlug} allEntries={ECHO_SEEDS} />
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <ArcsweepShell currentHref="/starwell/echo-index/" title="Echo Index">
    <EchoIndex />
  </ArcsweepShell>,
);
